import { Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CheckIcon,
  CopyIcon
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TemperatureCheckForm } from './components/TemperatureCheckForm'

type SuccessData = {
  id: number
  title: string
}

function SuccessScreen({ data }: { data: SuccessData }) {
  const navigate = useNavigate()
  const [copiedLink, setCopiedLink] = useState(false)
  const tcUrl = `${window.location.origin}/tc/${data.id}`

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: '/tc/$id', params: { id: String(data.id) } })
    }, 5000)
    return () => clearTimeout(timer)
  }, [navigate, data.id])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(tcUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = tcUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2Icon className="size-6 text-emerald-500" />
            <div>
              <CardTitle className="text-lg">
                Temperature Check Created
              </CardTitle>
              <CardDescription>
                Your proposal has been submitted to the ledger.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* TC ID */}
          <div className="bg-muted p-4 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Your TC ID
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              #{data.id}
            </div>
          </div>

          {/* Link Section */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1">
              Share this link
            </Label>
            <div className="flex">
              <Input
                type="text"
                value={tcUrl}
                readOnly
                className="flex-1 border-r-0 font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="border-l-0"
              >
                {copiedLink ? (
                  <CheckIcon className="size-4 text-emerald-500" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
            <div className="flex gap-2">
              <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Save your TC ID (<strong>#{data.id}</strong>) and the link
                above.
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-muted/50 border border-border p-3">
            <h3 className="text-sm font-medium text-foreground mb-2">
              Next Steps
            </h3>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Share the link with the community to gather votes</li>
              <li>
                If you have a RadixTalk RFC post, upgrade it to a TC post and
                add this link
              </li>
              <li>
                If the TC passes quorum and approval threshold, it can be
                promoted to a GP
              </li>
            </ol>
          </div>
        </CardContent>

        {/* Actions */}
        <CardFooter className="gap-2">
          <Link
            to="/tc/$id"
            params={{ id: String(data.id) }}
            className="flex-1"
          >
            <Button type="button" size="sm" className="w-full">
              View Your TC
            </Button>
          </Link>
          <Link to="/" className="flex-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
            >
              Home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export const Page: React.FC = () => {
  const [successData, setSuccessData] = useState<SuccessData | null>(null)

  const handleSuccess = useCallback((result: unknown) => {
    const event = result as { temperature_check_id: number; title: string }
    setSuccessData({
      id: event.temperature_check_id,
      title: event.title
    })
  }, [])

  return (
    <div className="max-w-2xl mx-auto">
      {successData ? (
        <SuccessScreen data={successData} />
      ) : (
        <>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-light text-foreground tracking-tight">
              New Proposal
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg">
              This creates a Temperature Check (TC) to gauge community interest.
              If the TC passes, it will be promoted to a full Governance Proposal
              (GP) for final voting.
            </p>
          </div>

          <TemperatureCheckForm onSuccess={handleSuccess} />
        </>
      )}
    </div>
  )
}
