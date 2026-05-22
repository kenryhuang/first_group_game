import { describe, expect, it } from "vitest";
import { BOSS_ORDER } from "../data/prototypeData";
import { BOSS_VISUAL_THEMES, ZOMBIE_ENEMY_THEME } from "./enemyVisuals";

describe("enemy visuals", () => {
  it("gives small enemies a readable top-down zombie theme", () => {
    expect(ZOMBIE_ENEMY_THEME.kind).toBe("top-down-zombie");
    expect(ZOMBIE_ENEMY_THEME.bodyColor).not.toBe(ZOMBIE_ENEMY_THEME.bloodColor);
  });

  it("defines a distinct visual theme for every current Boss", () => {
    const bossIds = BOSS_ORDER.map((boss) => boss.id);
    expect(Object.keys(BOSS_VISUAL_THEMES).sort()).toEqual([...bossIds].sort());
    expect(new Set(Object.values(BOSS_VISUAL_THEMES).map((theme) => theme.accentColor)).size).toBe(bossIds.length);
  });
});
