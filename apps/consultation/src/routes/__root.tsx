import { RegistryProvider } from "@effect-atom/atom-react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import { ThemeProvider } from "@/components/providers/themeProvider";
import appCss from "../styles.css?url";

const themeScript = `
  (function() {
    const stored = localStorage.getItem('vite-ui-theme');
    const theme = stored === 'dark' || stored === 'light' ? stored :
      (stored === 'system' || !stored) && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.classList.add(theme);
  })();
`;

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "TanStack Start Starter",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
		scripts: [
			{
				children: themeScript,
			},
		],
	}),
	shellComponent: RootDocument,
	component: RootComponent,
	notFoundComponent: NotFound,
});

function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="text-center">
				<h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
				<p className="text-muted-foreground">Page not found</p>
			</div>
		</div>
	);
}

function RootComponent() {
	return (
		<RegistryProvider>
			<Toaster />
			<ThemeProvider>
				<Header />
				<Outlet />
			</ThemeProvider>
		</RegistryProvider>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
