export type VoteOption = { readonly id: number; readonly label: string }

export const TC_VOTE_OPTIONS = [
  { id: 0, label: 'For' },
  { id: 1, label: 'Against' }
] as const

export type ResolvedVoteOption = {
  key: string
  label: string
}

export function resolveVoteOptions(
  entityType: 'temperature_check' | 'proposal',
  voteOptions: readonly VoteOption[]
): ResolvedVoteOption[] {
  const isTc = entityType === 'temperature_check'
  return voteOptions.map((opt) => ({
    key: isTc ? opt.label : String(opt.id),
    label: opt.label
  }))
}
