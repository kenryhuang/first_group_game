import { MAP_HEIGHT, MAP_WIDTH } from "./spawning";

export const STORY_MAP_WIDTH = MAP_WIDTH * 4;
export const STORY_MAP_HEIGHT = MAP_HEIGHT * 4;

export const STORY_FOG_BASE_RADIUS = 360;
export const STORY_FOG_LIT_RADIUS = 980;
export const STORY_LIGHTHOUSE_EFFECT_RADIUS = 2200;
export const STORY_LIGHTHOUSE_PRESSURE_BONUS = 0.85;
export const STORY_MAP_TUNING_ALL_OPEN = true;
export const STORY_DEBUG_PLAYER_SPEED_MULTIPLIER = 5;
export const STORY_DISABLE_FOG_FOR_MAP_TUNING = true;
export const STORY_DISABLE_ENCOUNTERS_FOR_MAP_TUNING = true;
export const STORY_INITIAL_UNLOCKED_BOUNDS = {
  x: STORY_MAP_WIDTH / 2,
  y: STORY_MAP_HEIGHT / 2,
  width: 5200,
  height: 4400,
};

export type StoryRegionId =
  | "central-plaza"
  | "military-zone"
  | "residential-zone"
  | "research-zone"
  | "entertainment-zone"
  | "industrial-zone";

export interface StoryRegionDefinition {
  id: StoryRegionId;
  name: string;
  towerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
}

export interface StoryRouteRules {
  startRegionId: StoryRegionId;
  firstRegionId: StoryRegionId;
  secondRegionId: StoryRegionId;
  branchRegionIds: [StoryRegionId, StoryRegionId];
  branchRequirement: "any";
  finalPrepRegionId: StoryRegionId;
  finalBossRegionId: StoryRegionId;
}

export interface StoryRegionUnlockRule {
  completedRegionId: StoryRegionId;
  unlockRegionIds: StoryRegionId[];
}

export type StoryPassageRequiredCondition =
  | "mission-start"
  | "residential-tower-cleared"
  | "entertainment-cleared"
  | "research-cleared"
  | "industrial-cleared"
  | "final-prep-authorized";

export interface StoryRegionPassage {
  id: string;
  fromRegionId: StoryRegionId;
  toRegionId: StoryRegionId;
  gateId: string;
  requiredCondition: StoryPassageRequiredCondition;
  x: number;
  y: number;
  width: number;
  height: number;
  pathRects?: StoryPassageRect[];
}

export interface StoryPassageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StoryRegionGameplayDefinition {
  role: string;
  bossLocations: Array<{
    bossId: string;
    locationId: string;
  }>;
}

export interface StoryLighthouseDefinition {
  id: string;
  name: string;
  position: { x: number; y: number };
}

export interface StoryFogRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getStoryPlayerStart(): { x: number; y: number } {
  return { x: STORY_MAP_WIDTH / 2, y: STORY_MAP_HEIGHT / 2 };
}

export const STORY_CENTER_LIGHTHOUSE: StoryLighthouseDefinition = {
  id: "story-center-lighthouse",
  name: "中心广场灯塔",
  position: { x: STORY_MAP_WIDTH / 2, y: STORY_MAP_HEIGHT / 2 - 200 },
};

export const STORY_ROUTE_RULES: StoryRouteRules = {
  startRegionId: "central-plaza",
  firstRegionId: "residential-zone",
  secondRegionId: "entertainment-zone",
  branchRegionIds: ["research-zone", "industrial-zone"],
  branchRequirement: "any",
  finalPrepRegionId: "military-zone",
  finalBossRegionId: "central-plaza",
};

export const STORY_INITIAL_UNLOCKED_REGION_IDS: StoryRegionId[] = [
  "central-plaza",
  "military-zone",
  "residential-zone",
  "research-zone",
  "entertainment-zone",
  "industrial-zone",
];

