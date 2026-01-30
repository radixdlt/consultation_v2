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
