import { Result, useAtomValue } from '@effect-atom/atom-react'
import { Cause } from 'effect'
import { useState } from 'react'
import type { TemperatureCheck } from 'shared/governance/schemas'
import {
  paginatedTemperatureChecksAtom,
  type SortOrder
} from '@/atom/temperatureChecksAtom'
import { InlineCode } from '@/components/ui/typography'
import { CardSkeletonList } from './CardSkeleton'
import { EmptyState } from './EmptyState'
import { ItemCard } from './ItemCard'
import { Pagination } from './Pagination'
import { SortToggle } from './SortToggle'

export function TemperatureChecksList() {
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const result = useAtomValue(paginatedTemperatureChecksAtom(page)(sortOrder))

  const handleSortOrderChange = (newSortOrder: SortOrder) => {
    setSortOrder(newSortOrder)
    setPage(1)
  }

  return Result.builder(result)
    .onInitial(() => <CardSkeletonList />)
    .onSuccess((data) => {
      if (data.items.length === 0 && data.page === 1) {
        return <EmptyState type="temperature-check" />
      }

      return (
        <div className="flex flex-col gap-6">
          <div className="flex justify-end">
            <SortToggle
              sortOrder={sortOrder}
              onSortOrderChange={handleSortOrderChange}
            />
          </div>

          <div className="flex flex-col gap-4">
            {data.items.map((tc: TemperatureCheck) => (
              <ItemCard
                key={tc.id}
                id={tc.id}
                title={tc.title}
                shortDescription={tc.shortDescription}
                author={tc.author}
                start={tc.start}
                deadline={tc.deadline}
                voteCount={tc.voteCount}
                quorum={tc.quorum}
                linkPrefix="/tc"
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
