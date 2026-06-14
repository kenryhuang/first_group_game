import { describe, expect, it } from "vitest";
import * as magicianRules from "./magician";
import {
  MAGICIAN_FINALE_CURTAIN_CALL_MS,
  MAGICIAN_FINALE_REVEALED_CURTAIN_CALL_MS,
  MAGICIAN_MIRROR_ORBIT_SPEED,
  MAGICIAN_MIRROR_SHARD_COUNT,
  MAGICIAN_MIRROR_SHARD_SPEED,
  MAGICIAN_REVEALED_CURTAIN_CALL_MS,
  MAGICIAN_SPOTLIGHT_CHOOSE_MS,
  MAGICIAN_SPOTLIGHT_FALSE_BLAST_RADIUS,
  MAGICIAN_SPOTLIGHT_ORBIT_ROUNDS,
  MAGICIAN_SPOTLIGHT_STAGE_RADIUS,
  MAGICIAN_STANDARD_CURTAIN_CALL_MS,
  STORY_MAGICIAN_INTERFERENCE_COOLDOWN_MS,
  STORY_MAGICIAN_INTERFERENCE_CURTAIN_COUNT,
  STORY_MAGICIAN_REMOTE_MIRROR_COUNT,
  STORY_MAGICIAN_REMOTE_MIRROR_BREAKS_INTO,
  createMagicianCurtains,
  createMagicianHatMaze,
  createMagicianMirrorHall,
  createMagicianSpotlights,
  getMagicianCurtainCallMs,
} from "./magician";

describe("magician stage rules", () => {
  it("creates true and false curtains with stable visual tells", () => {
    const curtains = createMagicianCurtains(3);

    expect(curtains).toHaveLength(9);
    expect(curtains.some((curtain) => curtain.kind === "solid")).toBe(true);
    expect(curtains.some((curtain) => curtain.kind === "illusion")).toBe(true);
    expect(Math.min(...curtains.map((curtain) => curtain.lane))).toBe(-4);
    expect(Math.max(...curtains.map((curtain) => curtain.lane))).toBe(4);
    expect(curtains.filter((curtain) => curtain.kind === "solid").every((curtain) => curtain.tell === "gold-edge")).toBe(true);
    expect(curtains.filter((curtain) => curtain.kind === "illusion").every((curtain) => curtain.tell === "soft-edge")).toBe(true);
  });

  it("creates rotating spotlights that hide the safe choice until the final selection", () => {
    const spotlights = createMagicianSpotlights(5);

    expect(MAGICIAN_SPOTLIGHT_ORBIT_ROUNDS).toBe(2);
    expect(MAGICIAN_SPOTLIGHT_CHOOSE_MS).toBe(8000);
    expect(MAGICIAN_SPOTLIGHT_STAGE_RADIUS).toBeGreaterThanOrEqual(220);
    expect(MAGICIAN_SPOTLIGHT_FALSE_BLAST_RADIUS).toBeGreaterThanOrEqual(180);
    expect(spotlights).toHaveLength(7);
    expect(spotlights.filter((spotlight) => spotlight.safe).length).toBe(1);
    expect(spotlights.every((spotlight) => spotlight.preRevealTell === "same-stage-light")).toBe(true);
    expect(spotlights.find((spotlight) => spotlight.safe)?.finalTell).toBe("steady-core");
    expect(spotlights.filter((spotlight) => !spotlight.safe).every((spotlight) => spotlight.finalTell === "faint-purple-flicker")).toBe(true);
  });

  it("creates a hat maze with exactly one real hat", () => {
    const hats = createMagicianHatMaze(8);

    expect(hats).toHaveLength(5);
    expect(hats.filter((hat) => hat.real).length).toBe(1);
    expect(hats.find((hat) => hat.real)?.reward).toBe("extended-curtain-call");
    expect(hats.filter((hat) => !hat.real).every((hat) => hat.punishment === "minor-blast")).toBe(true);
  });

  it("creates mirror hall clones with exactly one true body", () => {
    const bodies = createMagicianMirrorHall(11);

    expect(bodies).toHaveLength(5);
    expect(MAGICIAN_MIRROR_ORBIT_SPEED).toBeGreaterThan(0);
    expect(bodies.filter((body) => body.real).length).toBe(1);
    expect(bodies.find((body) => body.real)?.tell).toBe("shadow-ring");
    expect(bodies.find((body) => body.real)?.revealReward).toBe("boss-teleport");
    expect(bodies.filter((body) => !body.real).every((body) => body.breaksInto === "radial-shards")).toBe(true);
    expect(bodies.every((body) => Math.abs(body.orbitDirection) === 1)).toBe(true);
    expect(bodies.every((body) => body.orbitOffset > 0)).toBe(true);
    expect(MAGICIAN_MIRROR_SHARD_COUNT).toBeGreaterThanOrEqual(12);
    expect(MAGICIAN_MIRROR_SHARD_SPEED).toBeGreaterThan(400);
  });

  it("defines curtain call windows for normal, revealed, finale, and broken finale states", () => {
    expect(MAGICIAN_STANDARD_CURTAIN_CALL_MS).toBe(2500);
    expect(MAGICIAN_REVEALED_CURTAIN_CALL_MS).toBe(4500);
    expect(MAGICIAN_FINALE_CURTAIN_CALL_MS).toBe(6000);
    expect(MAGICIAN_FINALE_REVEALED_CURTAIN_CALL_MS).toBe(8000);
    expect(getMagicianCurtainCallMs("standard")).toBe(2500);
    expect(getMagicianCurtainCallMs("revealed")).toBe(4500);
    expect(getMagicianCurtainCallMs("finale")).toBe(6000);
    expect(getMagicianCurtainCallMs("finale-revealed")).toBe(8000);
  });

  it("defines story-mode remote interference without curtains", () => {
    expect(STORY_MAGICIAN_INTERFERENCE_COOLDOWN_MS).toBeLessThanOrEqual(1800);
    expect(STORY_MAGICIAN_INTERFERENCE_CURTAIN_COUNT).toBe(0);
    expect(STORY_MAGICIAN_REMOTE_MIRROR_COUNT).toBe(2);
    expect(STORY_MAGICIAN_REMOTE_MIRROR_BREAKS_INTO).toBe("radial-shards");
  });

  it("makes story-mode remote mirrors actively dangerous", () => {
    const rules = magicianRules as unknown as Record<string, number>;

    expect(rules.STORY_MAGICIAN_REMOTE_MIRROR_ATTACK_COOLDOWN_MS).toBeLessThanOrEqual(1100);
    expect(rules.STORY_MAGICIAN_REMOTE_MIRROR_PROJECTILE_SPEED).toBeGreaterThanOrEqual(520);
    expect(rules.STORY_MAGICIAN_REMOTE_MIRROR_PROJECTILE_DAMAGE).toBeGreaterThanOrEqual(6);
    expect(rules.STORY_MAGICIAN_REMOTE_MIRROR_PROXIMITY_BURST_RADIUS).toBeGreaterThanOrEqual(96);
  });
});
