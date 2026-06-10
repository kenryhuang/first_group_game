import { MAP_HEIGHT, MAP_WIDTH } from "./spawning";

export const STORY_MAP_WIDTH = MAP_WIDTH * 2;
export const STORY_MAP_HEIGHT = MAP_HEIGHT * 2;

export const STORY_FOG_BASE_RADIUS = 360;
export const STORY_FOG_LIT_RADIUS = 980;
export const STORY_LIGHTHOUSE_EFFECT_RADIUS = 2200;
export const STORY_LIGHTHOUSE_PRESSURE_BONUS = 0.85;
export const STORY_INITIAL_UNLOCKED_BOUNDS = {
  x: STORY_MAP_WIDTH / 2,
  y: STORY_MAP_HEIGHT / 2,
  width: 2400,
  height: 2400,
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

export interface StoryRegionPassage {
  id: string;
  fromRegionId: StoryRegionId;
  toRegionId: StoryRegionId;
  x: number;
  y: number;
  width: number;
  height: number;
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
  position: { x: STORY_MAP_WIDTH / 2, y: STORY_MAP_HEIGHT / 2 - 280 },
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

export const STORY_INITIAL_UNLOCKED_REGION_IDS: StoryRegionId[] = ["central-plaza", "residential-zone"];

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
    x: 12000,
    y: 7600,
    width: 900,
    height: 1000,
  },
  {
    id: "residential-to-entertainment",
    fromRegionId: "residential-zone",
    toRegionId: "entertainment-zone",
    x: 13900,
    y: 9300,
    width: 900,
    height: 4300,
  },
  {
    id: "entertainment-to-research",
    fromRegionId: "entertainment-zone",
    toRegionId: "research-zone",
    x: 10100,
    y: 13000,
    width: 3700,
    height: 900,
  },
  {
    id: "entertainment-to-industrial",
    fromRegionId: "entertainment-zone",
    toRegionId: "industrial-zone",
    x: 12000,
    y: 14500,
    width: 1700,
    height: 900,
  },
  {
    id: "research-to-military",
    fromRegionId: "research-zone",
    toRegionId: "military-zone",
    x: 6100,
    y: 9300,
    width: 900,
    height: 4500,
  },
  {
    id: "industrial-to-military",
    fromRegionId: "industrial-zone",
    toRegionId: "military-zone",
    x: 8100,
    y: 11600,
    width: 900,
    height: 4300,
  },
  {
    id: "military-to-central",
    fromRegionId: "military-zone",
    toRegionId: "central-plaza",
    x: 8000,
    y: 7600,
    width: 900,
    height: 1000,
  },
];

export const STORY_REGIONS: StoryRegionDefinition[] = [
  {
    id: "central-plaza",
    name: "中心广场",
    towerId: STORY_CENTER_LIGHTHOUSE.id,
    x: 10000,
    y: 9400,
    width: 3200,
    height: 2800,
    color: 0x2f3d36,
  },
  {
    id: "military-zone",
    name: "左上军事区",
    towerId: "story-military-tower",
    x: 6100,
    y: 5600,
    width: 3900,
    height: 3100,
    color: 0x334b3c,
  },
  {
    id: "residential-zone",
    name: "右上居民区",
    towerId: "story-residential-tower",
    x: 13900,
    y: 5600,
    width: 3900,
    height: 3100,
    color: 0x435c72,
  },
  {
    id: "research-zone",
    name: "左下科研区",
    towerId: "story-research-tower",
    x: 6300,
    y: 13000,
    width: 3900,
    height: 3000,
    color: 0x563d69,
  },
  {
    id: "entertainment-zone",
    name: "右下娱乐区",
    towerId: "story-entertainment-tower",
    x: 13900,
    y: 13000,
    width: 3900,
    height: 3000,
    color: 0x6b3b59,
  },
  {
    id: "industrial-zone",
    name: "正下工业区",
    towerId: "story-industrial-tower",
    x: 10000,
    y: 15700,
    width: 4500,
    height: 2200,
    color: 0x64513a,
  },
];

export function getStoryVisionRadius(point: { x: number; y: number }, litLighthouseIds: string[]): number {
  const centerStrength = getLitLighthouseStrength(point, STORY_CENTER_LIGHTHOUSE, litLighthouseIds);
  return Math.round(STORY_FOG_BASE_RADIUS + (STORY_FOG_LIT_RADIUS - STORY_FOG_BASE_RADIUS) * centerStrength);
}

