import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { Page } from './-index/index'

export const Route = createFileRoute('/')({
  component: RouteComponent
})

function RouteComponent() {
  return (
    <ClientOnly>
      <Page />
    </ClientOnly>
  )
}
