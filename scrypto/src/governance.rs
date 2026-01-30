use scrypto::prelude::*;
use crate::{
    GovernanceParameters, Proposal, ProposalVoteOption, ProposalVoteOptionId,
    TemperatureCheck, TemperatureCheckDraft, TemperatureCheckVote,
    TemperatureCheckCreatedEvent, TemperatureCheckVotedEvent,
    ProposalCreatedEvent, ProposalVotedEvent, GovernanceParametersUpdatedEvent,
    MAX_LINKS, MAX_VOTE_OPTIONS, MAX_SELECTIONS,
};

#[blueprint]
#[events(
    TemperatureCheckCreatedEvent,
    TemperatureCheckVotedEvent,
    ProposalCreatedEvent,
    ProposalVotedEvent,
    GovernanceParametersUpdatedEvent
)]
mod governance {
    use super::*;

    enable_method_auth! {
        roles {
            owner => updatable_by: [];
        },
        methods {
            // Public methods
            make_temperature_check => PUBLIC;
            vote_on_temperature_check => PUBLIC;
            vote_on_proposal => PUBLIC;
            get_governance_parameters => PUBLIC;
            get_temperature_check_count => PUBLIC;
            get_proposal_count => PUBLIC;
            // Owner-only methods
            make_proposal => restrict_to: [owner];
            update_governance_parameters => restrict_to: [owner];
        }
    }

    struct Governance {
        pub governance_parameters: GovernanceParameters,
        pub temperature_checks: KeyValueStore<u64, TemperatureCheck>,
        pub temperature_check_count: u64,
        pub proposals: KeyValueStore<u64, Proposal>,
        pub proposal_count: u64,
    }

    impl Governance {
        /// Instantiates the governance component with the given owner badge
        pub fn instantiate(
            owner_badge: ResourceAddress,
            governance_parameters: GovernanceParameters,
        ) -> Global<Governance> {
            Self {
                governance_parameters,
                temperature_checks: KeyValueStore::new(),
                temperature_check_count: 0,
                proposals: KeyValueStore::new(),
                proposal_count: 0,
            }
            .instantiate()
            .prepare_to_globalize(OwnerRole::Fixed(rule!(require(owner_badge))))
            .roles(roles! {
                owner => rule!(require(owner_badge));
            })
            .globalize()
        }

        /// Creates a temperature check from the draft
        /// Returns the ID of the created temperature check
        ///
        /// # Arguments
        /// * `author` - The account creating the temperature check (must prove ownership)
        /// * `draft` - The temperature check draft data
        pub fn make_temperature_check(
            &mut self,
            author: Global<Account>,
            draft: TemperatureCheckDraft,
        ) -> u64 {
            // Verify the author account is present in the transaction
            Runtime::assert_access_rule(author.get_owner_role().rule);

            // Validate inputs
            assert!(
                !draft.title.is_empty(),
                "Temperature check title cannot be empty"
            );
            assert!(
                !draft.short_description.is_empty(),
                "Temperature check short description cannot be empty"
            );
            assert!(
                !draft.description.is_empty(),
                "Temperature check description cannot be empty"
            );
            assert!(
                !draft.vote_options.is_empty(),
                "Temperature check must have at least one vote option"
            );
            assert!(
                draft.vote_options.len() <= MAX_VOTE_OPTIONS,
                "Too many vote options (max {})",
                MAX_VOTE_OPTIONS
            );
            assert!(
                draft.links.len() <= MAX_LINKS,
                "Too many links (max {})",
                MAX_LINKS
            );

            // Validate max_selections
            if let Some(n) = draft.max_selections {
                assert!(n > 0, "max_selections must be greater than 0");
                assert!(n <= MAX_SELECTIONS, "max_selections cannot exceed {}", MAX_SELECTIONS);
                assert!(
                    (n as usize) <= draft.vote_options.len(),
                    "max_selections cannot exceed number of vote options"
                );
            }

            // Auto-generate IDs for vote options (0, 1, 2, ...)
            let vote_options: Vec<ProposalVoteOption> = draft
                .vote_options
                .into_iter()
                .enumerate()
                .map(|(index, input)| ProposalVoteOption {
                    id: ProposalVoteOptionId(index as u32),
                    label: input.label,
                })
                .collect();

            let id = self.temperature_check_count;
            self.temperature_check_count += 1;

            let now = Clock::current_time_rounded_to_seconds();
            let deadline = now.add_days(self.governance_parameters.temperature_check_days as i64).unwrap();

            let temperature_check = TemperatureCheck {
                title: draft.title,
                short_description: draft.short_description,
                description: draft.description,
                vote_options,
                links: draft.links,
                quorum: self.governance_parameters.temperature_check_quorum,
                max_selections: draft.max_selections,
                votes: KeyValueStore::new(),
                approval_threshold: self.governance_parameters.temperature_check_approval_threshold,
                start: now,
                deadline,
                elevated_proposal_id: None,
                author,
                last_vote_at: now,
            };

            let title = temperature_check.title.clone();
            let start = temperature_check.start;
            let deadline = temperature_check.deadline;

            self.temperature_checks.insert(id, temperature_check);

            Runtime::emit_event(TemperatureCheckCreatedEvent {
                temperature_check_id: id,
                title,
                start,
                deadline,
            });

            id
        }

