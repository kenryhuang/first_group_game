import { STORY_REGION_PASSAGES, STORY_REGIONS, getStoryPassageRects } from "./storyRegions";

export interface Rect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export interface Point {
  x: number;
  y: number;
}

export const BUILDING_LABELS: Record<string, string> = {
  "res-police-hq-compound-building-main": "警局",
  "res-hospital-compound-building-main": "医院",
  "res-fire-station-compound-building-main": "消防局",
  "res-courier-station-compound-building-main": "快递站",
  "ent-circus-main-tent": "马戏团",
  "ent-circus-magic-stage": "魔术舞台",
  "ent-beast-cage": "万兽笼",
};

const RESIDENTIAL_CIVIC_COMPOUNDS: Rect[] = [
  ...createResidentialCivicCompound("res-police-hq", 26000, 6200, 1100, 850, "bottom"),
  ...createResidentialCivicCompound("res-hospital", 34200, 6500, 1500, 1000, "left"),
  ...createResidentialCivicCompound("res-fire-station", 26000, 12500, 1100, 800, "top"),
  ...createResidentialCivicCompound("res-courier-station", 34200, 12500, 1400, 820, "left"),
];

const RESIDENTIAL_DENSE_BLOCKS: Rect[] = [
  ...createResidentialBlock("res-nw-apartment", 24880, 7600, 8, 6, 520, 520, 360, 330),
  ...createResidentialBlock("res-ne-apartment", 30900, 7600, 9, 6, 520, 520, 380, 340),
  ...createResidentialBlock("res-north-lane", 27800, 5400, 7, 2, 520, 480, 340, 250),
  ...createResidentialBlock("res-south-shop", 27800, 13400, 9, 2, 520, 360, 360, 220),
  ...createResidentialBlock("res-west-shop", 24880, 9800, 6, 3, 500, 500, 360, 280),
  ...createResidentialBlock("res-east-shop", 31900, 9800, 7, 3, 500, 500, 360, 280),
];

const ENTERTAINMENT_CIRCUS_BUILDINGS: Rect[] = [
  { id: "ent-circus-main-tent", x: 32200, y: 27600, width: 5200, height: 3600 },
  { id: "ent-circus-magic-stage", x: 30200, y: 27600, width: 1500, height: 1100 },
  { id: "ent-circus-ticket-gate", x: 31800, y: 31700, width: 2600, height: 700 },
  { id: "ent-circus-parade-loop", x: 32200, y: 30900, width: 4800, height: 520 },
  ...createResidentialBlock("ent-circus-kiosk", 27900, 24750, 7, 2, 760, 650, 420, 320),
  ...createResidentialBlock("ent-circus-lantern", 28700, 24140, 8, 2, 700, 760, 260, 180),
  ...createResidentialBlock("ent-circus-side-tent", 35100, 25300, 2, 7, 650, 860, 520, 420),
  ...createResidentialBlock("ent-circus-ring-stand", 29200, 29900, 7, 2, 700, 640, 420, 330),
  ...createResidentialBlock("ent-circus-caravan", 28100, 31850, 6, 1, 760, 420, 460, 360),
  ...createResidentialBlock("ent-circus-banner", 31200, 32320, 9, 2, 450, 300, 300, 180),
];

const ENTERTAINMENT_BEAST_BUILDINGS: Rect[] = [
  { id: "ent-beast-cage", x: 26450, y: 30000, width: 2600, height: 2500 },
  { id: "ent-beast-training-yard", x: 27100, y: 32300, width: 3500, height: 900 },
  ...createResidentialBlock("ent-beast-pen", 25080, 28600, 4, 2, 760, 900, 560, 480),
];

const ENTERTAINMENT_MAZE_WALLS: Rect[] = createEntertainmentMazeWalls();

