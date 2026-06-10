export const BEASTMASTER_ZOMBIE_SIEGE_COUNT = 23;
export const BEASTMASTER_HOUND_COUNT = 10;
export const BEASTMASTER_HOUND_HEALTH = 8;
export const BEASTMASTER_HOUND_SPEED = 260;
export const BEASTMASTER_INVULNERABLE_MS = 5000;
export const BEASTMASTER_STAMPEDE_SPEED = 1500;
export const BEASTMASTER_FRENZY_HEALTH_RATIO = 0.35;
export const BEASTMASTER_TOTAL_FRENZY_COUNT = 50;
export const BEASTMASTER_TOTAL_FRENZY_HEALTH = 50;
export const BEASTMASTER_TOTAL_FRENZY_SPEED = 116;

export function shouldTriggerBeastmasterFrenzy({
  health,
  maxHealth,
  frenzyUsed,
}: {
  health: number;
  maxHealth: number;
  frenzyUsed: boolean;
}): boolean {
  return !frenzyUsed && health / maxHealth <= BEASTMASTER_FRENZY_HEALTH_RATIO;
}
