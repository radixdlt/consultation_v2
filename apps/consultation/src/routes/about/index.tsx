import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { Page } from './-about/index'

export const Route = createFileRoute('/about/')({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <ClientOnly>
      <Page />
    </ClientOnly>
  )
}
