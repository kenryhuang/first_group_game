import { BOSS_ORDER, SKILLS } from "../data/prototypeData";
import type { RunState } from "../domain/types";
import { getPollutionBand, getPollutionTotals } from "../systems/pollution";

export function createHudLines(state: RunState): string[] {
  const pollution = getPollutionTotals(state);
  const band = getPollutionBand(pollution.total);
  const activeHunterName = BOSS_ORDER.find((boss) => boss.id === state.bossPressure.activeHunterId)?.name ?? "无";
  const skillNames = state.activeSkillIds
    .map((id) => SKILLS.find((skill) => skill.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  return [
    `Lv ${state.level}  HP ${state.health}/${state.maxHealth}  EXP ${state.experience}`,
    `污染 ${pollution.total}  阶段 ${state.stagePollution}  状态 ${band.label}`,
    `追杀 ${activeHunterName}  已击杀 ${state.killedBossIds.length}/3  线索 ${state.discoveredBossClues.length}`,
    `技能 ${skillNames.join(" / ") || "无"}`,
  ];
}
