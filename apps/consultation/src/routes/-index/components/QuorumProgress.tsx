type QuorumProgressProps = {
  voteCount: number
  quorum: string
  isActive?: boolean
}

function formatXrd(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return value.toLocaleString()
}

/**
 * Right-hand stats panel matching the reference app style.
 * Quorum progress percentage and bar, plus vote power.
 * Some values are placeholders until wired to real data.
 */
export function QuorumProgress({
  voteCount,
  quorum,
  isActive
}: QuorumProgressProps) {
  // Placeholder: real quorum progress requires total voting power data
  const quorumProgress = 0
  const quorumProgressCapped = Math.min(quorumProgress, 100)
  const isHighProgress = quorumProgress >= 100

  // Placeholder: total voting power not yet available
  const totalPower = 0

  return (
    <div className="flex flex-col justify-center gap-4">
      {/* Quorum Progress */}
      <div>
        <div className="text-xs text-neutral-500 uppercase mb-1">
          Quorum Progress
        </div>
        <div
          className={`text-lg font-semibold ${isHighProgress ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
        >
          {quorumProgress}%
        </div>
        <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 mt-2 overflow-hidden">
          <div
            className={`h-full ${isActive ? 'bg-emerald-500' : 'bg-neutral-400 dark:bg-neutral-600'}`}
            style={{ width: `${quorumProgressCapped}%` }}
          />
        </div>
      </div>

      {/* Votes */}
      <div>
        <div className="text-xs text-neutral-500 uppercase mb-1">Votes</div>
        <div className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
          {formatXrd(totalPower)} XRD
        </div>
      </div>
    </div>
  )
}
