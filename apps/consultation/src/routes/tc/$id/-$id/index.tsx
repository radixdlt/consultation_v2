import { Result, useAtomValue } from "@effect-atom/atom-react";
import { Cause } from "effect";
import type { TemperatureCheckId } from "shared/governance/brandedTypes";
import { getTemperatureCheckByIdAtom } from "@/atom/temperatureChecksAtom";
import { InlineCode } from "@/components/ui/typography";

export function Page({ id }: { id: TemperatureCheckId }) {
	const temperatureCheck = useAtomValue(getTemperatureCheckByIdAtom(id));

	return Result.builder(temperatureCheck)
		.onInitial(() => {
			return <div>Loading...</div>;
		})
		.onSuccess((temperatureCheck) => {
			return (
				<div>
					<h1>{temperatureCheck.title}</h1>
					<p>{temperatureCheck.description}</p>
					<p>{temperatureCheck.radixTalkUrl.toString()}</p>
					<p>
						{temperatureCheck.voteOptions
							.map((option) => option.label)
							.join(", ")}
					</p>
					<p>{temperatureCheck.votes.toString()}</p>
				</div>
			);
		})
		.onFailure((error) => {
			return <InlineCode>{Cause.pretty(error)}</InlineCode>;
		})
		.render();
}
