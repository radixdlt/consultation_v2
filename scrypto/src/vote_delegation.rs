use crate::{
    Delegation, DelegationCreatedEvent, DelegationRemovedEvent, MAX_DELEGATIONS,
    MIN_DELEGATION_FRACTION,
};
use scrypto::prelude::*;

#[blueprint]
#[events(DelegationCreatedEvent, DelegationRemovedEvent)]
mod vote_delegation {
    use super::*;

    enable_method_auth! {
        roles {
            owner => updatable_by: [];
        },
        methods {
            // Public methods
            make_delegation => PUBLIC;
            remove_delegation => PUBLIC;
            get_delegations => PUBLIC;
            get_delegatee_delegators => PUBLIC;
        }
    }

    struct VoteDelegation {
        /// Key: delegatee (person allowed to vote for others)
        /// Value: KVS of delegators using this delegatee, and the fraction of their power allocated
        pub delegatees: KeyValueStore<Global<Account>, KeyValueStore<Global<Account>, Decimal>>,

        /// Key: delegator (person that has delegated their voting power to another)
        /// Value: Delegation struct, holds all the user's delegations
        pub delegators: KeyValueStore<Global<Account>, Vec<Delegation>>,
    }

    impl VoteDelegation {
        /// Instantiates the vote delegation component with the given owner badge
        pub fn instantiate(owner_badge: ResourceAddress) -> Global<VoteDelegation> {
            Self {
                delegatees: KeyValueStore::new(),
                delegators: KeyValueStore::new(),
            }
            .instantiate()
            .prepare_to_globalize(OwnerRole::Fixed(rule!(require(owner_badge))))
            .roles(roles! {
                owner => rule!(require(owner_badge));
            })
            .enable_component_royalties(component_royalties! {
                init {
                    make_delegation => Free, updatable;
                    remove_delegation => Free, updatable;
                    get_delegations => Free, updatable;
                    get_delegatee_delegators => Free, updatable;
                }
            })
            .globalize()
        }

        /// Delegate voting power from delegator to delegatee
        /// The delegator must prove their presence
        pub fn make_delegation(
            &mut self,
            delegator: Global<Account>,
            delegatee: Global<Account>,
            fraction: Decimal,
            valid_until: Instant,
        ) {
            // Verify the delegator is present in the transaction
            Runtime::assert_access_rule(delegator.get_owner_role().rule);

            // Validate minimum fraction
            let min_fraction = Decimal::try_from(MIN_DELEGATION_FRACTION).unwrap();
            assert!(
                fraction >= min_fraction && fraction <= Decimal::ONE,
                "Fraction must be between {} and 1 (inclusive)",
                MIN_DELEGATION_FRACTION
            );
            assert!(delegator != delegatee, "Cannot delegate to yourself");

            let now = Clock::current_time_rounded_to_seconds();
            assert!(
                valid_until.compare(now, TimeComparisonOperator::Gt),
                "Delegation must be valid for some time in the future"
            );

            // Clean up expired delegations and calculate totals
            let mut total_delegated = Decimal::ZERO;
            let mut valid_delegations: Vec<Delegation> = Vec::new();
            let mut expired_delegatees: Vec<Global<Account>> = Vec::new();

            if let Some(existing_delegations) = self.delegators.get(&delegator) {
                for delegation in existing_delegations.iter() {
                    if delegation
                        .valid_until
                        .compare(now, TimeComparisonOperator::Gt)
                    {
                        // Still valid - skip if updating existing delegation to same delegatee
                        if delegation.delegatee != delegatee {
                            total_delegated = total_delegated + delegation.fraction;
                            valid_delegations.push(delegation.clone());
                        }
                    } else {
                        // Expired - track for cleanup from delegatees KVS
                        expired_delegatees.push(delegation.delegatee);
                    }
                }
            }

            assert!(
                total_delegated + fraction <= Decimal::ONE,
                "Total delegation cannot exceed 100%"
            );

            // Check max delegations (counting the new one)
            let final_count = valid_delegations.len() + 1;
            assert!(
                final_count <= MAX_DELEGATIONS,
                "Cannot have more than {} delegations",
                MAX_DELEGATIONS
            );

            // Create the new delegation
            let new_delegation = Delegation {
                delegatee,
                fraction,
                valid_until,
            };
            valid_delegations.push(new_delegation);

            // Update delegators map with cleaned-up list
            let has_existing = self.delegators.get(&delegator).is_some();
            if has_existing {
                let mut delegations = self.delegators.get_mut(&delegator).unwrap();
                *delegations = valid_delegations;
            } else {
                self.delegators.insert(delegator, valid_delegations);
            }

            // Clean up expired delegations from delegatees KVS
            for expired_delegatee in expired_delegatees {
                if let Some(delegatee_map) = self.delegatees.get(&expired_delegatee) {
                    delegatee_map.remove(&delegator);
                }
            }

            // Update delegatees map for the new/updated delegation
            let delegatee_exists = self.delegatees.get(&delegatee).is_some();
            if !delegatee_exists {
                self.delegatees.insert(delegatee, KeyValueStore::new());
            }
            let delegatee_map = self.delegatees.get(&delegatee).unwrap();
            delegatee_map.insert(delegator, fraction);

            Runtime::emit_event(DelegationCreatedEvent {
                delegator,
                delegatee,
                fraction,
                valid_until,
            });
        }

