import cors from "cors";
import express from "express";
import { PROJECT_NAME } from "@relay/shared";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/ready", (_req, res) => {
  res.json({
    status: "ok",
    postgres: false,
    redis: false,
    note: "Infrastructure checks will be wired in Week 1",
  });
});

app.get("/", (_req, res) => {
  res.json({
    name: PROJECT_NAME,
    message: "Relay API — scaffold running",
    docs: "/docs (coming soon)",
  });
});

app.listen(port, () => {
  console.log(
    `[relay] ${PROJECT_NAME} API listening on http://localhost:${port}`
  );
});
