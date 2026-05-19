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
];

export function circleIntersectsBuildings(circle: Circle, buildings = BUILDINGS): boolean {
  return buildings.some((building) => circleIntersectsRect(circle, building));
}

export function resolveBlockedMovement(from: Point, to: Point, radius: number, buildings = BUILDINGS): Point {
  if (!circleIntersectsBuildings({ ...to, radius }, buildings)) {
    return to;
  }

  const horizontal = { x: to.x, y: from.y };
  if (!circleIntersectsBuildings({ ...horizontal, radius }, buildings)) {
    return horizontal;
  }

  const vertical = { x: from.x, y: to.y };
  if (!circleIntersectsBuildings({ ...vertical, radius }, buildings)) {
    return vertical;
  }

  return from;
}

export function pointInsideBuildings(point: Point, buildings = BUILDINGS): boolean {
  return buildings.some((building) => (
    point.x >= building.x - building.width / 2 &&
    point.x <= building.x + building.width / 2 &&
    point.y >= building.y - building.height / 2 &&
    point.y <= building.y + building.height / 2
  ));
}

function circleIntersectsRect(circle: Circle, rect: Rect): boolean {
  const closestX = clamp(circle.x, rect.x - rect.width / 2, rect.x + rect.width / 2);
  const closestY = clamp(circle.y, rect.y - rect.height / 2, rect.y + rect.height / 2);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;

  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