export const STORY_REGION_GAMEPLAY: Record<StoryRegionId, StoryRegionGameplayDefinition> = {
  "central-plaza": {
    role: "起点与终点",
    bossLocations: [],
  },
  "residential-zone": {
    role: "探索适应节奏，挑战低难度 Boss，升级并熟悉机甲",
    bossLocations: [
      { bossId: "chef", locationId: "res-fire-station" },
      { bossId: "courier", locationId: "res-courier-station" },
      { bossId: "plague-doctor", locationId: "res-hospital" },
    ],
  },
  "entertainment-zone": {
    role: "解密迷宫与马戏团历险，小怪较少，重点是解谜和场景机关",
    bossLocations: [
      { bossId: "clown", locationId: "ent-circus-main-tent" },
      { bossId: "magician", locationId: "ent-circus-magic-stage" },
      { bossId: "beastmaster", locationId: "ent-beast-cage" },
    ],
  },
  "industrial-zone": {
    role: "慢慢了解事情真相，与高科技武器交锋",
    bossLocations: [{ bossId: "tesla-engineer", locationId: "ind-tesla-tower-factory" }],
  },
  "research-zone": {
    role: "探索真相，获取关键信息",
    bossLocations: [{ bossId: "hospital-knight", locationId: "sci-mutant-test-zone" }],
  },
  "military-zone": {
    role: "与城市重工业对抗，利用地形承受大炮和机枪火力压制",
    bossLocations: [{ bossId: "war-convoy", locationId: "mil-drill-sands" }],
  },
};

export const STORY_REGION_UNLOCK_RULES: StoryRegionUnlockRule[] = [
  { completedRegionId: "residential-zone", unlockRegionIds: ["entertainment-zone"] },
  { completedRegionId: "entertainment-zone", unlockRegionIds: ["research-zone", "industrial-zone"] },
  { completedRegionId: "research-zone", unlockRegionIds: ["military-zone"] },
  { completedRegionId: "industrial-zone", unlockRegionIds: ["military-zone"] },
];

export const STORY_REGION_PASSAGES: StoryRegionPassage[] = [
  {
    id: "central-to-residential",
    fromRegionId: "central-plaza",
    toRegionId: "residential-zone",
    gateId: "gate-central-residential",
    requiredCondition: "mission-start",
    x: 23625,
    y: 15975,
    width: 2050,
    height: 3650,
    pathRects: [
      { x: 23025, y: 14150, width: 3250, height: 520 },
      { x: 21400, y: 15975, width: 520, height: 3650 },
    ],
  },
  {
    id: "central-to-military",
    fromRegionId: "central-plaza",
    toRegionId: "military-zone",
    gateId: "gate-central-military",
    requiredCondition: "final-prep-authorized",
    x: 16375,
    y: 15975,
    width: 2050,
    height: 3650,
    pathRects: [
      { x: 16975, y: 14150, width: 3250, height: 520 },
      { x: 18600, y: 15975, width: 520, height: 3650 },
    ],
  },
  {
    id: "residential-to-entertainment",
    fromRegionId: "residential-zone",
    toRegionId: "entertainment-zone",
    gateId: "gate-residential-entertainment",
    requiredCondition: "residential-tower-cleared",
    x: 30500,
    y: 19000,
    width: 1600,
    height: 10000,
  },
  {
    id: "entertainment-to-research",
    fromRegionId: "entertainment-zone",
    toRegionId: "research-zone",
    gateId: "gate-entertainment-research",
    requiredCondition: "entertainment-cleared",
    x: 20000,
    y: 28500,
    width: 9500,
    height: 1400,
  },
  {
    id: "entertainment-to-industrial",
    fromRegionId: "entertainment-zone",
    toRegionId: "industrial-zone",
    gateId: "gate-entertainment-industrial",
    requiredCondition: "entertainment-cleared",
    x: 25500,
    y: 33200,
    width: 5000,
    height: 1700,
  },
  {
    id: "research-to-military",
    fromRegionId: "research-zone",
    toRegionId: "military-zone",
    gateId: "gate-research-military",
    requiredCondition: "research-cleared",
    x: 9500,
    y: 19000,
    width: 1600,
    height: 10000,
  },
  {
    id: "industrial-to-military",
    fromRegionId: "industrial-zone",
    toRegionId: "military-zone",
    gateId: "gate-industrial-military",
    requiredCondition: "industrial-cleared",
    x: 14500,
    y: 30400,
    width: 1800,
    height: 7400,
  },
];

