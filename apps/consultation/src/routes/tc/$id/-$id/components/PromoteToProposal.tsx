import { Result, useAtom, useAtomValue } from "@effect-atom/atom-react";
import { useNavigate } from "@tanstack/react-router";
import { Option } from "effect";
import { ArrowRight, LoaderIcon, ShieldCheck } from "lucide-react";
import { useCallback } from "react";
import type {
	ProposalId,
	TemperatureCheckId,
} from "shared/governance/brandedTypes";
import { isAdminAtom, promoteToProposalAtom } from "@/atom/adminAtom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentAccount } from "@/hooks/useCurrentAccount";

type PromoteToProposalProps = {
	temperatureCheckId: TemperatureCheckId;
	elevatedProposalId: Option.Option<ProposalId>;
};

export function PromoteToProposal({
	temperatureCheckId,
	elevatedProposalId,
}: PromoteToProposalProps) {
	if (Option.isSome(elevatedProposalId)) {
		return <ElevatedCard proposalId={elevatedProposalId.value} />;
	}

	return <AdminPromoteCard temperatureCheckId={temperatureCheckId} />;
}

function ElevatedCard({ proposalId }: { proposalId: ProposalId }) {
	const navigate = useNavigate();

	const handleNavigate = useCallback(() => {
		navigate({ to: "/proposal/$id", params: { id: String(proposalId) } });
	}, [navigate, proposalId]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ShieldCheck className="size-4" />
					Proposal
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground mb-3">
					This temperature check has been elevated to a proposal.
				</p>
				<Button
					type="button"
					variant="outline"
					onClick={handleNavigate}
					className="w-full"
				>
					View Proposal
					<ArrowRight className="size-4" />
				</Button>
			</CardContent>
		</Card>
	);
}

function AdminPromoteCard({
	temperatureCheckId,
}: { temperatureCheckId: TemperatureCheckId }) {
	const currentAccount = useCurrentAccount();

	if (!currentAccount) return null;

	const accountAddress = currentAccount.address;

	return (
		<AdminPromoteCardWithAddress
			temperatureCheckId={temperatureCheckId}
			accountAddress={accountAddress}
		/>
	);
}

function AdminPromoteCardWithAddress({
	temperatureCheckId,
	accountAddress,
}: { temperatureCheckId: TemperatureCheckId; accountAddress: string }) {
	const isAdminResult = useAtomValue(isAdminAtom(accountAddress));

	return Result.builder(isAdminResult)
		.onInitial(() => null)
		.onFailure(() => null)
		.onSuccess((isAdmin) => {
			if (!isAdmin) return null;

			return <PromoteCard temperatureCheckId={temperatureCheckId} />;
		})
		.render();
}

function PromoteCard({
	temperatureCheckId,
}: { temperatureCheckId: TemperatureCheckId }) {
	const [promoteResult, promote] = useAtom(promoteToProposalAtom);

	const isSubmitting = promoteResult.waiting;

	const handlePromote = useCallback(() => {
		promote(temperatureCheckId);
	}, [promote, temperatureCheckId]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ShieldCheck className="size-4" />
					Admin
				</CardTitle>
			</CardHeader>
			<CardContent>
				<Button
					type="button"
					onClick={handlePromote}
					disabled={isSubmitting}
					className="w-full"
				>
					{isSubmitting && (
						<LoaderIcon className="size-4 animate-spin" />
					)}
					Promote to Proposal
				</Button>
			</CardContent>
		</Card>
	);
}
