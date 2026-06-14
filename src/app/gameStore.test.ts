import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useGameStore } from "./gameStore";

describe("game store phases", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("starts from the menu and moves through playing, game over, and mission success", () => {
    const store = useGameStore();

    expect(store.phase).toBe("menu");

    store.startGame();
    expect(store.phase).toBe("playing");

    store.finishGame();
    expect(store.phase).toBe("gameOver");

    store.completeMission();
    expect(store.phase).toBe("missionSuccess");

    store.returnToMenu();
    expect(store.phase).toBe("menu");
  });

  it("starts a normal run instead of the experimental final boss test state", () => {
    const store = useGameStore();

    store.startGame();

    expect(store.runState.level).toBe(1);
    expect(store.runState.activeSkillIds).toEqual([]);
    expect(store.runState.selectedMechFormId).toBeNull();
    expect(store.runState.pendingMechFormIds).toEqual([]);
  });

  it("starts story mode without changing classic mode behavior", () => {
    const store = useGameStore();

    store.openStoryIntro();
    expect(store.phase).toBe("storyIntro");

    store.openStoryMechSelect();
    expect(store.phase).toBe("storyMechSelect");

    store.startStoryMode("vanguard");

    expect(store.phase).toBe("playing");
    expect(store.mode).toBe("story");
    expect(store.selectedStoryMechId).toBe("vanguard");
    expect(store.bossRushScenarioId).toBeNull();
    expect(store.runState.level).toBe(1);
  });

  it("defaults and syncs story art slice metrics", () => {
    const store = useGameStore();

    expect(store.storyArtSliceEnabled).toBe(false);
    expect(store.storyLighthouseVisualState).toBeUndefined();
    expect(store.storyArtSpriteCount).toBeUndefined();
    expect(store.story2_5dEnabled).toBe(false);
    expect(store.story2_5dGroundScaleY).toBeUndefined();
    expect(store.story2_5dPlayerScreenY).toBeUndefined();
    expect(store.story2_5dVolumePropCount).toBeUndefined();
    expect(store.story2_5dDepthSortedPropCount).toBeUndefined();
    expect(store.story2_5dProjectedUnderlayEnabled).toBe(false);
    expect(store.story2_5dProjectedRoadUnderlayAlpha).toBeUndefined();
    expect(store.story2_5dProjectedDistrictUnderlayAlpha).toBeUndefined();
    expect(store.story2_5dProjectionMode).toBeUndefined();
    expect(store.story2_5dIsoTileWidth).toBeUndefined();
    expect(store.story2_5dIsoTileHeight).toBeUndefined();
    expect(store.story2_5dIsoLogicalTileSize).toBeUndefined();
    expect(store.story2_5dPlayerScreenX).toBeUndefined();
    expect(store.storyIsoMapMode).toBeUndefined();
    expect(store.storyIsoMapTileCount).toBeUndefined();
    expect(store.storyIsoMapRoadTileCount).toBeUndefined();
    expect(store.storyIsoMapPropCount).toBeUndefined();
    expect(store.storyIsoMapDepthSortedPropCount).toBeUndefined();
    expect(store.storyIsoMapBlockedFootprintCount).toBeUndefined();

    store.syncMetrics({
      enemyCount: 3,
      bossCount: 1,
      bulletCount: 2,
      buildingCount: 5,
      mapWidth: 20000,
      mapHeight: 20000,
      attackMode: "auto",
      bossName: "Signal Tyrant",
      bossNames: ["Signal Tyrant"],
      insideBuilding: false,
      currentBuildingId: null,
      playerHealth: 87,
      storyArtSliceEnabled: true,
      storyLighthouseVisualState: "charging",
      storyArtSpriteCount: 42,
      story2_5dEnabled: true,
      story2_5dGroundScaleY: 0.56,
      story2_5dPlayerScreenY: 19888,
      story2_5dVolumePropCount: 8,
      story2_5dDepthSortedPropCount: 8,
      story2_5dProjectedUnderlayEnabled: true,
      story2_5dProjectedRoadUnderlayAlpha: 0.08,
      story2_5dProjectedDistrictUnderlayAlpha: 0.08,
      story2_5dProjectionMode: "isometric-a1",
      story2_5dIsoTileWidth: 256,
      story2_5dIsoTileHeight: 128,
      story2_5dIsoLogicalTileSize: 256,
      story2_5dPlayerScreenX: 19900,
      storyIsoMapMode: "a2-preview",
      storyIsoMapTileCount: 143,
      storyIsoMapRoadTileCount: 29,
      storyIsoMapPropCount: 8,
      storyIsoMapDepthSortedPropCount: 8,
      storyIsoMapBlockedFootprintCount: 6,
    });

    expect(store.storyArtSliceEnabled).toBe(true);
    expect(store.storyLighthouseVisualState).toBe("charging");
    expect(store.storyArtSpriteCount).toBe(42);
    expect(store.story2_5dEnabled).toBe(true);
    expect(store.story2_5dGroundScaleY).toBe(0.56);
    expect(store.story2_5dPlayerScreenY).toBe(19888);
    expect(store.story2_5dVolumePropCount).toBe(8);
    expect(store.story2_5dDepthSortedPropCount).toBe(8);
    expect(store.story2_5dProjectedUnderlayEnabled).toBe(true);
    expect(store.story2_5dProjectedRoadUnderlayAlpha).toBe(0.08);
    expect(store.story2_5dProjectedDistrictUnderlayAlpha).toBe(0.08);
    expect(store.story2_5dProjectionMode).toBe("isometric-a1");
    expect(store.story2_5dIsoTileWidth).toBe(256);
    expect(store.story2_5dIsoTileHeight).toBe(128);
    expect(store.story2_5dIsoLogicalTileSize).toBe(256);
    expect(store.story2_5dPlayerScreenX).toBe(19900);
    expect(store.storyIsoMapMode).toBe("a2-preview");
    expect(store.storyIsoMapTileCount).toBe(143);
    expect(store.storyIsoMapRoadTileCount).toBe(29);
    expect(store.storyIsoMapPropCount).toBe(8);
    expect(store.storyIsoMapDepthSortedPropCount).toBe(8);
    expect(store.storyIsoMapBlockedFootprintCount).toBe(6);
  });
});
