import { Result, useAtomValue } from '@effect-atom/atom-react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { governanceParametersAtom } from '@/atom/governanceParametersAtom'
import { isAdminAtom } from '@/atom/adminAtom'
import { useCurrentAccount } from '@/hooks/useCurrentAccount'
import { Button } from '@/components/ui/button'
import { H1 } from '@/components/ui/typography'
import { formatXrd } from '@/lib/utils'

export const Page = () => {
  const parametersResult = useAtomValue(governanceParametersAtom)

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <H1>About Radix Governance</H1>
            <p className="mt-2 text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Radix Governance is a decentralized governance platform for the
              Radix ecosystem. It enables the community to signal sentiment
              through Temperature Checks (TC) and decide on execution paths
              through Governance Proposals (GP).
            </p>
          </div>
          <AdminEditButton />
        </div>
      </div>

      {Result.builder(parametersResult)
        .onInitial(() => (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading governance parameters...
          </div>
        ))
        .onFailure(() => (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">
              Failed to load governance parameters.
            </p>
          </div>
        ))
        .onSuccess((parameters) => (
          <GovernanceContent
            tcDays={parameters.temperature_check_days}
            tcQuorum={parameters.temperature_check_quorum}
            tcApproval={parameters.temperature_check_approval_threshold}
            gpDays={parameters.proposal_length_days}
            gpQuorum={parameters.proposal_quorum}
            gpApproval={parameters.proposal_approval_threshold}
          />
        ))
        .render()}
    </div>
  )
}

const GovernanceContent = ({
  tcDays,
  tcQuorum,
  tcApproval,
  gpDays,
  gpQuorum,
  gpApproval
}: {
  tcDays: number
  tcQuorum: string
  tcApproval: string
  gpDays: number
  gpQuorum: string
  gpApproval: string
}) => (
  <>
    <div className="space-y-8">
      <h2 className="text-2xl font-medium text-neutral-900 dark:text-white border-b border-neutral-200 dark:border-neutral-800 pb-4">
        How it Works
      </h2>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
            1. Temperature Check (TC)
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400">
            Any community member with a Radix wallet can propose a Temperature
            Check. This is a binary &ldquo;For&rdquo; or &ldquo;Against&rdquo;
            vote to gauge community sentiment on a specific idea or direction.
          </p>
          <ul className="list-disc list-inside text-sm text-neutral-500 space-y-2 pl-2">
            <li>Voting period: {tcDays} days</li>
            <li>Requires {formatXrd(Number(tcQuorum))} XRD quorum</li>
            <li>Must pass with &gt;{(Number(tcApproval) * 100).toFixed(0)}% approval</li>
            <li>Successful TCs may be promoted to GPs by the Council</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
            2. Governance Proposal (GP)
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400">
            GPs are created by the Council (Admins) based on successful
            Temperature Checks. They present specific implementation options for
            the community to choose from.
          </p>
          <ul className="list-disc list-inside text-sm text-neutral-500 space-y-2 pl-2">
            <li>Voting period: {gpDays} days</li>
            <li>Requires {formatXrd(Number(gpQuorum))} XRD quorum</li>
            <li>Must pass with &gt;{(Number(gpApproval) * 100).toFixed(0)}% approval</li>
            <li>Multiple options available</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="bg-neutral-100 dark:bg-neutral-900 p-6 border border-neutral-200 dark:border-neutral-800">
      <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
        Voting Power
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400">
        Your voting power is determined by your XRD holdings. 1 XRD = 1 Vote. A
        snapshot of your balance is taken at the moment the proposal is created.
      </p>
    </div>
  </>
)

const AdminEditButton = () => {
  const currentAccount = useCurrentAccount()

  if (!currentAccount) return null

  return <AdminEditButtonWithAddress accountAddress={currentAccount.address} />
}

const AdminEditButtonWithAddress = ({
  accountAddress
}: {
  accountAddress: string
}) => {
  const isAdminResult = useAtomValue(isAdminAtom(accountAddress))

  return Result.builder(isAdminResult)
    .onInitial(() => null)
    .onFailure(() => null)
    .onSuccess((isAdmin) => {
      if (!isAdmin) return null

      return (
        <Button variant="outline" size="sm" asChild>
          <Link to="/about/admin">Edit Parameters</Link>
        </Button>
      )
    })
    .render()
}
