import { Result, useAtomValue } from "@effect-atom/atom-react";
import { Cause } from "effect";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { TemperatureCheckId } from "shared/governance/brandedTypes";
import { getTemperatureCheckByIdAtom } from "@/atom/temperatureChecksAtom";
import { InlineCode } from "@/components/ui/typography";
import { VotingSection } from "./components/VotingSection";

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

						{/* Right column - Title, Voting and metadata */}
						<div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
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
										{temperatureCheck.voteOptions
											.map((option) => option.label)
											.join(", ")}
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
					</div>
				</div>
			);
		})
		.onFailure((error) => {
			return <InlineCode>{Cause.pretty(error)}</InlineCode>;
		})
		.render();
}
