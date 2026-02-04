# Filter Already-Voted Accounts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent submitting vote transactions for accounts that have already voted.

**Architecture:** The batch vote atom subscribes to existing votes data, filters accounts before transaction, and throws a tagged error when no accounts can vote. VotingSection hides entirely when all connected accounts have voted.

**Tech Stack:** Effect.js, @effect-atom/atom-react, React, Sonner toast

---

### Task 1: Add AllAccountsAlreadyVotedError

**Files:**
- Modify: `apps/consultation/src/atom/temperatureChecksAtom.ts:150-154`

**Step 1: Add tagged error class after AccountAlreadyVotedError**

```typescript
export class AllAccountsAlreadyVotedError extends Data.TaggedError(
	"AllAccountsAlreadyVotedError",
)<{
	message: string;
}> {}
```

**Step 2: Commit**

```bash
git add apps/consultation/src/atom/temperatureChecksAtom.ts
git commit -m "feat: add AllAccountsAlreadyVotedError tagged error"
```

---

### Task 2: Update voteOnTemperatureCheckBatchAtom Input Type

**Files:**
- Modify: `apps/consultation/src/atom/temperatureChecksAtom.ts:203-209`

**Step 1: Add keyValueStoreAddress to input type**

Change the input type from:
```typescript
function* (input: {
	accounts: WalletDataStateAccount[];
	temperatureCheckId: TemperatureCheckId;
	vote: "For" | "Against";
})
```

To:
```typescript
function* (input: {
	accounts: WalletDataStateAccount[];
	temperatureCheckId: TemperatureCheckId;
	keyValueStoreAddress: KeyValueStoreAddress;
	vote: "For" | "Against";
}, get)
```

Note: Add `get` parameter to access other atoms.

**Step 2: Add KeyValueStoreAddress import if not present**

Verify `KeyValueStoreAddress` is imported from `shared/schemas`.

**Step 3: Commit**

```bash
git add apps/consultation/src/atom/temperatureChecksAtom.ts
git commit -m "feat: add keyValueStoreAddress to batch vote input"
```

---

### Task 3: Implement Filtering Logic in Batch Atom

**Files:**
- Modify: `apps/consultation/src/atom/temperatureChecksAtom.ts:203-234`

**Step 1: Add filtering logic at start of generator function**

Insert after the input destructuring, before the `results` array:

```typescript
// Get existing votes for connected accounts
const existingVotes = yield* get.result(
	getTemperatureCheckVotesByAccountsAtom(input.keyValueStoreAddress)
);

const alreadyVotedAddresses = new Set(
	existingVotes.map((v) => v.address)
);

// Filter out accounts that have already voted
const accountsToVote = input.accounts.filter(
	(acc) => !alreadyVotedAddresses.has(acc.address)
);

// If no accounts can vote, return error
if (accountsToVote.length === 0) {
	const message =
		input.accounts.length === 1
			? "This account has already voted"
			: "All selected accounts have already voted";
	return yield* new AllAccountsAlreadyVotedError({ message });
}
```

**Step 2: Update the for loop to use accountsToVote**

Change:
```typescript
for (const account of input.accounts) {
```

To:
```typescript
for (const account of accountsToVote) {
```

**Step 3: Commit**

```bash
git add apps/consultation/src/atom/temperatureChecksAtom.ts
git commit -m "feat: filter already-voted accounts in batch atom"
```

---

### Task 4: Update Toast Error Handler

**Files:**
- Modify: `apps/consultation/src/atom/temperatureChecksAtom.ts:235-245`

**Step 1: Update whenFailure to handle AllAccountsAlreadyVotedError**

Change:
```typescript
whenFailure: () => Option.some("Failed to submit votes"),
```

To:
```typescript
whenFailure: ({ cause }) => {
	if (cause._tag === "Fail") {
		if (cause.error instanceof AllAccountsAlreadyVotedError) {
			return Option.some(cause.error.message);
		}
	}
	return Option.some("Failed to submit votes");
},
```

**Step 2: Commit**

```bash
git add apps/consultation/src/atom/temperatureChecksAtom.ts
git commit -m "feat: handle AllAccountsAlreadyVotedError in toast"
```

---

### Task 5: Update VotingSection Props Interface

**Files:**
- Modify: `apps/consultation/src/routes/tc/$id/-$id/components/VotingSection.tsx:94-117`

**Step 1: Add imports**

Add to imports:
```typescript
import type { Result } from "@effect-atom/atom-react";
import type { KeyValueStoreAddress } from "shared/schemas";
```

**Step 2: Update VotingSectionProps type**

Change:
```typescript
type VotingSectionProps = {
	temperatureCheckId: TemperatureCheckId;
};
```

To:
```typescript
type VotedAccount = {
	address: string;
	label: string;
	vote: "For" | "Against";
};

type VotingSectionProps = {
	temperatureCheckId: TemperatureCheckId;
	keyValueStoreAddress: KeyValueStoreAddress;
	accountsVotesResult: Result.Result<VotedAccount[], unknown>;
};
```

**Step 3: Update VotingSection function signature**

Change:
```typescript
export function VotingSection({ temperatureCheckId }: VotingSectionProps) {
```