export const STORY_REGIONS: StoryRegionDefinition[] = [
  {
    id: "central-plaza",
    name: "中心广场",
    towerId: STORY_CENTER_LIGHTHOUSE.id,
    x: 20000,
    y: 20000,
    width: 5200,
    height: 4400,
    color: 0x2f3d36,
  },
  {
    id: "military-zone",
    name: "左上军事区",
    towerId: "story-military-tower",
    x: 9500,
    y: 9500,
    width: 11700,
    height: 9300,
    color: 0x334b3c,
  },
  {
    id: "residential-zone",
    name: "右上居民区",
    towerId: "story-residential-tower",
    x: 30500,
    y: 9500,
    width: 11700,
    height: 9300,
    color: 0x435c72,
  },
  {
    id: "research-zone",
    name: "左下科研区",
    towerId: "story-research-tower",
    x: 9500,
    y: 28500,
    width: 11700,
    height: 9000,
    color: 0x563d69,
  },
  {
    id: "entertainment-zone",
    name: "右下娱乐区",
    towerId: "story-entertainment-tower",
    x: 30500,
    y: 28500,
    width: 11700,
    height: 9000,
    color: 0x6b3b59,
  },
  {
    id: "industrial-zone",
    name: "正下工业区",
    towerId: "story-industrial-tower",
    x: 20000,
    y: 35500,
    width: 13500,
    height: 6600,
    color: 0x64513a,
  },
];

export function getStoryVisionRadius(point: { x: number; y: number }, litLighthouseIds: string[]): number {
  if (STORY_DISABLE_FOG_FOR_MAP_TUNING) return Math.max(STORY_MAP_WIDTH, STORY_MAP_HEIGHT);
  const centerStrength = getLitLighthouseStrength(point, STORY_CENTER_LIGHTHOUSE, litLighthouseIds);
  return Math.round(STORY_FOG_BASE_RADIUS + (STORY_FOG_LIT_RADIUS - STORY_FOG_BASE_RADIUS) * centerStrength);
}

export function getStoryMonsterPressureMultiplier(point: { x: number; y: number }, litLighthouseIds: string[]): number {
  if (STORY_DISABLE_ENCOUNTERS_FOR_MAP_TUNING) return 1;
  const centerStrength = getLitLighthouseStrength(point, STORY_CENTER_LIGHTHOUSE, litLighthouseIds);
  return Number((1 + STORY_LIGHTHOUSE_PRESSURE_BONUS * centerStrength).toFixed(2));
}

export function getStoryRegionAtPoint(point: { x: number; y: number }): StoryRegionDefinition | null {
  return STORY_REGIONS.find((region) => isPointInsideStoryRegion(point, region)) ?? null;
}

export function isStoryMagicianInterferencePoint(point: { x: number; y: number }): boolean {
  return getStoryRegionAtPoint(point)?.id === "entertainment-zone";
}

export function isStoryPassageGateOpen(
  passage: StoryRegionPassage,
  openedGateIds: readonly string[],
  options: { tuningAllOpen?: boolean } = {},
): boolean {
  if (options.tuningAllOpen ?? STORY_MAP_TUNING_ALL_OPEN) return true;
  return openedGateIds.includes(passage.gateId);
}

export function getStoryPassageRects(passage: StoryRegionPassage): StoryPassageRect[] {
  return passage.pathRects ?? [{ x: passage.x, y: passage.y, width: passage.width, height: passage.height }];
}

