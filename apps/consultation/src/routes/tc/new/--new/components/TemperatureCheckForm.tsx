import { Result, useAtom, useAtomValue } from "@effect-atom/atom-react";
import { useStore } from "@tanstack/react-form";
import { LoaderIcon } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { accountsAtom } from "@/atom/dappToolkitAtom";
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
	effectSchemaValidator,
	RadixTalkUrlSchema,
	ShortDescriptionSchema,
	TemperatureCheckFormSchema,
	TitleSchema,
} from "../schema";
import { LinksField } from "./LinksField";
import { MarkdownUploadField } from "./MarkdownUploadField";
import { MaxSelectionsField } from "./MaxSelectionsField";
import { VoteOptionsField } from "./VoteOptionsField";

type TemperatureCheckFormProps = {
	maxVoteOptions?: number;
	onSuccess?: (result: unknown) => void;
};

export function TemperatureCheckForm({
	maxVoteOptions = 10,
	onSuccess,
}: TemperatureCheckFormProps) {
	const [makeResult, makeTemperatureCheck] = useAtom(makeTemperatureCheckAtom);
	const accountsResult = useAtomValue(accountsAtom);
	const formId = useId();
	const titleId = `${formId}-title`;
	const shortDescriptionId = `${formId}-shortDescription`;

	const form = useAppForm({
		...temperatureCheckFormOpts,
		validators: {
			onSubmit: effectSchemaValidator(TemperatureCheckFormSchema),
		},
		onSubmit: ({ value }) => {
			// Combine radixTalkUrl with additional links
			const allLinks = [
				value.radixTalkUrl,
				...value.links.filter((link) => link.trim() !== ""),
			];
			// Transform vote options from {id, label} to just labels
			const voteOptionLabels = value.voteOptions.map((option) => option.label);
			makeTemperatureCheck({
				title: value.title,
				shortDescription: value.shortDescription,
				description: value.description,
				links: allLinks,
				voteOptions: voteOptionLabels,
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

	const hasAccounts = Result.builder(accountsResult)
		.onInitial(() => false)
		.onFailure(() => false)
		.onSuccess((accounts) => accounts.length > 0)
		.orNull() ?? false;

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
										<FieldLabel htmlFor={titleId}>Title</FieldLabel>
										<Input
											id={titleId}
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

						{/* Short Description */}
						<form.Field
							name="shortDescription"
							validators={{
								onBlur: effectSchemaValidator(ShortDescriptionSchema),
								onChange: effectSchemaValidator(ShortDescriptionSchema),
							}}
						>
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={shortDescriptionId}>
											Short Description
										</FieldLabel>
										<Textarea
											id={shortDescriptionId}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder="A brief summary of the temperature check (max 500 characters)"
											className="min-h-[80px]"
										/>
										<FieldDescription>
											This will be displayed in the temperature check list.
										</FieldDescription>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						{/* Description (Markdown File Upload) */}
						<MarkdownUploadField form={form} />

						<Separator />

						{/* RadixTalk URL */}
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
										<FieldLabel htmlFor={`${formId}-radixTalkUrl`}>
											RadixTalk URL *
										</FieldLabel>
										<FieldDescription>
											Link to the RFC discussion on RadixTalk.
										</FieldDescription>
										<Input
											id={`${formId}-radixTalkUrl`}
											name={field.name}
											type="url"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder="https://radixtalk.com/..."
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						{/* Additional Links */}
						<LinksField form={form} />

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
							disabled={!canSubmit || makeResult.waiting || !hasAccounts}
							className="w-full mt-4"
						>
							{makeResult.waiting ? (
								<>
									<LoaderIcon className="size-4 animate-spin" />
									Creating...
								</>
							) : !hasAccounts ? (
								"Connect Wallet to Create"
							) : (
								"Create Temperature Check"
							)}
						</Button>
					</CardFooter>
			</form>
		</Card>
	);
}
