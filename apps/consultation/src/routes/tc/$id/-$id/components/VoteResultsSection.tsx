import { Result, useAtomMount, useAtomValue } from '@effect-atom/atom-react'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import { voteResultsAtom, voteUpdatesAtom } from '@/atom/voteResultsAtom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type VoteResultsSectionProps = {
  id: TemperatureCheckId
}

export function VoteResultsSection({ id }: VoteResultsSectionProps) {
  useAtomMount(voteUpdatesAtom('temperature_check')(id))
  const voteResultsResult = useAtomValue(voteResultsAtom('temperature_check')(id))

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
                <span className="font-medium">{result.vote}</span>
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
