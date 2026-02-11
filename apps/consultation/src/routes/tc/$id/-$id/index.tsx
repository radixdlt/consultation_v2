import { Result, useAtomValue } from '@effect-atom/atom-react'
import { Cause } from 'effect'
import { Calendar, ExternalLink, LinkIcon, User, Vote } from 'lucide-react'
import Markdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import type { TemperatureCheckId } from 'shared/governance/brandedTypes'
import type { TemperatureCheckSchema } from 'shared/governance/schemas'
import { getTemperatureCheckByIdAtom, getTemperatureCheckVotesByAccountsAtom } from '@/atom/temperatureChecksAtom'
import { AddressLink } from '@/components/AddressLink'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InlineCode } from '@/components/ui/typography'
import {
  getItemStatus,
  StatusBadge
} from '@/routes/-index/components/StatusBadge'
import { QuorumBadge } from './components/QuorumBadge'
import { AccountVotesSection } from './components/AccountVotesSection'
import { PromoteToProposal } from './components/PromoteToProposal'
import { SidebarContent } from './components/SidebarContent'
import { VoteResultsSection } from './components/VoteResultsSection'
import { VotingSection } from './components/VotingSection'

type TemperatureCheck = typeof TemperatureCheckSchema.Type

function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function Page({ id }: { id: TemperatureCheckId }) {
  const temperatureCheck = useAtomValue(getTemperatureCheckByIdAtom(id))

  return Result.builder(temperatureCheck)
    .onInitial(() => {
      return <div>Loading...</div>
    })
    .onSuccess((tc) => <PageContent tc={tc} id={id} />)
    .onFailure((error) => {
      return <InlineCode>{Cause.pretty(error)}</InlineCode>
    })
    .render()
}

function PageHeader({
  tc,
  id,
  status
}: {
  tc: TemperatureCheck
  id: TemperatureCheckId
  status: ReturnType<typeof getItemStatus>
}) {
  return (
    <div className="lg:border-b lg:border-border lg:pb-6 pb-2">
      <div className="flex items-center gap-2 mb-4">
        <StatusBadge status={status} />
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          TC
        </span>
        <div className="ml-auto">
          <QuorumBadge id={id} quorum={tc.quorum} />
        </div>
      </div>
      <h1 className="text-3xl md:text-4xl font-light text-foreground leading-tight">
        {tc.title}
      </h1>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground font-mono">
        <span>TC #{tc.id}</span>
        <PromoteToProposal
          temperatureCheckId={id}
          elevatedProposalId={tc.elevatedProposalId}
        />
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="size-4" />
        <span className="font-mono">Ends: {formatDateTime(tc.deadline)}</span>
      </div>
      {tc.author && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <User className="size-4" />
          <AddressLink address={tc.author} className="font-mono text-xs text-muted-foreground" />
        </div>
      )}
      {tc.links.length > 0 && (
        <div className="mt-4 flex items-center gap-4">
          {tc.links.map((link) => (
            <a
              key={link.toString()}
              href={link.toString()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground hover:underline text-sm flex items-center gap-1 min-w-0"
            >
              <LinkIcon className="size-3 shrink-0" />
              <span className="truncate">{link.toString()}</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function PageDetails({ tc }: { tc: TemperatureCheck }) {
  return (
    <>
      {/* Short Description */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Description
        </h3>
        <p className="text-muted-foreground whitespace-pre-wrap">
          {tc.shortDescription}
        </p>
      </div>

      {/* Full Details (rendered markdown) */}
      {tc.description && tc.description !== tc.shortDescription && (
        <div className="lg:border-t lg:border-border lg:pt-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Full Details
          </h3>
          <div className="prose dark:prose-invert max-w-none">
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {tc.description}
            </Markdown>
          </div>
        </div>
      )}
    </>
  )
}

function PageContent({ tc, id }: { tc: TemperatureCheck; id: TemperatureCheckId }) {
  const status = getItemStatus(tc.deadline)
  const accountsVotesResult = useAtomValue(
    getTemperatureCheckVotesByAccountsAtom(tc.voters)
  )

  return (
    <div>
      {/* Desktop layout */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-12">
        {/* Left column - Header + Content */}
        <div className="lg:col-span-2 space-y-8">
          <PageHeader tc={tc} id={id} status={status} />
          <PageDetails tc={tc} />
        </div>

        {/* Right column - Sticky sidebar */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <SidebarContent
            temperatureCheck={tc}
            id={id}
            accountsVotesResult={accountsVotesResult}
          />
        </div>
      </div>

      {/* Mobile layout with tabs */}
      <div className="lg:hidden">
        <div className="space-y-8">
          <PageHeader tc={tc} id={id} status={status} />

          <Tabs defaultValue="details">
            <TabsList className="w-full">
              <TabsTrigger value="details">Full Details</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            <TabsContent value="details">
              <div className="space-y-8 pt-4">
                <PageDetails tc={tc} />
              </div>
            </TabsContent>
            <TabsContent value="results">
              <div className="space-y-6 pt-4">
                <VoteResultsSection id={id} />
                <AccountVotesSection id={id} />
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
              <VotingSection
                temperatureCheckId={id}
                keyValueStoreAddress={tc.voters}
                accountsVotesResult={accountsVotesResult}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  )
}
