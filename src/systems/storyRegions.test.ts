import { describe, expect, it } from "vitest";
import { MAP_HEIGHT, MAP_WIDTH } from "./spawning";
import {
  STORY_CENTER_LIGHTHOUSE,
  STORY_DISABLE_ENCOUNTERS_FOR_MAP_TUNING,
  STORY_DISABLE_FOG_FOR_MAP_TUNING,
  STORY_FOG_BASE_RADIUS,
  STORY_FOG_LIT_RADIUS,
  STORY_DEBUG_PLAYER_SPEED_MULTIPLIER,
  STORY_INITIAL_UNLOCKED_REGION_IDS,
  STORY_MAP_HEIGHT,
  STORY_MAP_WIDTH,
  STORY_REGION_GAMEPLAY,
  STORY_REGION_UNLOCK_RULES,
  STORY_ROUTE_RULES,
  STORY_REGIONS,
  STORY_REGION_PASSAGES,
  clampPointToUnlockedStoryRegions,
  getStoryRegionAtPoint,
  getStoryCircularFogCoverRects,
  getStoryEffectiveAttackRange,
  isStoryMagicianInterferencePoint,
  getStoryMonsterPressureMultiplier,
  getStoryPlayerStart,
  getStoryVisionRadius,
  isPointInUnlockedStoryRegion,
  isPointInsideStoryVision,
  isStoryPassageGateOpen,
} from "./storyRegions";

