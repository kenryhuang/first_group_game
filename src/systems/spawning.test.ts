import { describe, expect, it } from "vitest";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  getBossSpawnPosition,
  getNodeWorldPosition,
  getSpawnPositionAroundPlayer,
} from "./spawning";

describe("spawning", () => {
  it("expands the playable map to at least ten times the original prototype area", () => {
    const originalArea = 1180 * 600;
    expect(MAP_WIDTH * MAP_HEIGHT).toBeGreaterThanOrEqual(originalArea * 10);
  });

  it("uses a 10000 by 10000 city-scale map", () => {
    expect(MAP_WIDTH).toBe(10000);
    expect(MAP_HEIGHT).toBe(10000);
  });

  it("spawns enemies around the player while staying inside map bounds", () => {
    const spawn = getSpawnPositionAroundPlayer({ x: 2048, y: 2048 }, 0);
    const distance = Math.hypot(spawn.x - 2048, spawn.y - 2048);

    expect(distance).toBeGreaterThanOrEqual(380);
    expect(distance).toBeLessThanOrEqual(620);
    expect(spawn.x).toBeGreaterThanOrEqual(0);
    expect(spawn.x).toBeLessThanOrEqual(MAP_WIDTH);
    expect(spawn.y).toBeGreaterThanOrEqual(0);
    expect(spawn.y).toBeLessThanOrEqual(MAP_HEIGHT);
  });

  it("places Bosses near the player but inside the map", () => {
    const spawn = getBossSpawnPosition({ x: 120, y: 120 }, "chef");

    expect(spawn.x).toBeGreaterThanOrEqual(0);
    expect(spawn.x).toBeLessThanOrEqual(MAP_WIDTH);
    expect(spawn.y).toBeGreaterThanOrEqual(0);
    expect(spawn.y).toBeLessThanOrEqual(MAP_HEIGHT);
  });

  it("keeps Boss spawn positions near the starting district", () => {
    const player = { x: 2048, y: 2048 };

    for (const bossId of ["chef", "clown", "courier"] as const) {
      const spawn = getBossSpawnPosition(player, bossId);
      const distance = Math.hypot(spawn.x - player.x, spawn.y - player.y);

      expect(distance).toBeLessThanOrEqual(1500);
    }
  });

  it("moves existing compact map nodes into the large world near the start area", () => {
    const position = getNodeWorldPosition({ x: 220, y: 180 });

    expect(position.x).toBeGreaterThan(1000);
    expect(position.x).toBeLessThan(3200);
    expect(position.y).toBeGreaterThan(1000);
    expect(position.y).toBeLessThan(3200);
  });
});
