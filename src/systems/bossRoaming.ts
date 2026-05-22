import { BOSS_ORDER } from "../data/prototypeData";
import type { BossId } from "../domain/types";

export function getInitialRoamingBossIds(): BossId[] {
  return BOSS_ORDER.map((boss) => boss.id);
}
