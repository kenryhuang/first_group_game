import type { StoryAnimationName, StoryDirection } from "./storyAssetManifest";

export interface StoryActorAnimationLock {
  animation?: StoryAnimationName;
  direction?: StoryDirection;
  lockedUntilMs: number;
}

export interface StoryActorPlayback {
  animation: StoryAnimationName;
  direction: StoryDirection;
}

export function createStoryActorAnimationLock(): StoryActorAnimationLock {
  return { lockedUntilMs: 0 };
}

export function triggerStoryActorOneShot(
  lock: StoryActorAnimationLock,
  animation: StoryAnimationName,
  direction: StoryDirection,
  nowMs: number,
  durationMs: number,
): boolean {
  const shouldRestart =
    lock.animation !== animation ||
    lock.direction !== direction ||
    nowMs >= lock.lockedUntilMs;

  lock.animation = animation;
  lock.direction = direction;
  lock.lockedUntilMs = nowMs + durationMs;

  return shouldRestart;
}

export function getStoryActorPlayback(
  lock: StoryActorAnimationLock | undefined,
  fallbackAnimation: StoryAnimationName,
  fallbackDirection: StoryDirection,
  nowMs: number,
): StoryActorPlayback {
  if (
    lock?.animation &&
    lock.direction &&
    nowMs < lock.lockedUntilMs
  ) {
    return {
      animation: lock.animation,
      direction: lock.direction,
    };
  }

  return {
    animation: fallbackAnimation,
    direction: fallbackDirection,
  };
}
