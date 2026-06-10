import { describe, expect, it } from "vitest";
import { MAP_HEIGHT, MAP_WIDTH } from "./spawning";
import {
  STORY_CENTER_LIGHTHOUSE,
  STORY_FOG_BASE_RADIUS,
  STORY_FOG_LIT_RADIUS,
  STORY_INITIAL_UNLOCKED_REGION_IDS,
  STORY_MAP_HEIGHT,
  STORY_MAP_WIDTH,
  STORY_REGION_UNLOCK_RULES,
  STORY_ROUTE_RULES,
  STORY_REGIONS,
  STORY_REGION_PASSAGES,
  clampPointToUnlockedStoryRegions,
  getStoryRegionAtPoint,
  getStoryCircularFogCoverRects,
  getStoryEffectiveAttackRange,
  getStoryMonsterPressureMultiplier,
  getStoryPlayerStart,
  getStoryVisionRadius,
  isPointInsideStoryVision,
} from "./storyRegions";

describe("story regions", () => {
  it("uses a map twice as wide and twice as tall as classic mode", () => {
    expect(STORY_MAP_WIDTH).toBe(MAP_WIDTH * 2);
    expect(STORY_MAP_HEIGHT).toBe(MAP_HEIGHT * 2);
    expect(getStoryPlayerStart()).toEqual({ x: 10000, y: 10000 });
  });

  it("defines six story city districts around the center plaza", () => {
    expect(STORY_REGIONS).toHaveLength(6);
    expect(STORY_REGIONS.map((region) => region.id)).toEqual([
      "central-plaza",
      "military-zone",
      "residential-zone",
      "research-zone",
      "entertainment-zone",
      "industrial-zone",
    ]);
    expect(new Set(STORY_REGIONS.map((region) => region.towerId)).size).toBe(6);
    expect(STORY_REGIONS.find((region) => region.id === "central-plaza")).toMatchObject({
      x: 10000,
      y: 9400,
    });
    expect(STORY_REGIONS.find((region) => region.id === "military-zone")?.x).toBeLessThan(10000);
    expect(STORY_REGIONS.find((region) => region.id === "military-zone")?.y).toBeLessThan(9400);
    expect(STORY_REGIONS.find((region) => region.id === "residential-zone")?.x).toBeGreaterThan(10000);
    expect(STORY_REGIONS.find((region) => region.id === "residential-zone")?.y).toBeLessThan(9400);
    expect(STORY_REGIONS.find((region) => region.id === "industrial-zone")).toMatchObject({
      x: 10000,
      y: 15700,
    });
  });

  it("models the confirmed semi-linear story route", () => {
    expect(STORY_ROUTE_RULES).toEqual({
      startRegionId: "central-plaza",
      firstRegionId: "residential-zone",
      secondRegionId: "entertainment-zone",
      branchRegionIds: ["research-zone", "industrial-zone"],
      branchRequirement: "any",
      finalPrepRegionId: "military-zone",
      finalBossRegionId: "central-plaza",
    });
  });

  it("starts with only center plaza and residential zone unlocked", () => {
    expect(STORY_INITIAL_UNLOCKED_REGION_IDS).toEqual(["central-plaza", "residential-zone"]);
  });

  it("defines the wall-gated story unlock chain", () => {
    expect(STORY_REGION_UNLOCK_RULES).toEqual([
      { completedRegionId: "residential-zone", unlockRegionIds: ["entertainment-zone"] },
      { completedRegionId: "entertainment-zone", unlockRegionIds: ["research-zone", "industrial-zone"] },
      { completedRegionId: "research-zone", unlockRegionIds: ["military-zone"] },
      { completedRegionId: "industrial-zone", unlockRegionIds: ["military-zone"] },
    ]);
  });

  it("defines gated passages between story regions", () => {
    expect(STORY_REGION_PASSAGES.map((passage) => passage.id)).toEqual([
      "central-to-residential",
      "residential-to-entertainment",
      "entertainment-to-research",
      "entertainment-to-industrial",
      "research-to-military",
      "industrial-to-military",
      "military-to-central",
    ]);
  });

  it("detects which story region contains a point", () => {
    expect(getStoryRegionAtPoint({ x: 10000, y: 9400 })?.id).toBe("central-plaza");
    expect(getStoryRegionAtPoint({ x: 13900, y: 5600 })?.id).toBe("residential-zone");
    expect(getStoryRegionAtPoint({ x: 13900, y: 13000 })?.id).toBe("entertainment-zone");
    expect(getStoryRegionAtPoint({ x: 100, y: 100 })).toBeNull();
  });

  it("blocks movement into locked story regions", () => {
    const unlockedRegionIds = STORY_INITIAL_UNLOCKED_REGION_IDS;
    const fromCenter = { x: 10000, y: 10000 };
    const towardLockedEntertainment = { x: 13900, y: 13000 };
    const towardUnlockedResidential = { x: 13900, y: 5600 };

    expect(clampPointToUnlockedStoryRegions(fromCenter, towardLockedEntertainment, unlockedRegionIds)).toEqual(fromCenter);
    expect(clampPointToUnlockedStoryRegions(fromCenter, towardUnlockedResidential, unlockedRegionIds)).toEqual(towardUnlockedResidential);
  });

  it("allows movement through passages when both connected regions are unlocked", () => {
    const centralToResidentialPassage = { x: 12000, y: 7600 };
    const residentialToEntertainmentPassage = { x: 13900, y: 9000 };

    expect(
      clampPointToUnlockedStoryRegions(
        { x: 11200, y: 8000 },
        centralToResidentialPassage,
        ["central-plaza", "residential-zone"],
      ),
    ).toEqual(centralToResidentialPassage);
    expect(
      clampPointToUnlockedStoryRegions(
        { x: 13900, y: 7150 },
        residentialToEntertainmentPassage,
        ["central-plaza", "residential-zone"],
      ),
    ).toEqual({ x: 13900, y: 7150 });
  });

  it("starts fully fogged with a small base vision radius", () => {
    expect(STORY_FOG_BASE_RADIUS).toBeLessThan(STORY_FOG_LIT_RADIUS);
    expect(getStoryVisionRadius({ x: 10000, y: 10000 }, [])).toBe(STORY_FOG_BASE_RADIUS);
    expect(getStoryVisionRadius({ x: 13000, y: 10000 }, [])).toBe(STORY_FOG_BASE_RADIUS);
  });

  it("expands vision near a lit lighthouse instead of blocking movement", () => {
    const litIds = [STORY_CENTER_LIGHTHOUSE.id];

    expect(getStoryVisionRadius(STORY_CENTER_LIGHTHOUSE.position, litIds)).toBe(STORY_FOG_LIT_RADIUS);
    expect(getStoryVisionRadius({ x: 10000, y: 2200 }, litIds)).toBe(STORY_FOG_BASE_RADIUS);
  });

  it("increases monster pressure near lit lighthouses", () => {
    const litIds = [STORY_CENTER_LIGHTHOUSE.id];

    expect(getStoryMonsterPressureMultiplier(STORY_CENTER_LIGHTHOUSE.position, [])).toBe(1);
    expect(getStoryMonsterPressureMultiplier(STORY_CENTER_LIGHTHOUSE.position, litIds)).toBeGreaterThan(1);
    expect(getStoryMonsterPressureMultiplier({ x: 10000, y: 2200 }, litIds)).toBe(1);
  });

  it("uses circular fog cover bands instead of a square vision window", () => {
    const rects = getStoryCircularFogCoverRects(
      { width: 2000, height: 2000 },
      { x: 1000, y: 1000 },
      240,
      24,
    );

    const coversCenter = rects.some(
      (rect) =>
        rect.x <= 1000 &&
        rect.x + rect.width >= 1000 &&
        rect.y <= 1000 &&
        rect.y + rect.height >= 1000,
    );
    const sideBandsNearCenter = rects.filter(
      (rect) => rect.y <= 1000 && rect.y + rect.height >= 1000,
    );

    expect(coversCenter).toBe(false);
    expect(sideBandsNearCenter.length).toBeGreaterThanOrEqual(2);
    expect(sideBandsNearCenter.every((rect) => rect.width < 760)).toBe(true);
  });

  it("limits story combat range to the circular vision radius", () => {
    expect(isPointInsideStoryVision({ x: 0, y: 0 }, { x: 359, y: 0 }, 360)).toBe(true);
    expect(isPointInsideStoryVision({ x: 0, y: 0 }, { x: 361, y: 0 }, 360)).toBe(false);
    expect(getStoryEffectiveAttackRange(620, 360)).toBe(360);
    expect(getStoryEffectiveAttackRange(620, 980)).toBe(620);
  });
});
