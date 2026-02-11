import { Result, useAtomValue } from '@effect-atom/atom-react'
import type { ProposalId } from 'shared/governance/brandedTypes'
import { voteResultsAtom } from '@/atom/voteResultsAtom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { VoteOption } from '../types'

type VoteResultsSectionProps = {
  id: ProposalId
  voteOptions: readonly VoteOption[]
}

export function VoteResultsSection({
  id,
  voteOptions
}: VoteResultsSectionProps) {
  const voteResultsResult = useAtomValue(voteResultsAtom('proposal')(id))

  const optionLabelMap = new Map(
    voteOptions.map((opt) => [String(opt.id), opt.label])
  )

  return Result.builder(voteResultsResult)
    .onInitial(() => null)
    .onFailure(() => (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Failed to load vote results.
        </CardContent>
      </Card>
    ))
    .onSuccess((results) => {
      if (results.length === 0) return null

      return (
        <Card>
          <CardHeader>
            <CardTitle>Vote Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.map((result) => (
              <div
                key={result.vote}
                className="flex items-center justify-between gap-2"
              >
                <span className="font-medium">
                  {optionLabelMap.get(result.vote) ?? `Option ${result.vote}`}
                </span>
                <span className="text-muted-foreground text-sm tabular-nums">
                  {Number(result.votePower).toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )
    })
    .render()
}
