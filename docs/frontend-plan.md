# Relay — Frontend Plan

See [scope.md](./scope.md) for v1 boundaries and shared policies.

Backend contracts: [backend-plan.md](./backend-plan.md)

---

## 1. Stack

| Tool             | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| Vite             | Build tool                                                |
| React 18+        | UI                                                        |
| TypeScript       | Types                                                     |
| TanStack Query   | Server state, cache, invalidation                         |
| Socket.io client | Live dashboard updates                                    |
| UI library       | **TBD** (shadcn/ui, MUI, etc.) — decide at implementation |

Shared types: import from `@relay/shared` where possible (Zod-inferred types).

---

## 2. App structure

```
apps/web/
├── src/
│   ├── api/
│   │   ├── client.ts           # fetch wrapper, base URL
│   │   ├── notifications.ts    # API functions
│   │   ├── metrics.ts
│   │   └── api-keys.ts
│   ├── hooks/
│   │   ├── useSocket.ts        # Socket.io connection + event handlers
│   │   ├── useNotifications.ts
│   │   └── useMetrics.ts
│   ├── pages/
│   │   ├── OverviewPage.tsx
│   │   ├── NotificationsPage.tsx
│   │   ├── NotificationDetailPage.tsx
│   │   ├── DlqPage.tsx
│   │   └── SendTestPage.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   └── Nav.tsx
│   │   ├── ApiKeySelect.tsx
│   │   ├── ChannelForm.tsx     # Dynamic fields per channel
│   │   ├── StatusBadge.tsx
│   │   ├── AttemptTimeline.tsx
│   │   ├── MetricsCards.tsx
│   │   ├── NotificationTable.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorBanner.tsx
│   │   └── ConnectionBanner.tsx  # WS disconnected
│   ├── lib/
│   │   └── query-keys.ts
│   ├── App.tsx
│   └── main.tsx
├── .env.example
└── package.json
```

---

## 3. Routing

| Path                 | Page          | Purpose                                    |
| -------------------- | ------------- | ------------------------------------------ |
| `/`                  | Overview      | Metrics + system health at a glance        |
| `/notifications`     | Notifications | Paginated list with filters                |
| `/notifications/:id` | Detail        | Status, payload, attempt timeline, actions |
| `/dlq`               | DLQ           | Failed notifications awaiting ops action   |
| `/send`              | Send test     | Manual submission demo panel               |

No auth on dashboard (v1). Document in UI footer: "Demo only — production would require auth."

---

## 4. Pages & features

### 4.1 Overview (`/`)

**Data:** `GET /v1/metrics`

**UI:**

- Status count cards: queued, processing, delivered, failed, in_dlq
- DLQ depth highlight (alert styling if > 0)
- Last 24h: submitted, delivered, failed, rate-limit hits
- By-channel breakdown (email / sms / push)
- Average delivery latency

**Live updates:** `metrics.updated` WebSocket event → invalidate or patch query cache

---

### 4.2 Notifications list (`/notifications`)

**Data:** `GET /v1/notifications?offset=&limit=20&status=&channel=&apiKeyId=`

**UI:**

- Table columns: ID (truncated), API client label, channel, recipient, status, created, updated
- Filters: API key dropdown, channel select, status select
- Offset pagination (prev / next)
- Row click → detail page

**Live updates:** `notification.created` → prepend or invalidate list; `notification.updated` → invalidate affected rows

---

### 4.3 Notification detail (`/notifications/:id`)

**Data:** `GET /v1/notifications/:id`

**UI:**

- Header: status badge, channel, recipient, correlation ID
- Payload section (formatted JSON)
- Timestamps: created, delivered, deliverAt (if scheduled)
- **Attempt timeline** — primary demo asset:
  - Attempt number, outcome, latency, error message, timestamp
  - Visual distinction: success (green), failure (red), timeout (amber)
- Actions (conditional):
  - **Replay** — visible if status `failed` or `in_dlq` → `POST .../replay`
  - **Discard** — visible if status `in_dlq` → `POST .../discard`

**Live updates:** `notification.updated` for this ID → refetch detail

---

### 4.4 DLQ (`/dlq`)

**Data:** `GET /v1/notifications?status=in_dlq&...`

**UI:**

- Same table as notifications list, pre-filtered to `in_dlq`
- Quick actions per row: Replay, Discard, View detail
- Empty state: "All clear — no messages in DLQ"

---

### 4.5 Send test (`/send`)

**Purpose:** Replace Postman for Loom demo; exercises real API with real auth headers.

**Data:**

- `GET /v1/api-keys` — populate API key dropdown
- `POST /v1/notifications` — submit with selected key

**UI:**

- **API key dropdown** — label + tier badge (Free / Pro)
- **Channel select** — email | sms | push
- **Dynamic form** (ChannelForm):
  - Email: recipient, subject, body
  - SMS: recipient, body
  - Push: recipient (device token), title, body
- Optional: `deliverAt` datetime picker
- Optional: `webhookUrl` text input
- **Idempotency-Key** — auto-generated UUID, editable (for duplicate demo)
- Submit button
- Response panel:
  - 202: notification ID, link to detail
  - 429: show `Retry-After` countdown
  - 401 / 400: error message

**Important:** Send panel calls the **real** API with `Authorization: Bearer <selectedKey>`. Do not use a proxy that bypasses auth.

