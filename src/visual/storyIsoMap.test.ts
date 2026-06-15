import { describe, expect, it } from "vitest";
import { STORY_CENTER_LIGHTHOUSE } from "../systems/storyRegions";
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
  it("defines a compact A2 preview map around the lighthouse", () => {
    const stats = getStoryIsoMapStats(STORY_A2_PREVIEW_MAP);

    expect(STORY_A2_PREVIEW_MAP.mode).toBe("a2-preview");
    expect(STORY_A2_PREVIEW_MAP.tileSize).toBe(
      STORY_2_5D_CONFIG.isoLogicalTileSize,
    );
    expect(stats).toEqual({
      mode: "a2-preview",
      tileCount: 143,
      roadTileCount: 31,
      propCount: 8,
      blockedFootprintCount: 6,
    });
    expect(STORY_A2_PREVIEW_MAP.tiles[0]).toEqual({
      x: -6,
      y: -5,
      kind: "curb",
    });
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

    const mainStreet = roadTiles.filter((tile) => tile.y === 1);
    const crossStreet = roadTiles.filter((tile) => tile.x === 1);
    const frontageStreet = roadTiles.filter((tile) => tile.y === -2);
    const sideAlley = roadTiles.filter(
      (tile) =>
        (tile.x === -4 && tile.y >= 1 && tile.y <= 3) ||
        (tile.y === 3 && tile.x >= -4 && tile.x <= -2),
    );

    expect(roadTiles).toHaveLength(31);
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

  it("marks blocked footprints for the preview slice", () => {
    const roadTiles = STORY_A2_PREVIEW_MAP.tiles.filter(isStoryIsoRoadTile);
    const blockedFootprints = getStoryIsoBlockedFootprints(STORY_A2_PREVIEW_MAP);
    const firstBuilding = STORY_A2_PREVIEW_MAP.props[0];

    expect(roadTiles).toHaveLength(31);
    expect(blockedFootprints).toHaveLength(6);
    expect(blockedFootprints).toContainEqual({
      x: -3,
      y: 0,
      width: 2,
      height: 2,
    });
    expect(getStoryIsoPropBasePoint(firstBuilding, STORY_CENTER_LIGHTHOUSE.position))
      .toEqual({ x: 19488, y: 20056 });
  });

  it("converts blocked footprints into world collision rectangles around prop bases", () => {
    const blockedRects = getStoryIsoBlockedRects(
      STORY_A2_PREVIEW_MAP,
      STORY_CENTER_LIGHTHOUSE.position,
    );

    expect(blockedRects).toHaveLength(6);
    expect(blockedRects[0]).toEqual({
      id: "story-a2-blocking-story-a2-building-green",
      x: 19232,
      y: 19800,
      width: 348,
      height: 348,
    });
    expect(blockedRects.find((rect) => rect.id.endsWith("lighthouse"))).toEqual({
      id: "story-a2-blocking-story-a2-lighthouse",
      x: 19744,
      y: 19544,
      width: 348,
      height: 348,
    });
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
