import { AccountAddress } from '@radix-effects/shared'
import type { ProgrammaticScryptoSborValue } from '@radixdlt/babylon-gateway-api-sdk'
import { Effect, Option, ParseResult, Schema } from 'effect'
import s from 'sbor-ez-mode'
import { parseSbor } from '../helpers/parseSbor'
import { KeyValueStoreAddress } from '../schemas'
import { ProposalId, TemperatureCheckId } from './brandedTypes'

export const MakeTemperatureCheckInputSchema = Schema.Struct({
  title: Schema.String,
  shortDescription: Schema.String,
  description: Schema.String,
  voteOptions: Schema.Array(Schema.String),
  links: Schema.Array(Schema.String),
  maxSelections: Schema.Union(
    Schema.Literal(1),
    Schema.Number.pipe(Schema.greaterThan(1))
  ),
  authorAccount: AccountAddress
})

export type MakeTemperatureCheckInput =
  typeof MakeTemperatureCheckInputSchema.Encoded

export const TemperatureCheckSchema = Schema.asSchema(
  Schema.transform(
    Schema.Struct({
      id: Schema.Number,
      title: Schema.String,
      short_description: Schema.String,
      description: Schema.String,
      voters: Schema.String,
      votes: Schema.String,
      vote_count: Schema.Number,
      vote_options: Schema.Array(
        Schema.Struct({
          id: Schema.Tuple(Schema.Number),
          label: Schema.String
        })
      ),
      links: Schema.Array(Schema.String),
      quorum: Schema.String,
      start: Schema.Number,
      deadline: Schema.Number,
      elevated_proposal_id: Schema.Struct({
        variant: Schema.String,
        value: Schema.Unknown
      }),
      author: Schema.String
    }),
    Schema.Struct({
      id: Schema.Number,
      title: Schema.String,
      shortDescription: Schema.String,
      description: Schema.String,
      voters: KeyValueStoreAddress,
      votes: KeyValueStoreAddress,
      voteCount: Schema.Number,
      voteOptions: Schema.Array(
        Schema.Struct({
          id: Schema.Number,
          label: Schema.String
        })
      ),
      links: Schema.Array(Schema.String),
      quorum: Schema.String,
      start: Schema.DateFromSelf,
      deadline: Schema.DateFromSelf,
      elevatedProposalId: Schema.OptionFromSelf(ProposalId),
      author: AccountAddress
    }),
    {
      decode: (fromA) => ({
        id: fromA.id,
        title: fromA.title,
        shortDescription: fromA.short_description,
        description: fromA.description,
        voters: KeyValueStoreAddress.make(fromA.voters),
        votes: KeyValueStoreAddress.make(fromA.votes),
        voteCount: fromA.vote_count,
        voteOptions: fromA.vote_options.map((option) => ({
          id: option.id[0],
          label: option.label
        })),
        links: fromA.links,
        quorum: fromA.quorum,
        start: new Date(fromA.start * 1000),
        deadline: new Date(fromA.deadline * 1000),
        elevatedProposalId:
          fromA.elevated_proposal_id.variant === 'Some'
            ? Option.some(
                (fromA.elevated_proposal_id.value as [number])[0] as ProposalId
              )
            : Option.none(),
        author: AccountAddress.make(fromA.author)
      }),
      encode: (values) => ({
        id: values.id,
        title: values.title,
        short_description: values.shortDescription,
        description: values.description,
        voters: values.voters,
        votes: values.votes,
        vote_count: values.voteCount,
        vote_options: values.voteOptions.map((option) => ({
          id: [option.id] as const,
          label: option.label
        })),
        links: values.links.map((url) => url.toString()),
        quorum: values.quorum,
        start: Math.floor(values.start.getTime() / 1000),
        deadline: Math.floor(values.deadline.getTime() / 1000),
        elevated_proposal_id: Option.match(values.elevatedProposalId, {
          onNone: () => ({ variant: 'None' as const, value: {} }),
          onSome: (id) => ({ variant: 'Some' as const, value: [id] })
        }),
        author: values.author
      }),
      strict: true
    }
  )
)

