import { describe, expect, it } from "vitest";
import {
  applyRunDamage,
  chooseRunSkillUpgrade,
  createRunState,
  collectNode,
  gainRunExperience,
  killRunBoss,
  recordRunEnemyKill,
  useRunSkill,
} from "./runState";
import { KILLS_PER_SKILL_CHOICE } from "./skillChoices";

describe("run state", () => {
  it("starts as an ordinary survivor with no out-of-run growth", () => {
    const state = createRunState();
    expect(state.level).toBe(1);
    expect(state.health).toBe(100);
    expect(state.activeSkillIds).toEqual(["cleaver-dash"]);
    expect(state.killedBossIds).toEqual([]);
    expect(state.specialItemIds).toEqual([]);
  });

  it("collecting a node can add skills, fragments, clues, and pollution", () => {
    const state = collectNode(createRunState(), "greasy-kitchen");
    expect(state.level).toBe(2);
    expect(state.experience).toBe(0);
    expect(state.activeSkillIds).toContain("oil-flame");
    expect(state.discoveredBossClues).toContain("chef");
    expect(state.temporaryPollution).toBe(4);
  });

  it("level milestones trigger Boss pressure", () => {
    const state = gainRunExperience(createRunState(), 630);
    expect(state.level).toBe(10);
    expect(state.bossPressure.activeHunterId).toBe("chef");
  });

  it("Boss kill adds special item and stage pollution", () => {
    const state = killRunBoss(createRunState(), "chef");
    expect(state.killedBossIds).toEqual(["chef"]);
    expect(state.specialItemIds).toEqual(["flesh-recipe"]);
    expect(state.stagePollution).toBe(15);
  });

  it("skill use adds temporary pollution", () => {
    const state = useRunSkill(createRunState(), "cleaver-dash");
    expect(state.temporaryPollution).toBe(3);
  });

  it("applies incoming damage to the player without going below zero", () => {
    const damaged = applyRunDamage(createRunState(), 18);
    expect(damaged.health).toBe(82);

    const defeated = applyRunDamage(damaged, 200);
    expect(defeated.health).toBe(0);
  });

  it("opens a three-choice skill upgrade after enough enemy kills", () => {
    let state = createRunState();
    for (let index = 0; index < KILLS_PER_SKILL_CHOICE; index += 1) {
      state = recordRunEnemyKill(state, () => 0);
    }

    expect(state.enemyKills).toBe(KILLS_PER_SKILL_CHOICE);
    expect(state.pendingSkillChoiceIds).toHaveLength(3);

    const upgraded = chooseRunSkillUpgrade(state, state.pendingSkillChoiceIds[0]);
    expect(upgraded.pendingSkillChoiceIds).toEqual([]);
    expect(upgraded.skillUpgradeRanks[state.pendingSkillChoiceIds[0]]).toBe(1);
  });
});
