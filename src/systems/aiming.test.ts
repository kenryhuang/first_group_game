import { describe, expect, it } from "vitest";
import { getAimTarget } from "./aiming";

describe("aiming", () => {
  it("aims at combat targets before movement", () => {
    const player = { x: 10, y: 10 };

    expect(getAimTarget(player, { x: 30, y: 10 }, { x: 10, y: 40 })).toEqual({ x: 30, y: 10 });
  });

  it("falls back to movement direction when no combat target exists", () => {
    const player = { x: 10, y: 10 };

    expect(getAimTarget(player, undefined, undefined, { x: 0, y: -1 })).toEqual({ x: 10, y: -90 });
  });
});
