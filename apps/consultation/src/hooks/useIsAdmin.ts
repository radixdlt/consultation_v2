import { Result, useAtomValue } from '@effect-atom/atom-react'
import { isAdminAtom } from '@/atom/adminAtom'
import { useCurrentAccount } from '@/hooks/useCurrentAccount'

/** Returns whether the currently connected account holds the admin badge */
export function useIsAdmin(): boolean {
  const currentAccount = useCurrentAccount()
  const isAdminResult = useAtomValue(
    isAdminAtom(currentAccount?.address ?? '')
  )

  if (!currentAccount) return false

  return Result.builder(isAdminResult)
    .onSuccess((v) => v)
    .onInitial(() => false)
    .onFailure(() => false)
    .render()
}
