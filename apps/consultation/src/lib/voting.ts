export type VoteOption = { readonly id: number; readonly label: string }

export type VoteColor = {
  bar: string
  dot: string
  filterActive: string
  filterInactive: string
  selected: string
}

export const TC_VOTE_OPTIONS = [
  { id: 0, label: 'For' },
  { id: 1, label: 'Against' }
] as const

const PALETTE: VoteColor[] = [
  // 0 - Green
  {
    bar: 'bg-green-600 dark:bg-green-500',
    dot: 'bg-green-500',
    filterActive: 'bg-green-600 text-white border-transparent',
    filterInactive:
      'bg-green-50 text-green-700 border-green-300 hover:opacity-80 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    selected: 'bg-green-600 text-white border-green-600'
  },
  // 1 - Red
  {
    bar: 'bg-red-500 dark:bg-red-400',
    dot: 'bg-red-500',
    filterActive: 'bg-red-600 text-white border-transparent',
    filterInactive:
      'bg-red-50 text-red-700 border-red-300 hover:opacity-80 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
    selected: 'bg-red-600 text-white border-red-600'
  },
  // 2 - Orange
  {
    bar: 'bg-orange-500 dark:bg-orange-400',
    dot: 'bg-orange-500',
    filterActive: 'bg-orange-600 text-white border-transparent',
    filterInactive:
      'bg-orange-50 text-orange-700 border-orange-300 hover:opacity-80 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
    selected: 'bg-orange-600 text-white border-orange-600'
  },
  // 3 - Purple
  {
    bar: 'bg-purple-500 dark:bg-purple-400',
    dot: 'bg-purple-500',
    filterActive: 'bg-purple-600 text-white border-transparent',
    filterInactive:
      'bg-purple-50 text-purple-700 border-purple-300 hover:opacity-80 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
    selected: 'bg-purple-600 text-white border-purple-600'
  },
  // 4 - Blue
  {
    bar: 'bg-blue-500 dark:bg-blue-400',
    dot: 'bg-blue-500',
    filterActive: 'bg-blue-600 text-white border-transparent',
    filterInactive:
      'bg-blue-50 text-blue-700 border-blue-300 hover:opacity-80 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    selected: 'bg-blue-600 text-white border-blue-600'
  },
  // 5 - Teal
  {
    bar: 'bg-teal-500 dark:bg-teal-400',
    dot: 'bg-teal-500',
    filterActive: 'bg-teal-600 text-white border-transparent',
    filterInactive:
      'bg-teal-50 text-teal-700 border-teal-300 hover:opacity-80 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700',
    selected: 'bg-teal-600 text-white border-teal-600'
  },
  // 6 - Pink
  {
    bar: 'bg-pink-500 dark:bg-pink-400',
    dot: 'bg-pink-500',
    filterActive: 'bg-pink-600 text-white border-transparent',
    filterInactive:
      'bg-pink-50 text-pink-700 border-pink-300 hover:opacity-80 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700',
    selected: 'bg-pink-600 text-white border-pink-600'
  },
  // 7 - Yellow
  {
    bar: 'bg-yellow-500 dark:bg-yellow-400',
    dot: 'bg-yellow-500',
    filterActive: 'bg-yellow-600 text-white border-transparent',
    filterInactive:
      'bg-yellow-50 text-yellow-700 border-yellow-300 hover:opacity-80 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
    selected: 'bg-yellow-600 text-white border-yellow-600'
  },
  // 8 - Cyan
  {
    bar: 'bg-cyan-500 dark:bg-cyan-400',
    dot: 'bg-cyan-500',
    filterActive: 'bg-cyan-600 text-white border-transparent',
    filterInactive:
      'bg-cyan-50 text-cyan-700 border-cyan-300 hover:opacity-80 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700',
    selected: 'bg-cyan-600 text-white border-cyan-600'
  },
  // 9 - Amber
  {
    bar: 'bg-amber-600 dark:bg-amber-500',
    dot: 'bg-amber-500',
    filterActive: 'bg-amber-600 text-white border-transparent',
    filterInactive:
      'bg-amber-50 text-amber-700 border-amber-300 hover:opacity-80 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    selected: 'bg-amber-600 text-white border-amber-600'
  }
]

const FALLBACK_COLOR: VoteColor = {
  bar: 'bg-neutral-400 dark:bg-neutral-500',
  dot: 'bg-neutral-400',
  filterActive: 'bg-neutral-600 text-white border-transparent',
  filterInactive:
    'bg-neutral-50 text-neutral-700 border-neutral-300 hover:opacity-80 dark:bg-neutral-900/30 dark:text-neutral-300 dark:border-neutral-700',
  selected: 'bg-neutral-600 text-white border-neutral-600'
}

const TC_COLOR_MAP: Record<string, number> = {
  For: 0,
  Against: 1
}

export function getTcVoteColor(label: string): VoteColor {
  const index = TC_COLOR_MAP[label]
  return index !== undefined ? PALETTE[index] : FALLBACK_COLOR
}

export function getProposalVoteColor(index: number): VoteColor {
  return PALETTE[index % PALETTE.length]
}

export type ResolvedVoteOption = {
  key: string
  label: string
  color: VoteColor
}

export function resolveVoteOptions(
  entityType: 'temperature_check' | 'proposal',
  voteOptions: readonly VoteOption[]
): ResolvedVoteOption[] {
  const isTc = entityType === 'temperature_check'
  return voteOptions.map((opt, index) => ({
    key: isTc ? opt.label : String(opt.id),
    label: opt.label,
    color: isTc ? getTcVoteColor(opt.label) : getProposalVoteColor(index)
  }))
}
