import { PlusIcon, Trash2Icon } from "lucide-react";
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
import {
	createVoteOption,
	temperatureCheckFormOpts,
	type VoteOption,
} from "../formOptions";

export const VoteOptionsField = withForm({
	...temperatureCheckFormOpts,
	props: {
		maxOptions: 10,
	},
	render: function Render({ form, maxOptions }) {
		return (
			<form.Field
				name="voteOptions"
				mode="array"
				validators={{
					onBlur: ({ value }) =>
						value.length < 2
							? { message: "At least 2 options required" }
							: undefined,
				}}
			>
				{(field) => {
					const voteOptions: VoteOption[] = field.state.value;
					const isInvalid =
						field.state.meta.isTouched && !field.state.meta.isValid;

					const handleRemove = (index: number) => {
						field.removeValue(index);
					};

					const handleAdd = () => {
						field.pushValue(createVoteOption());
					};

					return (
						<FieldGroup>
							<FieldLabel>Vote Options</FieldLabel>
							<FieldDescription>
								Add between 2 and {maxOptions} options for voters to choose
								from.
							</FieldDescription>

							<div className="flex flex-col gap-3">
								{voteOptions.map((option, index) => (
									<div key={option.id} className="flex gap-2">
										<form.Field
											name={`voteOptions[${index}].label`}
											validators={{
												onBlur: ({ value }) =>
													!value ? { message: "Label is required" } : undefined,
												onChange: () => undefined,
											}}
										>
											{(subField) => {
												const isSubFieldInvalid =
													subField.state.meta.isTouched &&
													!subField.state.meta.isValid;

												return (
													<Field
														data-invalid={isSubFieldInvalid}
														className="flex-1"
													>
														<Input
															id={`vote-option-${option.id}`}
															name={subField.name}
															value={subField.state.value}
															onBlur={subField.handleBlur}
															onChange={(e) =>
																subField.handleChange(e.target.value)
															}
															aria-invalid={isSubFieldInvalid}
															placeholder={`Option ${index + 1}`}
														/>
														{isSubFieldInvalid && (
															<FieldError errors={subField.state.meta.errors} />
														)}
													</Field>
												);
											}}
										</form.Field>

										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={() => handleRemove(index)}
											disabled={voteOptions.length <= 2}
											aria-label={`Remove option ${index + 1}`}
										>
											<Trash2Icon className="size-4" />
										</Button>
									</div>
								))}
							</div>

							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleAdd}
								disabled={voteOptions.length >= maxOptions}
							>
								<PlusIcon className="size-4" />
								Add Option
							</Button>

							{isInvalid && <FieldError errors={field.state.meta.errors} />}
						</FieldGroup>
					);
				}}
			</form.Field>
		);
	},
});