export function isPointInUnlockedStoryRegion(
  point: { x: number; y: number },
  unlockedRegionIds: readonly StoryRegionId[],
  options: { tuningAllOpen?: boolean; openedGateIds?: readonly string[] } = {},
): boolean {
  if (options.tuningAllOpen ?? STORY_MAP_TUNING_ALL_OPEN) return true;
  const region = getStoryRegionAtPoint(point);
  if (region && unlockedRegionIds.includes(region.id)) return true;
  return STORY_REGION_PASSAGES.some(
    (passage) =>
      unlockedRegionIds.includes(passage.fromRegionId) &&
      unlockedRegionIds.includes(passage.toRegionId) &&
      isStoryPassageGateOpen(passage, options.openedGateIds ?? [], { tuningAllOpen: false }) &&
      getStoryPassageRects(passage).some((rect) => isPointInsideStoryRect(point, rect)),
  );
}

export function clampPointToUnlockedStoryRegions(
  from: { x: number; y: number },
  to: { x: number; y: number },
  unlockedRegionIds: readonly StoryRegionId[],
  options: { tuningAllOpen?: boolean; openedGateIds?: readonly string[] } = {},
): { x: number; y: number } {
  if (options.tuningAllOpen ?? STORY_MAP_TUNING_ALL_OPEN) return to;
  if (isPointInUnlockedStoryRegion(to, unlockedRegionIds, options)) return to;
  if (isPointInUnlockedStoryRegion(from, unlockedRegionIds, options)) return from;
  return getStoryPlayerStart();
}

export function isPointInsideStoryVision(
  origin: { x: number; y: number },
  point: { x: number; y: number },
  visionRadius: number,
): boolean {
  if (STORY_DISABLE_FOG_FOR_MAP_TUNING) return true;
  return distance(origin, point) <= visionRadius;
}

export function getStoryEffectiveAttackRange(baseRange: number, visionRadius: number): number {
  if (STORY_DISABLE_FOG_FOR_MAP_TUNING) return baseRange;
  return Math.max(0, Math.min(baseRange, visionRadius));
}

export function getStoryCircularFogCoverRects(
  map: { width: number; height: number },
  center: { x: number; y: number },
  radius: number,
  bandSize = 32,
): StoryFogRect[] {
  if (STORY_DISABLE_FOG_FOR_MAP_TUNING) return [];
  const clampedRadius = Math.max(0, radius);
  const top = Math.max(0, center.y - clampedRadius);
  const bottom = Math.min(map.height, center.y + clampedRadius);
  const rects: StoryFogRect[] = [
    { x: 0, y: 0, width: map.width, height: top },
    { x: 0, y: bottom, width: map.width, height: Math.max(0, map.height - bottom) },
  ];

  for (let y = top; y < bottom; y += bandSize) {
    const nextY = Math.min(bottom, y + bandSize);
    const sampleY = (y + nextY) / 2;
    const dy = sampleY - center.y;
    const halfWidth = Math.sqrt(Math.max(0, clampedRadius * clampedRadius - dy * dy)) + 1;
    const left = Math.max(0, center.x - halfWidth);
    const right = Math.min(map.width, center.x + halfWidth);
    rects.push({ x: 0, y, width: left, height: nextY - y });
    rects.push({ x: right, y, width: Math.max(0, map.width - right), height: nextY - y });
  }

  return rects.filter((rect) => rect.width > 0 && rect.height > 0);
}

function getLitLighthouseStrength(
  point: { x: number; y: number },
  lighthouse: StoryLighthouseDefinition,
  litLighthouseIds: string[],
): number {
  if (!litLighthouseIds.includes(lighthouse.id)) return 0;
  const value = 1 - distance(point, lighthouse.position) / STORY_LIGHTHOUSE_EFFECT_RADIUS;
  return clamp(value, 0, 1);
}

function isPointInsideStoryRegion(point: { x: number; y: number }, region: StoryRegionDefinition): boolean {
  return isPointInsideStoryRect(point, region);
}

function isPointInsideStoryRect(point: { x: number; y: number }, rect: { x: number; y: number; width: number; height: number }): boolean {
  return (
    point.x >= rect.x - rect.width / 2 &&
    point.x <= rect.x + rect.width / 2 &&
    point.y >= rect.y - rect.height / 2 &&
    point.y <= rect.y + rect.height / 2
  );
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
