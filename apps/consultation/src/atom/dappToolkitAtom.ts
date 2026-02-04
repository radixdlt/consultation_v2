import { Atom } from "@effect-atom/atom-react";
import type { WalletData } from "@radixdlt/radix-dapp-toolkit";
import { Effect, Ref, Stream } from "effect";

import { RadixDappToolkit } from "@/lib/dappToolkit";
import { getCurrentAccount } from "@/lib/selectedAccount";

const runtime = Atom.runtime(RadixDappToolkit.Live);

export const dappToolkitAtom = runtime.atom(
	Effect.gen(function* () {
		const rdt = yield* RadixDappToolkit;

		return rdt;
	}),
);

export const walletDataAtom = runtime.atom(
	Effect.fnUntraced(function* (get) {
		const rdtRef = yield* RadixDappToolkit;
		const rdt = yield* Ref.get(rdtRef);

		const walletData = Stream.asyncScoped<WalletData>((emit) =>
			Effect.gen(function* () {
				const subscription = rdt.walletApi.walletData$.subscribe((data) => {
					return emit.single(data);
				});

				return Effect.sync(() => subscription.unsubscribe());
			}),
		);

		yield* Stream.runForEach(
			Stream.changesWith(
				walletData,
				(prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
			),
			(value) => Effect.sync(() => get.setSelf(Effect.succeed(value))),
		);

		return rdt.walletApi.getWalletData();
	}),
);

export const accountsAtom = runtime.atom(
	Effect.fnUntraced(function* (get) {
		const walletData = yield* get.result(walletDataAtom);
		return walletData?.accounts ?? [];
	}),
);

export const currentAccountAtom = runtime.atom(
	Effect.fnUntraced(function* () {
		const currentAccountOption = yield* getCurrentAccount;
		return currentAccountOption;
	}),
);
