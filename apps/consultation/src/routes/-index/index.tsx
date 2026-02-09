import type React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { H1, P } from '@/components/ui/typography'
import { ProposalsList, TemperatureChecksList } from './components'

export const Page: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <H1>Governance</H1>
          <P className="mt-2 text-muted-foreground">
            Participate in community governance through temperature checks and
            proposals.
          </P>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="proposals" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="proposals">Governance Proposals</TabsTrigger>
            <TabsTrigger value="temperature-checks">
              Temperature Checks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proposals">
            <ProposalsList />
          </TabsContent>

          <TabsContent value="temperature-checks">
            <TemperatureChecksList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
