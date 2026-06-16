# Relay — Backend Plan

See [scope.md](./scope.md) for v1 boundaries, status enum, and policies.

---

## 1. Monorepo layout

```
relay-notify/
├── apps/
│   ├── server/                     # Express API + WebSocket + worker entrypoints
│   │   ├── src/
│   │   │   ├── index.ts            # HTTP + Socket.io server
│   │   │   ├── worker.ts           # Notification delivery worker
│   │   │   ├── webhook-worker.ts   # Webhook callback worker
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── providers/          # Mock email, sms, push
│   │   │   ├── queue/
│   │   │   ├── middleware/
│   │   │   └── lib/
│   │   └── package.json
│   └── web/                        # See frontend-plan.md
├── packages/
│   └── shared/                     # Zod schemas, types, constants
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── docker-compose.yml
├── .env.example
└── package.json
```

### Processes

| Process        | Entry                   | Purpose                                                     |
| -------------- | ----------------------- | ----------------------------------------------------------- |
| API            | `src/index.ts`          | REST, Swagger, Socket.io                                    |
| Worker ×2      | `src/worker.ts`         | Consumes `notifications` queue (run two instances for demo) |
| Webhook worker | `src/webhook-worker.ts` | Consumes `webhooks` queue                                   |

Local: `docker compose up` for Postgres + Redis, then start API + 2 workers + webhook worker.

---

## 2. Local infrastructure (Docker Compose)

| Service       | Port | Purpose                                |
| ------------- | ---- | -------------------------------------- |
| PostgreSQL 16 | 5432 | Primary store                          |
| Redis 7       | 6379 | BullMQ, rate limits, idempotency cache |

---

## 3. Data model (Prisma)

### ApiKey

| Field               | Type     | Notes                                        |
| ------------------- | -------- | -------------------------------------------- |
| id                  | UUID     | PK                                           |
| keyHash             | String   | bcrypt hash of full key                      |
| keyPrefix           | String   | Display prefix, e.g. `sk_free_a1b2`          |
| plaintextKey        | String?  | Demo only — seed data for dashboard dropdown |
| label               | String   | e.g. "Startup (Free)"                        |
| tier                | Enum     | `free`, `pro`                                |
| emailLimitPerMinute | Int      |                                              |
| smsLimitPerMinute   | Int      |                                              |
| pushLimitPerMinute  | Int      |                                              |
| isActive            | Boolean  |                                              |
| createdAt           | DateTime |                                              |

### Notification

| Field          | Type      | Notes                                          |
| -------------- | --------- | ---------------------------------------------- |
| id             | UUID      | Returned as `notificationId`                   |
| apiKeyId       | UUID      | FK → ApiKey                                    |
| idempotencyKey | String    |                                                |
| channel        | Enum      | `email`, `sms`, `push`                         |
| recipient      | String    |                                                |
| payload        | Json      | Channel-specific fields (subject, title, body) |
| status         | Enum      | See scope.md                                   |
| deliverAt      | DateTime? | Scheduled send time                            |
| webhookUrl     | String?   | Callback URL on success                        |
| correlationId  | String    | From `X-Request-Id` or generated               |
| createdAt      | DateTime  |                                                |
| updatedAt      | DateTime  |                                                |
| deliveredAt    | DateTime? |                                                |

**Indexes:** `(apiKeyId, idempotencyKey)` unique, `(status)`, `(apiKeyId, createdAt)`, `(channel)`

### DeliveryAttempt

| Field            | Type     | Notes                           |
| ---------------- | -------- | ------------------------------- |
| id               | UUID     |                                 |
| notificationId   | UUID     | FK                              |
| attemptNumber    | Int      | 1-based                         |
| outcome          | Enum     | `success`, `failure`, `timeout` |
| latencyMs        | Int      |                                 |
| errorMessage     | String?  |                                 |
| providerResponse | Json?    |                                 |
| createdAt        | DateTime |                                 |

### Idempotency (Redis — not Prisma)

- **Key:** `idempotency:{apiKeyId}:{idempotencyKey}`
- **Value:** JSON `{ notificationId, status, responseSnapshot }`
- **TTL:** 86400 seconds (24h)

---

## 4. API endpoints

Base URL: `/v1` for versioned resources.

**Auth:**

- `POST /v1/notifications` — always requires `Authorization: Bearer <api_key>`
- `GET` routes (list, detail, metrics, api-keys) — require API key in production; in development, allow unauthenticated access when `DEMO_MODE=true` (see `.env.example`)
- Replay / discard — require API key (or same demo bypass in development)

