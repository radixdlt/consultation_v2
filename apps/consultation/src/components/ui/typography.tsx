import type * as React from "react";

import { cn } from "@/lib/utils";

function H1({ className, ...props }: React.ComponentProps<"h1">) {
	return (
		<h1
			data-slot="h1"
			className={cn(
				"scroll-m-20 text-4xl font-extrabold tracking-tight text-balance",
				className,
			)}
			{...props}
		/>
	);
}

function H2({ className, ...props }: React.ComponentProps<"h2">) {
	return (
		<h2
			data-slot="h2"
			className={cn(
				"scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0",
				className,
			)}
			{...props}
		/>
	);
}

function H3({ className, ...props }: React.ComponentProps<"h3">) {
	return (
		<h3
			data-slot="h3"
			className={cn(
				"scroll-m-20 text-2xl font-semibold tracking-tight",
				className,
			)}
			{...props}
		/>
	);
}

function H4({ className, ...props }: React.ComponentProps<"h4">) {
	return (
		<h4
			data-slot="h4"
			className={cn(
				"scroll-m-20 text-xl font-semibold tracking-tight",
				className,
			)}
			{...props}
		/>
	);
}

function P({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="p"
			className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}
			{...props}
		/>
	);
}

function Blockquote({
	className,
	...props
}: React.ComponentProps<"blockquote">) {
	return (
		<blockquote
			data-slot="blockquote"
			className={cn("mt-6 border-l-2 pl-6 italic", className)}
			{...props}
		/>
	);
}

function List({ className, ...props }: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="list"
			className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)}
			{...props}
		/>
	);
}

function InlineCode({ className, ...props }: React.ComponentProps<"code">) {
	return (
		<code
			data-slot="inline-code"
			className={cn(
				"bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
				className,
			)}
			{...props}
		/>
	);
}

function Lead({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="lead"
			className={cn("text-muted-foreground text-xl", className)}
			{...props}
		/>
	);
}

function Large({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="large"
			className={cn("text-lg font-semibold", className)}
			{...props}
		/>
	);
}

function Small({ className, ...props }: React.ComponentProps<"small">) {
	return (
		<small
			data-slot="small"
			className={cn("text-sm font-medium leading-none", className)}
			{...props}
		/>
	);
}

function Muted({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="muted"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

export {
	H1,
	H2,
	H3,
	H4,
	P,
	Blockquote,
	List,
	InlineCode,
	Lead,
	Large,
	Small,
	Muted,
};
