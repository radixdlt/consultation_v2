import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as React from "react";

const Theme = Schema.Literal("dark", "light", "system");
type Theme = typeof Theme.Type;

const ActualTheme = Schema.Literal("dark", "light");
type ActualTheme = typeof ActualTheme.Type;

type ThemeProviderProps = {
	children: React.ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
};

type ThemeProviderState = {
	theme: Theme;
	actualTheme: ActualTheme;
	setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
	theme: "system",
	actualTheme: "light",
	setTheme: () => null,
};

const ThemeProviderContext =
	React.createContext<ThemeProviderState>(initialState);

const getActualTheme = (theme: Theme): ActualTheme => {
	if (theme === "system") {
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	}
	return theme;
};

export const ThemeProvider = ({
	children,
	defaultTheme = "system",
	storageKey = "vite-ui-theme",
	...props
}: ThemeProviderProps) => {
	const [theme, setThemeState] = React.useState<Theme>(() => {
		if (typeof window === "undefined") return defaultTheme;
		return Option.fromNullable(localStorage.getItem(storageKey)).pipe(
			Option.flatMap(Schema.decodeUnknownOption(Theme)),
			Option.getOrElse(() => defaultTheme),
		);
	});

	const [actualTheme, setActualTheme] = React.useState<ActualTheme>(() => {
		if (typeof window === "undefined") return "light";
		// Read from DOM - the inline script already set the correct class
		if (document.documentElement.classList.contains("dark")) return "dark";
		if (document.documentElement.classList.contains("light")) return "light";
		return getActualTheme(theme);
	});

	// Listen for system theme changes
	React.useEffect(() => {
		if (theme !== "system") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = (e: MediaQueryListEvent) =>
			setActualTheme(e.matches ? "dark" : "light");

		mediaQuery.addEventListener("change", handler);
		return () => mediaQuery.removeEventListener("change", handler);
	}, [theme]);

	// Update actual theme when theme preference changes
	React.useEffect(() => {
		const newActualTheme = getActualTheme(theme);
		setActualTheme(newActualTheme);
		const root = document.documentElement;
		root.classList.remove("light", "dark");
		root.classList.add(newActualTheme);
	}, [theme]);

	const value = {
		theme,
		actualTheme,
		setTheme: (theme: Theme) => {
			localStorage.setItem(storageKey, theme);
			setThemeState(theme);
		},
	};

	return (
		<ThemeProviderContext.Provider {...props} value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
};

export const useTheme = () => {
	const context = React.useContext(ThemeProviderContext);

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (context === undefined)
		throw new Error("useTheme must be used within a ThemeProvider");

	return context;
};
