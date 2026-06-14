import { describe, expect, it } from "vitest";
import {
  BUILDINGS,
  BUILDING_LABELS,
  circleIntersectsBuildings,
  getContainingBuildingId,
  getBuildingsForMode,
  isBlockingBuilding,
  isFakeMazeWall,
  pointInsideBuildings,
  resolveBlockedMovement,
} from "./terrain";
import { STORY_REGION_PASSAGES, STORY_REGIONS } from "./storyRegions";
import type { Rect } from "./terrain";

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x - a.width / 2 < b.x + b.width / 2 &&
    a.x + a.width / 2 > b.x - b.width / 2 &&
    a.y - a.height / 2 < b.y + b.height / 2 &&
    a.y + a.height / 2 > b.y - b.height / 2
  );
}

function rectContainsPoint(rect: Rect, point: { x: number; y: number }, radius = 18): boolean {
  return (
    point.x + radius >= rect.x - rect.width / 2 &&
    point.x - radius <= rect.x + rect.width / 2 &&
    point.y + radius >= rect.y - rect.height / 2 &&
    point.y - radius <= rect.y + rect.height / 2
  );
}

function hasWalkableGridPath(
  start: { x: number; y: number },
  target: { x: number; y: number },
  bounds: { left: number; right: number; top: number; bottom: number },
  step = 160,
): boolean {
  const blockingBuildings = BUILDINGS.filter(isBlockingBuilding);
  const toGrid = (point: { x: number; y: number }) => ({
    x: Math.round((point.x - bounds.left) / step),
    y: Math.round((point.y - bounds.top) / step),
  });
  const fromGrid = (point: { x: number; y: number }) => ({
    x: bounds.left + point.x * step,
    y: bounds.top + point.y * step,
  });
  const startGrid = toGrid(start);
  const targetGrid = toGrid(target);
  const maxX = Math.round((bounds.right - bounds.left) / step);
  const maxY = Math.round((bounds.bottom - bounds.top) / step);
  const queue = [startGrid];
  const visited = new Set([`${startGrid.x},${startGrid.y}`]);
  const canStand = (point: { x: number; y: number }) =>
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom &&
    !circleIntersectsBuildings({ x: point.x, y: point.y, radius: 16 }, blockingBuildings);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (Math.abs(current.x - targetGrid.x) <= 1 && Math.abs(current.y - targetGrid.y) <= 1) return true;
    for (const next of [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ]) {
      if (next.x < 0 || next.x > maxX || next.y < 0 || next.y > maxY) continue;
      const key = `${next.x},${next.y}`;
      if (visited.has(key)) continue;
      const world = fromGrid(next);
      if (!canStand(world)) continue;
      if (resolveBlockedMovement(fromGrid(current), world, 16).x !== world.x || resolveBlockedMovement(fromGrid(current), world, 16).y !== world.y) {
        continue;
      }
      visited.add(key);
      queue.push(next);
    }
  }

  return false;
}

function canStandAt(point: { x: number; y: number }, radius = 16): boolean {
  return !circleIntersectsBuildings({ ...point, radius }, BUILDINGS.filter(isBlockingBuilding));
}

