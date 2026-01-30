import { AccountAddress } from '@radix-effects/shared'
import { Schema } from 'effect'
import { KeyValueStoreAddress } from '../schemas'

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
      votes: Schema.String,
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
      votes: KeyValueStoreAddress,
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
        votes: KeyValueStoreAddress.make(fromA.votes),
        voteOptions: fromA.vote_options.map((option) => ({
          id: option.id[0],
          label: option.label
        })),
        links: fromA.links.map((link) => new URL(link)),
        author: AccountAddress.make(fromA.author)
      }),
      encode: (values) => ({
        id: values.id,
        title: values.title,
        short_description: values.shortDescription,
        description: values.description,
        votes: values.votes,
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
    id: Schema.String,
    variant: Schema.String,
    value: Schema.Struct({})
  }),
  Schema.Struct({
    accountAddress: AccountAddress,
    vote: Schema.Literal('For', 'Against')
  }),
  {
    strict: true,
    decode: (fromA) => ({
      accountAddress: AccountAddress.make(fromA.id),
      vote: fromA.variant === 'For' ? ('For' as const) : ('Against' as const)
    }),
    encode: (values) => ({
      id: values.accountAddress,
      variant: values.vote,
      value: {}
    })
  }
)
