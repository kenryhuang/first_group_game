export const STORY_ART_PALETTE = {
  backgroundDarkGreen: 0x202822,
  roadGreyGreen: 0x2e3630,
  wastelandOchre: 0x746b58,
  buildingLightGreen: 0x61745e,
  mechCyan: 0x68e1fd,
  techDeepTeal: 0x2c453f,
  beaconHighlight: 0xb9fff0,
  warningOrange: 0xff9f1c,
  monsterYellowGreen: 0x9ecb62,
  hitRed: 0xff5b5b,
} as const;

export const STORY_SLICE_LAYER_NAMES = [
  "ground",
  "decal",
  "prop",
  "lighthouse",
  "effect",
  "worldUi",
] as const;

export type StorySliceLayerName = (typeof STORY_SLICE_LAYER_NAMES)[number];

export const STORY_LIGHTHOUSE_VISUAL_STATES = ["off", "charging", "on"] as const;

export type StoryLighthouseVisualState =
  (typeof STORY_LIGHTHOUSE_VISUAL_STATES)[number];
