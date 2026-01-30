import { createFormHook, createFormHookContexts } from "@tanstack/react-form";

/**
 * Form hook contexts and utilities for the temperature check form.
 * This enables type-safe form composition with withForm.
 */
const { fieldContext, formContext } = createFormHookContexts();

export const { useAppForm, withForm } = createFormHook({
	fieldComponents: {},
	formComponents: {},
	fieldContext,
	formContext,
});
