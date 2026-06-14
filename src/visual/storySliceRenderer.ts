import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { gsap } from "gsap";
import {
  STORY_ART_PALETTE,
  STORY_LIGHTHOUSE_VISUAL_STATES,
  STORY_SLICE_LAYER_NAMES,
  type StoryLighthouseVisualState,
  type StorySliceLayerName,
} from "./storyArtDirection";
import { STORY_SLICE_ASSETS } from "./storyAssetManifest";
import {
  STORY_2_5D_CONFIG,
  getStoryDepth,
  type StoryPoint,
} from "./story2_5dProjection";
import {
  STORY_A2_PREVIEW_MAP,
  getStoryIsoBlockedFootprints,
  getStoryIsoMapStats,
  getStoryIsoPropBasePoint,
  getStoryIsoTileWorldPoint,
  type StoryIsoFootprint,
  type StoryIsoMapDefinition,
  type StoryIsoMapStats,
  type StoryIsoPropDefinition,
  type StoryIsoPropRole,
  type StoryIsoTileDefinition,
  type StoryIsoTileKind,
} from "./storyIsoMap";

export interface StorySliceRendererOptions {
  world: Container;
  center: StoryPoint;
  lit: boolean;
  // Enables story 2.5D projection for ground, fog, and volume props.
  projectPoint?: (point: StoryPoint) => StoryPoint;
  // Pass null to disable the default A2 map and use legacy projected ground.
  isoMap?: StoryIsoMapDefinition | null;
}

type StoryVolumePropRole = StoryIsoPropRole;

interface StoryVolumePropDefinition {
  label: string;
  role: StoryVolumePropRole;
  texturePath: string;
  x: number;
  y: number;
  scale: number;
  baseYOffset: number;
  visualHeight: number;
  depthOffset: number;
  shadowScaleX: number;
  shadowScaleY: number;
  tile?: StoryIsoPropDefinition["tile"];
  footprint?: StoryIsoFootprint;
}

export interface StoryVolumePropDebug {
  label: string;
  role: StoryVolumePropRole;
  basePoint: StoryPoint;
  projectedPoint: StoryPoint;
  visualHeight: number;
  zIndex: number;
  containerParentLabel: string | undefined;
  shadowChildCount: number;
  tile?: StoryIsoPropDefinition["tile"];
  footprint?: StoryIsoFootprint;
}

export interface StoryGroundTileDebug {
  label: string;
  worldPoint: StoryPoint;
  projectedPoint: StoryPoint;
  diamondWidth: number;
  diamondHeight: number;
  kind: StoryIsoTileKind;
  texturePath?: string;
}

export interface StorySliceRenderer {
  root: Container;
  layers: Record<StorySliceLayerName, Container>;
  setLighthouseCharging(): void;
  setLighthouseLit(lit: boolean): void;
  getLighthouseVisualState(): StoryLighthouseVisualState;
  playScanPulse(origin: { x: number; y: number }): void;
  debugGroundTiles(): StoryGroundTileDebug[];
  debugVolumeProps(): StoryVolumePropDebug[];
  debugIsoMapStats(): StoryIsoMapStats | undefined;
  debugBlockedFootprints(): StoryIsoFootprint[];
  debugSpriteCount(): number;
  destroy(): void;
}

interface ActivePulse {
  sprite: Sprite;
  tweens: ReturnType<typeof gsap.to>[];
}

function countDescendants(container: Container): number {
  let count = container.children.length;
  for (const child of container.children) {
    if (child instanceof Container) {
      count += countDescendants(child);
    }
  }
  return count;
}

const STORY_FOG_ALPHA_BY_STATE: Record<StoryLighthouseVisualState, number> = {
  off: 0.38,
  charging: 0.24,
  on: 0.12,
};