export type TemperatureCheck = typeof TemperatureCheckSchema.Type

export const ProposalSchema = Schema.asSchema(
  Schema.transform(
    Schema.Struct({
      id: Schema.Number,
      title: Schema.String,
      short_description: Schema.String,
      description: Schema.String,
      voters: Schema.String,
      votes: Schema.String,
      vote_count: Schema.Number,
      vote_options: Schema.Array(
        Schema.Struct({
          id: Schema.Tuple(Schema.Number),
          label: Schema.String
        })
      ),
      links: Schema.Array(Schema.String),
      quorum: Schema.String,
      max_selections: Schema.Union(
        Schema.Struct({
          variant: Schema.Literal('None'),
          value: Schema.Struct({})
        }),
        Schema.Struct({
          variant: Schema.Literal('Some'),
          value: Schema.Tuple(Schema.Number)
        })
      ),
      start: Schema.Number,
      deadline: Schema.Number,
      temperature_check_id: Schema.Number,
      author: Schema.String
    }),
    Schema.Struct({
      id: Schema.Number,
      title: Schema.String,
      shortDescription: Schema.String,
      description: Schema.String,
      voters: KeyValueStoreAddress,
      votes: KeyValueStoreAddress,
      voteCount: Schema.Number,
      voteOptions: Schema.Array(
        Schema.Struct({
          id: Schema.Number,
          label: Schema.String
        })
      ),
      links: Schema.Array(Schema.String),
      quorum: Schema.String,
      maxSelections: Schema.Number,
      start: Schema.DateFromSelf,
      deadline: Schema.DateFromSelf,
      temperatureCheckId: TemperatureCheckId,
      author: AccountAddress
    }),
    {
      decode: (fromA) => ({
        id: fromA.id,
        title: fromA.title,
        shortDescription: fromA.short_description,
        description: fromA.description,
        voters: KeyValueStoreAddress.make(fromA.voters),
        votes: KeyValueStoreAddress.make(fromA.votes),
        voteCount: fromA.vote_count,
        voteOptions: fromA.vote_options.map((option) => ({
          id: option.id[0],
          label: option.label
        })),
        links: fromA.links,
        quorum: fromA.quorum,
        maxSelections:
          fromA.max_selections.variant === 'Some'
            ? fromA.max_selections.value[0]
            : 1,
        start: new Date(fromA.start * 1000),
        deadline: new Date(fromA.deadline * 1000),
        temperatureCheckId: fromA.temperature_check_id as TemperatureCheckId,
        author: AccountAddress.make(fromA.author)
      }),
      encode: (values) => ({
        id: values.id,
        title: values.title,
        short_description: values.shortDescription,
        description: values.description,
        voters: values.voters,
        votes: values.votes,
        vote_count: values.voteCount,
        vote_options: values.voteOptions.map((option) => ({
          id: [option.id] as const,
          label: option.label
        })),
        links: values.links,
        quorum: values.quorum,
        max_selections:
          values.maxSelections === 1
            ? { variant: 'None' as const, value: {} }
            : {
                variant: 'Some' as const,
                value: [values.maxSelections] as const
              },
        start: Math.floor(values.start.getTime() / 1000),
        deadline: Math.floor(values.deadline.getTime() / 1000),
        temperature_check_id: values.temperatureCheckId,
        author: values.author
      }),
      strict: true
    }
  )
)

export type Proposal = typeof ProposalSchema.Type

export const TemperatureCheckVoteSchema = Schema.transform(
  Schema.Struct({
    id: Schema.Number,
    voter: Schema.String,
    vote: Schema.Struct({
      variant: Schema.String,
      value: Schema.Tuple()
    })
  }),
  Schema.Struct({
    id: Schema.Number,
    voter: AccountAddress,
    vote: Schema.Literal('For', 'Against')
  }),
  {
    strict: true,
    decode: (fromA) => ({
      id: fromA.id,
      voter: AccountAddress.make(fromA.voter),
      vote: fromA.vote.variant as 'For' | 'Against'
    }),
    encode: (values) => ({
      id: values.id,
      voter: values.voter,
      vote: { variant: values.vote, value: [] as const }
    })
  }
)

