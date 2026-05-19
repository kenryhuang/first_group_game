import cors from "cors";
import express, { type Express } from "express";

export function createServerApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({
      ok: true,
      backend: "express",
      database: "postgresql-or-mysql",
      redis: "leaderboards-cache",
      websocket: "optional",
    });
  });

  app.get("/leaderboard", (_request, response) => {
    response.json({
      source: "redis-ready",
      entries: [],
    });
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 3000);
  createServerApp().listen(port, "127.0.0.1", () => {
    console.log(`API server listening at http://127.0.0.1:${port}`);
  });
}
