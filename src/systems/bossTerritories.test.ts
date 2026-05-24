import { describe, expect, it } from "vitest";
import { BOSS_ORDER } from "../data/prototypeData";
import {
  BOSS_TERRITORIES,
  getBossRoamTargetInTerritory,
  getBossTerritorySpawnPosition,
  isPointInBossTerritory,
  shouldRoamingBossTargetPlayer,
} from "./bossTerritories";

describe("boss territories", () => {
  it("defines one territory for every current Boss", () => {
    const bossIds = BOSS_ORDER.map((boss) => boss.id);

    expect(Object.keys(BOSS_TERRITORIES).sort()).toEqual([...bossIds].sort());
  });

  it("keeps Boss spawn and roam targets inside their own territory", () => {
    for (const boss of BOSS_ORDER) {
      const spawn = getBossTerritorySpawnPosition(boss.id);
      const roam = getBossRoamTargetInTerritory(boss.id, 3);

      expect(isPointInBossTerritory(boss.id, spawn)).toBe(true);
      expect(isPointInBossTerritory(boss.id, roam)).toBe(true);
    }
  });

  it("forces roaming bosses to target the player during the final boss fight", () => {
    expect(
      shouldRoamingBossTargetPlayer({
        finalBossActive: true,
        sameZoneAsPlayer: false,
        playerInTerritory: false,
        distanceToPlayer: 8000,
      }),
    ).toBe(true);
    expect(
      shouldRoamingBossTargetPlayer({
        finalBossActive: false,
        sameZoneAsPlayer: true,
        playerInTerritory: true,
        distanceToPlayer: 700,
      }),
    ).toBe(true);
    expect(
      shouldRoamingBossTargetPlayer({
        finalBossActive: false,
        sameZoneAsPlayer: true,
        playerInTerritory: false,
        distanceToPlayer: 700,
      }),
    ).toBe(false);
  });
});
