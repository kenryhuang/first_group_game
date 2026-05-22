import { describe, expect, it } from "vitest";
import {
  createProjectileState,
  projectileHitsCircle,
  updateProjectileState,
} from "./projectiles";

describe("projectiles", () => {
  it("creates a normalized projectile from origin to target", () => {
    const projectile = createProjectileState(
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      "basic",
      400,
      18,
    );

    expect(projectile.velocityX).toBe(400);
    expect(projectile.velocityY).toBe(0);
    expect(projectile.damage).toBe(18);
    expect(projectile.lifeMs).toBe(1200);
  });

  it("moves projectiles and expires them after their lifetime", () => {
    const projectile = createProjectileState(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      "basic",
      100,
      10,
    );

    const moved = updateProjectileState(projectile, 500);
    expect(moved.x).toBe(50);
    expect(moved.expired).toBe(false);

    const expired = updateProjectileState(moved, 800);
    expect(expired.expired).toBe(true);
  });

  it("detects projectile hits against circular targets", () => {
    const projectile = createProjectileState(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      "basic",
      100,
      10,
    );

    expect(projectileHitsCircle(projectile, { x: 8, y: 0, radius: 8 })).toBe(true);
    expect(projectileHitsCircle(projectile, { x: 80, y: 0, radius: 8 })).toBe(false);
  });
});
