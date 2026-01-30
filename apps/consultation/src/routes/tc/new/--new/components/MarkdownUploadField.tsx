import { FileTextIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { withForm } from "../formHook";
import { temperatureCheckFormOpts } from "../formOptions";
import { DescriptionSchema, effectSchemaValidator } from "../schema";

export const MarkdownUploadField = withForm({
	...temperatureCheckFormOpts,
	render: function Render({ form }) {
		const [uploadedFileName, setUploadedFileName] = useState<string | null>(
			null,
		);
		const fileInputRef = useRef<HTMLInputElement>(null);
		const formId = useId();
		const descriptionId = `${formId}-description`;
		const descriptionFileId = `${formId}-description-file`;

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
								Upload a markdown (.md) file with the full description.
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

							{isInvalid && <FieldError errors={field.state.meta.errors} />}
						</Field>
					);
				}}
			</form.Field>
		);
	},
});
