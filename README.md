# Relay

Async multi-channel notification engine with idempotency, rate limiting, and resilient delivery.

Portfolio project targeting senior-level skills: asynchronous processing, fault tolerance, rate limiting, and production-minded API design.

## Monorepo structure

```
relay-notify/
├── apps/
│   ├── server/          @relay/server — Express API + workers (workers TBD)
│   └── web/             @relay/web — Vite + React dashboard
├── packages/
│   └── shared/          @relay/shared — Zod schemas, types, constants
├── docker-compose.yml   Postgres + Redis
└── docs/                Planning documents
```

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for Postgres + Redis)

## Getting started

```bash
# Install dependencies
pnpm install

# Start infrastructure
pnpm docker:up

# Copy env files
cp .env.example apps/server/.env
cp apps/web/.env.example apps/web/.env

# Run API + web (builds shared package first)
pnpm dev
```

Or run individually:

```bash
pnpm dev:server   # http://localhost:3000
pnpm dev:web      # http://localhost:5173
```

## Scripts

| Command            | Description                                 |
| ------------------ | ------------------------------------------- |
| `pnpm install`     | Install all workspace dependencies          |
| `pnpm dev`         | Build shared + run server & web in parallel |
| `pnpm dev:server`  | API only                                    |
| `pnpm dev:web`     | Dashboard only                              |
| `pnpm build`       | Build all packages                          |
| `pnpm typecheck`   | Typecheck all packages                      |
| `pnpm docker:up`   | Start Postgres + Redis                      |
| `pnpm docker:down` | Stop containers                             |

## Documentation

| Doc                                              | Description                               |
| ------------------------------------------------ | ----------------------------------------- |
| [docs/scope.md](./docs/scope.md)                 | v1 boundaries, policies, status lifecycle |
| [docs/backend-plan.md](./docs/backend-plan.md)   | API, data model, queues, deployment       |
| [docs/frontend-plan.md](./docs/frontend-plan.md) | Dashboard pages, WebSocket, demo script   |

## Stack

Express, Prisma (TBD), BullMQ, Redis, Postgres, Vite, React, TanStack Query, Socket.io (TBD)
