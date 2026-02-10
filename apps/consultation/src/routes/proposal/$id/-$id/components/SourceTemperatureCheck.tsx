import { useNavigate } from '@tanstack/react-router'
import { Thermometer } from 'lucide-react'
import { useCallback } from 'react'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type SourceTemperatureCheckProps = {
  temperatureCheckId: TemperatureCheckId
}

export function SourceTemperatureCheck({
  temperatureCheckId
}: SourceTemperatureCheckProps) {
  const navigate = useNavigate()

  const handleNavigate = useCallback(() => {
    navigate({
      to: '/tc/$id',
      params: { id: String(temperatureCheckId) }
    })
  }, [navigate, temperatureCheckId])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Thermometer className="size-4" />
          Temperature Check
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          This proposal originated from a temperature check.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={handleNavigate}
          className="w-full"
        >
          View Temperature Check
        </Button>
      </CardContent>
    </Card>
  )
}
