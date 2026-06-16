export interface StoryPoint {
  x: number;
  y: number;
}

export const STORY_2_5D_CONFIG = {
  projectionMode: "isometric-a1",
  isoLogicalTileSize: 256,
  isoTileWidth: 256,
  isoTileHeight: 128,
  isoFogScaleY: 0.5,
  actorScaleBoost: 1.1,
  weaponYOffset: -18,
  effectYOffset: -8,
  depthStride: 100,
} as const;

function getIsoTileOffsets(point: StoryPoint, origin: StoryPoint): StoryPoint {
  return {
    x: (point.x - origin.x) / STORY_2_5D_CONFIG.isoLogicalTileSize,
    y: (point.y - origin.y) / STORY_2_5D_CONFIG.isoLogicalTileSize,
  };
}

export function projectStoryPoint(
  point: StoryPoint,
  origin: StoryPoint,
): StoryPoint {
  const tileOffset = getIsoTileOffsets(point, origin);
  const halfWidth = STORY_2_5D_CONFIG.isoTileWidth / 2;
  const halfHeight = STORY_2_5D_CONFIG.isoTileHeight / 2;

  return {
    x: origin.x + (tileOffset.x - tileOffset.y) * halfWidth,
    y: origin.y + (tileOffset.x + tileOffset.y) * halfHeight,
  };
}

export function unprojectStoryPoint(
  point: StoryPoint,
  origin: StoryPoint,
): StoryPoint {
  const halfWidth = STORY_2_5D_CONFIG.isoTileWidth / 2;
  const halfHeight = STORY_2_5D_CONFIG.isoTileHeight / 2;
  const projectedX = (point.x - origin.x) / halfWidth;
  const projectedY = (point.y - origin.y) / halfHeight;
  const tileX = (projectedX + projectedY) / 2;
  const tileY = (projectedY - projectedX) / 2;

  return {
    x: origin.x + tileX * STORY_2_5D_CONFIG.isoLogicalTileSize,
    y: origin.y + tileY * STORY_2_5D_CONFIG.isoLogicalTileSize,
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
