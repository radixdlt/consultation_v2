import { Atom } from "@effect-atom/atom-react";
import {
	GetFungibleBalance,
	GetLedgerStateService,
} from "@radix-effects/gateway";
import { AccountAddress, StateVersion } from "@radix-effects/shared";
import { Effect, Layer, Option } from "effect";
import { StokenetGatewayApiClientLayer } from "shared/gateway";
import { Config, GovernanceComponent } from "shared/governance/index";
import type { TemperatureCheckId } from "shared/governance/brandedTypes";
import { makeAtomRuntime } from "@/atom/makeRuntimeAtom";
import {
	RadixDappToolkit,
	SendTransaction,
	WalletErrorResponse,
} from "@/lib/dappToolkit";
import { getCurrentAccount } from "@/lib/selectedAccount";
import {
	NoAccountConnectedError,
	getTemperatureCheckByIdAtom,
} from "./temperatureChecksAtom";
import { withToast } from "./withToast";

const runtime = makeAtomRuntime(
	Layer.mergeAll(
		GovernanceComponent.Default,
		GetFungibleBalance.Default,
		GetLedgerStateService.Default,
		SendTransaction.Default,
	).pipe(
		Layer.provideMerge(RadixDappToolkit.Live),
		Layer.provideMerge(StokenetGatewayApiClientLayer),
		Layer.provideMerge(Config.StokenetLive),
	),
);

/** Checks whether a specific account holds the admin badge */
export const isAdminAtom = Atom.family((accountAddress: string) =>
	runtime.atom(
		Effect.gen(function* () {
			const config = yield* Config;
			const getFungibleBalance = yield* GetFungibleBalance;
			const getLedgerState = yield* GetLedgerStateService;

			const stateVersion = yield* getLedgerState({
				at_ledger_state: { timestamp: new Date() },
			}).pipe(
				Effect.map((result) => StateVersion.make(result.state_version)),
			);

			const balances = yield* getFungibleBalance({
				addresses: [accountAddress],
				at_ledger_state: {
					state_version: stateVersion,
				},
			});

			return balances.some((account) =>
				account.items.some(
					(item) => item.resource_address === config.adminBadgeAddress,
				),
			);
		}),
	),
);

/** Promotes a temperature check to a proposal */
export const promoteToProposalAtom = runtime.fn(
	Effect.fn(
		function* (temperatureCheckId: TemperatureCheckId, get) {
			const governanceComponent = yield* GovernanceComponent;
			const sendTransaction = yield* SendTransaction;

			const currentAccountOption = yield* getCurrentAccount;

			if (Option.isNone(currentAccountOption)) {
				return yield* new NoAccountConnectedError({
					message: "Please connect your wallet first",
				});
			}

			const currentAccount = currentAccountOption.value;
			const accountAddress = AccountAddress.make(currentAccount.address);

			const manifest = yield* governanceComponent.makeProposalManifest({
				accountAddress,
				temperatureCheckId,
			});

			yield* Effect.log("Promote to proposal manifest:", manifest);

			const result = yield* sendTransaction(manifest, "Promote to proposal");

			get.refresh(getTemperatureCheckByIdAtom(temperatureCheckId));

			return result;
		},
		withToast({
			whenLoading: "Promoting to proposal...",
			whenSuccess: "Temperature check promoted to proposal",
			whenFailure: ({ cause }) => {
				if (cause._tag === "Fail") {
					if (cause.error instanceof WalletErrorResponse) {
						return Option.some(cause.error.message ?? "Wallet error");
					}
					if (cause.error instanceof NoAccountConnectedError) {
						return Option.some(cause.error.message);
					}
				}
				return Option.some("Failed to promote to proposal");
			},
		}),
	),
);
