import { Result, useAtomValue } from '@effect-atom/atom-react'
import type { WalletDataStateAccount } from '@radixdlt/radix-dapp-toolkit'
import { Option } from 'effect'
import { useSyncExternalStore } from 'react'
import { accountsAtom } from '@/atom/dappToolkitAtom'
import {
  getSelectedAccountSnapshot,
  subscribeSelectedAccount
} from '@/lib/selectedAccount'

/**
 * Reactively tracks the currently selected account.
 * Re-renders when the user switches accounts in the AccountSelector,
 * or when wallet connection changes.
 */
export function useCurrentAccount(): WalletDataStateAccount | undefined {
  const accountsResult = useAtomValue(accountsAtom)
  const selectedOption = useSyncExternalStore(
    subscribeSelectedAccount,
    getSelectedAccountSnapshot
  )

  return Result.builder(accountsResult)
    .onSuccess((accounts) => {
      if (accounts.length === 0) return undefined

      if (Option.isSome(selectedOption)) {
        const found = accounts.find((a) => a.address === selectedOption.value)
        if (found) return found
      }

      return accounts[0]
    })
    .onInitial(() => undefined)
    .onFailure(() => undefined)
    .render()
}