describe("terrain", () => {
  it("defines enough buildings to make the map read as city ruins", () => {
    expect(BUILDINGS.length).toBeGreaterThanOrEqual(14);
  });

  it("lays out a dense residential district with four major civic buildings", () => {
    const residentialBounds = {
      left: 24650,
      right: 36350,
      top: 4850,
      bottom: 14150,
    };
    const residentialBuildings = BUILDINGS.filter((building) => building.id.startsWith("res-"));
    const majorIds = ["res-police-hq", "res-hospital", "res-fire-station", "res-courier-station"];

    expect(residentialBuildings.length).toBeGreaterThanOrEqual(150);
    expect(majorIds.every((id) => residentialBuildings.some((building) => building.id === id))).toBe(true);
    for (const building of residentialBuildings) {
      expect(building.x - building.width / 2).toBeGreaterThanOrEqual(residentialBounds.left);
      expect(building.x + building.width / 2).toBeLessThanOrEqual(residentialBounds.right);
      expect(building.y - building.height / 2).toBeGreaterThanOrEqual(residentialBounds.top);
      expect(building.y + building.height / 2).toBeLessThanOrEqual(residentialBounds.bottom);
    }
    for (const id of majorIds) {
      const building = residentialBuildings.find((candidate) => candidate.id === id);
      expect(building).toBeDefined();
      expect((building?.width ?? 0) * (building?.height ?? 0)).toBeGreaterThanOrEqual(750000);
    }
    expect(BUILDING_LABELS).toMatchObject({
      "res-police-hq": "警局",
      "res-hospital": "医院",
      "res-fire-station": "消防局",
      "res-courier-station": "快递站",
    });
  });

  it("lays out the entertainment district as circus, beast cage, and maze areas", () => {
    const entertainmentBounds = {
      left: 24650,
      right: 36350,
      top: 24000,
      bottom: 33000,
    };
    const entertainmentBuildings = BUILDINGS.filter((building) => building.id.startsWith("ent-"));
    const circusBuildings = entertainmentBuildings.filter((building) => building.id.startsWith("ent-circus-"));
    const circusCore = entertainmentBuildings.find((building) => building.id === "ent-circus-main-tent");
    const beastCage = entertainmentBuildings.find((building) => building.id === "ent-beast-cage");
    const mazeWalls = entertainmentBuildings.filter((building) => building.id.startsWith("ent-maze-wall-"));
    const fakeMazeWalls = entertainmentBuildings.filter((building) => building.id.startsWith("ent-maze-fake-wall-"));
    const mazeObstacles = [...mazeWalls, ...fakeMazeWalls];

    expect(entertainmentBuildings.length).toBeGreaterThanOrEqual(40);
    expect(circusBuildings.length).toBeGreaterThanOrEqual(24);
    expect(circusCore).toBeDefined();
    expect(beastCage).toBeDefined();
    expect(mazeWalls.length).toBeGreaterThanOrEqual(100);
    expect(fakeMazeWalls.length).toBeGreaterThanOrEqual(20);
    expect(mazeObstacles.length).toBeGreaterThan(circusBuildings.length);
    expect(Math.max(...mazeWalls.map((building) => building.x)) - Math.min(...mazeWalls.map((building) => building.x))).toBeGreaterThan(4600);
    expect(Math.max(...mazeWalls.map((building) => building.y)) - Math.min(...mazeWalls.map((building) => building.y))).toBeGreaterThan(5200);
    expect(mazeObstacles.every((wall) => !rectsOverlap(wall, circusCore!))).toBe(true);
    expect(mazeObstacles.every((wall) => !rectsOverlap(wall, beastCage!))).toBe(true);
    for (const building of entertainmentBuildings) {
      expect(building.x - building.width / 2).toBeGreaterThanOrEqual(entertainmentBounds.left);
      expect(building.x + building.width / 2).toBeLessThanOrEqual(entertainmentBounds.right);
      expect(building.y - building.height / 2).toBeGreaterThanOrEqual(entertainmentBounds.top);
      expect(building.y + building.height / 2).toBeLessThanOrEqual(entertainmentBounds.bottom);
    }
    expect(BUILDING_LABELS).toMatchObject({
      "ent-circus-main-tent": "马戏团",
      "ent-circus-magic-stage": "魔术舞台",
      "ent-beast-cage": "万兽笼",
    });
  });

  it("breaks the easy right-then-down bypass around the entertainment maze", () => {
    const mazeWalls = BUILDINGS.filter((building) => building.id.startsWith("ent-maze-wall-"));
    const hasWallAt = (point: { x: number; y: number }) => mazeWalls.some((wall) => rectContainsPoint(wall, point));

    expect(hasWallAt({ x: 36100, y: 25800 })).toBe(true);
    expect(hasWallAt({ x: 36100, y: 28600 })).toBe(true);
    expect(hasWallAt({ x: 36100, y: 31800 })).toBe(true);
    expect(hasWallAt({ x: 35600, y: 32800 })).toBe(true);
    expect(hasWallAt({ x: 32200, y: 32800 })).toBe(true);
    expect(hasWallAt({ x: 27600, y: 32800 })).toBe(true);
  });

  it("gives the circus and beast cage exactly one narrow maze-facing entrance", () => {
    const mazeWalls = BUILDINGS.filter((building) => building.id.startsWith("ent-maze-wall-"));
    const hasWallAt = (point: { x: number; y: number }) => mazeWalls.some((wall) => rectContainsPoint(wall, point));

    const circusEntrance = { x: 29480, y: 28880 };
    const beastEntrance = { x: 27870, y: 31000 };

    expect(hasWallAt(circusEntrance)).toBe(false);
    expect(hasWallAt({ x: 32200, y: 25680 })).toBe(true);
    expect(hasWallAt({ x: 34920, y: 27600 })).toBe(true);
    expect(hasWallAt({ x: 32200, y: 29520 })).toBe(true);
    expect(hasWallAt({ x: 29480, y: 27000 })).toBe(true);
    expect(hasWallAt({ x: 29480, y: 29300 })).toBe(true);
    for (const y of [25880, 26280, 26680, 27080, 27480, 27880, 28280, 28480, 29280, 29680]) {
      expect(hasWallAt({ x: 29480, y })).toBe(true);
    }
    for (const point of [
      { x: 32200, y: 25680 },
      { x: 34920, y: 27600 },
      { x: 32200, y: 29520 },
      { x: 29480, y: 27160 },
    ]) {
      expect(resolveBlockedMovement({ x: point.x - 260, y: point.y }, point, 16)).not.toEqual(point);
    }

    expect(hasWallAt(beastEntrance)).toBe(false);
    expect(hasWallAt({ x: 26450, y: 28630 })).toBe(true);
    expect(hasWallAt({ x: 25030, y: 30000 })).toBe(true);
    expect(hasWallAt({ x: 26450, y: 31370 })).toBe(true);
    expect(hasWallAt({ x: 27870, y: 29600 })).toBe(true);
  });

  it("keeps a narrow but valid maze route into the circus and beast cage", () => {
    const entertainmentBounds = {
      left: 24650,
      right: 36350,
      top: 24000,
      bottom: 33000,
    };
    const entertainmentEntry = { x: 30500, y: 24160 };
    const circusEntrance = { x: 29480, y: 28880 };
    const beastEntrance = { x: 27870, y: 31000 };
    const mazeWalls = BUILDINGS.filter((building) => building.id.startsWith("ent-maze-wall-"));
    const hasWallAt = (point: { x: number; y: number }) => mazeWalls.some((wall) => rectContainsPoint(wall, point, 16));

    expect(hasWalkableGridPath(entertainmentEntry, circusEntrance, entertainmentBounds)).toBe(true);
    expect(hasWalkableGridPath(entertainmentEntry, beastEntrance, entertainmentBounds)).toBe(true);
    expect(hasWallAt({ x: circusEntrance.x, y: circusEntrance.y - 360 })).toBe(true);
    expect(hasWallAt({ x: circusEntrance.x, y: circusEntrance.y + 360 })).toBe(true);
    expect(hasWallAt({ x: beastEntrance.x, y: beastEntrance.y - 360 })).toBe(true);
    expect(hasWallAt({ x: beastEntrance.x, y: beastEntrance.y + 360 })).toBe(true);
  });

  it("adds blocking outer walls and black-link passage walls for every story region", () => {
    const regionWalls = BUILDINGS.filter((building) => building.id.startsWith("story-region-wall-"));
    const passageWalls = BUILDINGS.filter((building) => building.id.startsWith("story-passage-wall-"));

    for (const region of STORY_REGIONS) {
      expect(regionWalls.filter((wall) => wall.id.includes(region.id)).length).toBeGreaterThanOrEqual(4);
    }
    for (const passage of STORY_REGION_PASSAGES) {
      expect(passageWalls.filter((wall) => wall.id.includes(passage.id)).length).toBeGreaterThanOrEqual(2);
    }

    expect(regionWalls.every(isBlockingBuilding)).toBe(true);
    expect(passageWalls.every(isBlockingBuilding)).toBe(true);

    const residential = STORY_REGIONS.find((region) => region.id === "residential-zone");
    const entertainmentLink = STORY_REGION_PASSAGES.find((passage) => passage.id === "residential-to-entertainment");
    if (!residential || !entertainmentLink) throw new Error("Missing story wall fixtures");

    const outsideResidentialRightWall = {
      x: residential.x + residential.width / 2,
      y: residential.y,
    };
    expect(resolveBlockedMovement({ x: residential.x, y: residential.y }, outsideResidentialRightWall, 16)).toEqual({
      x: residential.x,
      y: residential.y,
    });
    expect(
      resolveBlockedMovement(
        { x: entertainmentLink.x, y: entertainmentLink.y - 300 },
        { x: entertainmentLink.x, y: entertainmentLink.y },
        16,
      ),
    ).toEqual({ x: entertainmentLink.x, y: entertainmentLink.y });
  });

  it("keeps only the two L-shaped north roads open from the center plaza", () => {
    const centralToResidential = STORY_REGION_PASSAGES.find((passage) => passage.id === "central-to-residential");
    const centralToMilitary = STORY_REGION_PASSAGES.find((passage) => passage.id === "central-to-military");
    if (!centralToResidential || !centralToMilitary) throw new Error("Missing center passage fixtures");

    expect(STORY_REGION_PASSAGES.filter((passage) => passage.fromRegionId === "central-plaza").map((passage) => passage.id).sort()).toEqual([
      "central-to-military",
      "central-to-residential",
    ]);
    expect(canStandAt({ x: 23025, y: 14150 })).toBe(true);
    expect(canStandAt({ x: 21400, y: 15975 })).toBe(true);
    expect(canStandAt({ x: 16975, y: 14150 })).toBe(true);
    expect(canStandAt({ x: 18600, y: 15975 })).toBe(true);
    expect(canStandAt({ x: 20000, y: 17800 })).toBe(false);
    expect(canStandAt({ x: 20000, y: 14150 })).toBe(true);
    expect(canStandAt({ x: 20000, y: 15975 })).toBe(true);
    expect(canStandAt({ x: 16975, y: 15975 })).toBe(true);
    expect(canStandAt({ x: 23025, y: 15975 })).toBe(true);
    expect(canStandAt({ x: 21030, y: 15975 })).toBe(false);
    expect(canStandAt({ x: 21770, y: 15975 })).toBe(false);
    expect(canStandAt({ x: 18230, y: 15975 })).toBe(false);
    expect(canStandAt({ x: 18970, y: 15975 })).toBe(false);
    expect(canStandAt({ x: 23025, y: 13780 })).toBe(false);
    expect(canStandAt({ x: 23025, y: 14520 })).toBe(false);
    expect(canStandAt({ x: 16975, y: 13780 })).toBe(false);
    expect(canStandAt({ x: 16975, y: 14520 })).toBe(false);
    expect(canStandAt({ x: 17400, y: 17800 })).toBe(false);
    expect(canStandAt({ x: 22600, y: 17800 })).toBe(false);
    expect(canStandAt({ x: 20000, y: 22200 })).toBe(false);
    expect(canStandAt({ x: 22600, y: 22000 })).toBe(false);
  });

  it("removes center gate plugs while keeping plaza sides and road sides sealed", () => {
    const gateWalls = BUILDINGS.filter((building) => building.id.startsWith("story-gate-wall-"));
    const residentialGate = BUILDINGS.find((building) => building.id === "story-gate-wall-central-to-residential-center-exit");
    const militaryGate = BUILDINGS.find((building) => building.id === "story-gate-wall-central-to-military-center-exit");

    expect(gateWalls).toHaveLength(0);
    expect(residentialGate).toBeUndefined();
    expect(militaryGate).toBeUndefined();
    expect(BUILDINGS.some((building) => building.id.startsWith("story-approach-block-"))).toBe(false);
    expect(canStandAt({ x: 21400, y: 17800 })).toBe(true);
    expect(canStandAt({ x: 18600, y: 17800 })).toBe(true);
    expect(canStandAt({ x: 17400, y: 20000 })).toBe(false);
    expect(canStandAt({ x: 22600, y: 20000 })).toBe(false);
    expect(canStandAt({ x: 21020, y: 15975 })).toBe(false);
    expect(canStandAt({ x: 21780, y: 15975 })).toBe(false);
    expect(canStandAt({ x: 18220, y: 15975 })).toBe(false);
    expect(canStandAt({ x: 18980, y: 15975 })).toBe(false);
    expect(resolveBlockedMovement({ x: 21400, y: 17600 }, { x: 21400, y: 17800 }, 16)).toEqual({ x: 21400, y: 17800 });
    expect(resolveBlockedMovement({ x: 18600, y: 17600 }, { x: 18600, y: 17800 }, 16)).toEqual({ x: 18600, y: 17800 });
  });

  it("blocks high-speed movement from stepping over story walls", () => {
    expect(resolveBlockedMovement({ x: 21400, y: 15975 }, { x: 20000, y: 15975 }, 16)).toEqual({ x: 21400, y: 15975 });
    expect(resolveBlockedMovement({ x: 18600, y: 15975 }, { x: 20000, y: 15975 }, 16)).toEqual({ x: 18600, y: 15975 });
    expect(resolveBlockedMovement({ x: 20000, y: 20000 }, { x: 17000, y: 20000 }, 16)).toEqual({ x: 20000, y: 20000 });
    expect(resolveBlockedMovement({ x: 20000, y: 20000 }, { x: 23000, y: 20000 }, 16)).toEqual({ x: 20000, y: 20000 });
  });

  it("keeps story city walls out of Boss Rush terrain", () => {
    const bossRushBuildings = getBuildingsForMode("bossRush");

    expect(bossRushBuildings.some((building) => building.id.startsWith("story-region-wall-"))).toBe(false);
    expect(bossRushBuildings.some((building) => building.id.startsWith("story-passage-wall-"))).toBe(false);
    expect(bossRushBuildings.some((building) => building.id.startsWith("story-gate-wall-"))).toBe(false);
    expect(getBuildingsForMode("story").some((building) => building.id.startsWith("story-region-wall-"))).toBe(true);
  });

  it("detects circle collision with building footprints", () => {
    const building = BUILDINGS[0];
    expect(circleIntersectsBuildings({ x: building.x, y: building.y, radius: 16 })).toBe(true);
    expect(circleIntersectsBuildings({ x: 40, y: 40, radius: 16 })).toBe(false);
  });

  it("allows movement into building interiors", () => {
    const building = BUILDINGS[0];
    const from = { x: building.x - building.width / 2 - 28, y: building.y };
    const intoBuilding = { x: building.x, y: building.y };

    expect(resolveBlockedMovement(from, intoBuilding, 16)).toEqual(intoBuilding);
    expect(pointInsideBuildings(intoBuilding)).toBe(true);
  });

  it("blocks movement through real entertainment maze walls while fake walls can be crossed", () => {
    const mazeWall = BUILDINGS.find((building) => building.id === "ent-maze-wall-01");
    const fakeWall = BUILDINGS.find((building) => building.id === "ent-maze-fake-wall-01");
    const circusTent = BUILDINGS.find((building) => building.id === "ent-circus-main-tent");
    if (!mazeWall || !fakeWall || !circusTent) throw new Error("Missing entertainment landmarks");

    expect(isBlockingBuilding(mazeWall)).toBe(true);
    expect(isFakeMazeWall(fakeWall)).toBe(true);
    expect(isBlockingBuilding(fakeWall)).toBe(false);
    expect(isBlockingBuilding(circusTent)).toBe(false);
    expect(resolveBlockedMovement({ x: mazeWall.x - 500, y: mazeWall.y }, { x: mazeWall.x, y: mazeWall.y }, 16, [mazeWall])).toEqual({
      x: mazeWall.x - 500,
      y: mazeWall.y,
    });
    expect(resolveBlockedMovement({ x: fakeWall.x - 500, y: fakeWall.y }, { x: fakeWall.x, y: fakeWall.y }, 16, [fakeWall])).toEqual({
      x: fakeWall.x,
      y: fakeWall.y,
    });
    expect(resolveBlockedMovement({ x: circusTent.x - 500, y: circusTent.y }, { x: circusTent.x, y: circusTent.y }, 16, [circusTent])).toEqual({
      x: circusTent.x,
      y: circusTent.y,
    });
  });

  it("identifies the containing building for visibility zones", () => {
    const building = BUILDINGS[0];

    expect(getContainingBuildingId({ x: building.x, y: building.y })).toBe(building.id);
    expect(getContainingBuildingId({ x: 9990, y: 9990 })).toBeNull();
  });
});
