import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '.repos/**'],
    env: { NETWORK_ID: '2' }
  }
})
