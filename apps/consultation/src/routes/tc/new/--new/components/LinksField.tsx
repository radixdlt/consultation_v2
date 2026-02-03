import { useStore } from "@tanstack/react-form";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { withForm } from "../formHook";
import { temperatureCheckFormOpts } from "../formOptions";
import { effectSchemaValidator, LinkSchema } from "../schema";

export const LinksField = withForm({
	...temperatureCheckFormOpts,
	render: function Render({ form }) {
		const formId = useId();
		const linkIdsRef = useRef<string[]>([]);

		const links = useStore(form.store, (state) => state.values.links);

		// Ensure we have enough IDs
		while (linkIdsRef.current.length < links.length) {
			linkIdsRef.current.push(crypto.randomUUID());
		}

		const handleRemove = (index: number) => {
			const newLinks = [...links];
			newLinks.splice(index, 1);
			linkIdsRef.current.splice(index, 1);
			form.setFieldValue("links", newLinks);
		};

		const handleAdd = () => {
			linkIdsRef.current.push(crypto.randomUUID());
			form.setFieldValue("links", [...links, ""]);
		};

		return (
			<FieldGroup>
				<FieldLabel>Additional Links</FieldLabel>
				<FieldDescription>
					Add any other relevant links (documentation, resources, etc.)
				</FieldDescription>

				<div className="flex flex-col gap-2">
					{links.map((_link, index) => (
						<form.Field
							key={linkIdsRef.current[index] ?? `link-fallback-${index}`}
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
								const linkInputId = `${formId}-link-${linkIdsRef.current[index] ?? index}`;

								return (
									<Field data-invalid={isLinkInvalid}>
										<div className="flex gap-2">
											<Input
												id={linkInputId}
												name={linkField.name}
												type="url"
												value={linkField.state.value}
												onBlur={linkField.handleBlur}
												onChange={(e) => linkField.handleChange(e.target.value)}
												aria-invalid={isLinkInvalid}
												placeholder="https://..."
												className="flex-1"
											/>
											<Button
												type="button"
												variant="outline"
												size="icon"
												onClick={() => handleRemove(index)}
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

				<Button type="button" variant="outline" size="sm" onClick={handleAdd}>
					<PlusIcon className="size-4" />
					Add Link
				</Button>
			</FieldGroup>
		);
	},
});