const ENTERTAINMENT_FAKE_MAZE_WALLS: Rect[] = [
  { id: "ent-maze-fake-wall-01", x: 26100, y: 24180, width: 1000, height: 160 },
  { id: "ent-maze-fake-wall-02", x: 27400, y: 25600, width: 160, height: 820 },
  { id: "ent-maze-fake-wall-03", x: 25580, y: 26400, width: 1080, height: 160 },
  { id: "ent-maze-fake-wall-04", x: 28600, y: 25700, width: 160, height: 1020 },
  { id: "ent-maze-fake-wall-05", x: 28700, y: 28200, width: 1200, height: 160 },
  { id: "ent-maze-fake-wall-06", x: 24900, y: 30020, width: 160, height: 1180 },
  { id: "ent-maze-fake-wall-07", x: 28600, y: 30840, width: 1450, height: 160 },
  { id: "ent-maze-fake-wall-08", x: 28080, y: 31780, width: 160, height: 1240 },
  { id: "ent-maze-fake-wall-09", x: 29550, y: 30920, width: 1600, height: 160 },
  { id: "ent-maze-fake-wall-10", x: 30950, y: 32000, width: 160, height: 1280 },
  { id: "ent-maze-fake-wall-11", x: 35600, y: 28600, width: 1200, height: 160 },
  { id: "ent-maze-fake-wall-12", x: 33350, y: 24480, width: 160, height: 960 },
  { id: "ent-maze-fake-wall-13", x: 24780, y: 25260, width: 160, height: 860 },
  { id: "ent-maze-fake-wall-14", x: 25680, y: 25720, width: 160, height: 1000 },
  { id: "ent-maze-fake-wall-15", x: 26880, y: 26380, width: 160, height: 1000 },
  { id: "ent-maze-fake-wall-16", x: 28680, y: 26300, width: 160, height: 900 },
  { id: "ent-maze-fake-wall-17", x: 29020, y: 28050, width: 160, height: 980 },
  { id: "ent-maze-fake-wall-18", x: 28920, y: 29880, width: 1200, height: 160 },
  { id: "ent-maze-fake-wall-19", x: 28640, y: 30660, width: 160, height: 1200 },
  { id: "ent-maze-fake-wall-20", x: 28120, y: 31400, width: 160, height: 1180 },
  { id: "ent-maze-fake-wall-21", x: 30400, y: 29900, width: 1600, height: 160 },
  { id: "ent-maze-fake-wall-22", x: 35200, y: 28100, width: 160, height: 1500 },
  { id: "ent-maze-fake-wall-23", x: 34880, y: 31300, width: 2200, height: 160 },
  { id: "ent-maze-fake-wall-24", x: 32500, y: 32100, width: 160, height: 1300 },
];

const ENTERTAINMENT_BUILDINGS: Rect[] = [
  ...ENTERTAINMENT_CIRCUS_BUILDINGS,
  ...ENTERTAINMENT_BEAST_BUILDINGS,
  ...ENTERTAINMENT_MAZE_WALLS,
  ...ENTERTAINMENT_FAKE_MAZE_WALLS,
];

const STORY_REGION_WALL_THICKNESS = 260;
const STORY_PASSAGE_WALL_THICKNESS = 220;
const STORY_REGION_WALLS: Rect[] = createStoryRegionBoundaryWalls();
const STORY_PASSAGE_WALLS: Rect[] = createStoryPassageSideWalls();
const STORY_GATE_WALLS: Rect[] = [];

export const BUILDINGS: Rect[] = [
  { id: "apartments-nw", x: 520, y: 520, width: 260, height: 360 },
  { id: "market-ruin", x: 1040, y: 620, width: 420, height: 220 },
  { id: "clinic-block", x: 1540, y: 520, width: 280, height: 340 },
  { id: "office-shell", x: 2380, y: 620, width: 380, height: 300 },
  { id: "theater-back", x: 3180, y: 620, width: 520, height: 260 },
  { id: "restaurant-row", x: 620, y: 1340, width: 360, height: 260 },
  { id: "police-annex", x: 1320, y: 1380, width: 320, height: 420 },
  { id: "subway-mouth", x: 2240, y: 1320, width: 460, height: 240 },
  { id: "warehouse", x: 3320, y: 1420, width: 420, height: 420 },
  { id: "central-tower", x: 2560, y: 2060, width: 360, height: 520 },
  { id: "collapsed-mall", x: 780, y: 2420, width: 560, height: 320 },
  { id: "parking-stack", x: 2960, y: 2380, width: 480, height: 280 },
  { id: "hospital-wing", x: 1060, y: 3260, width: 520, height: 360 },
  { id: "courier-depot", x: 3140, y: 3260, width: 560, height: 380 },
  { id: "tenement-se", x: 2220, y: 3440, width: 320, height: 420 },
  { id: "central-apartments", x: 4620, y: 4580, width: 420, height: 260 },
  { id: "central-office", x: 5480, y: 4680, width: 360, height: 520 },
  { id: "central-mall", x: 4940, y: 5580, width: 620, height: 300 },
  { id: "central-annex", x: 4140, y: 5320, width: 300, height: 460 },
  { id: "central-station", x: 6100, y: 5200, width: 420, height: 420 },
  { id: "northwest-block", x: 2100, y: 1260, width: 520, height: 360 },
  { id: "theater-block", x: 7420, y: 2320, width: 580, height: 320 },
  { id: "hospital-campus", x: 2820, y: 7420, width: 620, height: 360 },
  { id: "courier-campus", x: 7280, y: 8060, width: 500, height: 460 },
  ...RESIDENTIAL_CIVIC_COMPOUNDS,
  ...RESIDENTIAL_DENSE_BLOCKS,
  ...STORY_REGION_WALLS,
  ...STORY_PASSAGE_WALLS,
  ...STORY_GATE_WALLS,
  ...ENTERTAINMENT_BUILDINGS,
];