export const MakeTemperatureCheckVoteInputSchema = Schema.Struct({
  accountAddress: AccountAddress,
  temperatureCheckId: TemperatureCheckId,
  vote: Schema.Literal('For', 'Against')
})

export type MakeTemperatureCheckVoteInput =
  typeof MakeTemperatureCheckVoteInputSchema.Encoded

export const MakeProposalVoteInputSchema = Schema.Struct({
  accountAddress: AccountAddress,
  proposalId: ProposalId,
  optionIds: Schema.Array(Schema.Number)
})

export type MakeProposalVoteInput = typeof MakeProposalVoteInputSchema.Encoded

const ProgrammaticScryptoSborValueSchema = Schema.declare(
  (input): input is ProgrammaticScryptoSborValue =>
    typeof input === 'object' && input !== null && 'kind' in input,
  {
    identifier: 'ProgrammaticScryptoSborValue'
  }
)

export const TemperatureCheckVoteValueSchema = Schema.asSchema(
  Schema.transformOrFail(
    ProgrammaticScryptoSborValueSchema,
    Schema.Literal('For', 'Against'),
    {
      strict: true,
      decode: (value, _, ast) =>
        parseSbor(
          value,
          s.tuple([
            s.number(),
            s.enum([
              { variant: 'For', schema: s.structNullable({}) },
              { variant: 'Against', schema: s.structNullable({}) }
            ])
          ])
        ).pipe(
          Effect.map((result) => result[1].variant),
          Effect.catchAll(() =>
            ParseResult.fail(
              new ParseResult.Type(ast, value, `Invalid vote value: ${value}`)
            )
          )
        ),
      encode: (_, __, ast) =>
        ParseResult.fail(new ParseResult.Type(ast, _, 'Encoding not supported'))
    }
  )
)

export const TemperatureCheckVoteRecord = Schema.asSchema(
  Schema.transformOrFail(
    ProgrammaticScryptoSborValueSchema,
    Schema.Struct({
      accountAddress: AccountAddress,
      vote: Schema.Literal('For', 'Against')
    }),
    {
      strict: true,
      decode: (value, _, ast) =>
        parseSbor(
          value,
          s.tuple([
            s.address(),
            s.enum([
              { variant: 'For', schema: s.structNullable({}) },
              { variant: 'Against', schema: s.structNullable({}) }
            ])
          ])
        ).pipe(
          Effect.map(([address, vote]) => ({
            accountAddress: AccountAddress.make(address),
            vote: vote.variant as 'For' | 'Against'
          })),
          Effect.catchAll(() =>
            ParseResult.fail(
              new ParseResult.Type(ast, value, `Invalid vote value: ${value}`)
            )
          )
        ),
      encode: (_, __, ast) =>
        ParseResult.fail(new ParseResult.Type(ast, _, 'Encoding not supported'))
    }
  )
)

export const ProposalVoteValueSchema = Schema.asSchema(
  Schema.transformOrFail(
    ProgrammaticScryptoSborValueSchema,
    Schema.Array(Schema.Number),
    {
      strict: true,
      decode: (value, _, ast) =>
        parseSbor(
          value,
          s.tuple([s.number(), s.array(s.tuple([s.number()]))])
        ).pipe(
          Effect.map((result) => result[1].map((option) => option[0])),
          Effect.catchAll(() =>
            ParseResult.fail(
              new ParseResult.Type(
                ast,
                value,
                `Invalid proposal vote value: ${value}`
              )
            )
          )
        ),
      encode: (_, __, ast) =>
        ParseResult.fail(new ParseResult.Type(ast, _, 'Encoding not supported'))
    }
  )
)