function createLayers(root: Container): Record<StorySliceLayerName, Container> {
  const entries = STORY_SLICE_LAYER_NAMES.map((name) => {
    const layer = new Container();
    layer.label = `story-${name}-layer`;
    root.addChild(layer);
    return [name, layer] as const;
  });

  return Object.fromEntries(entries) as Record<StorySliceLayerName, Container>;
}

function placeSprite(
  sprite: Sprite,
  x: number,
  y: number,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
): void {
  const projected = options.projectPoint?.({ x, y }) ?? { x, y };
  sprite.position.set(projected.x, projected.y);
}

function getGroundPlaneScaleY(
  scale: number,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
): number {
  return options.projectPoint ? scale * STORY_2_5D_CONFIG.isoFogScaleY : scale;
}

function makeSprite(
  path: string,
  x: number,
  y: number,
  scale = 1,
  options: Pick<StorySliceRendererOptions, "projectPoint"> = {},
  scaleY = scale,
): Sprite {
  const sprite = new Sprite(Texture.from(path));
  sprite.anchor.set(0.5);
  placeSprite(sprite, x, y, options);
  sprite.scale.set(scale, scaleY);
  return sprite;
}

function getGroundKind(asset: string): StoryIsoTileKind {
  if (asset.includes("road-straight")) return "road";
  if (asset.includes("road-cracked")) return "roadCracked";
  if (asset.includes("concrete")) return "concrete";
  return "plaza";
}

function getIsoGroundColor(kind: StoryIsoTileKind): number {
  if (kind === "road") return STORY_ART_PALETTE.roadGreyGreen;
  if (kind === "roadCracked") return 0x39433d;
  if (kind === "curb") return 0x59675f;
  if (kind === "concrete") return 0x667368;
  if (kind === "stain") return 0x405f52;
  if (kind === "rubble") return 0x4b554f;
  if (kind === "blocked") return 0x2c342f;
  return STORY_ART_PALETTE.wastelandOchre;
}

function getA2GroundTexturePath(kind: StoryIsoTileKind): string {
  const [road, cracked, concrete, pollutedEdge] =
    STORY_SLICE_ASSETS.map.groundTiles;
  if (kind === "road") return road;
  if (kind === "roadCracked") return cracked;
  if (kind === "curb" || kind === "rubble" || kind === "stain") {
    return pollutedEdge;
  }
  return concrete;
}

function decorateIsoGroundTile(
  view: Graphics,
  kind: StoryIsoTileKind,
  diamondWidth: number,
  diamondHeight: number,
): void {
  if (kind === "road" || kind === "roadCracked") {
    view
      .moveTo(-diamondWidth * 0.28, 0)
      .lineTo(0, -diamondHeight * 0.16)
      .lineTo(diamondWidth * 0.28, 0)
      .stroke({
        color: 0xffd166,
        alpha: kind === "road" ? 0.3 : 0.18,
        width: 3,
      });
    return;
  }

  if (kind === "curb") {
    view
      .moveTo(-diamondWidth * 0.5, 0)
      .lineTo(0, diamondHeight * 0.5)
      .stroke({ color: 0xc7d2b8, alpha: 0.18, width: 2 });
    return;
  }

  if (kind === "rubble") {
    view.circle(-18, 4, 5).fill({ color: 0x222a25, alpha: 0.38 });
    view.circle(14, -8, 3).fill({ color: 0x222a25, alpha: 0.28 });
  }
}