export function getBuildingsForMode(mode: "classic" | "story" | "bossRush", buildings = BUILDINGS): Rect[] {
  if (mode === "story") return buildings.filter(isStoryModeBuilding);
  return buildings.filter((building) => !isStoryModeBuilding(building));
}

function createResidentialCivicCompound(
  idPrefix: string,
  x: number,
  y: number,
  width: number,
  height: number,
  entranceSide: "top" | "right" | "bottom" | "left",
): Rect[] {
  const thickness = 96;
  const gap = Math.min(420, Math.max(300, Math.min(width, height) * 0.32));
  const halfGap = gap / 2;
  const wallLengthX = (width - gap) / 2;
  const wallLengthY = (height - gap) / 2;
  const top = y - height / 2;
  const bottom = y + height / 2;
  const left = x - width / 2;
  const right = x + width / 2;
  const walls: Rect[] = [
    { id: `${idPrefix}-compound-wall-top-left`, x: left + wallLengthX / 2, y: top, width: wallLengthX, height: thickness },
    { id: `${idPrefix}-compound-wall-top-right`, x: right - wallLengthX / 2, y: top, width: wallLengthX, height: thickness },
    { id: `${idPrefix}-compound-wall-bottom-left`, x: left + wallLengthX / 2, y: bottom, width: wallLengthX, height: thickness },
    { id: `${idPrefix}-compound-wall-bottom-right`, x: right - wallLengthX / 2, y: bottom, width: wallLengthX, height: thickness },
    { id: `${idPrefix}-compound-wall-left-upper`, x: left, y: top + wallLengthY / 2, width: thickness, height: wallLengthY },
    { id: `${idPrefix}-compound-wall-left-lower`, x: left, y: bottom - wallLengthY / 2, width: thickness, height: wallLengthY },
    { id: `${idPrefix}-compound-wall-right-upper`, x: right, y: top + wallLengthY / 2, width: thickness, height: wallLengthY },
    { id: `${idPrefix}-compound-wall-right-lower`, x: right, y: bottom - wallLengthY / 2, width: thickness, height: wallLengthY },
  ];

  const extraGapWallIds =
    entranceSide === "top"
      ? [`${idPrefix}-compound-wall-top-left`, `${idPrefix}-compound-wall-top-right`]
      : entranceSide === "bottom"
        ? [`${idPrefix}-compound-wall-bottom-left`, `${idPrefix}-compound-wall-bottom-right`]
        : entranceSide === "left"
          ? [`${idPrefix}-compound-wall-left-upper`, `${idPrefix}-compound-wall-left-lower`]
          : [`${idPrefix}-compound-wall-right-upper`, `${idPrefix}-compound-wall-right-lower`];
  const entry = {
    x: entranceSide === "left" ? left + thickness * 1.6 : entranceSide === "right" ? right - thickness * 1.6 : x,
    y: entranceSide === "top" ? top + thickness * 1.6 : entranceSide === "bottom" ? bottom - thickness * 1.6 : y,
  };
  const wallsWithEntrance = walls.filter((wall) => !extraGapWallIds.includes(wall.id));

  return [
    ...wallsWithEntrance,
    { id: `${idPrefix}-compound-entry-marker`, x: entry.x, y: entry.y, width: 24, height: 24 },
    { id: `${idPrefix}-compound-center-marker`, x, y, width: 24, height: 24 },
    { id: `${idPrefix}-compound-building-main`, x, y: y - height * 0.12, width: width * 0.32, height: height * 0.26 },
    { id: `${idPrefix}-compound-building-left-wing`, x: x - width * 0.26, y: y + height * 0.08, width: width * 0.22, height: height * 0.24 },
    { id: `${idPrefix}-compound-building-right-wing`, x: x + width * 0.26, y: y + height * 0.08, width: width * 0.22, height: height * 0.24 },
    { id: `${idPrefix}-compound-building-yard-shed`, x: x - width * 0.18, y: y + height * 0.34, width: width * 0.18, height: height * 0.16 },
    { id: `${idPrefix}-compound-building-garage`, x: x + width * 0.2, y: y + height * 0.34, width: width * 0.24, height: height * 0.15 },
    { id: `${idPrefix}-compound-building-watch-post`, x: x + width * 0.34, y: y - height * 0.28, width: width * 0.12, height: height * 0.13 },
  ];
}