describe("story regions", () => {
  it("uses a map four times as wide and four times as tall as classic mode", () => {
    expect(STORY_MAP_WIDTH).toBe(MAP_WIDTH * 4);
    expect(STORY_MAP_HEIGHT).toBe(MAP_HEIGHT * 4);
    expect(getStoryPlayerStart()).toEqual({ x: 20000, y: 20000 });
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
      x: 20000,
      y: 20000,
    });
    expect(STORY_REGIONS.find((region) => region.id === "military-zone")).toMatchObject({
      x: 9500,
      y: 9500,
      width: 11700,
      height: 9300,
    });
    expect(STORY_REGIONS.find((region) => region.id === "residential-zone")).toMatchObject({
      x: 30500,
      y: 9500,
      width: 11700,
      height: 9300,
    });
    expect(STORY_REGIONS.find((region) => region.id === "industrial-zone")).toMatchObject({
      x: 20000,
      y: 35500,
      width: 13500,
      height: 6600,
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

  it("starts with every district open for story map tuning", () => {
    expect(STORY_INITIAL_UNLOCKED_REGION_IDS).toEqual(STORY_REGIONS.map((region) => region.id));
    expect(STORY_DEBUG_PLAYER_SPEED_MULTIPLIER).toBe(5);
    expect(STORY_DISABLE_FOG_FOR_MAP_TUNING).toBe(true);
    expect(STORY_DISABLE_ENCOUNTERS_FOR_MAP_TUNING).toBe(true);
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
      "central-to-military",
      "residential-to-entertainment",
      "entertainment-to-research",
      "entertainment-to-industrial",
      "research-to-military",
      "industrial-to-military",
    ]);
    const centralPassages = STORY_REGION_PASSAGES.filter((passage) => passage.fromRegionId === "central-plaza");
    expect(centralPassages.map((passage) => passage.toRegionId).sort()).toEqual([
      "military-zone",
      "residential-zone",
    ]);
    expect(STORY_REGION_PASSAGES.every((passage) => passage.gateId && passage.requiredCondition)).toBe(true);
    expect(STORY_REGION_PASSAGES.find((passage) => passage.id === "central-to-residential")).toMatchObject({
      gateId: "gate-central-residential",
      requiredCondition: "mission-start",
    });
  });

  it("routes the two center exits through narrow L-shaped roads on the north wall", () => {
    const centralToResidential = STORY_REGION_PASSAGES.find((passage) => passage.id === "central-to-residential");
    const centralToMilitary = STORY_REGION_PASSAGES.find((passage) => passage.id === "central-to-military");
    if (!centralToResidential || !centralToMilitary) throw new Error("Missing center passage fixtures");

    expect(centralToResidential.pathRects).toEqual([
      { x: 23025, y: 14150, width: 3250, height: 520 },
      { x: 21400, y: 15975, width: 520, height: 3650 },
    ]);
    expect(centralToMilitary.pathRects).toEqual([
      { x: 16975, y: 14150, width: 3250, height: 520 },
      { x: 18600, y: 15975, width: 520, height: 3650 },
    ]);
  });

  it("keeps passage gates closed in normal story flow until their condition opens", () => {
    const residentialGate = STORY_REGION_PASSAGES.find((passage) => passage.id === "central-to-residential");
    const entertainmentGate = STORY_REGION_PASSAGES.find((passage) => passage.id === "residential-to-entertainment");
    if (!residentialGate || !entertainmentGate) throw new Error("Missing passage fixtures");

    expect(isStoryPassageGateOpen(residentialGate, [], { tuningAllOpen: false })).toBe(false);
    expect(isStoryPassageGateOpen(residentialGate, ["gate-central-residential"], { tuningAllOpen: false })).toBe(true);
    expect(
      isPointInUnlockedStoryRegion(
        { x: residentialGate.x, y: residentialGate.y },
        ["central-plaza", "residential-zone"],
        { tuningAllOpen: false, openedGateIds: [] },
      ),
    ).toBe(false);
    expect(
      isPointInUnlockedStoryRegion(
        { x: entertainmentGate.x, y: entertainmentGate.y },
        ["residential-zone", "entertainment-zone"],
        { tuningAllOpen: false, openedGateIds: ["gate-residential-entertainment"] },
      ),
    ).toBe(true);
  });

  it("documents each story region gameplay role and boss locations", () => {
    expect(STORY_REGION_GAMEPLAY).toMatchObject({
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
        bossLocations: [{ bossId: "tesla-engineer", locationId: "ind-tesla-tower-factory" }],
      },
      "research-zone": {
        bossLocations: [{ bossId: "hospital-knight", locationId: "sci-mutant-test-zone" }],
      },
      "military-zone": {
        bossLocations: [{ bossId: "war-convoy", locationId: "mil-drill-sands" }],
      },
    });
  });

  it("detects which story region contains a point", () => {
    expect(getStoryRegionAtPoint({ x: 20000, y: 20000 })?.id).toBe("central-plaza");
    expect(getStoryRegionAtPoint({ x: 30500, y: 9500 })?.id).toBe("residential-zone");
    expect(getStoryRegionAtPoint({ x: 30500, y: 28500 })?.id).toBe("entertainment-zone");
    expect(getStoryRegionAtPoint({ x: 100, y: 100 })).toBeNull();
  });

  it("starts remote magician interference when the player enters the entertainment district", () => {
    expect(isStoryMagicianInterferencePoint({ x: 30500, y: 28500 })).toBe(true);
    expect(isStoryMagicianInterferencePoint({ x: 30500, y: 9500 })).toBe(false);
    expect(isStoryMagicianInterferencePoint({ x: 20000, y: 20000 })).toBe(false);
  });

  it("does not block movement between districts while the story map is in tuning mode", () => {
    const unlockedRegionIds = STORY_INITIAL_UNLOCKED_REGION_IDS;
    const fromCenter = { x: 20000, y: 20000 };
    const towardEntertainment = { x: 30500, y: 28500 };
    const towardUnlockedResidential = { x: 30500, y: 9500 };

    expect(clampPointToUnlockedStoryRegions(fromCenter, towardEntertainment, unlockedRegionIds)).toEqual(towardEntertainment);
    expect(clampPointToUnlockedStoryRegions(fromCenter, towardUnlockedResidential, unlockedRegionIds)).toEqual(towardUnlockedResidential);
  });

  it("allows movement through passages when both connected regions are unlocked", () => {
    const centralToResidentialPassage = { x: 24650, y: 18500 };
    const residentialToEntertainmentPassage = { x: 30500, y: 19000 };

    expect(
      clampPointToUnlockedStoryRegions(
        { x: 22600, y: 17600 },
        centralToResidentialPassage,
          STORY_INITIAL_UNLOCKED_REGION_IDS,
        ),
      ).toEqual(centralToResidentialPassage);
    expect(
      clampPointToUnlockedStoryRegions(
        { x: 30500, y: 14150 },
        residentialToEntertainmentPassage,
          STORY_INITIAL_UNLOCKED_REGION_IDS,
        ),
    ).toEqual(residentialToEntertainmentPassage);
  });

  it("disables fog limits while the story map is in tuning mode", () => {
    expect(STORY_FOG_BASE_RADIUS).toBeLessThan(STORY_FOG_LIT_RADIUS);
    expect(getStoryVisionRadius({ x: 20000, y: 20000 }, [])).toBe(STORY_MAP_WIDTH);
    expect(getStoryVisionRadius({ x: 26000, y: 20000 }, [])).toBe(STORY_MAP_WIDTH);
  });

  it("keeps lighthouse lighting from changing vision while fog is disabled", () => {
    const litIds = [STORY_CENTER_LIGHTHOUSE.id];

    expect(getStoryVisionRadius(STORY_CENTER_LIGHTHOUSE.position, litIds)).toBe(STORY_MAP_WIDTH);
    expect(getStoryVisionRadius({ x: 20000, y: 4400 }, litIds)).toBe(STORY_MAP_WIDTH);
  });

  it("keeps monster pressure disabled while encounters are disabled", () => {
    const litIds = [STORY_CENTER_LIGHTHOUSE.id];

    expect(getStoryMonsterPressureMultiplier(STORY_CENTER_LIGHTHOUSE.position, [])).toBe(1);
    expect(getStoryMonsterPressureMultiplier(STORY_CENTER_LIGHTHOUSE.position, litIds)).toBe(1);
    expect(getStoryMonsterPressureMultiplier({ x: 20000, y: 4400 }, litIds)).toBe(1);
  });

  it("does not draw circular fog cover bands while fog is disabled", () => {
    const rects = getStoryCircularFogCoverRects(
      { width: 2000, height: 2000 },
      { x: 1000, y: 1000 },
      240,
      24,
    );

    expect(rects).toEqual([]);
  });

  it("does not limit story combat range while fog is disabled", () => {
    expect(isPointInsideStoryVision({ x: 0, y: 0 }, { x: 99999, y: 0 }, 360)).toBe(true);
    expect(getStoryEffectiveAttackRange(620, 360)).toBe(620);
    expect(getStoryEffectiveAttackRange(620, 980)).toBe(620);
  });
});
