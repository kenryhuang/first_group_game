import { describe, expect, it } from "vitest";
import { SKILL_UPGRADES } from "../data/prototypeData";
import {
  applyRunDamage,
  chooseRunMechForm,
  chooseRunSkillUpgrade,
  createExperimentalRunState,
  createBossRushDuelRunState,
  createRunState,
  collectNode,
  gainRunExperience,
  killRunBoss,
  PLAYER_INVINCIBLE_FOR_FINAL_BOSS_TESTING,
  recordRunEnemyKill,
  useRunSkill,
} from "./runState";
import { isEndgameReady } from "./endgame";
import { KILLS_PER_SKILL_CHOICE, getCompletedSkillUpgradeCount, getKillsRequiredForSkillChoice } from "./skillChoices";

describe("run state", () => {
  it("starts as an ordinary survivor with no out-of-run growth", () => {
    const state = createRunState();
    expect(state.level).toBe(1);
    expect(state.health).toBe(100);
    expect(state.activeSkillIds).toEqual([]);
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

  it("keeps the player invincible during final Boss testing", () => {
    expect(PLAYER_INVINCIBLE_FOR_FINAL_BOSS_TESTING).toBe(true);
    const damaged = applyRunDamage(createRunState(), 18);
    expect(damaged.health).toBe(100);

    const defeated = applyRunDamage(damaged, 200);
    expect(defeated.health).toBe(100);
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

  it("does not increase the next skill threshold until the player chooses an upgrade", () => {
    const leveled = {
      ...createRunState(),
      level: 12,
    };
    let state = leveled;
    for (let index = 0; index < KILLS_PER_SKILL_CHOICE; index += 1) {
      state = recordRunEnemyKill(state, () => 0);
    }

    expect(state.pendingSkillChoiceIds).toHaveLength(3);
    expect(getKillsRequiredForSkillChoice(getCompletedSkillUpgradeCount(state.skillUpgradeRanks))).toBe(15);

    const upgraded = chooseRunSkillUpgrade(state, state.pendingSkillChoiceIds[0]);
    expect(getCompletedSkillUpgradeCount(upgraded.skillUpgradeRanks)).toBe(1);
    expect(getKillsRequiredForSkillChoice(getCompletedSkillUpgradeCount(upgraded.skillUpgradeRanks))).toBe(16);
  });

  it("opens final mech form choices at level 50 and records the chosen form", () => {
    const state = gainRunExperience(
      {
        ...createRunState(),
        skillUpgradeRanks: { "focus-laser": 4, "missile-pod": 3 },
      },
      99999,
    );

    expect(state.level).toBeGreaterThanOrEqual(50);
    expect(state.pendingMechFormIds).toEqual(["laser", "missile"]);

    const chosen = chooseRunMechForm(state, "laser");
    expect(chosen.selectedMechFormId).toBe("laser");
    expect(chosen.pendingMechFormIds).toEqual([]);
  });

  it("starts mech form evolution when no skill upgrades remain to choose", () => {
    const maxedRanks = Object.fromEntries(SKILL_UPGRADES.map((upgrade) => [upgrade.id, upgrade.maxRank]));
    const level = 42;
    const requiredKills = getKillsRequiredForSkillChoice(getCompletedSkillUpgradeCount(maxedRanks));
    const state = recordRunEnemyKill(
      {
        ...createRunState(),
        level,
        killsTowardSkillChoice: requiredKills - 1,
        skillUpgradeRanks: maxedRanks,
      },
      () => 0,
    );

    expect(state.pendingSkillChoiceIds).toEqual([]);
    expect(state.pendingMechFormIds).toEqual(["laser", "missile", "blade"]);
  });

  it("can start in experimental endgame mode with every upgrade maxed", () => {
    const state = createExperimentalRunState();
    const courierDuelState = createExperimentalRunState(15);

    expect(state.level).toBe(50);
    expect(courierDuelState.level).toBe(15);
    expect(courierDuelState.baseDamage).toBeLessThan(state.baseDamage);
    expect(courierDuelState.maxHealth).toBeLessThan(state.maxHealth);
    expect(state.pendingMechFormIds).toEqual(["laser", "missile", "blade"]);
    expect(state.pendingSkillChoiceIds).toEqual([]);
    expect(state.killsTowardSkillChoice).toBe(0);
    for (const upgrade of SKILL_UPGRADES) {
      expect(state.skillUpgradeRanks[upgrade.id]).toBe(upgrade.maxRank);
    }
    expect(isEndgameReady(chooseRunMechForm(state, "laser"))).toBe(true);
  });

  it("starts Boss Rush duels with only the skills and stats for that boss level", () => {
    const chefDuel = createBossRushDuelRunState(5);
    const courierDuel = createBossRushDuelRunState(15);
    const knightDuel = createBossRushDuelRunState(20);
    const coreDuel = createBossRushDuelRunState(50);
    const maxed = createExperimentalRunState(50);

    expect(chefDuel.level).toBe(5);
    expect(chefDuel.activeSkillIds).toEqual(["cleaver-dash"]);
    expect(courierDuel.activeSkillIds).toEqual(["cleaver-dash", "balloon-barrage", "explosive-parcel"]);
    expect(knightDuel.activeSkillIds).toEqual(["cleaver-dash", "balloon-barrage", "explosive-parcel", "oil-flame"]);
    expect(coreDuel.activeSkillIds).toEqual(["cleaver-dash", "balloon-barrage", "explosive-parcel", "oil-flame"]);

    expect(chefDuel.baseDamage).toBeLessThan(courierDuel.baseDamage);
    expect(courierDuel.maxHealth).toBeLessThan(coreDuel.maxHealth);
    expect(getCompletedSkillUpgradeCount(chefDuel.skillUpgradeRanks)).toBe(0);
    expect(getCompletedSkillUpgradeCount(coreDuel.skillUpgradeRanks)).toBeGreaterThan(0);
    expect(getCompletedSkillUpgradeCount(coreDuel.skillUpgradeRanks)).toBeLessThan(getCompletedSkillUpgradeCount(maxed.skillUpgradeRanks));
    expect(coreDuel.pendingMechFormIds).toEqual(["laser", "missile", "blade"]);
  });
});