function createResidentialBlock(
  idPrefix: string,
  startX: number,
  startY: number,
  columns: number,
  rows: number,
  gapX: number,
  gapY: number,
  baseWidth: number,
  baseHeight: number,
): Rect[] {
  const buildings: Rect[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      buildings.push({
        id: `${idPrefix}-${row + 1}-${column + 1}`,
        x: startX + column * gapX,
        y: startY + row * gapY,
        width: baseWidth + ((row + column) % 2) * 40,
        height: baseHeight + ((row * 2 + column) % 3) * 35,
      });
    }
  }
  return buildings;
}

export function circleIntersectsBuildings(circle: Circle, buildings = BUILDINGS): boolean {
  return buildings.some((building) => circleIntersectsRect(circle, building));
}

export function isBlockingBuilding(building: Rect): boolean {
  return (
    building.id.startsWith("ent-maze-wall-") ||
    building.id.startsWith("story-region-wall-") ||
    building.id.startsWith("story-passage-wall-") ||
    building.id.startsWith("story-gate-wall-")
  );
}

function isStoryCityWall(building: Rect): boolean {
  return (
    building.id.startsWith("story-region-wall-") ||
    building.id.startsWith("story-passage-wall-") ||
    building.id.startsWith("story-gate-wall-")
  );
}

function isStoryModeBuilding(building: Rect): boolean {
  return building.id.startsWith("res-") || building.id.startsWith("ent-") || isStoryCityWall(building);
}

export function isFakeMazeWall(building: Rect): boolean {
  return building.id.startsWith("ent-maze-fake-wall-");
}

export function resolveBlockedMovement(from: Point, to: Point, radius: number, buildings = BUILDINGS): Point {
  return resolveBlockedMovementWithBlockingBuildings(from, to, radius, buildings.filter(isBlockingBuilding));
}

export function resolveBlockedMovementWithBlockingBuildings(
  from: Point,
  to: Point,
  radius: number,
  blockingBuildings: Rect[],
): Point {
  if (blockingBuildings.length === 0 || !movementIntersectsBuildings(from, to, radius, blockingBuildings)) return to;

  const horizontal = { x: to.x, y: from.y };
  if (!movementIntersectsBuildings(from, horizontal, radius, blockingBuildings)) return horizontal;

  const vertical = { x: from.x, y: to.y };
  if (!movementIntersectsBuildings(from, vertical, radius, blockingBuildings)) return vertical;

  return from;
}

function movementIntersectsBuildings(from: Point, to: Point, radius: number, blockingBuildings: Rect[]): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const stepLength = Math.max(6, radius * 0.75);
  const steps = Math.max(1, Math.ceil(distance / stepLength));

  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps;
    const point = {
      x: from.x + dx * progress,
      y: from.y + dy * progress,
    };
    if (circleIntersectsBuildings({ ...point, radius }, blockingBuildings)) return true;
  }

  return false;
}

export function pointInsideBuildings(point: Point, buildings = BUILDINGS): boolean {
  return getContainingBuildingId(point, buildings) !== null;
}

export function getContainingBuildingId(point: Point, buildings = BUILDINGS): string | null {
  return buildings.find((building) => (
    point.x >= building.x - building.width / 2 &&
    point.x <= building.x + building.width / 2 &&
    point.y >= building.y - building.height / 2 &&
    point.y <= building.y + building.height / 2
  ))?.id ?? null;
}

function circleIntersectsRect(circle: Circle, rect: Rect): boolean {
  const closestX = clamp(circle.x, rect.x - rect.width / 2, rect.x + rect.width / 2);
  const closestY = clamp(circle.y, rect.y - rect.height / 2, rect.y + rect.height / 2);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;

  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x - a.width / 2 < b.x + b.width / 2 &&
    a.x + a.width / 2 > b.x - b.width / 2 &&
    a.y - a.height / 2 < b.y + b.height / 2 &&
    a.y + a.height / 2 > b.y - b.height / 2
  );
}

