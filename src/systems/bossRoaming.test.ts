import { describe, expect, it } from "vitest";
import { getInitialRoamingBossIds } from "./bossRoaming";

describe("boss roaming", () => {
  it("starts every regular Boss in the world and excludes the final Boss", () => {
    expect(getInitialRoamingBossIds()).toEqual(["chef", "clown", "courier"]);
  });
});
