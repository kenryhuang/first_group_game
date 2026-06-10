import { describe, expect, it } from "vitest";
import {
  BEASTMASTER_FRENZY_HEALTH_RATIO,
  BEASTMASTER_HOUND_COUNT,
  BEASTMASTER_HOUND_HEALTH,
  BEASTMASTER_INVULNERABLE_MS,
  BEASTMASTER_STAMPEDE_SPEED,
  BEASTMASTER_TOTAL_FRENZY_COUNT,
  BEASTMASTER_TOTAL_FRENZY_HEALTH,
  BEASTMASTER_ZOMBIE_SIEGE_COUNT,
  shouldTriggerBeastmasterFrenzy,
} from "./beastmaster";
import { COURIER_LOCKED_CHARGE_SPEED } from "./bossSkills";

describe("beastmaster rules", () => {
  it("defines the requested summon and command values", () => {
    expect(BEASTMASTER_ZOMBIE_SIEGE_COUNT).toBe(23);
    expect(BEASTMASTER_HOUND_COUNT).toBe(10);
    expect(BEASTMASTER_HOUND_HEALTH).toBe(8);
    expect(BEASTMASTER_INVULNERABLE_MS).toBe(5000);
    expect(BEASTMASTER_STAMPEDE_SPEED).toBe(COURIER_LOCKED_CHARGE_SPEED / 2);
    expect(BEASTMASTER_TOTAL_FRENZY_COUNT).toBe(50);
    expect(BEASTMASTER_TOTAL_FRENZY_HEALTH).toBe(50);
  });

  it("triggers total frenzy only once below the health threshold", () => {
    expect(shouldTriggerBeastmasterFrenzy({ health: 1900, maxHealth: 5200, frenzyUsed: false })).toBe(false);
    expect(shouldTriggerBeastmasterFrenzy({ health: 1800, maxHealth: 5200, frenzyUsed: false })).toBe(true);
    expect(shouldTriggerBeastmasterFrenzy({ health: 1200, maxHealth: 5200, frenzyUsed: true })).toBe(false);
    expect(BEASTMASTER_FRENZY_HEALTH_RATIO).toBe(0.35);
  });
});
