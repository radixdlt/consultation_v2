import { Atom } from "@effect-atom/atom-react";
import {
	GatewayApiClient,
	GetLedgerStateService,
} from "@radix-effects/gateway";
import { AccountAddress, StateVersion } from "@radix-effects/shared";
import type { WalletDataStateAccount } from "@radixdlt/radix-dapp-toolkit";
import { Array as A, Data, Effect, Layer, Option, pipe } from "effect";
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
import {
	type KeyValueStoreAddress,
	TemperatureCheckCreatedEvent,
} from "shared/schemas";
import { makeAtomRuntime } from "@/atom/makeRuntimeAtom";
import {
	RadixDappToolkit,
	SendTransaction,
	WalletErrorResponse,
} from "@/lib/dappToolkit";
import { getCurrentAccount } from "@/lib/selectedAccount";
import { accountsAtom } from "./dappToolkitAtom";
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

export class AccountAlreadyVotedError extends Data.TaggedError(
	"AccountAlreadyVotedError",
)<{
	message: string;
}> {}

export class AllAccountsAlreadyVotedError extends Data.TaggedError(
	"AllAccountsAlreadyVotedError",
)<{
	message: string;
}> {}

const componentErrorMessage = {
	accountAlreadyVoted: "accountAlreadyVoted",
} as const;

// Core vote logic without toast - reused by both single and batch atoms
const voteOnTemperatureCheck = (input: MakeTemperatureCheckVoteInput) =>
	Effect.gen(function* () {
		const governanceComponent = yield* GovernanceComponent;
		const sendTransaction = yield* SendTransaction;

		const manifest =
			yield* governanceComponent.makeTemperatureCheckVoteManifest(input);

		return yield* sendTransaction(manifest, `Temperature check ID`).pipe(
			Effect.catchTag("WalletErrorResponse", (error) =>
				Effect.gen(function* () {
					if (
						error.message.includes(componentErrorMessage.accountAlreadyVoted)
					) {
						return yield* new AccountAlreadyVotedError({
							message: "Account has already voted on this temperature check",
						});
					}
					return yield* new WalletErrorResponse({
						error: error.message,
					});
				}),
			),
		);
	});

export const voteOnTemperatureCheckAtom = runtime.fn(
	Effect.fn(
		(input: MakeTemperatureCheckVoteInput) => voteOnTemperatureCheck(input),
		withToast({
			whenLoading: "Submitting vote...",
			whenSuccess: "Vote submitted",
			whenFailure: ({ cause }) => {
				if (cause._tag === "Fail" && cause.error.message) {
					return Option.some(cause.error.message);
				}
				return Option.some("Failed to submit vote");
			},
		}),
	),
);

type VoteResult = { account: string; success: boolean; error?: string };

export const voteOnTemperatureCheckBatchAtom = runtime.fn(
	Effect.fn(
		function* (
			input: {
				accounts: WalletDataStateAccount[];
				temperatureCheckId: TemperatureCheckId;
				keyValueStoreAddress: KeyValueStoreAddress;
				vote: "For" | "Against";
			},
			get,
		) {
			const governanceComponent = yield* GovernanceComponent;

			// Get existing votes for the accounts
			const existingVotes =
				yield* governanceComponent.getTemperatureCheckVotesByAccounts({
					keyValueStoreAddress: input.keyValueStoreAddress,
					accounts: input.accounts.map((acc) =>
						AccountAddress.make(acc.address),
					),
				});

			const alreadyVotedAddresses = new Set<string>(
				existingVotes.map((v) => v.address),
			);

			// Filter out accounts that have already voted
			const accountsToVote = input.accounts.filter(
				(acc) => !alreadyVotedAddresses.has(acc.address),
			);

			// If no accounts can vote, return error
			if (accountsToVote.length === 0) {
				const message =
					input.accounts.length === 1
						? "This account has already voted"
						: "All selected accounts have already voted";
				return yield* new AllAccountsAlreadyVotedError({ message });
			}

			const results: VoteResult[] = [];

			for (const account of accountsToVote) {
				const result = yield* voteOnTemperatureCheck({
					accountAddress: AccountAddress.make(account.address),
					temperatureCheckId: input.temperatureCheckId,
					vote: input.vote,
				}).pipe(
					Effect.map(
						(): VoteResult => ({ account: account.address, success: true }),
					),
					Effect.catchAll((error) =>
						Effect.succeed<VoteResult>({
							account: account.address,
							success: false,
							error:
								"message" in error ? (error.message as string) : "Vote failed",
						}),
					),
				);
				results.push(result);
			}

			// Refresh votes atom to update UI after successful votes
			const hasSuccessfulVotes = results.some((r) => r.success);
			if (hasSuccessfulVotes) {
				get.refresh(
					getTemperatureCheckVotesByAccountsAtom(input.keyValueStoreAddress),
				);
			}

			return results;
		},
		withToast({
			whenLoading: "Submitting votes...",
			whenSuccess: ({ result }) => {
				const successes = result.filter((r) => r.success).length;
				const failures = result.filter((r) => !r.success).length;
				if (failures === 0) return `${successes} vote(s) submitted`;
				if (successes === 0) return "All votes failed";
				return `${successes} submitted, ${failures} failed`;
			},
			whenFailure: ({ cause }) => {
				if (cause._tag === "Fail") {
					if (cause.error instanceof AllAccountsAlreadyVotedError) {
						return Option.some(cause.error.message);
					}
				}
				return Option.some("Failed to submit votes");
			},
		}),
	),
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

export const getTemperatureCheckVotesByAccountsAtom = Atom.family(
	(keyValueStoreAddress: KeyValueStoreAddress) =>
		runtime.atom(
			Effect.fnUntraced(function* (get) {
				const accounts = yield* get.result(accountsAtom);

				const governanceComponent = yield* GovernanceComponent;

				const votes =
					yield* governanceComponent.getTemperatureCheckVotesByAccounts({
						keyValueStoreAddress,
						accounts: accounts.map((account) =>
							AccountAddress.make(account.address),
						),
					});

				return votes.map((vote) => {
					const account = accounts.find((a) => a.address === vote.address);
					return {
						...vote,
						label: account?.label ?? "Unknown Account",
					};
				});
			}),
		),
);

const PAGE_SIZE = 5;

export type SortOrder = "asc" | "desc";

export const paginatedTemperatureChecksAtom = Atom.family((page: number) =>
	Atom.family((sortOrder: SortOrder) =>
		runtime.atom(
			Effect.gen(function* () {
				const governanceComponent = yield* GovernanceComponent;
				return yield* governanceComponent.getPaginatedTemperatureChecks({
					page,
					pageSize: PAGE_SIZE,
					sortOrder,
				});
			}),
		),
	),
);
