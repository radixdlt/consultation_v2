import { useNavigate } from '@tanstack/react-router'
import { CheckCircle2Icon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { TemperatureCheckForm } from './components/TemperatureCheckForm'

type SuccessData = {
  id: number
  title: string
}

function SuccessScreen({ data }: { data: SuccessData }) {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: '/tc/$id', params: { id: String(data.id) } })
    }, 2000)
    return () => clearTimeout(timer)
  }, [navigate, data.id])

  return (
    <Card className="w-full max-w-2xl text-center">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <CheckCircle2Icon className="size-16 text-green-500" />
        </div>
        <CardTitle className="text-2xl">Temperature Check Created</CardTitle>
        <CardDescription className="text-base mt-2">
          "{data.title}" has been created successfully.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Redirecting to your temperature check...
        </p>
      </CardContent>
    </Card>
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
    <div className="container mx-auto py-8 flex justify-center">
      {successData ? (
        <SuccessScreen data={successData} />
      ) : (
        <TemperatureCheckForm onSuccess={handleSuccess} />
      )}
    </div>
  )
}
