import { Result, useAtom, useAtomValue } from '@effect-atom/atom-react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useState } from 'react'
import {
  governanceParametersAtom,
  updateGovernanceParametersAtom
} from '@/atom/governanceParametersAtom'
import { isAdminAtom } from '@/atom/adminAtom'
import { useCurrentAccount } from '@/hooks/useCurrentAccount'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { H1 } from '@/components/ui/typography'

export const Page = () => {
  const currentAccount = useCurrentAccount()

  if (!currentAccount) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <H1>Admin Panel</H1>
        <p className="text-neutral-500">
          Please connect your wallet to access the admin panel.
        </p>
        <Button variant="outline" asChild>
          <Link to="/about">Back to About</Link>
        </Button>
      </div>
    )
  }

  return <AdminGuard accountAddress={currentAccount.address} />
}

const AdminGuard = ({ accountAddress }: { accountAddress: string }) => {
  const isAdminResult = useAtomValue(isAdminAtom(accountAddress))

  return Result.builder(isAdminResult)
    .onInitial(() => (
      <div className="max-w-3xl mx-auto flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking admin status...
      </div>
    ))
    .onFailure(() => (
      <div className="max-w-3xl mx-auto space-y-6">
        <H1>Admin Panel</H1>
        <p className="text-neutral-500">Failed to verify admin status.</p>
        <Button variant="outline" asChild>
          <Link to="/about">Back to About</Link>
        </Button>
      </div>
    ))
    .onSuccess((isAdmin) => {
      if (!isAdmin) {
        return (
          <div className="max-w-3xl mx-auto space-y-6">
            <H1>Admin Panel</H1>
            <p className="text-neutral-500">
              You do not have admin access. Only accounts holding the admin badge
              can update governance parameters.
            </p>
            <Button variant="outline" asChild>
              <Link to="/about">Back to About</Link>
            </Button>
          </div>
        )
      }

      return <AdminForm />
    })
    .render()
}

const AdminForm = () => {
  const parametersResult = useAtomValue(governanceParametersAtom)

  return Result.builder(parametersResult)
    .onInitial(() => (
      <div className="max-w-3xl mx-auto flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading current parameters...
      </div>
    ))
    .onFailure(() => (
      <div className="max-w-3xl mx-auto space-y-6">
        <H1>Admin Panel</H1>
        <p className="text-neutral-500">
          Failed to load current governance parameters.
        </p>
        <Button variant="outline" asChild>
          <Link to="/about">Back to About</Link>
        </Button>
      </div>
    ))
    .onSuccess((parameters) => (
      <AdminFormWithValues
        tcDays={parameters.temperature_check_days}
        tcQuorum={parameters.temperature_check_quorum}
        tcApproval={parameters.temperature_check_approval_threshold}
        gpDays={parameters.proposal_length_days}
        gpQuorum={parameters.proposal_quorum}
        gpApproval={parameters.proposal_approval_threshold}
      />
    ))
    .render()
}

const AdminFormWithValues = ({
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
}) => {
  const [updateResult, updateParameters] = useAtom(
    updateGovernanceParametersAtom
  )
  const isSubmitting = updateResult.waiting

  const [form, setForm] = useState({
    temperatureCheckDays: tcDays.toString(),
    temperatureCheckQuorum: tcQuorum,
    temperatureCheckApprovalThreshold: tcApproval,
    proposalLengthDays: gpDays.toString(),
    proposalQuorum: gpQuorum,
    proposalApprovalThreshold: gpApproval
  })

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateParameters({
      temperatureCheckDays: Number(form.temperatureCheckDays),
      temperatureCheckQuorum: form.temperatureCheckQuorum,
      temperatureCheckApprovalThreshold: form.temperatureCheckApprovalThreshold,
      proposalLengthDays: Number(form.proposalLengthDays),
      proposalQuorum: form.proposalQuorum,
      proposalApprovalThreshold: form.proposalApprovalThreshold
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/about" aria-label="Back to About">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <H1>Edit Governance Parameters</H1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Temperature Check</CardTitle>
              <CardDescription>
                Settings for community temperature checks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tc-days">Voting Period (days)</Label>
                <Input
                  id="tc-days"
                  type="number"
                  min="1"
                  value={form.temperatureCheckDays}
                  onChange={(e) =>
                    handleChange('temperatureCheckDays', e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tc-quorum">Quorum (XRD)</Label>
                <Input
                  id="tc-quorum"
                  type="text"
                  value={form.temperatureCheckQuorum}
                  onChange={(e) =>
                    handleChange('temperatureCheckQuorum', e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tc-threshold">
                  Approval Threshold (0-1)
                </Label>
                <Input
                  id="tc-threshold"
                  type="text"
                  value={form.temperatureCheckApprovalThreshold}
                  onChange={(e) =>
                    handleChange(
                      'temperatureCheckApprovalThreshold',
                      e.target.value
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Governance Proposal</CardTitle>
              <CardDescription>
                Settings for governance proposals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gp-days">Voting Period (days)</Label>
                <Input
                  id="gp-days"
                  type="number"
                  min="1"
                  value={form.proposalLengthDays}
                  onChange={(e) =>
                    handleChange('proposalLengthDays', e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gp-quorum">Quorum (XRD)</Label>
                <Input
                  id="gp-quorum"
                  type="text"
                  value={form.proposalQuorum}
                  onChange={(e) =>
                    handleChange('proposalQuorum', e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gp-threshold">
                  Approval Threshold (0-1)
                </Label>
                <Input
                  id="gp-threshold"
                  type="text"
                  value={form.proposalApprovalThreshold}
                  onChange={(e) =>
                    handleChange('proposalApprovalThreshold', e.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <CardFooter className="mt-6 px-0">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Update Parameters
          </Button>
        </CardFooter>
      </form>
    </div>
  )
}
