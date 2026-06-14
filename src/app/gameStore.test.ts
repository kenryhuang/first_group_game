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
  });
});
