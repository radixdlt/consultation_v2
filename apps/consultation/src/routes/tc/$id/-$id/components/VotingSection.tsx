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

type Vote = "For" | "Against";

type VoteButtonProps = {
	vote: Vote;
	onClick?: () => void;
	disabled?: boolean;
	loading?: boolean;
};

function VoteButton({ vote, onClick, disabled, loading }: VoteButtonProps) {
	const colorClasses =
		vote === "For"
			? "bg-emerald-600 hover:bg-emerald-700"
			: "bg-rose-600 hover:bg-rose-700";

	return (
		<Button
			onClick={onClick}
			disabled={disabled}
			className={`flex-1 ${colorClasses} font-bold`}
		>
			{loading && <LoaderIcon className="size-4 animate-spin" />}
			{vote}
		</Button>
	);
}

type VoteButtonsProps = {
	onVote?: (vote: Vote) => void;
	disabled?: boolean;
	loadingVote?: Vote | null;
};

function VoteButtons({ onVote, disabled, loadingVote }: VoteButtonsProps) {
	return (
		<div className="flex gap-4">
			<VoteButton
				vote="For"
				onClick={() => onVote?.("For")}
				disabled={disabled}
				loading={loadingVote === "For"}
			/>
			<VoteButton
				vote="Against"
				onClick={() => onVote?.("Against")}
				disabled={disabled}
				loading={loadingVote === "Against"}
			/>
		</div>
	);
}

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
	return <DisconnectedVoting />;
}

function DisconnectedVoting() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Cast Your Vote</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="relative">
					<div className="blur-sm pointer-events-none">
						<VoteButtons disabled />
					</div>
					<div className="absolute inset-0 flex items-center justify-center">
						<p className="text-sm font-medium bg-background/80 px-3 py-1.5 rounded">
							Connect wallet to vote
						</p>
					</div>
				</div>
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
	const [selectedVote, setSelectedVote] = useState<Vote | null>(null);

	const handleVote = (voteChoice: Vote) => {
		setSelectedVote(voteChoice);
		vote({
			accountAddress,
			temperatureCheckId,
			vote: voteChoice,
		});
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Cast Your Vote</CardTitle>
			</CardHeader>
			<CardContent>
				<VoteButtons
					onVote={handleVote}
					disabled={voteResult.waiting}
					loadingVote={voteResult.waiting ? selectedVote : null}
				/>
			</CardContent>
		</Card>
	);
}
