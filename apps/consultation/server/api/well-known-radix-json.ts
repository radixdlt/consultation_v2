import { defineEventHandler } from 'nitro/h3'

export default defineEventHandler(() => ({
  dApps: [
    {
      dAppDefinitionAddress:
        process.env.VITE_PUBLIC_DAPP_DEFINITION_ADDRESS ?? '',
    },
  ],
}))
