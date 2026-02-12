import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { TemperatureCheckForm } from './components/TemperatureCheckForm'

export const Page: React.FC = () => {
  const navigate = useNavigate()

  const handleSuccess = useCallback(
    (result: unknown) => {
      const event = result as { temperature_check_id: number; title: string }
      navigate({ to: '/tc/$id', params: { id: String(event.temperature_check_id) } })
    },
    [navigate]
  )

  return (
    <div className="max-w-2xl mx-auto">
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
    </div>
  )
}
