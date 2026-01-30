import {
	GatewayApiClient,
	GetLedgerStateService,
} from "@radix-effects/gateway";
import { AccountAddress, StateVersion } from "@radix-effects/shared";
import type { TransactionStatus } from "@radixdlt/radix-dapp-toolkit";
import { Array as A, Data, Effect, Layer, Option, pipe, Ref } from "effect";
import { StokenetGatewayApiClientLayer } from "shared/gateway";
import { Config, GovernanceComponent } from "shared/governance/index";
import { parseSbor } from "shared/helpers/parseSbor";
import { TemperatureCheckCreatedEvent } from "shared/schemas";
import { makeAtomRuntime } from "@/atom/makeRuntimeAtom";
import { RadixDappToolkit } from "@/lib/dappToolkit";
import { withToast } from "./withToast";

const runtime = makeAtomRuntime(
	Layer.mergeAll(
		GovernanceComponent.Default,
		GetLedgerStateService.Default,
		RadixDappToolkit.Live,
	).pipe(
		Layer.provideMerge(StokenetGatewayApiClientLayer),
		Layer.provide(Config.StokenetLive),
	),
);

export const temperatureChecksAtom = runtime.atom(
	Effect.gen(function* () {
		const governanceComponent = yield* GovernanceComponent;

		const ledgerState = yield* GetLedgerStateService;
		const stateVersion = yield* ledgerState({
			at_ledger_state: {
				timestamp: new Date(),
			},
		}).pipe(Effect.map((result) => StateVersion.make(result.state_version)));

		return yield* governanceComponent.getTemperatureChecks(stateVersion);
	}),
);

export class UnexpectedWalletError extends Data.TaggedError(
	"UnexpectedWalletError",
)<{
	error: unknown;
}> {}

export class WalletErrorResponse extends Data.TaggedError(
	"WalletErrorResponse",
)<{
	error: string;
	jsError?: unknown;
	message?: string;
	transactionIntentHash?: string;
	status?: TransactionStatus;
}> {}

export class EventNotFoundError extends Data.TaggedError("EventNotFoundError")<{
	message: string;
}> {}

export class NoAccountConnectedError extends Data.TaggedError(
	"NoAccountConnectedError",
)<{
	message: string;
}> {}

type MakeTemperatureCheckFormInput = {
	title: string;
	shortDescription: string;
	description: string;
	links: string[];
	voteOptions: string[];
	maxSelections: number;
};

export const makeTemperatureCheckAtom = runtime.fn(
	Effect.fn(
		function* (input: MakeTemperatureCheckFormInput) {
			const governanceComponent = yield* GovernanceComponent;
			const rdtRef = yield* RadixDappToolkit;
			const rdt = yield* Ref.get(rdtRef);
			const gatewayApiClient = yield* GatewayApiClient;

			// TODO: Replace with global current account state instead of getting from walletData each time
			const walletData = rdt.walletApi.getWalletData();
			const currentAccount = walletData?.accounts[0];

			if (!currentAccount) {
				return yield* new NoAccountConnectedError({
					message: "Please connect your wallet first",
				});
			}

			const authorAccount = AccountAddress.make(currentAccount.address);

			// Filter valid links (keep as strings, schema will validate)
			const validLinks: string[] = [];
			for (const link of input.links) {
				if (link.trim()) {
					try {
						new URL(link); // Validate it's a valid URL
						validLinks.push(link);
					} catch {
						yield* Effect.logWarning(`Skipping invalid URL: ${link}`);
					}
				}
			}

			const manifest = yield* governanceComponent.makeTemperatureCheckManifest({
				title: input.title,
				shortDescription: input.shortDescription,
				description: input.description,
				links: validLinks,
				voteOptions: input.voteOptions,
				maxSelections: input.maxSelections,
				authorAccount,
			});

			yield* Effect.log("Transaction manifest:", manifest);

			const result = yield* Effect.tryPromise({
				try: () =>
					rdt.walletApi.sendTransaction({ transactionManifest: manifest }),
				catch: (error) => new UnexpectedWalletError({ error }),
			});

			if (result.isErr()) {
				return yield* new WalletErrorResponse(result.error);
			}

			const events = yield* gatewayApiClient.transaction
				.getCommittedDetails(result.value.transactionIntentHash)
				.pipe(
					Effect.map((result) =>
						Option.fromNullable(result.transaction.receipt?.events),
					),
				);

			const temperatureCheckCreatedEvent = yield* pipe(
				events,
				Option.flatMap((events) =>
					A.findFirst(
						events,
						(event) => event.name === "TemperatureCheckCreatedEvent",
					),
				),
				Option.map((event) => event.data),
				Option.match({
					onSome: (sbor) => parseSbor(sbor, TemperatureCheckCreatedEvent),
					onNone: () =>
						new EventNotFoundError({
							message: "TemperatureCheckCreatedEvent not found",
						}),
				}),
			);

			return temperatureCheckCreatedEvent;
		},
		withToast({
			whenLoading: "Making temperature check...",
			whenSuccess: "Temperature check made successfully",
			whenFailure: ({ cause }) => {
				if (cause._tag === "Fail") {
					if (cause.error instanceof WalletErrorResponse) {
						return Option.some(cause.error.message ?? "Wallet error");
					}
					if (cause.error instanceof NoAccountConnectedError) {
						return Option.some(cause.error.message);
					}
				}
				return Option.some("Failed to make temperature check");
			},
		}),
	),
);
