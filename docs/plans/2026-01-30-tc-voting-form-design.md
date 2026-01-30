# Temperature Check Voting Form Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add For/Against voting UI to the TC detail page so connected wallet users can cast votes.

**Architecture:** VotingSection component reads wallet state from `accountsAtom`, renders disabled buttons when disconnected or active vote buttons when connected. Voting uses existing `voteOnTemperatureCheckAtom`.

**Tech Stack:** React, Effect.js, @effect-atom/atom-react, TanStack Router, Radix dApp Toolkit

---

## Task 1: Create VotingSection Component

**Files:**
- Create: `apps/consultation/src/routes/tc/$id/-$id/components/VotingSection.tsx`

**Step 1: Create the component file**

```tsx
import { Result, useAtom, useAtomValue } from "@effect-atom/atom-react";
import { AccountAddress } from "@radix-effects/shared";
import { LoaderIcon } from "lucide-react";
import { useState } from "react";
import type { TemperatureCheckId } from "shared/governance/brandedTypes";
import { accountsAtom } from "@/atom/dappToolkitAtom";
import { voteOnTemperatureCheckAtom } from "@/atom/temperatureChecksAtom";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type VotingSectionProps = {
	temperatureCheckId: TemperatureCheckId;
};

export function VotingSection({ temperatureCheckId }: VotingSectionProps) {
	const accounts = useAtomValue(accountsAtom);

	return Result.builder(accounts)
		.onInitial(() => <VotingSkeleton />)
		.onSuccess((accountList) => {
			const firstAccount = accountList?.[0];
			if (!firstAccount) {
				return <DisconnectedVoting />;
			}
			return (
				<ConnectedVoting
					temperatureCheckId={temperatureCheckId}
					accountAddress={AccountAddress.make(firstAccount.address)}
				/>
			);
		})
		.onFailure(() => <DisconnectedVoting />)
		.render();
}

function VotingSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Cast Your Vote</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex gap-4">
					<Button disabled className="flex-1">
						For
					</Button>
					<Button disabled className="flex-1">
						Against
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function DisconnectedVoting() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Cast Your Vote</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex gap-4">
					<Button disabled className="flex-1">
						For
					</Button>
					<Button disabled className="flex-1">
						Against
					</Button>
				</div>
				<p className="text-sm text-muted-foreground text-center">
					Connect wallet to vote
				</p>
			</CardContent>
		</Card>
	);
}

type ConnectedVotingProps = {
	temperatureCheckId: TemperatureCheckId;
	accountAddress: AccountAddress;
};

function ConnectedVoting({
	temperatureCheckId,
	accountAddress,
}: ConnectedVotingProps) {
	const [voteResult, vote] = useAtom(voteOnTemperatureCheckAtom);
	const [selectedVote, setSelectedVote] = useState<"For" | "Against" | null>(
		null,
	);

	const handleVote = (voteChoice: "For" | "Against") => {
		setSelectedVote(voteChoice);
		vote({
			accountAddress,
			temperatureCheckId,
			vote: voteChoice,
		});
	};

	const isLoading = voteResult.waiting;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Cast Your Vote</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex gap-4">
					<Button
						onClick={() => handleVote("For")}
						disabled={isLoading}
						className="flex-1"
					>
						{isLoading && selectedVote === "For" ? (
							<LoaderIcon className="size-4 animate-spin" />
						) : null}
						For
					</Button>
					<Button
						onClick={() => handleVote("Against")}
						disabled={isLoading}
						variant="outline"
						className="flex-1"
					>
						{isLoading && selectedVote === "Against" ? (
							<LoaderIcon className="size-4 animate-spin" />
						) : null}
						Against
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
```

**Step 2: Verify file was created**

Run: `ls -la apps/consultation/src/routes/tc/\$id/-\$id/components/`
Expected: `VotingSection.tsx` exists

**Step 3: Commit**

```bash
git add apps/consultation/src/routes/tc/\$id/-\$id/components/VotingSection.tsx
git commit -m "feat(tc): add VotingSection component"
```

---

## Task 2: Add VotingSection to TC Detail Page

**Files:**
- Modify: `apps/consultation/src/routes/tc/$id/-$id/index.tsx`

**Step 1: Update the page to include VotingSection**

Replace contents of `apps/consultation/src/routes/tc/$id/-$id/index.tsx`:

```tsx
import { Result, useAtomValue } from "@effect-atom/atom-react";
import { Cause } from "effect";
import type { TemperatureCheckId } from "shared/governance/brandedTypes";
import { getTemperatureCheckByIdAtom } from "@/atom/temperatureChecksAtom";
import { InlineCode } from "@/components/ui/typography";
import { VotingSection } from "./components/VotingSection";

export function Page({ id }: { id: TemperatureCheckId }) {
	const temperatureCheck = useAtomValue(getTemperatureCheckByIdAtom(id));

	return Result.builder(temperatureCheck)
		.onInitial(() => {
			return <div>Loading...</div>;
		})
		.onSuccess((temperatureCheck) => {
			return (
				<div className="space-y-6">
					<div>
						<h1 className="text-2xl font-bold">{temperatureCheck.title}</h1>
						<p className="mt-2">{temperatureCheck.description}</p>
						<p className="mt-2">
							<a
								href={temperatureCheck.radixTalkUrl.toString()}
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary underline"
							>
								View discussion on RadixTalk
							</a>
						</p>
					</div>

					<VotingSection temperatureCheckId={id} />
				</div>
			);
		})
		.onFailure((error) => {
			return <InlineCode>{Cause.pretty(error)}</InlineCode>;
		})
		.render();
}
```

**Step 2: Type check**

Run: `pnpm --filter consultation exec tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/consultation/src/routes/tc/\$id/-\$id/index.tsx
git commit -m "feat(tc): integrate VotingSection into detail page"
```

---

## Task 3: Manual Testing

**Step 1: Start dev server**

Run: `pnpm --filter consultation dev`

**Step 2: Test disconnected state**

1. Navigate to `/tc/0` (or any valid TC id)
2. Verify: For/Against buttons are disabled
3. Verify: "Connect wallet to vote" message appears

**Step 3: Test connected state**

1. Click connect button in header
2. Connect Radix wallet
3. Verify: For/Against buttons become active
4. Click "For" button
5. Verify: Wallet popup appears requesting transaction approval

**Step 4: Commit completion**

```bash
git commit --allow-empty -m "test: manual verification of TC voting form complete"
```