function rectContainsRect(container: Rect, rect: Rect): boolean {
  return (
    rect.x - rect.width / 2 >= container.x - container.width / 2 &&
    rect.x + rect.width / 2 <= container.x + container.width / 2 &&
    rect.y - rect.height / 2 >= container.y - container.height / 2 &&
    rect.y + rect.height / 2 <= container.y + container.height / 2
  );
}

function createEntertainmentMazeWalls(): Rect[] {
  const bounds = { id: "entertainment-bounds", x: 30500, y: 28500, width: 11700, height: 9000 };
  const keepouts = [
    { id: "route-entry-south", x: 30500, y: 24620, width: 320, height: 1100 },
    { id: "route-west-first", x: 29880, y: 25160, width: 1700, height: 300 },
    { id: "route-south-first", x: 29080, y: 26080, width: 300, height: 2100 },
    { id: "route-east-hook", x: 29520, y: 27040, width: 1300, height: 300 },
    { id: "route-south-circus", x: 30080, y: 28080, width: 300, height: 2300 },
    { id: "route-circus-door", x: 29740, y: 28880, width: 760, height: 320 },
    { id: "route-beast-west", x: 28920, y: 28720, width: 1900, height: 300 },
    { id: "route-beast-south", x: 28300, y: 29880, width: 300, height: 2600 },
    { id: "route-beast-door", x: 28040, y: 31000, width: 520, height: 320 },
    { id: "circus-core-clear", x: 32200, y: 27600, width: 5600, height: 4000 },
    { id: "beast-core-clear", x: 26450, y: 30000, width: 3000, height: 2900 },
  ];
  const fixedWalls: Rect[] = [
    { id: "ent-maze-wall-01", x: 36100, y: 25800, width: 160, height: 1200 },
    { id: "ent-maze-wall-bypass-east-2", x: 36100, y: 28600, width: 160, height: 1200 },
    { id: "ent-maze-wall-bypass-east-3", x: 36100, y: 31800, width: 160, height: 1600 },
    { id: "ent-maze-wall-bypass-south-1", x: 35600, y: 32800, width: 900, height: 160 },
    { id: "ent-maze-wall-bypass-south-2", x: 32200, y: 32800, width: 1800, height: 160 },
    { id: "ent-maze-wall-bypass-south-3", x: 27600, y: 32800, width: 1500, height: 160 },
    { id: "ent-maze-wall-circus-top", x: 32200, y: 25680, width: 5200, height: 160 },
    { id: "ent-maze-wall-circus-right", x: 34920, y: 27600, width: 160, height: 3600 },
    { id: "ent-maze-wall-circus-bottom", x: 32200, y: 29520, width: 5200, height: 160 },
    { id: "ent-maze-wall-circus-left-upper", x: 29480, y: 27160, width: 160, height: 2960 },
    { id: "ent-maze-wall-circus-left-lower", x: 29480, y: 29460, width: 160, height: 680 },
    { id: "ent-maze-wall-circus-bottom-left-cap", x: 29540, y: 29680, width: 300, height: 160 },
    { id: "ent-maze-wall-beast-top", x: 26450, y: 28630, width: 2600, height: 160 },
    { id: "ent-maze-wall-beast-bottom", x: 26450, y: 31370, width: 2600, height: 160 },
    { id: "ent-maze-wall-beast-left", x: 25030, y: 30000, width: 160, height: 2500 },
    { id: "ent-maze-wall-beast-right-upper", x: 27870, y: 29660, width: 160, height: 2060 },
    { id: "ent-maze-wall-beast-right-lower", x: 27870, y: 31280, width: 160, height: 180 },
  ];
  const generatedWalls: Rect[] = [];
  let index = 1;

  for (let x = 24980; x <= 35780; x += 430) {
    for (let y = 24760; y <= 32480; y += 1260) {
      const wall = {
        id: `ent-maze-wall-generated-v-${index}`,
        x,
        y: y + ((x / 520) % 2 === 0 ? 220 : -180),
        width: 140,
        height: 980 + (index % 3) * 170,
      };
      index += 1;
      if (rectContainsRect(bounds, wall) && !keepouts.some((keepout) => rectsOverlap(wall, keepout))) generatedWalls.push(wall);
    }
  }

  for (let y = 24640; y <= 32600; y += 450) {
    for (let x = 25200; x <= 35600; x += 1380) {
      const wall = {
        id: `ent-maze-wall-generated-h-${index}`,
        x: x + ((y / 560) % 2 === 0 ? 240 : -160),
        y,
        width: 840 + (index % 4) * 160,
        height: 140,
      };
      index += 1;
      if (rectContainsRect(bounds, wall) && !keepouts.some((keepout) => rectsOverlap(wall, keepout))) generatedWalls.push(wall);
    }
  }

  return [...fixedWalls, ...generatedWalls];
}