To:
```typescript
export function VotingSection({
	temperatureCheckId,
	keyValueStoreAddress,
	accountsVotesResult,
}: VotingSectionProps) {
```

**Step 4: Commit**

```bash
git add apps/consultation/src/routes/tc/$id/-$id/components/VotingSection.tsx
git commit -m "feat: add new props to VotingSection"
```

---

### Task 6: Add Visibility Logic to VotingSection

**Files:**
- Modify: `apps/consultation/src/routes/tc/$id/-$id/components/VotingSection.tsx:98-117`

**Step 1: Update the onSuccess handler to check if all accounts voted**

Replace the current `onSuccess` callback:

```typescript
.onSuccess((accountList) => {
	if (accountList.length === 0) {
		return <DisconnectedVoting />;
	}

	// Check if all accounts have voted
	const allAccountsVoted = Result.builder(accountsVotesResult)
		.onSuccess(
			(votes) =>
				accountList.length > 0 &&
				accountList.every((acc) =>
					votes.some((v) => v.address === acc.address),
				),
		)
		.onInitial(() => false)
		.onFailure(() => false)
		.render();

	if (allAccountsVoted) return null;

	return (
		<ConnectedVoting
			temperatureCheckId={temperatureCheckId}
			keyValueStoreAddress={keyValueStoreAddress}
			accountList={accountList}
			accountsVotesResult={accountsVotesResult}
		/>
	);
})
```

**Step 2: Commit**

```bash
git add apps/consultation/src/routes/tc/$id/-$id/components/VotingSection.tsx
git commit -m "feat: hide VotingSection when all accounts voted"
```

---

### Task 7: Update ConnectedVoting Props and Implementation

**Files:**
- Modify: `apps/consultation/src/routes/tc/$id/-$id/components/VotingSection.tsx:145-198`

**Step 1: Update ConnectedVotingProps type**

Change:
```typescript
type ConnectedVotingProps = {
	temperatureCheckId: TemperatureCheckId;
	accountList: WalletDataStateAccount[];
};
```

To:
```typescript
type ConnectedVotingProps = {
	temperatureCheckId: TemperatureCheckId;
	keyValueStoreAddress: KeyValueStoreAddress;
	accountList: WalletDataStateAccount[];
	accountsVotesResult: Result.Result<VotedAccount[], unknown>;
};
```

**Step 2: Update ConnectedVoting function signature**

Change:
```typescript
function ConnectedVoting({
	temperatureCheckId,
	accountList,
}: ConnectedVotingProps) {
```

To:
```typescript
function ConnectedVoting({
	temperatureCheckId,
	keyValueStoreAddress,
	accountList,
	accountsVotesResult,
}: ConnectedVotingProps) {
```

**Step 3: Update handleVote to pass keyValueStoreAddress**

In handleVote callback, change:
```typescript
voteBatch({
	accounts: accountsToVote,
	temperatureCheckId,
	vote: voteChoice,
});
```

To:
```typescript
voteBatch({
	accounts: accountsToVote,
	temperatureCheckId,
	keyValueStoreAddress,
	vote: voteChoice,
});
```

**Step 4: Update useCallback dependencies**

Add `keyValueStoreAddress` to the dependency array:
```typescript
}, [accountList, temperatureCheckId, voteBatch, voteAllAccounts, keyValueStoreAddress]);
```

**Step 5: Commit**

```bash
git add apps/consultation/src/routes/tc/$id/-$id/components/VotingSection.tsx
git commit -m "feat: pass keyValueStoreAddress through ConnectedVoting"
```

---

### Task 8: Update SidebarContent to Pass New Props

**Files:**
- Modify: `apps/consultation/src/routes/tc/$id/-$id/components/SidebarContent.tsx:29`

**Step 1: Update VotingSection usage**

Change:
```typescript
<VotingSection temperatureCheckId={id} />
```

To:
```typescript
<VotingSection
	temperatureCheckId={id}
	keyValueStoreAddress={temperatureCheck.votes}
	accountsVotesResult={accountsVotesResult}
/>
```

**Step 2: Commit**

```bash
git add apps/consultation/src/routes/tc/$id/-$id/components/SidebarContent.tsx
git commit -m "feat: pass vote data to VotingSection"
```

---

### Task 9: Manual Testing

**Step 1: Start dev server**

```bash
pnpm dev
```

**Step 2: Test scenarios**

1. Connect wallet with multiple accounts
2. Vote with one account on a temperature check
3. Verify "Your Votes" section shows the vote
4. Verify VotingSection still visible (not all accounts voted)
5. Vote with remaining accounts
6. Verify VotingSection disappears after all accounts voted
7. Reconnect with a fresh account that hasn't voted
8. Verify VotingSection reappears

**Step 3: Test edge case - single account already voted**

1. Connect wallet with one account
2. Vote on a temperature check
3. Verify VotingSection disappears
4. Verify clicking vote before it disappears shows toast "This account has already voted"

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: filter already-voted accounts from voting transactions

- Add AllAccountsAlreadyVotedError tagged error
- Filter accounts in voteOnTemperatureCheckBatchAtom
- Hide VotingSection when all connected accounts have voted
- Show informative toast when no accounts can vote"
```
