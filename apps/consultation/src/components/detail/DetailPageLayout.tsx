import type { ReactNode } from 'react'
import { Vote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type DetailPageLayoutProps = {
  header: ReactNode
  details: ReactNode
  sidebar: ReactNode
  resultsContent: ReactNode
  votingContent: ReactNode
}

export function DetailPageLayout({
  header,
  details,
  sidebar,
  resultsContent,
  votingContent
}: DetailPageLayoutProps) {
  return (
    <div>
      {/* Desktop layout */}
      <div className="hidden lg:grid lg:grid-cols-8 lg:gap-12">
        {/* Left column - Header + Content */}
        <div className="lg:col-span-5 space-y-8">
          {header}
          {details}
        </div>

        {/* Right column - Sticky sidebar */}
        <div className="lg:col-span-3 lg:sticky lg:top-20 lg:self-start">
          {sidebar}
        </div>
      </div>

      {/* Mobile layout with tabs */}
      <div className="lg:hidden">
        <div className="space-y-8">
          {header}

          <Tabs defaultValue="details">
            <TabsList className="w-full">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            <TabsContent value="details">
              <div className="space-y-8 pt-4">
                {details}
              </div>
            </TabsContent>
            <TabsContent value="results">
              <div className="space-y-6 pt-4">
                {resultsContent}
              </div>
            </TabsContent>
          </Tabs>

          {/* spacer so FAB doesn't overlap content */}
          <div className="h-20" />
        </div>

        {/* Drawer for voting only */}
        <Drawer>
          <DrawerTrigger asChild>
            <Button
              size="icon"
              className="fixed bottom-6 right-6 size-14 rounded-full shadow-lg"
            >
              <Vote className="size-6" />
              <span className="sr-only">Open voting panel</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[80vh]">
            <div className="overflow-y-auto p-6">
              {votingContent}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  )
}
