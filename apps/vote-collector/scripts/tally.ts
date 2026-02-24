/**
 * CLI tool to tally votes for a temperature check or proposal.
 *
 * Fetches all data directly from the Radix blockchain — no database required.
 *
 * Usage:
 *   pnpm tally tc <id>        # Tally a temperature check
 *   pnpm tally proposal <id>  # Tally a proposal
 *
 * Environment:
 *   NETWORK_ID         — 1 (mainnet) or 2 (stokenet)
 *   COMPONENT_ADDRESS  — (optional) override the governance component address
 */

import { GetLedgerStateService } from '@radix-effects/gateway'
import type { AccountAddress } from '@radix-effects/shared'
import { ComponentAddress, StateVersion } from '@radix-effects/shared'
import BigNumber from 'bignumber.js'
import {
  Config,
  Effect,
  Layer,
  Logger,
  ManagedRuntime,
  Option,
  Record as R,
  Schedule,
  pipe
} from 'effect'
import { GovernanceComponent } from 'shared/governance/index'
import { GovernanceConfig } from 'shared/governance/config'
import type { ProposalId, TemperatureCheckId } from 'shared/governance/brandedTypes'
import { GatewayApiClientLayer } from 'shared/gateway'
import {
  type DedupedVote,
  fetchDedupedProposalVotes,
  fetchDedupedTemperatureCheckVotes
} from '../src/vote-calculation/dedupeVotes'
import { VotePowerSnapshot } from '../src/vote-calculation/votePowerSnapshot'
import { getVotePowerConfig } from '../src/vote-calculation/voteSourceConfig'

/**
 * GovernanceConfigLayer that respects an optional COMPONENT_ADDRESS env var.
 * If set, overrides the component address from the network defaults.
 */
const TallyGovernanceConfigLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const networkId = yield* Config.number('NETWORK_ID').pipe(Effect.orDie)
    const overrideAddress = yield* Config.option(
      Config.string('COMPONENT_ADDRESS')
    )

    const baseConfig =
      networkId === 1
        ? GovernanceConfig.MainnetLive
        : GovernanceConfig.StokenetLive

    if (Option.isSome(overrideAddress)) {
      return Layer.effect(
        GovernanceConfig,
        Effect.map(GovernanceConfig, (existing) => ({
          ...existing,
          componentAddress: ComponentAddress.make(overrideAddress.value)
        }))
      ).pipe(Layer.provide(baseConfig))
    }

    return baseConfig
  })
)

const TallyLayer = Layer.mergeAll(
  VotePowerSnapshot.Default,
  GovernanceComponent.Default,
  GetLedgerStateService.Default
).pipe(
  Layer.provideMerge(GatewayApiClientLayer),
  Layer.provideMerge(TallyGovernanceConfigLayer),
  Layer.provideMerge(Logger.pretty)
)

const runtime = ManagedRuntime.make(TallyLayer)

const tallyTemperatureCheck = (id: number) =>
  Effect.gen(function* () {
    const governance = yield* GovernanceComponent
    const getLedgerState = yield* GetLedgerStateService
    const votePowerSnapshot = yield* VotePowerSnapshot

    const tc = yield* governance.getTemperatureCheckById(
      id as TemperatureCheckId
    )

    console.log()
    console.log(`Temperature Check #${tc.id}: ${tc.title}`)
    console.log(`  ${tc.shortDescription}`)
    console.log(
      `  Period: ${tc.start.toISOString()} -> ${tc.deadline.toISOString()}`
    )
    console.log(`  Quorum: ${tc.quorum} XRD`)
    console.log(
      `  Options: ${tc.voteOptions.map((o) => o.label).join(', ')}`
    )
    console.log(`  Total votes on-chain: ${tc.voteCount}`)
    console.log()

    if (tc.voteCount === 0) {
      console.log('No votes cast.')
      return
    }

    yield* Effect.log('Fetching votes from chain...')

    const dedupedVotes = yield* fetchDedupedTemperatureCheckVotes(governance, {
      keyValueStoreAddress: tc.votes,
      fromIndexInclusive: 0,
      toIndexInclusive: tc.voteCount
    })

    yield* Effect.log(`Unique voters: ${dedupedVotes.length}`)
    yield* Effect.log('Snapshotting vote power at TC start date...')

    const snapshotStateVersion = yield* getLedgerState({
      at_ledger_state: { timestamp: tc.start }
    }).pipe(
      Effect.map((r) => StateVersion.make(r.state_version)),
      Effect.orDie
    )

    const sourceConfig = getVotePowerConfig(tc.start)

    const retryPolicy = Schedule.exponential('1 second').pipe(
      Schedule.intersect(Schedule.recurs(3))
    )

    const { votePower } = yield* votePowerSnapshot({
      addresses: dedupedVotes.map((v) => v.accountAddress),
      stateVersion: snapshotStateVersion,
      sourceConfig
    }).pipe(Effect.retry(retryPolicy), Effect.orDie)

    printResults(dedupedVotes, votePower, tc.voteOptions)
  })

