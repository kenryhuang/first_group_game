import { describe, expect, it } from "vitest";
import request from "supertest";
import { createServerApp } from "./index";

describe("server health contract", () => {
  it("reports the selected backend stack", async () => {
    const app = createServerApp();
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      backend: "express",
      database: "postgresql-or-mysql",
      redis: "leaderboards-cache",
      websocket: "optional",
    });
  });
});
