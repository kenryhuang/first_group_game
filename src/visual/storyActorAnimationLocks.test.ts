import { describe, expect, it } from "vitest";
import {
  createStoryActorAnimationLock,
  getStoryActorPlayback,
  triggerStoryActorOneShot,
} from "./storyActorAnimationLocks";

describe("story actor animation locks", () => {
  it("uses the fallback locomotion animation when no one-shot is active", () => {
    const lock = createStoryActorAnimationLock();

    expect(getStoryActorPlayback(lock, "run", "left", 100)).toEqual({
      animation: "run",
      direction: "left",
    });
  });

  it("keeps a one-shot animation active until its lock expires", () => {
    const lock = createStoryActorAnimationLock();

    expect(triggerStoryActorOneShot(lock, "attack", "right", 200, 280)).toBe(true);

    expect(getStoryActorPlayback(lock, "run", "left", 479)).toEqual({
      animation: "attack",
      direction: "right",
    });
    expect(getStoryActorPlayback(lock, "run", "left", 480)).toEqual({
      animation: "run",
      direction: "left",
    });
  });

  it("refreshes the lock when another one-shot animation is triggered", () => {
    const lock = createStoryActorAnimationLock();

    expect(triggerStoryActorOneShot(lock, "attack", "right", 200, 280)).toBe(true);
    expect(triggerStoryActorOneShot(lock, "hit", "down", 320, 140)).toBe(true);

    expect(getStoryActorPlayback(lock, "idle", "up", 459)).toEqual({
      animation: "hit",
      direction: "down",
    });
    expect(getStoryActorPlayback(lock, "idle", "up", 460)).toEqual({
      animation: "idle",
      direction: "up",
    });
  });

  it("lets running locomotion override an active attack one-shot", () => {
    const lock = createStoryActorAnimationLock();

    expect(triggerStoryActorOneShot(lock, "attack", "right", 200, 280)).toBe(true);

    expect(
      getStoryActorPlayback(lock, "run", "left", 240, {
        allowRunToOverrideAttack: true,
      }),
    ).toEqual({
      animation: "run",
      direction: "left",
    });
    expect(
      getStoryActorPlayback(lock, "idle", "left", 240, {
        allowRunToOverrideAttack: true,
      }),
    ).toEqual({
      animation: "attack",
      direction: "right",
    });
  });

  it("does not ask callers to restart an active repeated one-shot", () => {
    const lock = createStoryActorAnimationLock();

    expect(triggerStoryActorOneShot(lock, "attack", "right", 200, 280)).toBe(true);
    expect(triggerStoryActorOneShot(lock, "attack", "right", 240, 280)).toBe(false);

    expect(lock.lockedUntilMs).toBe(520);
  });
});
