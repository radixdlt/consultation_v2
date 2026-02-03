import { useAtomValue } from "@effect-atom/atom-react";
import type { TemperatureCheckId } from "shared/governance/brandedTypes";
import type { TemperatureCheckSchema } from "shared/governance/schemas";
import { getTemperatureCheckVotesByAccountsAtom } from "@/atom/temperatureChecksAtom";
import { VotingSection } from "./VotingSection";
import { YourVotesSection } from "./YourVotesSection";

type TemperatureCheck = typeof TemperatureCheckSchema.Type;

type SidebarContentProps = {
	temperatureCheck: TemperatureCheck;
	id: TemperatureCheckId;
};

export function SidebarContent({ temperatureCheck, id }: SidebarContentProps) {
	const accountsVotesResult = useAtomValue(
		getTemperatureCheckVotesByAccountsAtom(temperatureCheck.votes),
	);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">{temperatureCheck.title}</h1>
				<p className="mt-2 text-muted-foreground">
					{temperatureCheck.shortDescription}
				</p>
			</div>

			<VotingSection temperatureCheckId={id} />

			<YourVotesSection accountsVotesResult={accountsVotesResult} />

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
	);
}
