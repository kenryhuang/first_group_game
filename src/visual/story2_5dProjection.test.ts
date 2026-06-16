import { describe, expect, it } from "vitest";
import {
  STORY_2_5D_CONFIG,
  getStoryDepth,
  projectStoryAngle,
  projectStoryPoint,
  unprojectStoryPoint,
} from "./story2_5dProjection";

describe("story 2.5D projection", () => {
  const origin = { x: 20000, y: 19800 };

  it("uses the A1 isometric projection constants", () => {
    expect(STORY_2_5D_CONFIG.projectionMode).toBe("isometric-a1");
    expect(STORY_2_5D_CONFIG.isoLogicalTileSize).toBe(256);
    expect(STORY_2_5D_CONFIG.isoTileWidth).toBe(256);
    expect(STORY_2_5D_CONFIG.isoTileHeight).toBe(128);
    expect(STORY_2_5D_CONFIG.isoFogScaleY).toBe(0.5);
    expect(STORY_2_5D_CONFIG.actorScaleBoost).toBe(1.1);
    expect(STORY_2_5D_CONFIG.weaponYOffset).toBe(-18);
    expect(STORY_2_5D_CONFIG.effectYOffset).toBe(-8);
  });

  it("projects logical world points onto an isometric diamond plane", () => {
    expect(projectStoryPoint({ x: 20256, y: 19800 }, origin)).toEqual({
      x: 20128,
      y: 19864,
    });
    expect(projectStoryPoint({ x: 20000, y: 20056 }, origin)).toEqual({
      x: 19872,
      y: 19864,
    });
    expect(projectStoryPoint({ x: 20256, y: 20056 }, origin)).toEqual({
      x: 20000,
      y: 19928,
    });
  });

  it("inverts isometric screen points back into logical world coordinates", () => {
    const world = { x: 20333, y: 19725 };
    const projected = projectStoryPoint(world, origin);

    expect(unprojectStoryPoint(projected, origin).x).toBeCloseTo(world.x);
    expect(unprojectStoryPoint(projected, origin).y).toBeCloseTo(world.y);
  });

  it("computes visual aim angles from isometric projected positions", () => {
    expect(
      projectStoryAngle(origin, { x: origin.x + 256, y: origin.y }, origin),
    ).toBeCloseTo(Math.atan2(64, 128));
    expect(
      projectStoryAngle(origin, { x: origin.x, y: origin.y + 256 }, origin),
    ).toBeCloseTo(Math.atan2(64, -128));
    expect(
      projectStoryAngle(
        origin,
        { x: origin.x + 256, y: origin.y + 256 },
        origin,
      ),
    ).toBeCloseTo(Math.PI / 2);
  });

  it("keeps farther-south objects later in depth order even with small offsets", () => {
    expect(getStoryDepth({ x: 0, y: 200 }, 40)).toBeLessThan(
      getStoryDepth({ x: 0, y: 201 }, 0),
    );
    expect(getStoryDepth({ x: 0, y: 200 }, 120)).toBeGreaterThan(
      getStoryDepth({ x: 0, y: 200 }, 40),
    );
  });
});
