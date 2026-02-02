import { Atom } from "@effect-atom/atom-react";
import {
	GatewayApiClient,
	GetLedgerStateService,
} from "@radix-effects/gateway";
import { AccountAddress, StateVersion } from "@radix-effects/shared";
import type { TransactionStatus } from "@radixdlt/radix-dapp-toolkit";
import { Array as A, Data, Effect, Layer, Option, pipe, Ref } from "effect";
import { StokenetGatewayApiClientLayer } from "shared/gateway";
import {
	Config,
	GovernanceComponent,
	type TemperatureCheckId,
} from "shared/governance/index";
import type {
	MakeTemperatureCheckInput,
	MakeTemperatureCheckVoteInput,
} from "shared/governance/schemas";
import { parseSbor } from "shared/helpers/parseSbor";
import { TemperatureCheckCreatedEvent } from "shared/schemas";
import { getCurrentAccount } from "@/lib/selectedAccount";
import { makeAtomRuntime } from "@/atom/makeRuntimeAtom";
import {
	RadixDappToolkit,
	SendTransaction,
	WalletErrorResponse,
} from "@/lib/dappToolkit";
import { withToast } from "./withToast";

const runtime = makeAtomRuntime(
	Layer.mergeAll(
		GovernanceComponent.Default,
		GetLedgerStateService.Default,
		SendTransaction.Default,
	).pipe(
		Layer.provideMerge(RadixDappToolkit.Live),
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

export class EventNotFoundError extends Data.TaggedError("EventNotFoundError")<{
	message: string;
}> {}

export class NoAccountConnectedError extends Data.TaggedError(
	"NoAccountConnectedError",
)<{
	message: string;
}> {}

type MakeTemperatureCheckFormInput = Omit<
	MakeTemperatureCheckInput,
	"authorAccount"
>;

export const makeTemperatureCheckAtom = runtime.fn(
	Effect.fn(
		function* (input: MakeTemperatureCheckFormInput) {
			const governanceComponent = yield* GovernanceComponent;
			const gatewayApiClient = yield* GatewayApiClient;
			const sendTransaction = yield* SendTransaction;

			const currentAccountOption = yield* getCurrentAccount;

			if (Option.isNone(currentAccountOption)) {
				return yield* new NoAccountConnectedError({
					message: "Please connect your wallet first",
				});
			}

			const currentAccount = currentAccountOption.value;
			const authorAccount = AccountAddress.make(currentAccount.address);

			const manifest = yield* governanceComponent.makeTemperatureCheckManifest({
				...input,
				links: input.links.filter((link) => link.trim() !== ""),
				authorAccount,
			});

			yield* Effect.log("Transaction manifest:", manifest);

			const result = yield* sendTransaction(manifest);

			const events = yield* gatewayApiClient.transaction
				.getCommittedDetails(result.transactionIntentHash)
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

export const voteOnTemperatureCheckAtom = runtime.fn(
	Effect.fn(function* (input: MakeTemperatureCheckVoteInput) {
		const governanceComponent = yield* GovernanceComponent;

		const sendTransaction = yield* SendTransaction;

		const manifest =
			yield* governanceComponent.makeTemperatureCheckVoteManifest(input);

		return yield* sendTransaction(manifest);
	}),
);

export const getTemperatureCheckByIdAtom = Atom.family(
	(id: TemperatureCheckId) =>
		runtime.atom(
			Effect.gen(function* () {
				const governanceComponent = yield* GovernanceComponent;
				return yield* governanceComponent.getTemperatureCheckById(id);
			}),
		),
);
