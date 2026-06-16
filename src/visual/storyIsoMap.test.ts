import { describe, expect, it } from "vitest";
import {
  STORY_CENTER_LIGHTHOUSE,
  STORY_MAP_HEIGHT,
  STORY_MAP_WIDTH,
} from "../systems/storyRegions";
import { resolveBlockedMovementWithBlockingBuildings } from "../systems/terrain";
import { STORY_2_5D_CONFIG } from "./story2_5dProjection";
import {
  STORY_A2_PREVIEW_MAP,
  getStoryIsoRoadTextureKey,
  getStoryIsoBlockedFootprints,
  getStoryIsoBlockedRects,
  getStoryIsoMapStats,
  getStoryIsoPropBasePoint,
  getStoryIsoTileWorldPoint,
  isStoryIsoRoadTile,
} from "./storyIsoMap";

describe("story isometric preview map", () => {
  function tileKey(tile: { x: number; y: number }): string {
    return `${tile.x}:${tile.y}`;
  }

  function footprintTiles(footprint: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Array<{ x: number; y: number }> {
    const tiles: Array<{ x: number; y: number }> = [];
    for (let x = footprint.x; x < footprint.x + footprint.width; x += 1) {
      for (let y = footprint.y; y < footprint.y + footprint.height; y += 1) {
        tiles.push({ x, y });
      }
    }
    return tiles;
  }

  function tileBounds() {
    const xValues = STORY_A2_PREVIEW_MAP.tiles.map((tile) => tile.x);
    const yValues = STORY_A2_PREVIEW_MAP.tiles.map((tile) => tile.y);
    return {
      minX: Math.min(...xValues),
      maxX: Math.max(...xValues),
      minY: Math.min(...yValues),
      maxY: Math.max(...yValues),
    };
  }

  it("defines an A2 map that covers the full story map footprint", () => {
    const stats = getStoryIsoMapStats(STORY_A2_PREVIEW_MAP);
    const bounds = tileBounds();
    const tileSize = STORY_A2_PREVIEW_MAP.tileSize;
    const expectedMinX = Math.floor(
      -STORY_CENTER_LIGHTHOUSE.position.x / tileSize,
    );
    const expectedMaxX = Math.ceil(
      (STORY_MAP_WIDTH - STORY_CENTER_LIGHTHOUSE.position.x) / tileSize,
    );
    const expectedMinY = Math.floor(
      -STORY_CENTER_LIGHTHOUSE.position.y / tileSize,
    );
    const expectedMaxY = Math.ceil(
      (STORY_MAP_HEIGHT - STORY_CENTER_LIGHTHOUSE.position.y) / tileSize,
    );

    expect(STORY_A2_PREVIEW_MAP.mode).toBe("a2-preview");
    expect(STORY_A2_PREVIEW_MAP.tileSize).toBe(
      STORY_2_5D_CONFIG.isoLogicalTileSize,
    );
    expect(stats.mode).toBe("a2-preview");
    expect(stats.tileCount).toBeGreaterThan(20_000);
    expect(stats.roadTileCount).toBeGreaterThan(3_000);
    expect(stats.propCount).toBe(8);
    expect(stats.blockedFootprintCount).toBe(6);
    expect(bounds.minX).toBeLessThanOrEqual(expectedMinX);
    expect(bounds.maxX).toBeGreaterThanOrEqual(expectedMaxX);
    expect(bounds.minY).toBeLessThanOrEqual(expectedMinY);
    expect(bounds.maxY).toBeGreaterThanOrEqual(expectedMaxY);
  });

  it("places the lighthouse on the center tile and maps tile anchors to world points", () => {
    const center = STORY_CENTER_LIGHTHOUSE.position;
    const lighthouse = STORY_A2_PREVIEW_MAP.props.find(
      (prop) => prop.role === "lighthouse",
    );

    expect(lighthouse?.tile).toEqual({ x: 0, y: 0 });
    expect(lighthouse?.footprint).toEqual({ x: -1, y: -1, width: 2, height: 2 });
    expect(getStoryIsoTileWorldPoint({ x: 0, y: 0 }, center)).toEqual(center);
    expect(getStoryIsoTileWorldPoint({ x: -3, y: -3 }, center)).toEqual({
      x: center.x - 768,
      y: center.y - 768,
    });
  });

  it("builds continuous A2 street corridors with road topology metadata", () => {
    const roadTiles = STORY_A2_PREVIEW_MAP.tiles.filter(isStoryIsoRoadTile);

    const mainStreet = roadTiles.filter(
      (tile) => tile.y === 1 && tile.x >= -6 && tile.x <= 6,
    );
    const crossStreet = roadTiles.filter(
      (tile) => tile.x === 1 && tile.y >= -5 && tile.y <= 5,
    );
    const frontageStreet = roadTiles.filter(
      (tile) => tile.y === -2 && tile.x >= -3 && tile.x <= 1,
    );
    const sideAlley = roadTiles.filter(
      (tile) =>
        (tile.x === -4 && tile.y >= 1 && tile.y <= 3) ||
        (tile.y === 3 && tile.x >= -4 && tile.x <= -2),
    );

    expect(roadTiles.length).toBeGreaterThan(3_000);
    expect(mainStreet.map((tile) => tile.x)).toEqual([
      -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6,
    ]);
    expect(crossStreet.map((tile) => tile.y)).toEqual([
      -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5,
    ]);
    expect(frontageStreet.map((tile) => tile.x)).toEqual([-3, -2, -1, 0, 1]);
    expect(sideAlley).toHaveLength(5);
    expect(roadTiles).toContainEqual({
      x: -6,
      y: 1,
      kind: "road",
      roadAxis: "x",
    });
    expect(roadTiles).toContainEqual({
      x: 1,
      y: -5,
      kind: "roadCracked",
      roadAxis: "y",
    });
    expect(roadTiles).toContainEqual({
      x: -3,
      y: -2,
      kind: "road",
      roadAxis: "x",
    });
  });

  it("selects seamless A2 road-kit assets from road neighbors", () => {
    const tileAt = (x: number, y: number) => {
      const tile = STORY_A2_PREVIEW_MAP.tiles.find(
        (candidate) => candidate.x === x && candidate.y === y,
      );
      if (!tile) throw new Error(`Missing tile ${x},${y}`);
      return tile;
    };

    expect(getStoryIsoRoadTextureKey(STORY_A2_PREVIEW_MAP, tileAt(0, 1))).toBe(
      "straightX",
    );
    expect(getStoryIsoRoadTextureKey(STORY_A2_PREVIEW_MAP, tileAt(1, -5))).toBe(
      "crackedStraightY",
    );
    expect(getStoryIsoRoadTextureKey(STORY_A2_PREVIEW_MAP, tileAt(1, 1))).toBe(
      "intersection",
    );
    expect(getStoryIsoRoadTextureKey(STORY_A2_PREVIEW_MAP, tileAt(1, -2))).toBe(
      "tEast",
    );
    expect(getStoryIsoRoadTextureKey(STORY_A2_PREVIEW_MAP, tileAt(-4, 3))).toBe(
      "cornerSE",
    );
  });

  it("places buildings on raised foundation pads beside roads", () => {
    const roadKeys = new Set(
      STORY_A2_PREVIEW_MAP.tiles.filter(isStoryIsoRoadTile).map(tileKey),
    );
    const tileByKey = new Map(
      STORY_A2_PREVIEW_MAP.tiles.map((tile) => [tileKey(tile), tile]),
    );
    const buildingProps = STORY_A2_PREVIEW_MAP.props.filter(
      (prop) => prop.role === "building",
    );

    expect(buildingProps.map((prop) => prop.tile)).toEqual([
      { x: -2, y: 0 },
      { x: 4, y: 3 },
      { x: 0, y: 3 },
    ]);

    for (const prop of buildingProps) {
      const foundationTiles = footprintTiles(prop.footprint);
      expect(
        foundationTiles.some((tile) =>
          [
            { x: tile.x - 1, y: tile.y },
            { x: tile.x + 1, y: tile.y },
            { x: tile.x, y: tile.y - 1 },
            { x: tile.x, y: tile.y + 1 },
          ].some((neighbor) => roadKeys.has(tileKey(neighbor))),
        ),
      ).toBe(true);

      for (const tile of foundationTiles) {
        expect(roadKeys.has(tileKey(tile))).toBe(false);
        expect(tileByKey.get(tileKey(tile))?.kind).toBe("foundation");
      }
    }
  });

  it("places the lighthouse on a raised central foundation pad", () => {
    const roadKeys = new Set(
      STORY_A2_PREVIEW_MAP.tiles.filter(isStoryIsoRoadTile).map(tileKey),
    );
    const tileByKey = new Map(
      STORY_A2_PREVIEW_MAP.tiles.map((tile) => [tileKey(tile), tile]),
    );
    const lighthouse = STORY_A2_PREVIEW_MAP.props.find(
      (prop) => prop.role === "lighthouse",
    );

    expect(lighthouse).toBeDefined();
    for (const tile of footprintTiles(lighthouse!.footprint)) {
      expect(roadKeys.has(tileKey(tile))).toBe(false);
      expect(tileByKey.get(tileKey(tile))?.kind).toBe("foundation");
    }
  });

  it("marks blocked footprints for the preview slice", () => {
    const roadTiles = STORY_A2_PREVIEW_MAP.tiles.filter(isStoryIsoRoadTile);
    const blockedFootprints = getStoryIsoBlockedFootprints(STORY_A2_PREVIEW_MAP);
    const firstBuilding = STORY_A2_PREVIEW_MAP.props[0];

    expect(roadTiles.length).toBeGreaterThan(3_000);
    expect(blockedFootprints).toHaveLength(6);
    expect(blockedFootprints).toContainEqual({
      x: -3,
      y: -1,
      width: 2,
      height: 2,
    });
    expect(getStoryIsoPropBasePoint(firstBuilding, STORY_CENTER_LIGHTHOUSE.position))
      .toEqual({ x: 19488, y: 19800 });
  });

  it("places building blockers inside the foundation footprint instead of on the curb edge", () => {
    const blockedRects = getStoryIsoBlockedRects(
      STORY_A2_PREVIEW_MAP,
      STORY_CENTER_LIGHTHOUSE.position,
    );

    expect(blockedRects).toHaveLength(6);
    expect(blockedRects).toContainEqual({
      id: "story-a2-blocking-story-a2-building-green-core",
      x: 19360,
      y: 19672,
      width: 358,
      height: 358,
    });
    expect(
      blockedRects.find((rect) => rect.id.endsWith("building-ochre-core")),
    ).toEqual({
      id: "story-a2-blocking-story-a2-building-ochre-core",
      x: 20896,
      y: 20440,
      width: 358,
      height: 358,
    });
    expect(blockedRects.find((rect) => rect.id.endsWith("lighthouse-core")))
      .toEqual({
        id: "story-a2-blocking-story-a2-lighthouse-core",
        x: 19872,
        y: 19672,
        width: 399,
        height: 399,
      });
    expect(blockedRects.find((rect) => rect.id.endsWith("wrecked-car-2:2")))
      .toEqual({
        id: "story-a2-blocking-story-a2-wrecked-car-2:2",
        x: 20512,
        y: 20312,
        width: 230,
        height: 230,
      });
  });

  it("allows stepping onto the orange building foundation apron but blocks the wall core", () => {
    const blockedRects = getStoryIsoBlockedRects(
      STORY_A2_PREVIEW_MAP,
      STORY_CENTER_LIGHTHOUSE.position,
    );
    const orangeBuilding = blockedRects.find((rect) =>
      rect.id.endsWith("building-ochre-core"),
    );
    if (!orangeBuilding) throw new Error("Missing orange building blocker");

    const apronY = orangeBuilding.y + 130;
    const fromFoundationEdge = {
      x: orangeBuilding.x - orangeBuilding.width / 2 - 96,
      y: apronY,
    };
    const ontoApron = {
      x: orangeBuilding.x - orangeBuilding.width / 2 - 24,
      y: apronY,
    };
    const fromRightSide = {
      x: orangeBuilding.x + orangeBuilding.width / 2 + 96,
      y: apronY,
    };
    const intoWallCore = {
      x: orangeBuilding.x + orangeBuilding.width / 2 - 18,
      y: apronY,
    };

    expect(
      resolveBlockedMovementWithBlockingBuildings(
        fromFoundationEdge,
        ontoApron,
        16,
        blockedRects,
      ),
    ).toEqual(ontoApron);
    expect(
      resolveBlockedMovementWithBlockingBuildings(
        fromRightSide,
        intoWallCore,
        16,
        blockedRects,
      ),
    ).toEqual(fromRightSide);
  });

  it("keeps the upper center movement lane clear of A2 prop footprints", () => {
    const blockedRects = getStoryIsoBlockedRects(
      STORY_A2_PREVIEW_MAP,
      STORY_CENTER_LIGHTHOUSE.position,
    );
    const playerRadius = 16;
    const lane = {
      left: STORY_CENTER_LIGHTHOUSE.position.x,
      right: STORY_CENTER_LIGHTHOUSE.position.x + 1500,
      y: STORY_CENTER_LIGHTHOUSE.position.y - 445,
    };

    const laneBlockers = blockedRects.filter((rect) => {
      const left = rect.x - rect.width / 2 - playerRadius;
      const right = rect.x + rect.width / 2 + playerRadius;
      const top = rect.y - rect.height / 2 - playerRadius;
      const bottom = rect.y + rect.height / 2 + playerRadius;

      return lane.right >= left && lane.left <= right && lane.y >= top && lane.y <= bottom;
    });

    expect(laneBlockers).toEqual([]);
  });
});
