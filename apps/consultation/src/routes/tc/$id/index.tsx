import { createFileRoute } from "@tanstack/react-router";
import { TemperatureCheckId } from "shared/governance/brandedTypes";
import { Page } from "./-$id";

export const Route = createFileRoute("/tc/$id/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	return <Page id={TemperatureCheckId.make(Number(id))} />;
}
