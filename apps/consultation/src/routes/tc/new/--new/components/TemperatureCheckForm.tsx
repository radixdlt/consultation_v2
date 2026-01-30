import { Result, useAtom } from "@effect-atom/atom-react";
import { useStore } from "@tanstack/react-form";
import { ParseResult, Schema } from "effect";
import { LoaderIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { makeTemperatureCheckAtom } from "@/atom/temperatureChecksAtom";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAppForm } from "../formHook";
import { temperatureCheckFormOpts } from "../formOptions";
import {
	DescriptionSchema,
	RadixTalkUrlSchema,
	TemperatureCheckFormSchema,
	TitleSchema,
} from "../schema";
import { MaxSelectionsField } from "./MaxSelectionsField";
import { VoteOptionsField } from "./VoteOptionsField";

type TemperatureCheckFormProps = {
	maxVoteOptions?: number;
	onSuccess?: (result: unknown) => void;
};

function effectSchemaValidator<T, I>(schema: Schema.Schema<T, I>) {
	return ({ value }: { value: unknown }) => {
		const result = Schema.decodeUnknownEither(schema)(value);
		if (result._tag === "Left") {
			const errors = ParseResult.ArrayFormatter.formatErrorSync(result.left);
			return errors;
		}
		return undefined;
	};
}

export function TemperatureCheckForm({
	maxVoteOptions = 10,
	onSuccess,
}: TemperatureCheckFormProps) {
	const [makeResult, makeTemperatureCheck] = useAtom(makeTemperatureCheckAtom);

	const form = useAppForm({
		...temperatureCheckFormOpts,
		validators: {
			onSubmit: effectSchemaValidator(TemperatureCheckFormSchema),
		},
		onSubmit: ({ value }) => {
			makeTemperatureCheck({
				title: value.title,
				description: value.description,
				radixTalkUrl: value.radixTalkUrl,
				voteOptions: value.voteOptions,
				maxSelections: value.maxSelections,
			});
		},
	});

	const optionCount = useStore(
		form.store,
		(state) => state.values.voteOptions.length,
	);
	const maxSelections = useStore(
		form.store,
		(state) => state.values.maxSelections,
	);
	const canSubmit = useStore(form.store, (state) => state.canSubmit);

	// Auto-adjust maxSelections if it exceeds option count (useEffect prevents render-during-render)
	useEffect(() => {
		if (maxSelections > optionCount) {
			form.setFieldValue("maxSelections", optionCount);
		}
	}, [maxSelections, optionCount, form]);

	// Track if onSuccess has been called to prevent duplicate calls
	const hasCalledSuccess = useRef(false);

	// Call onSuccess when the atom completes successfully
	useEffect(() => {
		if (hasCalledSuccess.current || !onSuccess) return;

		Result.builder(makeResult)
			.onSuccess((value) => {
				hasCalledSuccess.current = true;
				onSuccess(value);
			})
			.orNull();
	}, [makeResult, onSuccess]);

	return (
		<Card className="w-full max-w-2xl">
			<CardHeader>
				<CardTitle>Create Temperature Check</CardTitle>
			</CardHeader>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<CardContent>
					<FieldGroup>
						{/* Title */}
						<form.Field
							name="title"
							validators={{
								onBlur: effectSchemaValidator(TitleSchema),
								onChange: effectSchemaValidator(TitleSchema),
							}}
						>
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor="title">Title</FieldLabel>
										<Input
											id="title"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder="Enter a clear, descriptive title"
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						{/* Description */}
						<form.Field
							name="description"
							validators={{
								onBlur: effectSchemaValidator(DescriptionSchema),
								onChange: effectSchemaValidator(DescriptionSchema),
							}}
						>
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor="description">Description</FieldLabel>
										<Textarea
											id="description"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder="Describe what this temperature check is about"
											className="min-h-[120px]"
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						{/* Radix Talk URL */}
						<form.Field
							name="radixTalkUrl"
							validators={{
								onBlur: effectSchemaValidator(RadixTalkUrlSchema),
								onChange: effectSchemaValidator(RadixTalkUrlSchema),
							}}
						>
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor="radixTalkUrl">
											Radix Talk URL
										</FieldLabel>
										<Input
											id="radixTalkUrl"
											name={field.name}
											type="url"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder="https://radixtalk.com/..."
										/>
										<FieldDescription>
											Link to the Radix Talk discussion thread.
										</FieldDescription>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						<Separator />

						{/* Vote Options */}
						<VoteOptionsField form={form} maxOptions={maxVoteOptions} />

						<Separator />

						{/* Max Selections */}
						<MaxSelectionsField form={form} optionCount={optionCount} />
					</FieldGroup>
				</CardContent>

				<CardFooter>
					<Button
						type="submit"
						disabled={!canSubmit || makeResult.waiting}
						className="w-full mt-4"
					>
						{makeResult.waiting ? (
							<>
								<LoaderIcon className="size-4 animate-spin" />
								Creating...
							</>
						) : (
							"Create Temperature Check"
						)}
					</Button>
				</CardFooter>
			</form>
		</Card>
	);
}
