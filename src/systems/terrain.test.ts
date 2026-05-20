import { describe, expect, it } from "vitest";
import {
  BUILDINGS,
  circleIntersectsBuildings,
  pointInsideBuildings,
  resolveBlockedMovement,
} from "./terrain";

describe("terrain", () => {
  it("defines enough buildings to make the map read as city ruins", () => {
    expect(BUILDINGS.length).toBeGreaterThanOrEqual(14);
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
});
