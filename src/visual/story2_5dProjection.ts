export interface StoryPoint {
  x: number;
  y: number;
}

export const STORY_2_5D_CONFIG = {
  groundScaleY: 0.56,
  actorScaleBoost: 1.1,
  weaponYOffset: -18,
  effectYOffset: -8,
  depthStride: 100,
} as const;

export function projectStoryPoint(
  point: StoryPoint,
  origin: StoryPoint,
): StoryPoint {
  return {
    x: point.x,
    y: origin.y + (point.y - origin.y) * STORY_2_5D_CONFIG.groundScaleY,
  };
}

export function unprojectStoryPoint(
  point: StoryPoint,
  origin: StoryPoint,
): StoryPoint {
  return {
    x: point.x,
    y: origin.y + (point.y - origin.y) / STORY_2_5D_CONFIG.groundScaleY,
  };
}

export function projectStoryAngle(
  from: StoryPoint,
  to: StoryPoint,
  origin: StoryPoint,
): number {
  const projectedFrom = projectStoryPoint(from, origin);
  const projectedTo = projectStoryPoint(to, origin);

  return Math.atan2(
    projectedTo.y - projectedFrom.y,
    projectedTo.x - projectedFrom.x,
  );
}

export function getStoryDepth(point: StoryPoint, offset = 0): number {
  return point.y * STORY_2_5D_CONFIG.depthStride + offset;
}
