import type { WalletDataStateAccount } from "@radixdlt/radix-dapp-toolkit";
import { Effect, Option, Ref } from "effect";

import { RadixDappToolkit } from "@/lib/dappToolkit";

// Stores the selected address for use inside Effects (outside of React)
const selectedAccountAddressRef = Ref.unsafeMake<Option.Option<string>>(
	Option.none(),
);

// Simple pub/sub for reactive account selection tracking
const listeners = new Set<() => void>();

/** Subscribe to selected account changes (for useSyncExternalStore) */
export const subscribeSelectedAccount = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

/** Get the current selected address snapshot (for useSyncExternalStore) */
export const getSelectedAccountSnapshot = () =>
	Effect.runSync(Ref.get(selectedAccountAddressRef));

// Set the selected account address (called from React components)
export const setSelectedAccountAddress = (address: string) => {
	Effect.runSync(Ref.set(selectedAccountAddressRef, Option.some(address)));
	for (const listener of listeners) listener();
};

/**
 * Get the current account inside an Effect.
 * Uses the selected account if set, otherwise defaults to first account.
 */
export const getCurrentAccount = Effect.gen(function* () {
	const rdtRef = yield* RadixDappToolkit;
	const rdt = yield* Ref.get(rdtRef);
	const walletData = rdt.walletApi.getWalletData();
	const accounts = walletData?.accounts ?? [];

	if (accounts.length === 0) {
		return Option.none<WalletDataStateAccount>();
	}

	const selectedAddress = yield* Ref.get(selectedAccountAddressRef);

	// If we have a selected address, try to find it in accounts
	if (Option.isSome(selectedAddress)) {
		const found = accounts.find((acc) => acc.address === selectedAddress.value);
		if (found) {
			return Option.some(found);
		}
	}

	// Default to first account
	return Option.fromNullable(accounts[0]);
});
