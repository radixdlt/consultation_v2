import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { Page } from './-admin/index'

export const Route = createFileRoute('/about/admin/')({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <ClientOnly>
      <Page />
    </ClientOnly>
  )
}
