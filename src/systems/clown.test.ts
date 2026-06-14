import { describe, expect, it } from "vitest";
import {
  CLOWN_KNIFE_BURST_COUNT,
  CLOWN_MAGIC_BOX_FREEZE_MS,
  CLOWN_SPIRAL_KNIFE_DURATION_MS,
  CLOWN_SURPRISE_SLASH_COUNT,
  CLOWN_SURPRISE_SLASH_DAMAGE,
  CLOWN_ATTACK_RANGE_IDEAL_BUFFER,
  CLOWN_ATTACK_RANGE_MAX_BUFFER,
  CLOWN_ATTACK_RANGE_MIN_BUFFER,
  getClownDistanceTarget,
  getClownKeepAwayBand,
} from "./clown";

describe("clown boss rules", () => {
  it("defines the requested clown skill values", () => {
    expect(CLOWN_MAGIC_BOX_FREEZE_MS).toBeGreaterThanOrEqual(1400);
    expect(CLOWN_KNIFE_BURST_COUNT).toBe(16);
    expect(CLOWN_SURPRISE_SLASH_COUNT).toBe(2);
    expect(CLOWN_SURPRISE_SLASH_DAMAGE).toBeGreaterThan(0);
    expect(CLOWN_SPIRAL_KNIFE_DURATION_MS).toBe(10000);
  });

  it("keeps the clown just outside the player's effective attack range", () => {
    const player = { x: 500, y: 500 };
    const attackRange = 620;
    const band = getClownKeepAwayBand(attackRange);
    const tooClose = getClownDistanceTarget({ x: player.x + attackRange - 20, y: 500 }, player, attackRange);
    const tooFar = getClownDistanceTarget({ x: player.x + band.max + 90, y: 500 }, player, attackRange);
    const ideal = getClownDistanceTarget({ x: player.x + band.ideal, y: 500 }, player, attackRange);

    expect(CLOWN_ATTACK_RANGE_MIN_BUFFER).toBe(40);
    expect(CLOWN_ATTACK_RANGE_IDEAL_BUFFER).toBe(80);
    expect(CLOWN_ATTACK_RANGE_MAX_BUFFER).toBe(160);
    expect(band).toEqual({ min: 660, ideal: 700, max: 780 });
    expect(tooClose.x).toBe(player.x + band.ideal);
    expect(tooFar.x).toBe(player.x + band.ideal);
    expect(ideal).toEqual({ x: player.x + band.ideal, y: 500 });
  });
});