function makeIsoGroundTileFromKind(
  kind: StoryIsoTileKind,
  worldPoint: StoryPoint,
  tileIndex: number,
  labelPrefix: "story-iso-ground" | "story-a2-ground",
  options: Pick<StorySliceRendererOptions, "projectPoint">,
  diamondScale = 1,
): { view: Graphics; debug: StoryGroundTileDebug } {
  const projectedPoint = options.projectPoint?.(worldPoint) ?? worldPoint;
  const diamondWidth = STORY_2_5D_CONFIG.isoTileWidth * diamondScale;
  const diamondHeight = STORY_2_5D_CONFIG.isoTileHeight * diamondScale;
  const view = new Graphics();
  const label = `${labelPrefix}-${kind}-${tileIndex}`;
  view.label = label;
  view.position.set(projectedPoint.x, projectedPoint.y);
  view
    .poly([
      0,
      -diamondHeight / 2,
      diamondWidth / 2,
      0,
      0,
      diamondHeight / 2,
      -diamondWidth / 2,
      0,
    ])
    .fill({
      color: getIsoGroundColor(kind),
      alpha: kind === "plaza" ? 0.58 : kind === "stain" ? 0.42 : 0.76,
    })
    .stroke({ color: 0x050706, alpha: 0.24, width: 2 });
  decorateIsoGroundTile(view, kind, diamondWidth, diamondHeight);

  return {
    view,
    debug: {
      label,
      worldPoint,
      projectedPoint,
      diamondWidth,
      diamondHeight,
      kind,
    },
  };
}

function makeIsoGroundTile(
  asset: string,
  worldPoint: StoryPoint,
  tileIndex: number,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
): { view: Graphics; debug: StoryGroundTileDebug } {
  return makeIsoGroundTileFromKind(
    getGroundKind(asset),
    worldPoint,
    tileIndex,
    "story-iso-ground",
    options,
  );
}

function getIsoMapTileScale(isoMap: StoryIsoMapDefinition): number {
  return isoMap.tileSize / STORY_2_5D_CONFIG.isoLogicalTileSize;
}

function getIsoTileWorldPoint(
  tile: StoryIsoTileDefinition,
  center: StoryPoint,
  isoMap: StoryIsoMapDefinition,
): StoryPoint {
  if (isoMap === STORY_A2_PREVIEW_MAP) {
    return getStoryIsoTileWorldPoint(tile, center);
  }

  return {
    x: center.x + tile.x * isoMap.tileSize,
    y: center.y + tile.y * isoMap.tileSize,
  };
}

function getIsoPropBasePoint(
  prop: StoryIsoPropDefinition,
  center: StoryPoint,
  isoMap: StoryIsoMapDefinition,
): StoryPoint {
  if (isoMap === STORY_A2_PREVIEW_MAP) {
    return getStoryIsoPropBasePoint(prop, center);
  }

  return {
    x: center.x + prop.tile.x * isoMap.tileSize,
    y: center.y + prop.tile.y * isoMap.tileSize,
  };
}

function makeA2GroundTile(
  tile: StoryIsoTileDefinition,
  center: StoryPoint,
  isoMap: StoryIsoMapDefinition,
  tileIndex: number,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
): { view: Container; debug: StoryGroundTileDebug } {
  const worldPoint = getIsoTileWorldPoint(tile, center, isoMap);
  const projectedPoint = options.projectPoint?.(worldPoint) ?? worldPoint;
  const diamondScale = getIsoMapTileScale(isoMap);
  const diamondWidth = STORY_2_5D_CONFIG.isoTileWidth * diamondScale;
  const diamondHeight = STORY_2_5D_CONFIG.isoTileHeight * diamondScale;
  const spriteSize = STORY_2_5D_CONFIG.isoTileWidth * diamondScale;
  const texturePath = getA2GroundTexturePath(tile.kind);
  const label = `story-a2-ground-${tile.kind}-${tileIndex}`;
  const view = new Container();
  view.label = label;
  view.position.set(projectedPoint.x, projectedPoint.y);
  view.zIndex = (tile.x + tile.y) * 100 + tile.x;

  const sprite = new Sprite(Texture.from(texturePath));
  sprite.label = `${label}-sprite`;
  sprite.anchor.set(0.5);
  sprite.width = spriteSize;
  sprite.height = spriteSize;
  sprite.rotation = tile.roadAxis === "y" ? Math.PI / 2 : 0;
  view.addChild(sprite);

  return {
    view,
    debug: {
      label,
      worldPoint,
      projectedPoint,
      diamondWidth,
      diamondHeight,
      kind: tile.kind,
      texturePath,
    },
  };
}