### Health (no auth)

| Method | Path      | Response                                                          |
| ------ | --------- | ----------------------------------------------------------------- |
| GET    | `/health` | `{ "status": "ok" }`                                              |
| GET    | `/ready`  | `{ "status": "ok"\|"degraded", "postgres": bool, "redis": bool }` |

### Notifications

| Method | Path                            | Description                                 |
| ------ | ------------------------------- | ------------------------------------------- |
| POST   | `/v1/notifications`             | Submit notification                         |
| GET    | `/v1/notifications`             | List with filters + pagination              |
| GET    | `/v1/notifications/:id`         | Detail + delivery attempts                  |
| POST   | `/v1/notifications/:id/replay`  | Re-enqueue from `failed` or `in_dlq`        |
| POST   | `/v1/notifications/:id/discard` | Set status `discarded` (from `in_dlq` only) |

### Ops / demo

| Method | Path           | Description                       |
| ------ | -------------- | --------------------------------- |
| GET    | `/v1/metrics`  | Aggregated counters for dashboard |
| GET    | `/v1/api-keys` | List keys for send-panel dropdown |

### Documentation

| Method | Path            | Description    |
| ------ | --------------- | -------------- |
| GET    | `/docs`         | Swagger UI     |
| GET    | `/openapi.json` | OpenAPI 3 spec |

---

## 5. Request / response contracts

### Headers — POST `/v1/notifications`

```
Authorization: Bearer sk_...
Idempotency-Key: <client uuid or string>
X-Request-Id: <optional>
Content-Type: application/json
```

### Request bodies (Zod in `packages/shared`)

**Email**

```json
{
  "channel": "email",
  "recipient": "user@example.com",
  "subject": "Hello",
  "body": "Message text",
  "deliverAt": "2026-06-17T15:00:00.000Z",
  "webhookUrl": "https://example.com/hooks/relay"
}
```

**SMS**

```json
{
  "channel": "sms",
  "recipient": "+15551234567",
  "body": "Your code is 1234",
  "deliverAt": null,
  "webhookUrl": null
}
```

**Push**

```json
{
  "channel": "push",
  "recipient": "device-token-abc",
  "title": "Alert",
  "body": "Something happened",
  "webhookUrl": "https://example.com/hooks/relay"
}
```

### POST response — 202 Accepted

```json
{
  "notificationId": "uuid",
  "status": "accepted",
  "idempotencyKey": "client-key",
  "correlationId": "req-uuid"
}
```

Duplicate `Idempotency-Key` within TTL → return **identical** response; do not enqueue again.

Optional strictness: if same key but different payload → `409 IDEMPOTENCY_CONFLICT`.

### Error shape

```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests for channel sms",
  "details": { "retryAfterSeconds": 42 }
}
```

| HTTP | Code                                           |
| ---- | ---------------------------------------------- |
| 400  | `VALIDATION_ERROR`                             |
| 401  | `INVALID_API_KEY`                              |
| 404  | `NOT_FOUND`                                    |
| 409  | `IDEMPOTENCY_CONFLICT`                         |
| 429  | `RATE_LIMIT_EXCEEDED` (+ `Retry-After` header) |

### GET `/v1/notifications`

Query params:

- `offset` (default 0)
- `limit` (default 20, max 100)
- `status` — filter by status enum
- `channel` — `email` | `sms` | `push`
- `apiKeyId` — filter by client

### GET `/v1/notifications/:id`

```json
{
  "notification": { "...": "..." },
  "attempts": [
    {
      "attemptNumber": 1,
      "outcome": "failure",
      "latencyMs": 120,
      "errorMessage": "Mock provider returned 500",
      "createdAt": "..."
    }
  ]
}
```

### GET `/v1/metrics`

```json
{
  "totals": {
    "accepted": 0,
    "queued": 0,
    "processing": 0,
    "delivered": 0,
    "failed": 0,
    "in_dlq": 0,
    "discarded": 0
  },
  "last24h": {
    "submitted": 0,
    "delivered": 0,
    "failed": 0,
    "rateLimitHits": 0
  },
  "byChannel": {
    "email": { "delivered": 0, "failed": 0 },
    "sms": { "delivered": 0, "failed": 0 },
    "push": { "delivered": 0, "failed": 0 }
  },
  "dlqDepth": 0,
  "avgDeliveryLatencyMs": 0
}
```

### GET `/v1/api-keys`

