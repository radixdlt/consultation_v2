type QuorumProgressProps = {
  voteCount: number
  quorum: string
}

/**
 * Displays vote count and quorum threshold.
 * Note: Progress percentage cannot be calculated without total eligible voting power data.
 */
export function QuorumProgress({ voteCount, quorum }: QuorumProgressProps) {
  const quorumPercentage = (Number.parseFloat(quorum) * 100).toFixed(0)

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="text-right">
        <div className="text-sm font-medium text-foreground">
          {voteCount.toLocaleString()} votes
        </div>
        <div className="text-xs text-muted-foreground">
          {quorumPercentage}% quorum threshold
        </div>
      </div>
    </div>
  )
}
