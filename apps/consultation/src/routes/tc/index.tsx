import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tc/')({
  component: RouteComponent
})

function RouteComponent() {
  return <div>Hello "/tc/"!</div>
}
