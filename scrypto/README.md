# Consultation / Governance Scrypto Blueprints

A governance system for Radix DLT that enables community-driven decision making through a structured proposal process.

## Overview

Governance happens in a 3-part procedure:

1. **Request for Comment (RFC)**: A draft proposal posted off-chain (e.g., [RadixTalk](https://radixtalk.com))
2. **Temperature Check**: Pushing proposal details on-chain and voting on whether it merits a full vote
3. **Governance Proposal (GP)**: A passed temperature check becomes a formal proposal for community voting

Vote counting happens off-chain. Voting power is determined by LSU holdings converted to XRD at the **start of the vote**. Users can delegate their voting power to others.

## Architecture

The system is split into two components for modularity:

| Component | Purpose |
|-----------|---------|
| **Governance** | Manages temperature checks, proposals, and voting |
| **VoteDelegation** | Manages vote delegation between accounts |

This separation allows upgrading the Governance component without requiring users to re-establish their delegations.

## Building

```bash
scrypto build
```

## Testing

```bash
scrypto test
```

## Governance Component

### Instantiation

```rust
Governance::instantiate(
    owner_badge: ResourceAddress,
    governance_parameters: GovernanceParameters,
) -> Global<Governance>
```

### Parameters

```rust
GovernanceParameters {
    temperature_check_days: u16,              // Duration of temp check voting
    temperature_check_quorum: Decimal,        // Min XRD for valid result
    temperature_check_approval_threshold: Decimal, // Fraction needed to pass
    proposal_length_days: u16,                // Duration of proposal voting
    proposal_quorum: Decimal,                 // Min XRD for valid result
    proposal_approval_threshold: Decimal,     // Fraction needed to pass
}
```

### Methods

| Method | Access | Description |
|--------|--------|-------------|
| `make_temperature_check(author, draft)` | PUBLIC | Create a temperature check (author must prove account ownership) |
| `vote_on_temperature_check(account, id, vote)` | PUBLIC | Vote For/Against on a temp check |
| `make_proposal(temperature_check_id)` | OWNER | Elevate a temp check to a proposal |
| `vote_on_proposal(account, id, votes)` | PUBLIC | Vote on a proposal (single or multiple choice) |
| `update_governance_parameters(params)` | OWNER | Update governance parameters |
| `get_temperature_check_count()` | PUBLIC | Get total temperature checks |
| `get_proposal_count()` | PUBLIC | Get total proposals |
| `get_governance_parameters()` | PUBLIC | Get current parameters |

### Creating a Temperature Check

```rust
TemperatureCheckDraft {
    title: String,
    short_description: String,        // Brief summary
    description: String,              // Full description (markdown)
    vote_options: Vec<ProposalVoteOptionInput>,  // Options for the eventual proposal
    links: Vec<Url>,                  // External links (max 10)
    max_selections: Option<u32>,      // None = single choice, Some(n) = multiple choice (max 5)
}

ProposalVoteOptionInput {
    label: String,  // e.g., "For", "Against", "Abstain"
}
```

Vote option IDs are auto-generated (0, 1, 2, ...) based on the order provided.

### Stored Temperature Check

```rust
TemperatureCheck {
    title: String,
    short_description: String,
    description: String,
    vote_options: Vec<ProposalVoteOption>,
    links: Vec<Url>,
    quorum: Decimal,
    max_selections: Option<u32>,
    votes: KeyValueStore<Global<Account>, TemperatureCheckVote>,
    approval_threshold: Decimal,
    start: Instant,
    deadline: Instant,
    elevated_proposal_id: Option<u64>,
    author: Global<Account>,
    last_vote_at: Instant,  // Updated on each vote (useful for cache invalidation)
}
```

## VoteDelegation Component

### Instantiation

```rust
VoteDelegation::instantiate(
    owner_badge: ResourceAddress,
) -> Global<VoteDelegation>
```

### Methods

| Method | Access | Description |
|--------|--------|-------------|
| `make_delegation(delegator, delegatee, fraction, valid_until)` | PUBLIC | Delegate voting power |
| `remove_delegation(delegator, delegatee)` | PUBLIC | Remove a delegation |
| `get_delegations(delegator)` | PUBLIC | Get all delegations for an account |
| `get_delegatee_delegators(delegatee, delegator)` | PUBLIC | Get delegation fraction |

### Delegation Rules

- Fraction must be between 0.01 (1%) and 1 (100%)
- Total delegation cannot exceed 100%
- Cannot delegate to yourself
- Delegation must have a future expiry
- Maximum 50 delegations per account

## Events

The blueprints emit events for all significant actions:

### Governance Events

```rust
TemperatureCheckCreatedEvent {
    temperature_check_id: u64,
    title: String,
    start: Instant,
    deadline: Instant,
}

TemperatureCheckVotedEvent {
    temperature_check_id: u64,
    account: Global<Account>,
    vote: TemperatureCheckVote,
}

ProposalCreatedEvent {
    proposal_id: u64,
    temperature_check_id: u64,
    title: String,
    start: Instant,
    deadline: Instant,
}

ProposalVotedEvent {
    proposal_id: u64,
    account: Global<Account>,
    votes: Vec<ProposalVoteOptionId>,
}

GovernanceParametersUpdatedEvent {
    new_params: GovernanceParameters,
}
```

### Delegation Events

```rust
DelegationCreatedEvent {
    delegator: Global<Account>,
    delegatee: Global<Account>,
    fraction: Decimal,
    valid_until: Instant,
}

DelegationRemovedEvent {
    delegator: Global<Account>,
    delegatee: Global<Account>,
}
```

## Off-Chain Vote Counting

To count votes for a temperature check or proposal:

1. Query the `votes` KVS to get all accounts that voted and their votes
2. For each voter, query VoteDelegation's `delegatees` KVS to find accounts they can vote for
3. Query VoteDelegation's `delegators` KVS to adjust voting power for delegated fractions
4. Query LSU holdings of all participating accounts at the vote start time
5. Calculate final vote tallies

The `delegatees` and `delegators` KVSs can grow large, but we only need to query entries for accounts that actually voted.

## Data Structures

### Vote Types

```rust
// For temperature checks (simple for/against)
enum TemperatureCheckVote {
    For,
    Against,
}

// For proposals (supports multiple choice)
struct ProposalVoteOptionId(u32);

struct ProposalVoteOption {
    id: ProposalVoteOptionId,
    label: String,
}
```

### Multiple Choice Voting

Proposals support both single-choice and multiple-choice voting:

- **Single choice** (`max_selections: None`): Voters select exactly one option
- **Multiple choice** (`max_selections: Some(n)`): Voters can select up to `n` options (max 5)

### Delegation

```rust
Delegation {
    delegatee: Global<Account>,
    fraction: Decimal,
    valid_until: Instant,
}
```

## Constants

```rust
MAX_LINKS = 10           // Maximum links per temperature check/proposal
MAX_VOTE_OPTIONS = 10    // Maximum vote options per proposal
MAX_SELECTIONS = 5       // Maximum selections in multiple-choice voting
MAX_DELEGATIONS = 50     // Maximum delegations per account
MIN_DELEGATION_FRACTION = 0.01  // Minimum delegation (1%)
```
