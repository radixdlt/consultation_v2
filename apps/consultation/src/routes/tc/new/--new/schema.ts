import { Schema } from "effect";

export const TitleSchema = Schema.String.pipe(
	Schema.minLength(1, { message: () => "Title is required" }),
	Schema.maxLength(200, {
		message: () => "Title must be 200 characters or less",
	}),
);

export const ShortDescriptionSchema = Schema.String.pipe(
	Schema.minLength(1, { message: () => "Short description is required" }),
	Schema.maxLength(500, {
		message: () => "Short description must be 500 characters or less",
	}),
);

export const DescriptionSchema = Schema.String.pipe(
	Schema.minLength(1, { message: () => "Description is required" }),
);

export const LinkSchema = Schema.String.pipe(
	Schema.filter(
		(value) => {
			if (!value) return true;
			try {
				new URL(value);
				return true;
			} catch {
				return false;
			}
		},
		{ message: () => "Must be a valid URL" },
	),
);

const VoteOptionSchema = Schema.String.pipe(
	Schema.minLength(1, { message: () => "Option is required" }),
);

export const TemperatureCheckFormSchema = Schema.Struct({
	title: TitleSchema,
	shortDescription: ShortDescriptionSchema,
	description: DescriptionSchema,
	links: Schema.Array(LinkSchema),
	voteOptions: Schema.Array(VoteOptionSchema).pipe(
		Schema.minItems(2, { message: () => "At least 2 options required" }),
	),
	maxSelections: Schema.Union(
		Schema.Literal(1),
		Schema.Number.pipe(Schema.greaterThan(1)),
	),
});

export type TemperatureCheckFormData = typeof TemperatureCheckFormSchema.Type;
