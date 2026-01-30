# Consultation v2 — Product Scope Document

## 1\. Overview

**Product Name:** Consultation v2

**Purpose:** Decentralized governance platform for Radix community decision-making, replacing the Foundation-dependent v1 system before 2026 wind-down.

**Components:**
1. **Consultation dApp** — TanStack Start web app for creating/voting/viewing governance items
2. **Vote Collector** — Node.js CLI for calculating vote results from on-ledger data

**Core Flow:**

```dpr
Anyone creates TC → Community votes For/Against →
If passes (quorum + majority) → Admin promotes to RFP →
Community votes on options → Winner determined
```

**Tech Stack:**
*   dApp: TanStack Start, Radix dApp Toolkit, PostgreSQL
*   Vote Collector: Node.js, Radix Gateway API, PostgreSQL
*   On-ledger: Scrypto components
*   Network: Configurable (Stokenet / Mainnet)
* * *

## 2\. Users & Permissions

| Role | Identification | Capabilities |
| ---| ---| --- |
| Visitor | No wallet connected | View active votes, view results |
| Voter | Wallet connected (any account) | Above + create TCs, cast votes |
| Admin | Holds owner badge | Above + promote TC → RFP, update GovernanceParameters |

**Authentication:**
*   Radix Wallet Connect via dApp Toolkit
*   Account-based identity

**Voting Power:**
*   Determined by LSU holdings at voting start snapshot
*   LSU converted to XRD equivalent using validator redemption rates
*   1 XRD equivalent = 1 voting power unit

**Vote Constraints:**
*   One vote per account per TC/RFP
*   Votes are final — cannot change after casting
*   Must connect wallet to vote
* * *

## 3\. Governance Items

### 3.1 Temperature Check (TC)

| Field | Description |
| ---| --- |
| title | Short title for the TC |
| description | Full description/rationale |
| vote\_options | For / Against (binary) |
| attachments | Supporting files |
| rfc\_url | Link to RadixTalk RFC discussion |
| quorum | Min participation required (from GovernanceParameters) |
| approval\_threshold | % For votes needed to pass |
| max\_selections | For future RFP phase (stored for promotion) |
| start | Voting start instant (snapshot taken here) |
| deadline | Voting end instant |
| elevated\_proposal\_id | Links to RFP if promoted (null until promoted) |

**TC Lifecycle:**

```scss
Created → Voting Open → Deadline Reached →
  → Passed (quorum met + majority For) → Can be promoted to RFP
  → Failed (quorum not met OR majority Against) → Archived
```

### 3.2 Request for Proposal (RFP)

| Field | Description |
| ---| --- |
| title | Inherited from TC |
| description | Inherited from TC |
| vote\_options | Multiple options (defined by admin at promotion) |
| attachments | Inherited + additional from admin |
| rfc\_url | Inherited from TC |
| quorum | From GovernanceParameters |
| approval\_threshold | % needed to win |
| max\_selections | How many options voter can select (usually 1) |
| start | Voting start instant (new snapshot) |
| deadline | Voting end instant |
| temperature\_check\_id | Links back to originating TC |

**RFP Lifecycle:**

```sql
Promoted from TC → Voting Open → Deadline Reached →
  → Winner (option with most votes if quorum met) → Executed
  → No quorum → Failed
```

* * *

## 4\. Consultation dApp Features

### 4.1 Pages

| Page | Route | Description |
| ---| ---| --- |
| Home | `/` | Active votes + recent results |
| TC Detail | `/tc/:id` | TC info, tally, voters, vote/promote actions |
| RFP Detail | `/rfp/:id` | RFP info, options tally, voters, vote action |
| Create TC | `/tc/new` | Form to create new TC |

### 4.2 Home Page

*   **Active Votes** — Open TCs and RFPs, sorted by deadline (soonest first)
*   **Recent Results** — Completed votes with pass/fail, sorted by end date
*   Each item: title, type (TC/RFP), status, deadline, participation %

### 4.3 TC Detail Page

