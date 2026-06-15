import { STORY_SLICE_ASSETS } from "./storyAssetManifest";
import {
  STORY_2_5D_CONFIG,
  type StoryPoint,
} from "./story2_5dProjection";

export type StoryIsoTileKind =
  | "plaza"
  | "road"
  | "roadCracked"
  | "foundation"
  | "curb"
  | "concrete"
  | "stain"
  | "rubble"
  | "blocked";

export interface StoryIsoTileCoord {
  x: number;
  y: number;
}

export type StoryIsoRoadAxis = "x" | "y";

export interface StoryIsoTileDefinition extends StoryIsoTileCoord {
  kind: StoryIsoTileKind;
  roadAxis?: StoryIsoRoadAxis;
}

export type StoryIsoRoadConnection =
  | "xMinus"
  | "xPlus"
  | "yMinus"
  | "yPlus";

export type StoryRoadKitTextureKey =
  | "straightX"
  | "straightY"
  | "crackedStraightX"
  | "crackedStraightY"
  | "intersection"
  | "cornerNE"
  | "cornerNW"
  | "cornerSE"
  | "cornerSW"
  | "tNorth"
  | "tEast"
  | "tSouth"
  | "tWest";

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

const STORY_A2_BUILDING_PLACEMENTS = [
  {
    tile: { x: -2, y: 0 },
    footprint: { x: -3, y: -1, width: 2, height: 2 },
  },
  {
    tile: { x: 4, y: 3 },
    footprint: { x: 3, y: 2, width: 2, height: 2 },
  },
  {
    tile: { x: 0, y: 3 },
    footprint: { x: -1, y: 2, width: 2, height: 2 },
  },
] as const;

const STORY_A2_LIGHTHOUSE_FOUNDATION = {
  x: -1,
  y: -1,
  width: 2,
  height: 2,
} as const;

function isWithinFootprint(
  x: number,
  y: number,
  footprint: StoryIsoFootprint,
): boolean {
  return (
    x >= footprint.x &&
    x < footprint.x + footprint.width &&
    y >= footprint.y &&
    y < footprint.y + footprint.height
  );
}

function isPreviewFoundationTile(x: number, y: number): boolean {
  return (
    isWithinFootprint(x, y, STORY_A2_LIGHTHOUSE_FOUNDATION) ||
    STORY_A2_BUILDING_PLACEMENTS.some((placement) =>
      isWithinFootprint(x, y, placement.footprint),
    )
  );
}

function getPreviewRoadAxis(
  x: number,
  y: number,
): StoryIsoRoadAxis | undefined {
  const isMainStreet = y === 1 && x >= -6 && x <= 6;
  const isCrossStreet = x === 1 && y >= -5 && y <= 5;
  const isFrontageStreet = y === -2 && x >= -3 && x <= 1;
  const isSideAlleyVertical = x === -4 && y >= 1 && y <= 3;
  const isSideAlleyHorizontal = y === 3 && x >= -4 && x <= -2;

  if (isCrossStreet || isSideAlleyVertical) return "y";
  if (isMainStreet || isFrontageStreet || isSideAlleyHorizontal) return "x";
  return undefined;
}

function getPreviewRoadKind(x: number, y: number): StoryIsoTileKind {
  return Math.abs(x + y) % 2 === 1 ? "road" : "roadCracked";
}

