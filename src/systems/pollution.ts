import { PLAYER_BASELINE } from "../data/prototypeData";
import type { PollutionBand, PollutionState, PollutionTotals } from "../domain/types";

export function getPollutionTotals(state: PollutionState): PollutionTotals {
  const total = state.passiveLoad + state.temporaryPollution + state.stagePollution;
  return {
    ...state,
    total,
    overSafeLoad: state.passiveLoad > PLAYER_BASELINE.safePollutionLoad,
  };
}

export function getPollutionBand(total: number): PollutionBand {
  if (total <= 50) {
    return band("calm", 1, 1, 1, 1, false, false, false);
  }
  if (total <= 100) {
    return band("charged", 1.1, 1, 1.1, 1, false, false, false);
  }
  if (total <= 150) {
    return band("unstable", 1.2, 0.9, 1.1, 1.15, false, false, false);
  }
  if (total <= 200) {
    return band("dangerous", 1.35, 0.82, 1.3, 1.25, true, false, true);
  }
  return band("overrun", 1.5, 0.75, 1.45, 1.4, true, true, true);
}

export function tickTemporaryPollution(current: number, elapsedMs: number): number {
  const decay = elapsedMs / 1000;
  return Math.max(0, Math.round((current - decay) * 100) / 100);
}

function band(
  label: PollutionBand["label"],
  damageMultiplier: number,
  cooldownMultiplier: number,
  monsterSenseMultiplier: number,
  hordeDensityMultiplier: number,
  eventDanger: boolean,
  fakeResourcePoints: boolean,
  bossEmpowered: boolean,
): PollutionBand {
  return {
    label,
    damageMultiplier,
    cooldownMultiplier,
    monsterSenseMultiplier,
    hordeDensityMultiplier,
    eventDanger,
    fakeResourcePoints,
    bossEmpowered,
  };
}