*   Header: title, description, rfc\_url link, attachments
*   Status: voting open/closed, time remaining
*   Tally: For vs Against (count + voting power)
*   Progress: quorum %, approval threshold
*   Voter list: account, vote, voting power
*   **Voter Action**: Vote For / Against (if connected + not voted + open)
*   **Admin Action**: Promote to RFP (if admin + passed + not promoted)

### 4.4 RFP Detail Page

*   Header: title, description, rfc\_url link, attachments
*   Status: voting open/closed, time remaining
*   Options: each option's count + voting power
*   Progress: quorum %
*   Voter list: account, selected option(s), voting power
*   **Voter Action**: Select option + Submit (if connected + not voted + open)
*   Link to originating TC

### 4.5 Create TC Page

*   Form: title, description, rfc\_url, attachments, max\_selections
*   Submit via wallet transaction
* * *

## 5\. Vote Collector

### 5.1 Purpose

Node.js CLI that calculates vote results by:
1. Reading votes from on-ledger governance contract state
2. Fetching LSU holdings for each voter at snapshot time
3. Converting LSU → XRD voting power via validator redemption rates
4. Storing calculated results in PostgreSQL

### 5.2 Data Flow

```scss
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Radix Gateway  │────▶│  Vote Collector │────▶│   PostgreSQL    │
│      API        │     │     (Node.js)   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 5.3 Inputs (from Radix Gateway)

| Data | Source |
| ---| --- |
| TC/RFP details | Governance component state |
| Votes | Governance component KVStore |
| Voter LSU holdings | Account fungible resources at snapshot |
| LSU → XRD rate | Validator component state |

### 5.4 Outputs (to PostgreSQL)

| Table | Contents |
| ---| --- |
| `tc_results` | TC id, status, total\_for, total\_against, quorum\_met, passed |
| `rfp_results` | RFP id, status, winning\_option, quorum\_met |
| `voter_power` | vote\_id, account, vote\_choice, voting\_power |

### 5.5 Invocation

```bash
# Calculate results for specific TC
vote-collector tc <tc_id>

# Calculate results for specific RFP
vote-collector rfp <rfp_id>
```

### 5.6 Configuration

| Env Var | Description |
| ---| --- |
| `NETWORK` | `stokenet` or `mainnet` |
| `GATEWAY_URL` | Radix Gateway API endpoint |
| `GOVERNANCE_COMPONENT` | Component address |
| `DATABASE_URL` | PostgreSQL connection string |

* * *

## 6\. Success Criteria

### 6.1 Functional Requirements

| Requirement | Acceptance |
| ---| --- |
| Create TC | User can submit TC via wallet transaction, appears on home page |
| Vote on TC | User can cast For/Against vote, vote recorded on-ledger |
| TC Results | Vote Collector calculates correct totals with LSU-weighted power |
| Promote TC | Admin can promote passed TC to RFP with defined options |
| Vote on RFP | User can select option, vote recorded on-ledger |
| RFP Results | Vote Collector calculates correct totals with LSU-weighted power |
| View Results | dApp displays accurate tallies from PostgreSQL |

### 6.2 Non-Functional Requirements

| Requirement | Target |
| ---| --- |
| Network support | Stokenet and Mainnet via config |
| Wallet support | Radix Wallet via dApp Toolkit |
| Data accuracy | Vote power matches on-ledger LSU at snapshot |
| Transparency | All votes publicly visible with voter + power |

* * *

## 7\. Out of Scope (v1)

| Item | Reason |
| ---| --- |
| Vote delegation | Exists in contract, not exposed in dApp v1 |
| Admin page for GovernanceParameters | Managed outside dApp |
| Real-time vote updates | On-demand calculation only |
| Vote change/revocation | Votes are final by design |
| Comment/discussion on votes | Use rfc\_url to RadixTalk instead |

* * *

## 8\. Open Questions

| Question | Impact | Notes |
| ---| ---| --- |
| Voting power mechanism | Core calculation | Currently assuming LSU → XRD |
| Spam protection for TCs | UX / governance quality | Anyone can create — may need lock amount or rate limiting later |
| Attachment storage | dApp | Where do TC/RFP attachments live? On-ledger (expensive) or off-chain ( S3)? |