function getPreviewTileKind(x: number, y: number): StoryIsoTileKind {
  if (isPreviewFoundationTile(x, y)) return "foundation";

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

function createStoryIsoPreviewTile(
  x: number,
  y: number,
): StoryIsoTileDefinition {
  const roadAxis = getPreviewRoadAxis(x, y);
  if (roadAxis) {
    return { x, y, kind: getPreviewRoadKind(x, y), roadAxis };
  }

  return { x, y, kind: getPreviewTileKind(x, y) };
}

function createStoryIsoPreviewTiles(): StoryIsoTileDefinition[] {
  const tiles: StoryIsoTileDefinition[] = [];

  for (let x = -6; x <= 6; x += 1) {
    for (let y = -5; y <= 5; y += 1) {
      tiles.push(createStoryIsoPreviewTile(x, y));
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
      tile: { ...STORY_A2_BUILDING_PLACEMENTS[0].tile },
      footprint: { ...STORY_A2_BUILDING_PLACEMENTS[0].footprint },
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
      tile: { ...STORY_A2_BUILDING_PLACEMENTS[1].tile },
      footprint: { ...STORY_A2_BUILDING_PLACEMENTS[1].footprint },
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
      tile: { ...STORY_A2_BUILDING_PLACEMENTS[2].tile },
      footprint: { ...STORY_A2_BUILDING_PLACEMENTS[2].footprint },
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
      tile: { x: 4, y: 1 },
      footprint: { x: 4, y: 1, width: 1, height: 1 },
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
      footprint: { ...STORY_A2_LIGHTHOUSE_FOUNDATION },
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

function storyIsoTileKey(tile: StoryIsoTileCoord): string {
  return `${tile.x}:${tile.y}`;
}

export function getStoryIsoRoadConnections(
  map: StoryIsoMapDefinition,
  tile: StoryIsoTileDefinition,
): StoryIsoRoadConnection[] {
  if (!isStoryIsoRoadTile(tile)) return [];

  const roadTileKeys = new Set(
    map.tiles.filter(isStoryIsoRoadTile).map(storyIsoTileKey),
  );
  const candidates: Array<[StoryIsoRoadConnection, StoryIsoTileCoord]> = [
    ["xMinus", { x: tile.x - 1, y: tile.y }],
    ["xPlus", { x: tile.x + 1, y: tile.y }],
    ["yMinus", { x: tile.x, y: tile.y - 1 }],
    ["yPlus", { x: tile.x, y: tile.y + 1 }],
  ];

  return candidates
    .filter(([, candidate]) => roadTileKeys.has(storyIsoTileKey(candidate)))
    .map(([connection]) => connection);
}

function hasRoadConnection(
  connections: StoryIsoRoadConnection[],
  connection: StoryIsoRoadConnection,
): boolean {
  return connections.includes(connection);
}

function getStraightRoadTextureKey(
  tile: StoryIsoTileDefinition,
  axis: StoryIsoRoadAxis,
): StoryRoadKitTextureKey {
  if (tile.kind === "roadCracked") {
    return axis === "y" ? "crackedStraightY" : "crackedStraightX";
  }

  return axis === "y" ? "straightY" : "straightX";
}

export function getStoryIsoRoadTextureKey(
  map: StoryIsoMapDefinition,
  tile: StoryIsoTileDefinition,
): StoryRoadKitTextureKey {
  const connections = getStoryIsoRoadConnections(map, tile);
  const connectionCount = connections.length;

  if (connectionCount >= 4) return "intersection";

  if (connectionCount === 3) {
    if (!hasRoadConnection(connections, "yMinus")) return "tNorth";
    if (!hasRoadConnection(connections, "xPlus")) return "tEast";
    if (!hasRoadConnection(connections, "yPlus")) return "tSouth";
    return "tWest";
  }

  if (connectionCount === 2) {
    const hasXMinus = hasRoadConnection(connections, "xMinus");
    const hasXPlus = hasRoadConnection(connections, "xPlus");
    const hasYMinus = hasRoadConnection(connections, "yMinus");
    const hasYPlus = hasRoadConnection(connections, "yPlus");

    if (hasXMinus && hasXPlus) return getStraightRoadTextureKey(tile, "x");
    if (hasYMinus && hasYPlus) return getStraightRoadTextureKey(tile, "y");
    if (hasXPlus && hasYMinus) return "cornerSE";
    if (hasXPlus && hasYPlus) return "cornerNE";
    if (hasXMinus && hasYMinus) return "cornerSW";
    return "cornerNW";
  }

  return getStraightRoadTextureKey(tile, tile.roadAxis ?? "x");
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
    .map((prop) => {
      const basePoint = getStoryIsoPropBasePoint(prop, center);
      return {
        id: `story-a2-blocking-${prop.label}`,
        x: basePoint.x,
        y: basePoint.y,
        width: Math.round(
          prop.footprint.width * map.tileSize * STORY_A2_BLOCKING_FOOTPRINT_SCALE,
        ),
        height: Math.round(
          prop.footprint.height * map.tileSize * STORY_A2_BLOCKING_FOOTPRINT_SCALE,
        ),
      };
    });
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
