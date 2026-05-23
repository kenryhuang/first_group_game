import { describe, expect, it } from "vitest";
import {
  AUTO_WEAPON_DEFINITIONS,
  getActiveAutoWeapons,
  getAutoWeaponDamage,
  isAutoWeaponReady,
} from "./autoWeapons";

describe("auto weapons", () => {
  it("unlocks heavy automatic weapons from skill upgrade ranks", () => {
    const active = getActiveAutoWeapons({
      "missile-pod": 1,
      "orbital-flak": 0,
      "micro-missiles": 2,
    });

    expect(active.map((weapon) => weapon.id)).toEqual(["missile-pod", "micro-missiles"]);
  });

  it("uses distinct cooldown profiles for area, precise, and swarm fire", () => {
    const missile = AUTO_WEAPON_DEFINITIONS.find((weapon) => weapon.id === "missile-pod");
    const flak = AUTO_WEAPON_DEFINITIONS.find((weapon) => weapon.id === "orbital-flak");
    const swarm = AUTO_WEAPON_DEFINITIONS.find((weapon) => weapon.id === "micro-missiles");

    expect(missile?.mode).toBe("area");
    expect(flak?.mode).toBe("precise");
    expect(swarm?.mode).toBe("swarm");
    expect(flak?.priority).toBe("boss");
    expect(swarm?.burstCount).toBeGreaterThan(1);
  });

  it("scales weapon damage by upgrade rank and checks readiness", () => {
    const missile = AUTO_WEAPON_DEFINITIONS.find((weapon) => weapon.id === "missile-pod")!;

    expect(isAutoWeaponReady(missile, missile.cooldownMs - 1)).toBe(false);
    expect(isAutoWeaponReady(missile, missile.cooldownMs)).toBe(true);
    expect(getAutoWeaponDamage(missile, 3)).toBeGreaterThan(getAutoWeaponDamage(missile, 1));
  });
});