```json
{
  "apiKeys": [
    {
      "id": "uuid",
      "label": "Startup (Free)",
      "tier": "free",
      "key": "sk_free_...",
      "limits": { "email": 10, "sms": 5, "push": 50 }
    }
  ]
}
```

---

## 6. Core flows

### 6.1 Submit notification

```
1. Validate API key → apiKeyId
2. Validate body (Zod)
3. Resolve correlationId (header or generate)
4. Idempotency check (Redis) → return cached 202 if hit
5. Rate limit check (apiKeyId + channel) → 429 if exceeded
6. Insert Notification (status: accepted)
7. Compute BullMQ delay = max(0, deliverAt - now)
8. Enqueue job to notifications queue
9. Update status → queued
10. Store idempotency record in Redis
11. Emit WebSocket notification.created
12. Return 202
```

### 6.2 Worker — notification delivery

```
1. Load notification from DB
2. Set status → processing; emit notification.updated
3. Call mock provider for channel (with 10s timeout)
4. Insert DeliveryAttempt row
5. On success:
   - Set status → delivered, deliveredAt = now
   - If webhookUrl: enqueue webhooks queue job
   - Emit notification.updated
6. On failure/timeout:
   - Set status → failed (while BullMQ will retry)
   - Throw error → BullMQ applies exponential backoff
7. On final failure (attempts exhausted):
   - Set status → in_dlq
   - Emit notification.updated
```

**Do not** retry in a while-loop inside the worker. Throw and let BullMQ handle backoff.

### 6.3 Webhook worker

```
1. POST to notification.webhookUrl:
   { notificationId, status, channel, recipient, deliveredAt, correlationId }
2. Timeout 10s
3. On failure: throw → BullMQ retries (max 3 attempts)
4. Log outcome (extend DeliveryAttempt or separate WebhookAttempt if needed)
```

### 6.4 Replay

- Allowed when status is `failed` or `in_dlq`
- Re-enqueue to notifications queue
- Set status → `queued`
- Emit notification.updated

### 6.5 Discard

- Allowed when status is `in_dlq`
- Set status → `discarded` (do not delete row)
- Emit notification.updated

---

## 7. BullMQ configuration

### Queue: `notifications`

```typescript
{
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: false,
}
```

Job payload: `{ notificationId: string }`

Scheduled send: set `delay` option when adding job.

### Queue: `webhooks`

```typescript
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
}
```

Job payload: `{ notificationId: string }`

### DLQ alignment

When BullMQ exhausts attempts, job moves to failed set. Handler sets DB status `in_dlq`. Dashboard reads from DB, not BullMQ UI.

---

## 8. Rate limiting

**Algorithm:** Token bucket in Redis

**Key:** `ratelimit:{apiKeyId}:{channel}`

**Limits:** From ApiKey row based on channel (`emailLimitPerMinute`, etc.)

**When:** After auth + validation, **before** DB insert and enqueue

**On exceed:** HTTP 429, `Retry-After` header (seconds until bucket refills), increment `rateLimitHits` metric (Redis counter or DB aggregate)

---

## 9. Mock providers

Shared interface:

```typescript
interface NotificationProvider {
  send(input: ProviderInput): Promise<ProviderResult>;
}

interface ProviderResult {
  success: boolean;
  latencyMs: number;
  errorMessage?: string;
  response?: unknown;
}
```

Implementations: `MockEmailProvider`, `MockSmsProvider`, `MockPushProvider`

Behavior (env-configurable):

| Outcome | Default % | Behavior                                  |
| ------- | --------- | ----------------------------------------- |
| Success | 70%       | 200 after ~50–200ms                       |
| Error   | 20%       | Immediate failure                         |
| Slow    | 10%       | Delay 15s → worker timeout at 10s → retry |

---

## 10. WebSocket (Socket.io)

Use **Redis adapter** so workers emit events without running inside the HTTP process.

### Events (server → client)

| Event                  | Payload                                     |
| ---------------------- | ------------------------------------------- |
| `notification.created` | Notification summary                        |
| `notification.updated` | `{ id, status, ...partial fields }`         |
| `metrics.updated`      | Full metrics object (debounce max 1 per 2s) |

Clients join room `ops` on connect.

---

## 11. Middleware stack

1. Request ID / correlation ID
2. Structured request logger
3. CORS (origin from env)
4. JSON body parser
5. API key auth (v1 routes)
6. Error handler → consistent error shape

---

## 12. OpenAPI / Swagger

- Define Zod schemas in `packages/shared`
- Generate OpenAPI via `@asteasolutions/zod-to-openapi`
- Serve Swagger UI at `/docs`
- Keep spec in sync with routes — single source of truth from Zod

