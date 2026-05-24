import { BOSS_ORDER, SKILLS, SKILL_UPGRADES } from "../data/prototypeData";
import type { RunState } from "../domain/types";
import { getEndgameUltimateDefinition, isEndgameReady } from "../systems/endgame";
import { getPollutionBand, getPollutionTotals } from "../systems/pollution";
import { getCompletedSkillUpgradeCount, getKillsRequiredForSkillChoice } from "../systems/skillChoices";

function getMechFormName(formId: NonNullable<RunState["selectedMechFormId"]>): string {
  if (formId === "laser") return "激光形态";
  if (formId === "missile") return "导弹形态";
  return "大刀形态";
}

export function createHudLines(state: RunState): string[] {
  const pollution = getPollutionTotals(state);
  const band = getPollutionBand(pollution.total);
  const activeHunterName = BOSS_ORDER.find((boss) => boss.id === state.bossPressure.activeHunterId)?.name ?? "无";
  const skillNames = state.activeSkillIds
    .map((id) => SKILLS.find((skill) => skill.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const upgradeNames = Object.entries(state.skillUpgradeRanks)
    .map(([id, rank]) => {
      const name = SKILL_UPGRADES.find((upgrade) => upgrade.id === id)?.name;
      return name ? `${name} Lv${rank}` : undefined;
    })
    .filter((name): name is string => Boolean(name));
  const pendingChoice = state.pendingSkillChoiceIds.length > 0 ? "  待选择" : "";
  const requiredKills = getKillsRequiredForSkillChoice(getCompletedSkillUpgradeCount(state.skillUpgradeRanks));

  const mechFormLine = state.selectedMechFormId
    ? `最终形态 ${getMechFormName(state.selectedMechFormId)}  R 释放终极技`
    : state.pendingMechFormIds.length > 0
      ? `最终形态 待选择：${state.pendingMechFormIds.map(getMechFormName).join(" / ")}`
      : undefined;
  const endgameLine =
    state.selectedMechFormId && isEndgameReady(state)
      ? `终局大招 T ${getEndgameUltimateDefinition(state.selectedMechFormId).name}`
      : undefined;

  const lines = [
    `Lv ${state.level}  HP ${state.health}/${state.maxHealth}  EXP ${state.experience}`,
    `污染 ${pollution.total}  阶段 ${state.stagePollution}  状态 ${band.label}`,
    `追杀 ${activeHunterName}  已击杀 ${state.killedBossIds.length}/3  线索 ${state.discoveredBossClues.length}`,
    `技能 ${skillNames.join(" / ") || "无"}`,
    `击杀强化 ${state.killsTowardSkillChoice}/${requiredKills}${pendingChoice}  ${upgradeNames.join(" / ") || "暂无强化"}`,
  ];
  if (mechFormLine) {
    lines.push(mechFormLine);
  }
  if (endgameLine) {
    lines.push(endgameLine);
  }
  return lines;
}
