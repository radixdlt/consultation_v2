# Governance Scrypto Blueprints

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
| **Governance** | Manages temperature checks, proposals and voting |
| **VoteDelegation** | Manages vote delegation between accounts |

This separation allows upgrading the Governance component without requiring users to re-establish their delegations.

> **Note**: The VoteDelegation component is not yet integrated into the web app. It is deployed on-chain and fully functional, but the front-end does not use it yet. It remains for future use.

## Building

```bash
scrypto build
```

For production deployments, use the [deterministic builder](https://docs.radixdlt.com/docs/productionize-your-code#publish-a-package-built-through-the-deterministic-builder) to produce a reproducible WASM artifact.

## Testing

```bash
scrypto test
```

## Deploying to Ledger

This section walks through deploying the blueprints from scratch. You will need a Radix wallet with some XRD for transaction fees.

### 1. Build the package

```bash
scrypto build
```

### 2. Deploy the package

Upload the compiled WASM and RPD files at [console.radixdlt.com/deploy-package](https://console.radixdlt.com/deploy-package).

After deployment, note down the **package address** (e.g., `package_rdx1p...`).

### 3. Create an owner badge

You can use an existing token as the owner badge, or create a new one at [console.radixdlt.com/create-token](https://console.radixdlt.com/create-token). Create a fungible token with 0 divisibility and a supply of 1.

Note down the **owner badge resource address** (e.g., `resource_rdx1t...`).

### 4. Instantiate the Governance component

Submit the following transaction manifest at [console.radixdlt.com/transaction-manifest](https://console.radixdlt.com/transaction-manifest):

```
CALL_FUNCTION
  Address("<PACKAGE_ADDRESS>")
  "Governance"
  "instantiate"
  Address("<OWNER_BADGE_ADDRESS>")
  Tuple(
    <TEMPERATURE_CHECK_DAYS>u16,
    Decimal("<TEMPERATURE_CHECK_QUORUM>"),
    Decimal("<TEMPERATURE_CHECK_APPROVAL_THRESHOLD>"),
    <PROPOSAL_LENGTH_DAYS>u16,
    Decimal("<PROPOSAL_QUORUM>"),
    Decimal("<PROPOSAL_APPROVAL_THRESHOLD>")
  )
;
```

Replace the placeholders:
- `<PACKAGE_ADDRESS>` — the package address from step 2
- `<OWNER_BADGE_ADDRESS>` — the owner badge resource address from step 3
- The governance parameters: voting durations (in days), quorum amounts (in XRD), and approval thresholds (as decimals, e.g. `"0.5"` for 50%)

After submitting, note down the **component address** (e.g., `component_rdx1c...`)

### 5. Configure the web app

After deployment, update the governance config in `packages/shared/src/governance/config.ts` with the addresses from the steps above:

- `packageAddress` — from step 2
- `componentAddress` — from step 4
- `adminBadgeAddress` — the owner badge address created in step 3, and used in step 4

See the [root README](../README.md) for full web app setup and deployment instructions.

### 6. Set up the dApp definition

After instantiating the component, link it to a **dApp definition account**. This establishes a two-way relationship between your dApp and the component, which the Radix wallet uses to display dApp metadata when users interact with it.

> **Tip**: Use an entirely fresh account as the dApp definition — don't reuse a personal account.

#### Configure the dApp definition account

Go to [console.radixdlt.com/configure-metadata](https://console.radixdlt.com/configure-metadata), input the dApp definition **account address**, and select **Account type: dApp Definition**.

Set the following metadata fields:

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Name of the dApp | `Radix Consultation V2` |
| `description` | Short description | `Governance on Radix, by the Radix community` |
| `icon_url` | *(optional)* URL to a dApp icon (displayed in the wallet) | `https://example.com/icon.png` |
| `claimed_entities` | The component address from step 4 — click "Add claimed entity" | `component_rdx1c...` |
| `claimed_websites` | URL of the consultation front-end you're hosting | `https://consultation.example.com` |

Send the transaction to the wallet.

#### Configure the component metadata

Go to the same [configure-metadata](https://console.radixdlt.com/configure-metadata) page again, but this time input the **component address** from step 4.

Set the following metadata fields:

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Short name | `Radix Consultation V2` |
| `description` | Short description | `Component that manages voting for Consultation V2` |
| `dapp_definition` | The dApp definition account address from above | `account_rdx1...` |

Send the transaction. You've now established a two-way link between the dApp definition and the component.

## Governance Component

### Methods

| Method | Access | Description |
|--------|--------|-------------|
| `make_temperature_check(author, draft)` | PUBLIC | Create a temperature check (author must prove account ownership) |
| `vote_on_temperature_check(account, id, vote)` | PUBLIC | Vote For/Against on a temp check |
| `vote_on_proposal(account, id, options)` | PUBLIC | Vote on a proposal (single or multiple choice) |
| `get_governance_parameters()` | PUBLIC | Get current parameters |
| `get_temperature_check_count()` | PUBLIC | Get total temperature checks |
| `get_proposal_count()` | PUBLIC | Get total proposals |
| `make_proposal(temperature_check_id)` | OWNER, ADMIN | Elevate a temp check to a proposal |
| `toggle_temperature_check_hidden(id)` | OWNER, ADMIN | Hide/show a temperature check |
| `toggle_proposal_hidden(id)` | OWNER, ADMIN | Hide/show a proposal |
| `update_governance_parameters(params)` | OWNER | Update governance parameters |

### Governance Parameters

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
    label: String,  // e.g., "For", "Against"
}
```

Vote option IDs are auto-generated (0, 1, 2, ...) based on the order provided.

## VoteDelegation Component

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
    vote_id: u64,
    account: Global<Account>,
    vote: TemperatureCheckVote,
    replacing_vote_id: Option<u64>,
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
    vote_id: u64,
    account: Global<Account>,
    options: Vec<ProposalVoteOptionId>,
    replacing_vote_id: Option<u64>,
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
