import { NOTIFICATION_CHANNELS, PROJECT_NAME } from "@relay/shared";
import { useQuery } from "@tanstack/react-query";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function fetchHealth() {
  const res = await fetch(`${apiUrl}/health`);
  if (!res.ok) throw new Error("API unreachable");
  return res.json() as Promise<{ status: string }>;
}

export function App() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    retry: false,
  });

  return (
    <main className="app">
      <h1>{PROJECT_NAME}</h1>
      <p>Notification engine — monorepo scaffold</p>

      <section className="card">
        <h2>API status</h2>
        {health.isLoading && <p>Checking…</p>}
        {health.isError && (
          <p className="error">
            API offline — run <code>pnpm dev:server</code>
          </p>
        )}
        {health.isSuccess && <p className="ok">API {health.data.status}</p>}
      </section>

      <section className="card">
        <h2>Channels (from @relay/shared)</h2>
        <ul>
          {NOTIFICATION_CHANNELS.map((channel) => (
            <li key={channel}>{channel}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
