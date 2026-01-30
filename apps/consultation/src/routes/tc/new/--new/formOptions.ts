import { formOptions } from "@tanstack/react-form";

export const DEFAULT_VOTE_OPTIONS: string[] = ["", ""];

export const temperatureCheckFormOpts = formOptions({
	defaultValues: {
		title: "",
		shortDescription: "",
		description: "",
		links: [""] as string[],
		voteOptions: DEFAULT_VOTE_OPTIONS,
		maxSelections: 1,
	},
});