export function getStoryMonsterPressureMultiplier(point: { x: number; y: number }, litLighthouseIds: string[]): number {
  const centerStrength = getLitLighthouseStrength(point, STORY_CENTER_LIGHTHOUSE, litLighthouseIds);
  return Number((1 + STORY_LIGHTHOUSE_PRESSURE_BONUS * centerStrength).toFixed(2));
}

export function getStoryRegionAtPoint(point: { x: number; y: number }): StoryRegionDefinition | null {
  return STORY_REGIONS.find((region) => isPointInsideStoryRegion(point, region)) ?? null;
}

export function isPointInUnlockedStoryRegion(
  point: { x: number; y: number },
  unlockedRegionIds: readonly StoryRegionId[],
): boolean {
  const region = getStoryRegionAtPoint(point);
  if (region && unlockedRegionIds.includes(region.id)) return true;
  return STORY_REGION_PASSAGES.some(
    (passage) =>
      unlockedRegionIds.includes(passage.fromRegionId) &&
      unlockedRegionIds.includes(passage.toRegionId) &&
      isPointInsideStoryRect(point, passage),
  );
}

export function clampPointToUnlockedStoryRegions(
  from: { x: number; y: number },
  to: { x: number; y: number },
  unlockedRegionIds: readonly StoryRegionId[],
): { x: number; y: number } {
  if (isPointInUnlockedStoryRegion(to, unlockedRegionIds)) return to;
  if (isPointInUnlockedStoryRegion(from, unlockedRegionIds)) return from;
  return getStoryPlayerStart();
}

export function isPointInsideStoryVision(
  origin: { x: number; y: number },
  point: { x: number; y: number },
  visionRadius: number,
): boolean {
  return distance(origin, point) <= visionRadius;
}

export function getStoryEffectiveAttackRange(baseRange: number, visionRadius: number): number {
  return Math.max(0, Math.min(baseRange, visionRadius));
}

export function getStoryCircularFogCoverRects(
  bounds: { width: number; height: number },
  center: { x: number; y: number },
  radius: number,
  segments = 64,
): StoryFogRect[] {
  const rects: StoryFogRect[] = [];
  const top = clamp(center.y - radius, 0, bounds.height);
  const bottom = clamp(center.y + radius, 0, bounds.height);

  addRect(rects, 0, 0, bounds.width, top);
  addRect(rects, 0, bottom, bounds.width, bounds.height - bottom);

  const visibleHeight = Math.max(0, bottom - top);
  if (visibleHeight === 0) return rects;

  const bandCount = Math.max(8, Math.round(segments));
  const bandHeight = visibleHeight / bandCount;
  for (let index = 0; index < bandCount; index += 1) {
    const y = top + index * bandHeight;
    const nextY = index === bandCount - 1 ? bottom : y + bandHeight;
    const midY = (y + nextY) / 2;
    const dy = Math.abs(midY - center.y);
    const halfChord = Math.sqrt(Math.max(0, radius * radius - dy * dy)) + 1;
    const leftWidth = clamp(center.x - halfChord, 0, bounds.width);
    const rightX = clamp(center.x + halfChord, 0, bounds.width);

    addRect(rects, 0, y, leftWidth, nextY - y);
    addRect(rects, rightX, y, bounds.width - rightX, nextY - y);
  }

  return rects;
}

function getLitLighthouseStrength(
  point: { x: number; y: number },
  lighthouse: StoryLighthouseDefinition,
  litLighthouseIds: string[],
): number {
  if (!litLighthouseIds.includes(lighthouse.id)) return 0;

  const currentDistance = distance(point, lighthouse.position);
  if (currentDistance >= STORY_LIGHTHOUSE_EFFECT_RADIUS) return 0;
  return 1 - currentDistance / STORY_LIGHTHOUSE_EFFECT_RADIUS;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isPointInsideStoryRegion(point: { x: number; y: number }, region: StoryRegionDefinition): boolean {
  return isPointInsideStoryRect(point, region);
}

function isPointInsideStoryRect(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    point.x >= rect.x - rect.width / 2 &&
    point.x <= rect.x + rect.width / 2 &&
    point.y >= rect.y - rect.height / 2 &&
    point.y <= rect.y + rect.height / 2
  );
}

function addRect(rects: StoryFogRect[], x: number, y: number, width: number, height: number): void {
  if (width <= 0 || height <= 0) return;
  rects.push({ x, y, width, height });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
