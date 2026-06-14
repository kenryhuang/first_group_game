import { describe, expect, it } from "vitest";
import { STORY_CENTER_LIGHTHOUSE } from "../systems/storyRegions";
import { STORY_2_5D_CONFIG } from "./story2_5dProjection";
import {
  STORY_A2_PREVIEW_MAP,
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
      roadTileCount: 25,
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

  it("marks diagonal roads and blocked footprints for the preview slice", () => {
    const roadTiles = STORY_A2_PREVIEW_MAP.tiles.filter(isStoryIsoRoadTile);
    const blockedFootprints = getStoryIsoBlockedFootprints(STORY_A2_PREVIEW_MAP);
    const firstBuilding = STORY_A2_PREVIEW_MAP.props[0];

    expect(roadTiles).toHaveLength(25);
    expect(roadTiles).toContainEqual({ x: -5, y: -5, kind: "road" });
    expect(roadTiles).toContainEqual({ x: 5, y: -5, kind: "road" });
    expect(roadTiles).toContainEqual({ x: 1, y: 0, kind: "roadCracked" });
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
      x: 19488,
      y: 20056,
      width: 348,
      height: 348,
    });
    expect(blockedRects.find((rect) => rect.id.endsWith("lighthouse"))).toEqual({
      id: "story-a2-blocking-story-a2-lighthouse",
      x: 20000,
      y: 19800,
      width: 348,
      height: 348,
    });
  });
});
