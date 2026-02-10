import { Result, useAtomValue } from '@effect-atom/atom-react'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import { voteResultsAtom } from '@/atom/voteResultsAtom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type VoteResultsSectionProps = {
  id: TemperatureCheckId
}

export function VoteResultsSection({ id }: VoteResultsSectionProps) {
  const voteResultsResult = useAtomValue(voteResultsAtom(id))

  return Result.builder(voteResultsResult)
    .onInitial(() => null)
    .onFailure(() => null)
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
                  {result.votePower}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )
    })
    .render()
}