function addGround(
  layers: Record<StorySliceLayerName, Container>,
  center: StoryPoint,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
  isoMap: StoryIsoMapDefinition | undefined,
): StoryGroundTileDebug[] {
  if (options.projectPoint && isoMap) {
    layers.ground.sortableChildren = true;
    const debugTiles = isoMap.tiles.map((tile, tileIndex) => {
      const groundTile = makeA2GroundTile(
        tile,
        center,
        isoMap,
        tileIndex,
        options,
      );
      layers.ground.addChild(groundTile.view);
      return groundTile.debug;
    });
    layers.ground.sortChildren();
    return debugTiles;
  }

  const tileSize = STORY_2_5D_CONFIG.isoLogicalTileSize;
  const [road, cracked, concrete, grass] = STORY_SLICE_ASSETS.map.groundTiles;
  const debugTiles: StoryGroundTileDebug[] = [];
  let tileIndex = 0;

  for (let ix = -4; ix <= 4; ix += 1) {
    for (let iy = -3; iy <= 3; iy += 1) {
      const isRoad = Math.abs(iy) <= 1 || Math.abs(ix) <= 1;
      const asset = isRoad
        ? Math.abs(ix + iy) % 2 === 0
          ? road
          : cracked
        : Math.abs(ix) % 2 === 0
          ? concrete
          : grass;
      const worldPoint = {
        x: center.x + ix * tileSize,
        y: center.y + iy * tileSize,
      };

      if (options.projectPoint) {
        const tile = makeIsoGroundTile(asset, worldPoint, tileIndex, options);
        layers.ground.addChild(tile.view);
        debugTiles.push(tile.debug);
      } else {
        layers.ground.addChild(
          makeSprite(asset, worldPoint.x, worldPoint.y, 1, options, 1),
        );
      }

      tileIndex += 1;
    }
  }

  return debugTiles;
}

function getVolumePropDefinitions(
  center: StoryPoint,
  isoMap: StoryIsoMapDefinition | undefined,
  lighthouseState: StoryLighthouseVisualState,
): StoryVolumePropDefinition[] {
  if (isoMap) {
    return isoMap.props.map((prop) => {
      const basePoint = getIsoPropBasePoint(prop, center, isoMap);
      return {
        label: prop.label,
        role: prop.role,
        texturePath:
          prop.role === "lighthouse"
            ? STORY_SLICE_ASSETS.lighthouse.states[lighthouseState]
            : prop.texturePath,
        x: basePoint.x,
        y: basePoint.y,
        scale: prop.scale,
        baseYOffset: 0,
        visualHeight: prop.visualHeight,
        depthOffset: prop.depthOffset,
        shadowScaleX: prop.shadowScaleX,
        shadowScaleY: prop.shadowScaleY,
        tile: prop.tile,
        footprint: prop.footprint,
      };
    });
  }

  const [buildingGreen, buildingOchre, buildingTeal] =
    STORY_SLICE_ASSETS.map.buildings;
  const [, , wreckedCar, streetlight, roadblock, signboard] =
    STORY_SLICE_ASSETS.map.decorations;

  return [
    {
      label: "story-volume-building-green",
      role: "building",
      texturePath: buildingGreen,
      x: center.x - 520,
      y: center.y - 390,
      scale: 0.72,
      baseYOffset: 118,
      visualHeight: 150,
      depthOffset: 70,
      shadowScaleX: 1.45,
      shadowScaleY: 0.36,
    },
    {
      label: "story-volume-building-ochre",
      role: "building",
      texturePath: buildingOchre,
      x: center.x + 540,
      y: center.y - 360,
      scale: 0.7,
      baseYOffset: 112,
      visualHeight: 142,
      depthOffset: 70,
      shadowScaleX: 1.42,
      shadowScaleY: 0.34,
    },
    {
      label: "story-volume-building-teal",
      role: "building",
      texturePath: buildingTeal,
      x: center.x - 440,
      y: center.y + 430,
      scale: 0.66,
      baseYOffset: 108,
      visualHeight: 132,
      depthOffset: 70,
      shadowScaleX: 1.38,
      shadowScaleY: 0.32,
    },
    {
      label: "story-volume-wrecked-car",
      role: "vehicle",
      texturePath: wreckedCar,
      x: center.x + 360,
      y: center.y + 190,
      scale: 0.72,
      baseYOffset: 38,
      visualHeight: 44,
      depthOffset: 38,
      shadowScaleX: 1.1,
      shadowScaleY: 0.22,
    },
    {
      label: "story-volume-streetlight",
      role: "streetlight",
      texturePath: streetlight,
      x: center.x - 250,
      y: center.y - 245,
      scale: 0.78,
      baseYOffset: 82,
      visualHeight: 138,
      depthOffset: 82,
      shadowScaleX: 0.72,
      shadowScaleY: 0.18,
    },
    {
      label: "story-volume-roadblock",
      role: "roadblock",
      texturePath: roadblock,
      x: center.x + 85,
      y: center.y + 310,
      scale: 0.82,
      baseYOffset: 32,
      visualHeight: 34,
      depthOffset: 34,
      shadowScaleX: 0.95,
      shadowScaleY: 0.2,
    },
    {
      label: "story-volume-signboard",
      role: "sign",
      texturePath: signboard,
      x: center.x - 20,
      y: center.y - 335,
      scale: 0.82,
      baseYOffset: 76,
      visualHeight: 88,
      depthOffset: 76,
      shadowScaleX: 0.75,
      shadowScaleY: 0.18,
    },
  ];
}

