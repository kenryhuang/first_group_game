import { describe, expect, it } from "vitest";
import { createRunState } from "../systems/runState";
import { createHudLines } from "./hud";

describe("hud", () => {
  it("summarizes level, health, pollution, Boss pressure, and loadout", () => {
    const lines = createHudLines({
      ...createRunState(),
      level: 10,
      health: 84,
      temporaryPollution: 12,
      bossPressure: {
        activeHunterId: "chef",
        pendingBossIds: [],
        killedBossIds: [],
        triggeredMilestones: [10],
        resolvedMilestones: [],
      },
    });
    expect(lines[0]).toContain("Lv 10");
    expect(lines[1]).toContain("污染 12");
    expect(lines[2]).toContain("追杀 变异厨师");
    expect(lines[3]).toContain("技能 菜刀冲刺");
  });
});
