import { Context, Duration, Option, Ref } from 'effect'
import {
  TransactionDetailsOptInsSchema,
  type TransactionStreamConfigSchema
} from './schemas'

export class TransactionStreamConfig extends Context.Tag(
  'TransactionStreamConfig'
)<
  TransactionStreamConfig,
  Ref.Ref<typeof TransactionStreamConfigSchema.Type>
>() {
  static make = Ref.make<typeof TransactionStreamConfigSchema.Type>({
    stateVersion: Option.none(),
    limitPerPage: 100,
    waitTime: Duration.seconds(60),
    optIns: TransactionDetailsOptInsSchema.make()
  })
}
