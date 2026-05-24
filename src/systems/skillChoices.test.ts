import { describe, expect, it } from "vitest";
import {
  KILLS_PER_SKILL_CHOICE,
  applySkillUpgrade,
  createSkillChoiceProgress,
  getCompletedSkillUpgradeCount,
  getKillsRequiredForSkillChoice,
  getSkillUpgradeStats,
  recordSkillChoiceKill,
  rollSkillChoices,
} from "./skillChoices";

describe("skill choices", () => {
  it("offers three random upgrade choices after the kill threshold", () => {
    let progress = createSkillChoiceProgress();
    for (let index = 0; index < KILLS_PER_SKILL_CHOICE - 1; index += 1) {
      progress = recordSkillChoiceKill(progress, () => 0);
    }

    expect(progress.enemyKills).toBe(KILLS_PER_SKILL_CHOICE - 1);
    expect(progress.pendingSkillChoiceIds).toEqual([]);

    progress = recordSkillChoiceKill(progress, () => 0);

    expect(progress.enemyKills).toBe(KILLS_PER_SKILL_CHOICE);
    expect(progress.killsTowardSkillChoice).toBe(0);
    expect(progress.pendingSkillChoiceIds).toHaveLength(3);
    expect(new Set(progress.pendingSkillChoiceIds).size).toBe(3);
  });

  it("does not roll another choice while one is waiting", () => {
    const progress = {
      ...createSkillChoiceProgress(),
      enemyKills: KILLS_PER_SKILL_CHOICE,
      killsTowardSkillChoice: 0,
      pendingSkillChoiceIds: rollSkillChoices({}, () => 0),
    };

    const next = recordSkillChoiceKill(progress, () => 0.8);

    expect(next.enemyKills).toBe(KILLS_PER_SKILL_CHOICE + 1);
    expect(next.killsTowardSkillChoice).toBe(0);
    expect(next.pendingSkillChoiceIds).toEqual(progress.pendingSkillChoiceIds);
  });

  it("raises the kill threshold only after skill upgrades are selected", () => {
    expect(getKillsRequiredForSkillChoice(0)).toBe(15);
    expect(getKillsRequiredForSkillChoice(1)).toBe(16);
    expect(getKillsRequiredForSkillChoice(2)).toBe(18);
    expect(getKillsRequiredForSkillChoice(3)).toBe(21);
    expect(getCompletedSkillUpgradeCount({ "focus-laser": 2, "missile-pod": 1 })).toBe(3);

    let progress = createSkillChoiceProgress();
    const required = getKillsRequiredForSkillChoice(getCompletedSkillUpgradeCount(progress.skillUpgradeRanks));
    for (let index = 0; index < required - 1; index += 1) {
      progress = recordSkillChoiceKill(progress, () => 0, required);
    }

    expect(progress.pendingSkillChoiceIds).toEqual([]);
    progress = recordSkillChoiceKill(progress, () => 0, required);
    expect(progress.pendingSkillChoiceIds).toHaveLength(3);
  });

  it("applies a selected upgrade rank and exposes cumulative stats", () => {
    const first = applySkillUpgrade(createSkillChoiceProgress(), "firepower-core");
    const second = applySkillUpgrade(first, "firepower-core");

    expect(second.skillUpgradeRanks["firepower-core"]).toBe(2);
    expect(second.pendingSkillChoiceIds).toEqual([]);
    expect(getSkillUpgradeStats(second.skillUpgradeRanks).basicDamageBonus).toBe(2);
  });
});
