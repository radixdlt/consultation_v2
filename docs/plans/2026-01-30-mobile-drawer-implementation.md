# Mobile Drawer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the right column (title, voting, metadata) into a bottom drawer on mobile, triggered by a floating action button.

**Architecture:** Extract sidebar content into reusable component. Desktop shows inline column, mobile shows FAB + Vaul drawer. Responsive breakpoint at `lg` (1024px).

**Tech Stack:** Vaul (drawer), lucide-react (Vote icon), Tailwind responsive classes

---

## Task 1: Install Vaul Dependency

**Files:**
- Modify: `apps/consultation/package.json`

**Step 1: Install vaul**

Run:
```bash
cd apps/consultation && pnpm add vaul
```

Expected: Package added to dependencies

**Step 2: Verify installation**

Run:
```bash
cd apps/consultation && pnpm list vaul
```

Expected: `vaul` listed in output

**Step 3: Commit**

```bash
git add apps/consultation/package.json pnpm-lock.yaml
git commit -m "chore: add vaul dependency for drawer component"
```

---

## Task 2: Add Drawer UI Component

**Files:**
- Create: `apps/consultation/src/components/ui/drawer.tsx`

**Step 1: Create drawer component**

Create `apps/consultation/src/components/ui/drawer.tsx`:

```tsx
import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
        className
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props}
  />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
```

**Step 2: Verify no TypeScript errors**

Run:
```bash
cd apps/consultation && pnpm exec tsc --noEmit
```

Expected: No errors related to drawer.tsx

**Step 3: Commit**

```bash
git add apps/consultation/src/components/ui/drawer.tsx
git commit -m "feat: add drawer UI component (vaul-based)"
```

---

## Task 3: Extract SidebarContent Component

**Files:**
- Create: `apps/consultation/src/routes/tc/$id/-$id/components/SidebarContent.tsx`

**Step 1: Create SidebarContent component**

Create `apps/consultation/src/routes/tc/$id/-$id/components/SidebarContent.tsx`:

```tsx
import type { TemperatureCheck } from "shared/governance/temperatureCheck";
import type { TemperatureCheckId } from "shared/governance/brandedTypes";
import { VotingSection } from "./VotingSection";

type SidebarContentProps = {
  temperatureCheck: TemperatureCheck;
  id: TemperatureCheckId;
};

export function SidebarContent({ temperatureCheck, id }: SidebarContentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{temperatureCheck.title}</h1>
        <p className="mt-2 text-muted-foreground">
          {temperatureCheck.shortDescription}
        </p>
      </div>

      <VotingSection temperatureCheckId={id} />

      <div className="space-y-3 text-sm">
        <div>
          <span className="font-medium">Author</span>
          <p className="text-muted-foreground truncate">
            {temperatureCheck.author}
          </p>
        </div>

        <div>
          <span className="font-medium">Vote Options</span>
          <p className="text-muted-foreground">
            {temperatureCheck.voteOptions.map((option) => option.label).join(", ")}
          </p>
        </div>

        <div>
          <span className="font-medium">Links</span>
          <div className="space-y-1">
            {temperatureCheck.links.map((link) => (
              <a
                key={link.toString()}
                href={link.toString()}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-primary hover:underline truncate"
              >
                {link.toString()}
              </a>
            ))}
          </div>
        </div>

        <div>
          <span className="font-medium">ID</span>
          <p className="text-muted-foreground">{temperatureCheck.id}</p>
        </div>

        <div>
          <span className="font-medium">Votes Store</span>
          <p className="text-muted-foreground truncate">
            {temperatureCheck.votes.toString()}
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run:
```bash
cd apps/consultation && pnpm exec tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add apps/consultation/src/routes/tc/\$id/-\$id/components/SidebarContent.tsx
git commit -m "refactor: extract SidebarContent component"
```

---

## Task 4: Update Page with Responsive Drawer

**Files:**
- Modify: `apps/consultation/src/routes/tc/$id/-$id/index.tsx`

**Step 1: Update the page component**

Replace contents of `apps/consultation/src/routes/tc/$id/-$id/index.tsx`:

```tsx
import { Result, useAtomValue } from "@effect-atom/atom-react";
import { Cause } from "effect";
import { Vote } from "lucide-react";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { TemperatureCheckId } from "shared/governance/brandedTypes";
import { getTemperatureCheckByIdAtom } from "@/atom/temperatureChecksAtom";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { InlineCode } from "@/components/ui/typography";
import { SidebarContent } from "./components/SidebarContent";

export function Page({ id }: { id: TemperatureCheckId }) {
  const temperatureCheck = useAtomValue(getTemperatureCheckByIdAtom(id));

  return Result.builder(temperatureCheck)
    .onInitial(() => {
      return <div>Loading...</div>;
    })
    .onSuccess((temperatureCheck) => {
      return (
        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left column - Markdown content */}
            <div className="lg:col-span-3">
              <div className="prose dark:prose-invert max-w-none">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                >
                  {temperatureCheck.description}
                </Markdown>
              </div>
            </div>

            {/* Right column - Desktop only */}
            <div className="hidden lg:block lg:sticky lg:top-4 lg:self-start">
              <SidebarContent temperatureCheck={temperatureCheck} id={id} />
            </div>
          </div>

          {/* Mobile drawer with FAB trigger */}
          <div className="lg:hidden">
            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  size="icon"
                  className="fixed bottom-6 right-6 size-14 rounded-full shadow-lg"
                >
                  <Vote className="size-6" />
                  <span className="sr-only">Open voting panel</span>
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[80vh]">
                <div className="overflow-y-auto p-6">
                  <SidebarContent temperatureCheck={temperatureCheck} id={id} />
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      );
    })
    .onFailure((error) => {
      return <InlineCode>{Cause.pretty(error)}</InlineCode>;
    })
    .render();
}
```

**Step 2: Verify no TypeScript errors**

Run:
```bash
cd apps/consultation && pnpm exec tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add apps/consultation/src/routes/tc/\$id/-\$id/index.tsx
git commit -m "feat: add mobile drawer with FAB for voting panel"
```

---

## Task 5: Manual Testing

**Step 1: Start dev server**

Run:
```bash
cd apps/consultation && pnpm dev
```

**Step 2: Test desktop layout**

- Open browser to `http://localhost:3000/tc/<some-id>`
- Verify right column visible on desktop (>1024px)
- Verify FAB not visible on desktop
- Verify sticky behavior works on scroll

**Step 3: Test mobile layout**

- Resize browser to mobile width (<1024px)
- Verify right column hidden
- Verify FAB visible in bottom-right corner
- Click FAB - drawer should open from bottom
- Verify drawer contains title, voting section, metadata
- Verify drawer is scrollable if content exceeds 80vh
- Drag handle should close drawer

**Step 4: Final commit**

If all tests pass:
```bash
git add -A
git commit -m "test: verify mobile drawer functionality"
```

(Or skip if no changes needed)