        /// Remove a delegation from delegator to delegatee
        /// The delegator must prove their presence
        /// Also cleans up any expired delegations
        pub fn remove_delegation(
            &mut self,
            delegator: Global<Account>,
            delegatee: Global<Account>,
        ) {
            // Verify the delegator is present in the transaction
            Runtime::assert_access_rule(delegator.get_owner_role().rule);

            let now = Clock::current_time_rounded_to_seconds();
            let mut found_target = false;
            let mut valid_delegations: Vec<Delegation> = Vec::new();
            let mut expired_delegatees: Vec<Global<Account>> = Vec::new();

            // Process delegations, keeping valid ones except the target
            if let Some(existing_delegations) = self.delegators.get(&delegator) {
                for delegation in existing_delegations.iter() {
                    if delegation.delegatee == delegatee {
                        found_target = true;
                        // Don't add to valid_delegations (removing it)
                    } else if delegation
                        .valid_until
                        .compare(now, TimeComparisonOperator::Gt)
                    {
                        // Still valid and not the target
                        valid_delegations.push(delegation.clone());
                    } else {
                        // Expired - track for cleanup from delegatees KVS
                        expired_delegatees.push(delegation.delegatee);
                    }
                }
            } else {
                panic!("No delegations found for this account");
            }

            assert!(
                found_target,
                "No delegation found to the specified delegatee"
            );

            // Update delegators map with cleaned-up list
            let mut delegations = self.delegators.get_mut(&delegator).unwrap();
            *delegations = valid_delegations;

            // Clean up expired delegations from delegatees KVS
            for expired_delegatee in expired_delegatees {
                if let Some(delegatee_map) = self.delegatees.get(&expired_delegatee) {
                    delegatee_map.remove(&delegator);
                }
            }

            // Remove the target delegation from delegatees map
            if let Some(delegatee_map) = self.delegatees.get(&delegatee) {
                delegatee_map.remove(&delegator);
            }

            Runtime::emit_event(DelegationRemovedEvent {
                delegator,
                delegatee,
            });
        }

        /// Get all delegations made by a delegator
        pub fn get_delegations(&self, delegator: Global<Account>) -> Vec<Delegation> {
            self.delegators
                .get(&delegator)
                .map(|d| d.clone())
                .unwrap_or_default()
        }

        /// Get the fraction delegated to a delegatee from a specific delegator
        pub fn get_delegatee_delegators(
            &self,
            delegatee: Global<Account>,
            delegator: Global<Account>,
        ) -> Option<Decimal> {
            self.delegatees
                .get(&delegatee)
                .and_then(|m| m.get(&delegator).map(|d| *d))
        }
    }
}
