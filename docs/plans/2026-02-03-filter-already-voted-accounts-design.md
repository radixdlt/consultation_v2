# Filter Already-Voted Accounts from Voting Transactions

When sending a voting transaction, filter out accounts that have already voted.

## Decisions

- **Filtering location:** Atom layer (not component)
- **UI when all voted:** Hide `VotingSection` entirely
- **Checkbox text:** Unchanged — filtering is invisible to user
- **Edge case (no accounts to vote):** Throw error, show info toast

## Behavior

1. `voteOnTemperatureCheckBatchAtom` subscribes to `getTemperatureCheckVotesByAccountsAtom`
2. Filters out accounts that have already voted before submitting
3. If no accounts remain, throws `AllAccountsAlreadyVotedError`
4. Toast displays conditional message based on account count

## Error Handling

```typescript
export class AllAccountsAlreadyVotedError extends Data.TaggedError(
  "AllAccountsAlreadyVotedError"
)<{ message: string }> {}

// Message logic
const message = input.accounts.length === 1
  ? "This account has already voted"
  : "All selected accounts have already voted";
```

## Data Flow

```
SidebarContent
  ├── accountsVotesResult ──┬──→ VotingSection (new prop)
  │                         └──→ YourVotesSection (existing)
  └── keyValueStoreAddress ────→ VotingSection (new prop)
```

## Component Changes

### VotingSection.tsx

New props:
- `keyValueStoreAddress: KeyValueStoreAddress`
- `accountsVotesResult: Result.Result<VotedAccount[], unknown>`

Visibility logic using `Result.builder`:
- Hide section (`return null`) when all connected accounts have voted
- Still show disconnected/loading states when appropriate

### SidebarContent.tsx

Pass new props to `VotingSection`:
```typescript
<VotingSection
  temperatureCheckId={id}
  keyValueStoreAddress={temperatureCheck.votes}
  accountsVotesResult={accountsVotesResult}
/>
```

### temperatureChecksAtom.ts

1. Add `AllAccountsAlreadyVotedError` tagged error
2. Add `keyValueStoreAddress` to batch atom input
3. Subscribe to `getTemperatureCheckVotesByAccountsAtom(keyValueStoreAddress)`
4. Filter `accountsToVote` before batch loop
5. Yield error if `accountsToVote.length === 0`

## Files to Modify

1. `apps/consultation/src/atom/temperatureChecksAtom.ts`
2. `apps/consultation/src/routes/tc/$id/-$id/components/VotingSection.tsx`
3. `apps/consultation/src/routes/tc/$id/-$id/components/SidebarContent.tsx`
