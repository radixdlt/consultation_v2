import { Result, useAtomValue } from '@effect-atom/atom-react'
import { Cause } from 'effect'
import { useEffect, useState } from 'react'
import type { Proposal } from 'shared/governance/schemas'
import { paginatedProposalsAtom, type SortOrder } from '@/atom/proposalsAtom'
import { InlineCode } from '@/components/ui/typography'
import { CardSkeletonList } from './CardSkeleton'
import { EmptyState } from './EmptyState'
import { ItemCard } from './ItemCard'
import { Pagination } from './Pagination'

type ProposalsListProps = {
  sortOrder: SortOrder
}

export function ProposalsList({ sortOrder }: ProposalsListProps) {
  const [page, setPage] = useState(1)
  const result = useAtomValue(paginatedProposalsAtom(page)(sortOrder))

  // Reset to page 1 when sort order changes
  useEffect(() => {
    setPage(1)
  }, [sortOrder])

  return Result.builder(result)
    .onInitial(() => <CardSkeletonList />)
    .onSuccess((data) => {
      if (data.items.length === 0 && data.page === 1) {
        return <EmptyState type="proposal" />
      }

      return (
        <div className="flex flex-col gap-4">
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
      )
    })
    .onFailure((error) => <InlineCode>{Cause.pretty(error)}</InlineCode>)
    .render()
}