---

## 5. WebSocket integration

### Connection

```typescript
// VITE_WS_URL defaults to same host as API
const socket = io(VITE_WS_URL, { path: '/socket.io' });
socket.emit('join', 'ops');
```

### Events

| Event                  | Action                                                                |
| ---------------------- | --------------------------------------------------------------------- |
| `notification.created` | Invalidate `['notifications']`, optionally `['metrics']`              |
| `notification.updated` | Invalidate `['notifications']`, `['notification', id]`, `['metrics']` |
| `metrics.updated`      | Set query data for `['metrics']` directly                             |

### Fallback

If WebSocket disconnects:

- Show `ConnectionBanner`: "Live updates paused — reconnecting…"
- TanStack Query `refetchInterval: 10000` on metrics + list while disconnected
- On reconnect: refetch all active queries

---

## 6. TanStack Query keys

```typescript
export const queryKeys = {
  metrics: ['metrics'] as const,
  apiKeys: ['apiKeys'] as const,
  notifications: (filters: NotificationFilters) =>
    ['notifications', filters] as const,
  notification: (id: string) => ['notification', id] as const,
};
```

Stale time: 0 for ops dashboard (WS drives freshness); gcTime default.

---

## 7. API client

### Config

```bash
# apps/web/.env.example
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

### Client pattern

```typescript
async function apiFetch(
  path: string,
  options?: RequestInit & { apiKey?: string },
) {
  const headers = new Headers(options?.headers);
  if (options?.apiKey) {
    headers.set('Authorization', `Bearer ${options.apiKey}`);
  }
  // ...
}
```

Send test passes `apiKey` from dropdown. List/detail/metrics GETs rely on `DEMO_MODE=true` on the backend (no auth header needed locally). See [backend-plan.md §4](./backend-plan.md#4-api-endpoints) and §16 below.

---

## 8. Empty & error states

| Scenario         | Component        | Message / behavior                        |
| ---------------- | ---------------- | ----------------------------------------- |
| No notifications | EmptyState       | "No notifications yet" + CTA → Send test  |
| DLQ empty        | EmptyState       | "All clear"                               |
| 429 on send      | Inline error     | Show retry countdown from `Retry-After`   |
| 401 invalid key  | Inline error     | "Invalid API key"                         |
| Network error    | ErrorBanner      | Retry button                              |
| WS disconnected  | ConnectionBanner | Polling fallback active                   |
| Replay success   | Toast            | "Notification re-queued" + link to detail |
| Discard success  | Toast            | "Notification discarded"                  |

---

## 9. Status badge colors

| Status           | Visual         |
| ---------------- | -------------- |
| accepted, queued | neutral / blue |
| processing       | pulsing / blue |
| delivered        | green          |
| failed           | orange         |
| in_dlq           | red            |
| discarded        | gray           |

---

## 10. CORS

Backend sets `CORS_ORIGIN` to web dev server (`http://localhost:5173`) and production Vercel URL. No extra frontend config beyond API URL env vars.

---

## 11. Demo script (Loom — ~3 min)

1. **Overview** — show empty/low metrics
2. **Send test** — Pro key, email → watch live update on list → detail → delivered + attempt timeline
3. **Duplicate key** — resubmit same Idempotency-Key → same notification ID
4. **Rate limit** — Free key, rapid SMS sends → 429 with countdown
5. **Failure path** — send until mock failure → watch retries in timeline → in_dlq
6. **DLQ replay** — replay → delivered
7. **Scheduled send** — deliverAt 1 min future → show queued → delivered after delay
8. **Webhook** — optional: show webhook URL hit in logs or mock echo endpoint
9. **Two workers** — mention parallel processing in README / backend logs

---

## 12. Deployment (Vercel)

- Connect `apps/web` as Vercel project root (or monorepo app path)
- Env: `VITE_API_URL`, `VITE_WS_URL` → Railway API public URL
- Ensure Railway API allows Vercel origin in CORS

WebSocket on Railway: confirm Socket.io works on same service as API (no separate WS URL unless needed).

---

## 13. Build phases

| Week  | Deliverable                                                           |
| ----- | --------------------------------------------------------------------- |
| **1** | Vite scaffold, routing, API client, Send test page + API key dropdown |
| **2** | Notifications list + pagination + filters                             |
| **3** | Detail page + attempt timeline + replay/discard                       |
| **4** | Overview metrics, DLQ page, Socket.io live updates                    |
| **5** | Empty/error states, polish, Vercel deploy, Loom recording             |

---

## 14. Testing

| Tool                | Focus                                                |
| ------------------- | ---------------------------------------------------- |
| Vitest + RTL        | StatusBadge, AttemptTimeline, ChannelForm validation |
| Optional Playwright | Send flow smoke test against local API               |

Minimum: component tests for dynamic channel form and status display.

---

## 15. Learning ownership (AI guidance)

Implement yourself:

- WebSocket → TanStack Query invalidation wiring
- Send test form with real Authorization header
- Attempt timeline from API data

AI-assisted OK:

- Table layout, pagination UI, toast library wiring, routing scaffold

---

## 16. Dashboard read auth (v1)

Backend allows unauthenticated GET requests when `DEMO_MODE=true` (local dev only). POST (send test) always uses a real API key from the dropdown. Production deploy: set `DEMO_MODE=false` and add admin auth (v2).
