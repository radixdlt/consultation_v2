import { Schema } from "effect";

export const TitleSchema = Schema.String.pipe(
	Schema.minLength(1, { message: () => "Title is required" }),
	Schema.maxLength(200, {
		message: () => "Title must be 200 characters or less",
	}),
);

export const DescriptionSchema = Schema.String.pipe(
	Schema.minLength(1, { message: () => "Description is required" }),
	Schema.maxLength(2000, {
		message: () => "Description must be 2000 characters or less",
	}),
);

export const RadixTalkUrlSchema = Schema.String.pipe(
	Schema.filter(
		(value) => {
			try {
				const url = new URL(value);
				return url.origin === "https://radixtalk.com";
			} catch {
				return false;
			}
		},
		{ message: () => "Must be a valid https://radixtalk.com/ URL" },
	),
);

const VoteOptionSchema = Schema.Struct({
	id: Schema.Number,
	label: Schema.String.pipe(
		Schema.minLength(1, { message: () => "Label is required" }),
	),
});

export const TemperatureCheckFormSchema = Schema.Struct({
	title: TitleSchema,
	description: DescriptionSchema,
	radixTalkUrl: RadixTalkUrlSchema,
	voteOptions: Schema.Array(VoteOptionSchema).pipe(
		Schema.minItems(2, { message: () => "At least 2 options required" }),
	),
	maxSelections: Schema.Union(
		Schema.Literal(1),
		Schema.Number.pipe(Schema.greaterThan(1)),
	),
});

export type TemperatureCheckFormData = typeof TemperatureCheckFormSchema.Type;
