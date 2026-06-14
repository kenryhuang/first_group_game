import { describe, expect, it } from "vitest";
import {
  STORY_2_5D_CONFIG,
  getStoryDepth,
  projectStoryAngle,
  projectStoryPoint,
  unprojectStoryPoint,
} from "./story2_5dProjection";

describe("story 2.5D projection", () => {
  const origin = { x: 20000, y: 20000 };

  it("uses the C2 balanced cinematic projection constants", () => {
    expect(STORY_2_5D_CONFIG.groundScaleY).toBe(0.56);
    expect(STORY_2_5D_CONFIG.actorScaleBoost).toBe(1.1);
    expect(STORY_2_5D_CONFIG.weaponYOffset).toBe(-18);
    expect(STORY_2_5D_CONFIG.effectYOffset).toBe(-8);
  });

  it("projects logical world points by compressing y around an origin", () => {
    expect(projectStoryPoint({ x: 20120, y: 20200 }, origin)).toEqual({
      x: 20120,
      y: 20112,
    });
    expect(projectStoryPoint({ x: 19880, y: 19800 }, origin)).toEqual({
      x: 19880,
      y: 19888,
    });
  });

  it("inverts projected points back into logical world coordinates", () => {
    const world = { x: 20333, y: 19725 };
    const projected = projectStoryPoint(world, origin);

    expect(unprojectStoryPoint(projected, origin).x).toBeCloseTo(world.x);
    expect(unprojectStoryPoint(projected, origin).y).toBeCloseTo(world.y);
  });

  it("computes visual aim angles from projected positions", () => {
    expect(
      projectStoryAngle({ x: 0, y: 0 }, { x: 100, y: 0 }, origin),
    ).toBeCloseTo(0);
    expect(
      projectStoryAngle({ x: 0, y: 0 }, { x: 0, y: 100 }, origin),
    ).toBeCloseTo(Math.PI / 2);
    expect(
      projectStoryAngle({ x: 0, y: 0 }, { x: 100, y: 100 }, origin),
    ).toBeCloseTo(Math.atan2(56, 100));
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
