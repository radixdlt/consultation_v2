import { AccountAddress } from '@radix-effects/shared'
import { Schema } from 'effect'
import { KeyValueStoreAddress } from '../schemas'

export const MakeTemperatureCheckInputSchema = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
  voteOptions: Schema.Array(
    Schema.Struct({
      id: Schema.Number,
      label: Schema.String
    })
  ),
  radixTalkUrl: Schema.URL.pipe(
    Schema.filter((url) => url.origin === 'https://radixtalk.com', {
      message: () => 'URL must start with https://radixtalk.com/'
    })
  ),
  maxSelections: Schema.Union(
    Schema.Literal(1),
    Schema.Number.pipe(Schema.greaterThan(1))
  )
})

export type MakeTemperatureCheckInput =
  typeof MakeTemperatureCheckInputSchema.Encoded

export const TemperatureCheckSchema = Schema.asSchema(
  Schema.transform(
    Schema.Struct({
      id: Schema.Number,
      title: Schema.String,
      description: Schema.String,
      votes: Schema.String,
      vote_options: Schema.Array(
        Schema.Struct({
          id: Schema.Tuple(Schema.Number),
          label: Schema.String
        })
      ),
      // attachments: Schema.Array(Schema.Struct({
      //   kvs_address: Schema.String,
      //   component_address: Schema.String,
      //   file_hash: Schema.String
      // })),
      rfc_url: Schema.String
      // quorum: Schema.Number,
      // maxSelections: Schema.Number,
      // approvalThreshold: Schema.Number,
    }),
    Schema.Struct({
      id: Schema.Number,
      title: Schema.String,
      description: Schema.String,
      votes: KeyValueStoreAddress,
      voteOptions: Schema.Array(
        Schema.Struct({
          id: Schema.Number,
          label: Schema.String
        })
      ),
      radixTalkUrl: Schema.URL
      // attachments: Schema.Array(Schema.Struct({
      //   kvs_address: Schema.String,
      //   component_address: Schema.String,
      //   file_hash: Schema.String
      // })),
      // quorum: Schema.Number,
      // maxSelections: Schema.Number,
      // approvalThreshold: Schema.Number,
    }),
    {
      decode: (fromA) => ({
        id: fromA.id,
        title: fromA.title,
        description: fromA.description,
        votes: KeyValueStoreAddress.make(fromA.votes),
        voteOptions: fromA.vote_options.map((option) => ({
          id: option.id[0],
          label: option.label
        })),
        radixTalkUrl: fromA.rfc_url
      }),
      encode: (values) => ({
        id: values.id,
        title: values.title,
        description: values.description,
        votes: values.votes,
        vote_options: values.voteOptions.map((option) => ({
          id: [option.id] as const,
          label: option.label
        })),
        rfc_url: values.radixTalkUrl
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
