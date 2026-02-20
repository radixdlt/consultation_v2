# Consultation dApp

## Features

- Browse and filter temperature checks and proposals
- Vote on active consultations via Radix Wallet
- Create new temperature checks
- Promote temperature checks to proposals (admin)
- Admin panel for governance parameters
- Vote results and account vote tracking

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | React 19, Vite |
| Routing | TanStack Router + [TanStack Start](https://tanstack.com/start) |
| State | [Effect Atom](https://github.com/effect-ts/atom) (reactive atoms with Effect runtime) |
| Styling | Tailwind CSS v4, Radix UI, shadcn/ui, CVA |
| Radix | Radix dApp Toolkit (wallet connection, transaction signing), Gateway API client |
| Forms | TanStack Form |

## Environment variables

All variables use the `VITE_` prefix (Vite injects them at build time via `import.meta.env`).

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_ENV` | Environment (`dev`, `staging`, `prod`, `local`) | `prod` |
| `VITE_PUBLIC_DAPP_DEFINITION_ADDRESS` | Radix dApp definition account address | — (required) |
| `VITE_PUBLIC_NETWORK_ID` | Radix network ID (`1` = mainnet, `2` = stokenet) | — (required) |
| `VITE_VOTE_COLLECTOR_URL` | Vote collector API base URL | — (required) |

Create a `.env` file in `apps/consultation/`:

```sh
VITE_ENV=dev
VITE_PUBLIC_DAPP_DEFINITION_ADDRESS=account_rdx...
VITE_PUBLIC_NETWORK_ID=2
VITE_VOTE_COLLECTOR_URL=http://localhost:4000
```

## Scripts

| Script | Command | Description |
| --- | --- | --- |
| `dev` | `vite dev --port 3000` | Start dev server on port 3000 |
| `build` | `vite build` | Production build |
| `preview` | `vite preview` | Preview production build |
| `check-types` | `tsc --noEmit` | Type-check without emitting |
| `format` | `biome format` | Format with Biome |
| `lint` | `biome lint` | Lint with Biome |
| `check` | `biome check` | Biome format + lint |

## Project structure

```
src/
  routes/              TanStack Router file-based routes
    __root.tsx          Root layout (header, wallet connect, providers)
    index.tsx           Home — tabbed list of TCs and proposals
    tc/
      index.tsx         Temperature checks list
      $id/index.tsx     Temperature check detail + voting
      new/index.tsx     Create new temperature check (admin)
    proposal/
      $id/index.tsx     Proposal detail + voting
    about/
      index.tsx         About page
      admin/index.tsx   Admin panel
  atom/                 Effect Atom definitions (reactive state)
  components/           Shared UI components (shadcn/ui, detail views)
  hooks/                React hooks (useCurrentAccount, useIsAdmin)
  lib/                  Utilities (envVars, dappToolkit, voting helpers)
```

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Home — tabbed view of temperature checks and proposals |
| `/tc` | Temperature checks list |
| `/tc/:id` | Temperature check detail, vote results, voting |
| `/tc/new` | Create a new temperature check (admin only) |
| `/proposal/:id` | Proposal detail, vote results, voting |
| `/about` | About page |
| `/about/admin` | Admin panel — governance parameters |