---

## 13. Structured logging

JSON logs to stdout:

```json
{
  "level": "info",
  "message": "Notification delivered",
  "correlationId": "...",
  "notificationId": "...",
  "apiKeyId": "...",
  "channel": "email",
  "attempt": 2,
  "latencyMs": 145
}
```

Use `pino` or similar.

---

## 14. Graceful shutdown

On `SIGTERM` / `SIGINT`:

1. Stop accepting new HTTP connections
2. Pause BullMQ workers (finish in-flight jobs)
3. Close Socket.io + Redis connections
4. Disconnect Prisma
5. Exit 0

---

## 15. Testing

| Layer       | Tool      | Focus                                                       |
| ----------- | --------- | ----------------------------------------------------------- |
| Unit        | Jest      | Rate limit service, idempotency service, token bucket math  |
| API         | Supertest | POST flow, 401, 429, duplicate idempotency, replay, discard |
| Integration | Docker    | Full retry → DLQ path with real Redis                       |

Minimum test cases:

- Happy path: submit → delivered
- Duplicate idempotency key returns same ID
- Rate limit returns 429 with Retry-After
- Mock failure triggers retry; eventually in_dlq
- Replay from in_dlq succeeds
- deliverAt schedules job (assert delay or status timing)

---

## 16. Load testing

### Primary: k6

- Script: ramp POST `/v1/notifications` with Pro API key
- Measure: requests/sec, p95 accept latency, delivery success rate
- Export summary for README
- **Why k6:** JavaScript-native, CI-friendly, industry-standard benchmark output

### Optional: Artillery

- YAML scenarios: ramp → sustain → spike
- Useful for readable portfolio narrative
- Not required in CI

Publish in README: throughput, p95, DLQ rate under load, rate-limit behavior with Free tier key.

---

## 17. Environment variables

Canonical list lives in [../.env.example](../.env.example). Summary:

| Variable                    | Purpose                  |
| --------------------------- | ------------------------ |
| `NODE_ENV`                  | development / production |
| `PORT`                      | API port (default 3000)  |
| `CORS_ORIGIN`               | Web app origin           |
| `DATABASE_URL`              | Postgres connection      |
| `REDIS_URL`                 | Redis connection         |
| `IDEMPOTENCY_TTL_SECONDS`   | Default 86400            |
| `MOCK_*`                    | Provider behavior rates  |
| `PROVIDER_TIMEOUT_MS`       | Default 10000            |
| `NOTIFICATION_MAX_ATTEMPTS` | Default 5                |
| `NOTIFICATION_BACKOFF_MS`   | Default 1000             |
| `WEBHOOK_MAX_ATTEMPTS`      | Default 3                |
| `LOG_LEVEL`                 | info / debug             |

---

## 18. Deployment (Railway)

| Service         | Notes                        |
| --------------- | ---------------------------- |
| API + Socket.io | One Railway service          |
| Worker          | Two replicas or two services |
| Webhook worker  | One service                  |
| Postgres        | Railway plugin               |
| Redis           | Railway or Upstash           |

Web frontend on Vercel — see [frontend-plan.md](./frontend-plan.md).

---

## 19. Build phases

| Week  | Deliverable                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------- |
| **1** | Monorepo scaffold, Docker Compose, Prisma schema + seed, POST `/v1/notifications`, idempotency, enqueue |
| **2** | Worker, mock providers, delivery attempts, retries, in_dlq                                              |
| **3** | Rate limits, deliverAt, webhook queue, replay/discard endpoints                                         |
| **4** | Socket.io + Redis adapter, metrics, Swagger, run 2 workers                                              |
| **5** | Tests, k6 load test, graceful shutdown, Railway deploy                                                  |

---

## 20. Learning ownership (AI guidance)

Implement yourself first (minimal AI):

- Idempotency flow
- BullMQ retry/backoff config
- Rate limit token bucket
- DLQ → replay lifecycle
- Worker throw-on-failure pattern

AI-assisted OK:

- Docker Compose, Prisma boilerplate, Swagger setup, CI YAML, test scaffolding

---

## 21. Interview talking points

- "Idempotency at the API boundary — duplicates never create a second job"
- "Rate limiting before enqueue so we don't queue work we'll reject"
- "DLQ is for ops review and explicit replay, not infinite automatic retry"
- "Webhook delivery is a separate queue so slow client callbacks don't block notification workers"
- "Two stateless workers consuming one Redis-backed queue — horizontal scaling story"
