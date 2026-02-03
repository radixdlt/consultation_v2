import { Result, useAtomValue } from "@effect-atom/atom-react";
import { Cause } from "effect";
import { useState } from "react";
import type { Proposal } from "shared/governance/schemas";
import { paginatedProposalsAtom } from "@/atom/proposalsAtom";
import { InlineCode } from "@/components/ui/typography";
import { CardSkeletonList } from "./CardSkeleton";
import { EmptyState } from "./EmptyState";
import { ItemCard } from "./ItemCard";
import { Pagination } from "./Pagination";

export function ProposalsList() {
	const [page, setPage] = useState(1);
	const result = useAtomValue(paginatedProposalsAtom(page));

	return Result.builder(result)
		.onInitial(() => <CardSkeletonList />)
		.onSuccess((data) => {
			if (data.items.length === 0 && data.page === 1) {
				return <EmptyState type="proposal" />;
			}

			return (
				<div className="flex flex-col gap-6">
					<div className="flex flex-col gap-4">
						{data.items.map((proposal: Proposal) => (
							<ItemCard
								key={proposal.id}
								id={proposal.id}
								title={proposal.title}
								shortDescription={proposal.shortDescription}
								author={proposal.author}
								start={proposal.start}
								deadline={proposal.deadline}
								voteCount={proposal.voteCount}
								quorum={proposal.quorum}
								linkPrefix="/proposal"
							/>
						))}
					</div>

					<Pagination
						currentPage={data.page}
						totalPages={data.totalPages}
						onPageChange={setPage}
					/>
				</div>
			);
		})
		.onFailure((error) => <InlineCode>{Cause.pretty(error)}</InlineCode>)
		.render();
}
