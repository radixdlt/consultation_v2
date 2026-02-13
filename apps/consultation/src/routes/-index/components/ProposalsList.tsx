import { Result, useAtomValue } from '@effect-atom/atom-react'
import { Cause } from 'effect'
import { useEffect, useState } from 'react'
import type { Proposal } from 'shared/governance/schemas'
import { paginatedProposalsAtom, type SortOrder } from '@/atom/proposalsAtom'
import { InlineCode } from '@/components/ui/typography'
import { useIsAdmin } from '@/hooks/useIsAdmin'
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
  const isAdmin = useIsAdmin()

  // Reset to page 1 when sort order changes
  useEffect(() => {
    setPage(1)
  }, [sortOrder])

  return Result.builder(result)
    .onInitial(() => <CardSkeletonList />)
    .onSuccess((data) => {
      const visibleItems = data.items.filter((p) => isAdmin || !p.hidden)

      if (visibleItems.length === 0 && data.page === 1) {
        return <EmptyState type="proposal" />
      }

      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {visibleItems.map((proposal: Proposal) => (
              <ItemCard
                key={proposal.id}
                id={proposal.id}
                title={proposal.title}
                shortDescription={proposal.shortDescription}
                author={proposal.author}
                start={proposal.start}
                deadline={proposal.deadline}
                quorum={Number(proposal.quorum)}
                linkPrefix="/proposal"
                hidden={proposal.hidden}
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
