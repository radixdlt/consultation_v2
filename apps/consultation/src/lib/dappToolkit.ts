import {
	DataRequestBuilder,
	Logger,
	RadixDappToolkit as RadixDappToolkitFactory,
	TransactionStatus,
} from "@radixdlt/radix-dapp-toolkit";
import { Context, Data, Effect, Layer, Ref } from "effect";
import { envVars } from "./envVars";
import { TransactionManifestString } from "@radix-effects/shared";

class BrowserNotAvailableError extends Data.TaggedError(
	"BrowserNotAvailableError",
)<{
	message: string;
}> {}

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

export class RadixDappToolkit extends Context.Tag("RadixDappToolkit")<
	RadixDappToolkit,
	Ref.Ref<RadixDappToolkitFactory>
>() {
	static Live = Layer.scoped(
		this,
		Effect.gen(function* () {
			if (typeof window === "undefined") {
				return yield* new BrowserNotAvailableError({
					message: "RadixDappToolkit requires browser environment (window)",
				});
			}

			const rdt = RadixDappToolkitFactory({
				networkId: envVars.NETWORK_ID,
				dAppDefinitionAddress: envVars.DAPP_DEFINITION_ADDRESS,
				logger: Logger(),
			});

			rdt.walletApi.setRequestData(DataRequestBuilder.accounts().atLeast(1));

			yield* Effect.addFinalizer(() =>
				Effect.sync(() => {
					return rdt.destroy();
				}),
			);

			return RadixDappToolkit.of(yield* Ref.make<RadixDappToolkitFactory>(rdt));
		}),
	);
}

export class SendTransaction extends Effect.Service<SendTransaction>()(
	"SendTransaction",
	{
		effect: Effect.gen(function* () {
			const rdtRef = yield* RadixDappToolkit;

			return {
				sendTransaction: Effect.fn(function* (
					transactionManifest: TransactionManifestString,
				) {
					const rdt = yield* Ref.get(rdtRef);
					const result = yield* Effect.tryPromise({
						try: () => rdt.walletApi.sendTransaction({ transactionManifest }),
						catch: (error) => new UnexpectedWalletError({ error }),
					});
					if (result.isErr()) {
						return yield* new WalletErrorResponse(result.error);
					}
					return result.value;
				}),
			};
		}),
	},
) {}
