# Relay — Project Scope

> **Relay** is an async multi-channel notification engine with idempotency, rate limiting, and resilient delivery.

**Repo name:** `relay-notify`

**Tagline:** Async multi-channel notification engine with idempotency, rate limiting, and resilient delivery.

---

## v1 IN

- API key authentication (machine-to-machine)
- Idempotency layer (client-supplied key, 24h TTL)
- Token-bucket rate limiting per `(apiKeyId, channel)`
- BullMQ job queue with Redis
- Mock providers: email, SMS, push (configurable success / fail / slow)
- Queue-managed exponential backoff retries
- Dead letter queue (DLQ) with replay and discard
- Scheduled send via `deliverAt`
- Success webhooks (separate webhook queue)
- Delivery attempt audit trail
- Structured JSON logging with correlation IDs
- Graceful worker shutdown
- Two worker processes (design + demo)
- OpenAPI / Swagger docs
- WebSocket live dashboard updates
- k6 load tests (+ optional Artillery scenarios)
- Deploy: Railway (API, workers, Postgres, Redis) + Vercel (web)

---

## v1 OUT

- Recipient-level rate limits
- API key CRUD UI (seed only)
- Dashboard authentication
- Real third-party providers (SendGrid, Twilio, FCM)
- Multi-tenant org model beyond API keys

---

## Stack

| Layer      | Choice                                                  |
| ---------- | ------------------------------------------------------- |
| Monorepo   | npm/pnpm workspaces                                     |
| API        | Express + TypeScript                                    |
| ORM        | Prisma                                                  |
| Queue      | BullMQ + Redis                                          |
| Validation | Zod (shared package)                                    |
| Web        | Vite + React + TypeScript + TanStack Query              |
| Real-time  | Socket.io (Redis adapter for worker → dashboard events) |
| UI library | TBD at implementation time                              |

---

## Status lifecycle

```
accepted → queued → processing → delivered
                              ↘ failed (retrying) → … → in_dlq → discarded
```

| Status       | Who sets it                                       |
| ------------ | ------------------------------------------------- |
| `accepted`   | API on create                                     |
| `queued`     | API after BullMQ enqueue                          |
| `processing` | Worker on job start                               |
| `delivered`  | Worker on provider success                        |
| `failed`     | Worker between retry attempts                     |
| `in_dlq`     | Worker / failed handler after max BullMQ attempts |
| `discarded`  | Discard endpoint (row retained for audit)         |

**Naming note:** BullMQ job state is `failed`; domain status in Postgres is `in_dlq`.

---

## Seeded API clients

| Label          | Tier | Email   | SMS    | Push    |
| -------------- | ---- | ------- | ------ | ------- |
| Startup (Free) | free | 10/min  | 5/min  | 50/min  |
| Acme (Pro)     | pro  | 100/min | 30/min | 500/min |
| Load Test      | pro  | high    | high   | high    |

Plaintext keys stored in seed for demo; production would show key once on create.

---

## Policies

| Policy                         | Value                                                 |
| ------------------------------ | ----------------------------------------------------- |
| Idempotency TTL                | 24 hours                                              |
| Retry attempts (notifications) | 5                                                     |
| Backoff                        | Exponential, base 1000ms, jitter optional             |
| Provider timeout               | 10s                                                   |
| Mock provider rates            | 70% success / 20% error / 10% slow (env-configurable) |
| Webhook retry attempts         | 3                                                     |
| Pagination                     | Offset, default limit 20                              |

---

## Related docs

- [backend-plan.md](./backend-plan.md)
- [frontend-plan.md](./frontend-plan.md)
