import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { ProposalId } from 'shared/governance/brandedTypes'
import { Page } from './-$id'

export const Route = createFileRoute('/proposal/$id/')({
  component: RouteComponent
})

function RouteComponent() {
  const { id } = Route.useParams()
  return (
    <ClientOnly>
      <Page id={ProposalId.make(Number(id))} />
    </ClientOnly>
  )
}