function addGroundDecals(
  layers: Record<StorySliceLayerName, Container>,
  center: StoryPoint,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
): void {
  const [debrisOne, debrisTwo] = STORY_SLICE_ASSETS.map.decorations;
  layers.decal.addChild(
    makeSprite(debrisOne, center.x - 180, center.y + 140, 0.78, options),
  );
  layers.decal.addChild(
    makeSprite(debrisTwo, center.x + 230, center.y - 110, 0.78, options),
  );
}

interface ActiveVolumeProp {
  container: Container;
  sprite: Sprite;
  debug: StoryVolumePropDebug;
}

function makeVolumeProp(
  definition: StoryVolumePropDefinition,
  options: Pick<StorySliceRendererOptions, "world" | "projectPoint">,
): ActiveVolumeProp {
  const basePoint = {
    x: definition.x,
    y: definition.y + definition.baseYOffset,
  };
  const projectedPoint = options.projectPoint?.(basePoint) ?? basePoint;
  const container = new Container();
  container.label = definition.label;
  container.position.set(projectedPoint.x, projectedPoint.y);
  container.zIndex = getStoryDepth(basePoint, definition.depthOffset);
  container.sortableChildren = true;

  const shadow = new Graphics();
  shadow.label = `${definition.label}-shadow`;
  shadow
    .ellipse(0, 0, 86 * definition.shadowScaleX, 24 * definition.shadowScaleY)
    .fill({ color: 0x050706, alpha: 0.44 });
  shadow.zIndex = -2;
  container.addChild(shadow);

  const sprite = new Sprite(Texture.from(definition.texturePath));
  sprite.label = `${definition.label}-sprite`;
  sprite.anchor.set(0.5, 1);
  sprite.position.set(0, -definition.visualHeight * 0.18);
  sprite.scale.set(definition.scale);
  sprite.zIndex = 2;
  container.addChild(sprite);

  options.world.addChild(container);

  return {
    container,
    sprite,
    debug: {
      label: definition.label,
      role: definition.role,
      basePoint,
      projectedPoint,
      visualHeight: definition.visualHeight,
      zIndex: container.zIndex,
      containerParentLabel: container.parent?.label,
      shadowChildCount: container.children.filter((child) =>
        child.label?.endsWith("-shadow"),
      ).length,
      tile: definition.tile ? { ...definition.tile } : undefined,
      footprint: definition.footprint ? { ...definition.footprint } : undefined,
    },
  };
}

