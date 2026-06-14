import { STORY_SLICE_ASSETS } from "./storyAssetManifest";
import {
  STORY_2_5D_CONFIG,
  type StoryPoint,
} from "./story2_5dProjection";

export type StoryIsoTileKind =
  | "plaza"
  | "road"
  | "roadCracked"
  | "curb"
  | "concrete"
  | "stain"
  | "rubble"
  | "blocked";

export interface StoryIsoTileCoord {
  x: number;
  y: number;
}

export interface StoryIsoTileDefinition extends StoryIsoTileCoord {
  kind: StoryIsoTileKind;
}

export type StoryIsoPropRole =
  | "building"
  | "vehicle"
  | "streetlight"
  | "roadblock"
  | "sign"
  | "lighthouse";

export interface StoryIsoFootprint {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StoryIsoPropDefinition {
  label: string;
  role: StoryIsoPropRole;
  tile: StoryIsoTileCoord;
  footprint: StoryIsoFootprint;
  texturePath: string;
  scale: number;
  visualHeight: number;
  depthOffset: number;
  shadowScaleX: number;
  shadowScaleY: number;
  blocksMovement: boolean;
}

export interface StoryIsoMapDefinition {
  mode: "a2-preview";
  tileSize: number;
  tiles: StoryIsoTileDefinition[];
  props: StoryIsoPropDefinition[];
}

export interface StoryIsoMapStats {
  mode: StoryIsoMapDefinition["mode"];
  tileCount: number;
  roadTileCount: number;
  propCount: number;
  blockedFootprintCount: number;
}

export interface StoryIsoBlockingRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const STORY_A2_BLOCKING_FOOTPRINT_SCALE = 0.68;

function getPreviewTileKind(x: number, y: number): StoryIsoTileKind {
  const isDiagonalRoad =
    x === y || x === -y || (Math.abs(x) <= 1 && Math.abs(y) <= 1);
  if (isDiagonalRoad) {
    return Math.abs(x + y) % 2 === 0 ? "road" : "roadCracked";
  }

  const isCurb =
    Math.abs(x - y) === 1 ||
    Math.abs(x + y) === 1 ||
    (Math.abs(x) <= 2 && Math.abs(y) <= 2);
  if (isCurb) return "curb";

  if (
    (x === -5 && y === 3) ||
    (x === -4 && y === 4) ||
    (x === 4 && y === 2) ||
    (x === 5 && y === 3)
  ) {
    return "rubble";
  }

  if (
    (x === -2 && y === 5) ||
    (x === 3 && y === -4) ||
    (x === 6 && y === -2)
  ) {
    return "stain";
  }

  return Math.abs(x + y) % 3 === 0 ? "plaza" : "concrete";
}

function createStoryIsoPreviewTiles(): StoryIsoTileDefinition[] {
  const tiles: StoryIsoTileDefinition[] = [];

  for (let x = -6; x <= 6; x += 1) {
    for (let y = -5; y <= 5; y += 1) {
      tiles.push({ x, y, kind: getPreviewTileKind(x, y) });
    }
  }

  return tiles;
}

const [buildingGreen, buildingOchre, buildingTeal] =
  STORY_SLICE_ASSETS.map.buildings;
const [, , wreckedCar, streetlight, roadblock, signboard] =
  STORY_SLICE_ASSETS.map.decorations;

export const STORY_A2_PREVIEW_MAP: StoryIsoMapDefinition = {
  mode: "a2-preview",
  tileSize: STORY_2_5D_CONFIG.isoLogicalTileSize,
  tiles: createStoryIsoPreviewTiles(),
  props: [
    {
      label: "story-a2-building-green",
      role: "building",
      tile: { x: -2, y: 1 },
      footprint: { x: -3, y: 0, width: 2, height: 2 },
      texturePath: buildingGreen,
      scale: 0.48,
      visualHeight: 132,
      depthOffset: 90,
      shadowScaleX: 1.2,
      shadowScaleY: 0.3,
      blocksMovement: true,
    },
    {
      label: "story-a2-building-ochre",
      role: "building",
      tile: { x: 2, y: -1 },
      footprint: { x: 1, y: -2, width: 2, height: 2 },
      texturePath: buildingOchre,
      scale: 0.46,
      visualHeight: 126,
      depthOffset: 88,
      shadowScaleX: 1.16,
      shadowScaleY: 0.29,
      blocksMovement: true,
    },
    {
      label: "story-a2-building-teal",
      role: "building",
      tile: { x: -1, y: 3 },
      footprint: { x: -2, y: 2, width: 2, height: 2 },
      texturePath: buildingTeal,
      scale: 0.44,
      visualHeight: 120,
      depthOffset: 84,
      shadowScaleX: 1.1,
      shadowScaleY: 0.28,
      blocksMovement: true,
    },
    {
      label: "story-a2-wrecked-car",
      role: "vehicle",
      tile: { x: 2, y: 2 },
      footprint: { x: 2, y: 2, width: 1, height: 1 },
      texturePath: wreckedCar,
      scale: 0.5,
      visualHeight: 42,
      depthOffset: 42,
      shadowScaleX: 0.92,
      shadowScaleY: 0.2,
      blocksMovement: true,
    },
    {
      label: "story-a2-streetlight",
      role: "streetlight",
      tile: { x: -2, y: -1 },
      footprint: { x: -2, y: -1, width: 1, height: 1 },
      texturePath: streetlight,
      scale: 0.95,
      visualHeight: 144,
      depthOffset: 88,
      shadowScaleX: 0.72,
      shadowScaleY: 0.18,
      blocksMovement: false,
    },
    {
      label: "story-a2-roadblock",
      role: "roadblock",
      tile: { x: 0, y: 3 },
      footprint: { x: 0, y: 3, width: 1, height: 1 },
      texturePath: roadblock,
      scale: 0.64,
      visualHeight: 38,
      depthOffset: 42,
      shadowScaleX: 0.82,
      shadowScaleY: 0.18,
      blocksMovement: true,
    },
    {
      label: "story-a2-signboard",
      role: "sign",
      tile: { x: 1, y: -3 },
      footprint: { x: 1, y: -3, width: 1, height: 1 },
      texturePath: signboard,
      scale: 0.78,
      visualHeight: 96,
      depthOffset: 82,
      shadowScaleX: 0.78,
      shadowScaleY: 0.2,
      blocksMovement: false,
    },
    {
      label: "story-a2-lighthouse",
      role: "lighthouse",
      tile: { x: 0, y: 0 },
      footprint: { x: -1, y: -1, width: 2, height: 2 },
      texturePath: STORY_SLICE_ASSETS.lighthouse.states.off,
      scale: 0.54,
      visualHeight: 160,
      depthOffset: 105,
      shadowScaleX: 0.92,
      shadowScaleY: 0.24,
      blocksMovement: true,
    },
  ],
};

export function isStoryIsoRoadTile(tile: StoryIsoTileDefinition): boolean {
  return tile.kind === "road" || tile.kind === "roadCracked";
}

export function getStoryIsoTileWorldPoint(
  tile: StoryIsoTileCoord,
  center: StoryPoint,
): StoryPoint {
  return {
    x: center.x + tile.x * STORY_A2_PREVIEW_MAP.tileSize,
    y: center.y + tile.y * STORY_A2_PREVIEW_MAP.tileSize,
  };
}

export function getStoryIsoPropBasePoint(
  prop: StoryIsoPropDefinition,
  center: StoryPoint,
): StoryPoint {
  return getStoryIsoTileWorldPoint(prop.tile, center);
}

export function getStoryIsoBlockedFootprints(
  map: StoryIsoMapDefinition,
): StoryIsoFootprint[] {
  return map.props
    .filter((prop) => prop.blocksMovement)
    .map((prop) => ({ ...prop.footprint }));
}

export function getStoryIsoBlockedRects(
  map: StoryIsoMapDefinition,
  center: StoryPoint,
): StoryIsoBlockingRect[] {
  return map.props
    .filter((prop) => prop.blocksMovement)
    .map((prop) => ({
      id: `story-a2-blocking-${prop.label}`,
      x: center.x + prop.tile.x * map.tileSize,
      y: center.y + prop.tile.y * map.tileSize,
      width: Math.round(
        prop.footprint.width * map.tileSize * STORY_A2_BLOCKING_FOOTPRINT_SCALE,
      ),
      height: Math.round(
        prop.footprint.height * map.tileSize * STORY_A2_BLOCKING_FOOTPRINT_SCALE,
      ),
    }));
}

export function getStoryIsoMapStats(
  map: StoryIsoMapDefinition,
): StoryIsoMapStats {
  return {
    mode: map.mode,
    tileCount: map.tiles.length,
    roadTileCount: map.tiles.filter(isStoryIsoRoadTile).length,
    propCount: map.props.length,
    blockedFootprintCount: getStoryIsoBlockedFootprints(map).length,
  };
}
