import { Result, useAtom } from "@effect-atom/atom-react";
import { useStore } from "@tanstack/react-form";
import { ParseResult, Schema } from "effect";
import { FileTextIcon, LoaderIcon, PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
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
	LinkSchema,
	ShortDescriptionSchema,
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
	const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
	const [linkIds, setLinkIds] = useState<string[]>(() => [crypto.randomUUID()]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const formId = useId();
	const titleId = `${formId}-title`;
	const shortDescriptionId = `${formId}-shortDescription`;
	const descriptionId = `${formId}-description`;
	const descriptionFileId = `${formId}-description-file`;

	const form = useAppForm({
		...temperatureCheckFormOpts,
		validators: {
			onSubmit: effectSchemaValidator(TemperatureCheckFormSchema),
		},
		onSubmit: ({ value }) => {
			makeTemperatureCheck({
				title: value.title,
				shortDescription: value.shortDescription,
				description: value.description,
				links: value.links.filter((link) => link.trim() !== ""),
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
	const links = useStore(form.store, (state) => state.values.links);
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

	const handleFileUpload = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = (e) => {
				const content = e.target?.result as string;
				form.setFieldValue("description", content);
				setUploadedFileName(file.name);
			};
			reader.readAsText(file);
		},
		[form],
	);

	const handleRemoveFile = useCallback(() => {
		form.setFieldValue("description", "");
		setUploadedFileName(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, [form]);

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
						<form.Field
							name="description"
							validators={{
								onBlur: effectSchemaValidator(DescriptionSchema),
							}}
						>
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={descriptionId}>
											Full Description (Markdown)
										</FieldLabel>
										<FieldDescription>
											Upload a markdown (.md) file with the full description, or
											type/paste directly.
										</FieldDescription>

										<div className="flex flex-col gap-2">
											<input
												ref={fileInputRef}
												type="file"
												accept=".md,.txt,.markdown"
												onChange={handleFileUpload}
												className="hidden"
												id={descriptionFileId}
											/>

											{uploadedFileName ? (
												<div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2">
													<FileTextIcon className="size-4 text-muted-foreground" />
													<span className="flex-1 text-sm">{uploadedFileName}</span>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="size-6"
														onClick={handleRemoveFile}
													>
														<Trash2Icon className="size-3" />
													</Button>
												</div>
											) : (
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => fileInputRef.current?.click()}
													className="w-fit"
												>
													<UploadIcon className="size-4" />
													Upload Markdown File
												</Button>
											)}
										</div>

										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						<Separator />

						{/* Links */}
						<FieldGroup>
							<FieldLabel>Links</FieldLabel>
							<FieldDescription>
								Add relevant links (discussion threads, documentation, etc.)
							</FieldDescription>

							<div className="flex flex-col gap-2">
								{links.map((_, index) => (
									<form.Field
										key={linkIds[index] ?? `link-fallback-${index}`}
										name={`links[${index}]`}
										validators={{
											onBlur: effectSchemaValidator(LinkSchema),
											onChange: effectSchemaValidator(LinkSchema),
										}}
									>
										{(linkField) => {
											const isLinkInvalid =
												linkField.state.meta.isTouched &&
												!linkField.state.meta.isValid;
											const linkInputId = `${formId}-link-${linkIds[index] ?? index}`;

											return (
												<Field data-invalid={isLinkInvalid}>
													<div className="flex gap-2">
														<Input
															id={linkInputId}
															name={linkField.name}
															type="url"
															value={linkField.state.value}
															onBlur={linkField.handleBlur}
															onChange={(e) =>
																linkField.handleChange(e.target.value)
															}
															aria-invalid={isLinkInvalid}
															placeholder="https://..."
															className="flex-1"
														/>
														<Button
															type="button"
															variant="outline"
															size="icon"
															onClick={() => {
																const newLinks = [...links];
																newLinks.splice(index, 1);
																const newLinkIds = [...linkIds];
																newLinkIds.splice(index, 1);
																form.setFieldValue(
																	"links",
																	newLinks.length > 0 ? newLinks : [""],
																);
																setLinkIds(
																	newLinkIds.length > 0
																		? newLinkIds
																		: [crypto.randomUUID()],
																);
															}}
															disabled={links.length <= 1}
															aria-label={`Remove link ${index + 1}`}
														>
															<Trash2Icon className="size-4" />
														</Button>
													</div>
													{isLinkInvalid && (
														<FieldError errors={linkField.state.meta.errors} />
													)}
												</Field>
											);
										}}
									</form.Field>
								))}
							</div>

							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									form.setFieldValue("links", [...links, ""]);
									setLinkIds([...linkIds, crypto.randomUUID()]);
								}}
							>
								<PlusIcon className="size-4" />
								Add Link
							</Button>
						</FieldGroup>

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
