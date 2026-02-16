# SST Function (Lambda) Component — Deep Analysis

Comprehensive reference for SST v3's `sst.aws.Function` component — the Pulumi-based Lambda abstraction that handles bundling, IAM, resource linking, dev mode, and multi-runtime support.

---

## Table of Contents

- [Overview](#overview)
- [Source Map](#source-map)
- [FunctionArgs Interface](#functionargs-interface)
- [Resources Created](#resources-created)
- [Bundling (esbuild)](#bundling-esbuild)
- [IAM & Permissions](#iam--permissions)
- [Resource Linking](#resource-linking)
- [Runtime SDK](#runtime-sdk)
- [Node.js Runtime](#nodejs-runtime)
- [Dev Mode Architecture](#dev-mode-architecture)
- [Lambda Subscribers](#lambda-subscribers)
- [Transform System](#transform-system)
- [Dev vs Production](#dev-vs-production)
- [Key Patterns](#key-patterns)

---

## Overview

`sst.aws.Function` is SST v3's core serverless component. It wraps AWS Lambda with:

- **Multi-runtime bundling** — Node.js (esbuild), Go, Python (uv), Rust, custom (`provided.al2023`)
- **Resource linking** — type-safe access to other SST components via encrypted env vars + SDK proxy
- **Dev mode** — deploys a stub "bridge" function that routes invocations to your local machine via AppSync WebSocket
- **Transform system** — escape hatch to customize underlying Pulumi resources
- **IAM automation** — auto-generated roles with linked resource permissions

The component extends Pulumi's `Component` and implements `Link.Linkable`, meaning it can both link *to* other resources and *be linked from* other functions.

```typescript
// Pulumi component type
const __pulumiType = "sst:aws:Function";
```

---

## Source Map

| Area | Path | Purpose |
|---|---|---|
| **Component** | `.repos/sst/platform/src/components/aws/function.ts` | Main Function class (2745 lines) |
| **Link system** | `.repos/sst/platform/src/components/link.ts` | `Link.Linkable` interface, `build()`, env var injection |
| **Linkable base** | `.repos/sst/platform/src/components/linkable.ts` | `Linkable.wrap()` for non-SST resources |
| **Permissions** | `.repos/sst/platform/src/components/aws/permission.ts` | `Permission` type, `permission()` helper |
| **Naming** | `.repos/sst/platform/src/components/naming.ts` | `physicalName()` for AWS resource names |
| **Node build** | `.repos/sst/pkg/runtime/node/build.go` | Go-native esbuild bundling for Node.js |
| **Node runtime** | `.repos/sst/pkg/runtime/node/node.go` | Node.js runtime matching & file resolution |
| **Go build** | `.repos/sst/pkg/runtime/golang/golang.go` | Go function compilation |
| **Python build** | `.repos/sst/pkg/runtime/python/python.go` | Python uv-based packaging |
| **Rust build** | `.repos/sst/pkg/runtime/rust/rust.go` | Rust Cargo compilation |
| **Worker build** | `.repos/sst/pkg/runtime/worker/worker.go` | Cloudflare Worker bundling |
| **Runtime interface** | `.repos/sst/pkg/runtime/runtime.go` | `BuildInput`/`BuildOutput` types |
| **JS SDK** | `.repos/sst/sdk/js/src/resource.ts` | `Resource` proxy, AES-256-GCM decryption |
| **Dev runtime** | `.repos/sst/platform/functions/nodejs-runtime/index.ts` | Lambda Runtime API emulation (worker) |
| **Dev loop** | `.repos/sst/platform/functions/nodejs-runtime/loop.ts` | Parent process managing worker threads |
| **Linkable wrap** | `.repos/sst/platform/src/components/linkable.ts` | `Linkable.wrap()` for non-SST resources |
| **Function builder** | `.repos/sst/platform/src/components/aws/helpers/function-builder.ts` | Subscriber helper for creating functions |
| **Bucket subscriber** | `.repos/sst/platform/src/components/aws/bucket-lambda-subscriber.ts` | S3 → Lambda (push) |
| **Queue subscriber** | `.repos/sst/platform/src/components/aws/queue-lambda-subscriber.ts` | SQS → Lambda (pull) |
| **Bus subscriber** | `.repos/sst/platform/src/components/aws/bus-lambda-subscriber.ts` | EventBridge → Lambda (push) |

---

## FunctionArgs Interface

**Source:** `.repos/sst/platform/src/components/aws/function.ts:212-1435`

### Core Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `handler` | `Input<string>` | **required** | Path to handler. Format varies by runtime: `{path}/{file}.{method}` (Node/Python), `{path}` (Go/Rust) |
| `runtime` | `Input<"nodejs18.x" \| "nodejs20.x" \| "nodejs22.x" \| "go" \| "rust" \| "provided.al2023" \| "python3.9" \| ... "python3.12">` | `"nodejs20.x"` | Lambda runtime |
| `timeout` | `Input<DurationMinutes>` | `"20 seconds"` | Max execution time (1s–900s) |
| `memory` | `Input<Size>` | `"1024 MB"` | Memory allocation (128–10240 MB) |
| `storage` | `Input<Size>` | `"512 MB"` | Ephemeral `/tmp` storage (512–10240 MB) |
| `architecture` | `Input<"x86_64" \| "arm64">` | `"x86_64"` | CPU architecture |
| `name` | `Input<string>` | auto-generated | Override Lambda function name |
| `description` | `Input<string>` | `""` | AWS Console description |

### Bundling Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `bundle` | `Input<string>` | — | Pre-built bundle directory (skips esbuild) |
| `nodejs` | `Input<{...}>` | — | Node.js esbuild configuration |
| `nodejs.install` | `Input<string[]>` | `[]` | Packages to exclude from bundle & `npm install` separately |
| `nodejs.format` | `Input<"esm" \| "cjs">` | `"esm"` | Output module format |
| `nodejs.minify` | `Input<boolean>` | `true` | Minify bundle in production |
| `nodejs.sourcemap` | `Input<boolean>` | `false` | Include sourcemaps in deployment package |
| `nodejs.splitting` | `Input<boolean>` | `false` | Enable code splitting for dynamic imports |
| `nodejs.banner` | `Input<string>` | — | String prepended to generated JS |
| `nodejs.loader` | `Input<Record<string, Loader>>` | — | Additional esbuild loaders (e.g. `{".png": "file"}`) |
| `nodejs.plugins` | `Input<string>` | — | Path to file exporting esbuild plugins |
| `nodejs.esbuild` | `Input<BuildOptions>` | — | Raw esbuild `BuildOptions` override |
| `python` | `Input<{container?: boolean}>` | — | Python config; `container: true` for Docker image deploy |
| `copyFiles` | `Input<{from, to?}[]>` | `[]` | Additional files to include in package |

### Permissions & Linking Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `permissions` | `Input<FunctionPermissionArgs[]>` | `[]` | IAM statements (`{actions, resources, effect?}`) |
| `policies` | `Input<string[]>` | `[]` | Managed IAM policy ARNs to attach |
| `link` | `Input<any[]>` | `[]` | SST components to link (auto-grants permissions + SDK access) |
| `role` | `Input<string>` | auto-created | Existing IAM role ARN (skips auto role creation) |
| `environment` | `Input<Record<string, Input<string>>>` | `{}` | Lambda environment variables |

### Networking & Infrastructure

| Prop | Type | Default | Description |
|---|---|---|---|
| `vpc` | `Vpc \| Input<{securityGroups, privateSubnets}>` | — | VPC configuration for private subnet access |
| `layers` | `Input<Input<string>[]>` | — | Lambda layer ARNs (not used in dev mode) |
| `volume` | `Input<{efs, path?}>` | — | EFS mount (`path` defaults to `/mnt/efs`) |
| `tags` | `Input<Record<string, Input<string>>>` | — | AWS resource tags |

### Behavior Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `url` | `Input<boolean \| {authorization?, cors?, router?}>` | `false` | Enable Lambda Function URL |
| `streaming` | `Input<boolean>` | `false` | Enable response streaming (requires `url`) |
| `retries` | `Input<number>` | `2` | Async invocation retry attempts (0–2) |
| `concurrency` | `Input<{provisioned?, reserved?}>` | — | Concurrency settings |
| `versioning` | `Input<boolean>` | `false` | Enable Lambda versioning (required for provisioned concurrency) |
| `logging` | `Input<false \| {retention?, logGroup?, format?}>` | `{retention: "1 month", format: "text"}` | CloudWatch logging config |
| `dev` | `Input<false>` | `true` | Disable Live dev mode for this function |

### Advanced Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `hook` | `{postbuild(dir: string): Promise<void>}` | — | Build hook (e.g. upload sourcemaps to Sentry) |
| `transform` | `{function?, role?, logGroup?, eventInvokeConfig?}` | — | Pulumi resource transforms |

### FunctionUrl CORS Defaults

When `url: true`:
```typescript
{
  authorization: "none",
  cors: {
    allowHeaders: ["*"],
    allowMethods: ["*"],
    allowOrigins: ["*"],
  }
}
```

---

## Resources Created

Each `sst.aws.Function` instantiation creates these Pulumi resources:

### Always Created

| Resource | Pulumi Type | Variable | Purpose |
|---|---|---|---|
| **IAM Role** | `aws.iam.Role` | `role` | Execution role (skipped if `args.role` provided) |
| **Lambda Function** | `aws.lambda.Function` | `fn` | The Lambda function itself |

### Conditionally Created

| Resource | Pulumi Type | Condition | Purpose |
|---|---|---|---|
| **CloudWatch LogGroup** | `aws.cloudwatch.LogGroup` | `logging !== false && !logging.logGroup` | Log storage with retention |
| **S3 BucketObject (code)** | `aws.s3.BucketObjectv2` | Not container | Zipped function code in bootstrap bucket |
| **S3 BucketObject (sourcemaps)** | `aws.s3.BucketObjectv2` | Sourcemaps exist + logGroup | Sourcemaps for SST Console |
| **Lambda FunctionUrl** | `aws.lambda.FunctionUrl` | `url` enabled | HTTP endpoint for the function |
| **Lambda ProvisionedConcurrencyConfig** | `aws.lambda.ProvisionedConcurrencyConfig` | `concurrency.provisioned > 0` | Pre-warmed instances |
| **Lambda FunctionEventInvokeConfig** | `aws.lambda.FunctionEventInvokeConfig` | `retries` is set | Retry configuration |
| **Docker Image** | `docker-build.Image` | Python container mode | ECR container image |
| **RandomBytes** (singleton) | `random.RandomBytes` | Always (lazy, shared) | 32-byte AES encryption key for resource links |
| **KvKeys + KvRoutesUpdate** | Custom providers | `url.router` set | Router integration for function URL |
| **FunctionEnvironmentUpdate** | Custom provider | `addEnvironment()` called | Post-creation env var injection |

### Construction Order

```
normalizeDev()
  → normalizeInjections/Timeout/Memory/Environment/Streaming/Logging/Volume/Url/CopyFiles/Vpc
  → buildLinkData() + buildLinkPermissions()
  → buildHandler()          // dev: bridge stub, prod: RPC to Go build
  → buildHandlerWrapper()   // injection wrapper for Node.js
  → createRole()            // IAM role with inline + managed policies
  → createImageAsset()      // Docker image (Python container only)
  → createLogGroup()        // CloudWatch log group
  → createZipAsset()        // S3 code upload
  → createFunction()        // Lambda function
  → createUrl()             // Function URL + optional Router integration
  → createProvisioned()     // Provisioned concurrency
  → createEventInvokeConfig() // Retry config
```

---

## Bundling (esbuild)

**Source:** `.repos/sst/pkg/runtime/node/build.go`

SST's bundling uses **Go-native esbuild** (the Go esbuild library, not a subprocess). This gives near-instant builds with zero Node.js overhead.

### Build Flow

```
TypeScript handler path
  → Go resolves file (.ts/.js/.tsx/.jsx)
  → esbuild.Context created (reused in dev mode)
  → Bundle to single .mjs (ESM) or .cjs (CJS) file
  → Force-external packages: sharp, pg-native
  → Install external packages via `npm install --force --platform=linux`
  → Zip bundle + copyFiles + sourcemaps
  → Upload to S3 bootstrap bucket
```

### ESM Banner (Default)

For ESM format, esbuild prepends a CJS compatibility banner:

```javascript
import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);
import { fileURLToPath as topLevelFileUrlToPath, URL as topLevelURL } from "url"
const __filename = topLevelFileUrlToPath(import.meta.url)
const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))
```

This ensures `require()`, `__filename`, and `__dirname` work in ESM bundles — a common pain point when migrating Lambda code to ESM.

### esbuild Options

```go
esbuild.BuildOptions{
    EntryPoints: []string{file},
    Platform:    esbuild.PlatformNode,
    External:    append(forceExternal, install..., userExternal...),
    Bundle:      true,
    Splitting:   properties.Splitting,
    Metafile:    true,
    Sourcemap:   esbuild.SourceMapLinked,
    Format:      esbuild.FormatESModule,    // or FormatCommonJS
    Target:      targetMap[runtime],        // e.g. ES2023 for nodejs22.x
    MainFields:  []string{"module", "main"},
    KeepNames:   true,
}
```

### Target Map

| Runtime | esbuild Target |
|---|---|
| `nodejs22.x` | ES2023 |
| `nodejs20.x` | ES2023 |
| `nodejs18.x` | ES2022 |

### Dev Mode Build Differences

In dev mode:
- Minification is **always disabled**
- Sourcemaps are **always generated** (linked)
- `node_modules` is **symlinked** into output (not installed)
- esbuild context is **persisted** between rebuilds for speed

### External Package Installation

Packages in `nodejs.install` and force-external packages (`sharp`, `pg-native`) that appear in the metafile are installed separately:

```bash
npm install --force --platform=linux --os=linux --arch=x64 --cpu=x64
# For arm64: --arch=arm64 --cpu=arm64
# For sharp: --libc=glibc
```

This runs in the output directory with a synthetic `package.json` containing only the needed dependencies.

---

## IAM & Permissions

**Source:** `.repos/sst/platform/src/components/aws/function.ts:2066-2163`

### Role Creation

If no `role` ARN is provided, SST creates an IAM role with:

1. **Assume role policy** — allows `lambda.amazonaws.com` to assume
2. **Inline policy** — merged from:
   - User-provided `permissions` array
   - Auto-generated permissions from `link`ed resources
   - Dev mode additions (AppSync + S3 bootstrap bucket access)
3. **Managed policies** — merged from:
   - User-provided `policies` array
   - `AWSLambdaBasicExecutionRole` (if logging enabled)
   - `AWSLambdaVPCAccessExecutionRole` (if VPC configured)

### Dev Mode Extra Permissions

In dev mode, the role's assume policy also allows the **current AWS account root** to assume it (for local invocation), plus:

```typescript
{ actions: ["appsync:*"], resources: ["*"] }
{ actions: ["s3:*"], resources: ["arn:...:s3:::${bootstrapBucket}/*"] }
```

### Permission Flow

```
FunctionPermissionArgs {
  effect?: "allow" | "deny"    // default: "allow"
  actions: string[]            // e.g. ["s3:GetObject"]
  resources: Input<string[]>   // e.g. ["arn:aws:s3:::my-bucket/*"]
}
```

Linked resources contribute permissions via `Link.getInclude<Permission>("aws.permission", args.link)`. Each linkable component's `getSSTLink()` returns an `include` array with `type: "aws.permission"` entries.

### Existing Role

When `role` ARN is provided, SST uses `iam.Role.get()` to reference it. **No permissions or policies are added** — the user is responsible for all IAM management.

---

## Resource Linking

**Source:** `.repos/sst/platform/src/components/link.ts`

Resource linking is SST's type-safe cross-component communication system.

### Link.Linkable Interface

```typescript
interface Linkable {
  urn: Output<string>;
  getSSTLink(): Definition;
}

interface Definition<Properties = Record<string, any>> {
  properties: Properties;    // key-value data exposed to consumers
  include?: {
    type: string;            // e.g. "aws.permission", "environment"
    [key: string]: any;
  }[];
}
```

### How Linking Works

When `link: [bucket, queue]` is specified:

1. **Build link data** — calls `getSSTLink()` on each linkable, extracts `properties` + component name from URN
2. **Build permissions** — filters `include` entries for `type === "aws.permission"`, adds to IAM role
3. **Environment injection** — filters `include` for `type === "environment"`, merges into Lambda env vars
4. **Encryption** — all link properties are AES-256-GCM encrypted into `resource.enc` file in the bundle

### Link Data Encryption

```typescript
// Singleton encryption key (shared across all functions in the app)
private static readonly encryptionKey = lazy(
  () => new RandomBytes("LambdaEncryptionKey", { length: 32 })
);
```

The encryption key (`SST_KEY`) is passed as an env var. The encrypted data (`resource.enc`) is bundled with the function. At runtime, the SDK decrypts it.

### Function's Own getSSTLink()

The Function component itself is linkable, exposing:

```typescript
getSSTLink() {
  return {
    properties: { name: this.name, url: this.urlEndpoint },
    include: [
      permission({
        actions: ["lambda:InvokeFunction"],
        resources: [this.function.arn],
      }),
    ],
  };
}
```

So linking a function to another function grants `lambda:InvokeFunction` permission and exposes the function name + URL.

### Environment Variables Injected

```typescript
// Always set
SST_RESOURCE_App        = JSON.stringify({ name: $app.name, stage: $app.stage })
SST_KEY                 = base64(encryptionKey)
SST_KEY_FILE            = "resource.enc"

// Per linked resource (individual env vars)
SST_RESOURCE_{Name}     = JSON.stringify({ ...properties, type: "sst:aws:Bucket" })

// Dev mode additions
SST_REGION              = process.env.SST_AWS_REGION
SST_APPSYNC_HTTP        = appsync.http
SST_APPSYNC_REALTIME    = appsync.realtime
SST_FUNCTION_ID         = name
SST_APP                 = $app.name
SST_STAGE               = $app.stage
SST_ASSET_BUCKET        = bootstrap.asset
```

---

## Runtime SDK

**Source:** `.repos/sst/sdk/js/src/resource.ts`

The JavaScript SDK provides a `Resource` proxy for accessing linked component properties at runtime.

### Resource Proxy

```typescript
import { Resource } from "sst";

// Proxy-based access — throws descriptive error if not linked
Resource.MyBucket.name;    // string
Resource.App.name;         // app name
Resource.App.stage;        // stage name
```

### Resolution Order

The `Resource` proxy resolves properties from multiple sources:

```
1. globalThis.$SST_LINKS                    // injected in dev mode
2. SST_RESOURCES_JSON env var               // consolidated JSON (Windows)
3. SST_RESOURCE_{name} env vars             // individual per-resource
4. SST_KEY_FILE decryption                  // AES-256-GCM encrypted file
5. globalThis.SST_KEY_FILE_DATA             // pre-decrypted (cached)
```

### AES-256-GCM Decryption

```typescript
if (env.SST_KEY_FILE && env.SST_KEY && !globalThis.SST_KEY_FILE_DATA) {
  const key = Buffer.from(env.SST_KEY, "base64");
  const encryptedData = readFileSync(env.SST_KEY_FILE);
  const nonce = Buffer.alloc(12, 0);         // fixed zero nonce
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
  const authTag = encryptedData.subarray(-16);
  const actualCiphertext = encryptedData.subarray(0, -16);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(actualCiphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  Object.assign(raw, JSON.parse(decrypted.toString()));
}
```

The encrypted file approach avoids Lambda's 4KB environment variable size limit — link data can be arbitrarily large.

### Multi-Runtime SDK Support

| Runtime | Import | Access Pattern |
|---|---|---|
| Node.js | `import { Resource } from "sst"` | `Resource.MyBucket.name` |
| Python | `from sst import Resource` | `Resource.MyBucket.name` |
| Go | `import "github.com/sst/sst/v3/sdk/golang/resource"` | `resource.Get("MyBucket", "name")` |
| Rust | `use sst_sdk::Resource` | `resource.get("Bucket")` |

---

## Node.js Runtime

**Source:** `.repos/sst/platform/functions/nodejs-runtime/`

SST provides a custom Node.js runtime for dev mode that emulates the Lambda Runtime API.

### Architecture

```
loop.ts (parent process)
  ├── Reads JSON messages from stdin
  ├── Manages worker thread lifecycle
  └── Forwards stdout/stderr as JSON packets

index.ts (worker thread)
  ├── Emulates Lambda Runtime API via HTTP
  ├── Polls GET /runtime/invocation/next
  ├── Imports and calls user handler
  └── Posts response to /runtime/invocation/{id}/response
```

### loop.ts — Parent Process

The parent process is a long-lived Node.js process that:

1. Reads line-delimited JSON from **stdin** (commands from the SST dev server)
2. Spawns `Worker` threads for each invocation
3. Passes env vars including `SST_LIVE=true`, `SST_DEV=true`
4. Enables `--enable-source-maps` and `--inspect` for debugging
5. Forwards worker stdout/stderr as structured JSON to parent's stdout

```typescript
// Message types
interface WorkerStartMessage {
  type: "worker.start";
  workerID: string;
  env: Record<string, string>;
  args: string[];
}
interface WorkerStopMessage {
  type: "worker.stop";
  workerID: string;
}
```

### index.ts — Worker Thread

Each worker:

1. Parses handler path from `process.argv[2]`
2. Dynamically imports the handler module
3. Enters an infinite loop polling the Lambda Runtime API
4. Constructs a full `LambdaContext` object (awsRequestId, functionName, etc.)
5. Calls the user's handler with `(event, context)`
6. Posts the response back
7. Has a 60-second idle timeout before self-terminating

```typescript
// Lambda Runtime API emulation
const AWS_LAMBDA_RUNTIME_API =
  `http://` + process.env.AWS_LAMBDA_RUNTIME_API! + "/2018-06-01";

// Polling loop
while (true) {
  const result = await fetch(AWS_LAMBDA_RUNTIME_API + `/runtime/invocation/next`);
  // ... construct context, call handler, post response
}
```

---

## Dev Mode Architecture

In `sst dev`, the Function component deploys a **stub function** instead of the real code. Real invocations are routed to your local machine.

### How Dev Mode Works

```
1. DEPLOY: Stub "bridge" function deployed to Lambda
   - Runtime: provided.al2023 (custom runtime)
   - Handler: "bootstrap"
   - Bundle: platform/dist/bridge
   - Description: "{original description} (live)"

2. INVOKE: AWS triggers the stub Lambda
   - Stub sends invocation payload via AppSync WebSocket
   - SST dev server receives the payload locally
   - Dev server starts a worker thread with your actual code
   - Worker executes your handler, returns result
   - Result sent back via AppSync to the stub
   - Stub returns the result to AWS

3. REGISTER: On deploy, rpc.call("Runtime.AddTarget", input)
   - Registers the function with the dev server
   - Includes handler, runtime, links, copyFiles info
```

### Dev Mode Environment

The stub function receives extra env vars:

| Variable | Purpose |
|---|---|
| `SST_APPSYNC_HTTP` | AppSync HTTP endpoint for dev bridge |
| `SST_APPSYNC_REALTIME` | AppSync WebSocket endpoint |
| `SST_FUNCTION_ID` | Component name for routing |
| `SST_APP` | App name |
| `SST_STAGE` | Stage name |
| `SST_REGION` | AWS region |
| `SST_ASSET_BUCKET` | Bootstrap S3 bucket |
| `SST_FUNCTION_TIMEOUT` | Optional timeout override |

### Dev Mode Differences in Function Resource

```typescript
// In createFunction(), dev mode overrides:
{
  description: `${original} (live)`,    // or just "live"
  runtime: "provided.al2023",           // always custom runtime
  architectures: ["x86_64"],            // always x86
}
```

---

## Lambda Subscribers

SST components that trigger Lambda functions use `Function.fromDefinition()` — a static factory that accepts either a handler string or full `FunctionArgs`.

### fromDefinition Pattern

```typescript
// Used by S3, SQS, SNS, DynamoDB, Kinesis, EventBridge, API Gateway
static fromDefinition(
  name: string,
  definition: Input<string | FunctionArgs>,
  override: Pick<FunctionArgs, "description" | "permissions">,
  argsTransform?: Transform<FunctionArgs>,
  opts?: ComponentResourceOptions,
)
```

This allows subscriber components to:
- Accept `"src/handler.handler"` shorthand
- Merge their own required permissions
- Apply component-level transforms

### Push Model Subscribers

These use `lambda.Permission` + direct invocation — the AWS service calls Lambda directly.

| Subscriber | Source File | Resources Created | Filtering |
|---|---|---|---|
| **S3 Bucket** | `aws/bucket-lambda-subscriber.ts` | `lambda.Permission` (s3 principal) + `s3.BucketNotification` | `filterPrefix`, `filterSuffix`, `events` |
| **SNS Topic** | `aws/sns-topic-lambda-subscriber.ts` | `lambda.Permission` (sns principal) + `sns.TopicSubscription` (protocol: lambda) | JSON filter policy |
| **EventBridge** | `aws/bus-lambda-subscriber.ts` | `lambda.Permission` (events principal) + `cloudwatch.EventRule` + `cloudwatch.EventTarget` | Event pattern rules |
| **IoT Realtime** | `aws/realtime-lambda-subscriber.ts` | `lambda.Permission` (iot principal) + `iot.TopicRule` | SQL filter (`SELECT * FROM '${filter}'`) |

### Pull Model Subscribers

These use `lambda.EventSourceMapping` — Lambda polls the source. The function needs read permissions on the source.

| Subscriber | Source File | Resources Created | Config |
|---|---|---|---|
| **SQS Queue** | `aws/queue-lambda-subscriber.ts` | `lambda.EventSourceMapping` + SQS read permissions | `batchSize: 10`, batching window, partial responses, JSON filters |
| **DynamoDB** | `aws/dynamo-lambda-subscriber.ts` | `lambda.EventSourceMapping` + Stream permissions | `startingPosition: "LATEST"`, JSON filters |
| **Kinesis** | `aws/kinesis-stream-lambda-subscriber.ts` | `lambda.EventSourceMapping` + Kinesis permissions | `startingPosition: "LATEST"`, JSON filters |

### API Gateway Integration

| Integration | Source File | Resources Created |
|---|---|---|
| **API Gateway V2** | `aws/apigatewayv2-lambda-route.ts` | `lambda.Permission` + `apigatewayv2.Integration` + `apigatewayv2.Route` |
| **Function URL** | Built into `function.ts` | `lambda.FunctionUrl` (no API Gateway needed) |

### Function Builder Helper

All subscriber implementations use the `functionBuilder()` helper from `aws/helpers/function-builder.ts`. Each subscriber automatically grants the function **minimum required permissions** for the event source:

```typescript
functionBuilder(`${name}Function`, args.subscriber, {
  description: `Subscribed to ${name}`,
  permissions: [
    { actions: ["sqs:ChangeMessageVisibility", "sqs:DeleteMessage", ...],
      resources: [queue.arn] },
  ],
}, undefined, { parent: self });
```

---

## Transform System

**Source:** `.repos/sst/platform/src/components/component.ts`

The `transform` prop lets you customize the underlying Pulumi resources before they're created.

### Available Transforms

```typescript
transform?: {
  function?:          Transform<lambda.FunctionArgs>;
  role?:              Transform<iam.RoleArgs>;
  logGroup?:          Transform<cloudwatch.LogGroupArgs>;
  eventInvokeConfig?: Transform<lambda.FunctionEventInvokeConfig>;
}
```

### Transform Usage Pattern

Internally, SST uses the `transform()` helper which returns `[name, args, opts]` for Pulumi resource constructors:

```typescript
// How it's applied:
new iam.Role(
  ...transform(
    args.transform?.role,
    `${name}Role`,
    { /* default args */ },
    { parent },
  ),
);
```

A `Transform<T>` can be either:
- **An object** — merged with defaults (deep merge)
- **A function** `(args: T, opts: ComponentResourceOptions) => void` — mutates args in place

### Example

```typescript
new sst.aws.Function("MyFunction", {
  handler: "src/handler.handler",
  transform: {
    function: {
      memorySize: 2048,            // override computed value
    },
    role: (args) => {
      args.tags = { team: "platform" };
    },
  },
});
```

---

## Dev vs Production

| Aspect | Dev (`sst dev`) | Production (`sst deploy`) |
|---|---|---|
| **Handler** | `"bootstrap"` (bridge stub) | Built handler path |
| **Bundle** | `platform/dist/bridge` | esbuild output in S3 |
| **Runtime** | `provided.al2023` | User-specified (e.g. `nodejs20.x`) |
| **Architecture** | Always `x86_64` | User-specified |
| **Description** | Appends ` (live)` | User-specified |
| **Build** | Local esbuild with persistent context | Go esbuild, npm install, zip, S3 upload |
| **Minification** | Disabled | Enabled (default) |
| **Sourcemaps** | Always generated | Only if `sourcemap: true` |
| **node_modules** | Symlinked | npm installed per-package |
| **IAM extras** | AppSync + S3 bootstrap permissions | None |
| **Assume role** | Lambda service + account root | Lambda service only |
| **Layers** | Not used | Applied |
| **copyFiles** | Not included | Included in zip |
| **Streaming** | Not supported | Supported via FunctionUrl |
| **Env vars** | SST_APPSYNC_*, SST_FUNCTION_ID, etc. | Standard SST_RESOURCE_* only |

### Dev Detection

```typescript
function normalizeDev() {
  return all([args.dev, args.live]).apply(
    ([d, l]) => $dev && d !== false && l !== false,
  );
}
```

`$dev` is a global Pulumi flag set by `sst dev`. Individual functions can opt out with `dev: false`.

---

## Key Patterns

### 1. Physical Naming

```typescript
// LogGroup name pattern:
`/aws/lambda/${args.name ?? physicalName(64, `${name}Function`)}`
```

`physicalName(maxLen, logicalName)` generates a deterministic name from app + stage + logical name, truncated to `maxLen` characters.

### 2. Singleton Resources via `lazy()`

```typescript
// Encryption key — created once, shared across all Functions
private static readonly encryptionKey = lazy(
  () => new RandomBytes("LambdaEncryptionKey", { length: 32 })
);

// AppSync endpoint — created once for dev mode
public static readonly appsync = lazy(() =>
  rpc.call("Provider.Aws.Appsync", {})
);
```

### 3. Deterministic Zip Hashes

The zip archiver uses `statConcurrency: 1` and `date: new Date(0)` to ensure deterministic zip file hashes. Files are sorted alphabetically before archiving. This prevents unnecessary Lambda updates when code hasn't changed.

### 4. Handler Wrapper for Injections

When `injections` are provided (internal prop used by other components), SST generates a wrapper file that imports the original handler:

```javascript
// server-index.mjs (generated wrapper)
export const handler = async (event, context) => {
  // ...injection code...
  const { handler: rawHandler } = await import("./bundle.mjs");
  return rawHandler(event, context);
};
```

### 5. Container Image Deployment

Python functions can deploy as container images (10GB limit vs 250MB for zip):

```typescript
{ python: { container: true } }
```

This builds a Docker image, pushes to ECR bootstrap registry, and uses `packageType: "Image"` instead of `"Zip"`.

### 6. Go/Rust Runtime Mapping

```typescript
runtime.apply((v) =>
  v === "go" || v === "rust" ? "provided.al2023" : v
)
```

Go and Rust functions use the `provided.al2023` custom runtime with a compiled binary as the handler.

### 7. Function URL Router Integration

When `url.router` is configured, the function URL is served through an SST Router (CloudFront distribution) using KV store routing:

```typescript
// Route entry format:
"url,{namespace},{hostPattern},{pathPrefix}"
```

This enables serving functions at custom domains/paths without API Gateway.

### 8. Sourcemap Upload

Sourcemaps are always generated but only included in the deployment package when `sourcemap: true`. However, they're always uploaded to S3 for the SST Console's error tracking:

```typescript
key: `sourcemap/${logGroupArn}/${hashValue}.${basename}`
```

### 9. RPC Bridge to Go

The TypeScript component communicates with the Go build system via RPC:

```typescript
// Build
const result = await rpc.call<BuildResult>("Runtime.Build", input);

// Dev mode registration
await rpc.call("Runtime.AddTarget", input);

// AppSync setup
await rpc.call("Provider.Aws.Appsync", {});
```

This is how the Pulumi component (TypeScript) triggers the Go-native esbuild bundling.