        /// Elevates a temperature check to a proposal (GP - Governance Proposal)
        /// Only callable by the owner
        ///
        /// # Arguments
        /// * `temperature_check_id` - The ID of the temperature check to elevate
        ///
        /// Returns the ID of the created proposal
        pub fn make_proposal(&mut self, temperature_check_id: u64) -> u64 {
            // Get the temperature check
            let mut tc = self
                .temperature_checks
                .get_mut(&temperature_check_id)
                .expect("Temperature check not found");

            assert!(
                tc.elevated_proposal_id.is_none(),
                "Temperature check has already been elevated to a proposal"
            );

            let proposal_id = self.proposal_count;
            self.proposal_count += 1;

            let now = Clock::current_time_rounded_to_seconds();
            let deadline = now.add_days(self.governance_parameters.proposal_length_days as i64).unwrap();

            let proposal = Proposal {
                title: tc.title.clone(),
                short_description: tc.short_description.clone(),
                description: tc.description.clone(),
                vote_options: tc.vote_options.clone(),
                links: tc.links.clone(),
                quorum: self.governance_parameters.proposal_quorum,
                max_selections: tc.max_selections,
                votes: KeyValueStore::new(),
                approval_threshold: self.governance_parameters.proposal_approval_threshold,
                start: now,
                deadline,
                temperature_check_id,
                author: tc.author,
                last_vote_at: now,
            };

            tc.elevated_proposal_id = Some(proposal_id);
            drop(tc);

            let title = proposal.title.clone();
            let start = proposal.start;
            let deadline = proposal.deadline;

            self.proposals.insert(proposal_id, proposal);

            Runtime::emit_event(ProposalCreatedEvent {
                proposal_id,
                temperature_check_id,
                title,
                start,
                deadline,
            });

            proposal_id
        }

        /// Vote on a temperature check
        /// The account must prove its presence
        pub fn vote_on_temperature_check(
            &mut self,
            account: Global<Account>,
            temperature_check_id: u64,
            vote: TemperatureCheckVote,
        ) {
            // Verify the account is present in the transaction
            Runtime::assert_access_rule(account.get_owner_role().rule);

            // Get the temperature check
            let mut tc = self
                .temperature_checks
                .get_mut(&temperature_check_id)
                .expect("Temperature check not found");

            // Check the vote is still open
            let now = Clock::current_time_rounded_to_seconds();
            assert!(
                now.compare(tc.start, TimeComparisonOperator::Gte),
                "Voting has not started yet"
            );
            assert!(
                now.compare(tc.deadline, TimeComparisonOperator::Lt),
                "Voting has ended"
            );

            // Check the account has not already voted
            assert!(
                tc.votes.get(&account).is_none(),
                "Account has already voted on this temperature check"
            );

            // Record the vote and update last_vote_at
            tc.votes.insert(account, vote);
            tc.last_vote_at = now;

            Runtime::emit_event(TemperatureCheckVotedEvent {
                temperature_check_id,
                account,
                vote,
            });
        }

        /// Vote on a proposal
        /// The account must prove its presence
        ///
        /// # Arguments
        /// * `account` - The account casting the vote
        /// * `proposal_id` - The ID of the proposal to vote on
        /// * `votes` - The selected option(s):
        ///   - For single-choice proposals: provide exactly one option
        ///   - For multiple-choice proposals: provide up to max_selections options
        pub fn vote_on_proposal(
            &mut self,
            account: Global<Account>,
            proposal_id: u64,
            votes: Vec<ProposalVoteOptionId>,
        ) {
            // Verify the account is present in the transaction
            Runtime::assert_access_rule(account.get_owner_role().rule);

            // Get the proposal
            let mut proposal = self
                .proposals
                .get_mut(&proposal_id)
                .expect("Proposal not found");

            // Check the vote is still open
            let now = Clock::current_time_rounded_to_seconds();
            assert!(
                now.compare(proposal.start, TimeComparisonOperator::Gte),
                "Voting has not started yet"
            );
            assert!(
                now.compare(proposal.deadline, TimeComparisonOperator::Lt),
                "Voting has ended"
            );

            // Validate vote count based on max_selections
            assert!(!votes.is_empty(), "Must select at least one option");

            match proposal.max_selections {
                None => {
                    // Single choice: exactly one vote
                    assert!(
                        votes.len() == 1,
                        "This is a single-choice proposal, select exactly one option"
                    );
                }
                Some(max) => {
                    // Multiple choice: up to max votes
                    assert!(
                        votes.len() <= max as usize,
                        "Cannot select more than {} options",
                        max
                    );
                }
            }

            // Check for duplicate selections
            let mut seen = Vec::new();
            for vote in &votes {
                assert!(
                    !seen.contains(vote),
                    "Duplicate vote option selected"
                );
                seen.push(*vote);
            }

            // Validate all vote options exist
            for vote in &votes {
                assert!(
                    proposal.vote_options.iter().any(|opt| opt.id == *vote),
                    "Invalid vote option"
                );
            }

            // Check the account has not already voted
            assert!(
                proposal.votes.get(&account).is_none(),
                "Account has already voted on this proposal"
            );

            // Record the votes and update last_vote_at
            proposal.votes.insert(account, votes.clone());
            proposal.last_vote_at = now;

            Runtime::emit_event(ProposalVotedEvent {
                proposal_id,
                account,
                votes,
            });
        }

        /// Returns the current governance parameters
        pub fn get_governance_parameters(&self) -> GovernanceParameters {
            self.governance_parameters.clone()
        }

        /// Returns the current temperature check count
        pub fn get_temperature_check_count(&self) -> u64 {
            self.temperature_check_count
        }

        /// Returns the current proposal count
        pub fn get_proposal_count(&self) -> u64 {
            self.proposal_count
        }

        /// Updates the governance parameters (owner only)
        pub fn update_governance_parameters(&mut self, new_params: GovernanceParameters) {
            self.governance_parameters = new_params.clone();

            Runtime::emit_event(GovernanceParametersUpdatedEvent { new_params });
        }
    }
}
