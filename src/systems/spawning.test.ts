import { describe, expect, it } from "vitest";
import {
  ENEMY_SPAWN_TICK_MS,
  EXPERIMENTAL_DISABLE_SMALL_ENEMIES,
  MAP_HEIGHT,
  MAP_WIDTH,
  getEnemyMaxAlive,
  getEnemySpawnBatchSize,
  getBossSpawnPosition,
  getNodeWorldPosition,
  getSpawnPositionAroundPlayer,
  shouldAllowSmallEnemySpawning,
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

  it("scales each spawn wave with progress instead of flooding every second", () => {
    expect(ENEMY_SPAWN_TICK_MS).toBe(1000);
    expect(getEnemySpawnBatchSize(1, ENEMY_SPAWN_TICK_MS)).toBe(10);
    expect(getEnemySpawnBatchSize(10, ENEMY_SPAWN_TICK_MS)).toBe(19);
    expect(getEnemySpawnBatchSize(60, ENEMY_SPAWN_TICK_MS)).toBe(69);
    expect(getEnemyMaxAlive(1)).toBe(80);
    expect(getEnemyMaxAlive(60)).toBe(260);
  });

  it("uses normal small enemy spawning outside final boss testing", () => {
    expect(EXPERIMENTAL_DISABLE_SMALL_ENEMIES).toBe(false);
    expect(shouldAllowSmallEnemySpawning({ experimentalDisabled: false, finalBossActive: false })).toBe(true);
    expect(shouldAllowSmallEnemySpawning({ experimentalDisabled: false, finalBossActive: true })).toBe(false);
    expect(shouldAllowSmallEnemySpawning({ experimentalDisabled: true, finalBossActive: false })).toBe(false);
  });
});
