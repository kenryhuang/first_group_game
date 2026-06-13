import { describe, expect, it } from "vitest";
import {
  STORY_ART_PALETTE,
  STORY_LIGHTHOUSE_VISUAL_STATES,
  STORY_SLICE_LAYER_NAMES,
} from "./storyArtDirection";

describe("story art direction", () => {
  it("defines the bright cartoon wasteland palette", () => {
    expect(STORY_ART_PALETTE.backgroundDarkGreen).toBe(0x202822);
    expect(STORY_ART_PALETTE.roadGreyGreen).toBe(0x2e3630);
    expect(STORY_ART_PALETTE.mechCyan).toBe(0x68e1fd);
    expect(STORY_ART_PALETTE.beaconHighlight).toBe(0xb9fff0);
    expect(STORY_ART_PALETTE.monsterYellowGreen).toBe(0x9ecb62);
  });

  it("keeps the renderer layers stable and ordered", () => {
    expect(STORY_SLICE_LAYER_NAMES).toEqual([
      "ground",
      "decal",
      "prop",
      "lighthouse",
      "effect",
      "worldUi",
    ]);
  });

  it("defines the three lighthouse visual states", () => {
    expect(STORY_LIGHTHOUSE_VISUAL_STATES).toEqual(["off", "charging", "on"]);
  });
});
