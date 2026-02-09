export type ProposalVotedAccount = {
  address: string
  label: string
  options: readonly number[]
}

export type VoteOption = { readonly id: number; readonly label: string }
