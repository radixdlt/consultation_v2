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