function createStoryRegionBoundaryWalls(): Rect[] {
  return STORY_REGIONS.flatMap((region) => {
    const left = region.x - region.width / 2;
    const right = region.x + region.width / 2;
    const top = region.y - region.height / 2;
    const bottom = region.y + region.height / 2;
    const connectedPassages = STORY_REGION_PASSAGES.filter(
      (passage) => passage.fromRegionId === region.id || passage.toRegionId === region.id,
    ).flatMap(getStoryPassageRects);
    const gaps = {
      top: getStoryWallGaps(region, connectedPassages, "top"),
      right: getStoryWallGaps(region, connectedPassages, "right"),
      bottom: getStoryWallGaps(region, connectedPassages, "bottom"),
      left: getStoryWallGaps(region, connectedPassages, "left"),
    };

    return [
      ...createHorizontalStoryWallSegments(`story-region-wall-${region.id}-top`, left, right, top, STORY_REGION_WALL_THICKNESS, gaps.top),
      ...createHorizontalStoryWallSegments(`story-region-wall-${region.id}-bottom`, left, right, bottom, STORY_REGION_WALL_THICKNESS, gaps.bottom),
      ...createVerticalStoryWallSegments(`story-region-wall-${region.id}-left`, top, bottom, left, STORY_REGION_WALL_THICKNESS, gaps.left),
      ...createVerticalStoryWallSegments(`story-region-wall-${region.id}-right`, top, bottom, right, STORY_REGION_WALL_THICKNESS, gaps.right),
    ];
  });
}

function createStoryPassageSideWalls(): Rect[] {
  return STORY_REGION_PASSAGES.flatMap((passage) => {
    const connectedRegions = STORY_REGIONS.filter(
      (region) => region.id === passage.fromRegionId || region.id === passage.toRegionId,
    );
    const rects = getStoryPassageRects(passage);
    return rects.flatMap((rect, rectIndex) => {
      const vertical = rect.height >= rect.width;
      const siblingRects = rects.filter((_, index) => index !== rectIndex);
    if (vertical) {
      const top = rect.y - rect.height / 2;
      const bottom = rect.y + rect.height / 2;
      const leftX = rect.x - rect.width / 2 - STORY_PASSAGE_WALL_THICKNESS / 2;
      const rightX = rect.x + rect.width / 2 + STORY_PASSAGE_WALL_THICKNESS / 2;
      return [
        ...createVerticalStoryWallSegments(
          `story-passage-wall-${passage.id}-${rectIndex + 1}-left`,
          top,
          bottom,
          leftX,
          STORY_PASSAGE_WALL_THICKNESS,
          getStoryPassageSideGaps(rect, connectedRegions, siblingRects, "left"),
        ),
        ...createVerticalStoryWallSegments(
          `story-passage-wall-${passage.id}-${rectIndex + 1}-right`,
          top,
          bottom,
          rightX,
          STORY_PASSAGE_WALL_THICKNESS,
          getStoryPassageSideGaps(rect, connectedRegions, siblingRects, "right"),
        ),
      ];
    }
    const left = rect.x - rect.width / 2;
    const right = rect.x + rect.width / 2;
    const topY = rect.y - rect.height / 2 - STORY_PASSAGE_WALL_THICKNESS / 2;
    const bottomY = rect.y + rect.height / 2 + STORY_PASSAGE_WALL_THICKNESS / 2;
    return [
      ...createHorizontalStoryWallSegments(
        `story-passage-wall-${passage.id}-${rectIndex + 1}-top`,
        left,
        right,
        topY,
        STORY_PASSAGE_WALL_THICKNESS,
        getStoryPassageSideGaps(rect, connectedRegions, siblingRects, "top"),
      ),
      ...createHorizontalStoryWallSegments(
        `story-passage-wall-${passage.id}-${rectIndex + 1}-bottom`,
        left,
        right,
        bottomY,
        STORY_PASSAGE_WALL_THICKNESS,
        getStoryPassageSideGaps(rect, connectedRegions, siblingRects, "bottom"),
      ),
    ];
    });
  });
}

