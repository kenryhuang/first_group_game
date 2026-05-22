import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useGameStore } from "./gameStore";

describe("game store phases", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("starts from the menu and moves through playing and game over", () => {
    const store = useGameStore();

    expect(store.phase).toBe("menu");

    store.startGame();
    expect(store.phase).toBe("playing");

    store.finishGame();
    expect(store.phase).toBe("gameOver");

    store.returnToMenu();
    expect(store.phase).toBe("menu");
  });
});
