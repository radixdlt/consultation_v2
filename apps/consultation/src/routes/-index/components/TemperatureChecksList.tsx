import { Result, useAtomValue } from '@effect-atom/atom-react'
import { Cause } from 'effect'
import { useEffect, useState } from 'react'
import type { TemperatureCheck } from 'shared/governance/schemas'
import {
  paginatedTemperatureChecksAtom,
  type SortOrder
} from '@/atom/temperatureChecksAtom'
import { InlineCode } from '@/components/ui/typography'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { CardSkeletonList } from './CardSkeleton'
import { EmptyState } from './EmptyState'
import { ItemCard } from './ItemCard'
import { Pagination } from './Pagination'

type TemperatureChecksListProps = {
  sortOrder: SortOrder
}

export function TemperatureChecksList({
  sortOrder
}: TemperatureChecksListProps) {
  const [page, setPage] = useState(1)
  const result = useAtomValue(paginatedTemperatureChecksAtom(page)(sortOrder))
  const isAdmin = useIsAdmin()

  // Reset to page 1 when sort order changes
  useEffect(() => {
    setPage(1)
  }, [sortOrder])

  return Result.builder(result)
    .onInitial(() => <CardSkeletonList />)
    .onSuccess((data) => {
      const visibleItems = data.items.filter((tc) => isAdmin || !tc.hidden)

      if (visibleItems.length === 0 && data.page === 1) {
        return <EmptyState type="temperature-check" />
      }

      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {visibleItems.map((tc: TemperatureCheck) => (
              <ItemCard
                key={tc.id}
                id={tc.id}
                title={tc.title}
                shortDescription={tc.shortDescription}
                author={tc.author}
                start={tc.start}
                deadline={tc.deadline}
                quorum={Number(tc.quorum)}
                linkPrefix="/tc"
                hidden={tc.hidden}
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
