import { createFileRoute } from "@tanstack/react-router";
import { Page } from "./--new/index";

export const Route = createFileRoute("/tc/new/")({
	component: Page,
});