type StoryWallSide = "top" | "right" | "bottom" | "left";

function getStoryWallGaps(
  region: { x: number; y: number; width: number; height: number },
  passages: Array<{ x: number; y: number; width: number; height: number }>,
  side: StoryWallSide,
): Array<{ start: number; end: number }> {
  const left = region.x - region.width / 2;
  const right = region.x + region.width / 2;
  const top = region.y - region.height / 2;
  const bottom = region.y + region.height / 2;
  const gapPadding = 240;
  const fallbackGapHalfSize = 720;
  const gaps: Array<{ start: number; end: number }> = [];

  for (const passage of passages) {
    const passageLeft = passage.x - passage.width / 2;
    const passageRight = passage.x + passage.width / 2;
    const passageTop = passage.y - passage.height / 2;
    const passageBottom = passage.y + passage.height / 2;
    const touchesLeft = passageRight >= left - gapPadding && passageLeft <= left + gapPadding;
    const touchesRight = passageLeft <= right + gapPadding && passageRight >= right - gapPadding;
    const touchesTop = passageBottom >= top - gapPadding && passageTop <= top + gapPadding;
    const touchesBottom = passageTop <= bottom + gapPadding && passageBottom >= bottom - gapPadding;

    if (side === "left" && passage.x <= left && touchesLeft) {
      const passageTop = passage.y - passage.height / 2;
      const passageBottom = passage.y + passage.height / 2;
      const overlapStart = Math.max(passageTop, top);
      const overlapEnd = Math.min(passageBottom, bottom);
      const center = clamp(passage.y, top, bottom);
      gaps.push({
        start: clamp((overlapEnd > overlapStart ? overlapStart : center - fallbackGapHalfSize) - gapPadding, top, bottom),
        end: clamp((overlapEnd > overlapStart ? overlapEnd : center + fallbackGapHalfSize) + gapPadding, top, bottom),
      });
    }
    if (side === "right" && passage.x >= right && touchesRight) {
      const passageTop = passage.y - passage.height / 2;
      const passageBottom = passage.y + passage.height / 2;
      const overlapStart = Math.max(passageTop, top);
      const overlapEnd = Math.min(passageBottom, bottom);
      const center = clamp(passage.y, top, bottom);
      gaps.push({
        start: clamp((overlapEnd > overlapStart ? overlapStart : center - fallbackGapHalfSize) - gapPadding, top, bottom),
        end: clamp((overlapEnd > overlapStart ? overlapEnd : center + fallbackGapHalfSize) + gapPadding, top, bottom),
      });
    }
    if (side === "top" && passage.y <= top && touchesTop) {
      const passageLeft = passage.x - passage.width / 2;
      const passageRight = passage.x + passage.width / 2;
      const overlapStart = Math.max(passageLeft, left);
      const overlapEnd = Math.min(passageRight, right);
      const center = clamp(passage.x, left, right);
      gaps.push({
        start: clamp((overlapEnd > overlapStart ? overlapStart : center - fallbackGapHalfSize) - gapPadding, left, right),
        end: clamp((overlapEnd > overlapStart ? overlapEnd : center + fallbackGapHalfSize) + gapPadding, left, right),
      });
    }
    if (side === "bottom" && passage.y >= bottom && touchesBottom) {
      const passageLeft = passage.x - passage.width / 2;
      const passageRight = passage.x + passage.width / 2;
      const overlapStart = Math.max(passageLeft, left);
      const overlapEnd = Math.min(passageRight, right);
      const center = clamp(passage.x, left, right);
      gaps.push({
        start: clamp((overlapEnd > overlapStart ? overlapStart : center - fallbackGapHalfSize) - gapPadding, left, right),
        end: clamp((overlapEnd > overlapStart ? overlapEnd : center + fallbackGapHalfSize) + gapPadding, left, right),
      });
    }
  }

  return gaps.filter((gap) => gap.end - gap.start > 120).sort((a, b) => a.start - b.start);
}

