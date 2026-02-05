import { Atom } from "@effect-atom/atom-react";
import { GetLedgerStateService } from "@radix-effects/gateway";
import { Effect, Layer } from "effect";
import { StokenetGatewayApiClientLayer } from "shared/gateway";
import { Config, GovernanceComponent } from "shared/governance/index";
import { makeAtomRuntime } from "@/atom/makeRuntimeAtom";

const runtime = makeAtomRuntime(
	Layer.mergeAll(
		GovernanceComponent.Default,
		GetLedgerStateService.Default,
	).pipe(
		Layer.provideMerge(StokenetGatewayApiClientLayer),
		Layer.provide(Config.StokenetLive),
	),
);

const PAGE_SIZE = 5;

export type SortOrder = "asc" | "desc";

export const paginatedProposalsAtom = Atom.family((page: number) =>
	Atom.family((sortOrder: SortOrder) =>
		runtime.atom(
			Effect.gen(function* () {
				const governanceComponent = yield* GovernanceComponent;
				return yield* governanceComponent.getPaginatedProposals({
					page,
					pageSize: PAGE_SIZE,
					sortOrder,
				});
			}),
		),
	),
);
