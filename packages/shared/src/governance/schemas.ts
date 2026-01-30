import { AccountAddress } from '@radix-effects/shared'
import { Schema } from 'effect'
import { KeyValueStoreAddress } from '../schemas'
import { TemperatureCheckId } from './brandedTypes'

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
      links: Schema.Array(Schema.URL),
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
        author: values.author
      }),
      strict: true
    }
  )
)

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
    vote: Schema.Literal('For', 'Against', 'Abstain')
  }),
  {
    strict: true,
    decode: (fromA) => ({
      id: fromA.id,
      voter: AccountAddress.make(fromA.voter),
      vote: fromA.vote.variant as 'For' | 'Against' | 'Abstain'
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
