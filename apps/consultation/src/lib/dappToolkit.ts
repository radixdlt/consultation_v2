import {
	DataRequestBuilder,
	Logger,
	RadixDappToolkit as RadixDappToolkitFactory,
} from "@radixdlt/radix-dapp-toolkit";
import { Context, Data, Effect, Layer, Ref } from "effect";
import { envVars } from "./envVars";

class BrowserNotAvailableError extends Data.TaggedError(
	"BrowserNotAvailableError",
)<{
	message: string;
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