function addTexturedFog(
  layers: Record<StorySliceLayerName, Container>,
  center: StoryPoint,
  state: StoryLighthouseVisualState,
  options: Pick<StorySliceRendererOptions, "projectPoint">,
): Sprite[] {
  const offsets = [
    { x: -520, y: -430, scale: 2.2, rotation: -0.08 },
    { x: 520, y: -430, scale: 2.2, rotation: 0.07 },
    { x: -520, y: 430, scale: 2.2, rotation: 0.05 },
    { x: 520, y: 430, scale: 2.2, rotation: -0.06 },
  ];

  return offsets.map((offset, index) => {
    const fog = makeSprite(
      STORY_SLICE_ASSETS.effects.fogNoise,
      center.x + offset.x,
      center.y + offset.y,
      offset.scale,
      options,
      getGroundPlaneScaleY(offset.scale, options),
    );
    fog.label = `story-textured-fog-${index}`;
    fog.tint = STORY_ART_PALETTE.beaconHighlight;
    fog.alpha = STORY_FOG_ALPHA_BY_STATE[state];
    fog.rotation = offset.rotation;
    layers.fog.addChild(fog);
    return fog;
  });
}

export function createStorySliceRenderer(
  options: StorySliceRendererOptions,
): StorySliceRenderer {
  if (!options.world.label) {
    options.world.label = "story-world-root";
  }

  const activeIsoMap = options.projectPoint
    ? options.isoMap === null
      ? undefined
      : options.isoMap ?? STORY_A2_PREVIEW_MAP
    : undefined;
  let lighthouseState: StoryLighthouseVisualState = options.lit ? "on" : "off";
  const isoMapStats = activeIsoMap
    ? getStoryIsoMapStats(activeIsoMap)
    : undefined;
  const blockedFootprints = activeIsoMap
    ? getStoryIsoBlockedFootprints(activeIsoMap)
    : [];

  const root = new Container();
  root.label = "story-art-slice-root";
  options.world.addChild(root);

  const layers = createLayers(root);
  const groundTiles = addGround(layers, options.center, options, activeIsoMap);
  addGroundDecals(layers, options.center, options);
  const volumeProps = getVolumePropDefinitions(
    options.center,
    activeIsoMap,
    lighthouseState,
  ).map((definition) => makeVolumeProp(definition, options));

  const lighthouseTextures = Object.fromEntries(
    STORY_LIGHTHOUSE_VISUAL_STATES.map((state) => [
      state,
      Texture.from(STORY_SLICE_ASSETS.lighthouse.states[state]),
    ]),
  ) as Record<StoryLighthouseVisualState, Texture>;
  const activePulses = new Set<ActivePulse>();
  const fogSprites = addTexturedFog(
    layers,
    options.center,
    lighthouseState,
    options,
  );
  const lighthouseVolume =
    volumeProps.find((prop) => prop.debug.role === "lighthouse") ??
    makeVolumeProp(
      {
        label: "story-volume-lighthouse",
        role: "lighthouse",
        texturePath: STORY_SLICE_ASSETS.lighthouse.states[lighthouseState],
        x: options.center.x,
        y: options.center.y,
        scale: 0.82,
        baseYOffset: 0,
        visualHeight: 190,
        depthOffset: 95,
        shadowScaleX: 1.1,
        shadowScaleY: 0.28,
      },
      options,
    );
  if (!volumeProps.includes(lighthouseVolume)) {
    volumeProps.push(lighthouseVolume);
  }
  const lighthouse = lighthouseVolume.sprite;
  lighthouse.texture = lighthouseTextures[lighthouseState];

  const coreGlow = makeSprite(
    STORY_SLICE_ASSETS.lighthouse.coreGlow,
    options.center.x,
    options.center.y,
    0.72,
    options,
  );
  coreGlow.label = "story-center-lighthouse-core-glow";
  coreGlow.alpha = options.lit ? 0.82 : 0.16;
  layers.effect.addChild(coreGlow);

  const setState = (state: StoryLighthouseVisualState): void => {
    lighthouseState = state;
    lighthouse.texture = lighthouseTextures[state];
    coreGlow.alpha =
      state === "on" ? 0.82 : state === "charging" ? 0.46 : 0.16;
    for (const fog of fogSprites) {
      fog.alpha = STORY_FOG_ALPHA_BY_STATE[state];
    }
  };

  const destroyPulse = (activePulse: ActivePulse): void => {
    activePulses.delete(activePulse);
    for (const tween of activePulse.tweens) {
      tween.kill();
    }
    if (!activePulse.sprite.destroyed) {
      activePulse.sprite.destroy();
    }
  };

  return {
    root,
    layers,
    setLighthouseCharging: () => setState("charging"),
    setLighthouseLit: (lit: boolean) => setState(lit ? "on" : "off"),
    getLighthouseVisualState: () => lighthouseState,
    debugGroundTiles(): StoryGroundTileDebug[] {
      return groundTiles.map((tile) => ({
        ...tile,
        worldPoint: { ...tile.worldPoint },
        projectedPoint: { ...tile.projectedPoint },
      }));
    },
    debugVolumeProps(): StoryVolumePropDebug[] {
      return volumeProps.map((prop) => ({
        ...prop.debug,
        basePoint: { ...prop.debug.basePoint },
        projectedPoint: { ...prop.debug.projectedPoint },
        tile: prop.debug.tile ? { ...prop.debug.tile } : undefined,
        footprint: prop.debug.footprint
          ? { ...prop.debug.footprint }
          : undefined,
        zIndex: prop.container.zIndex,
        containerParentLabel: prop.container.parent?.label,
        shadowChildCount: prop.container.children.filter((child) =>
          child.label?.endsWith("-shadow"),
        ).length,
      }));
    },
    debugIsoMapStats(): StoryIsoMapStats | undefined {
      return isoMapStats ? { ...isoMapStats } : undefined;
    },
    debugBlockedFootprints(): StoryIsoFootprint[] {
      return blockedFootprints.map((footprint) => ({ ...footprint }));
    },
    playScanPulse(origin: { x: number; y: number }): void {
      const pulse = makeSprite(
        STORY_SLICE_ASSETS.effects.scanRing,
        origin.x,
        origin.y,
        0.22,
        options,
      );
      pulse.tint = STORY_ART_PALETTE.mechCyan;
      pulse.alpha = 0.82;
      layers.effect.addChild(pulse);
      const activePulse: ActivePulse = { sprite: pulse, tweens: [] };
      activePulses.add(activePulse);
      activePulse.tweens.push(
        gsap.to(pulse.scale, {
          x: 3.4,
          y: 3.4,
          duration: 0.72,
          ease: "power2.out",
        }),
        gsap.to(pulse, {
          alpha: 0,
          duration: 0.72,
          ease: "power2.out",
          onComplete: () => destroyPulse(activePulse),
        }),
      );
    },
    debugSpriteCount(): number {
      return countDescendants(root);
    },
    destroy(): void {
      for (const activePulse of [...activePulses]) {
        destroyPulse(activePulse);
      }
      for (const prop of volumeProps) {
        prop.container.destroy({ children: true });
      }
      root.destroy({ children: true });
    },
  };
}

export function isStoryLighthouseVisualState(
  value: string,
): value is StoryLighthouseVisualState {
  return STORY_LIGHTHOUSE_VISUAL_STATES.includes(
    value as StoryLighthouseVisualState,
  );
}
