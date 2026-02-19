# Hono Web Framework — Deep Analysis

Comprehensive reference for the Hono v4 web framework — a Web Standards-based, ultrafast, multi-runtime HTTP framework with type-safe routing, RPC client generation, and middleware composition.

---

## Table of Contents

- [Overview](#overview)
- [Source Map](#source-map)
- [Core: Hono Class](#core-hono-class)
- [Context Object](#context-object)
- [Routing](#routing)
- [Middleware](#middleware)
- [Type System](#type-system)
- [Built-in Middleware Catalog](#built-in-middleware-catalog)
- [Helpers](#helpers)
- [Validator](#validator)
- [RPC Client (hc)](#rpc-client-hc)
- [Error Handling](#error-handling)
- [Adapters](#adapters)
- [Router Algorithms](#router-algorithms)
- [JSX](#jsx)
- [Key Patterns](#key-patterns)

---

## Overview

Hono is a Web Standards-based HTTP framework that runs on any JavaScript runtime. Key characteristics:

- **Multi-runtime** — Cloudflare Workers, AWS Lambda, Deno, Bun, Node.js, Vercel, Netlify
- **Web Standards** — Built on `Request`/`Response` (Fetch API), no Node.js-specific APIs in core
- **Ultrafast routing** — SmartRouter auto-selects between RegExpRouter and TrieRouter
- **Type-safe** — Full type inference from route definitions through to RPC client (`hc`)
- **Koa-style middleware** — Onion model via `compose()` with `next()` chaining
- **Zero dependencies** — Core has no external dependencies

The `Hono` class extends `HonoBase` which implements `fetch(request, env, executionCtx)` — the universal handler signature across all runtimes.

---

## Source Map

| Area | Path | Purpose |
|---|---|---|
| **Main class** | `.repos/hono/src/hono.ts` | `Hono` class (router defaults) |
| **Base class** | `.repos/hono/src/hono-base.ts` | `HonoBase` — routing, dispatch, method handlers (~90KB) |
| **Context** | `.repos/hono/src/context.ts` | `Context` class — request/response wrapper (770 lines) |
| **Compose** | `.repos/hono/src/compose.ts` | Middleware composition (onion model) |
| **Router interface** | `.repos/hono/src/router.ts` | `Router<T>` interface, `Result` type |
| **HTTPException** | `.repos/hono/src/http-exception.ts` | Error class with status + response |
| **Request** | `.repos/hono/src/request.ts` | `HonoRequest` — param/body/header parsing |
| **Types** | `.repos/hono/src/types.ts` | `Env`, `Input`, `Schema`, `Handler`, `MiddlewareHandler` |
| **Validator** | `.repos/hono/src/validator/validator.ts` | `validator()` middleware factory |
| **RPC Client** | `.repos/hono/src/client/client.ts` | `hc()` proxy-based typed client |
| **Client types** | `.repos/hono/src/client/types.ts` | `ClientRequest`, `ClientArgs` |
| **SmartRouter** | `.repos/hono/src/router/smart-router/router.ts` | Meta-router (tries routers in order) |
| **RegExpRouter** | `.repos/hono/src/router/reg-exp-router/` | Trie to RegExp compilation |
| **TrieRouter** | `.repos/hono/src/router/trie-router/` | Radix tree matching |
| **LinearRouter** | `.repos/hono/src/router/linear-router/` | Sequential scan matching |
| **PatternRouter** | `.repos/hono/src/router/pattern-router/` | String pattern matching |
| **Middleware** | `.repos/hono/src/middleware/` | 23 built-in middleware |
| **Helpers** | `.repos/hono/src/helper/` | 13 helper utilities |
| **Adapters** | `.repos/hono/src/adapter/` | Runtime-specific adapters |
| **JSX** | `.repos/hono/src/jsx/` | JSX engine, hooks, streaming |
| **URL utils** | `.repos/hono/src/utils/url.ts` | `getPath`, `mergePath`, `checkOptionalParameter` |
| **HTTP status** | `.repos/hono/src/utils/http-status.ts` | Status code types |
| **Body utils** | `.repos/hono/src/utils/body.ts` | Request body parsing utilities |
| **Cookie utils** | `.repos/hono/src/utils/cookie.ts` | Cookie parse/serialize |
| **Constants** | `.repos/hono/src/utils/constants.ts` | `COMPOSED_HANDLER` symbol |

---

## Core: Hono Class

**Source:** `.repos/hono/src/hono.ts`, `.repos/hono/src/hono-base.ts`

### Class Definition

```typescript
class Hono<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/',
  CurrentPath extends string = BasePath,
> {
  router: Router<[H, RouterRoute]>
  readonly getPath: GetPath<E>
  routes: RouterRoute[] = []
}
```

### Generic Type Parameters

| Parameter | Purpose | Default |
|---|---|---|
| `E` | Environment (bindings + variables) | `Env` (empty) |
| `S` | Accumulated route schema (for RPC inference) | `{}` |
| `BasePath` | Absolute base path prefix | `'/'` |
| `CurrentPath` | Current routing context path | `BasePath` |

### Constructor

```typescript
constructor(options: HonoOptions<E> = {})
```

**HonoOptions:**

| Option | Type | Default | Purpose |
|---|---|---|---|
| `strict` | `boolean` | `true` | Distinguish `/path` from `/path/` |
| `router` | `Router<[H, RouterRoute]>` | SmartRouter | Custom router instance |
| `getPath` | `GetPath<E>` | URL parse | Custom path extraction (e.g. host-header routing) |

### Default Router Selection

```typescript
// In Hono class (not HonoBase):
this.router = options.router ?? new SmartRouter({
  routers: [new RegExpRouter(), new TrieRouter()]
})
```

SmartRouter tries RegExpRouter first. If it throws `UnsupportedPathError` (e.g. for patterns RegExpRouter can't compile), falls back to TrieRouter. Compilation is deferred until the first request (lazy).

### Request Processing Flow

```
1. fetch(request, env, executionCtx)
2. getPath(request, {env})           -> extract URL path
3. router.match(method, path)        -> find matching handlers
4. new Context(request, {path, matchResult, env, executionCtx})
5. compose(matchResult, onError, onNotFound)
6. Execute handler chain with next() chaining
7. Return context.res
```

Single-handler routes bypass `compose()` for performance.

---

## Context Object

**Source:** `.repos/hono/src/context.ts`

### Class Definition

```typescript
class Context<
  E extends Env = any,
  P extends string = any,
  I extends Input = {},
> {
  env: E['Bindings']
  finalized: boolean
  error: Error | undefined
}
```

### Request & Response Access

```typescript
get req(): HonoRequest<P, I['out']>   // Parsed request (params, body, headers)
get res(): Response                     // Current response
set res(value: Response)                // Replace response (finalizes context)
```

### Context Variables (type-safe per-request state)

```typescript
set<Key>(key: Key, value: E['Variables'][Key]): void
get<Key>(key: Key): E['Variables'][Key] | undefined
get var(): Readonly<E['Variables']>     // Read-only snapshot
```

### Response Helpers

| Method | Content-Type | Signature |
|---|---|---|
| `c.json()` | `application/json` | `json<T>(object: T, status?: ContentfulStatusCode, headers?: HeaderRecord): Response` |
| `c.text()` | `text/plain; charset=UTF-8` | `text(text: string, status?: ContentfulStatusCode, headers?: HeaderRecord): Response` |
| `c.html()` | `text/html; charset=UTF-8` | `html(html: string \| Promise<string>, status?, headers?): Response \| Promise<Response>` |
| `c.body()` | (custom) | `body(data: Data \| null, status?: StatusCode, headers?: HeaderRecord): Response` |
| `c.redirect()` | — | `redirect<T extends RedirectStatusCode = 302>(location: string \| URL, status?: T): Response` |
| `c.notFound()` | — | `notFound(): Response` |
| `c.newResponse()` | (custom) | `newResponse(data: Data \| null, status?: StatusCode, headers?: HeaderRecord): Response` |

### Header & Status

```typescript
header(name: string, value?: string, options?: { append?: boolean }): void
status(code: StatusCode): void
```

### Rendering & Layout

```typescript
render(...args: Parameters<Renderer>): Response | Promise<Response>
setRenderer(renderer: Renderer): void
setLayout(layout: Layout): Layout
getLayout(): Layout | undefined
```

### Execution Context

```typescript
get event(): FetchEventLike          // Throws if no FetchEvent
get executionCtx(): ExecutionContext  // Throws if no ExecutionContext
```

---

## Routing

**Source:** `.repos/hono/src/hono-base.ts`

### HTTP Method Handlers

```typescript
app.get(path?, ...handlers): Hono
app.post(path?, ...handlers): Hono
app.put(path?, ...handlers): Hono
app.delete(path?, ...handlers): Hono
app.patch(path?, ...handlers): Hono
app.options(path?, ...handlers): Hono
app.all(path?, ...handlers): Hono       // All methods
app.on(method: string | string[], path: string | string[], ...handlers): Hono
```

### Path Features

| Feature | Syntax | Example |
|---|---|---|
| Static | `/api/users` | Exact match |
| Params | `/user/:id` | `c.req.param('id')` |
| Multi-params | `/user/:id/:action` | `c.req.param('id')`, `c.req.param('action')` |
| Wildcards | `/api/*` | Matches `/api/x/y/z` |
| Catch-all middleware | `*` | Matches all paths |
| Strict mode | `/path` vs `/path/` | Distinguished when `strict: true` |

### Sub-apps & Composition

```typescript
// Mount sub-app (merges schemas for RPC)
app.route<SubPath, SubSchema, SubBasePath>(
  path: SubPath,
  app: Hono<SubEnv, SubSchema, SubBasePath>
): Hono

// Prefix all routes
app.basePath<SubPath>(path: SubPath): Hono<E, S, MergePath<BasePath, SubPath>>

// Mount external handler (e.g. another framework)
app.mount(path: string, handler: RequestHandler, options?: MountOptions): Hono
```

### Middleware Registration

```typescript
app.use(path?: string, ...handlers: MiddlewareHandler[]): Hono
app.use(...handlers: MiddlewareHandler[]): Hono  // All paths
```

### Error & Not-Found Handlers

```typescript
app.onError(handler: ErrorHandler<E>): Hono
app.notFound(handler: NotFoundHandler<E>): Hono
```

### Fetch Entry Points

```typescript
// Standard Web API entry
app.fetch(request: Request, Env?: E['Bindings'], executionCtx?: ExecutionContext):
  Response | Promise<Response>

// Testing helper (constructs Request internally)
app.request(input: RequestInfo | URL, requestInit?: RequestInit, Env?: E['Bindings']):
  Response | Promise<Response>
```

---

## Middleware

**Source:** `.repos/hono/src/compose.ts`

### Compose Function

```typescript
const compose = <E extends Env = Env>(
  middleware: [[Function, unknown], unknown][] | [[Function]][],
  onError?: ErrorHandler<E>,
  onNotFound?: NotFoundHandler<E>
): (context: Context, next?: Next) => Promise<Context>
```

### Onion Model

Middleware runs in registration order. Each calls `next()` to pass control to the next handler. After the inner handler completes, execution resumes after `next()` — allowing response modification on the way back out.

```
Request  -> [Middleware A before] -> [Middleware B before] -> [Handler]
                                                                |
Response <- [Middleware A after]  <- [Middleware B after]  <- [Response]
```

### MiddlewareHandler Type

```typescript
type MiddlewareHandler<
  E extends Env = any,
  P extends string = string,
  I extends Input = {},
  R extends HandlerResponse<any> = Response,
> = (c: Context<E, P, I>, next: Next) => Promise<R | void>
```

### Next Function

```typescript
type Next = () => Promise<void>
```

Calling `next()` multiple times throws `"next() called multiple times"`.

### Usage Pattern

```typescript
app.use(async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  c.header('X-Response-Time', `${ms}ms`)
})
```

---

## Type System

**Source:** `.repos/hono/src/types.ts`, `.repos/hono/src/utils/types.ts`

### Environment Type

```typescript
type Env = {
  Bindings?: object    // Platform bindings (CF KV, D1, R2, Lambda event, etc.)
  Variables?: object   // Request-scoped context vars (set via c.set/c.get)
}

type BlankEnv = {}
```

### Input Type

```typescript
type Input = {
  in?: {}              // Input shape (from validator targets)
  out?: {}             // Output shape (validated data)
  outputFormat?: ResponseFormat
}
```

### Schema Inference

```typescript
type Schema = {
  [path: string]: {
    [method: string]: {
      input: Input
      output?: unknown
    }
  }
}
```

The `S` generic accumulates route definitions as handlers are added. This enables `hc()` to infer the full API shape at compile time.

### Handler Types

```typescript
type Handler<E extends Env, P extends string, I extends Input, R extends HandlerResponse> =
  (c: Context<E, P, I>, next: Next) => R

type MiddlewareHandler<E, P, I, R> =
  (c: Context<E, P, I>, next: Next) => Promise<R | void>

type H = Handler | MiddlewareHandler

type HandlerResponse<O> =
  | Response
  | TypedResponse<O>
  | Promise<Response | TypedResponse<O>>
  | Promise<void>
```

### TypedResponse (phantom type for inference)

```typescript
interface TypedResponse<
  T = unknown,
  S extends StatusCode = StatusCode,
  F extends string = string,
> {
  readonly __type?: {
    readonly __returns?: T
    readonly __status?: S
    readonly __format?: F
  }
}
```

`c.json()` returns `TypedResponse<T>`, carrying the return type for RPC client inference. The `__type` field is phantom — never set at runtime.

### Key Type Utilities

```typescript
// Intersection of non-any types in a tuple
type IntersectNonAnyTypes<T extends unknown[]>

// Merge path strings: MergePath<'/api', '/users'> = '/api/users'
type MergePath<B extends string, S extends string>

// Merge schema entries with path prefix
type MergeSchemaPath<S extends Schema, P extends string>

// Remove empty properties
type RemoveBlankRecord<T>

// Convert union to intersection
type UnionToIntersection<U>
```

### Path Merging Implementation

```typescript
type MergePath<B extends string, S extends string> =
  B extends '/'
    ? S
    : S extends ''
      ? B
      : `${B}${S extends `/${infer T}` ? `/${T}` : `/${S}`}`
```

---

## Built-in Middleware Catalog

**Location:** `.repos/hono/src/middleware/`

| Middleware | Import | Purpose |
|---|---|---|
| **cors** | `hono/cors` | CORS headers, origin validation, preflight handling |
| **basic-auth** | `hono/basic-auth` | HTTP Basic Authentication |
| **bearer-auth** | `hono/bearer-auth` | Bearer token authentication |
| **jwt** | `hono/jwt` | JWT validation & verification |
| **jwk** | `hono/jwk` | JSON Web Key handling |
| **csrf** | `hono/csrf` | CSRF token validation |
| **secure-headers** | `hono/secure-headers` | Security headers (CSP, X-Frame-Options, HSTS, etc.) |
| **ip-restriction** | `hono/ip-restriction` | IP allowlist/blocklist |
| **compress** | `hono/compress` | gzip/deflate/brotli response compression |
| **cache** | `hono/cache` | HTTP caching headers |
| **etag** | `hono/etag` | ETag generation & conditional request handling |
| **logger** | `hono/logger` | Request/response logging |
| **timing** | `hono/timing` | Server-Timing header |
| **timeout** | `hono/timeout` | Request timeout enforcement |
| **body-limit** | `hono/body-limit` | Max request body size enforcement |
| **method-override** | `hono/method-override` | X-HTTP-Method-Override support |
| **powered-by** | `hono/powered-by` | X-Powered-By header |
| **pretty-json** | `hono/pretty-json` | Formatted JSON responses |
| **language** | `hono/language` | Accept-Language negotiation |
| **serve-static** | `hono/serve-static` | Static file serving |
| **context-storage** | `hono/context-storage` | AsyncLocalStorage-based context access |
| **jsx-renderer** | `hono/jsx-renderer` | JSX template rendering middleware |
| **combine** | `hono/combine` | Combine multiple middleware (every, some, except) |

---

## Helpers

**Location:** `.repos/hono/src/helper/`

| Helper | Import | Purpose |
|---|---|---|
| **cookie** | `hono/cookie` | `getCookie()`, `setCookie()`, `deleteCookie()` |
| **html** | `hono/html` | `html` tagged template literal for HTML escaping |
| **streaming** | `hono/streaming` | `stream()`, `streamText()` — chunked streaming responses |
| **sse** | `hono/streaming` | `streamSSE()` — Server-Sent Events helper |
| **websocket** | `hono/websocket` | `upgradeWebSocket()` — WebSocket protocol handling |
| **proxy** | `hono/proxy` | Reverse proxy helper |
| **factory** | `hono/factory` | `createFactory()`, `createMiddleware()`, `createHandlers()` |
| **testing** | `hono/testing` | `testClient()` — typed test client (wraps `app.request()`) |
| **accepts** | `hono/accepts` | Content-type negotiation (Accept header parsing) |
| **conninfo** | `hono/conninfo` | Connection info (remote IP, protocol) |
| **ssg** | `hono/ssg` | Static site generation utilities |
| **adapter** | `hono/adapter` | `env()` — runtime-agnostic environment access |
| **css** | `hono/css` | CSS-in-JS utilities |
| **dev** | `hono/dev` | Development utilities (route inspector) |

### Factory Helper (commonly used)

```typescript
import { createFactory, createMiddleware } from 'hono/factory'

// Create typed app factory with shared env
const factory = createFactory<{ Variables: { user: User } }>()

// Create typed middleware
const authMiddleware = createMiddleware<{
  Variables: { user: User }
}>(async (c, next) => {
  c.set('user', await getUser(c))
  await next()
})

// Create handler array (for route composition)
const handlers = factory.createHandlers(
  authMiddleware,
  (c) => c.json(c.var.user)
)
```

### Test Client Helper

```typescript
import { testClient } from 'hono/testing'

const app = new Hono()
  .get('/users/:id', (c) => c.json({ id: c.req.param('id') }))

const client = testClient(app)
const res = await client.users[':id'].$get({ param: { id: '123' } })
```

---

## Validator

**Source:** `.repos/hono/src/validator/validator.ts`

### Function Signature

```typescript
const validator = <
  InputType,
  P extends string,
  M extends string,
  U extends ValidationTargetByMethod<M>,
  VF extends ValidationFunction,
>(
  target: U,
  validationFunc: VF
): MiddlewareHandler
```

### Validation Targets

| Target | Content | Source |
|---|---|---|
| `json` | `application/json` body | `c.req.json()` |
| `form` | `multipart/form-data` or `application/x-www-form-urlencoded` | `c.req.formData()` / `c.req.parseBody()` |
| `query` | URL search params | `c.req.query()` |
| `param` | Route params (`:id`) | `c.req.param()` |
| `header` | HTTP headers | `c.req.header()` |
| `cookie` | Cookies | `getCookie(c)` |

### Validation Function

```typescript
type ValidationFunction<InputType, OutputType, E, P> =
  (value: InputType, c: Context<E, P>) =>
    OutputType | TypedResponse | Promise<OutputType | TypedResponse>
```

Return the validated data to pass it downstream. Return a `Response` (e.g. `c.json({error}, 400)`) to short-circuit.

### Accessing Validated Data

```typescript
app.post('/api',
  validator('json', (value, c) => {
    if (!value.name) return c.json({ error: 'name required' }, 400)
    return { name: value.name as string }
  }),
  (c) => {
    const data = c.req.valid('json')  // { name: string } -- type-safe
    return c.json({ ok: true, name: data.name })
  }
)
```

---

## RPC Client (hc)

**Source:** `.repos/hono/src/client/client.ts`, `.repos/hono/src/client/types.ts`

### Function Signature

```typescript
const hc = <T extends Hono, Prefix extends string>(
  baseUrl: Prefix,
  options?: ClientRequestOptions
) => Proxy<ClientType<T>>
```

### Proxy-Based API

`hc()` returns a `Proxy` that mirrors the app's route structure. Path segments become property accesses; path params become bracket notation with `:` prefix.

```typescript
const app = new Hono()
  .get('/api/users/:id', (c) => c.json({ id: c.req.param('id') }))
  .post('/api/users', (c) => c.json({ created: true }))

type AppType = typeof app

// Client usage (different process/machine)
const client = hc<AppType>('http://localhost:3000')

const res = await client.api.users[':id'].$get({ param: { id: '123' } })
const data = await res.json()  // { id: string } -- type inferred from server

await client.api.users.$post({ json: { name: 'Alice' } })
```

### ClientRequest Type

```typescript
type ClientRequest = {
  $get(args?, options?): Promise<Response>
  $post(args?, options?): Promise<Response>
  $put(args?, options?): Promise<Response>
  $delete(args?, options?): Promise<Response>
  $patch(args?, options?): Promise<Response>
  $url(args?): URL        // Get URL without fetching
  $ws(args?): WebSocket   // Create WebSocket connection
}
```

### ClientArgs

```typescript
type ClientArgs = {
  param?: Record<string, string>
  query?: Record<string, string | string[]>
  json?: unknown
  form?: Record<string, unknown>
  header?: Record<string, string>
  cookie?: Record<string, string>
}
```

### ClientRequestOptions

```typescript
type ClientRequestOptions = {
  fetch?: (input: RequestInfo, init: RequestInit) => Promise<Response>
  headers?: Record<string, string> | (() => Promise<Record<string, string>>)
  init?: RequestInit
  buildSearchParams?: BuildSearchParamsFn
}
```

The `fetch` option enables custom fetch implementations (e.g. for testing with `app.request`).

---

## Error Handling

**Source:** `.repos/hono/src/http-exception.ts`

### HTTPException Class

```typescript
class HTTPException extends Error {
  readonly res?: Response
  readonly status: ContentfulStatusCode

  constructor(
    status: ContentfulStatusCode = 500,
    options?: {
      res?: Response
      message?: string
      cause?: unknown
    }
  )

  getResponse(): Response
}
```

### Throwing Errors

```typescript
// Simple error with message
throw new HTTPException(401, { message: 'Unauthorized' })

// Error with custom response (full control)
throw new HTTPException(500, {
  res: new Response('Custom error body', {
    status: 500,
    headers: { 'X-Error': 'true' },
  })
})
```

### Error Handler

```typescript
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  return c.json({ error: err.message }, 500)
})
```

### Error Flow Through Compose

```
1. Handler throws error
2. compose() catches it in try/catch
3. Calls onError(err, context)
4. onError returns Response
5. Response set on context
6. Context returned to caller
```

If `onError` itself throws, the error propagates to the runtime adapter.

---

## Adapters

**Location:** `.repos/hono/src/adapter/`

| Adapter | Import | Entry Function | Purpose |
|---|---|---|---|
| **AWS Lambda** | `hono/aws-lambda` | `handle(app)`, `streamHandle(app)` | API Gateway V1/V2, ALB; streaming via `streamHandle` |
| **Cloudflare Workers** | `hono/cloudflare-workers` | Direct `fetch` export | Workers environment bindings |
| **Cloudflare Pages** | `hono/cloudflare-pages` | `handleMiddleware(app)` | Pages Functions |
| **Lambda@Edge** | `hono/lambda-edge` | `handle(app)` | CloudFront Lambda@Edge |
| **Deno** | `hono/deno` | `Deno.serve(app.fetch)` | Deno runtime |
| **Bun** | `hono/bun` | `Bun.serve({ fetch: app.fetch })` | Bun runtime |
| **Vercel** | `hono/vercel` | `handle(app)` | Vercel Serverless Functions |
| **Netlify** | `hono/netlify` | `handle(app)` | Netlify Functions |
| **Service Worker** | `hono/service-worker` | `app.fire()` (deprecated) | Service Worker `fetch` event |

### AWS Lambda Adapter (most relevant to this project)

```typescript
import { Hono } from 'hono'
import { handle, streamHandle } from 'hono/aws-lambda'

const app = new Hono()
app.get('/', (c) => c.json({ message: 'Hello from Lambda' }))

// Standard handler (API Gateway V1/V2, ALB)
export const handler = handle(app)

// Streaming handler (Lambda response streaming)
export const handler = streamHandle(app)
```

`handle()` translates `APIGatewayProxyEvent` / `APIGatewayProxyEventV2` / `ALBEvent` into a standard `Request`, calls `app.fetch()`, and converts the `Response` back to the Lambda response format.

---

## Router Algorithms

**Location:** `.repos/hono/src/router/`

### SmartRouter (default meta-router)

**File:** `src/router/smart-router/router.ts`

Wraps multiple routers and tries them in order. Routes are registered to all sub-routers. On first `match()`, it tries each router — if one throws `UnsupportedPathError`, it moves to the next. The successful router is cached for all subsequent requests.

Default configuration: `[RegExpRouter, TrieRouter]`

### RegExpRouter (primary)

**File:** `src/router/reg-exp-router/`

Builds a Trie structure during route registration, then compiles it into a single RegExp per HTTP method. Matching is a single `regex.test()` call. Components:
- **Trie** — parameter association tree built during `add()`
- **Node** — trie nodes with pattern data
- **Matcher** — compiled RegExp + index map + param map
- **PreparedRouter** — lazy-compiled matcher storage

Best for: complex dynamic route patterns. Throws `UnsupportedPathError` for patterns it can't compile (e.g. certain wildcard combinations).

### TrieRouter (fallback)

**File:** `src/router/trie-router/`

Radix tree (prefix tree) matching. Each path segment becomes a node. Direct traversal without regex compilation. Very fast for static routes and simple parameterized routes.

### LinearRouter

**File:** `src/router/linear-router/`

Sequential O(n) scan through all registered routes. No compilation step. Suitable only for very small route counts or one-shot routing (e.g. testing).

### PatternRouter

**File:** `src/router/pattern-router/`

String pattern matching with interpolation. Legacy/compatibility router.

---

## JSX

**Location:** `.repos/hono/src/jsx/`

### Core Files

| File | Purpose |
|---|---|
| `src/jsx/base.ts` | Core `createElement`/`jsx` functions |
| `src/jsx/streaming.ts` | Streaming/async JSX rendering |
| `src/jsx/components.ts` | `Fragment`, `ErrorBoundary`, `Suspense` |
| `src/jsx/hooks/index.ts` | React-compatible hooks |
| `src/jsx/intrinsic-elements.ts` | HTML/SVG element type definitions |
| `src/jsx/dom/` | DOM-specific implementations (client-side) |

### FC Type

```typescript
type FC<Props = any> = (props: Props) => JSX.Element
```

### Built-in Components

`Fragment`, `memo`, `ErrorBoundary`, `Suspense`

### React-Compatible Hooks

`useState`, `useEffect`, `useRef`, `useCallback`, `useReducer`, `useId`, `useContext`, `createContext`, `useMemo`, `useLayoutEffect`, `useInsertionEffect`, `useTransition`, `useDeferredValue`, `startTransition`, `use`, `createRef`, `forwardRef`, `useImperativeHandle`, `useSyncExternalStore`

### Streaming JSX

```typescript
import { Suspense } from 'hono/jsx'

const Page = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <AsyncComponent />
  </Suspense>
)

// Render with streaming
app.get('/', (c) => c.html(<Page />))
```

---

## Key Patterns

### 1. Route Composition with `.route()`

```typescript
const users = new Hono()
  .get('/', (c) => c.json([]))
  .post('/', (c) => c.json({ created: true }))
  .get('/:id', (c) => c.json({ id: c.req.param('id') }))

const app = new Hono()
  .route('/api/users', users)    // Schema merged -- hc() sees /api/users/*
  .route('/api/posts', posts)
```

### 2. Typed App Factory

```typescript
import { createFactory } from 'hono/factory'

type AppEnv = {
  Bindings: { DATABASE_URL: string }
  Variables: { user: User; requestId: string }
}

const factory = createFactory<AppEnv>()

const app = factory.createApp()
const middleware = factory.createMiddleware(async (c, next) => {
  c.set('requestId', crypto.randomUUID())
  await next()
})
```

### 3. Middleware Composition

```typescript
import { every, some, except } from 'hono/combine'

// All must pass
app.use(every(authMiddleware, rateLimitMiddleware))

// Any can pass
app.use(some(jwtAuth, apiKeyAuth))

// Apply everywhere except...
app.use(except('/health', loggingMiddleware))
```

### 4. App as Fetch Handler (universal)

```typescript
// Cloudflare Workers
export default app

// Bun
Bun.serve({ fetch: app.fetch, port: 3000 })

// Deno
Deno.serve(app.fetch)

// AWS Lambda
export const handler = handle(app)

// Node.js (via @hono/node-server)
import { serve } from '@hono/node-server'
serve(app)
```

### 5. RPC-style API Development

```typescript
// Server: define routes with method chaining (preserves types)
const routes = app
  .get('/api/users', (c) => c.json(users))
  .post('/api/users', (c) => c.json({ id: newId }))

// Export type for client
export type AppType = typeof routes

// Client: fully typed API calls
const client = hc<AppType>('http://localhost:3000')
const res = await client.api.users.$get()
const users = await res.json()  // typed!
```

### 6. Validator Integration (e.g. with Zod)

```typescript
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

app.post('/api/users',
  zValidator('json', z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })),
  (c) => {
    const { name, email } = c.req.valid('json')  // typed!
    return c.json({ name, email })
  }
)
```

### 7. context-storage (access context outside handlers)

```typescript
import { contextStorage, getContext } from 'hono/context-storage'

app.use(contextStorage())

// In any function called during request handling:
function getRequestId() {
  return getContext().var.requestId
}
```