const tallyProposal = (id: number) =>
  Effect.gen(function* () {
    const governance = yield* GovernanceComponent
    const getLedgerState = yield* GetLedgerStateService
    const votePowerSnapshot = yield* VotePowerSnapshot

    const proposal = yield* governance.getProposalById(id as ProposalId)

    console.log()
    console.log(`Proposal #${proposal.id}: ${proposal.title}`)
    console.log(`  ${proposal.shortDescription}`)
    console.log(
      `  Period: ${proposal.start.toISOString()} -> ${proposal.deadline.toISOString()}`
    )
    console.log(`  Quorum: ${proposal.quorum} XRD`)
    console.log(
      `  Options: ${proposal.voteOptions.map((o) => `[${o.id}] ${o.label}`).join(', ')}`
    )
    console.log(`  Total votes on-chain: ${proposal.voteCount}`)
    console.log()

    if (proposal.voteCount === 0) {
      console.log('No votes cast.')
      return
    }

    yield* Effect.log('Fetching votes from chain...')

    const dedupedVotes = yield* fetchDedupedProposalVotes(governance, {
      keyValueStoreAddress: proposal.votes,
      fromIndexInclusive: 0,
      toIndexInclusive: proposal.voteCount
    })

    yield* Effect.log(`Unique voters: ${dedupedVotes.length}`)
    yield* Effect.log('Snapshotting vote power at proposal start date...')

    const snapshotStateVersion = yield* getLedgerState({
      at_ledger_state: { timestamp: proposal.start }
    }).pipe(
      Effect.map((r) => StateVersion.make(r.state_version)),
      Effect.orDie
    )

    const sourceConfig = getVotePowerConfig(proposal.start)

    const retryPolicy = Schedule.exponential('1 second').pipe(
      Schedule.intersect(Schedule.recurs(3))
    )

    const { votePower } = yield* votePowerSnapshot({
      addresses: dedupedVotes.map((v) => v.accountAddress),
      stateVersion: snapshotStateVersion,
      sourceConfig
    }).pipe(Effect.retry(retryPolicy), Effect.orDie)

    printResults(dedupedVotes, votePower, proposal.voteOptions)
  })

const printResults = (
  dedupedVotes: ReadonlyArray<DedupedVote>,
  votePower: R.ReadonlyRecord<AccountAddress, BigNumber>,
  voteOptions: ReadonlyArray<{ id: number; label: string }>
) => {
  // Build per-option aggregated totals
  const optionTotals = new Map<string, BigNumber>()
  let totalPower = new BigNumber(0)

  for (const voter of dedupedVotes) {
    const power = pipe(
      R.get(votePower, voter.accountAddress),
      Option.getOrElse(() => new BigNumber(0))
    )
    for (const vote of voter.votes) {
      const current = optionTotals.get(vote) ?? new BigNumber(0)
      optionTotals.set(vote, current.plus(power))
      totalPower = totalPower.plus(power)
    }
  }

  // Build option label lookup
  const optionLabels = new Map<string, string>()
  for (const opt of voteOptions) {
    optionLabels.set(String(opt.id), opt.label)
    optionLabels.set(opt.label, opt.label)
  }

  console.log('='.repeat(60))
  console.log('RESULTS')
  console.log('='.repeat(60))
  console.log()
  console.log(`  Unique voters: ${dedupedVotes.length}`)
  console.log(`  Total vote power: ${totalPower.toFormat(2)} XRD`)
  console.log()

  // Sort by vote power descending
  const sorted = [...optionTotals.entries()].sort((a, b) =>
    b[1].minus(a[1]).toNumber()
  )

  for (const [vote, power] of sorted) {
    const pct = totalPower.isZero()
      ? '0.00'
      : power.dividedBy(totalPower).multipliedBy(100).toFixed(2)
    const label = optionLabels.get(vote) ?? vote
    console.log(`  ${label.padEnd(30)} ${power.toFormat(2).padStart(20)} XRD  (${pct}%)`)
  }

  console.log()

  // Per-account breakdown
  console.log('-'.repeat(60))
  console.log('PER-ACCOUNT VOTES')
  console.log('-'.repeat(60))

  const accountRows = dedupedVotes
    .map((voter) => {
      const power = pipe(
        R.get(votePower, voter.accountAddress),
        Option.getOrElse(() => new BigNumber(0))
      )
      const voteLabels = voter.votes
        .map((v) => optionLabels.get(v) ?? v)
        .join(', ')
      return { address: voter.accountAddress, power, voteLabels }
    })
    .sort((a, b) => b.power.minus(a.power).toNumber())

  for (const row of accountRows) {
    const shortAddr = `${row.address.slice(0, 20)}...${row.address.slice(-8)}`
    console.log(
      `  ${shortAddr}  ${row.power.toFormat(2).padStart(20)} XRD  ${row.voteLabels}`
    )
  }

  console.log()
}

// --- CLI entry point ---

const [, , type, idStr] = process.argv

if (!type || !idStr) {
  console.error('Usage: pnpm tally <tc|proposal> <id>')
  console.error()
  console.error('Environment:')
  console.error('  NETWORK_ID=1|2              Required — 1 (mainnet) or 2 (stokenet)')
  console.error('  COMPONENT_ADDRESS=<addr>    Optional — override governance component address')
  process.exit(1)
}

const id = Number.parseInt(idStr, 10)
if (Number.isNaN(id)) {
  console.error(`Invalid id: ${idStr}`)
  process.exit(1)
}

const program =
  type === 'tc'
    ? tallyTemperatureCheck(id)
    : type === 'proposal'
      ? tallyProposal(id)
      : Effect.die(`Unknown type: ${type}. Use "tc" or "proposal".`)

runtime.runPromise(program).then(
  () => process.exit(0),
  (error) => {
    console.error('Tally failed:', error)
    process.exit(1)
  }
)
