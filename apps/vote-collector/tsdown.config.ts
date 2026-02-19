import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/http-server.ts',
  outDir: 'dist',
  format: 'esm',
  noExternal: [/^domain/, /^shared/, /^db/]
})
