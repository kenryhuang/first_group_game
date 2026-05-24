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
    expect(store.runState.activeSkillIds).toEqual(["cleaver-dash"]);
    expect(store.runState.selectedMechFormId).toBeNull();
    expect(store.runState.pendingMechFormIds).toEqual([]);
  });
});
