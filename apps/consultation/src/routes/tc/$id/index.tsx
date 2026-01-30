import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tc/$id/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/tc/$id/"!</div>;
}
