import { AnimatedSprite, Graphics, Texture } from "pixi.js";
import {
  STORY_SLICE_ASSETS,
  type StoryAnimationName,
  type StoryDirection,
} from "./storyAssetManifest";
import { STORY_ART_PALETTE } from "./storyArtDirection";

export type StoryActorCharacter = "vanguard" | "zombie";

export const STORY_ACTOR_SCALES: Record<StoryActorCharacter, number> = {
  vanguard: 0.52,
  zombie: 0.39,
};

export interface StoryActorVisual {
  character: StoryActorCharacter;
  animation: StoryAnimationName;
  direction: StoryDirection;
  sprite: AnimatedSprite;
  play(animation: StoryAnimationName, direction: StoryDirection): void;
  flash(tint?: number): void;
  destroy(): void;
}

export function getStoryActorDirection(vector: {
  x: number;
  y: number;
}): StoryDirection {
  if (Math.abs(vector.x) > Math.abs(vector.y)) {
    return vector.x >= 0 ? "right" : "left";
  }
  return vector.y >= 0 ? "down" : "up";
}

function getTextures(
  character: StoryActorCharacter,
  animation: StoryAnimationName,
  direction: StoryDirection,
): Texture[] {
  const definition =
    STORY_SLICE_ASSETS.characters[character].animations[animation]?.[direction];
  if (!definition) {
    return [Texture.WHITE];
  }
  return definition.frames.map((frame) => Texture.from(frame));
}

function getFrameMs(
  character: StoryActorCharacter,
  animation: StoryAnimationName,
  direction: StoryDirection,
): number {
  return (
    STORY_SLICE_ASSETS.characters[character].animations[animation]?.[direction]
      ?.frameMs ?? 120
  );
}

function shouldLoop(
  character: StoryActorCharacter,
  animation: StoryAnimationName,
  direction: StoryDirection,
): boolean {
  return (
    STORY_SLICE_ASSETS.characters[character].animations[animation]?.[direction]
      ?.loop ?? true
  );
}

export function attachStoryActorVisual(
  view: Graphics,
  character: StoryActorCharacter,
  animation: StoryAnimationName,
  direction: StoryDirection,
): StoryActorVisual {
  view.clear();
  view.allowChildren = true;

  const sprite = new AnimatedSprite(getTextures(character, animation, direction));
  sprite.anchor.set(0.5);
  sprite.scale.set(STORY_ACTOR_SCALES[character]);
  sprite.animationSpeed = 1000 / getFrameMs(character, animation, direction) / 60;
  sprite.loop = shouldLoop(character, animation, direction);
  sprite.play();
  view.addChild(sprite);

  let destroyed = false;
  let flashBaseTint = sprite.tint;
  let flashTimeout: number | undefined;
  let flashToken = 0;

  function clearFlashTimeout(): void {
    if (flashTimeout === undefined) return;
    window.clearTimeout(flashTimeout);
    flashTimeout = undefined;
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    flashToken += 1;
    clearFlashTimeout();
    view.off("destroyed", destroy);
    if (sprite.destroyed) return;
    sprite.stop();
    sprite.destroy();
  }

  view.on("destroyed", destroy);

  const visual: StoryActorVisual = {
    character,
    animation,
    direction,
    sprite,
    play(nextAnimation: StoryAnimationName, nextDirection: StoryDirection): void {
      if (destroyed || sprite.destroyed) return;
      visual.animation = nextAnimation;
      visual.direction = nextDirection;
      sprite.textures = getTextures(character, nextAnimation, nextDirection);
      sprite.animationSpeed =
        1000 / getFrameMs(character, nextAnimation, nextDirection) / 60;
      sprite.loop = shouldLoop(character, nextAnimation, nextDirection);
      sprite.gotoAndPlay(0);
    },
    flash(tint = STORY_ART_PALETTE.hitRed): void {
      if (destroyed || sprite.destroyed) return;
      const hasActiveFlash = flashTimeout !== undefined;
      if (!hasActiveFlash) {
        flashBaseTint = sprite.tint;
      }
      clearFlashTimeout();
      const token = (flashToken += 1);
      sprite.tint = tint;
      flashTimeout = window.setTimeout(() => {
        if (destroyed || sprite.destroyed || token !== flashToken) return;
        flashTimeout = undefined;
        sprite.tint = flashBaseTint;
      }, 80);
    },
    destroy,
  };

  return visual;
}
