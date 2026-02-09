import { useAtomMount } from '@effect-atom/atom-react'
import { ClientOnly } from '@tanstack/react-router'
import type React from 'react'

import { dappToolkitAtom } from '@/atom/dappToolkitAtom'

const WalletContent: React.FC = () => {
  useAtomMount(dappToolkitAtom)
  return <radix-connect-button />
}

export default function ConnectButton() {
  return (
    <ClientOnly>
      <WalletContent />
    </ClientOnly>
  )
}
