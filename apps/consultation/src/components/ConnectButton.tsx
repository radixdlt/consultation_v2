import { useAtomMount } from '@effect-atom/atom-react'
import { ClientOnly } from '@tanstack/react-router'
import type React from 'react'

import { dappToolkitAtom } from '@/atom/dappToolkitAtom'

const WalletContent: React.FC = () => {
  useAtomMount(dappToolkitAtom)
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-md opacity-25 dark:bg-primary/10" />
      <radix-connect-button
        style={
          {
            '--radix-connect-button-width': '36px',
            '--radix-connect-button-border-radius': '6px'
          } as React.CSSProperties
        }
        className="relative"
      />
    </div>
  )
}

export default function ConnectButton() {
  return (
    <ClientOnly>
      <WalletContent />
    </ClientOnly>
  )
}
