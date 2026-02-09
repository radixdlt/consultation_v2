import { Result, useAtomValue } from '@effect-atom/atom-react'
import { ClientOnly } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { accountsAtom } from '@/atom/dappToolkitAtom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { setSelectedAccountAddress } from '@/lib/selectedAccount'

function truncateAddress(address: string): string {
  if (address.length <= 20) return address
  return `${address.slice(0, 12)}...${address.slice(-6)}`
}

function AccountSelectorContent() {
  const accountsResult = useAtomValue(accountsAtom)
  // Track selected address locally to keep Select controlled
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(
    undefined
  )

  const handleValueChange = useCallback((address: string) => {
    setSelectedAddress(address)
    setSelectedAccountAddress(address)
  }, [])

  return Result.builder(accountsResult)
    .onInitial(() => null)
    .onFailure(() => null)
    .onSuccess((accounts) => {
      if (!accounts || accounts.length === 0) {
        return null
      }

      // Don't show selector if only one account
      if (accounts.length === 1) {
        return null
      }

      // Use local state if set, otherwise default to first account
      const currentAddress = selectedAddress ?? accounts[0]?.address
      const currentAccount = accounts.find(
        (acc) => acc.address === currentAddress
      )

      return (
        <Select value={currentAddress} onValueChange={handleValueChange}>
          <SelectTrigger size="sm" className="w-[180px]">
            <SelectValue placeholder="Select account">
              {currentAccount?.label ||
                (currentAccount?.address
                  ? truncateAddress(currentAccount.address)
                  : 'Select account')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {accounts.map((account) => (
              <SelectItem key={account.address} value={account.address}>
                <div className="flex flex-col">
                  {account.label && (
                    <span className="font-medium">{account.label}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {truncateAddress(account.address)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    })
    .render()
}

export default function AccountSelector() {
  return (
    <ClientOnly>
      <AccountSelectorContent />
    </ClientOnly>
  )
}
