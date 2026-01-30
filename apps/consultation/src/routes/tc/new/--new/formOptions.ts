import { formOptions } from "@tanstack/react-form";

export const DEFAULT_VOTE_OPTIONS: Array<{ id: number; label: string }> = [
	{ id: 0, label: "" },
	{ id: 1, label: "" },
];

export const temperatureCheckFormOpts = formOptions({
	defaultValues: {
		title: "",
		description: "",
		radixTalkUrl: "",
		voteOptions: DEFAULT_VOTE_OPTIONS,
		maxSelections: 1,
	},
});