function getStoryPassageSideGaps(
  passage: { x: number; y: number; width: number; height: number },
  regions: Array<{ x: number; y: number; width: number; height: number }>,
  siblingRects: Array<{ x: number; y: number; width: number; height: number }>,
  side: StoryWallSide,
): Array<{ start: number; end: number }> {
  const left = passage.x - passage.width / 2;
  const right = passage.x + passage.width / 2;
  const top = passage.y - passage.height / 2;
  const bottom = passage.y + passage.height / 2;
  const gapPadding = 360;
  const fallbackGapHalfSize = 520;
  const gaps: Array<{ start: number; end: number }> = [];

  for (const region of [...regions, ...siblingRects]) {
    const regionLeft = region.x - region.width / 2;
    const regionRight = region.x + region.width / 2;
    const regionTop = region.y - region.height / 2;
    const regionBottom = region.y + region.height / 2;

    if (side === "left" && region.x < passage.x) {
      const overlapStart = Math.max(regionTop, top);
      const overlapEnd = Math.min(regionBottom, bottom);
      const center = clamp(region.y, top, bottom);
      gaps.push({
        start: clamp((overlapEnd > overlapStart ? overlapStart : center - fallbackGapHalfSize) - gapPadding, top, bottom),
        end: clamp((overlapEnd > overlapStart ? overlapEnd : center + fallbackGapHalfSize) + gapPadding, top, bottom),
      });
    }
    if (side === "right" && region.x > passage.x) {
      const overlapStart = Math.max(regionTop, top);
      const overlapEnd = Math.min(regionBottom, bottom);
      const center = clamp(region.y, top, bottom);
      gaps.push({
        start: clamp((overlapEnd > overlapStart ? overlapStart : center - fallbackGapHalfSize) - gapPadding, top, bottom),
        end: clamp((overlapEnd > overlapStart ? overlapEnd : center + fallbackGapHalfSize) + gapPadding, top, bottom),
      });
    }
    if (side === "top" && region.y < passage.y) {
      const overlapStart = Math.max(regionLeft, left);
      const overlapEnd = Math.min(regionRight, right);
      const center = clamp(region.x, left, right);
      gaps.push({
        start: clamp((overlapEnd > overlapStart ? overlapStart : center - fallbackGapHalfSize) - gapPadding, left, right),
        end: clamp((overlapEnd > overlapStart ? overlapEnd : center + fallbackGapHalfSize) + gapPadding, left, right),
      });
    }
    if (side === "bottom" && region.y > passage.y) {
      const overlapStart = Math.max(regionLeft, left);
      const overlapEnd = Math.min(regionRight, right);
      const center = clamp(region.x, left, right);
      gaps.push({
        start: clamp((overlapEnd > overlapStart ? overlapStart : center - fallbackGapHalfSize) - gapPadding, left, right),
        end: clamp((overlapEnd > overlapStart ? overlapEnd : center + fallbackGapHalfSize) + gapPadding, left, right),
      });
    }
  }

  return gaps.filter((gap) => gap.end - gap.start > 120).sort((a, b) => a.start - b.start);
}

function createHorizontalStoryWallSegments(
  idPrefix: string,
  startX: number,
  endX: number,
  y: number,
  thickness: number,
  gaps: Array<{ start: number; end: number }>,
): Rect[] {
  const segments: Rect[] = [];
  let cursor = startX;
  let index = 1;
  for (const gap of gaps) {
    if (gap.start > cursor + 120) {
      segments.push(createStoryWallRect(`${idPrefix}-${index}`, cursor, gap.start, y, thickness, "horizontal"));
      index += 1;
    }
    cursor = Math.max(cursor, gap.end);
  }
  if (endX > cursor + 120) {
    segments.push(createStoryWallRect(`${idPrefix}-${index}`, cursor, endX, y, thickness, "horizontal"));
  }
  return segments;
}

function createVerticalStoryWallSegments(
  idPrefix: string,
  startY: number,
  endY: number,
  x: number,
  thickness: number,
  gaps: Array<{ start: number; end: number }>,
): Rect[] {
  const segments: Rect[] = [];
  let cursor = startY;
  let index = 1;
  for (const gap of gaps) {
    if (gap.start > cursor + 120) {
      segments.push(createStoryWallRect(`${idPrefix}-${index}`, cursor, gap.start, x, thickness, "vertical"));
      index += 1;
    }
    cursor = Math.max(cursor, gap.end);
  }
  if (endY > cursor + 120) {
    segments.push(createStoryWallRect(`${idPrefix}-${index}`, cursor, endY, x, thickness, "vertical"));
  }
  return segments;
}

function createStoryWallRect(id: string, start: number, end: number, fixed: number, thickness: number, orientation: "horizontal" | "vertical"): Rect {
  const length = end - start;
  if (orientation === "horizontal") {
    return { id, x: start + length / 2, y: fixed, width: length, height: thickness };
  }
  return { id, x: fixed, y: start + length / 2, width: thickness, height: length };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
