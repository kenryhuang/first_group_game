import { Assets, Application, Container, Graphics, Text, TextStyle, type Ticker } from "pixi.js";
import { Howl } from "howler";
import { gsap } from "gsap";
import { BOSS_DEFINITIONS, SKILL_UPGRADES } from "../data/prototypeData";
import type { BossId, MapNode, RunState } from "../domain/types";
import {
  applyRunDamage,
  chooseRunMechForm,
  chooseRunSkillUpgrade,
  collectNode,
  createBossRushDuelRunState,
  createExperimentalRunState,
  createRunState,
  gainRunExperience,
  killRunBoss,
  recordRunEnemyKill,
  useRunSkill,
} from "../systems/runState";
import { getSkillUpgradeStats } from "../systems/skillChoices";
import {
  ENEMY_SPAWN_TICK_MS,
  EXPERIMENTAL_DISABLE_SMALL_ENEMIES,
  MAP_HEIGHT,
  MAP_WIDTH,
  PLAYER_START,
  getEnemyMaxAlive,
  getEnemySpawnBatchSize,
  getNodeWorldPosition,
  getSpawnPositionAroundPlayer,
  shouldAllowSmallEnemySpawning,
} from "../systems/spawning";
import {
  STORY_CENTER_LIGHTHOUSE,
  STORY_DEBUG_PLAYER_SPEED_MULTIPLIER,
  STORY_DISABLE_BOSS_ENCOUNTERS_FOR_MAP_TUNING,
  STORY_DISABLE_ZOMBIE_WAVES_FOR_MAP_TUNING,
  STORY_FOG_BASE_RADIUS,
  STORY_INITIAL_UNLOCKED_BOUNDS,
  STORY_INITIAL_UNLOCKED_REGION_IDS,
  STORY_MAP_HEIGHT,
  STORY_MAP_WIDTH,
  STORY_REGION_PASSAGES,
  STORY_REGIONS,
  clampPointToUnlockedStoryRegions,
  getStoryCircularFogCoverRects,
  getStoryEffectiveAttackRange,
  getStoryPassageRects,
  getStoryPlayerStart,
  getStoryMonsterPressureMultiplier,
  getStoryVisionRadius,
  isPointInsideStoryVision,
  isStoryMagicianInterferencePoint,
} from "../systems/storyRegions";
import {
  BUILDING_LABELS,
  getContainingBuildingId,
  getBuildingsForMode,
  pointInsideBuildings,
  resolveBlockedMovement,
  type Rect,
} from "../systems/terrain";
import {
  createProjectileState,
  projectileHitsCircle,
  updateProjectileState,
  type ProjectileKind,
  type ProjectileState,
} from "../systems/projectiles";
import { getInitialRoamingBossIds } from "../systems/bossRoaming";
import { getAimTarget } from "../systems/aiming";
import { BOSS_VISUAL_THEMES, ZOMBIE_ENEMY_THEME } from "../systems/enemyVisuals";
import { localizeGameMessage } from "../systems/localization";
import {
  getActiveAutoWeapons,
  getAutoWeaponDamage,
  isAutoWeaponReady,
  type AutoWeaponDefinition,
  type AutoWeaponId,
} from "../systems/autoWeapons";
import {
  ENERGY_SKILL_DEFINITIONS,
  advanceEnergySkillCooldowns,
  getAutoEnergySkills,
  getEnergySkillPower,
  getManualEnergySkills,
  getMechEvolutionStage,
  isEnergySkillReady,
  type EnergySkillDefinition,
  type EnergySkillId,
} from "../systems/energyWeapons";
import {
  BIG_FIRE_PIT,
  COURIER_LOCKED_CHARGE_SPEED,
  JESTER_BOX_EFFECTS,
  ROAMING_BOSS_RUNTIME_STATS,
  getNextAdvancedBossSkill,
  type AdvancedBossSkill,
} from "../systems/bossSkills";
import {
  BEASTMASTER_HOUND_COUNT,
  BEASTMASTER_HOUND_HEALTH,
  BEASTMASTER_HOUND_SPEED,
  BEASTMASTER_INVULNERABLE_MS,
  BEASTMASTER_STAMPEDE_SPEED,
  BEASTMASTER_TOTAL_FRENZY_COUNT,
  BEASTMASTER_TOTAL_FRENZY_HEALTH,
  BEASTMASTER_TOTAL_FRENZY_SPEED,
  BEASTMASTER_ZOMBIE_SIEGE_COUNT,
  shouldTriggerBeastmasterFrenzy,
} from "../systems/beastmaster";
import {
  CHEF_CHILI_OIL_BOTTLE_FLIGHT_MS,
  CHEF_CHILI_OIL_BOTTLE_COUNT,
  CHEF_CHILI_OIL_SPREAD_RADIUS,
  CHEF_CRASH_AIRBORNE_OFFSET_Y,
  CHEF_MEAT_GRINDER_ARM_COUNT,
  CHEF_MEAT_GRINDER_ARM_LENGTH,
  CHEF_MEAT_GRINDER_DAMAGE,
  CHEF_MEAT_GRINDER_DURATION_MS,
  CHEF_MEAT_GRINDER_TICK_MS,
  CHEF_WOK_MODEL_RADIUS,
  shouldChefBlockBasicAttack,
  shouldTriggerChefMeatGrinder,
} from "../systems/chef";
import {
  CLOWN_KNIFE_BURST_COUNT,
  CLOWN_MAGIC_BOX_FREEZE_MS,
  CLOWN_MAGIC_BOX_TRIGGER_RADIUS,
  CLOWN_SPIRAL_KNIFE_DURATION_MS,
  CLOWN_SPIRAL_KNIFE_STEP,
  CLOWN_SPIRAL_KNIFE_TICK_MS,
  CLOWN_SURPRISE_RETREAT_DISTANCE,
  CLOWN_SURPRISE_SLASH_COUNT,
  CLOWN_SURPRISE_SLASH_DAMAGE,
  getClownDistanceTarget,
} from "../systems/clown";
import {
  COURIER_CITYWIDE_DELIVERY_DURATION_MS,
  COURIER_CITYWIDE_DELIVERY_TICK_MS,
  COURIER_EXPLOSIVE_PARCEL_DISTANCE_STEP,
  COURIER_EXPLOSIVE_PARCEL_COUNT,
  COURIER_EXPLOSIVE_PARCEL_MIN_DISTANCE,
  COURIER_LOCKER_COUNT,
  COURIER_PARCEL_TRIGGER_RADIUS,
  COURIER_ROUTE_RESIDUE_LIFE_MS,
  COURIER_ROUTE_RESIDUE_RADIUS,
  COURIER_ROUTE_RESIDUE_TICK_MS,
  COURIER_SIGNATURE_LOCK_MS,
  getCourierParcelOutcome,
  getCourierSignatureLockOutcome,
} from "../systems/courier";
import {
  MAGICIAN_MIRROR_ORBIT_SPEED,
  MAGICIAN_MIRROR_SHARD_COUNT,
  MAGICIAN_MIRROR_SHARD_SPEED,
  MAGICIAN_SPOTLIGHT_CHOOSE_MS,
  MAGICIAN_SPOTLIGHT_FALSE_BLAST_RADIUS,
  MAGICIAN_SPOTLIGHT_ORBIT_ROUNDS,
  MAGICIAN_SPOTLIGHT_STAGE_RADIUS,
  STORY_MAGICIAN_INTERFERENCE_COOLDOWN_MS,
  STORY_MAGICIAN_REMOTE_MIRROR_ATTACK_COOLDOWN_MS,
  STORY_MAGICIAN_REMOTE_MIRROR_COUNT,
  STORY_MAGICIAN_REMOTE_MIRROR_PROJECTILE_DAMAGE,
  STORY_MAGICIAN_REMOTE_MIRROR_PROJECTILE_SPEED,
  STORY_MAGICIAN_REMOTE_MIRROR_PROXIMITY_BURST_RADIUS,
  createMagicianCurtains,
  createMagicianHatMaze,
  createMagicianMirrorHall,
  createMagicianSpotlights,
  getMagicianCurtainCallMs,
  type MagicianCurtainCallKind,
} from "../systems/magician";
import { getUltimateDefinition, type UltimateDefinition } from "../systems/mechForms";
import {
  FINAL_BOSS_DEFINITION,
  FINAL_BOSS_PHASE_FOUR_SKILL,
  FINAL_BOSS_PHASE_ONE_SKILL,
  FINAL_BOSS_PHASE_THREE_SKILL,
  FINAL_BOSS_PHASE_TWO_SKILL,
  getEndgameUltimateDefinition,
  getFinalBossPhase,
  getWarCoreDefeatOutcome,
  getWarCoreEvacuationOutcome,
  isEndgameReady,
  shouldAllowWarCoreSpawn,
  type EndgameUltimateDefinition,
  type FinalBossPhase,
} from "../systems/endgame";
import {
  HOSPITAL_KNIGHT_AGGRO_RADIUS,
  BONE_CONTACT_DAMAGE,
  BONE_SOLDIER_CONTACT_DAMAGE,
  GIANT_SWORD_TRAP_MS,
  HOSPITAL_KNIGHT_BONE_COMMAND_COUNT,
  HOSPITAL_KNIGHT_BONE_COMMAND_DASH_SPEED,
  HOSPITAL_KNIGHT_DEFINITION,
  HOSPITAL_KNIGHT_DEAD_FORMATION_LANES,
  HOSPITAL_KNIGHT_SPAWN,
  HOSPITAL_KNIGHT_HOLY_LANCE_SPIKE_DAMAGE,
  HOSPITAL_KNIGHT_HOLY_LANCE_SPIKES,
  HOSPITAL_KNIGHT_ROYAL_GUARD_COUNT,
  getHospitalKnightGuardRoamTarget,
  getHospitalKnightPhase,
  getInitialBoneHordeCount,
  getNextHospitalKnightSkill,
  isHospitalKnightDamageable,
  shouldConvertZombieToBoneSoldier,
  shouldHospitalKnightAggro,
  type HospitalKnightPhase,
} from "../systems/hospitalKnight";
import {
  getBossRoamTargetInTerritory,
  getBossTerritorySpawnPosition,
  isPointInBossTerritory,
  shouldRoamingBossTargetPlayer,
} from "../systems/bossTerritories";
import { BASIC_GUN } from "../systems/weapons";
import type { GameMetrics, GameMode, StoryMechId } from "../app/gameStore";
import {
  BOSS_RUSH_SINGLE_DUELS,
  getBossRushPlayerLevel,
  getBossRushScenario,
  type BossRushScenarioId,
} from "../systems/bossRush";
import {
  STORY_SLICE_ASSETS,
  getStorySliceAssetPaths,
  type StoryAnimationName,
  type StoryDirection,
} from "../visual/storyAssetManifest";
import {
  createStoryActorAnimationLock,
  getStoryActorPlayback,
  triggerStoryActorOneShot as triggerStoryActorOneShotLock,
  type StoryActorAnimationLock,
} from "../visual/storyActorAnimationLocks";
import {
  attachStoryActorVisual,
  getStoryActorDirection,
  type StoryActorVisual,
} from "../visual/storyActorVisuals";
import { PLAYER_WEAPON_VISUAL_GEOMETRY } from "../visual/playerWeaponVisuals";
import {
  createStorySliceRenderer,
  type StorySliceRenderer,
} from "../visual/storySliceRenderer";
import {
  STORY_2_5D_CONFIG,
  getStoryDepth,
  projectStoryAngle,
  projectStoryPoint,
  unprojectStoryPoint,
  type StoryPoint,
} from "../visual/story2_5dProjection";

type AttackMode = "auto" | "manual";
type BossMode = "roam" | "chase" | "charge" | "windup";
type HazardKind =
  | "bossProjectile"
  | "chiliOil"
  | "firePit"
  | "bigFirePit"
  | "knife"
  | "magicBox"
  | "toxicCloud"
  | "medicineMist"
  | "sedativeDart"
  | "magneticMine"
  | "electricOrb"
  | "courierParcel";
type EnemyKind = "zombie" | "hound" | "bone" | "boneSoldier";

interface GameCallbacks {
  onMetrics(metrics: GameMetrics): void;
  onMessage(message: string): void;
  onRunState(state: RunState): void;
  onGameOver(state: RunState): void;
  onMissionSuccess(state: RunState): void;
}

interface Actor {
  view: Graphics;
  x: number;
  y: number;
}

interface EnemyActor extends Actor {
  kind: EnemyKind;
  health: number;
  speed: number;
  contactDamageElapsedMs: number;
  dashElapsedMs?: number;
  dashMs?: number;
  dashAngle?: number;
  dashSpeed?: number;
  invulnerableMs?: number;
  plaguePatient?: boolean;
  guardTarget?: { x: number; y: number };
}

interface BossActor extends Actor {
  bossId: BossId;
  health: number;
  maxHealth: number;
  label: Text;
  mode: BossMode;
  roamTarget: { x: number; y: number };
  skillElapsedMs: number;
  skillCooldownMs: number;
  advancedSkillCursor: number;
  chargeMs: number;
  chargeAngle: number;
  chargeDamage: number;
  chargeSpeed?: number;
  windupMs: number;
  pendingChargeAngle: number;
  contactDamageElapsedMs: number;
  beastmasterFrenzyUsed?: boolean;
  chefMeatGrinderUsed?: boolean;
  chefMeatGrinderMs?: number;
  chefMeatGrinderTickMs?: number;
  chefMeatGrinderAngle?: number;
  chefMeatGrinderView?: Graphics;
  chefAirborne?: boolean;
  clownSpiralKnifeMs?: number;
  clownSpiralKnifeTickMs?: number;
  clownSpiralKnifeAngle?: number;
  courierCitywideMs?: number;
  courierCitywideTickMs?: number;
}

interface FinalBossActor extends Actor {
  health: number;
  maxHealth: number;
  label: Text;
  phase: FinalBossPhase;
  skillElapsedMs: number;
  skillCooldownMs: number;
  contactDamageElapsedMs: number;
  skillCursor: number;
  wantedUsed: boolean;
  finalBeamUsed: boolean;
}

interface WarCoreExtractionActor extends Actor {
  radius: number;
}

interface HospitalKnightActor extends Actor {
  health: number;
  maxHealth: number;
  label: Text;
  phase: HospitalKnightPhase;
  skillElapsedMs: number;
  skillCooldownMs: number;
  skillCursor: number;
  holyShroudCasts: number;
  contactDamageElapsedMs: number;
  chargeMs: number;
  chargeAngle: number;
  aggro: boolean;
  guardTarget: { x: number; y: number };
}

interface BonePileActor extends Actor {
  radius: number;
}

interface PlayerTrapActor {
  view: Graphics;
  x: number;
  y: number;
  radius: number;
  lifeMs: number;
}

interface BulletActor extends Actor {
  projectile: ProjectileState;
}

interface HeavyProjectileActor extends Actor {
  weaponId: AutoWeaponId;
  target?: Actor;
  targetX: number;
  targetY: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  damage: number;
  blastRadius: number;
  lifeMs: number;
}

interface AutoStrikeActor extends Actor {
  radius: number;
  damage: number;
  lifeMs: number;
  maxLifeMs: number;
}

interface LaserEffectActor {
  view: Graphics;
  lifeMs: number;
  maxLifeMs: number;
}

interface WarpMineActor extends Actor {
  radius: number;
  damage: number;
  lifeMs: number;
}

interface PlayerSnapshot {
  x: number;
  y: number;
  health: number;
  ageMs: number;
}

interface HazardActor extends Actor {
  kind: HazardKind;
  velocityX: number;
  velocityY: number;
  radius: number;
  lifeMs: number;
  damage: number;
  tickElapsedMs: number;
  expiresIntoFire: boolean;
  effect?: (typeof JESTER_BOX_EFFECTS)[number];
}

interface CourierRouteActor {
  view: Graphics;
  start: { x: number; y: number };
  end: { x: number; y: number };
  lifeMs: number;
  tickElapsedMs: number;
  damage: number;
}

interface MagicianStagePropActor extends Actor {
  kind: "curtain" | "spotlight" | "hat" | "mirror";
  real?: boolean;
  solid?: boolean;
  damage?: number;
  radius?: number;
  expiresAtMs?: number;
  birthMs?: number;
  revealAtMs?: number;
  centerX?: number;
  centerY?: number;
  orbitRadiusX?: number;
  orbitRadiusY?: number;
  orbitAngle?: number;
  orbitSpeed?: number;
  orbitDirection?: 1 | -1;
  storyRemote?: boolean;
  attackElapsedMs?: number;
  proximityBurstRadius?: number;
}

interface InfusionStandActor extends Actor {
  boss: BossActor;
  health: number;
  radius: number;
  lifeMs: number;
  tickElapsedMs: number;
}

interface TeslaDeviceActor extends Actor {
  kind: "turret" | "node";
  boss: BossActor;
  health: number;
  radius: number;
  lifeMs: number;
  tickElapsedMs: number;
}

interface TeslaGridActor {
  view: Graphics;
  start: TeslaDeviceActor;
  end: TeslaDeviceActor;
  lifeMs: number;
  tickElapsedMs: number;
  damage: number;
}

interface ConvoyVehicleActor extends Actor {
  kind: "escort" | "ammo";
  boss: BossActor;
  health: number;
  radius: number;
  lifeMs: number;
  tickElapsedMs: number;
  damage: number;
  orbitAngle?: number;
  orbitRadius?: number;
  speed?: number;
}

export interface PixiWastelandGameOptions {
  mode?: GameMode;
  bossRushScenarioId?: BossRushScenarioId;
  storyMechId?: StoryMechId;
}

interface TelegraphActor {
  view: Graphics;
  lifeMs: number;
  maxLifeMs: number;
}

interface NodeActor extends Actor {
  nodeId: string;
}

interface DamageNumberActor {
  view: Text;
  lifeMs: number;
  velocityY: number;
}

interface StoryDeathVisual {
  view: Graphics;
  visual: StoryActorVisual;
  x: number;
  y: number;
  lifeMs: number;
}

interface WeaponVisual {
  container: Container;
  barrel: Graphics;
  muzzleFlash: Graphics;
}

interface BuildingVisual {
  id: string;
  shell: Graphics;
  roof: Graphics;
  x: number;
  y: number;
  width: number;
  height: number;
  chargeCooldownMs: number;
  weaponCooldownMs: number;
  sniperCooldownMs: number;
  isSniperNest: boolean;
}

interface FinalBossBombActor {
  view: Graphics;
  x: number;
  y: number;
  radius: number;
  lifeMs: number;
  damage: number;
}

interface FinalBossMissileActor extends Actor {
  targetX: number;
  targetY: number;
  speed: number;
  radius: number;
  damage: number;
  lockMs: number;
  lifeMs: number;
}

interface FinalBossCrawlerActor extends Actor {
  damage: number;
  armMs: number;
  suppressMs: number;
  armed: boolean;
}

const BULLET_SOUND =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

export class PixiWastelandGame {
  private app = new Application();
  private world = new Container();
  private player?: Actor;
  private playerWeapon?: WeaponVisual;
  private storySliceRenderer?: StorySliceRenderer;
  private playerStoryVisual?: StoryActorVisual;
  private readonly playerStoryAnimationLock = createStoryActorAnimationLock();
  private readonly enemyStoryVisuals = new WeakMap<EnemyActor, StoryActorVisual>();
  private readonly enemyStoryAnimationLocks = new WeakMap<EnemyActor, StoryActorAnimationLock>();
  private storyDeathVisuals: StoryDeathVisual[] = [];
  private state: RunState = createRunState();
  private nodeMarkers: NodeActor[] = [];
  private enemies: EnemyActor[] = [];
  private bullets: BulletActor[] = [];
  private heavyProjectiles: HeavyProjectileActor[] = [];
  private autoStrikes: AutoStrikeActor[] = [];
  private laserEffects: LaserEffectActor[] = [];
  private warpMines: WarpMineActor[] = [];
  private bossHazards: HazardActor[] = [];
  private courierRoutes: CourierRouteActor[] = [];
  private magicianStageProps: MagicianStagePropActor[] = [];
  private storyMagicianInterferenceActive = false;
  private storyMagicianInterferenceCooldownMs = 0;
  private storyMagicianInterferenceCount = 0;
  private infusionStands: InfusionStandActor[] = [];
  private teslaDevices: TeslaDeviceActor[] = [];
  private teslaGrids: TeslaGridActor[] = [];
  private convoyVehicles: ConvoyVehicleActor[] = [];
  private magicianCurtainCallUntilMs = 0;
  private magicianFinaleInProgress = false;
  private bossTelegraphs: TelegraphActor[] = [];
  private bosses: BossActor[] = [];
  private finalBoss?: FinalBossActor;
  private extraFinalBosses: FinalBossActor[] = [];
  private finalBossBombs: FinalBossBombActor[] = [];
  private finalBossMissiles: FinalBossMissileActor[] = [];
  private finalBossCrawlers: FinalBossCrawlerActor[] = [];
  private warCoreArmoryActive = false;
  private warCoreCollapseMs = 0;
  private warCoreCollapseTickMs = 0;
  private warCoreArmoryPressureMs = 0;
  private warCoreExtraction?: WarCoreExtractionActor;
  private warCoreArmoryOverlay?: Graphics;
  private hospitalKnight?: HospitalKnightActor;
  private extraHospitalKnights: HospitalKnightActor[] = [];
  private bonePiles: BonePileActor[] = [];
  private playerTrap?: PlayerTrapActor;
  private damageNumbers: DamageNumberActor[] = [];
  private buildingVisuals: BuildingVisual[] = [];
  private skillChoiceOverlay?: Container;
  private formChoiceOverlay?: Container;
  private interiorVisibilityMask = new Graphics();
  private keys = new Set<string>();
  private pointerWorld = { x: PLAYER_START.x + 1, y: PLAYER_START.y };
  private movementDirection = { x: 1, y: 0 };
  private attackMode: AttackMode = "auto";
  private enemySpawnElapsed = 0;
  private autoAttackElapsed = 0;
  private autoWeaponElapsedMs: Partial<Record<AutoWeaponId, number>> = {};
  private energySkillElapsedMs: Partial<Record<EnergySkillId, number>> = {};
  private playerHistory: PlayerSnapshot[] = [];
  private storyAnimationClockMs = 0;
  private litStoryLighthouseIds = new Set<string>();
  private unlockedStoryRegionIds = new Set(STORY_INITIAL_UNLOCKED_REGION_IDS);
  private ultimateElapsedMs = 999999;
  private endgameUltimateElapsedMs = 999999;
  private mechTransformMs = 0;
  private mechTransformDamageElapsedMs = 0;
  private playerSlowMs = 0;
  private playerFreezeMs = 0;
  private playerVisionNarrowMs = 0;
  private skillSuppressMs = 0;
  private finalBossBuildingCollisionElapsedMs = FINAL_BOSS_PHASE_ONE_SKILL.buildingCollisionIntervalMs;
  private screenShakeMs = 0;
  private screenShakeMagnitude = 0;
  private gameOver = false;
  private destroyed = false;
  private appInitialized = false;
  private appDestroyed = false;
  private inputBound = false;
  private tickerBound = false;
  private startupToken = 0;
  private spawnSeed = 1;
  private readonly shotSound = new Howl({ src: [BULLET_SOUND], volume: 0.035 });

  private isBossRushMode(): boolean {
    return this.options.mode === "bossRush";
  }

  private isStoryMode(): boolean {
    return this.options.mode === "story";
  }

  private getStoryProjectionOrigin(): StoryPoint {
    return STORY_CENTER_LIGHTHOUSE.position;
  }

  private projectPoint(point: StoryPoint): StoryPoint {
    if (!this.isStoryMode()) return point;
    return projectStoryPoint(point, this.getStoryProjectionOrigin());
  }

  private unprojectPoint(point: StoryPoint): StoryPoint {
    if (!this.isStoryMode()) return point;
    return unprojectStoryPoint(point, this.getStoryProjectionOrigin());
  }

  private setViewPosition(view: Container, x: number, y: number, visualYOffset = 0): void {
    const projected = this.projectPoint({ x, y });
    view.position.set(projected.x, projected.y + (this.isStoryMode() ? visualYOffset : 0));
  }

  private getStoryVisualDepth(point: StoryPoint, offset = 0): number {
    return this.isStoryMode() ? getStoryDepth(point, offset) : 0;
  }

  private getVisualVelocityAngle(point: StoryPoint, velocityX: number, velocityY: number): number {
    if (!this.isStoryMode()) return Math.atan2(velocityY, velocityX);
    return projectStoryAngle(
      point,
      { x: point.x + velocityX, y: point.y + velocityY },
      this.getStoryProjectionOrigin(),
    );
  }

  private shouldDisableStoryBossEncounters(): boolean {
    return this.isStoryMode() && STORY_DISABLE_BOSS_ENCOUNTERS_FOR_MAP_TUNING;
  }

  private shouldDisableStoryZombieWaves(): boolean {
    return this.isStoryMode() && STORY_DISABLE_ZOMBIE_WAVES_FOR_MAP_TUNING;
  }

  private getMapWidth(): number {
    return this.isStoryMode() ? STORY_MAP_WIDTH : MAP_WIDTH;
  }

  private getMapHeight(): number {
    return this.isStoryMode() ? STORY_MAP_HEIGHT : MAP_HEIGHT;
  }

  private getPlayerStart(): { x: number; y: number } {
    return this.isStoryMode() ? getStoryPlayerStart() : PLAYER_START;
  }

  private getActiveBuildings(): Rect[] {
    return getBuildingsForMode(this.options.mode ?? "classic");
  }

  private getBossRushPlayerLevel(): number {
    return this.options.bossRushScenarioId ? getBossRushPlayerLevel(this.options.bossRushScenarioId) : 50;
  }

  private createBossRushRunState(): RunState {
    const scenarioId = this.options.bossRushScenarioId;
    const isSingleDuel = scenarioId ? BOSS_RUSH_SINGLE_DUELS.some((scenario) => scenario.id === scenarioId) : false;
    return isSingleDuel
      ? createBossRushDuelRunState(this.getBossRushPlayerLevel())
      : createExperimentalRunState(this.getBossRushPlayerLevel());
  }

  constructor(
    private readonly host: HTMLElement,
    private readonly callbacks: GameCallbacks,
    private readonly options: PixiWastelandGameOptions = {},
  ) {}

  async start(): Promise<void> {
    const startupToken = (this.startupToken += 1);
    this.destroyed = false;
    await this.app.init({
      backgroundColor: 0x171a16,
      resizeTo: this.host,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.appInitialized = true;
    if (!this.isActiveStartup(startupToken)) {
      this.destroyApp();
      return;
    }

    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.world.sortableChildren = this.isStoryMode();
    if (this.isBossRushMode()) {
      this.state = this.createBossRushRunState();
      this.callbacks.onRunState(this.state);
    }
    if (this.isStoryMode()) {
      await Assets.load(getStorySliceAssetPaths(STORY_SLICE_ASSETS));
      if (!this.isActiveStartup(startupToken)) {
        return;
      }
    }
    this.drawWorld();
    this.createPlayer();
    this.createNodeMarkers();
    if (this.isBossRushMode()) {
      this.spawnBossRushScenario();
    } else if (!this.shouldDisableStoryBossEncounters() && !EXPERIMENTAL_DISABLE_SMALL_ENEMIES) {
      this.spawnInitialBosses();
      this.spawnHospitalKnight();
    }
    this.world.addChild(this.interiorVisibilityMask);
    this.bindInput();
    if (!this.isBossRushMode() && !this.shouldDisableStoryZombieWaves() && !EXPERIMENTAL_DISABLE_SMALL_ENEMIES) {
      this.spawnEnemyWave(getEnemySpawnBatchSize(this.state.level, 1000));
    }
    this.app.ticker.add(this.update);
    this.tickerBound = true;
    this.emitState(
      this.isBossRushMode()
        ? "Boss Rush scenario started. Choose a final form to fight."
        : this.isStoryMode()
          ? "Story mode: center beacon online. Explore the entry zone, then light towers."
          : "10000x10000 city wasteland started.",
    );
  }

  destroy(): void {
    this.destroyed = true;
    this.startupToken += 1;
    if (this.inputBound) {
      this.unbindInput();
    }
    if (this.tickerBound) {
      this.app.ticker.remove(this.update);
      this.tickerBound = false;
    }
    this.clearSkillChoiceOverlay();
    this.clearFormChoiceOverlay();
    this.destroyStoryVisuals();
    if (this.appInitialized) {
      this.destroyApp();
    }
  }

  private isActiveStartup(startupToken: number): boolean {
    return !this.destroyed && this.startupToken === startupToken;
  }

  private destroyApp(): void {
    if (this.appDestroyed) return;
    this.app.destroy(true, { children: true });
    this.appDestroyed = true;
  }

  private destroyStoryVisuals(): void {
    this.storySliceRenderer?.destroy();
    this.storySliceRenderer = undefined;

    this.playerStoryVisual?.destroy();
    this.playerStoryVisual = undefined;

    for (const enemy of this.enemies) {
      this.destroyEnemyStoryVisual(enemy);
    }
    for (const deathVisual of this.storyDeathVisuals) {
      deathVisual.visual.destroy();
      this.world.removeChild(deathVisual.view);
      deathVisual.view.destroy();
    }
    this.storyDeathVisuals = [];
  }

  private destroyEnemyStoryVisual(enemy: EnemyActor): void {
    const visual = this.enemyStoryVisuals.get(enemy);
    if (visual) {
      visual.destroy();
    }
    this.enemyStoryVisuals.delete(enemy);
    this.enemyStoryAnimationLocks.delete(enemy);
  }

  private getStoryAnimationDurationMs(
    visual: StoryActorVisual,
    animation: StoryAnimationName,
    direction: StoryDirection,
  ): number {
    const definition =
      STORY_SLICE_ASSETS.characters[visual.character].animations[animation]?.[
        direction
      ];
    return definition ? definition.frames.length * definition.frameMs : 180;
  }

  private playStoryActorVisual(
    visual: StoryActorVisual | undefined,
    animation: "idle" | "run",
    vector: { x: number; y: number },
    lock?: StoryActorAnimationLock,
  ): void {
    if (!visual) return;
    const direction = getStoryActorDirection(vector);
    const playback = getStoryActorPlayback(
      lock,
      animation,
      direction,
      this.storyAnimationClockMs,
    );
    if (
      visual.animation === playback.animation &&
      visual.direction === playback.direction
    ) {
      return;
    }
    visual.play(playback.animation, playback.direction);
  }

  private triggerStoryActorOneShot(
    visual: StoryActorVisual | undefined,
    lock: StoryActorAnimationLock | undefined,
    animation: StoryAnimationName,
    vector: { x: number; y: number },
  ): void {
    if (!visual || !lock) return;
    const direction = getStoryActorDirection(vector);
    triggerStoryActorOneShotLock(
      lock,
      animation,
      direction,
      this.storyAnimationClockMs,
      this.getStoryAnimationDurationMs(visual, animation, direction),
    );
    visual.play(animation, direction);
  }

  private triggerPlayerStoryOneShot(
    animation: StoryAnimationName,
    vector: { x: number; y: number },
  ): void {
    this.triggerStoryActorOneShot(
      this.playerStoryVisual,
      this.playerStoryAnimationLock,
      animation,
      vector,
    );
  }

  private triggerEnemyStoryOneShot(
    enemy: EnemyActor,
    animation: StoryAnimationName,
    vector: { x: number; y: number },
  ): void {
    this.triggerStoryActorOneShot(
      this.enemyStoryVisuals.get(enemy),
      this.enemyStoryAnimationLocks.get(enemy),
      animation,
      vector,
    );
  }

  private readonly update = (ticker: Ticker): void => {
    if (this.gameOver) return;
    const delta = ticker.deltaMS;
    this.storyAnimationClockMs += delta;
    if (this.state.pendingSkillChoiceIds.length > 0) {
      this.showSkillChoiceOverlay();
      this.updateStoryDeathVisuals(delta);
      this.updateDamageNumbers(delta);
      this.updateScreenShake(delta);
      this.updateWeaponAim();
      this.updateCamera();
      this.emitMetrics();
      return;
    }
    this.clearSkillChoiceOverlay();
    if (this.state.pendingMechFormIds.length > 0) {
      this.showFormChoiceOverlay();
      this.updateStoryDeathVisuals(delta);
      this.updateDamageNumbers(delta);
      this.updateScreenShake(delta);
      this.updateWeaponAim();
      this.updateCamera();
      this.emitMetrics();
      return;
    }
    this.clearFormChoiceOverlay();
    this.ultimateElapsedMs += delta;
    this.endgameUltimateElapsedMs += delta;
    const wasTransformed = this.mechTransformMs > 0;
    this.mechTransformMs = Math.max(0, this.mechTransformMs - delta);
    if (wasTransformed && this.mechTransformMs === 0 && this.player && !this.playerStoryVisual) {
      this.drawPlayerMech(this.player.view);
    }
    this.updatePlayerSlow(delta);
    this.ensureEndgameBoss();
    this.movePlayer(delta);
    this.updateEnemies(delta);
    this.updateMechTransformationDamage(delta);
    this.updateBosses(delta);
    this.updateStoryMagicianInterference(delta);
    this.updateMagicianStageProps(delta);
    this.updateFinalBoss(delta);
    this.updateHospitalKnight(delta);
    this.updatePlayerTrap(delta);
    this.updateTelegraphs(delta);
    this.updateProjectiles(delta);
    this.updateHeavyProjectiles(delta);
    this.updateAutoStrikes(delta);
    this.updateLaserEffects(delta);
    this.updateWarpMines(delta);
    this.updateBossHazards(delta);
    this.updateStoryDeathVisuals(delta);
    this.updateCourierRoutes(delta);
    this.updateInfusionStands(delta);
    this.updateTeslaDevices(delta);
    this.updateTeslaGrids(delta);
    this.updateConvoyVehicles(delta);
    this.updateDamageNumbers(delta);
    this.updateSpawning(delta);
    this.updateAutoAttack(delta);
    this.updateAutoWeapons(delta);
    this.updateEnergySkills(delta);
    this.updatePlayerHistory(delta);
    this.updateScreenShake(delta);
    this.updateWeaponAim();
    this.highlightNearbyNode();
    this.updateVisibility();
    this.updateCamera();
    this.emitMetrics();
  };

  private drawWorld(): void {
    const background = new Graphics();
    background.rect(0, 0, this.getMapWidth(), this.getMapHeight()).fill(0x20251e);
    this.world.addChild(background);

    const grid = new Graphics();
    for (let x = 0; x <= this.getMapWidth(); x += 200) {
      grid.moveTo(x, 0).lineTo(x, this.getMapHeight()).stroke({ color: 0x2f382b, alpha: 0.2, width: 1 });
    }
    for (let y = 0; y <= this.getMapHeight(); y += 200) {
      grid.moveTo(0, y).lineTo(this.getMapWidth(), y).stroke({ color: 0x2f382b, alpha: 0.2, width: 1 });
    }
    this.world.addChild(grid);

    if (this.isStoryMode()) {
      this.drawStoryCity();
      this.drawBuildings();
    } else {
      this.drawDistricts();
      this.drawBuildings();
    }
  }

  private drawStoryCity(): void {
    const road = new Graphics();
    for (let x = 2200; x <= this.getMapWidth(); x += 2600) {
      road.rect(x - 42, 0, 84, this.getMapHeight()).fill({ color: 0x151914, alpha: 0.82 });
    }
    for (let y = 2200; y <= this.getMapHeight(); y += 2600) {
      road.rect(0, y - 42, this.getMapWidth(), 84).fill({ color: 0x151914, alpha: 0.82 });
    }
    this.world.addChild(road);

    const style = new TextStyle({ fill: "#b9c7a7", fontFamily: "Arial", fontSize: 24, fontWeight: "700" });
    for (const region of STORY_REGIONS) {
      const unlocked = this.unlockedStoryRegionIds.has(region.id);
      const district = new Graphics();
      district
        .rect(region.x - region.width / 2, region.y - region.height / 2, region.width, region.height)
        .fill({ color: region.color, alpha: unlocked ? 0.76 : 0.28 })
        .stroke({ color: unlocked ? 0x59614f : 0x1a080b, alpha: unlocked ? 0.58 : 0.95, width: unlocked ? 3 : 28 });
      this.world.addChild(district);

      const label = new Text({ text: region.name, style });
      label.alpha = unlocked ? 1 : 0.45;
      label.position.set(region.x - region.width / 2 + 34, region.y - region.height / 2 + 24);
      this.world.addChild(label);

      if (!unlocked) {
        const lockLabel = new Text({
          text: "城墙封锁",
          style: new TextStyle({ fill: "#ff9f1c", fontFamily: "Arial", fontSize: 20, fontWeight: "700" }),
        });
        lockLabel.anchor.set(0.5);
        lockLabel.position.set(region.x, region.y);
        this.world.addChild(lockLabel);
      }
    }

    for (const passage of STORY_REGION_PASSAGES) {
      const unlocked =
        this.unlockedStoryRegionIds.has(passage.fromRegionId) &&
        this.unlockedStoryRegionIds.has(passage.toRegionId);
      for (const rect of getStoryPassageRects(passage)) {
        const gate = new Graphics();
        gate
          .rect(rect.x - rect.width / 2, rect.y - rect.height / 2, rect.width, rect.height)
          .fill({ color: unlocked ? 0x151914 : 0x160709, alpha: unlocked ? 0.92 : 0.8 })
          .stroke({ color: unlocked ? 0x050706 : 0x9a1f2f, alpha: unlocked ? 0.92 : 0.92, width: unlocked ? 10 : 12 });
        const vertical = rect.height >= rect.width;
        const markerCount = Math.max(2, Math.floor((vertical ? rect.height : rect.width) / 680));
        for (let index = 0; index < markerCount; index += 1) {
          const progress = (index + 0.5) / markerCount;
          const markerX = vertical ? rect.x : rect.x - rect.width / 2 + rect.width * progress;
          const markerY = vertical ? rect.y - rect.height / 2 + rect.height * progress : rect.y;
          if (vertical) {
            gate.rect(markerX - 8, markerY - 120, 16, 240).fill({ color: 0xffd166, alpha: unlocked ? 0.12 : 0.04 });
          } else {
            gate.rect(markerX - 120, markerY - 8, 240, 16).fill({ color: 0xffd166, alpha: unlocked ? 0.12 : 0.04 });
          }
        }
        this.world.addChild(gate);
      }
    }

    const tower = new Graphics();
    tower
      .circle(0, 0, 58)
      .fill({ color: 0x59614f, alpha: 0.96 })
      .stroke({ color: 0xf8f4e3, alpha: 0.9, width: 4 })
      .rect(-14, -92, 28, 128)
      .fill({ color: 0x8a817c, alpha: 0.9 });
    tower.position.set(STORY_CENTER_LIGHTHOUSE.position.x, STORY_CENTER_LIGHTHOUSE.position.y);
    this.world.addChild(tower);

    const label = new Text({
      text: "中心灯塔",
      style: new TextStyle({ fill: "#f8f4e3", fontFamily: "Arial", fontSize: 30, fontWeight: "700" }),
    });
    label.anchor.set(0.5);
    label.position.set(STORY_CENTER_LIGHTHOUSE.position.x, STORY_CENTER_LIGHTHOUSE.position.y + 88);
    this.world.addChild(label);

    const subLabel = new Text({
      text: "靠近后按 E 点亮，视野扩大但怪物压力上升。",
      style: new TextStyle({ fill: "#d8dfd0", fontFamily: "Arial", fontSize: 18 }),
    });
    subLabel.anchor.set(0.5);
    subLabel.position.set(STORY_CENTER_LIGHTHOUSE.position.x, STORY_CENTER_LIGHTHOUSE.position.y + 124);
    this.world.addChild(subLabel);

    this.storySliceRenderer = createStorySliceRenderer({
      world: this.world,
      center: STORY_CENTER_LIGHTHOUSE.position,
      lit: this.litStoryLighthouseIds.has(STORY_CENTER_LIGHTHOUSE.id),
      projectPoint: (point) => this.projectPoint(point),
    });
  }

  private drawStoryStartArea(): void {
    const bounds = STORY_INITIAL_UNLOCKED_BOUNDS;
    const left = bounds.x - bounds.width / 2;
    const right = bounds.x + bounds.width / 2;
    const top = bounds.y - bounds.height / 2;
    const bottom = bounds.y + bounds.height / 2;

    const openArea = new Graphics();
    openArea
      .roundRect(left, top, bounds.width, bounds.height, 36)
      .fill({ color: 0x27342d, alpha: 0.9 })
      .stroke({ color: 0xffd166, alpha: 0.85, width: 6 });
    this.world.addChild(openArea);

    const tower = new Graphics();
    tower
      .circle(0, 0, 58)
      .fill({ color: 0xffd166, alpha: 0.96 })
      .stroke({ color: 0xf8f4e3, alpha: 0.9, width: 4 })
      .rect(-14, -92, 28, 128)
      .fill({ color: 0xf2cc8f, alpha: 0.9 });
    tower.position.set(bounds.x, bounds.y - 300);
    this.world.addChild(tower);

    const label = new Text({
      text: "中心开放区",
      style: new TextStyle({ fill: "#f8f4e3", fontFamily: "Arial", fontSize: 30, fontWeight: "700" }),
    });
    label.anchor.set(0.5);
    label.position.set(bounds.x, bounds.y - 24);
    this.world.addChild(label);

    const subLabel = new Text({
      text: "外圈封锁区未接入信标网络",
      style: new TextStyle({ fill: "#d8dfd0", fontFamily: "Arial", fontSize: 18 }),
    });
    subLabel.anchor.set(0.5);
    subLabel.position.set(bounds.x, bounds.y + 34);
    this.world.addChild(subLabel);

    const fog = new Graphics();
    fog
      .rect(0, 0, this.getMapWidth(), top)
      .rect(0, bottom, this.getMapWidth(), this.getMapHeight() - bottom)
      .rect(0, top, left, bounds.height)
      .rect(right, top, this.getMapWidth() - right, bounds.height)
      .fill({ color: 0x050706, alpha: 0.94 });
    fog
      .rect(left, top, bounds.width, bounds.height)
      .stroke({ color: 0x9a1f2f, alpha: 0.82, width: 14 });
    this.world.addChild(fog);
  }

  private drawDistricts(): void {
    const districts = [
      { x: 5000, y: 5000, w: 1300, h: 900, color: 0x27342d, label: "幸存者活动区" },
      { x: 1850, y: 1600, w: 1400, h: 900, color: 0x343127, label: "废弃街区" },
      { x: 7600, y: 2000, w: 1300, h: 820, color: 0x2c2835, label: "剧院广场" },
      { x: 2600, y: 7800, w: 1400, h: 980, color: 0x29353a, label: "破医院" },
      { x: 7600, y: 7600, w: 1400, h: 1000, color: 0x352b25, label: "快递站" },
    ];
    const style = new TextStyle({ fill: "#b9c7a7", fontFamily: "Arial", fontSize: 20 });

    for (const district of districts) {
      const shape = new Graphics();
      shape
        .rect(district.x - district.w / 2, district.y - district.h / 2, district.w, district.h)
        .fill({ color: district.color, alpha: 0.82 })
        .stroke({ color: 0x59614f, alpha: 0.6, width: 2 });
      this.world.addChild(shape);
      const label = new Text({ text: district.label, style });
      label.position.set(district.x - district.w / 2 + 24, district.y - district.h / 2 + 18);
      this.world.addChild(label);
    }
  }

  private drawBuildings(): void {
    for (const building of this.getActiveBuildings()) {
      this.drawBuilding(building.id, building.x, building.y, building.width, building.height);
    }

  }

  private drawBuilding(id: string, x: number, y: number, width: number, height: number): void {
    const labelText = BUILDING_LABELS[id];
    const accentColor = getBuildingAccentColor(id);
    const shape = new Graphics();
    if (id.startsWith("story-gate-wall-")) {
      this.drawStoryGateWallTexture(shape, x, y, width, height);
    } else if (id.startsWith("story-region-wall-")) {
      this.drawStoryRegionWallTexture(shape, id, x, y, width, height);
    } else if (id.startsWith("story-passage-wall-")) {
      this.drawStoryPassageWallTexture(shape, x, y, width, height);
    } else if (id.startsWith("ent-maze-wall-") || id.startsWith("ent-maze-fake-wall-")) {
      this.drawCircusWallTexture(shape, id, x, y, width, height);
    } else {
      this.drawBuildingShellTexture(shape, id, x, y, width, height, Boolean(labelText), accentColor);
    }
    this.world.addChild(shape);

    const roof = new Graphics();
    if (id.startsWith("story-gate-wall-")) {
      this.drawStoryGateWallDetails(roof, x, y, width, height);
    } else if (id.startsWith("story-region-wall-")) {
      this.drawStoryWallDetails(roof, id, x, y, width, height);
    } else if (id.startsWith("story-passage-wall-")) {
      this.drawPassageWallDetails(roof, x, y, width, height);
    } else if (id.startsWith("ent-maze-wall-") || id.startsWith("ent-maze-fake-wall-")) {
      this.drawCircusWallDetails(roof, id, x, y, width, height);
    } else {
      this.drawBuildingRoofTexture(roof, id, x, y, width, height, Boolean(labelText), accentColor);
    }
    this.world.addChild(roof);
    if (labelText) {
      const label = new Text({
        text: labelText,
        style: new TextStyle({
          fill: "#fff3b0",
          fontFamily: "Arial",
          fontSize: 34,
          fontWeight: "700",
          stroke: { color: "#050706", width: 4 },
        }),
      });
      label.anchor.set(0.5);
      label.position.set(x, y);
      this.world.addChild(label);
    }
    this.buildingVisuals.push({
      id,
      shell: shape,
      roof,
      x,
      y,
      width,
      height,
      chargeCooldownMs: 0,
      weaponCooldownMs: 0,
      sniperCooldownMs: 0,
      isSniperNest: false,
    });
  }

  private drawBuildingShellTexture(view: Graphics, id: string, x: number, y: number, width: number, height: number, major: boolean, accentColor: number): void {
    const left = x - width / 2;
    const top = y - height / 2;
    const baseColor = major ? 0x26323a : id.startsWith("res-") ? 0x202a31 : 0x1f2a24;
    view
      .rect(left, top, width, height)
      .fill({ color: baseColor, alpha: major ? 0.78 : 0.58 })
      .stroke({ color: accentColor, alpha: major ? 0.9 : 0.7, width: major ? 4 : 2 });
    view
      .rect(left + 10, top + 10, Math.max(8, width - 20), Math.max(8, height - 20))
      .stroke({ color: 0x050706, alpha: 0.34, width: 2 });
  }

  private drawBuildingRoofTexture(view: Graphics, id: string, x: number, y: number, width: number, height: number, major: boolean, accentColor: number): void {
    const left = x - width / 2;
    const top = y - height / 2;
    view
      .rect(left, top, width, height)
      .fill({ color: 0x111510, alpha: 0.88 })
      .stroke({ color: major ? accentColor : 0xfff3b0, alpha: major ? 0.82 : 0.56, width: major ? 4 : 2 })
      .rect(left + 14, top + 13, Math.max(8, width - 28), 7)
      .fill({ color: accentColor, alpha: major ? 0.82 : 0.46 });

    const cols = Math.max(1, Math.min(6, Math.floor(width / 130)));
    const rows = Math.max(1, Math.min(5, Math.floor(height / 115)));
    const windowColor = major ? accentColor : 0x8d99ae;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const wx = left + 28 + col * ((width - 56) / Math.max(1, cols));
        const wy = top + 38 + row * ((height - 76) / Math.max(1, rows));
        view.rect(wx, wy, 28, 18).fill({ color: windowColor, alpha: 0.22 + ((row + col) % 2) * 0.14 });
      }
    }

    view
      .rect(left + width * 0.62, top + height * 0.18, Math.min(78, width * 0.18), Math.min(36, height * 0.14))
      .fill({ color: 0x050706, alpha: 0.34 });
    if (!major && width > 260 && height > 220) {
      view
        .moveTo(left + width * 0.18, top + height * 0.72)
        .lineTo(left + width * 0.34, top + height * 0.58)
        .lineTo(left + width * 0.46, top + height * 0.66)
        .stroke({ color: 0xd8dfd0, alpha: 0.18, width: 3 });
    }
  }

  private drawCircusWallTexture(view: Graphics, id: string, x: number, y: number, width: number, height: number): void {
    const left = x - width / 2;
    const top = y - height / 2;
    const fake = id.startsWith("ent-maze-fake-wall-");
    view
      .rect(left, top, width, height)
      .fill({ color: fake ? 0x2b2440 : 0x351136, alpha: fake ? 0.48 : 0.86 })
      .stroke({ color: fake ? 0xb8a7ff : 0xffd166, alpha: fake ? 0.45 : 0.82, width: fake ? 2 : 4 });
  }

  private drawCircusWallDetails(view: Graphics, id: string, x: number, y: number, width: number, height: number): void {
    const left = x - width / 2;
    const top = y - height / 2;
    const fake = id.startsWith("ent-maze-fake-wall-");
    const horizontal = width >= height;
    const step = horizontal ? 420 : 260;
    const count = Math.max(2, Math.floor((horizontal ? width : height) / step));
    for (let index = 0; index <= count; index += 1) {
      const offset = index * step;
      if (horizontal) {
        view.rect(left + offset, top + 8, 4, Math.max(8, height - 16)).fill({ color: 0xffd166, alpha: fake ? 0.12 : 0.26 });
      } else {
        view.rect(left + 8, top + offset, Math.max(8, width - 16), 4).fill({ color: 0xffd166, alpha: fake ? 0.12 : 0.26 });
      }
    }
    view
      .rect(left + 10, top + 10, Math.max(8, width - 20), Math.max(8, height - 20))
      .stroke({ color: 0x9d4edd, alpha: fake ? 0.2 : 0.42, width: 3 });
  }

  private drawStoryRegionWallTexture(view: Graphics, id: string, x: number, y: number, width: number, height: number): void {
    const palette = getStoryWallPalette(id);
    const left = x - width / 2;
    const top = y - height / 2;
    view
      .rect(left, top, width, height)
      .fill({ color: palette.base, alpha: 0.94 })
      .stroke({ color: palette.trim, alpha: 0.82, width: 5 });
  }

  private drawStoryWallDetails(view: Graphics, id: string, x: number, y: number, width: number, height: number): void {
    const palette = getStoryWallPalette(id);
    const left = x - width / 2;
    const top = y - height / 2;
    const horizontal = width >= height;
    const length = horizontal ? width : height;
    const step = Math.max(260, Math.min(520, length / 18));
    for (let offset = 0; offset < length; offset += step) {
      if (horizontal) {
        view.rect(left + offset, top + 14, 6, Math.max(8, height - 28)).fill({ color: palette.detail, alpha: 0.24 });
      } else {
        view.rect(left + 14, top + offset, Math.max(8, width - 28), 6).fill({ color: palette.detail, alpha: 0.24 });
      }
    }
    view
      .rect(left + 18, top + 18, Math.max(8, width - 36), Math.max(8, height - 36))
      .stroke({ color: palette.detail, alpha: 0.28, width: 3 });
  }

  private drawStoryPassageWallTexture(view: Graphics, x: number, y: number, width: number, height: number): void {
    const left = x - width / 2;
    const top = y - height / 2;
    view
      .rect(left, top, width, height)
      .fill({ color: 0x060708, alpha: 0.96 })
      .stroke({ color: 0x1d2024, alpha: 0.92, width: 5 });
  }

  private drawStoryGateWallTexture(view: Graphics, x: number, y: number, width: number, height: number): void {
    const left = x - width / 2;
    const top = y - height / 2;
    view
      .rect(left, top, width, height)
      .fill({ color: 0x0a0c10, alpha: 0.98 })
      .stroke({ color: 0xffd166, alpha: 0.9, width: 6 });
  }

  private drawStoryGateWallDetails(view: Graphics, x: number, y: number, width: number, height: number): void {
    const left = x - width / 2;
    const top = y - height / 2;
    const horizontal = width >= height;
    const length = horizontal ? width : height;
    for (let offset = 0; offset < length; offset += 260) {
      if (horizontal) {
        view.rect(left + offset, top + height / 2 - 10, 130, 20).fill({ color: 0xffd166, alpha: 0.38 });
      } else {
        view.rect(left + width / 2 - 10, top + offset, 20, 130).fill({ color: 0xffd166, alpha: 0.38 });
      }
    }
    view
      .rect(left + 18, top + 18, Math.max(8, width - 36), Math.max(8, height - 36))
      .stroke({ color: 0x050706, alpha: 0.68, width: 5 });
  }

  private drawPassageWallDetails(view: Graphics, x: number, y: number, width: number, height: number): void {
    const left = x - width / 2;
    const top = y - height / 2;
    const horizontal = width >= height;
    const length = horizontal ? width : height;
    for (let offset = 0; offset < length; offset += 360) {
      if (horizontal) {
        view.rect(left + offset, top + height / 2 - 5, 180, 10).fill({ color: 0xffd166, alpha: 0.2 });
      } else {
        view.rect(left + width / 2 - 5, top + offset, 10, 180).fill({ color: 0xffd166, alpha: 0.2 });
      }
    }
  }

  private createPlayer(): void {
    const start = this.getPlayerStart();
    const view = new Graphics();
    if (this.isStoryMode()) {
      this.playerStoryVisual = attachStoryActorVisual(
        view,
        "vanguard",
        "idle",
        getStoryActorDirection(this.movementDirection),
      );
    } else {
      this.drawPlayerMech(view);
    }
    this.setViewPosition(view, start.x, start.y);
    view.zIndex = this.getStoryVisualDepth(start, 20);
    this.world.addChild(view);
    this.player = { view, x: start.x, y: start.y };
    this.playerWeapon = this.createPlayerWeapon();
    this.updateCamera();
  }

  private createPlayerWeapon(): WeaponVisual {
    const start = this.getPlayerStart();
    const container = new Container();
    this.setViewPosition(
      container,
      start.x,
      start.y,
      this.isStoryMode() ? STORY_2_5D_CONFIG.weaponYOffset : 0,
    );
    container.zIndex = this.getStoryVisualDepth(start, 30);
    const geometry = PLAYER_WEAPON_VISUAL_GEOMETRY;

    const barrel = new Graphics();
    barrel
      .roundRect(
        geometry.barrel.x,
        geometry.barrel.y,
        geometry.barrel.width,
        geometry.barrel.height,
        geometry.barrel.radius,
      )
      .fill(0x15202b)
      .stroke({ color: 0x8ee7ff, alpha: 0.78, width: 1.5 });
    barrel
      .rect(
        geometry.energyCore.x,
        geometry.energyCore.y,
        geometry.energyCore.width,
        geometry.energyCore.height,
      )
      .fill({ color: 0x68e1fd, alpha: 0.9 });
    barrel
      .rect(
        geometry.sideVents.x,
        geometry.sideVents.upperY,
        geometry.sideVents.width,
        geometry.sideVents.height,
      )
      .fill(0x283a4d);
    barrel
      .rect(
        geometry.sideVents.x,
        geometry.sideVents.lowerY,
        geometry.sideVents.width,
        geometry.sideVents.height,
      )
      .fill(0x283a4d);
    barrel
      .rect(
        geometry.muzzleTips.x,
        geometry.muzzleTips.upperY,
        geometry.muzzleTips.width,
        geometry.muzzleTips.height,
      )
      .fill(0xd9f7ff);
    barrel
      .rect(
        geometry.muzzleTips.x,
        geometry.muzzleTips.lowerY,
        geometry.muzzleTips.width,
        geometry.muzzleTips.height,
      )
      .fill(0xd9f7ff);
    container.addChild(barrel);

    const muzzleFlash = new Graphics();
    muzzleFlash
      .poly([
        geometry.muzzleFlash.baseX,
        0,
        geometry.muzzleFlash.tipX,
        geometry.muzzleFlash.upperY,
        geometry.muzzleFlash.innerX,
        0,
        geometry.muzzleFlash.tipX,
        geometry.muzzleFlash.lowerY,
      ])
      .fill({ color: 0xfff3b0, alpha: 0.9 })
      .circle(
        geometry.muzzleFlash.circleX,
        0,
        geometry.muzzleFlash.circleRadius,
      )
      .stroke({ color: 0x68e1fd, alpha: 0.8, width: 2 });
    muzzleFlash.visible = false;
    container.addChild(muzzleFlash);

    this.world.addChild(container);
    return { container, barrel, muzzleFlash };
  }

  private drawPlayerMech(view: Graphics, energyColor = this.getMechEnergyColor()): void {
    const finalForm = this.state.selectedMechFormId;
    const stage =
      finalForm === "laser"
        ? "laser"
        : finalForm === "missile"
          ? "heavy"
          : finalForm === "blade"
            ? "temporal"
            : getMechEvolutionStage(this.state.skillUpgradeRanks);
    view.clear();
    view
      .poly([-14, -18, 14, -18, 22, -7, 17, 15, 0, 22, -17, 15, -22, -7])
      .fill(0x344055)
      .stroke({ color: 0xb7c9d9, alpha: 0.8, width: 2 });
    view.roundRect(-8, -13, 16, 22, 5).fill(0x15202b);
    view.circle(0, -3, 6).fill({ color: energyColor, alpha: 0.9 });
    view.rect(-29, -8, 10, 21).fill(0x263143).stroke({ color: 0x8ee7ff, alpha: 0.45, width: 1 });
    view.rect(19, -8, 10, 21).fill(0x263143).stroke({ color: 0x8ee7ff, alpha: 0.45, width: 1 });
    view.roundRect(-19, 14, 10, 16, 3).fill(0x1e2938);
    view.roundRect(9, 14, 10, 16, 3).fill(0x1e2938);
    view.rect(-4, 8, 8, 16).fill({ color: 0xd9f7ff, alpha: 0.55 });
    if (stage === "heavy" || stage === "laser" || stage === "temporal") {
      view.roundRect(-35, -17, 10, 24, 4).fill(0x48505f).stroke({ color: 0xfff3b0, alpha: 0.65, width: 1 });
      view.roundRect(25, -17, 10, 24, 4).fill(0x48505f).stroke({ color: 0xfff3b0, alpha: 0.65, width: 1 });
      view.circle(-30, -20, 3).fill(0xff9f1c);
      view.circle(30, -20, 3).fill(0xff9f1c);
    }
    if (stage === "laser" || stage === "temporal") {
      view.circle(0, -3, 12).stroke({ color: 0xd9f7ff, alpha: 0.7, width: 2 });
      view.rect(-6, -27, 12, 10).fill({ color: 0x68e1fd, alpha: 0.72 });
      view.rect(39, -3, 20, 6).fill({ color: 0x68e1fd, alpha: 0.48 });
    }
    if (stage === "temporal") {
      view.circle(0, 0, 34).stroke({ color: 0xb56cff, alpha: 0.58, width: 2 });
      view.circle(0, 0, 42).stroke({ color: 0x68e1fd, alpha: 0.28, width: 1.5 });
      view.rect(-2, -38, 4, 10).fill({ color: 0xb56cff, alpha: 0.85 });
    }
    if (finalForm === "missile") {
      view.rect(-43, -28, 10, 56).fill(0x2f3745).stroke({ color: 0xff9f1c, alpha: 0.9, width: 1.5 });
      view.rect(33, -28, 10, 56).fill(0x2f3745).stroke({ color: 0xff9f1c, alpha: 0.9, width: 1.5 });
    }
    if (finalForm === "blade") {
      view.poly([34, -7, 96, 0, 34, 7, 16, 0]).fill({ color: 0xff4d6d, alpha: 0.88 });
      view.poly([38, -3, 86, 0, 38, 3]).fill({ color: 0xfff3b0, alpha: 0.9 });
    }
  }

  private createNodeMarkers(): void {
    const style = new TextStyle({ fill: "#f8f4e3", fontFamily: "Arial", fontSize: 14 });
    for (const node of this.state.exploration.nodes) {
      const position = getNodeWorldPosition(node);
      const color = node.kind === "resource" ? 0x74c69d : node.kind === "event" ? 0xf2cc8f : 0xe07a5f;
      const view = new Graphics();
      view.rect(-20, -20, 40, 40).fill({ color, alpha: 0.9 });
      view.position.set(position.x, position.y);
      this.world.addChild(view);

      const label = new Text({ text: node.name, style });
      label.position.set(position.x - 42, position.y + 28);
      this.world.addChild(label);
      this.nodeMarkers.push({ view, nodeId: node.id, x: position.x, y: position.y });
    }
  }

  private bindInput(): void {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.app.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.app.canvas.addEventListener("pointerdown", this.handlePointerMove);
    this.inputBound = true;
  }

  private unbindInput(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.app.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.app.canvas.removeEventListener("pointerdown", this.handlePointerMove);
    this.inputBound = false;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.key.toLowerCase());
    const choiceIndex = Number(event.key) - 1;
    if (this.state.pendingSkillChoiceIds.length > 0) {
      if (choiceIndex >= 0 && choiceIndex < this.state.pendingSkillChoiceIds.length) {
        event.preventDefault();
        this.chooseSkillUpgrade(this.state.pendingSkillChoiceIds[choiceIndex]);
      }
      return;
    }
    if (this.state.pendingMechFormIds.length > 0) {
      if (choiceIndex >= 0 && choiceIndex < this.state.pendingMechFormIds.length) {
        event.preventDefault();
        this.chooseMechForm(this.state.pendingMechFormIds[choiceIndex]);
      }
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (this.tryManualPhaseBlink()) {
        return;
      }
      const target = this.getManualAttackTarget();
      if (!target) {
        this.emitState("Target is outside fog vision. Attacks only hit visible enemies.");
        return;
      }
      this.fireProjectile(target, "basic", this.getBasicGunDamage(), BASIC_GUN.projectileSpeed, "鎵嬪姩鏅敾");
    }
    if (event.key.toLowerCase() === "q") {
      this.attackMode = this.attackMode === "auto" ? "manual" : "auto";
      this.emitState(`Attack mode: ${this.attackMode === "auto" ? "auto" : "manual"}`);
    }
    if (event.key.toLowerCase() === "e") {
      if (this.tryActivateStoryLighthouse()) {
        return;
      }
      this.collectNearbyNode();
    }
    if (event.key.toLowerCase() === "x") {
      this.state = gainRunExperience(this.state, 120);
      this.emitState("Debug: gained experience. Bosses keep patrolling the map.");
    }
    if (event.key.toLowerCase() === "b") {
      this.focusNearestBoss();
    }
    if (event.key.toLowerCase() === "r") {
      this.castUltimate();
    }
    if (event.key.toLowerCase() === "t") {
      this.castEndgameUltimate();
    }
    if (choiceIndex >= 0 && choiceIndex < 4) {
      this.castSkill(choiceIndex);
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const rect = this.app.canvas.getBoundingClientRect();
    const visualWorldPoint = {
      x: event.clientX - rect.left - this.world.x,
      y: event.clientY - rect.top - this.world.y,
    };
    this.pointerWorld = this.unprojectPoint(visualWorldPoint);
  };

  private movePlayer(deltaMs: number): void {
    if (!this.player) return;
    const seconds = deltaMs / 1000;
    const dx = (this.isRightDown() ? 1 : 0) - (this.isLeftDown() ? 1 : 0);
    const dy = (this.isDownDown() ? 1 : 0) - (this.isUpDown() ? 1 : 0);
    const length = Math.hypot(dx, dy) || 1;
    if (dx !== 0 || dy !== 0) {
      this.movementDirection = { x: dx / length, y: dy / length };
    }
    this.playStoryActorVisual(
      this.playerStoryVisual,
      dx !== 0 || dy !== 0 ? "run" : "idle",
      this.movementDirection,
      this.playerStoryAnimationLock,
    );
    if (this.playerFreezeMs > 0) return;
    const moveSpeed = this.getPlayerMoveSpeed();
    const desired = {
      x: clamp(this.player.x + (dx / length) * moveSpeed * seconds, 24, this.getMapWidth() - 24),
      y: clamp(this.player.y + (dy / length) * moveSpeed * seconds, 24, this.getMapHeight() - 24),
    };
    let resolved = resolveBlockedMovement(this.player, desired, 16, this.getActiveBuildings());
    if (this.isStoryMode()) {
      resolved = clampPointToUnlockedStoryRegions(this.player, resolved, [...this.unlockedStoryRegionIds]);
    }
    if (this.playerTrap && distance(resolved, this.playerTrap) > this.playerTrap.radius) {
      const angle = Math.atan2(resolved.y - this.playerTrap.y, resolved.x - this.playerTrap.x);
      resolved = {
        x: this.playerTrap.x + Math.cos(angle) * this.playerTrap.radius,
        y: this.playerTrap.y + Math.sin(angle) * this.playerTrap.radius,
      };
    }
    this.setActorPosition(this.player, resolved.x, resolved.y);
  }

  private updateEnemies(deltaMs: number): void {
    if (!this.player) return;
    const seconds = deltaMs / 1000;

    for (const enemy of this.enemies) {
      enemy.invulnerableMs = Math.max(0, (enemy.invulnerableMs ?? 0) - deltaMs);
      enemy.contactDamageElapsedMs += deltaMs;
      if (this.isDormantHospitalEnemy(enemy)) {
        this.updateDormantHospitalEnemy(enemy, deltaMs);
        continue;
      }
      const toPlayer = {
        x: this.player.x - enemy.x,
        y: this.player.y - enemy.y,
      };
      const angle = Math.atan2(toPlayer.y, toPlayer.x);
      const desired = {
        x: enemy.x + Math.cos(angle) * enemy.speed * seconds,
        y: enemy.y + Math.sin(angle) * enemy.speed * seconds,
      };
      const resolved = resolveBlockedMovement(enemy, desired, 11, this.getActiveBuildings());
      this.setActorPosition(enemy, resolved.x, resolved.y);
      const storyVisual = this.enemyStoryVisuals.get(enemy);
      if (storyVisual) {
        enemy.view.rotation = 0;
        this.playStoryActorVisual(
          storyVisual,
          "run",
          toPlayer,
          this.enemyStoryAnimationLocks.get(enemy),
        );
      } else {
        enemy.view.rotation = angle;
      }
      enemy.dashElapsedMs = (enemy.dashElapsedMs ?? 0) + deltaMs;
      if (enemy.kind === "boneSoldier" && (enemy.dashElapsedMs ?? 0) >= 2400 && distance(this.player, enemy) < 280) {
        enemy.dashElapsedMs = 0;
        enemy.dashMs = 260;
        enemy.dashAngle = angle;
      }
      if ((enemy.dashMs ?? 0) > 0) {
        enemy.dashMs = Math.max(0, (enemy.dashMs ?? 0) - deltaMs);
        this.setActorPosition(
          enemy,
          clamp(enemy.x + Math.cos(enemy.dashAngle ?? angle) * (enemy.dashSpeed ?? 520) * seconds, 24, MAP_WIDTH - 24),
          clamp(enemy.y + Math.sin(enemy.dashAngle ?? angle) * (enemy.dashSpeed ?? 520) * seconds, 24, MAP_HEIGHT - 24),
        );
      }
      if (
        enemy.contactDamageElapsedMs >= 700 &&
        this.isSameVisibilityZone(this.player, enemy) &&
        distance(this.player, enemy) <= 28
      ) {
        enemy.contactDamageElapsedMs = 0;
        this.applyPlayerDamage(
          enemy.kind === "boneSoldier" ? BONE_SOLDIER_CONTACT_DAMAGE : enemy.kind === "bone" ? BONE_CONTACT_DAMAGE : enemy.kind === "hound" ? 4 : 5,
        );
      }
    }
  }

  private isDormantHospitalEnemy(enemy: EnemyActor): boolean {
    return (enemy.kind === "bone" || enemy.kind === "boneSoldier") && this.hospitalKnight?.aggro === false;
  }

  private updateDormantHospitalEnemy(enemy: EnemyActor, deltaMs: number): void {
    if (!this.player) return;
    if (shouldHospitalKnightAggro(distance(this.player, enemy), false)) {
      this.aggroHospitalKnight();
      return;
    }
    const seconds = deltaMs / 1000;
    if (!enemy.guardTarget || distance(enemy, enemy.guardTarget) <= 18) {
      this.spawnSeed += 1;
      enemy.guardTarget = getHospitalKnightGuardRoamTarget(this.spawnSeed + Math.round(enemy.x + enemy.y));
    }
    const angle = Math.atan2(enemy.guardTarget.y - enemy.y, enemy.guardTarget.x - enemy.x);
    this.setActorPosition(
      enemy,
      clamp(enemy.x + Math.cos(angle) * 34 * seconds, 24, MAP_WIDTH - 24),
      clamp(enemy.y + Math.sin(angle) * 34 * seconds, 24, MAP_HEIGHT - 24),
    );
    enemy.view.rotation = angle;
  }

  private updateMechTransformationDamage(deltaMs: number): void {
    if (!this.player || this.mechTransformMs <= 0) return;
    this.mechTransformDamageElapsedMs += deltaMs;
    if (this.mechTransformDamageElapsedMs < 220) return;
    this.mechTransformDamageElapsedMs = 0;
    this.drawPhaseRing(this.player.x, this.player.y, 170);
    this.detonateAutoWeapon(this.player.x, this.player.y, 170, 96, 0xff4d6d);
  }

  private updateBosses(deltaMs: number): void {
    if (!this.player) return;
    const seconds = deltaMs / 1000;

    for (const boss of this.bosses) {
      boss.skillElapsedMs += deltaMs;
      boss.contactDamageElapsedMs += deltaMs;
      const sameZoneAsPlayer = this.isSameVisibilityZone(this.player, boss);
      const finalBossActive = Boolean(this.finalBoss);
      const playerInTerritory = isPointInBossTerritory(boss.bossId, this.player);
      const playerDistance = distance(this.player, boss);
      const shouldTargetPlayer =
        boss.bossId === "chef" ||
        shouldRoamingBossTargetPlayer({
          finalBossActive,
          bossRushActive: this.isBossRushMode(),
          sameZoneAsPlayer,
          playerInTerritory,
          distanceToPlayer: playerDistance,
        });

      if (boss.bossId === "chef") {
        this.updateChefMeatGrinder(boss, deltaMs);
        if (
          shouldTriggerChefMeatGrinder({
            health: boss.health,
            maxHealth: boss.maxHealth,
            used: boss.chefMeatGrinderUsed ?? false,
          })
        ) {
          this.startChefMeatGrinder(boss);
          this.emitState("Mutant Chef: meat grinder started.");
        }
      }
      if (boss.bossId === "clown") {
        this.updateClownSpiralKnives(boss, deltaMs);
      }
      if (boss.bossId === "courier") {
        this.updateCourierCitywideDelivery(boss, deltaMs);
      }

      if (boss.chefAirborne) {
        boss.label.position.set(boss.x - 64, boss.y - 62);
        boss.label.text = `${this.getBossName(boss.bossId)} ${Math.ceil(boss.health)}/${boss.maxHealth}`;
        continue;
      }

      if (boss.mode === "windup") {
        boss.windupMs = Math.max(0, boss.windupMs - deltaMs);
        if (boss.windupMs === 0) {
          boss.mode = "charge";
          boss.chargeMs = 360;
          boss.chargeAngle = boss.pendingChargeAngle;
        }
      } else if (boss.chargeMs <= 0) {
        boss.mode = shouldTargetPlayer ? "chase" : "roam";
      }

      if (
        shouldTargetPlayer &&
        boss.skillElapsedMs >= boss.skillCooldownMs &&
        (boss.clownSpiralKnifeMs ?? 0) <= 0 &&
        (boss.courierCitywideMs ?? 0) <= 0
      ) {
        this.triggerBossSkill(boss);
      }
      if (
        boss.bossId === "beastmaster" &&
        shouldTriggerBeastmasterFrenzy({
          health: boss.health,
          maxHealth: boss.maxHealth,
          frenzyUsed: boss.beastmasterFrenzyUsed ?? false,
        })
      ) {
        boss.beastmasterFrenzyUsed = true;
        this.spawnBeastmasterTotalFrenzy(boss);
        this.emitState("椹吔甯堬細褰诲簳鏆磋蛋");
      }

      const movement = this.getBossMovementTarget(boss);
      const speed = boss.mode === "windup" ? 0 : boss.mode === "charge" ? this.getBossChargeSpeed(boss) : boss.mode === "chase" ? 112 : 68;
      const angle = Math.atan2(movement.y - boss.y, movement.x - boss.x);
      const desired = {
        x: boss.x + Math.cos(angle) * speed * seconds,
        y: boss.y + Math.sin(angle) * speed * seconds,
      };
      const resolved = resolveBlockedMovement(boss, desired, 34, this.getActiveBuildings());
      this.setActorPosition(boss, resolved.x, resolved.y);
      boss.view.rotation = angle;
      if (sameZoneAsPlayer && boss.contactDamageElapsedMs >= 700 && distance(this.player, boss) <= 54) {
        boss.contactDamageElapsedMs = 0;
        this.applyPlayerDamage(boss.mode === "charge" ? boss.chargeDamage : 12);
      }

      boss.chargeMs = Math.max(0, boss.chargeMs - deltaMs);
      if (boss.chargeMs === 0 && boss.mode === "charge") {
        boss.mode = shouldTargetPlayer ? "chase" : "roam";
        boss.chargeSpeed = undefined;
      }
      if (distance(boss, boss.roamTarget) < 80) {
        boss.roamTarget = this.getNextRoamTarget(boss);
      }
      if (boss.bossId === "magician") {
        this.drawMagicianBossState(boss);
      }
      boss.label.position.set(boss.x - 64, boss.y - 62);
      boss.label.text = `${this.getBossName(boss.bossId)} ${Math.ceil(boss.health)}/${boss.maxHealth}`;
    }
  }

  private updateFinalBoss(deltaMs: number): void {
    const finalBosses = this.getFinalBosses();
    if (!this.player) return;
    this.updateFinalBossBombs(deltaMs);
    this.updateFinalBossMissiles(deltaMs);
    this.updateFinalBossCrawlers(deltaMs);
    this.updateWarCoreArmoryPressure(deltaMs);
    this.updateWarCoreCollapse(deltaMs);
    if (finalBosses.length === 0) return;
    const highestPhase = finalBosses.reduce<FinalBossPhase>((phase, boss) => Math.max(phase, getFinalBossPhase(boss.health, boss.maxHealth)) as FinalBossPhase, 1);
    this.updateFinalBossBuildings(deltaMs, highestPhase);
    for (const boss of finalBosses) {
      this.updateFinalBossActor(boss, deltaMs);
    }
  }

  private updateFinalBossActor(boss: FinalBossActor, deltaMs: number): void {
    if (!this.player) return;
    const phase = getFinalBossPhase(boss.health, boss.maxHealth);

    if (phase !== boss.phase) {
      boss.phase = phase;
      this.drawFinalBossSprite(boss.view, phase);
      if (phase === 3) {
        this.clearSniperBuildings();
      }
      if (phase === 4) {
        this.enterWarCoreArmory(boss);
      }
      this.emitState(`${FINAL_BOSS_DEFINITION.name}进入 P${phase}。`);
    }

    boss.skillElapsedMs += deltaMs;
    boss.contactDamageElapsedMs += deltaMs;
    const seconds = deltaMs / 1000;
    const speed =
      phase === 4
        ? FINAL_BOSS_PHASE_FOUR_SKILL.coreSpeed
        : phase === 3
          ? FINAL_BOSS_PHASE_THREE_SKILL.mechSpeed
          : FINAL_BOSS_PHASE_ONE_SKILL.coreSpeed;
    const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
    if (speed > 0) {
      const desired = {
        x: clamp(boss.x + Math.cos(angle) * speed * seconds, 24, MAP_WIDTH - 24),
        y: clamp(boss.y + Math.sin(angle) * speed * seconds, 24, MAP_HEIGHT - 24),
      };
      const resolved = resolveBlockedMovement(boss, desired, 46, this.getActiveBuildings());
      this.setActorPosition(boss, resolved.x, resolved.y);
    }
    boss.view.rotation = angle;

    if (boss.contactDamageElapsedMs >= 650 && distance(this.player, boss) <= 72) {
      boss.contactDamageElapsedMs = 0;
      this.applyPlayerDamage(phase === 3 ? 24 : 16);
    }
    if (boss.skillElapsedMs >= boss.skillCooldownMs) {
      boss.skillElapsedMs = 0;
      this.triggerFinalBossSkill(boss);
    }
    if (phase === 3 && boss.health <= FINAL_BOSS_PHASE_THREE_SKILL.finalBeamHealthThreshold && !boss.finalBeamUsed) {
      boss.finalBeamUsed = true;
      this.castFinalBossAnnihilationBeam(boss);
    }
    boss.label.position.set(boss.x - 108, boss.y - 86);
    boss.label.text = `${FINAL_BOSS_DEFINITION.name} P${phase} ${Math.ceil(boss.health)}/${boss.maxHealth}`;
  }

  private getFinalBosses(): FinalBossActor[] {
    return [
      ...(this.finalBoss ? [this.finalBoss] : []),
      ...this.extraFinalBosses,
    ];
  }

  private getHospitalKnights(): HospitalKnightActor[] {
    return [
      ...(this.hospitalKnight ? [this.hospitalKnight] : []),
      ...this.extraHospitalKnights,
    ];
  }

  private getBossMovementTarget(boss: BossActor): { x: number; y: number } {
    if (boss.mode === "charge") {
      return {
      x: boss.x + Math.cos(boss.chargeAngle) * 320,
      y: boss.y + Math.sin(boss.chargeAngle) * 320,
      };
    }
    if (boss.bossId === "chef" && this.player) {
      return this.player;
    }
    if (boss.bossId === "clown" && boss.mode === "chase" && this.player) {
      return getClownDistanceTarget(boss, this.player, this.getEffectiveCombatRange(620));
    }
    if (
      boss.mode === "chase" &&
      this.player &&
      (this.finalBoss || isPointInBossTerritory(boss.bossId, this.player))
    ) {
      return this.player;
    }
    return boss.roamTarget;
  }

  private getBossChargeSpeed(boss: BossActor): number {
    if (boss.chargeSpeed) return boss.chargeSpeed;
    return boss.bossId === "courier" ? 1120 : 360;
  }

  private updateProjectiles(deltaMs: number): void {
    for (const bullet of [...this.bullets]) {
      bullet.projectile = updateProjectileState(bullet.projectile, deltaMs);
      this.setActorPosition(bullet, bullet.projectile.x, bullet.projectile.y, 40);

      if (
        bullet.projectile.expired ||
        bullet.x < 0 ||
        bullet.y < 0 ||
        bullet.x > this.getMapWidth() ||
        bullet.y > this.getMapHeight() ||
        !this.isPointInsideCurrentStoryVision(bullet)
      ) {
        this.removeBullet(bullet);
        continue;
      }

      if (
        this.hitEnemyWithBullet(bullet) ||
        this.hitInfusionStandWithBullet(bullet) ||
        this.hitTeslaDeviceWithBullet(bullet) ||
        this.hitConvoyVehicleWithBullet(bullet) ||
        this.hitMagicianStagePropWithBullet(bullet) ||
        this.hitBossWithBullet(bullet) ||
        this.hitFinalBossWithBullet(bullet) ||
        this.hitHospitalKnightWithBullet(bullet)
      ) {
        this.removeBullet(bullet);
      }
    }
  }

  private updateHeavyProjectiles(deltaMs: number): void {
    const seconds = deltaMs / 1000;
    for (const missile of [...this.heavyProjectiles]) {
      missile.lifeMs -= deltaMs;
      if (missile.target && !missile.target.view.destroyed) {
        missile.targetX = missile.target.x;
        missile.targetY = missile.target.y;
      }
      const dx = missile.targetX - missile.x;
      const dy = missile.targetY - missile.y;
      const length = Math.hypot(dx, dy) || 1;
      const speed = Math.hypot(missile.velocityX, missile.velocityY);
      missile.velocityX = (dx / length) * speed;
      missile.velocityY = (dy / length) * speed;
      missile.view.rotation = this.getVisualVelocityAngle(missile, missile.velocityX, missile.velocityY);
      this.setActorPosition(
        missile,
        missile.x + missile.velocityX * seconds,
        missile.y + missile.velocityY * seconds,
        40,
      );

      if (
        missile.lifeMs <= 0 ||
        distance(missile, { x: missile.targetX, y: missile.targetY }) <= Math.max(18, missile.radius * 2)
      ) {
        this.detonateAutoWeapon(missile.x, missile.y, missile.blastRadius, missile.damage);
        this.removeHeavyProjectile(missile);
      }
    }
  }

  private updateAutoStrikes(deltaMs: number): void {
    for (const strike of [...this.autoStrikes]) {
      strike.lifeMs -= deltaMs;
      strike.view.alpha = Math.max(0.22, strike.lifeMs / strike.maxLifeMs);
      if (strike.lifeMs <= 0) {
        this.detonateAutoWeapon(strike.x, strike.y, strike.radius, strike.damage, 0xff4d6d);
        this.removeAutoStrike(strike);
      }
    }
  }

  private updateLaserEffects(deltaMs: number): void {
    for (const effect of [...this.laserEffects]) {
      effect.lifeMs -= deltaMs;
      effect.view.alpha = Math.max(0, effect.lifeMs / effect.maxLifeMs);
      if (effect.lifeMs <= 0) {
        this.world.removeChild(effect.view);
        effect.view.destroy();
        this.laserEffects = this.laserEffects.filter((candidate) => candidate !== effect);
      }
    }
  }

  private updateWarpMines(deltaMs: number): void {
    for (const mine of [...this.warpMines]) {
      mine.lifeMs -= deltaMs;
      mine.view.rotation += deltaMs / 900;
      const triggered =
        this.getVisibleCombatTargets(1200).some((target) => distance(target, mine) <= mine.radius + 12);
      if (triggered || mine.lifeMs <= 0) {
        this.detonateAutoWeapon(mine.x, mine.y, mine.radius, mine.damage, 0xb56cff);
        this.removeWarpMine(mine);
      }
    }
  }

  private updateBossHazards(deltaMs: number): void {
    const seconds = deltaMs / 1000;
    for (const hazard of [...this.bossHazards]) {
      hazard.lifeMs -= deltaMs;
      hazard.tickElapsedMs += deltaMs;
      if (hazard.kind === "knife") {
        hazard.view.rotation += seconds * 12;
      }
      this.setActorPosition(hazard, hazard.x + hazard.velocityX * seconds, hazard.y + hazard.velocityY * seconds);
      if (
        hazard.lifeMs <= 0 ||
        hazard.x < 0 ||
        hazard.y < 0 ||
        hazard.x > this.getMapWidth() ||
        hazard.y > this.getMapHeight()
      ) {
        if (hazard.expiresIntoFire) {
          this.spawnFirePit(hazard.x, hazard.y);
        }
        if (hazard.kind === "sedativeDart") {
          this.spawnMedicineMist(hazard.x, hazard.y);
        }
        this.removeBossHazard(hazard);
        continue;
      }
      const player = this.player;
      const playerDistanceToHazard = player ? distance(player, hazard) : Infinity;
      const playerTouchesHazard =
        player &&
        this.isSameVisibilityZone(player, hazard) &&
        (hazard.kind === "courierParcel"
          ? getCourierParcelOutcome(playerDistanceToHazard, hazard.radius) === "detonate"
          : playerDistanceToHazard <= hazard.radius + 16);
      if (playerTouchesHazard) {
        if (hazard.kind === "magneticMine") {
          const pullAngle = Math.atan2(hazard.y - player.y, hazard.x - player.x);
          this.setActorPosition(
            player,
            clamp(player.x + Math.cos(pullAngle) * 4.8, 24, MAP_WIDTH - 24),
            clamp(player.y + Math.sin(pullAngle) * 4.8, 24, MAP_HEIGHT - 24),
          );
          this.playerSlowMs = Math.max(this.playerSlowMs, 260);
          if (distance(player, hazard) <= 46 || hazard.lifeMs <= 620) {
            this.applyPlayerDamage(hazard.damage);
            this.addScreenShake(180, 6);
            this.spawnHitSparks(hazard.x, hazard.y, 0x68e1fd, 18);
            this.removeBossHazard(hazard);
          }
        } else if (hazard.kind === "firePit" || hazard.kind === "bigFirePit") {
          const tickMs = hazard.kind === "bigFirePit" ? BIG_FIRE_PIT.tickMs : 450;
          if (hazard.tickElapsedMs >= tickMs) {
            hazard.tickElapsedMs = 0;
            this.applyPlayerDamage(hazard.damage);
          }
        } else if (hazard.kind === "toxicCloud") {
          if (hazard.tickElapsedMs >= 520) {
            hazard.tickElapsedMs = 0;
            this.playerSlowMs = Math.max(this.playerSlowMs, 520);
            this.applyPlayerDamage(hazard.damage);
          }
        } else if (hazard.kind === "medicineMist") {
          this.playerSlowMs = Math.max(this.playerSlowMs, 160);
        } else if (hazard.kind === "sedativeDart") {
          this.applyPlayerDamage(hazard.damage);
          this.playerSlowMs = Math.max(this.playerSlowMs, 2600);
          this.skillSuppressMs = Math.max(this.skillSuppressMs, 1200);
          this.showDamageNumber(player.x, player.y - 42, 0, "#a7c957", "SED ");
          this.removeBossHazard(hazard);
        } else if (hazard.kind === "magicBox") {
          this.triggerMagicBoxEffect(hazard);
          this.removeBossHazard(hazard);
        } else if (hazard.kind === "courierParcel") {
          this.applyPlayerDamage(hazard.damage);
          this.spawnDelayedBossBlast(hazard.x, hazard.y, hazard.radius + 28, Math.round(hazard.damage * 0.7), 40, 0xffd166, "parcel blast");
          this.removeBossHazard(hazard);
        } else {
          this.applyPlayerDamage(hazard.damage);
          if (hazard.kind === "electricOrb") {
            this.playerSlowMs = Math.max(this.playerSlowMs, 900);
          }
          if (hazard.expiresIntoFire) {
            this.spawnFirePit(hazard.x, hazard.y);
          }
          this.removeBossHazard(hazard);
        }
      }
      if (hazard.kind === "medicineMist" && hazard.tickElapsedMs >= 700) {
        hazard.tickElapsedMs = 0;
        this.healActorsNear(hazard.x, hazard.y, hazard.radius, 10);
      }
    }
  }

  private updateInfusionStands(deltaMs: number): void {
    for (const stand of [...this.infusionStands]) {
      stand.lifeMs -= deltaMs;
      stand.tickElapsedMs += deltaMs;
      stand.view.rotation += deltaMs / 1200;
      stand.view.alpha = Math.max(0.35, stand.lifeMs / 12000);
      if (!this.bosses.includes(stand.boss) || stand.lifeMs <= 0 || stand.health <= 0) {
        this.removeInfusionStand(stand);
        continue;
      }
      if (stand.tickElapsedMs >= 1000) {
        stand.tickElapsedMs = 0;
        stand.boss.health = Math.min(stand.boss.maxHealth, stand.boss.health + 55);
        this.showDamageNumber(stand.boss.x, stand.boss.y - 58, 55, "#a7c957", "+");
        this.spawnToxicCloud(stand.x, stand.y, 86, 4, 1800);
      }
    }
  }

  private updateTeslaDevices(deltaMs: number): void {
    if (!this.player) return;
    for (const device of [...this.teslaDevices]) {
      device.lifeMs -= deltaMs;
      device.tickElapsedMs += deltaMs;
      device.view.rotation += deltaMs / (device.kind === "turret" ? 700 : 1200);
      device.view.alpha = Math.max(0.4, device.lifeMs / 14000);
      if (!this.bosses.includes(device.boss) || device.lifeMs <= 0 || device.health <= 0) {
        this.removeTeslaDevice(device);
        continue;
      }
      if (device.kind === "turret" && device.tickElapsedMs >= 980) {
        device.tickElapsedMs = 0;
        const angle = Math.atan2(this.player.y - device.y, this.player.x - device.x);
        this.spawnBossHazard(device.x, device.y, angle, 480, 0x68e1fd, 1800, 10, "electricOrb", 8);
      }
    }
  }

  private updateTeslaGrids(deltaMs: number): void {
    if (!this.player) return;
    for (const grid of [...this.teslaGrids]) {
      grid.lifeMs -= deltaMs;
      grid.tickElapsedMs += deltaMs;
      grid.view.alpha = Math.max(0.18, grid.lifeMs / 9000);
      if (grid.lifeMs <= 0 || !this.teslaDevices.includes(grid.start) || !this.teslaDevices.includes(grid.end)) {
        this.removeTeslaGrid(grid);
        continue;
      }
      grid.view.clear();
      grid.view
        .moveTo(grid.start.x, grid.start.y)
        .lineTo(grid.end.x, grid.end.y)
        .stroke({ color: 0x68e1fd, alpha: 0.34, width: 28 })
        .moveTo(grid.start.x, grid.start.y)
        .lineTo(grid.end.x, grid.end.y)
        .stroke({ color: 0xd9f7ff, alpha: 0.82, width: 5 });
      if (grid.tickElapsedMs >= 420 && distancePointToSegment(this.player, grid.start, grid.end) <= 28) {
        grid.tickElapsedMs = 0;
        this.applyPlayerDamage(grid.damage);
        this.playerSlowMs = Math.max(this.playerSlowMs, 650);
      }
    }
  }

  private updateConvoyVehicles(deltaMs: number): void {
    for (const vehicle of [...this.convoyVehicles]) {
      vehicle.lifeMs -= deltaMs;
      vehicle.tickElapsedMs += deltaMs;
      vehicle.view.alpha = Math.max(0.35, vehicle.lifeMs / (vehicle.kind === "escort" ? 18000 : 12000));
      if (!this.bosses.includes(vehicle.boss) || vehicle.lifeMs <= 0 || vehicle.health <= 0) {
        this.detonateConvoyVehicle(vehicle);
        continue;
      }

      if (vehicle.kind === "escort") {
        vehicle.orbitAngle = (vehicle.orbitAngle ?? 0) + deltaMs / 2400;
        const targetX = clamp(vehicle.boss.x + Math.cos(vehicle.orbitAngle) * (vehicle.orbitRadius ?? 230), 24, MAP_WIDTH - 24);
        const targetY = clamp(vehicle.boss.y + Math.sin(vehicle.orbitAngle) * (vehicle.orbitRadius ?? 230), 24, MAP_HEIGHT - 24);
        this.setActorPosition(vehicle, lerp(vehicle.x, targetX, 0.08), lerp(vehicle.y, targetY, 0.08));
        vehicle.view.rotation = vehicle.orbitAngle;
        if (vehicle.tickElapsedMs >= 1050 && this.player) {
          vehicle.tickElapsedMs = 0;
          const angle = Math.atan2(this.player.y - vehicle.y, this.player.x - vehicle.x);
          this.spawnBossHazard(vehicle.x, vehicle.y, angle, 520, 0xffd166, 1500, 10, "bossProjectile", vehicle.damage);
        }
        continue;
      }

      if (this.player) {
        const angle = Math.atan2(this.player.y - vehicle.y, this.player.x - vehicle.x);
        const speed = vehicle.speed ?? 180;
        this.setActorPosition(
          vehicle,
          clamp(vehicle.x + Math.cos(angle) * speed * (deltaMs / 1000), 24, MAP_WIDTH - 24),
          clamp(vehicle.y + Math.sin(angle) * speed * (deltaMs / 1000), 24, MAP_HEIGHT - 24),
        );
        vehicle.view.rotation = angle;
        if (distance(vehicle, this.player) <= vehicle.radius + 28) {
          this.detonateConvoyVehicle(vehicle);
          continue;
        }
      }

      if (vehicle.tickElapsedMs >= 1300) {
        vehicle.tickElapsedMs = 0;
        vehicle.boss.health = Math.min(vehicle.boss.maxHealth, vehicle.boss.health + 70);
        this.showDamageNumber(vehicle.boss.x, vehicle.boss.y - 58, 70, "#ff9f1c", "+");
      }
    }
  }

  private updateTelegraphs(deltaMs: number): void {
    for (const telegraph of [...this.bossTelegraphs]) {
      telegraph.lifeMs -= deltaMs;
      telegraph.view.alpha = Math.max(0, telegraph.lifeMs / telegraph.maxLifeMs);
      if (telegraph.lifeMs <= 0) {
        this.world.removeChild(telegraph.view);
        telegraph.view.destroy();
        this.bossTelegraphs = this.bossTelegraphs.filter((candidate) => candidate !== telegraph);
      }
    }
  }

  private updateStoryDeathVisuals(deltaMs: number): void {
    for (const deathVisual of [...this.storyDeathVisuals]) {
      deathVisual.lifeMs -= deltaMs;
      deathVisual.view.alpha = Math.min(1, Math.max(0, deathVisual.lifeMs / 180));
      if (deathVisual.lifeMs > 0) continue;
      deathVisual.visual.destroy();
      this.world.removeChild(deathVisual.view);
      deathVisual.view.destroy();
      this.storyDeathVisuals = this.storyDeathVisuals.filter(
        (candidate) => candidate !== deathVisual,
      );
    }
  }

  private updateDamageNumbers(deltaMs: number): void {
    const seconds = deltaMs / 1000;
    for (const damageNumber of [...this.damageNumbers]) {
      damageNumber.lifeMs -= deltaMs;
      damageNumber.view.y += damageNumber.velocityY * seconds;
      damageNumber.view.alpha = Math.max(0, damageNumber.lifeMs / 650);
      if (damageNumber.lifeMs <= 0) {
        this.world.removeChild(damageNumber.view);
        damageNumber.view.destroy();
        this.damageNumbers = this.damageNumbers.filter((candidate) => candidate !== damageNumber);
      }
    }
  }

  private updateScreenShake(deltaMs: number): void {
    this.screenShakeMs = Math.max(0, this.screenShakeMs - deltaMs);
    if (this.screenShakeMs === 0) {
      this.screenShakeMagnitude = 0;
    }
  }

  private updatePlayerSlow(deltaMs: number): void {
    this.playerSlowMs = Math.max(0, this.playerSlowMs - deltaMs);
    this.playerFreezeMs = Math.max(0, this.playerFreezeMs - deltaMs);
    this.playerVisionNarrowMs = Math.max(0, this.playerVisionNarrowMs - deltaMs);
    this.skillSuppressMs = Math.max(0, this.skillSuppressMs - deltaMs);
  }

  private updateSpawning(deltaMs: number): void {
    if (this.isBossRushMode()) return;
    if (this.shouldDisableStoryZombieWaves()) return;
    if (
      !shouldAllowSmallEnemySpawning({
        experimentalDisabled: EXPERIMENTAL_DISABLE_SMALL_ENEMIES,
        finalBossActive: Boolean(this.finalBoss),
      })
    ) {
      return;
    }
    this.enemySpawnElapsed += deltaMs;
    const pressureMultiplier = this.getStoryMonsterPressureMultiplier();
    const maxAlive = Math.round(getEnemyMaxAlive(this.state.level) * pressureMultiplier);
    let ticks = 0;
    while (this.enemySpawnElapsed >= ENEMY_SPAWN_TICK_MS && this.enemies.length < maxAlive && ticks < 8) {
      this.enemySpawnElapsed -= ENEMY_SPAWN_TICK_MS;
      ticks += 1;
      const spawnCount = Math.min(
        Math.max(1, Math.round(getEnemySpawnBatchSize(this.state.level, ENEMY_SPAWN_TICK_MS) * pressureMultiplier)),
        maxAlive - this.enemies.length,
      );
      this.spawnEnemyWave(spawnCount);
    }
  }

  private updateAutoAttack(deltaMs: number): void {
    if (this.attackMode !== "auto") return;
    this.autoAttackElapsed += deltaMs;
    if (this.autoAttackElapsed < this.getBasicGunIntervalMs()) return;
    this.autoAttackElapsed = 0;
    const target = this.getNearestTarget(620);
    if (target) {
      this.fireProjectile(target, "basic", this.getBasicGunDamage(), BASIC_GUN.projectileSpeed, "鑷姩鏅敾");
    }
  }

  private spawnEnemyWave(count: number): void {
    if (!this.player) return;
    for (let index = 0; index < count; index += 1) {
      const position = this.findOpenEnemySpawnPosition();
      this.spawnEnemyActor(position.x, position.y, "zombie", 28, 58 + (this.spawnSeed % 4) * 8);
    }
  }

  private spawnEnemyActor(x: number, y: number, kind: EnemyKind, health: number, speed: number): EnemyActor {
    const view = new Graphics();
    const useStoryZombieVisual = this.isStoryMode() && kind === "zombie";
    if (kind === "hound") {
      this.drawHoundEnemy(view);
    } else if (!useStoryZombieVisual) {
      this.drawZombieEnemy(view);
    }
    this.setViewPosition(view, x, y);
    view.zIndex = this.getStoryVisualDepth({ x, y }, 20);
    this.world.addChild(view);
    const enemy: EnemyActor = {
      view,
      kind,
      x,
      y,
      health,
      speed,
      contactDamageElapsedMs: 700,
    };
    if (useStoryZombieVisual) {
      this.enemyStoryVisuals.set(
        enemy,
        attachStoryActorVisual(
          view,
          "zombie",
          "run",
          getStoryActorDirection({
            x: (this.player?.x ?? x) - x,
            y: (this.player?.y ?? y + 1) - y,
          }),
        ),
      );
      this.enemyStoryAnimationLocks.set(enemy, createStoryActorAnimationLock());
    }
    this.enemies.push(enemy);
    return enemy;
  }

  private drawZombieEnemy(view: Graphics, hit = false): void {
    const theme = ZOMBIE_ENEMY_THEME;
    view.clear();
    view
      .ellipse(0, 0, 9, 13)
      .fill(hit ? theme.bloodColor : theme.bodyColor)
      .stroke({ color: 0x26321f, alpha: 0.82, width: 1.4 });
    view.circle(11, -1, 6).fill(theme.headColor).stroke({ color: theme.bloodColor, alpha: 0.62, width: 1 });
    view.rect(-10, -12, 5, 18).fill(0x3f5638);
    view.rect(-7, 8, 5, 15).fill(0x3f5638);
    view.rect(4, -14, 5, 19).fill(theme.accentColor);
    view.circle(13, -3, 1.5).fill(0x121510);
    view.circle(12, 2, 1.3).fill(theme.bloodColor);
    view.rect(-4, -7, 8, 3).fill({ color: theme.bloodColor, alpha: 0.72 });
  }

  private flashZombieEnemy(view: Graphics): void {
    this.drawZombieEnemy(view, true);
    window.setTimeout(() => {
      if (view.destroyed) return;
      this.drawZombieEnemy(view);
    }, 80);
  }

  private drawHoundEnemy(view: Graphics, hit = false): void {
    view.clear();
    view
      .ellipse(0, 0, 17, 8)
      .fill(hit ? 0xb4232a : 0x2d2a22)
      .stroke({ color: 0xa7c957, alpha: 0.9, width: 2 })
      .poly([14, -7, 28, -2, 14, 4])
      .fill(0x4a3b2a)
      .circle(25, -3, 1.8)
      .fill(0xfff3b0)
      .rect(-12, -10, 5, 20)
      .fill(0x1a1712)
      .rect(2, -10, 5, 20)
      .fill(0x1a1712);
  }

  private flashEnemy(enemy: EnemyActor): void {
    const storyVisual = this.enemyStoryVisuals.get(enemy);
    if (storyVisual) {
      this.triggerEnemyStoryOneShot(
        enemy,
        "hit",
        this.player
          ? { x: this.player.x - enemy.x, y: this.player.y - enemy.y }
          : { x: 0, y: 1 },
      );
      storyVisual.flash();
      return;
    }
    if (enemy.kind === "hound") {
      this.drawHoundEnemy(enemy.view, true);
      window.setTimeout(() => {
        if (enemy.view.destroyed) return;
        this.drawHoundEnemy(enemy.view);
      }, 80);
      return;
    }
    if (enemy.kind === "zombie") {
      this.flashZombieEnemy(enemy.view);
      return;
    }
    const kind: "bone" | "boneSoldier" = enemy.kind;
    this.drawBoneEnemy(enemy.view, kind, true);
    window.setTimeout(() => {
      if (enemy.view.destroyed) return;
      this.drawBoneEnemy(enemy.view, kind);
    }, 80);
  }

  private findOpenEnemySpawnPosition(): { x: number; y: number } {
    const player = this.player ?? this.getPlayerStart();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const position = getSpawnPositionAroundPlayer(player, this.spawnSeed, {
        width: this.getMapWidth(),
        height: this.getMapHeight(),
      });
      this.spawnSeed += 1;
      if (!this.isStoryMode() || clampPointToUnlockedStoryRegions(player, position, [...this.unlockedStoryRegionIds]) === position) {
        return position;
      }
    }
    return player;
  }

  private fireProjectile(
    target: { x: number; y: number },
    kind: ProjectileKind,
    damage: number,
    speed: number,
    label?: string,
  ): void {
    if (!this.player) return;
    this.updateWeaponAim(target);
    const projectile = createProjectileState(this.player, target, kind, speed, damage);
    const view = new Graphics();
    if (kind === "basic") {
      view
        .roundRect(-20, -2, 40, 4, 2)
        .fill({ color: 0xd9f7ff, alpha: 0.98 })
        .rect(-45, -1.25, 30, 2.5)
        .fill({ color: 0x68e1fd, alpha: 0.42 });
      view.rotation = this.isStoryMode()
        ? projectStoryAngle(this.player, target, this.getStoryProjectionOrigin())
        : Math.atan2(projectile.velocityY, projectile.velocityX);
    } else {
      view.circle(0, 0, projectile.radius).fill(0xff9f1c);
    }
    this.setViewPosition(
      view,
      projectile.x,
      projectile.y,
      this.isStoryMode() ? STORY_2_5D_CONFIG.effectYOffset : 0,
    );
    view.zIndex = this.getStoryVisualDepth(projectile, 40);
    this.world.addChild(view);
    this.bullets.push({ view, x: projectile.x, y: projectile.y, projectile });
    if (kind === "basic") {
      this.animateGunshot();
    }
    this.triggerPlayerStoryOneShot("attack", {
      x: target.x - this.player.x,
      y: target.y - this.player.y,
    });
    this.playShotSound();
    if (label) {
      this.emitState(`${label}: projectile fired.`);
    }
  }

  private spawnHeavyProjectile(
    weapon: AutoWeaponDefinition,
    target: Actor,
    damage: number,
    spreadIndex: number,
  ): void {
    if (!this.player) return;
    const launchAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x) + (spreadIndex - 2) * 0.08;
    const launchPoint = {
      x: this.player.x + Math.cos(launchAngle - 0.5) * 30,
      y: this.player.y + Math.sin(launchAngle - 0.5) * 30,
    };
    const speed = weapon.projectileSpeed;
    const view = new Graphics();
    if (weapon.id === "micro-missiles") {
      view
        .roundRect(-12, -3, 24, 6, 3)
        .fill({ color: 0xf8f4e3, alpha: 0.98 })
        .stroke({ color: 0x68e1fd, alpha: 0.8, width: 1 });
      view.circle(-13, 0, 4).fill({ color: 0xff9f1c, alpha: 0.8 });
    } else {
      view
        .roundRect(-18, -5, 36, 10, 4)
        .fill({ color: 0x39485d, alpha: 0.98 })
        .stroke({ color: 0xfff3b0, alpha: 0.75, width: 1.5 });
      view.poly([18, -6, 30, 0, 18, 6]).fill(0xff9f1c);
      view.circle(-20, 0, 6).fill({ color: 0x68e1fd, alpha: 0.5 });
    }
    this.setViewPosition(
      view,
      launchPoint.x,
      launchPoint.y,
      this.isStoryMode() ? STORY_2_5D_CONFIG.effectYOffset : 0,
    );
    view.zIndex = this.getStoryVisualDepth(launchPoint, 40);
    view.rotation = this.getVisualVelocityAngle(
      launchPoint,
      Math.cos(launchAngle),
      Math.sin(launchAngle),
    );
    this.world.addChild(view);
    this.heavyProjectiles.push({
      view,
      x: launchPoint.x,
      y: launchPoint.y,
      weaponId: weapon.id,
      target,
      targetX: target.x,
      targetY: target.y,
      velocityX: Math.cos(launchAngle) * speed,
      velocityY: Math.sin(launchAngle) * speed,
      radius: weapon.id === "micro-missiles" ? 7 : 12,
      damage,
      blastRadius: weapon.radius,
      lifeMs: weapon.id === "micro-missiles" ? 1800 : 2300,
    });
    this.spawnHitSparks(launchPoint.x, launchPoint.y, 0x68e1fd, 6);
    this.playShotSound();
  }

  private spawnAutoStrike(x: number, y: number, radius: number, damage: number): void {
    const view = new Graphics();
    view
      .circle(0, 0, radius)
      .fill({ color: 0xff1744, alpha: 0.16 })
      .stroke({ color: 0xff4d6d, alpha: 0.92, width: 3 })
      .moveTo(-radius, 0)
      .lineTo(radius, 0)
      .moveTo(0, -radius)
      .lineTo(0, radius)
      .stroke({ color: 0xfff3b0, alpha: 0.72, width: 2 });
    view.position.set(x, y);
    this.world.addChild(view);
    this.autoStrikes.push({ view, x, y, radius, damage, lifeMs: 650, maxLifeMs: 650 });
  }

  private fireLaserBeam(origin: { x: number; y: number }, target: Actor, damage: number, range: number): void {
    const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
    const end = {
      x: origin.x + Math.cos(angle) * range,
      y: origin.y + Math.sin(angle) * range,
    };
    this.drawLaserEffect(origin, end, 0x68e1fd);
    this.damageTargetsAlongLine(origin, end, 24, damage);
    const prismRank = this.state.skillUpgradeRanks["prism-amplifier"] ?? 0;
    if (prismRank > 0) {
      const prismTarget = this.getVisibleCombatTargets(420).find(
        (candidate) => candidate !== target && distance(candidate, target) <= 420,
      );
      if (prismTarget) {
        this.drawLaserEffect(target, prismTarget, 0xb56cff);
        this.damageTargetsAlongLine(target, prismTarget, 20, Math.round(damage * (0.55 + prismRank * 0.12)));
      }
    }
    this.addScreenShake(55, 2.5);
    this.emitState("Focused laser: piercing sweep.");
  }

  private drawLaserEffect(start: { x: number; y: number }, end: { x: number; y: number }, color: number): void {
    const view = new Graphics();
    view
      .moveTo(start.x, start.y)
      .lineTo(end.x, end.y)
      .stroke({ color: 0xd9f7ff, alpha: 0.88, width: 5 })
      .moveTo(start.x, start.y)
      .lineTo(end.x, end.y)
      .stroke({ color, alpha: 0.55, width: 14 });
    this.world.addChild(view);
    this.laserEffects.push({ view, lifeMs: 220, maxLifeMs: 220 });
  }

  private damageTargetsAlongLine(
    start: { x: number; y: number },
    end: { x: number; y: number },
    beamRadius: number,
    damage: number,
  ): void {
    for (const enemy of [...this.enemies]) {
      if (this.getVisibilityZoneId(enemy) !== this.getVisibilityZoneId(start)) continue;
      if (!this.isPointInsideCurrentStoryVision(enemy)) continue;
      if (distancePointToSegment(enemy, start, end) > beamRadius + 11) continue;
      if (enemy.kind === "bone" || enemy.kind === "boneSoldier") {
        this.aggroHospitalKnight();
      }
      this.damageEnemy(enemy, damage, "#9ffcff");
    }
    for (const boss of [...this.bosses]) {
      if (this.getVisibilityZoneId(boss) !== this.getVisibilityZoneId(start)) continue;
      if (!this.isPointInsideCurrentStoryVision(boss)) continue;
      if (distancePointToSegment(boss, start, end) > beamRadius + 34) continue;
      this.damageRoamingBoss(boss, damage, "#9ffcff");
    }
    for (const boss of this.getFinalBosses()) {
      if (!this.isPointInsideCurrentStoryVision(boss)) continue;
      if (distancePointToSegment(boss, start, end) <= beamRadius + 58) {
        this.damageFinalBoss(boss, damage, "direct");
      }
    }
    for (const boss of this.getHospitalKnights()) {
      if (
        this.getVisibilityZoneId(boss) === this.getVisibilityZoneId(start) &&
        this.isPointInsideCurrentStoryVision(boss) &&
        distancePointToSegment(boss, start, end) <= beamRadius + 46
      ) {
        this.damageHospitalKnight(boss, damage);
      }
    }
  }

  private updateCourierRoutes(deltaMs: number): void {
    for (const route of [...this.courierRoutes]) {
      route.lifeMs -= deltaMs;
      route.tickElapsedMs += deltaMs;
      route.view.alpha = Math.max(0, route.lifeMs / COURIER_ROUTE_RESIDUE_LIFE_MS);
      if (this.player && route.tickElapsedMs >= COURIER_ROUTE_RESIDUE_TICK_MS) {
        route.tickElapsedMs = 0;
        if (distancePointToSegment(this.player, route.start, route.end) <= COURIER_ROUTE_RESIDUE_RADIUS) {
          this.playerSlowMs = Math.max(this.playerSlowMs, 900);
          this.applyPlayerDamage(route.damage);
        }
      }
      if (route.lifeMs <= 0) {
        this.removeCourierRoute(route);
      }
    }
  }

  private updateMagicianStageProps(deltaMs: number): void {
    if (!this.player) return;
    const now = performance.now();
    for (const prop of [...this.magicianStageProps]) {
      if (prop.expiresAtMs && now >= prop.expiresAtMs) {
        this.removeMagicianStageProp(prop);
        continue;
      }
      if ((prop.kind === "spotlight" || prop.kind === "mirror") && prop.centerX !== undefined && prop.centerY !== undefined) {
        if (prop.kind === "mirror") {
          prop.centerX = this.player.x;
          prop.centerY = this.player.y;
        }
        const speed = prop.orbitSpeed ?? 0;
        const direction = prop.orbitDirection ?? 1;
        prop.orbitAngle = (prop.orbitAngle ?? 0) + speed * direction * deltaMs / 1000;
        const x = clamp(prop.centerX + Math.cos(prop.orbitAngle) * (prop.orbitRadiusX ?? 220), 24, this.getMapWidth() - 24);
        const y = clamp(prop.centerY + Math.sin(prop.orbitAngle) * (prop.orbitRadiusY ?? 160), 24, this.getMapHeight() - 24);
        this.setActorPosition(prop, x, y);
        prop.view.rotation += direction * 0.018 * deltaMs / 16.67;
      }
      if (prop.kind === "mirror" && prop.storyRemote && !prop.real) {
        const playerDistance = distance(this.player, prop);
        if (playerDistance <= (prop.proximityBurstRadius ?? STORY_MAGICIAN_REMOTE_MIRROR_PROXIMITY_BURST_RADIUS)) {
          this.spawnMagicianMirrorShardBurst(prop.x, prop.y, prop.damage ?? STORY_MAGICIAN_REMOTE_MIRROR_PROJECTILE_DAMAGE);
          this.removeMagicianStageProp(prop);
          continue;
        }
        prop.attackElapsedMs = (prop.attackElapsedMs ?? 0) + deltaMs;
        if (prop.attackElapsedMs >= STORY_MAGICIAN_REMOTE_MIRROR_ATTACK_COOLDOWN_MS) {
          prop.attackElapsedMs = 0;
          const angle = Math.atan2(this.player.y - prop.y, this.player.x - prop.x);
          this.spawnBossHazard(
            prop.x,
            prop.y,
            angle,
            STORY_MAGICIAN_REMOTE_MIRROR_PROJECTILE_SPEED,
            0xd9f7ff,
            1400,
            8,
            "bossProjectile",
            prop.damage ?? STORY_MAGICIAN_REMOTE_MIRROR_PROJECTILE_DAMAGE,
          );
        }
      }
      if (prop.kind === "spotlight" && prop.revealAtMs && now >= prop.revealAtMs) {
        this.drawMagicianSpotlight(prop.view, prop.radius ?? 120, Boolean(prop.real), true);
      }
      if (prop.kind === "curtain" && prop.solid && Math.abs(this.player.x - prop.x) < 28 && Math.abs(this.player.y - prop.y) < (prop.radius ?? 280)) {
        this.playerSlowMs = Math.max(this.playerSlowMs, 240);
        this.applyPlayerDamage(prop.damage ?? 1);
      }
      if (prop.kind === "spotlight" && prop.revealAtMs && now < prop.revealAtMs) {
        continue;
      }
      if (prop.kind === "spotlight" && !prop.real && distance(this.player, prop) <= (prop.radius ?? 92)) {
        this.playerSlowMs = Math.max(this.playerSlowMs, 180);
      }
    }
  }

  private updateStoryMagicianInterference(deltaMs: number): void {
    if (!this.isStoryMode() || !this.player) return;
    if (!this.storyMagicianInterferenceActive && isStoryMagicianInterferencePoint(this.player)) {
      this.storyMagicianInterferenceActive = true;
      this.storyMagicianInterferenceCooldownMs = 0;
      this.emitState("魔术师远程锁定：分身开始干扰路线。");
    }
    if (!this.storyMagicianInterferenceActive) return;

    this.storyMagicianInterferenceCooldownMs -= deltaMs;
    if (this.storyMagicianInterferenceCooldownMs > 0) return;
    this.spawnStoryMagicianInterference();
    this.storyMagicianInterferenceCooldownMs = STORY_MAGICIAN_INTERFERENCE_COOLDOWN_MS;
  }

  private spawnStoryMagicianInterference(): void {
    if (!this.player) return;
    const now = performance.now();
    const angle = this.spawnSeed * 2.399963229728653;

    for (let index = 0; index < STORY_MAGICIAN_REMOTE_MIRROR_COUNT; index += 1) {
      const mirror = new Graphics();
      mirror.alpha = 0.58;
      this.drawBossSprite(mirror, "magician");
      const orbitAngle = angle + index * Math.PI;
      const x = clamp(this.player.x + Math.cos(orbitAngle) * 320, 24, this.getMapWidth() - 24);
      const y = clamp(this.player.y + Math.sin(orbitAngle) * 220, 24, this.getMapHeight() - 24);
      mirror.position.set(x, y);
      this.world.addChild(mirror);
      this.magicianStageProps.push({
        view: mirror,
        kind: "mirror",
        real: false,
        x,
        y,
        centerX: this.player.x,
        centerY: this.player.y,
        orbitAngle,
        orbitRadiusX: 320,
        orbitRadiusY: 220,
        orbitSpeed: 1.5,
        orbitDirection: index === 0 ? 1 : -1,
        radius: 84,
        damage: STORY_MAGICIAN_REMOTE_MIRROR_PROJECTILE_DAMAGE,
        storyRemote: true,
        attackElapsedMs: index * 360,
        proximityBurstRadius: STORY_MAGICIAN_REMOTE_MIRROR_PROXIMITY_BURST_RADIUS,
        expiresAtMs: now + 4200,
      });
    }
    this.spawnSeed += 1;
    this.storyMagicianInterferenceCount += 1;
  }

  private spawnEnergyStrike(x: number, y: number, radius: number, damage: number): void {
    const telegraph = new Graphics();
    telegraph
      .circle(0, 0, radius)
      .fill({ color: 0x68e1fd, alpha: 0.12 })
      .stroke({ color: 0x9ffcff, alpha: 0.92, width: 2 });
    telegraph.position.set(x, y);
    this.world.addChild(telegraph);
    window.setTimeout(() => {
      if (telegraph.destroyed) return;
      this.world.removeChild(telegraph);
      telegraph.destroy();
      this.drawLaserColumn(x, y, radius);
      this.detonateAutoWeapon(x, y, radius, damage, 0x68e1fd);
    }, 420);
  }

  private drawLaserColumn(x: number, y: number, radius: number): void {
    const view = new Graphics();
    view
      .rect(-5, -260, 10, 520)
      .fill({ color: 0xd9f7ff, alpha: 0.75 })
      .rect(-16, -260, 32, 520)
      .fill({ color: 0x68e1fd, alpha: 0.18 })
      .circle(0, 0, radius)
      .stroke({ color: 0xd9f7ff, alpha: 0.72, width: 2 });
    view.position.set(x, y);
    this.world.addChild(view);
    this.laserEffects.push({ view, lifeMs: 260, maxLifeMs: 260 });
  }

  private drawNukeCloud(x: number, y: number, radius: number): void {
    const cloud = new Graphics();
    cloud
      .circle(0, 0, radius * 0.4)
      .fill({ color: 0xfff3b0, alpha: 0.62 })
      .circle(0, -radius * 0.36, radius * 0.22)
      .fill({ color: 0xff9f1c, alpha: 0.58 })
      .rect(-radius * 0.06, -radius * 0.34, radius * 0.12, radius * 0.52)
      .fill({ color: 0xff4d6d, alpha: 0.36 })
      .circle(0, 0, radius)
      .stroke({ color: 0xfff3b0, alpha: 0.5, width: 5 });
    cloud.position.set(x, y);
    this.world.addChild(cloud);
    gsap.to(cloud.scale, { x: 1.7, y: 1.7, duration: 0.5, ease: "power2.out" });
    gsap.to(cloud, {
      alpha: 0,
      duration: 1.25,
      onComplete: () => {
        this.world.removeChild(cloud);
        cloud.destroy();
      },
    });
  }

  private shouldPhaseBlink(): boolean {
    if (!this.player) return false;
    const nearbyEnemies = this.getVisibleCombatTargets(180).length;
    return nearbyEnemies >= 4 || this.state.health <= this.state.maxHealth * 0.42;
  }

  private tryManualPhaseBlink(): boolean {
    if (this.skillSuppressMs > 0) {
      this.emitState("鎶€鑳借鎶戝埗涓細鐩镐綅闂幇澶辨晥");
      return true;
    }
    const skill = ENERGY_SKILL_DEFINITIONS.find((candidate) => candidate.id === "phase-blink");
    if (!skill || !this.player || (this.state.skillUpgradeRanks["phase-blink"] ?? 0) <= 0) return false;
    this.energySkillElapsedMs["phase-blink"] = (this.energySkillElapsedMs["phase-blink"] ?? skill.cooldownMs) + 0;
    if (!isEnergySkillReady(skill, this.energySkillElapsedMs["phase-blink"] ?? 0)) {
      const seconds = Math.ceil((skill.cooldownMs - (this.energySkillElapsedMs["phase-blink"] ?? 0)) / 1000);
      this.emitState(`鐩镐綅闂幇鍐峰嵈涓細${seconds}s`);
      return true;
    }

    const rank = this.state.skillUpgradeRanks["phase-blink"] ?? 1;
    const power = getEnergySkillPower(skill, rank);
    this.phaseBlink(power, skill.radius, skill.range, this.getManualBlinkDirection());
    this.energySkillElapsedMs["phase-blink"] = 0;
    return true;
  }

  private getManualBlinkDirection(): { x: number; y: number } {
    if (!this.player) return this.movementDirection;
    const dx = (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) - (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);
    const dy = (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0) - (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0);
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      return { x: dx / length, y: dy / length };
    }
    const pointerDx = this.pointerWorld.x - this.player.x;
    const pointerDy = this.pointerWorld.y - this.player.y;
    const pointerLength = Math.hypot(pointerDx, pointerDy);
    if (pointerLength > 0) {
      return { x: pointerDx / pointerLength, y: pointerDy / pointerLength };
    }
    return this.movementDirection;
  }

  private phaseBlink(damage: number, radius: number, range: number, direction?: { x: number; y: number }): void {
    if (!this.player) return;
    const blinkDirection = direction ?? {
      x: this.pointerWorld.x - this.player.x || this.movementDirection.x,
      y: this.pointerWorld.y - this.player.y || this.movementDirection.y,
    };
    const angle = Math.atan2(blinkDirection.y, blinkDirection.x);
    const desired = {
      x: clamp(this.player.x + Math.cos(angle) * range, 24, MAP_WIDTH - 24),
      y: clamp(this.player.y + Math.sin(angle) * range, 24, MAP_HEIGHT - 24),
    };
    const resolved = resolveBlockedMovement(this.player, desired, 16, this.getActiveBuildings());
    this.drawPhaseRing(this.player.x, this.player.y, radius);
    this.setActorPosition(this.player, resolved.x, resolved.y);
    this.drawPhaseRing(this.player.x, this.player.y, radius);
    this.detonateAutoWeapon(this.player.x, this.player.y, radius, damage, 0xb56cff);
    this.emitState("Phase blink: escaped by folding space.");
  }

  private temporalRewind(skill: EnergySkillDefinition): boolean {
    if (!this.player) return false;
    const snapshot = [...this.playerHistory].reverse().find((entry) => entry.ageMs >= 2200) ?? this.playerHistory[0];
    if (!snapshot) return false;
    this.drawPhaseRing(this.player.x, this.player.y, skill.radius);
    this.setActorPosition(this.player, snapshot.x, snapshot.y);
    this.drawPhaseRing(this.player.x, this.player.y, skill.radius + 20);
    this.state = {
      ...this.state,
      health: Math.min(this.state.maxHealth, Math.max(this.state.health, snapshot.health) + skill.basePower),
    };
    this.callbacks.onRunState(this.state);
    this.emitState("Time rewind: returned to a safe position.");
    return true;
  }

  private placeWarpMine(radius: number, damage: number): void {
    if (!this.player) return;
    const x = clamp(this.player.x - this.movementDirection.x * 78, 24, MAP_WIDTH - 24);
    const y = clamp(this.player.y - this.movementDirection.y * 78, 24, MAP_HEIGHT - 24);
    const view = new Graphics();
    view
      .circle(0, 0, 14)
      .fill({ color: 0x2b173a, alpha: 0.92 })
      .stroke({ color: 0xb56cff, alpha: 0.9, width: 2 })
      .circle(0, 0, radius)
      .stroke({ color: 0x68e1fd, alpha: 0.18, width: 1 });
    view.position.set(x, y);
    this.world.addChild(view);
    this.warpMines.push({ view, x, y, radius, damage, lifeMs: 9000 });
    this.emitState("Fold mine: deployed behind you.");
  }

  private drawPhaseRing(x: number, y: number, radius: number): void {
    const ring = new Graphics();
    ring.circle(0, 0, radius).stroke({ color: 0xb56cff, alpha: 0.78, width: 3 });
    ring.position.set(x, y);
    this.world.addChild(ring);
    gsap.to(ring.scale, { x: 1.5, y: 1.5, duration: 0.24 });
    gsap.to(ring, {
      alpha: 0,
      duration: 0.28,
      onComplete: () => {
        this.world.removeChild(ring);
        ring.destroy();
      },
    });
  }

  private castSkill(index: number): void {
    if (this.skillSuppressMs > 0) {
      this.emitState("Skills are suppressed.");
      return;
    }
    const skillId = this.state.activeSkillIds[index];
    if (!skillId) {
      this.emitState(`Skill slot ${index + 1} is empty.`);
      return;
    }
    this.state = useRunSkill(this.state, skillId);
    const target = this.getNearestTarget(820) ?? {
      x: (this.player?.x ?? PLAYER_START.x) + 1,
      y: this.player?.y ?? PLAYER_START.y,
    };
    const baseAngle = Math.atan2((this.player?.y ?? PLAYER_START.y) - target.y, (this.player?.x ?? PLAYER_START.x) - target.x) + Math.PI;
    for (const offset of [-0.34, -0.17, 0, 0.17, 0.34]) {
      const angle = baseAngle + offset;
      this.fireProjectile(
        {
          x: (this.player?.x ?? PLAYER_START.x) + Math.cos(angle) * 360,
          y: (this.player?.y ?? PLAYER_START.y) + Math.sin(angle) * 360,
        },
        "skill",
        this.getSkillProjectileDamage(),
        820,
      );
    }
    this.emitState(`Cast skill slot ${index + 1}: fan bullet wave.`);
  }

  private castUltimate(): void {
    if (this.skillSuppressMs > 0) {
      this.emitState("鎶€鑳借鎶戝埗涓細缁堟瀬鎶€鏃犳硶閲婃斁");
      return;
    }
    if (!this.player || !this.state.selectedMechFormId) {
      this.emitState("Ultimate form is not online yet.");
      return;
    }
    const ultimate = getUltimateDefinition(this.state.selectedMechFormId);
    if (this.ultimateElapsedMs < ultimate.cooldownMs) {
      const seconds = Math.ceil((ultimate.cooldownMs - this.ultimateElapsedMs) / 1000);
      this.emitState(`缁堟瀬鎶€鍐峰嵈涓細${seconds}s`);
      return;
    }

    this.ultimateElapsedMs = 0;
    if (ultimate.formId === "laser") {
      this.castLaserUltimate(ultimate);
    } else if (ultimate.formId === "missile") {
      this.castMissileUltimate(ultimate);
    } else {
      this.castBladeUltimate(ultimate);
    }
  }

  private castLaserUltimate(ultimate: UltimateDefinition): void {
    if (!this.player) return;
    const anchors = this.getVisibleCombatTargets(1400).slice(0, 8);
    const targets =
      anchors.length > 0
        ? anchors.map((target) => ({ x: target.x, y: target.y }))
        : Array.from({ length: 6 }, (_, index) => {
            const angle = (Math.PI * 2 * index) / 6;
            return {
              x: clamp(this.player!.x + Math.cos(angle) * 320, 24, MAP_WIDTH - 24),
              y: clamp(this.player!.y + Math.sin(angle) * 320, 24, MAP_HEIGHT - 24),
            };
          });

    targets.forEach((target, index) => {
      window.setTimeout(() => {
        this.drawLaserColumn(target.x, target.y, ultimate.radius);
        this.detonateAutoWeapon(target.x, target.y, ultimate.radius, ultimate.damage, 0x68e1fd);
      }, index * 110);
    });
    this.addScreenShake(280, 7);
    this.emitState(`${ultimate.name}: orbital laser matrix locked.`);
  }

  private castMissileUltimate(ultimate: UltimateDefinition): void {
    if (!this.player) return;
    const anchors = this.getVisibleCombatTargets(1600);
    const center = anchors[0] ?? this.player;
    for (let index = 0; index < 16; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * 360;
      const target = anchors[index % Math.max(anchors.length, 1)] ?? center;
      const x = clamp(target.x + Math.cos(angle) * spread, 24, MAP_WIDTH - 24);
      const y = clamp(target.y + Math.sin(angle) * spread, 24, MAP_HEIGHT - 24);
      window.setTimeout(() => this.spawnEnergyStrike(x, y, ultimate.radius, ultimate.damage), index * 90);
    }
    this.addScreenShake(360, 8);
    this.emitState(`${ultimate.name}: missile bay opened, area saturation incoming.`);
  }

  private castBladeUltimate(ultimate: UltimateDefinition): void {
    if (!this.player) return;
    const start = { x: this.player.x, y: this.player.y };
    const angle = Math.atan2(
      this.pointerWorld.y - this.player.y || this.movementDirection.y,
      this.pointerWorld.x - this.player.x || this.movementDirection.x,
    );
    const desired = {
      x: clamp(this.player.x + Math.cos(angle) * 820, 24, MAP_WIDTH - 24),
      y: clamp(this.player.y + Math.sin(angle) * 820, 24, MAP_HEIGHT - 24),
    };
    const end = resolveBlockedMovement(this.player, desired, 16, this.getActiveBuildings());
    this.drawPhaseRing(start.x, start.y, ultimate.radius * 0.55);
    this.drawLaserEffect(start, end, 0xff4d6d);
    this.damageTargetsAlongLine(start, end, ultimate.radius, ultimate.damage);
    this.setActorPosition(this.player, end.x, end.y);
    this.drawPhaseRing(end.x, end.y, ultimate.radius * 0.7);
    this.detonateAutoWeapon(end.x, end.y, ultimate.radius * 0.55, Math.round(ultimate.damage * 0.75), 0xff4d6d);
    this.addScreenShake(260, 8);
    this.emitState(`${ultimate.name}: heated blade crosses the battlefield.`);
  }

  private castEndgameUltimate(): void {
    if (this.skillSuppressMs > 0) {
      this.emitState("鎶€鑳借鎶戝埗涓細瓒呯骇澶ф嫑鏃犳硶閲婃斁");
      return;
    }
    if (!this.player || !this.state.selectedMechFormId) {
      this.emitState("Endgame ultimate is not unlocked yet.");
      return;
    }
    if (!isEndgameReady(this.state)) {
      this.emitState("Endgame phase has not started yet.");
      return;
    }
    const ultimate = getEndgameUltimateDefinition(this.state.selectedMechFormId);
    if (this.endgameUltimateElapsedMs < ultimate.cooldownMs) {
      const seconds = Math.ceil((ultimate.cooldownMs - this.endgameUltimateElapsedMs) / 1000);
      this.emitState(`瓒呯骇澶ф嫑鍐峰嵈涓細${seconds}s`);
      return;
    }
    this.endgameUltimateElapsedMs = 0;
    if (ultimate.formId === "laser") {
      this.castSkyPillarUltimate(ultimate);
    } else if (ultimate.formId === "missile") {
      this.castNukeUltimate(ultimate);
    } else {
      this.castMechTransformUltimate(ultimate);
    }
  }

  private castSkyPillarUltimate(ultimate: EndgameUltimateDefinition): void {
    if (!this.player) return;
    const targets = this.getVisibleCombatTargets(2400).slice(0, 18);
    const points =
      targets.length > 0
        ? targets.map((target) => ({ x: target.x, y: target.y }))
        : Array.from({ length: 14 }, (_, index) => {
            const angle = (Math.PI * 2 * index) / 14;
            return {
              x: clamp(this.player!.x + Math.cos(angle) * 620, 24, MAP_WIDTH - 24),
              y: clamp(this.player!.y + Math.sin(angle) * 620, 24, MAP_HEIGHT - 24),
            };
          });
    points.forEach((point, index) => {
      window.setTimeout(() => {
        this.drawLaserColumn(point.x, point.y, ultimate.radius);
        this.detonateAutoWeapon(point.x, point.y, ultimate.radius, ultimate.damage, 0xd9f7ff);
      }, index * 80);
    });
    this.addScreenShake(520, 10);
    this.emitState(`${ultimate.name}: sky beams pierce the battlefield.`);
  }

  private castNukeUltimate(ultimate: EndgameUltimateDefinition): void {
    const target = {
      x: clamp(this.pointerWorld.x, 24, MAP_WIDTH - 24),
      y: clamp(this.pointerWorld.y, 24, MAP_HEIGHT - 24),
    };
    const warning = new Graphics();
    warning
      .circle(0, 0, ultimate.radius)
      .fill({ color: 0xff1744, alpha: 0.14 })
      .stroke({ color: 0xfff3b0, alpha: 0.92, width: 4 });
    warning.position.set(target.x, target.y);
    this.world.addChild(warning);
    window.setTimeout(() => {
      if (!warning.destroyed) {
        this.world.removeChild(warning);
        warning.destroy();
      }
      this.detonateAutoWeapon(target.x, target.y, ultimate.radius, ultimate.damage, 0xff9f1c);
      this.drawNukeCloud(target.x, target.y, ultimate.radius);
    }, 650);
    this.addScreenShake(700, 12);
    this.emitState(`${ultimate.name}: nuclear coordinates confirmed.`);
  }

  private castMechTransformUltimate(ultimate: EndgameUltimateDefinition): void {
    if (!this.player) return;
    this.mechTransformMs = 12000;
    if (this.playerStoryVisual) {
      this.playerStoryVisual.flash(0xff4d6d);
    } else {
      this.drawPlayerMech(this.player.view, 0xff4d6d);
    }
    this.drawPhaseRing(this.player.x, this.player.y, ultimate.radius);
    this.detonateAutoWeapon(this.player.x, this.player.y, ultimate.radius, ultimate.damage, 0xff4d6d);
    this.addScreenShake(420, 9);
    this.emitState(`${ultimate.name}: assault armor deployed for close suppression.`);
  }

  private hitEnemyWithBullet(bullet: BulletActor): boolean {
    for (const enemy of [...this.enemies]) {
      if (!this.isSameVisibilityZone(bullet, enemy)) continue;
      if (!this.isPointInsideCurrentStoryVision(enemy)) continue;
      if (!projectileHitsCircle(bullet.projectile, { x: enemy.x, y: enemy.y, radius: 11 })) continue;
      if (enemy.kind === "bone" || enemy.kind === "boneSoldier") {
        this.aggroHospitalKnight();
      }
      this.spawnHitSparks(enemy.x, enemy.y, 0x68e1fd, 5);
      this.damageEnemy(enemy, bullet.projectile.damage, "#ffe066");
      return true;
    }
    return false;
  }

  private hitInfusionStandWithBullet(bullet: BulletActor): boolean {
    for (const stand of [...this.infusionStands]) {
      if (!projectileHitsCircle(bullet.projectile, { x: stand.x, y: stand.y, radius: stand.radius })) continue;
      stand.health -= bullet.projectile.damage;
      this.showDamageNumber(stand.x, stand.y - 28, bullet.projectile.damage, "#a7c957");
      this.spawnHitSparks(stand.x, stand.y, 0xa7c957, 8);
      if (stand.health <= 0) {
        this.removeInfusionStand(stand);
      }
      return true;
    }
    return false;
  }

  private hitTeslaDeviceWithBullet(bullet: BulletActor): boolean {
    for (const device of [...this.teslaDevices]) {
      if (!projectileHitsCircle(bullet.projectile, { x: device.x, y: device.y, radius: device.radius })) continue;
      device.health -= bullet.projectile.damage;
      this.showDamageNumber(device.x, device.y - 30, bullet.projectile.damage, "#68e1fd");
      this.spawnHitSparks(device.x, device.y, 0x68e1fd, 8);
      if (device.health <= 0) {
        this.removeTeslaDevice(device);
      }
      return true;
    }
    return false;
  }

  private hitConvoyVehicleWithBullet(bullet: BulletActor): boolean {
    for (const vehicle of [...this.convoyVehicles]) {
      if (!projectileHitsCircle(bullet.projectile, { x: vehicle.x, y: vehicle.y, radius: vehicle.radius })) continue;
      vehicle.health -= bullet.projectile.damage;
      this.showDamageNumber(vehicle.x, vehicle.y - 32, bullet.projectile.damage, "#ff9f1c");
      this.spawnHitSparks(vehicle.x, vehicle.y, vehicle.kind === "escort" ? 0xffd166 : 0xff9f1c, 8);
      if (vehicle.health <= 0) {
        this.detonateConvoyVehicle(vehicle);
      }
      return true;
    }
    return false;
  }

  private hitMagicianStagePropWithBullet(bullet: BulletActor): boolean {
    for (const prop of [...this.magicianStageProps]) {
      if (prop.kind !== "hat" && prop.kind !== "mirror") continue;
      if (!projectileHitsCircle(bullet.projectile, { x: prop.x, y: prop.y, radius: prop.radius ?? 30 })) continue;
      if (prop.real) {
        for (const fakeMirror of this.magicianStageProps.filter((candidate) => candidate.kind === "mirror" && !candidate.real)) {
          this.spawnMagicianMirrorShardBurst(fakeMirror.x, fakeMirror.y, fakeMirror.damage ?? 8);
        }
        this.removeMagicianStageProps();
        this.startMagicianCurtainCall(prop.x, prop.y, this.magicianFinaleInProgress ? "finale-revealed" : "revealed");
        this.showDamageNumber(prop.x, prop.y - 34, 0, "#fff3b0", "REVEAL ");
        this.spawnHitSparks(prop.x, prop.y, 0xfff3b0, 18);
      } else {
        if (prop.kind === "mirror") {
          this.spawnMagicianMirrorShardBurst(prop.x, prop.y, prop.damage ?? 8);
        }
        this.spawnDelayedBossBlast(prop.x, prop.y, 82, prop.damage ?? 12, 80, 0x9d4edd, "鍋囪薄纰庤");
        this.showDamageNumber(prop.x, prop.y - 28, 0, "#9d4edd", "FAKE ");
        this.spawnHitSparks(prop.x, prop.y, 0x9d4edd, 10);
        this.removeMagicianStageProp(prop);
      }
      return true;
    }
    return false;
  }

  private hitBossWithBullet(bullet: BulletActor): boolean {
    for (const boss of [...this.bosses]) {
      if (!this.isSameVisibilityZone(bullet, boss)) continue;
      if (!this.isPointInsideCurrentStoryVision(boss)) continue;
      if (!projectileHitsCircle(bullet.projectile, { x: boss.x, y: boss.y, radius: 34 })) continue;
      if (this.shouldChefBlockBullet(boss, bullet)) {
        this.showDamageNumber(boss.x, boss.y - 46, 0, "#68e1fd", "IMM ");
        this.spawnHitSparks(
          boss.x + Math.cos(boss.view.rotation) * (CHEF_WOK_MODEL_RADIUS + 16),
          boss.y + Math.sin(boss.view.rotation) * (CHEF_WOK_MODEL_RADIUS + 16),
          0xc8d5d9,
          10,
        );
        this.addScreenShake(40, 2.4);
        return true;
      }
      this.spawnHitSparks(boss.x, boss.y, 0xfff3b0, 9);
      this.addScreenShake(55, 3.2);
      this.damageRoamingBoss(boss, bullet.projectile.damage, "#ff9f1c");
      return true;
    }
    return false;
  }

  private hitFinalBossWithBullet(bullet: BulletActor): boolean {
    for (const boss of this.getFinalBosses()) {
      if (!this.isPointInsideCurrentStoryVision(boss)) continue;
      if (!projectileHitsCircle(bullet.projectile, { x: boss.x, y: boss.y, radius: 58 })) continue;
      this.damageFinalBoss(boss, bullet.projectile.damage, "direct");
      this.spawnHitSparks(boss.x, boss.y, 0xff4d6d, 12);
      this.addScreenShake(80, 3.8);
      return true;
    }
    return false;
  }

  private hitHospitalKnightWithBullet(bullet: BulletActor): boolean {
    for (const boss of this.getHospitalKnights()) {
      if (!this.isSameVisibilityZone(bullet, boss)) continue;
      if (!this.isPointInsideCurrentStoryVision(boss)) continue;
      if (!projectileHitsCircle(bullet.projectile, { x: boss.x, y: boss.y, radius: 46 })) continue;
      this.aggroHospitalKnight(boss);
      this.damageHospitalKnight(boss, bullet.projectile.damage);
      this.spawnHitSparks(boss.x, boss.y, 0xd9f7ff, 10);
      this.addScreenShake(70, 3.4);
      return true;
    }
    return false;
  }

  private damageEnemy(enemy: EnemyActor, amount: number, color: string): void {
    if ((enemy.invulnerableMs ?? 0) > 0) {
      this.showDamageNumber(enemy.x, enemy.y - 24, 0, "#68e1fd", "IMM ");
      this.spawnHitSparks(enemy.x, enemy.y, 0x68e1fd, 4);
      return;
    }
    const damage = Math.max(0, Math.round(amount));
    enemy.health -= damage;
    this.showDamageNumber(enemy.x, enemy.y - 24, damage, color);
    if (enemy.health <= 0) {
      this.defeatEnemy(enemy);
      return;
    }
    this.flashEnemy(enemy);
  }

  private damageRoamingBoss(boss: BossActor, amount: number, color: string): void {
    if (this.isRoamingBossInvulnerable(boss)) {
      this.showDamageNumber(boss.x, boss.y - 46, 0, "#68e1fd", "IMM ");
      this.spawnHitSparks(boss.x, boss.y, 0x68e1fd, 6);
      return;
    }
    const damage = Math.max(0, Math.round(amount));
    boss.health = Math.max(0, boss.health - damage);
    this.showDamageNumber(boss.x, boss.y - 46, damage, color);
    gsap.fromTo(boss.view.scale, { x: 1.16, y: 1.16 }, { x: 1, y: 1, duration: 0.14 });
    if (boss.health <= 0) {
      this.defeatBoss(boss);
    }
  }

  private isRoamingBossInvulnerable(boss: BossActor): boolean {
    return boss.bossId === "magician" && performance.now() > this.magicianCurtainCallUntilMs;
  }

  private shouldChefBlockBullet(boss: BossActor, bullet: BulletActor): boolean {
    if (boss.bossId !== "chef") return false;
    const incomingAngle = Math.atan2(bullet.y - boss.y, bullet.x - boss.x);
    return shouldChefBlockBasicAttack({
      chefRotation: boss.view.rotation,
      incomingAngle,
      isBasicAttack: bullet.projectile.kind === "basic",
      isBusy: this.isChefBusy(boss),
    });
  }

  private isChefBusy(boss: BossActor): boolean {
    return boss.mode === "windup" || boss.mode === "charge" || Boolean(boss.chefAirborne) || (boss.chefMeatGrinderMs ?? 0) > 0;
  }

  private damageFinalBoss(boss: FinalBossActor, amount: number, kind: "direct" | "explosive" = "direct"): void {
    if (boss.phase === 2 && FINAL_BOSS_PHASE_TWO_SKILL.onlyExplosiveDamage && kind !== "explosive") {
      this.showDamageNumber(boss.x, boss.y - 64, 0, "#68e1fd", "IMM ");
      this.spawnHitSparks(boss.x, boss.y, 0x68e1fd, 8);
      return;
    }
    const damage = Math.max(0, Math.round(amount));
    boss.health = Math.max(0, boss.health - damage);
    this.showDamageNumber(boss.x, boss.y - 64, damage, "#ff4d6d");
    gsap.fromTo(boss.view.scale, { x: 1.1, y: 1.1 }, { x: 1, y: 1, duration: 0.12 });
    if (boss.health <= 0) {
      this.defeatFinalBoss(boss);
    }
  }

  private damageHospitalKnight(boss: HospitalKnightActor, amount: number): void {
    this.aggroHospitalKnight(boss);
    const soldiers = this.getActiveBoneSoldierCount();
    if (!isHospitalKnightDamageable(boss.phase, soldiers)) {
      this.showDamageNumber(boss.x, boss.y - 64, 0, "#d9f7ff", "IMM ");
      this.spawnHitSparks(boss.x, boss.y, 0x68e1fd, 7);
      return;
    }
    const damage = Math.max(0, Math.round(amount));
    boss.health = Math.max(0, boss.health - damage);
    this.showDamageNumber(boss.x, boss.y - 64, damage, "#d9f7ff");
    gsap.fromTo(boss.view.scale, { x: 1.12, y: 1.12 }, { x: 1, y: 1, duration: 0.12 });
    if (boss.health <= 0) {
      this.defeatHospitalKnight(boss);
    }
  }

  private spawnStoryEnemyDeathVisual(enemy: EnemyActor): void {
    const storyVisual = this.enemyStoryVisuals.get(enemy);
    if (!storyVisual || storyVisual.character !== "zombie") return;
    const direction = storyVisual.direction;
    const view = new Graphics();
    this.setViewPosition(view, enemy.x, enemy.y);
    view.zIndex = this.getStoryVisualDepth(enemy, 18);
    this.world.addChild(view);
    const visual = attachStoryActorVisual(view, "zombie", "death", direction);
    this.storyDeathVisuals.push({
      view,
      visual,
      x: enemy.x,
      y: enemy.y,
      lifeMs: this.getStoryAnimationDurationMs(visual, "death", direction) + 140,
    });
  }

  private defeatHospitalKnight(boss: HospitalKnightActor): void {
    this.world.removeChild(boss.view);
    this.world.removeChild(boss.label);
    boss.view.destroy();
    boss.label.destroy();
    if (this.hospitalKnight === boss) {
      this.hospitalKnight = undefined;
    } else {
      this.extraHospitalKnights = this.extraHospitalKnights.filter((candidate) => candidate !== boss);
    }
    this.addScreenShake(520, 10);
    this.emitState("Hospital knight defeated. The ruined hospital falls silent.");
    this.completeBossRushIfCleared();
  }

  private removeFinalBossActor(boss: FinalBossActor): void {
    if (!boss.view.destroyed) {
      this.world.removeChild(boss.view);
      boss.view.destroy();
    }
    if (!boss.label.destroyed) {
      this.world.removeChild(boss.label);
      boss.label.destroy();
    }
    if (this.finalBoss === boss) {
      this.finalBoss = undefined;
    } else {
      this.extraFinalBosses = this.extraFinalBosses.filter((candidate) => candidate !== boss);
    }
  }

  private defeatFinalBoss(boss: FinalBossActor): void {
    const outcome = getWarCoreDefeatOutcome({
      phase: boss.phase,
      armoryActive: this.warCoreArmoryActive,
      collapseMs: this.warCoreCollapseMs,
    });
    this.removeFinalBossActor(boss);
    if (outcome === "start-collapse") {
      this.startWarCoreCollapse();
      return;
    }
    if (this.isBossRushMode()) {
      this.addScreenShake(800, 12);
      this.emitState("Boss Rush: war core destroyed.");
      this.completeBossRushIfCleared();
      return;
    }
    this.gameOver = true;
    this.addScreenShake(800, 12);
    this.emitState("Mission complete: final Boss defeated.");
    this.callbacks.onRunState(this.state);
    this.callbacks.onMissionSuccess(this.state);
  }

  private defeatEnemy(enemy: EnemyActor): void {
    if (enemy.kind === "bone" || enemy.kind === "boneSoldier") {
      this.spawnBonePile(enemy.x, enemy.y);
    }
    this.spawnStoryEnemyDeathVisual(enemy);
    this.destroyEnemyStoryVisual(enemy);
    if (enemy.plaguePatient) {
      this.spawnToxicCloud(enemy.x, enemy.y, 74, 5, 3600);
    }
    this.world.removeChild(enemy.view);
    enemy.view.destroy();
    this.enemies = this.enemies.filter((candidate) => candidate !== enemy);
    this.state = recordRunEnemyKill(gainRunExperience(this.state, 6));
    if (this.state.pendingSkillChoiceIds.length > 0) {
      this.emitState("Kill charge full. Choose one mech upgrade.");
    } else {
      this.callbacks.onRunState(this.state);
    }
  }

  private updateAutoWeapons(deltaMs: number): void {
    if (!this.player) return;
    if (this.skillSuppressMs > 0) return;
    for (const weapon of getActiveAutoWeapons(this.state.skillUpgradeRanks)) {
      this.autoWeaponElapsedMs[weapon.id] = (this.autoWeaponElapsedMs[weapon.id] ?? weapon.cooldownMs * 0.55) + deltaMs;
      if (!isAutoWeaponReady(weapon, this.autoWeaponElapsedMs[weapon.id] ?? 0)) continue;
      if (this.fireAutoWeapon(weapon)) {
        this.autoWeaponElapsedMs[weapon.id] = 0;
      }
    }
  }

  private updateEnergySkills(deltaMs: number): void {
    if (!this.player) return;
    if (this.skillSuppressMs > 0) return;
    this.energySkillElapsedMs = advanceEnergySkillCooldowns(
      this.energySkillElapsedMs,
      getManualEnergySkills(this.state.skillUpgradeRanks),
      deltaMs,
    );
    for (const skill of getAutoEnergySkills(this.state.skillUpgradeRanks)) {
      if (skill.mode === "passive") continue;
      this.energySkillElapsedMs[skill.id] = (this.energySkillElapsedMs[skill.id] ?? skill.cooldownMs * 0.7) + deltaMs;
      if (!isEnergySkillReady(skill, this.energySkillElapsedMs[skill.id] ?? 0)) continue;
      if (this.fireEnergySkill(skill)) {
        this.energySkillElapsedMs[skill.id] = 0;
      }
    }
  }

  private fireEnergySkill(skill: EnergySkillDefinition): boolean {
    const rank = this.state.skillUpgradeRanks[skill.id] ?? 0;
    const power = getEnergySkillPower(skill, rank);
    if (skill.mode === "beam") {
      const target = this.getNearestEnergyTarget(skill.range);
      if (!target || !this.player) return false;
      this.fireLaserBeam(this.player, target, power, skill.range);
      return true;
    }
    if (skill.mode === "rain") {
      const targets = this.getVisibleCombatTargets(skill.range).slice(0, skill.burstCount);
      if (targets.length === 0) return false;
      targets.forEach((target, index) => {
        window.setTimeout(() => this.spawnEnergyStrike(target.x, target.y, skill.radius, power), index * 120);
      });
      this.emitState(`${skill.name}: orbital calibration.`);
      return true;
    }
    if (skill.mode === "blink") {
      if (!this.shouldPhaseBlink()) return false;
      this.phaseBlink(power, skill.radius, skill.range);
      return true;
    }
    if (skill.mode === "rewind") {
      if (this.state.health > this.state.maxHealth * 0.35) return false;
      return this.temporalRewind(skill);
    }
    if (skill.mode === "mine") {
      this.placeWarpMine(skill.radius, power);
      return true;
    }
    return false;
  }

  private getNearestEnergyTarget(range: number): Actor | undefined {
    if (!this.player) return undefined;
    return this.getVisibleCombatTargets(range).sort(
      (a, b) => distance(this.player!, a) - distance(this.player!, b),
    )[0];
  }

  private fireAutoWeapon(weapon: AutoWeaponDefinition): boolean {
    const rank = this.state.skillUpgradeRanks[weapon.id] ?? 0;
    const damage = getAutoWeaponDamage(weapon, rank);
    if (weapon.id === "orbital-flak") {
      const target = this.getAutoWeaponTarget(weapon);
      if (!target) return false;
      this.spawnAutoStrike(target.x, target.y, weapon.radius, damage);
      this.emitState(`${weapon.name}: target locked.`);
      return true;
    }

    if (weapon.id === "micro-missiles") {
      const targets = this.getAutoWeaponTargets(weapon, weapon.burstCount);
      if (targets.length === 0) return false;
      targets.forEach((target, index) => {
        window.setTimeout(() => {
          if (!this.player || this.gameOver) return;
          this.spawnHeavyProjectile(weapon, target, damage, index);
        }, index * 90);
      });
      this.emitState(`${weapon.name}: swarm launched.`);
      return true;
    }

    const target = this.getAutoWeaponTarget(weapon);
    if (!target) return false;
    this.spawnHeavyProjectile(weapon, target, damage, 0);
    this.emitState(`${weapon.name}: missile launched.`);
    return true;
  }

  private defeatBoss(boss: BossActor): void {
    if (boss.chefMeatGrinderView && !boss.chefMeatGrinderView.destroyed) {
      this.world.removeChild(boss.chefMeatGrinderView);
      boss.chefMeatGrinderView.destroy();
    }
    this.world.removeChild(boss.view, boss.label);
    boss.view.destroy();
    boss.label.destroy();
    this.bosses = this.bosses.filter((candidate) => candidate !== boss);
    this.state = killRunBoss(this.state, boss.bossId);
    this.emitState(`Boss defeated: ${this.getBossName(boss.bossId)}`);
    this.completeBossRushIfCleared();
  }

  private completeBossRushIfCleared(): void {
    if (!this.isBossRushMode() || this.gameOver) return;
    if (this.bosses.length > 0 || this.getFinalBosses().length > 0 || this.getHospitalKnights().length > 0) return;
    this.gameOver = true;
    this.callbacks.onRunState(this.state);
    this.callbacks.onMissionSuccess(this.state);
  }

  private showSkillChoiceOverlay(): void {
    if (this.skillChoiceOverlay) return;

    const overlay = new Container();
    overlay.zIndex = 1000;
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    const backdrop = new Graphics();
    backdrop.rect(0, 0, width, height).fill({ color: 0x050807, alpha: 0.78 });
    overlay.addChild(backdrop);

    const panelWidth = Math.min(760, width - 48);
    const panelHeight = 360;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;
    const panel = new Graphics();
    panel
      .roundRect(panelX, panelY, panelWidth, panelHeight, 8)
      .fill({ color: 0x141b1b, alpha: 0.96 })
      .stroke({ color: 0x68e1fd, alpha: 0.8, width: 2 });
    overlay.addChild(panel);

    const title = new Text({
      text: "选择机甲强化",
      style: new TextStyle({
        fill: "#f8f4e3",
        fontFamily: "Arial",
        fontSize: 28,
        fontWeight: "700",
      }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(width / 2, panelY + 28);
    overlay.addChild(title);

    const subtitle = new Text({
      text: "击杀充能已满。点击选项或按 1-3 继续。",
      style: new TextStyle({ fill: "#b9c7a7", fontFamily: "Arial", fontSize: 15 }),
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(width / 2, panelY + 68);
    overlay.addChild(subtitle);

    const choices = this.state.pendingSkillChoiceIds
      .map((id) => SKILL_UPGRADES.find((upgrade) => upgrade.id === id))
      .filter((upgrade): upgrade is NonNullable<typeof upgrade> => Boolean(upgrade));
    const cardWidth = (panelWidth - 80) / 3;
    for (const [index, choice] of choices.entries()) {
      const x = panelX + 28 + index * (cardWidth + 12);
      const y = panelY + 122;
      const rank = this.state.skillUpgradeRanks[choice.id] ?? 0;
      const card = new Container();
      card.eventMode = "static";
      card.cursor = "pointer";
      card.on("pointertap", () => this.chooseSkillUpgrade(choice.id));

      const shape = new Graphics();
      shape
        .roundRect(x, y, cardWidth, 190, 6)
        .fill({ color: 0x243136, alpha: 0.96 })
        .stroke({ color: 0xfff3b0, alpha: 0.58, width: 1.5 });
      card.addChild(shape);

      const number = new Text({
        text: `${index + 1}`,
        style: new TextStyle({ fill: "#68e1fd", fontFamily: "Arial", fontSize: 20, fontWeight: "700" }),
      });
      number.position.set(x + 16, y + 14);
      card.addChild(number);

      const name = new Text({
        text: choice.name,
        style: new TextStyle({ fill: "#ffffff", fontFamily: "Arial", fontSize: 20, fontWeight: "700" }),
      });
      name.position.set(x + 48, y + 14);
      card.addChild(name);

      const rankText = new Text({
        text: `Lv ${rank} -> ${rank + 1}`,
        style: new TextStyle({ fill: "#ffcf66", fontFamily: "Arial", fontSize: 14 }),
      });
      rankText.position.set(x + 18, y + 58);
      card.addChild(rankText);

      const description = new Text({
        text: choice.description,
        style: new TextStyle({
          fill: "#d6dfd1",
          fontFamily: "Arial",
          fontSize: 15,
          wordWrap: true,
          wordWrapWidth: cardWidth - 36,
        }),
      });
      description.position.set(x + 18, y + 90);
      card.addChild(description);

      overlay.addChild(card);
    }

    this.skillChoiceOverlay = overlay;
    this.app.stage.addChild(overlay);
  }

  private clearSkillChoiceOverlay(): void {
    if (!this.skillChoiceOverlay) return;
    this.app.stage.removeChild(this.skillChoiceOverlay);
    this.skillChoiceOverlay.destroy({ children: true });
    this.skillChoiceOverlay = undefined;
  }

  private chooseSkillUpgrade(upgradeId: string): void {
    const definition = SKILL_UPGRADES.find((upgrade) => upgrade.id === upgradeId);
    this.state = chooseRunSkillUpgrade(this.state, upgradeId);
    if (this.player && !this.playerStoryVisual) {
      this.drawPlayerMech(this.player.view);
    }
    this.clearSkillChoiceOverlay();
    this.emitState(`Upgrade selected: ${definition?.name ?? upgradeId}`);
  }

  private showFormChoiceOverlay(): void {
    if (this.formChoiceOverlay) return;
    const overlay = new Container();
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    const backdrop = new Graphics();
    backdrop.rect(0, 0, width, height).fill({ color: 0x030407, alpha: 0.84 });
    overlay.addChild(backdrop);

    const panelWidth = Math.min(800, width - 48);
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - 380) / 2;
    const panel = new Graphics();
    panel
      .roundRect(panelX, panelY, panelWidth, 380, 8)
      .fill({ color: 0x111827, alpha: 0.97 })
      .stroke({ color: 0xfff3b0, alpha: 0.88, width: 2 });
    overlay.addChild(panel);

    const title = new Text({
      text: "选择最终机甲形态",
      style: new TextStyle({ fill: "#fff3b0", fontFamily: "Arial", fontSize: 30, fontWeight: "700" }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(width / 2, panelY + 26);
    overlay.addChild(title);

    const subtitle = new Text({
      text: "Lv50 形态核心已上线。点击选项或按 1-3，按 R 释放终极技。",
      style: new TextStyle({ fill: "#d6dfd1", fontFamily: "Arial", fontSize: 15 }),
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(width / 2, panelY + 70);
    overlay.addChild(subtitle);

    const cardWidth = (panelWidth - 80) / 3;
    for (const [index, formId] of this.state.pendingMechFormIds.entries()) {
      const ultimate = getUltimateDefinition(formId);
      const x = panelX + 28 + index * (cardWidth + 12);
      const y = panelY + 122;
      const card = new Container();
      card.eventMode = "static";
      card.cursor = "pointer";
      card.on("pointertap", () => this.chooseMechForm(formId));
      const color = formId === "laser" ? 0x68e1fd : formId === "missile" ? 0xff9f1c : 0xff4d6d;
      const shape = new Graphics();
      shape
        .roundRect(x, y, cardWidth, 210, 6)
        .fill({ color: 0x1d2733, alpha: 0.96 })
        .stroke({ color, alpha: 0.9, width: 2 });
      card.addChild(shape);
      const name = new Text({
        text: `${index + 1}. ${this.getMechFormName(formId)}`,
        style: new TextStyle({ fill: "#ffffff", fontFamily: "Arial", fontSize: 21, fontWeight: "700" }),
      });
      name.position.set(x + 18, y + 18);
      card.addChild(name);
      const ult = new Text({
        text: ultimate.name,
        style: new TextStyle({ fill: "#fff3b0", fontFamily: "Arial", fontSize: 17, fontWeight: "700" }),
      });
      ult.position.set(x + 18, y + 62);
      card.addChild(ult);
      const desc = new Text({
        text: this.getMechFormDescription(formId),
        style: new TextStyle({ fill: "#d6dfd1", fontFamily: "Arial", fontSize: 15, wordWrap: true, wordWrapWidth: cardWidth - 36 }),
      });
      desc.position.set(x + 18, y + 102);
      card.addChild(desc);
      overlay.addChild(card);
    }

    this.formChoiceOverlay = overlay;
    this.app.stage.addChild(overlay);
  }

  private clearFormChoiceOverlay(): void {
    if (!this.formChoiceOverlay) return;
    this.app.stage.removeChild(this.formChoiceOverlay);
    this.formChoiceOverlay.destroy({ children: true });
    this.formChoiceOverlay = undefined;
  }

  private chooseMechForm(formId: NonNullable<RunState["selectedMechFormId"]>): void {
    this.state = chooseRunMechForm(this.state, formId);
    this.ultimateElapsedMs = 999999;
    if (this.player && !this.playerStoryVisual) {
      this.drawPlayerMech(this.player.view);
    }
    this.clearFormChoiceOverlay();
    this.emitState(`Final form: ${this.getMechFormName(formId)}, ultimate ${getUltimateDefinition(formId).name}`);
  }

  private getMechFormName(formId: NonNullable<RunState["selectedMechFormId"]>): string {
    if (formId === "laser") return "激光形态";
    if (formId === "missile") return "导弹形态";
    return "大刀形态";
  }

  private getMechFormDescription(formId: NonNullable<RunState["selectedMechFormId"]>): string {
    if (formId === "laser") {
      return "强化持续激光、折射链和轨道锁定。终极技召唤多道天基审判光束。";
    }
    if (formId === "missile") {
      return "强化爆炸、导弹舱和大口径覆盖。终极技对目标区域进行饱和打击。";
    }
    return "强化冲锋、回溯和近战压迫。终极技冲向目标并连续斩击。";
  }

  private detonateAutoWeapon(x: number, y: number, radius: number, damage: number, color = 0xff9f1c): void {
    this.spawnHitSparks(x, y, color, 16);
    this.addScreenShake(120, 6);
    const blast = new Graphics();
    blast.circle(0, 0, radius).fill({ color, alpha: 0.2 }).stroke({ color: 0xfff3b0, alpha: 0.65, width: 2 });
    blast.position.set(x, y);
    this.world.addChild(blast);
    gsap.to(blast, {
      alpha: 0,
      duration: 0.28,
      onComplete: () => {
        this.world.removeChild(blast);
        blast.destroy();
      },
    });

    for (const enemy of [...this.enemies]) {
      if (this.getVisibilityZoneId(enemy) !== this.getVisibilityZoneId({ x, y })) continue;
      if (!this.isPointInsideCurrentStoryVision(enemy)) continue;
      if (distance(enemy, { x, y }) > radius + 11) continue;
      if (enemy.kind === "bone" || enemy.kind === "boneSoldier") {
        this.aggroHospitalKnight();
      }
      this.damageEnemy(enemy, damage, "#ffe066");
    }

    for (const boss of [...this.bosses]) {
      if (this.getVisibilityZoneId(boss) !== this.getVisibilityZoneId({ x, y })) continue;
      if (!this.isPointInsideCurrentStoryVision(boss)) continue;
      if (distance(boss, { x, y }) > radius + 34) continue;
      this.damageRoamingBoss(boss, damage, "#ff9f1c");
    }

    for (const boss of this.getFinalBosses()) {
      if (!this.isPointInsideCurrentStoryVision(boss)) continue;
      if (distance(boss, { x, y }) <= radius + 58) {
        this.damageFinalBoss(boss, damage, "explosive");
      }
    }

    for (const boss of this.getHospitalKnights()) {
      if (
        this.getVisibilityZoneId(boss) === this.getVisibilityZoneId({ x, y }) &&
        this.isPointInsideCurrentStoryVision(boss) &&
        distance(boss, { x, y }) <= radius + 46
      ) {
        this.damageHospitalKnight(boss, damage);
      }
    }
  }

  private removeHeavyProjectile(projectile: HeavyProjectileActor): void {
    this.world.removeChild(projectile.view);
    projectile.view.destroy();
    this.heavyProjectiles = this.heavyProjectiles.filter((candidate) => candidate !== projectile);
  }

  private removeAutoStrike(strike: AutoStrikeActor): void {
    this.world.removeChild(strike.view);
    strike.view.destroy();
    this.autoStrikes = this.autoStrikes.filter((candidate) => candidate !== strike);
  }

  private removeWarpMine(mine: WarpMineActor): void {
    this.world.removeChild(mine.view);
    mine.view.destroy();
    this.warpMines = this.warpMines.filter((candidate) => candidate !== mine);
  }

  private removeBullet(bullet: BulletActor): void {
    this.world.removeChild(bullet.view);
    bullet.view.destroy();
    this.bullets = this.bullets.filter((candidate) => candidate !== bullet);
  }

  private removeBossHazard(hazard: HazardActor): void {
    this.world.removeChild(hazard.view);
    hazard.view.destroy();
    this.bossHazards = this.bossHazards.filter((candidate) => candidate !== hazard);
  }

  private removeInfusionStand(stand: InfusionStandActor): void {
    if (!stand.view.destroyed) {
      this.world.removeChild(stand.view);
      stand.view.destroy();
    }
    this.infusionStands = this.infusionStands.filter((candidate) => candidate !== stand);
    this.spawnHitSparks(stand.x, stand.y, 0xa7c957, 10);
  }

  private removeTeslaDevice(device: TeslaDeviceActor): void {
    if (!device.view.destroyed) {
      this.world.removeChild(device.view);
      device.view.destroy();
    }
    this.teslaDevices = this.teslaDevices.filter((candidate) => candidate !== device);
    for (const grid of [...this.teslaGrids]) {
      if (grid.start === device || grid.end === device) {
        this.removeTeslaGrid(grid);
      }
    }
    this.spawnHitSparks(device.x, device.y, 0x68e1fd, 12);
  }

  private removeTeslaGrid(grid: TeslaGridActor): void {
    if (!grid.view.destroyed) {
      this.world.removeChild(grid.view);
      grid.view.destroy();
    }
    this.teslaGrids = this.teslaGrids.filter((candidate) => candidate !== grid);
  }

  private detonateConvoyVehicle(vehicle: ConvoyVehicleActor): void {
    if (!this.convoyVehicles.includes(vehicle)) return;
    this.convoyVehicles = this.convoyVehicles.filter((candidate) => candidate !== vehicle);
    if (!vehicle.view.destroyed) {
      this.world.removeChild(vehicle.view);
      vehicle.view.destroy();
    }
    const blastRadius = vehicle.kind === "ammo" ? 190 : 105;
    this.spawnDelayedBossBlast(vehicle.x, vehicle.y, blastRadius, vehicle.damage, 80, 0xff9f1c, vehicle.kind === "ammo" ? "ammo blast" : "escort wreck");
    this.spawnHitSparks(vehicle.x, vehicle.y, vehicle.kind === "ammo" ? 0xff9f1c : 0xffd166, 18);
  }

  private removeCourierRoute(route: CourierRouteActor): void {
    this.world.removeChild(route.view);
    route.view.destroy();
    this.courierRoutes = this.courierRoutes.filter((candidate) => candidate !== route);
  }

  private removeMagicianStageProp(prop: MagicianStagePropActor): void {
    if (!prop.view.destroyed) {
      this.world.removeChild(prop.view);
      prop.view.destroy();
    }
    this.magicianStageProps = this.magicianStageProps.filter((candidate) => candidate !== prop);
  }

  private removeMagicianStageProps(): void {
    for (const prop of [...this.magicianStageProps]) {
      this.removeMagicianStageProp(prop);
    }
  }

  private getNearestTarget(maxDistance: number): { x: number; y: number } | undefined {
    if (!this.player) return undefined;
    let nearest: { x: number; y: number; distance: number } | undefined;
    for (const enemy of this.enemies) {
      if (!this.canAttackTarget(enemy, maxDistance)) continue;
      const distanceToEnemy = distance(this.player, enemy);
      if (!nearest || distanceToEnemy < nearest.distance) {
        nearest = { x: enemy.x, y: enemy.y, distance: distanceToEnemy };
      }
    }
    for (const boss of this.bosses) {
      if (!this.canAttackTarget(boss, maxDistance)) continue;
      const distanceToBoss = distance(this.player, boss);
      if (!nearest || distanceToBoss < nearest.distance) {
        nearest = { x: boss.x, y: boss.y, distance: distanceToBoss };
      }
    }
    for (const boss of this.getFinalBosses()) {
      if (!this.canAttackTarget(boss, maxDistance)) continue;
      const distanceToFinalBoss = distance(this.player, boss);
      if (!nearest || distanceToFinalBoss < nearest.distance) {
        nearest = { x: boss.x, y: boss.y, distance: distanceToFinalBoss };
      }
    }
    for (const boss of this.getHospitalKnights()) {
      if (!this.canAttackTarget(boss, maxDistance)) continue;
      const distanceToHospitalKnight = distance(this.player, boss);
      if (!nearest || distanceToHospitalKnight < nearest.distance) {
        nearest = { x: boss.x, y: boss.y, distance: distanceToHospitalKnight };
      }
    }
    for (const device of this.teslaDevices) {
      if (!this.canAttackTarget(device, maxDistance)) continue;
      const distanceToDevice = distance(this.player, device);
      if (!nearest || distanceToDevice < nearest.distance) {
        nearest = { x: device.x, y: device.y, distance: distanceToDevice };
      }
    }
    for (const vehicle of this.convoyVehicles) {
      if (!this.canAttackTarget(vehicle, maxDistance)) continue;
      const distanceToVehicle = distance(this.player, vehicle);
      if (!nearest || distanceToVehicle < nearest.distance) {
        nearest = { x: vehicle.x, y: vehicle.y, distance: distanceToVehicle };
      }
    }
    return nearest ? { x: nearest.x, y: nearest.y } : undefined;
  }

  private getAutoWeaponTarget(weapon: AutoWeaponDefinition): Actor | undefined {
    const targets = this.getAutoWeaponTargets(weapon, 1);
    return targets[0];
  }

  private getAutoWeaponTargets(weapon: AutoWeaponDefinition, count: number): Actor[] {
    if (!this.player) return [];
    const targets = this.getVisibleCombatTargets(weapon.range);
    if (weapon.priority === "boss") {
      targets.sort((a, b) => {
        const bossScore = Number(this.bosses.includes(b as BossActor)) - Number(this.bosses.includes(a as BossActor));
        if (bossScore !== 0) return bossScore;
        return distance(this.player!, a) - distance(this.player!, b);
      });
    } else if (weapon.priority === "cluster") {
      targets.sort((a, b) => this.countTargetsNear(b, 150) - this.countTargetsNear(a, 150));
    } else {
      targets.sort((a, b) => distance(this.player!, a) - distance(this.player!, b));
    }
    if (targets.length === 0) return [];
    const selected: Actor[] = [];
    for (let index = 0; index < count; index += 1) {
      selected.push(targets[index % targets.length]);
    }
    return selected;
  }

  private getVisibleCombatTargets(maxDistance: number): Actor[] {
    if (!this.player) return [];
    const targets: Actor[] = [...this.enemies, ...this.bosses, ...this.getFinalBosses(), ...this.getHospitalKnights(), ...this.teslaDevices, ...this.convoyVehicles];
    return targets.filter((target) => this.canAttackTarget(target, maxDistance));
  }

  private countTargetsNear(origin: Actor, radius: number): number {
    const targets: Actor[] = [...this.enemies, ...this.bosses, ...this.getFinalBosses(), ...this.getHospitalKnights(), ...this.teslaDevices, ...this.convoyVehicles];
    return targets.filter(
      (target) => this.isSameVisibilityZone(origin, target) && distance(origin, target) <= radius,
    ).length;
  }

  private updateWeaponAim(target = this.getWeaponAimTarget()): void {
    if (!this.player || !this.playerWeapon) return;
    this.setViewPosition(
      this.playerWeapon.container,
      this.player.x,
      this.player.y,
      this.isStoryMode() ? STORY_2_5D_CONFIG.weaponYOffset : 0,
    );
    this.playerWeapon.container.zIndex = this.getStoryVisualDepth(this.player, 30);
    const angle = this.isStoryMode()
      ? projectStoryAngle(this.player, target, this.getStoryProjectionOrigin())
      : Math.atan2(target.y - this.player.y, target.x - this.player.x);
    this.playerWeapon.container.rotation = angle;
    this.player.view.rotation = this.playerStoryVisual ? 0 : angle + Math.PI / 2;
  }

  private getWeaponAimTarget(): { x: number; y: number } {
    if (!this.player) return this.pointerWorld;
    const combatTarget = this.attackMode === "auto" ? this.getNearestTarget(620) : undefined;
    return getAimTarget(
      this.player,
      combatTarget,
      this.pointerWorld,
      this.attackMode === "auto" && !combatTarget ? this.movementDirection : undefined,
    );
  }

  private animateGunshot(): void {
    if (!this.player || !this.playerWeapon) return;
    const { barrel, muzzleFlash } = this.playerWeapon;
    barrel.x = -BASIC_GUN.recoilDistance;
    gsap.to(barrel, { x: 0, duration: 0.075, ease: "power2.out" });

    muzzleFlash.visible = true;
    muzzleFlash.alpha = 1;
    muzzleFlash.scale.set(0.5 + Math.random() * 0.35);
    muzzleFlash.rotation = (Math.random() - 0.5) * 0.28;
    gsap.to(muzzleFlash.scale, { x: 1.55, y: 1.35, duration: 0.05, ease: "power2.out" });
    gsap.to(muzzleFlash, {
      alpha: 0,
      duration: 0.07,
      onComplete: () => {
        muzzleFlash.visible = false;
      },
    });
    this.spawnMuzzleSparks();
    this.addScreenShake(45, BASIC_GUN.screenShakeMagnitude);

    const recoilAngle = this.playerWeapon.container.rotation + Math.PI;
    const recoilX = Math.cos(recoilAngle) * 3.5;
    const recoilY = Math.sin(recoilAngle) * 3.5;
    gsap.fromTo(
      this.player.view,
      { x: recoilX, y: recoilY },
      { x: 0, y: 0, duration: 0.06, ease: "power2.out" },
    );
  }

  private spawnMuzzleSparks(): void {
    if (!this.player || !this.playerWeapon) return;
    const angle = this.playerWeapon.container.rotation;
    const projectedPlayer = this.projectPoint(this.player);
    const muzzleX = projectedPlayer.x + Math.cos(angle) * 58;
    const muzzleY =
      projectedPlayer.y +
      (this.isStoryMode() ? STORY_2_5D_CONFIG.weaponYOffset : 0) +
      Math.sin(angle) * 58;

    for (let index = 0; index < BASIC_GUN.sparkCount; index += 1) {
      const sparkAngle = angle + (Math.random() - 0.5) * 0.75;
      const spark = new Graphics();
      spark.circle(0, 0, 1.2 + Math.random() * 2.2).fill(index % 2 === 0 ? 0xfff3b0 : 0x68e1fd);
      spark.position.set(muzzleX, muzzleY);
      spark.zIndex = this.getStoryVisualDepth(this.player, 45);
      this.world.addChild(spark);
      gsap.to(spark, {
        x: muzzleX + Math.cos(sparkAngle) * (22 + Math.random() * 28),
        y: muzzleY + Math.sin(sparkAngle) * (22 + Math.random() * 28),
        alpha: 0,
        duration: 0.1 + Math.random() * 0.08,
        ease: "power2.out",
        onComplete: () => {
          this.world.removeChild(spark);
          spark.destroy();
        },
      });
    }
  }

  private spawnHitSparks(x: number, y: number, color: number, count: number): void {
    const projected = this.projectPoint({ x, y });
    const sparkX = projected.x;
    const sparkY = projected.y + (this.isStoryMode() ? STORY_2_5D_CONFIG.effectYOffset : 0);
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const spark = new Graphics();
      spark.rect(-1, -1, 2 + Math.random() * 3, 2).fill(color);
      spark.position.set(sparkX, sparkY);
      spark.rotation = angle;
      spark.zIndex = this.getStoryVisualDepth({ x, y }, 45);
      this.world.addChild(spark);
      gsap.to(spark, {
        x: sparkX + Math.cos(angle) * (18 + Math.random() * 24),
        y: sparkY + Math.sin(angle) * (18 + Math.random() * 24),
        alpha: 0,
        duration: 0.16,
        ease: "power2.out",
        onComplete: () => {
          this.world.removeChild(spark);
          spark.destroy();
        },
      });
    }
  }

  private addScreenShake(durationMs: number, magnitude: number): void {
    this.screenShakeMs = Math.max(this.screenShakeMs, durationMs);
    this.screenShakeMagnitude = Math.max(this.screenShakeMagnitude, magnitude);
  }

  private focusNearestBoss(): void {
    const boss = this.getNearestBoss();
    if (!boss) {
      this.emitState("No roaming Boss exists on the current map.");
      return;
    }
    gsap.fromTo(boss.view.scale, { x: 1.45, y: 1.45 }, { x: 1, y: 1, duration: 0.32 });
    this.emitState(`Nearest Boss: ${this.getBossName(boss.bossId)}, mode ${boss.mode === "roam" ? "roaming" : "chasing"}.`);
  }

  private ensureEndgameBoss(): void {
    if (this.isBossRushMode()) return;
    if (this.shouldDisableStoryBossEncounters()) return;
    if (!shouldAllowWarCoreSpawn({ armoryActive: this.warCoreArmoryActive, collapseMs: this.warCoreCollapseMs })) return;
    if (!this.player || this.finalBoss || !isEndgameReady(this.state)) return;
    this.spawnFinalBoss();
  }

  private spawnFinalBoss(overrides: { x?: number; y?: number; health?: number; phase?: FinalBossPhase } = {}): void {
    if (!this.player) return;
    const position = {
      x: overrides.x ?? PLAYER_START.x,
      y: overrides.y ?? PLAYER_START.y,
    };
    const startingHealth = overrides.health ?? FINAL_BOSS_DEFINITION.maxHealth;
    const startingPhase = overrides.phase ?? getFinalBossPhase(startingHealth, FINAL_BOSS_DEFINITION.maxHealth);
    const view = new Graphics();
    this.drawFinalBossSprite(view, startingPhase);
    view.position.set(position.x, position.y);
    this.world.addChild(view);
    const label = new Text({
      text: "",
      style: new TextStyle({ fill: "#ff4d6d", fontFamily: "Arial", fontSize: 18, fontWeight: "700" }),
    });
    label.position.set(position.x - 108, position.y - 86);
    this.world.addChild(label);
    const boss: FinalBossActor = {
      view,
      label,
      x: position.x,
      y: position.y,
      health: startingHealth,
      maxHealth: FINAL_BOSS_DEFINITION.maxHealth,
      phase: startingPhase,
      skillElapsedMs: 0,
      skillCooldownMs: 2600,
      contactDamageElapsedMs: 650,
      skillCursor: 0,
      wantedUsed: false,
      finalBeamUsed: false,
    };
    if (this.finalBoss) {
      this.extraFinalBosses.push(boss);
    } else {
      this.finalBoss = boss;
    }
    this.addScreenShake(500, 9);
    this.engageRoamingBossesForFinalFight();
    if (boss.phase === 4) {
      this.enterWarCoreArmory(boss);
    }
    this.emitState(`${FINAL_BOSS_DEFINITION.name}已降临。当前阶段：P${boss.phase}。按 T 释放超级大招。`);
  }

  private engageRoamingBossesForFinalFight(): void {
    for (const boss of this.bosses) {
      boss.mode = boss.mode === "charge" || boss.mode === "windup" ? boss.mode : "chase";
      boss.roamTarget = this.player ? { x: this.player.x, y: this.player.y } : boss.roamTarget;
      boss.skillElapsedMs = Math.max(boss.skillElapsedMs, boss.skillCooldownMs);
    }
    for (const knight of this.getHospitalKnights()) {
      this.aggroHospitalKnight(knight);
    }
  }

  private drawFinalBossSprite(view: Graphics, phase: FinalBossPhase): void {
    const accent = phase === 1 ? 0xff9f1c : phase === 2 ? 0x68e1fd : 0xff4d6d;
    view.clear();
    if (phase === 4) {
      view.circle(0, 0, 54).fill(0x1a1010).stroke({ color: 0xff4d6d, width: 7 });
      view.rect(-80, -16, 160, 32).fill(0x293241).stroke({ color: 0xff9f1c, width: 4 });
      view.rect(-18, -92, 36, 184).fill(0x3a0f12).stroke({ color: 0xffd166, width: 3 });
      view.circle(-72, -54, 16).fill(0xd90429);
      view.circle(72, -54, 16).fill(0xd90429);
      view.circle(-72, 54, 16).fill(0xd90429);
      view.circle(72, 54, 16).fill(0xd90429);
      return;
    }
    view
      .circle(0, 0, 54)
      .fill(0x161923)
      .stroke({ color: accent, alpha: 0.96, width: 5 })
      .rect(-66, -28, 32, 56)
      .fill(0x2f3745)
      .stroke({ color: 0xfff3b0, alpha: 0.55, width: 2 })
      .rect(34, -28, 32, 56)
      .fill(0x2f3745)
      .stroke({ color: 0xfff3b0, alpha: 0.55, width: 2 })
      .rect(-16, -78, 32, 42)
      .fill(0x3b4456)
      .stroke({ color: accent, alpha: 0.8, width: 2 })
      .circle(0, 0, 21)
      .fill({ color: accent, alpha: 0.42 })
      .circle(0, 0, 9)
      .fill(0xd9f7ff);
    if (phase >= 2) {
      view.circle(0, 0, 82).stroke({ color: 0x68e1fd, alpha: 0.36, width: 3 });
      view.rect(-86, -8, 34, 16).fill({ color: 0x68e1fd, alpha: 0.66 });
      view.rect(52, -8, 34, 16).fill({ color: 0x68e1fd, alpha: 0.66 });
    }
    if (phase >= 3) {
      view.poly([28, -9, 122, 0, 28, 9]).fill({ color: 0xff4d6d, alpha: 0.9 });
      view.circle(0, 0, 104).stroke({ color: 0xff4d6d, alpha: 0.28, width: 4 });
    }
  }

  private triggerFinalBossSkill(boss: FinalBossActor): void {
    if (!this.player) return;
    if (boss.phase === 1) {
      this.castFinalBossCoreRay(boss);
      return;
    }
    if (boss.phase === 2) {
      this.triggerFinalBossPhaseTwoSkill(boss);
      return;
    }
    if (boss.phase === 4) {
      this.triggerFinalBossPhaseFourSkill(boss);
      return;
    }
    this.triggerFinalBossPhaseThreeSkill(boss);
  }

  private triggerFinalBossPhaseTwoSkill(boss: FinalBossActor): void {
    boss.skillCursor += 1;
    if (boss.skillCursor % 3 === 1) {
      this.castFinalBossCoreRay(boss);
      return;
    }
    if (!boss.wantedUsed && boss.skillCursor % 3 === 2) {
      boss.wantedUsed = true;
      this.castFinalBossWanted();
      return;
    }
    this.castFinalBossBombing();
  }

  private triggerFinalBossPhaseThreeSkill(boss: FinalBossActor): void {
    boss.skillCursor += 1;
    const cursor = boss.skillCursor % 4;
    if (cursor === 0) {
      this.castFinalBossOrangeBeam(boss);
    } else if (cursor === 1) {
      this.castFinalBossMissiles(boss);
    } else if (cursor === 2) {
      this.castFinalBossCrawlers(boss);
    } else {
      this.castFinalBossBuildingWeapon();
    }
  }

  private triggerFinalBossPhaseFourSkill(boss: FinalBossActor): void {
    const cursor = boss.skillCursor % 3;
    boss.skillCursor += 1;
    if (cursor === 0) {
      this.castWarCoreArmoryBarrage();
    } else if (cursor === 1) {
      this.castWarCoreAmmoRackChain();
    } else {
      this.castWarCoreTurretCrossfire(boss);
    }
  }

  private enterWarCoreArmory(boss: FinalBossActor): void {
    if (this.warCoreArmoryActive) return;
    this.warCoreArmoryActive = true;
    this.warCoreCollapseMs = 0;
    this.warCoreCollapseTickMs = 0;
    this.warCoreArmoryPressureMs = 0;
    this.clearSniperBuildings();
    for (const bomb of [...this.finalBossBombs]) this.removeFinalBossBomb(bomb);
    for (const missile of [...this.finalBossMissiles]) this.removeFinalBossMissile(missile);
    for (const crawler of [...this.finalBossCrawlers]) this.removeFinalBossCrawler(crawler);
    this.drawWarCoreArmoryOverlay();
    const centerX = this.getMapWidth() / 2;
    const centerY = this.getMapHeight() / 2;
    this.setActorPosition(boss, centerX, centerY - 220);
    if (this.player) {
      this.setActorPosition(this.player, centerX, centerY + 260);
    }
    this.addScreenShake(700, 14);
    this.emitState("战争核心炸毁城市地表，将你拖入地下军火库。");
  }

  private drawWarCoreArmoryOverlay(): void {
    if (this.warCoreArmoryOverlay && !this.warCoreArmoryOverlay.destroyed) {
      this.world.removeChild(this.warCoreArmoryOverlay);
      this.warCoreArmoryOverlay.destroy();
    }
    const overlay = new Graphics();
    const centerX = this.getMapWidth() / 2;
    const centerY = this.getMapHeight() / 2;
    const width = FINAL_BOSS_PHASE_FOUR_SKILL.armoryWidth;
    const height = FINAL_BOSS_PHASE_FOUR_SKILL.armoryHeight;
    overlay
      .rect(centerX - width / 2, centerY - height / 2, width, height)
      .fill({ color: 0x17130f, alpha: 0.88 })
      .stroke({ color: 0xff9f1c, alpha: 0.7, width: 8 });
    overlay
      .rect(centerX - width / 2 + 80, centerY - height / 2 + 80, width - 160, height - 160)
      .stroke({ color: 0x8d99ae, alpha: 0.35, width: 4 });
    this.world.addChildAt(overlay, 1);
    this.warCoreArmoryOverlay = overlay;
  }

  private startWarCoreCollapse(): void {
    if (this.warCoreCollapseMs > 0) return;
    this.warCoreCollapseMs = FINAL_BOSS_PHASE_FOUR_SKILL.collapseEscapeMs;
    this.warCoreCollapseTickMs = 0;
    this.warCoreArmoryPressureMs = 0;
    this.spawnWarCoreExtraction();
    this.addScreenShake(900, 16);
    this.emitState("War Core destroyed. The underground armory is collapsing. Evacuate now.");
  }

  private spawnWarCoreExtraction(): void {
    if (this.warCoreExtraction && !this.warCoreExtraction.view.destroyed) {
      this.world.removeChild(this.warCoreExtraction.view);
      this.warCoreExtraction.view.destroy();
    }
    const x = this.getMapWidth() / 2;
    const y = this.getMapHeight() / 2 + FINAL_BOSS_PHASE_FOUR_SKILL.armoryHeight / 2 - 160;
    const view = new Graphics();
    view
      .circle(0, 0, FINAL_BOSS_PHASE_FOUR_SKILL.exitRadius)
      .fill({ color: 0xa7c957, alpha: 0.22 })
      .stroke({ color: 0xf8f4e3, alpha: 0.9, width: 5 })
      .rect(-42, -18, 84, 36)
      .fill({ color: 0xf8f4e3, alpha: 0.18 });
    view.position.set(x, y);
    this.world.addChild(view);
    this.warCoreExtraction = { view, x, y, radius: FINAL_BOSS_PHASE_FOUR_SKILL.exitRadius };
  }

  private updateWarCoreCollapse(deltaMs: number): void {
    if (this.warCoreCollapseMs <= 0 || !this.player || !this.warCoreExtraction || this.gameOver) return;
    this.warCoreCollapseMs = Math.max(0, this.warCoreCollapseMs - deltaMs);
    this.warCoreCollapseTickMs += deltaMs;

    const outcome = getWarCoreEvacuationOutcome({
      collapseMs: this.warCoreCollapseMs,
      distanceToExit: distance(this.player, this.warCoreExtraction),
      exitRadius: this.warCoreExtraction.radius,
    });

    if (outcome === "escaped") {
      this.finishWarCoreEvacuation();
      return;
    }

    if (this.warCoreCollapseTickMs >= FINAL_BOSS_PHASE_FOUR_SKILL.collapseTickMs) {
      this.warCoreCollapseTickMs = 0;
      this.applyPlayerDamage(FINAL_BOSS_PHASE_FOUR_SKILL.collapseDamage);
      this.addScreenShake(180, 6);
      this.emitState(`Armory collapsing: ${Math.ceil(this.warCoreCollapseMs / 1000)}s left.`);
    }

    if (outcome === "buried") {
      this.warCoreCollapseMs = 0;
      this.applyPlayerDamage(99999);
      this.emitState("War Core is destroyed, but you were buried in the underground armory.");
    }
  }

  private finishWarCoreEvacuation(): void {
    this.warCoreCollapseMs = 0;
    this.warCoreCollapseTickMs = 0;
    this.warCoreArmoryPressureMs = 0;
    this.warCoreArmoryActive = false;
    if (this.warCoreExtraction && !this.warCoreExtraction.view.destroyed) {
      this.world.removeChild(this.warCoreExtraction.view);
      this.warCoreExtraction.view.destroy();
    }
    this.warCoreExtraction = undefined;
    if (this.warCoreArmoryOverlay && !this.warCoreArmoryOverlay.destroyed) {
      this.world.removeChild(this.warCoreArmoryOverlay);
      this.warCoreArmoryOverlay.destroy();
    }
    this.warCoreArmoryOverlay = undefined;
    this.addScreenShake(500, 9);
    this.emitState("You escaped the underground armory. War Core has been annihilated.");
    if (this.isBossRushMode()) {
      this.completeBossRushIfCleared();
      return;
    }
    this.gameOver = true;
    this.callbacks.onRunState(this.state);
    this.callbacks.onMissionSuccess(this.state);
  }

  private updateWarCoreArmoryPressure(deltaMs: number): void {
    if (!this.warCoreArmoryActive || this.warCoreCollapseMs > 0 || !this.player) return;
    this.warCoreArmoryPressureMs += deltaMs;
    if (this.warCoreArmoryPressureMs < FINAL_BOSS_PHASE_FOUR_SKILL.pressureTickMs) return;
    this.warCoreArmoryPressureMs = 0;
    const side = this.spawnSeed % 2 === 0 ? -1 : 1;
    const x = clamp(this.player.x + side * 420, 24, this.getMapWidth() - 24);
    const y = clamp(this.player.y + ((this.spawnSeed % 3) - 1) * 140, 24, this.getMapHeight() - 24);
    this.spawnDelayedBossBlast(
      x,
      y,
      FINAL_BOSS_PHASE_FOUR_SKILL.barrageRadius,
      FINAL_BOSS_PHASE_FOUR_SKILL.barrageDamage,
      420,
      0xff9f1c,
      "armory pressure",
    );
    this.spawnSeed += 1;
  }

  private castWarCoreArmoryBarrage(): void {
    if (!this.player) return;
    const skill = FINAL_BOSS_PHASE_FOUR_SKILL;
    const center = { x: this.player.x, y: this.player.y };
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8 + this.spawnSeed * 0.17;
      const ring = 140 + (index % 3) * 85;
      const x = clamp(center.x + Math.cos(angle) * ring, 24, this.getMapWidth() - 24);
      const y = clamp(center.y + Math.sin(angle) * ring, 24, this.getMapHeight() - 24);
      this.spawnDelayedBossBlast(x, y, skill.barrageRadius, skill.barrageDamage, skill.barrageWarningMs + index * 60, 0xff9f1c, "armory barrage");
    }
    this.spawnSeed += 1;
  }

  private castWarCoreAmmoRackChain(): void {
    if (!this.player) return;
    const skill = FINAL_BOSS_PHASE_FOUR_SKILL;
    const startX = this.player.x - 360;
    const y = this.player.y + (this.spawnSeed % 2 === 0 ? -180 : 180);
    for (let index = 0; index < 7; index += 1) {
      const x = clamp(startX + index * 120, 24, this.getMapWidth() - 24);
      this.spawnDelayedBossBlast(
        x,
        clamp(y, 24, this.getMapHeight() - 24),
        skill.ammoRackRadius,
        skill.ammoRackDamage,
        500 + index * 120,
        0xff4d6d,
        "ammo rack",
      );
    }
    this.spawnSeed += 1;
  }

  private castWarCoreTurretCrossfire(boss: FinalBossActor): void {
    if (!this.player) return;
    const skill = FINAL_BOSS_PHASE_FOUR_SKILL;
    const offsets = [
      { x: -520, y: -320 },
      { x: 520, y: -320 },
      { x: -520, y: 320 },
      { x: 520, y: 320 },
    ];
    for (let index = 0; index < 20; index += 1) {
      const sourceOffset = offsets[index % offsets.length];
      window.setTimeout(() => {
        if (!this.getFinalBosses().includes(boss) || !this.player) return;
        const source = {
          x: clamp(boss.x + sourceOffset.x, 24, this.getMapWidth() - 24),
          y: clamp(boss.y + sourceOffset.y, 24, this.getMapHeight() - 24),
        };
        const angle = Math.atan2(this.player.y - source.y, this.player.x - source.x);
        this.spawnBossHazard(source.x, source.y, angle, skill.turretProjectileSpeed, 0xffd166, 1500, 10, "bossProjectile", skill.turretDamage);
      }, index * 70);
    }
  }

  private castFinalBossCoreRay(boss: FinalBossActor): void {
    const skill = FINAL_BOSS_PHASE_ONE_SKILL;
    this.drawExpandingRing(boss.x, boss.y, skill.interferenceRadius, 0xff1744, skill.beamDelayMs);
    if (this.player) {
      this.playerSlowMs = Math.max(this.playerSlowMs, skill.slowMs);
      this.showDamageNumber(this.player.x, this.player.y - 44, 0, "#68e1fd", "SLOW ");
    }
    this.drawExpandingRing(boss.x, boss.y, 132, 0xffffff, skill.beamDelayMs);
    window.setTimeout(() => {
      if (!this.player || !this.getFinalBosses().includes(boss) || boss.phase >= 3 || boss.view.destroyed) return;
      const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
      const end = {
        x: clamp(boss.x + Math.cos(angle) * skill.beamRange, 24, MAP_WIDTH - 24),
        y: clamp(boss.y + Math.sin(angle) * skill.beamRange, 24, MAP_HEIGHT - 24),
      };
      this.drawWideBeam(boss, end, 0xff1744, skill.beamRadius, 340);
      if (distancePointToSegment(this.player, boss, end) <= skill.beamRadius) {
        this.applyPlayerDamage(skill.beamDamage);
      }
      this.addScreenShake(180, 6);
    }, skill.beamDelayMs);
    this.emitState(`${FINAL_BOSS_DEFINITION.name}: interference wave deployed, red lasers locking.`);
  }

  private castFinalBossBombing(): void {
    if (!this.player) return;
    const skill = FINAL_BOSS_PHASE_TWO_SKILL;
    for (let index = 0; index < 4; index += 1) {
      const angle = (Math.PI * 2 * index) / 4 + this.spawnSeed * 0.17;
      const radius = skill.bombMinRadius + ((this.spawnSeed + index * 31) % 100) / 100 * (skill.bombMaxRadius - skill.bombMinRadius);
      const x = clamp(this.player.x + Math.cos(angle) * (90 + (index % 2) * 120), 24, MAP_WIDTH - 24);
      const y = clamp(this.player.y + Math.sin(angle) * (90 + (index % 2) * 120), 24, MAP_HEIGHT - 24);
      const view = new Graphics();
      view.circle(0, 0, radius).fill({ color: 0xff1744, alpha: 0.12 }).stroke({ color: 0xfff3b0, alpha: 0.9, width: 3 });
      view.position.set(x, y);
      this.world.addChild(view);
      this.finalBossBombs.push({ view, x, y, radius, lifeMs: skill.bombWarningMs, damage: skill.bombDamage });
    }
    this.emitState(FINAL_BOSS_DEFINITION.name + ": bombardment zones marked.");
  }

  private updateFinalBossBombs(deltaMs: number): void {
    for (const bomb of [...this.finalBossBombs]) {
      bomb.lifeMs -= deltaMs;
      bomb.view.alpha = 0.45 + Math.sin(performance.now() / 70) * 0.18;
      if (bomb.lifeMs > 0) continue;
      if (this.player && distance(this.player, bomb) <= bomb.radius) {
        this.applyPlayerDamage(bomb.damage);
      }
      this.drawNukeCloud(bomb.x, bomb.y, bomb.radius * 0.72);
      this.addScreenShake(260, 8);
      this.removeFinalBossBomb(bomb);
    }
  }

  private removeFinalBossBomb(bomb: FinalBossBombActor): void {
    this.world.removeChild(bomb.view);
    bomb.view.destroy();
    this.finalBossBombs = this.finalBossBombs.filter((candidate) => candidate !== bomb);
  }

  private castFinalBossWanted(): void {
    const player = this.player ?? PLAYER_START;
    const candidates = [...this.buildingVisuals].sort((a, b) => distance(a, player) - distance(b, player));
    for (const building of candidates.slice(0, FINAL_BOSS_PHASE_TWO_SKILL.sniperBuildingCount)) {
      building.isSniperNest = true;
      building.sniperCooldownMs = 400;
      building.roof.clear();
      building.roof
        .rect(building.x - building.width / 2, building.y - building.height / 2, building.width, building.height)
        .fill({ color: 0x170d12, alpha: 0.95 })
        .stroke({ color: 0xff4d6d, alpha: 0.95, width: 3 })
        .circle(building.x, building.y, 18)
        .fill({ color: 0xff1744, alpha: 0.72 });
    }
    this.emitState(FINAL_BOSS_DEFINITION.name + ": citywide wanted order, hunters taking rooftops.");
  }

  private clearSniperBuildings(): void {
    for (const building of this.buildingVisuals) {
      if (!building.isSniperNest) continue;
      building.isSniperNest = false;
      this.redrawBuildingRoof(building);
    }
  }

  private updateFinalBossBuildings(deltaMs: number, phase: FinalBossPhase): void {
    this.finalBossBuildingCollisionElapsedMs = Math.min(
      FINAL_BOSS_PHASE_ONE_SKILL.buildingCollisionIntervalMs,
      this.finalBossBuildingCollisionElapsedMs + deltaMs,
    );
    for (const building of this.buildingVisuals) {
      building.chargeCooldownMs = Math.max(0, building.chargeCooldownMs - deltaMs);
      building.weaponCooldownMs = Math.max(0, building.weaponCooldownMs - deltaMs);
      building.sniperCooldownMs = Math.max(0, building.sniperCooldownMs - deltaMs);
    }
    if (!this.player || this.getFinalBosses().length === 0) return;
    if (phase === 1 || phase === 2) {
      this.forcePlayerOutOfFinalBossBuildings();
      for (const building of this.buildingVisuals) {
        this.updateHostileBuilding(building);
        this.updateSniperBuilding(building, phase);
      }
    }
  }

  private forcePlayerOutOfFinalBossBuildings(): void {
    if (!this.player) return;
    const building = this.buildingVisuals.find((candidate) => this.pointInsideBuildingRect(this.player!, candidate));
    if (!building) return;
    const left = building.x - building.width / 2;
    const right = building.x + building.width / 2;
    const top = building.y - building.height / 2;
    const bottom = building.y + building.height / 2;
    const exits = [
      { x: left - 26, y: this.player.y, value: Math.abs(this.player.x - left) },
      { x: right + 26, y: this.player.y, value: Math.abs(right - this.player.x) },
      { x: this.player.x, y: top - 26, value: Math.abs(this.player.y - top) },
      { x: this.player.x, y: bottom + 26, value: Math.abs(bottom - this.player.y) },
    ].sort((a, b) => a.value - b.value);
    this.setActorPosition(this.player, clamp(exits[0].x, 24, MAP_WIDTH - 24), clamp(exits[0].y, 24, MAP_HEIGHT - 24));
    this.showDamageNumber(this.player.x, this.player.y - 42, 0, "#ff4d6d", "EJECT ");
  }

  private updateHostileBuilding(building: BuildingVisual): void {
    if (!this.player) return;
    const dist = distancePointToRect(this.player, building);
    const skill = FINAL_BOSS_PHASE_ONE_SKILL;
    if (dist <= 72 && this.finalBossBuildingCollisionElapsedMs >= skill.buildingCollisionIntervalMs) {
      this.finalBossBuildingCollisionElapsedMs = 0;
      this.applyPlayerDamage(skill.buildingCollisionDamage);
    }
    if (dist <= skill.buildingChargeRange && building.chargeCooldownMs <= 0) {
      building.chargeCooldownMs = skill.buildingChargeCooldownMs;
      this.drawBuildingDash(building, this.player, 0xff1744, 260);
      if (dist <= 160) {
        this.applyPlayerDamage(skill.buildingChargeDamage);
      }
    }
  }

  private updateSniperBuilding(building: BuildingVisual, phase: FinalBossPhase): void {
    if (!this.player || phase !== 2 || !building.isSniperNest || building.sniperCooldownMs > 0) return;
    const skill = FINAL_BOSS_PHASE_TWO_SKILL;
    if (distancePointToRect(this.player, building) > skill.sniperRange) return;
    building.sniperCooldownMs = skill.sniperCooldownMs;
    this.drawWideBeam(building, this.player, 0xfff3b0, 18, 180);
    this.applyPlayerDamage(skill.sniperDamage);
  }

  private castFinalBossBuildingWeapon(): void {
    if (!this.player || this.getCurrentBuildingId()) return;
    const building = [...this.buildingVisuals].sort((a, b) => distancePointToRect(this.player!, a) - distancePointToRect(this.player!, b))[0];
    if (!building || building.weaponCooldownMs > 0) return;
    const skill = FINAL_BOSS_PHASE_THREE_SKILL;
    if (distancePointToRect(this.player, building) > skill.buildingWeaponRange) return;
    building.weaponCooldownMs = skill.buildingWeaponCooldownMs;
    this.drawBuildingDash(building, this.player, 0xff9f1c, 300);
    this.applyPlayerDamage(skill.buildingWeaponDamage);
    this.emitState(FINAL_BOSS_DEFINITION.name + ": building control strike.");
  }

  private castFinalBossOrangeBeam(boss: FinalBossActor): void {
    if (!this.player) return;
    const skill = FINAL_BOSS_PHASE_THREE_SKILL;
    const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
    const end = {
      x: clamp(boss.x + Math.cos(angle) * skill.orangeBeamRange, 24, MAP_WIDTH - 24),
      y: clamp(boss.y + Math.sin(angle) * skill.orangeBeamRange, 24, MAP_HEIGHT - 24),
    };
    this.drawWideBeam(boss, end, 0xff9f1c, skill.orangeBeamRadius, 420);
    if (distancePointToSegment(this.player, boss, end) <= skill.orangeBeamRadius) {
      this.applyPlayerDamage(skill.orangeBeamDamage);
    }
    this.addScreenShake(240, 8);
    this.emitState(FINAL_BOSS_DEFINITION.name + ": orange city beam.");
  }

  private castFinalBossMissiles(boss: FinalBossActor): void {
    if (!this.player) return;
    const skill = FINAL_BOSS_PHASE_THREE_SKILL;
    for (let index = 0; index < skill.missileCount; index += 1) {
      const angle = (Math.PI * 2 * index) / skill.missileCount;
      const target = {
        x: clamp(this.player.x + Math.cos(angle) * 120, 24, MAP_WIDTH - 24),
        y: clamp(this.player.y + Math.sin(angle) * 120, 24, MAP_HEIGHT - 24),
      };
      const view = new Graphics();
      view.poly([-16, -6, 20, 0, -16, 6]).fill({ color: 0xfff3b0, alpha: 0.95 }).stroke({ color: 0xff4d6d, alpha: 0.9, width: 2 });
      view.position.set(boss.x - Math.cos(angle) * 64, boss.y - Math.sin(angle) * 64);
      this.world.addChild(view);
      this.drawMissileWarning(target.x, target.y, skill.missileRadius, skill.missileLockMs);
      this.finalBossMissiles.push({
        view,
        x: view.position.x,
        y: view.position.y,
        targetX: target.x,
        targetY: target.y,
        speed: 1450,
        radius: skill.missileRadius,
        damage: skill.missileDamage,
        lockMs: skill.missileLockMs,
        lifeMs: 3600,
      });
    }
    this.emitState(FINAL_BOSS_DEFINITION.name + ": back missiles locked.");
  }

  private drawMissileWarning(x: number, y: number, radius: number, lifeMs: number): void {
    const view = new Graphics();
    view.circle(0, 0, radius).fill({ color: 0xff1744, alpha: 0.1 }).stroke({ color: 0xfff3b0, alpha: 0.86, width: 2 });
    view.position.set(x, y);
    this.world.addChild(view);
    gsap.to(view, {
      alpha: 0,
      duration: lifeMs / 1000,
      onComplete: () => {
        this.world.removeChild(view);
        view.destroy();
      },
    });
  }

  private updateFinalBossMissiles(deltaMs: number): void {
    for (const missile of [...this.finalBossMissiles]) {
      missile.lockMs -= deltaMs;
      missile.lifeMs -= deltaMs;
      if (missile.lockMs > 0) {
        missile.view.rotation += 0.12;
        continue;
      }
      const target = { x: missile.targetX, y: missile.targetY };
      const angle = Math.atan2(target.y - missile.y, target.x - missile.x);
      this.setActorPosition(missile, missile.x + Math.cos(angle) * missile.speed * deltaMs / 1000, missile.y + Math.sin(angle) * missile.speed * deltaMs / 1000);
      missile.view.rotation = angle;
      if (distance(missile, target) <= 34 || missile.lifeMs <= 0) {
        if (this.player && distance(this.player, target) <= missile.radius) {
          this.applyPlayerDamage(missile.damage);
        }
        this.drawNukeCloud(target.x, target.y, missile.radius * 0.7);
        this.removeFinalBossMissile(missile);
      }
    }
  }

  private removeFinalBossMissile(missile: FinalBossMissileActor): void {
    this.world.removeChild(missile.view);
    missile.view.destroy();
    this.finalBossMissiles = this.finalBossMissiles.filter((candidate) => candidate !== missile);
  }

  private castFinalBossCrawlers(boss: FinalBossActor): void {
    const skill = FINAL_BOSS_PHASE_THREE_SKILL;
    for (let index = 0; index < skill.crawlerCount; index += 1) {
      const angle = (Math.PI * 2 * index) / skill.crawlerCount;
      const x = boss.x + Math.cos(angle) * 120;
      const y = boss.y + Math.sin(angle) * 120;
      const view = new Graphics();
      view.ellipse(0, 0, 22, 13).fill({ color: 0x241018, alpha: 0.94 }).stroke({ color: 0xff4d6d, alpha: 0.9, width: 2 }).circle(12, 0, 5).fill(0xff1744);
      view.position.set(x, y);
      this.world.addChild(view);
      this.finalBossCrawlers.push({ view, x, y, damage: skill.crawlerDamage, armMs: skill.crawlerArmMs, suppressMs: skill.suppressMs, armed: false });
    }
    this.emitState(FINAL_BOSS_DEFINITION.name + ": suppression crawlers released.");
  }

  private updateFinalBossCrawlers(deltaMs: number): void {
    if (!this.player) return;
    for (const crawler of [...this.finalBossCrawlers]) {
      if (crawler.armed) {
        crawler.armMs -= deltaMs;
        crawler.view.tint = 0xff9f1c;
        if (crawler.armMs <= 0) {
          const radius = FINAL_BOSS_PHASE_THREE_SKILL.crawlerExplosionRadius;
          if (distance(crawler, this.player) <= radius) {
            this.applyPlayerDamage(crawler.damage);
            this.playerSlowMs = Math.max(this.playerSlowMs, 1800);
            this.skillSuppressMs = Math.max(this.skillSuppressMs, crawler.suppressMs);
          }
          this.drawNukeCloud(crawler.x, crawler.y, radius);
          this.removeFinalBossCrawler(crawler);
        }
        continue;
      }
      if (distance(crawler, this.player) <= 34) {
        crawler.armed = true;
        crawler.view.tint = 0xff9f1c;
        continue;
      }
      const speed = this.getPlayerMoveSpeed() * FINAL_BOSS_PHASE_THREE_SKILL.crawlerSpeedMultiplier;
      const angle = Math.atan2(this.player.y - crawler.y, this.player.x - crawler.x);
      this.setActorPosition(crawler, crawler.x + Math.cos(angle) * speed * deltaMs / 1000, crawler.y + Math.sin(angle) * speed * deltaMs / 1000);
      crawler.view.rotation = angle;
    }
  }

  private removeFinalBossCrawler(crawler: FinalBossCrawlerActor): void {
    this.world.removeChild(crawler.view);
    crawler.view.destroy();
    this.finalBossCrawlers = this.finalBossCrawlers.filter((candidate) => candidate !== crawler);
  }

  private castFinalBossAnnihilationBeam(boss: FinalBossActor): void {
    if (!this.player) return;
    const startAngle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x) - Math.PI / 3;
    this.emitState(FINAL_BOSS_DEFINITION.name + ": final annihilation beam.");
    this.addScreenShake(1400, 16);
    for (let index = 0; index < 6; index += 1) {
      window.setTimeout(() => {
        if (!this.getFinalBosses().includes(boss) || !this.player || this.gameOver) return;
        const angle = startAngle + index * (Math.PI / 10);
        const end = {
          x: clamp(boss.x + Math.cos(angle) * FINAL_BOSS_PHASE_ONE_SKILL.beamRange, 24, MAP_WIDTH - 24),
          y: clamp(boss.y + Math.sin(angle) * FINAL_BOSS_PHASE_ONE_SKILL.beamRange, 24, MAP_HEIGHT - 24),
        };
        this.drawWideBeam(boss, end, 0x8b0016, 150, 360);
        if (distancePointToSegment(this.player, boss, end) <= 150) {
          this.applyPlayerDamage(99999);
        }
      }, index * 180);
    }
  }

  private drawWideBeam(start: { x: number; y: number }, end: { x: number; y: number }, color: number, radius: number, lifeMs: number): void {
    const view = new Graphics();
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const length = distance(start, end);
    view.rect(0, -radius, length, radius * 2).fill({ color, alpha: 0.42 }).rect(0, -radius * 0.26, length, radius * 0.52).fill({ color: 0xffffff, alpha: 0.75 });
    view.position.set(start.x, start.y);
    view.rotation = angle;
    this.world.addChild(view);
    gsap.to(view, {
      alpha: 0,
      duration: lifeMs / 1000,
      onComplete: () => {
        this.world.removeChild(view);
        view.destroy();
      },
    });
  }

  private drawExpandingRing(x: number, y: number, radius: number, color: number, lifeMs: number): void {
    const view = new Graphics();
    view.circle(0, 0, radius).fill({ color, alpha: 0.055 }).stroke({ color, alpha: 0.5, width: 6 });
    view.position.set(x, y);
    this.world.addChild(view);
    gsap.fromTo(view.scale, { x: 0.02, y: 0.02 }, { x: 1, y: 1, duration: lifeMs / 1000, ease: "power2.out" });
    gsap.to(view, {
      alpha: 0,
      duration: lifeMs / 1000,
      onComplete: () => {
        this.world.removeChild(view);
        view.destroy();
      },
    });
  }

  private drawBuildingDash(building: BuildingVisual, target: { x: number; y: number }, color: number, lifeMs: number): void {
    const view = new Graphics();
    view.rect(-building.width / 2, -building.height / 2, building.width, building.height).fill({ color, alpha: 0.22 }).stroke({ color, alpha: 0.82, width: 4 });
    view.position.set(building.x, building.y);
    this.world.addChild(view);
    this.drawWideBeam(building, target, color, 34, lifeMs);
    gsap.to(view, {
      alpha: 0,
      duration: lifeMs / 1000,
      onComplete: () => {
        this.world.removeChild(view);
        view.destroy();
      },
    });
  }

  private pointInsideBuildingRect(point: { x: number; y: number }, building: BuildingVisual): boolean {
    return Math.abs(point.x - building.x) <= building.width / 2 && Math.abs(point.y - building.y) <= building.height / 2;
  }

  private redrawBuildingRoof(building: BuildingVisual): void {
    building.roof.clear();
    building.roof
      .rect(building.x - building.width / 2, building.y - building.height / 2, building.width, building.height)
      .fill({ color: 0x111510, alpha: 0.9 })
      .stroke({ color: 0xfff3b0, alpha: 0.62, width: 2 })
      .rect(building.x - building.width / 2 + 14, building.y - building.height / 2 + 13, building.width - 28, 7)
      .fill({ color: 0xfff3b0, alpha: 0.5 });
  }

  private spawnHospitalKnight(overrides: { x?: number; y?: number; health?: number; phase?: HospitalKnightPhase; aggro?: boolean } = {}): void {
    const view = new Graphics();
    const phase = overrides.phase ?? 1;
    const x = overrides.x ?? HOSPITAL_KNIGHT_SPAWN.x;
    const y = overrides.y ?? HOSPITAL_KNIGHT_SPAWN.y;
    this.drawHospitalKnight(view, phase);
    view.position.set(x, y);
    this.world.addChild(view);
    const label = new Text({
      text: "",
      style: new TextStyle({ fill: "#fff3b0", fontFamily: "Arial", fontSize: 17, fontWeight: "700" }),
    });
    this.world.addChild(label);
    const knight: HospitalKnightActor = {
      view,
      label,
      x,
      y,
      health: overrides.health ?? HOSPITAL_KNIGHT_DEFINITION.maxHealth,
      maxHealth: overrides.health ?? HOSPITAL_KNIGHT_DEFINITION.maxHealth,
      phase,
      skillElapsedMs: 0,
      skillCooldownMs: 3400,
      skillCursor: 0,
      holyShroudCasts: 0,
      contactDamageElapsedMs: 700,
      chargeMs: 0,
      chargeAngle: 0,
      aggro: overrides.aggro ?? false,
      guardTarget: getHospitalKnightGuardRoamTarget(this.spawnSeed),
    };
    if (this.hospitalKnight) {
      this.extraHospitalKnights.push(knight);
    } else {
      this.hospitalKnight = knight;
    }
    if (!EXPERIMENTAL_DISABLE_SMALL_ENEMIES) {
      for (let index = 0; index < getInitialBoneHordeCount(); index += 1) {
        const angle = (Math.PI * 2 * index) / getInitialBoneHordeCount();
        this.spawnBoneEnemy(
          HOSPITAL_KNIGHT_SPAWN.x + Math.cos(angle) * (150 + (index % 3) * 42),
          HOSPITAL_KNIGHT_SPAWN.y + Math.sin(angle) * (150 + (index % 3) * 42),
          "bone",
        );
      }
    }
  }

  private drawHospitalKnight(view: Graphics, phase: HospitalKnightPhase): void {
    view.clear();
    const accent = phase === 1 ? 0xfff3b0 : 0x68e1fd;
    view
      .ellipse(0, 0, 58, 42)
      .fill(0x232936)
      .stroke({ color: 0x0b0f16, width: 4, alpha: 0.95 })
      .ellipse(0, 0, 42, 28)
      .fill(0x3a4252)
      .stroke({ color: accent, width: 4, alpha: 0.9 })
      .circle(0, 0, 16)
      .fill({ color: accent, alpha: 0.72 })
      .circle(0, 0, 7)
      .fill(0xd9f7ff)
      .rect(-72, -8, 144, 16)
      .fill({ color: 0xcbd5e1, alpha: 0.9 })
      .rect(-8, -72, 16, 144)
      .fill({ color: 0xcbd5e1, alpha: 0.9 })
      .poly([54, -10, 120, 0, 54, 10, 34, 0])
      .fill(0xfff3b0)
      .stroke({ color: 0x111827, width: 2 });
    if (phase === 2) {
      view.circle(0, 0, 76).stroke({ color: 0x68e1fd, alpha: 0.42, width: 5 });
      view.circle(0, 0, 96).stroke({ color: 0xd9f7ff, alpha: 0.22, width: 3 });
      view.rect(-92, -5, 28, 10).fill(0xd9f7ff);
    }
  }

  private spawnBoneEnemy(x: number, y: number, kind: "bone" | "boneSoldier"): EnemyActor {
    const view = new Graphics();
    this.drawBoneEnemy(view, kind);
    view.position.set(x, y);
    this.world.addChild(view);
    const enemy: EnemyActor = {
      view,
      kind,
      x,
      y,
      health: kind === "boneSoldier" ? 54 : 18,
      speed: kind === "boneSoldier" ? 48 : 112,
      contactDamageElapsedMs: 700,
      dashElapsedMs: 0,
      dashMs: 0,
      guardTarget: getHospitalKnightGuardRoamTarget(this.spawnSeed + Math.round(x + y)),
    };
    this.enemies.push(enemy);
    return enemy;
  }

  private drawBoneEnemy(view: Graphics, kind: "bone" | "boneSoldier", hit = false): void {
    view.clear();
    const body = hit ? 0xfff3b0 : kind === "boneSoldier" ? 0xcbd5e1 : 0xe8edf3;
    const core = kind === "boneSoldier" ? 0x68e1fd : 0xfff3b0;
    view
      .ellipse(0, 0, kind === "boneSoldier" ? 24 : 18, kind === "boneSoldier" ? 15 : 11)
      .fill(body)
      .stroke({ color: 0x6b7280, width: 2 })
      .circle(0, 0, kind === "boneSoldier" ? 7 : 4)
      .fill({ color: core, alpha: 0.78 })
      .poly([-18, -3, -35, -10, -20, 7])
      .fill(0xf1f5f9)
      .poly([-15, 9, -29, 24, -8, 14])
      .fill(0xf1f5f9)
      .poly([18, -3, 35, -10, 20, 7])
      .fill(0xf1f5f9)
      .poly([15, 9, 29, 24, 8, 14])
      .fill(0xf1f5f9);
    if (kind === "boneSoldier") {
      view.ellipse(0, 0, 34, 22).stroke({ color: 0x68e1fd, alpha: 0.45, width: 3 });
      view.poly([24, -8, 52, 0, 24, 8]).fill({ color: 0xfff3b0, alpha: 0.9 });
    }
  }

  private spawnBonePile(x: number, y: number): void {
    const view = new Graphics();
    view
      .ellipse(0, 0, 24, 10)
      .fill({ color: 0xd8dee9, alpha: 0.7 })
      .stroke({ color: 0x8d99ae, width: 1.5 })
      .rect(-18, -3, 36, 5)
      .fill({ color: 0xf1f5f9, alpha: 0.8 });
    view.position.set(x, y);
    this.world.addChild(view);
    this.bonePiles.push({ view, x, y, radius: 24 });
  }

  private updateHospitalKnight(deltaMs: number): void {
    if (!this.player) return;
    for (const knight of this.getHospitalKnights()) {
      this.updateHospitalKnightActor(knight, deltaMs);
    }
  }

  private updateHospitalKnightActor(knight: HospitalKnightActor, deltaMs: number): void {
    if (!this.player) return;
    if (!knight.aggro) {
      this.updateDormantHospitalKnight(knight, deltaMs);
      return;
    }

    const nextPhase = getHospitalKnightPhase(knight.health);
    if (nextPhase !== knight.phase) {
      knight.phase = nextPhase;
      this.drawHospitalKnight(knight.view, knight.phase);
      this.reviveBonePiles();
      this.convertNearbyBonesToSoldiers();
      this.addScreenShake(260, 7);
      this.emitState("Hospital knight phase two: bones rise as soldiers.");
    }

    knight.skillElapsedMs += deltaMs;
    knight.contactDamageElapsedMs += deltaMs;
    const seconds = deltaMs / 1000;
    const angleToPlayer = Math.atan2(this.player.y - knight.y, this.player.x - knight.x);
    const speed = knight.chargeMs > 0 ? 780 : knight.phase === 2 ? 88 : 62;
    const moveAngle = knight.chargeMs > 0 ? knight.chargeAngle : angleToPlayer;
    knight.chargeMs = Math.max(0, knight.chargeMs - deltaMs);
    const desired = {
      x: clamp(knight.x + Math.cos(moveAngle) * speed * seconds, 24, MAP_WIDTH - 24),
      y: clamp(knight.y + Math.sin(moveAngle) * speed * seconds, 24, MAP_HEIGHT - 24),
    };
    const resolved = resolveBlockedMovement(knight, desired, 44, this.getActiveBuildings());
    this.setActorPosition(knight, resolved.x, resolved.y);
    knight.view.rotation = angleToPlayer;

    if (knight.contactDamageElapsedMs >= 700 && distance(this.player, knight) <= 70) {
      knight.contactDamageElapsedMs = 0;
      this.applyPlayerDamage(knight.phase === 2 ? 18 : 13);
    }

    if (knight.skillElapsedMs >= knight.skillCooldownMs) {
      this.triggerHospitalKnightSkill(knight);
    }

    const soldiers = this.getActiveBoneSoldierCount();
    const shield = knight.phase === 2 && soldiers > 0 ? " IMMUNE" : "";
    knight.label.position.set(knight.x - 92, knight.y - 84);
    knight.label.text = `${HOSPITAL_KNIGHT_DEFINITION.name} ${Math.ceil(knight.health)}/${knight.maxHealth}${shield}`;
  }

  private updateDormantHospitalKnight(knight: HospitalKnightActor, deltaMs: number): void {
    if (!this.player) return;
    if (shouldHospitalKnightAggro(distance(this.player, knight), false)) {
      this.aggroHospitalKnight(knight);
      return;
    }
    const seconds = deltaMs / 1000;
    if (distance(knight, knight.guardTarget) <= 24) {
      this.spawnSeed += 1;
      knight.guardTarget = getHospitalKnightGuardRoamTarget(this.spawnSeed);
    }
    const angle = Math.atan2(knight.guardTarget.y - knight.y, knight.guardTarget.x - knight.x);
    this.setActorPosition(
      knight,
      clamp(knight.x + Math.cos(angle) * 28 * seconds, 24, MAP_WIDTH - 24),
      clamp(knight.y + Math.sin(angle) * 28 * seconds, 24, MAP_HEIGHT - 24),
    );
    knight.view.rotation = angle;
    knight.label.position.set(knight.x - 92, knight.y - 84);
    knight.label.text = `${HOSPITAL_KNIGHT_DEFINITION.name} ${Math.ceil(knight.health)}/${knight.maxHealth}`;
  }

  private aggroHospitalKnight(knight = this.hospitalKnight): void {
    if (!knight || knight.aggro) return;
    knight.aggro = true;
    knight.skillElapsedMs = 0;
    this.addScreenShake(160, 4);
    this.emitState("Hospital knight awakened: the ruined hospital is hostile.");
  }

  private triggerHospitalKnightSkill(knight: HospitalKnightActor): void {
    knight.skillElapsedMs = 0;
    if (!this.player) return;
    const skill = getNextHospitalKnightSkill(knight.phase, knight.skillCursor);
    knight.skillCursor += 1;

    if (skill === "bone-command") {
      this.castBoneCommand(knight);
    } else if (skill === "giant-sword-judgment") {
      this.castGiantSwordShackle();
    } else if (skill === "holy-lance-charge") {
      this.castHolyCharge(knight);
    } else if (skill === "royal-guard") {
      this.castRoyalGuard(knight);
    } else {
      this.castDeadFormation(knight);
    }
  }

  private castBoneCommand(knight: HospitalKnightActor): void {
    if (!this.player) return;
    const center = this.player;
    const bones: EnemyActor[] = [];
    for (let index = 0; index < HOSPITAL_KNIGHT_BONE_COMMAND_COUNT; index += 1) {
      const wave = index % 2;
      const rank = Math.floor(index / 2);
      const side = wave === 0 ? -1 : 1;
      const x = clamp(center.x + side * 390, 24, MAP_WIDTH - 24);
      const y = clamp(center.y - 210 + rank * 84, 24, MAP_HEIGHT - 24);
      const bone = this.spawnBoneEnemy(x, y, "boneSoldier");
      bone.speed = 34;
      bone.invulnerableMs = 650;
      bones.push(bone);
      this.drawBoneFormationMarker(x, y, wave);
    }
    for (const [index, bone] of bones.entries()) {
      const delay = index % 2 === 0 ? 650 : 1120;
      window.setTimeout(() => {
        if (!this.player || !this.enemies.includes(bone)) return;
        bone.dashAngle = Math.atan2(this.player.y - bone.y, this.player.x - bone.x);
        bone.dashMs = 760;
        bone.dashSpeed = HOSPITAL_KNIGHT_BONE_COMMAND_DASH_SPEED;
        bone.dashElapsedMs = 0;
      }, delay);
    }
    this.spawnHitSparks(knight.x, knight.y, 0xd9f7ff, 16);
    this.emitState("Bone Knight: skeleton command.");
  }

  private castRoyalGuard(knight: HospitalKnightActor): void {
    if (!this.player) return;
    if (shouldConvertZombieToBoneSoldier(knight.holyShroudCasts)) {
      knight.holyShroudCasts += 1;
      this.convertNearbyZombiesToBoneSoldiers(knight, HOSPITAL_KNIGHT_ROYAL_GUARD_COUNT);
    }
    const existing = this.enemies.filter((enemy) => enemy.kind === "boneSoldier").slice(0, HOSPITAL_KNIGHT_ROYAL_GUARD_COUNT);
    while (existing.length < HOSPITAL_KNIGHT_ROYAL_GUARD_COUNT) {
      const angle = (Math.PI * 2 * existing.length) / HOSPITAL_KNIGHT_ROYAL_GUARD_COUNT;
      existing.push(this.spawnBoneEnemy(knight.x + Math.cos(angle) * 170, knight.y + Math.sin(angle) * 170, "boneSoldier"));
    }
    for (const [index, guard] of existing.entries()) {
      const angle = (Math.PI * 2 * index) / HOSPITAL_KNIGHT_ROYAL_GUARD_COUNT;
      this.setActorPosition(guard, clamp(knight.x + Math.cos(angle) * 165, 24, MAP_WIDTH - 24), clamp(knight.y + Math.sin(angle) * 165, 24, MAP_HEIGHT - 24));
      guard.health = Math.max(guard.health, 72);
      guard.speed = 38;
      guard.invulnerableMs = 450;
      this.drawBoneEnemy(guard.view, "boneSoldier");
    }
    this.drawHolyShroud(knight);
    this.emitState("Bone Knight: royal guard.");
  }

  private castDeadFormation(knight: HospitalKnightActor): void {
    if (!this.player) return;
    const center = this.player;
    for (let lane = 0; lane < HOSPITAL_KNIGHT_DEAD_FORMATION_LANES; lane += 1) {
      const angle = (Math.PI * 2 * lane) / HOSPITAL_KNIGHT_DEAD_FORMATION_LANES;
      for (let index = 0; index < 5; index += 1) {
        const sideOffset = (index - 2) * 46;
        const spawn = {
          x: clamp(center.x + Math.cos(angle) * 620 + Math.cos(angle + Math.PI / 2) * sideOffset, 24, MAP_WIDTH - 24),
          y: clamp(center.y + Math.sin(angle) * 620 + Math.sin(angle + Math.PI / 2) * sideOffset, 24, MAP_HEIGHT - 24),
        };
        const bone = this.spawnBoneEnemy(spawn.x, spawn.y, "boneSoldier");
        bone.speed = 28;
        bone.invulnerableMs = 500;
        window.setTimeout(() => {
          if (!this.player || !this.enemies.includes(bone)) return;
          bone.dashAngle = Math.atan2(this.player.y - bone.y, this.player.x - bone.x);
          bone.dashMs = 1150;
          bone.dashSpeed = 540;
        }, 650 + lane * 180);
      }
    }
    const angle = Math.atan2(center.y - knight.y, center.x - knight.x);
    this.spawnHospitalChargeTelegraph(knight, angle);
    window.setTimeout(() => {
      if (!this.getHospitalKnights().includes(knight)) return;
      knight.chargeAngle = angle;
      knight.chargeMs = 920;
      this.spawnHolyLanceSpikes(knight, angle);
    }, 760);
    this.addScreenShake(240, 6);
    this.emitState("Bone Knight: dead formation.");
  }

  private castGiantSwordShackle(): void {
    if (!this.player) return;
    const x = this.player.x;
    const y = this.player.y;
    const radius = 128;
    const warning = new Graphics();
    warning
      .circle(0, 0, radius)
      .fill({ color: 0xd90429, alpha: 0.2 })
      .stroke({ color: 0xfff3b0, alpha: 0.88, width: 3 })
      .rect(-12, -180, 24, 210)
      .fill({ color: 0xf8fafc, alpha: 0.45 });
    warning.position.set(x, y);
    this.world.addChild(warning);
    window.setTimeout(() => {
      if (!warning.destroyed) {
        this.world.removeChild(warning);
        warning.destroy();
      }
      this.drawGiantSwordImpact(x, y, radius);
      if (this.player && distance(this.player, { x, y }) <= radius) {
        this.applyPlayerDamage(36);
        this.startPlayerTrap(x, y, radius, GIANT_SWORD_TRAP_MS);
      }
    }, 900);
    this.emitState("Hospital knight casts Giant Sword Shackle.");
  }

  private drawGiantSwordImpact(x: number, y: number, radius: number): void {
    const view = new Graphics();
    view
      .rect(-10, -210, 20, 250)
      .fill({ color: 0xf8fafc, alpha: 0.92 })
      .poly([0, 64, -32, 16, 32, 16])
      .fill(0xfff3b0)
      .circle(0, 0, radius)
      .stroke({ color: 0xfff3b0, alpha: 0.75, width: 4 });
    view.position.set(x, y);
    this.world.addChild(view);
    gsap.to(view, {
      alpha: 0,
      duration: 0.42,
      onComplete: () => {
        this.world.removeChild(view);
        view.destroy();
      },
    });
    this.addScreenShake(260, 8);
  }

  private startPlayerTrap(x: number, y: number, radius: number, lifeMs: number): void {
    if (this.playerTrap) {
      this.world.removeChild(this.playerTrap.view);
      this.playerTrap.view.destroy();
    }
    const view = new Graphics();
    view
      .circle(0, 0, radius)
      .fill({ color: 0x68e1fd, alpha: 0.08 })
      .stroke({ color: 0xd9f7ff, alpha: 0.8, width: 4 })
      .circle(0, 0, radius - 18)
      .stroke({ color: 0xfff3b0, alpha: 0.55, width: 2 });
    view.position.set(x, y);
    this.world.addChild(view);
    this.playerTrap = { view, x, y, radius, lifeMs };
    this.emitState("Giant Sword Shackle: player trapped for 3 seconds.");
  }

  private updatePlayerTrap(deltaMs: number): void {
    if (!this.playerTrap) return;
    this.playerTrap.lifeMs -= deltaMs;
    this.playerTrap.view.alpha = Math.max(0.18, this.playerTrap.lifeMs / 10000);
    if (this.playerTrap.lifeMs > 0) return;
    this.world.removeChild(this.playerTrap.view);
    this.playerTrap.view.destroy();
    this.playerTrap = undefined;
  }

  private castHolyCharge(knight: HospitalKnightActor): void {
    if (!this.player) return;
    const angle = Math.atan2(this.player.y - knight.y, this.player.x - knight.x);
    knight.chargeAngle = angle;
    knight.chargeMs = knight.phase === 2 ? 820 : 620;
    this.spawnHospitalChargeTelegraph(knight, angle);
    window.setTimeout(() => {
      if (!this.getHospitalKnights().includes(knight)) return;
      this.spawnHolyLanceSpikes(knight, angle);
    }, 520);
    for (const bone of this.enemies) {
      if (bone.kind === "zombie" || distance(bone, this.player) > 520) continue;
      bone.dashAngle = Math.atan2(this.player.y - bone.y, this.player.x - bone.x);
      bone.dashMs = bone.kind === "boneSoldier" ? 340 : 240;
      bone.dashSpeed = bone.kind === "boneSoldier" ? 620 : 520;
      bone.dashElapsedMs = 0;
    }
    this.emitState("Bone Knight: holy lance charge.");
  }

  private spawnHolyLanceSpikes(knight: HospitalKnightActor, angle: number): void {
    const normal = angle + Math.PI / 2;
    for (let index = 0; index < HOSPITAL_KNIGHT_HOLY_LANCE_SPIKES; index += 1) {
      const forward = 170 + index * 115;
      const side = index % 2 === 0 ? -82 : 82;
      const x = clamp(knight.x + Math.cos(angle) * forward + Math.cos(normal) * side, 24, MAP_WIDTH - 24);
      const y = clamp(knight.y + Math.sin(angle) * forward + Math.sin(normal) * side, 24, MAP_HEIGHT - 24);
      this.spawnDelayedBossBlast(x, y, 78, HOSPITAL_KNIGHT_HOLY_LANCE_SPIKE_DAMAGE, 160, 0xd9f7ff, "bone spike");
    }
  }

  private drawBoneFormationMarker(x: number, y: number, wave: number): void {
    const view = new Graphics();
    const color = wave === 0 ? 0xd9f7ff : 0xfff3b0;
    view
      .rect(-28, -22, 56, 44)
      .fill({ color, alpha: 0.1 })
      .stroke({ color, alpha: 0.62, width: 2 })
      .moveTo(-36, 0)
      .lineTo(36, 0)
      .stroke({ color, alpha: 0.55, width: 3 });
    view.position.set(x, y);
    this.world.addChild(view);
    gsap.to(view, {
      alpha: 0,
      duration: 1.1,
      onComplete: () => {
        this.world.removeChild(view);
        view.destroy();
      },
    });
  }

  private spawnHospitalChargeTelegraph(knight: HospitalKnightActor, angle: number): void {
    const view = new Graphics();
    view
      .rect(0, -70, 760, 140)
      .fill({ color: 0xfff3b0, alpha: 0.24 })
      .stroke({ color: 0xd9f7ff, alpha: 0.8, width: 3 });
    view.position.set(knight.x, knight.y);
    view.rotation = angle;
    this.world.addChild(view);
    this.bossTelegraphs.push({ view, lifeMs: 520, maxLifeMs: 520 });
  }

  private reviveBonePiles(): void {
    const piles = [...this.bonePiles];
    for (const pile of piles) {
      this.world.removeChild(pile.view);
      pile.view.destroy();
      this.spawnBoneEnemy(pile.x, pile.y, "boneSoldier");
    }
    this.bonePiles = [];
  }

  private convertNearbyBonesToSoldiers(): void {
    for (const enemy of this.enemies) {
      if (enemy.kind !== "bone") continue;
      enemy.kind = "boneSoldier";
      enemy.health = Math.max(enemy.health, 54);
      enemy.speed = 48;
      this.drawBoneEnemy(enemy.view, "boneSoldier");
    }
  }

  private convertNearbyZombiesToBoneSoldiers(origin: Actor, count: number): void {
    const zombies = this.enemies
      .filter((enemy) => enemy.kind === "zombie" && distance(enemy, origin) <= 1100)
      .sort((a, b) => distance(a, origin) - distance(b, origin))
      .slice(0, count);
    for (const enemy of zombies) {
      enemy.kind = "boneSoldier";
      enemy.health = 54;
      enemy.speed = 48;
      enemy.dashElapsedMs = 0;
      enemy.dashMs = 0;
      this.destroyEnemyStoryVisual(enemy);
      this.drawBoneEnemy(enemy.view, "boneSoldier");
    }
  }

  private drawHolyShroud(knight: HospitalKnightActor): void {
    const view = new Graphics();
    view
      .circle(0, 0, 520)
      .fill({ color: 0xd9f7ff, alpha: 0.1 })
      .stroke({ color: 0xfff3b0, alpha: 0.7, width: 5 });
    view.position.set(knight.x, knight.y);
    this.world.addChild(view);
    gsap.to(view.scale, { x: 1.55, y: 1.55, duration: 0.45 });
    gsap.to(view, {
      alpha: 0,
      duration: 0.58,
      onComplete: () => {
        this.world.removeChild(view);
        view.destroy();
      },
    });
  }

  private getActiveBoneSoldierCount(): number {
    return this.enemies.filter((enemy) => enemy.kind === "boneSoldier").length;
  }

  private spawnInitialBosses(): void {
    for (const bossId of getInitialRoamingBossIds()) {
      this.spawnBoss(bossId);
    }
  }

  private spawnBossRushScenario(): void {
    if (!this.player || !this.options.bossRushScenarioId) return;
    const scenario = getBossRushScenario(this.options.bossRushScenarioId);
    let slot = 0;
    const nextPosition = (radius = 640): { x: number; y: number } => {
      const angle = (Math.PI * 2 * slot) / Math.max(6, scenario.entries.reduce((sum, entry) => sum + entry.count, 0));
      slot += 1;
      return {
        x: clamp(PLAYER_START.x + Math.cos(angle) * radius, 120, MAP_WIDTH - 120),
        y: clamp(PLAYER_START.y + Math.sin(angle) * radius, 120, MAP_HEIGHT - 120),
      };
    };

    for (const entry of scenario.entries) {
      for (let index = 0; index < entry.count; index += 1) {
        const position = nextPosition(entry.kind === "eliteBone" ? 420 : 760);
        if (entry.kind === "roamingBoss" && entry.bossId) {
          const boss = this.spawnBossInstance(entry.bossId, {
            ...position,
            health: entry.health,
            mode: "chase",
          });
          if (boss) {
            boss.roamTarget = { x: this.player.x, y: this.player.y };
          }
        } else if (entry.kind === "finalBoss") {
          this.spawnFinalBoss({ ...position, health: entry.health, phase: entry.phase });
        } else if (entry.kind === "hospitalKnight") {
          this.spawnHospitalKnight({ ...position, health: entry.health, phase: entry.phase as HospitalKnightPhase | undefined, aggro: true });
        } else if (entry.kind === "eliteBone") {
          this.spawnBoneEnemy(position.x, position.y, "boneSoldier");
        }
      }
    }

    this.emitState("Boss Rush: " + scenario.name);
  }

  private spawnBoss(bossId: BossId): void {
    if (!this.player || this.bosses.some((boss) => boss.bossId === bossId)) return;
    this.spawnBossInstance(bossId);
  }

  private spawnBossInstance(
    bossId: BossId,
    overrides: { x?: number; y?: number; health?: number; mode?: BossMode } = {},
  ): BossActor | undefined {
    if (!this.player) return undefined;
    const definition = BOSS_DEFINITIONS.find((boss) => boss.id === bossId);
    if (!definition) return undefined;
    const position = {
      x: overrides.x ?? this.findOpenBossSpawnPosition(bossId).x,
      y: overrides.y ?? this.findOpenBossSpawnPosition(bossId).y,
    };
    const view = new Graphics();
    this.drawBossSprite(view, bossId);
    view.position.set(position.x, position.y);
    this.world.addChild(view);
    const label = new Text({
      text: "",
      style: new TextStyle({ fill: "#fff3b0", fontFamily: "Arial", fontSize: 16 }),
    });
    label.position.set(position.x - 64, position.y - 62);
    this.world.addChild(label);
    const runtimeStats = ROAMING_BOSS_RUNTIME_STATS[bossId];
    const maxHealth = overrides.health ?? runtimeStats.maxHealth;
    const boss: BossActor = {
      view,
      label,
      bossId,
      x: position.x,
      y: position.y,
      maxHealth,
      health: maxHealth,
      mode: overrides.mode ?? "roam",
      roamTarget: this.getNextRoamTarget({ bossId, x: position.x, y: position.y } as BossActor),
      skillElapsedMs: 0,
      skillCooldownMs: runtimeStats.skillCooldownMs,
      advancedSkillCursor: 0,
      chargeMs: 0,
      chargeAngle: 0,
      chargeDamage: 22,
      chargeSpeed: undefined,
      windupMs: 0,
      pendingChargeAngle: 0,
      contactDamageElapsedMs: 700,
      beastmasterFrenzyUsed: false,
      chefMeatGrinderUsed: false,
      chefMeatGrinderMs: 0,
      chefMeatGrinderTickMs: 0,
      chefMeatGrinderAngle: 0,
      chefAirborne: false,
      clownSpiralKnifeMs: 0,
      clownSpiralKnifeTickMs: 0,
      clownSpiralKnifeAngle: 0,
      courierCitywideMs: 0,
      courierCitywideTickMs: 0,
    };
    this.bosses.push(boss);
    return boss;
  }

  private drawBossSprite(view: Graphics, bossId: BossId): void {
    const theme = BOSS_VISUAL_THEMES[bossId];
    view.clear();
    view
      .ellipse(0, 0, 28, 36)
      .fill(theme.bodyColor)
      .stroke({ color: theme.accentColor, alpha: 0.95, width: 4 });
    view.circle(28, -2, 17).fill(theme.armorColor).stroke({ color: 0xfff3b0, alpha: 0.7, width: 2 });
    view.rect(-18, -34, 16, 20).fill(theme.armorColor);
    view.rect(-18, 14, 16, 20).fill(theme.armorColor);
    view.rect(0, -40, 13, 18).fill(theme.accentColor);
    view.rect(0, 22, 13, 18).fill(theme.accentColor);

    if (bossId === "chef") {
      view.rect(3, -24, 18, 48).fill({ color: 0xf1faee, alpha: 0.78 });
      view.ellipse(43, 0, CHEF_WOK_MODEL_RADIUS, CHEF_WOK_MODEL_RADIUS * 0.76)
        .fill({ color: 0x2b2f33, alpha: 0.94 })
        .stroke({ color: 0xc8d5d9, width: 4 });
      view.circle(35, -7, 5).fill({ color: 0xf1faee, alpha: 0.52 });
      view.rect(66, -5, 30, 10).fill(0x5a3d2b).stroke({ color: 0xfff3b0, alpha: 0.7, width: 2 });
      view.rect(20, -30, 8, 60).fill(theme.weaponColor).stroke({ color: 0x4a1717, width: 2 });
      view.poly([28, -34, 48, -22, 31, -5]).fill(0xc8d5d9);
      view.rect(-30, -12, 13, 24).fill(0x6b1f1f);
    }

    if (bossId === "clown") {
      view.circle(33, -4, 8).fill(0xfff3b0);
      view.circle(34, -5, 3).fill(0xd90429);
      view.circle(-27, -22, 8).fill(0xff4d6d);
      view.circle(-30, 22, 9).fill(0x68e1fd);
      view.rect(42, -18, 6, 36).fill(theme.weaponColor);
    }

    if (bossId === "courier") {
      view.roundRect(-32, -24, 17, 48, 4).fill(0x3a2c22).stroke({ color: theme.accentColor, width: 2 });
      view.rect(26, -27, 18, 17).fill(theme.weaponColor);
      view.rect(26, 10, 18, 17).fill(theme.weaponColor);
      view.rect(42, -19, 18, 8).fill(0x2b2520);
      view.rect(42, 11, 18, 8).fill(0x2b2520);
    }

    if (bossId === "beastmaster") {
      view.circle(-36, -20, 10).fill(0xa7c957);
      view.circle(-38, 20, 10).fill(0xa7c957);
      view.rect(34, -32, 6, 64).fill(theme.weaponColor);
    }

    if (bossId === "plague-doctor") {
      view.poly([28, -6, 62, 0, 28, 8]).fill(0xc8d5d9).stroke({ color: theme.accentColor, width: 2 });
      view.circle(10, -13, 5).fill(theme.weaponColor);
      view.circle(10, 13, 5).fill(theme.weaponColor);
    }

    if (bossId === "tesla-engineer") {
      view.circle(38, -22, 11).fill(theme.weaponColor).stroke({ color: theme.accentColor, width: 2 });
      view.circle(38, 22, 11).fill(theme.weaponColor).stroke({ color: theme.accentColor, width: 2 });
      view.moveTo(35, -18).lineTo(23, 0).lineTo(40, 18).stroke({ color: theme.accentColor, width: 3 });
    }

    if (bossId === "magician") {
      view.rect(-28, -44, 56, 14).fill(theme.armorColor).stroke({ color: theme.accentColor, width: 2 });
      view.rect(-18, -70, 36, 36).fill(theme.armorColor).stroke({ color: theme.weaponColor, width: 2 });
      view.circle(34, 0, 8).fill(theme.weaponColor);
    }

    if (bossId === "war-convoy") {
      view.roundRect(-56, -38, 112, 76, 6).fill(theme.bodyColor).stroke({ color: theme.accentColor, width: 5 });
      view.roundRect(-18, -28, 44, 56, 4).fill({ color: 0x293241, alpha: 0.92 }).stroke({ color: 0xfff3b0, width: 2 });
      view.rect(34, -50, 24, 28).fill(theme.weaponColor).stroke({ color: 0xfff3b0, width: 2 });
      view.rect(34, 22, 24, 28).fill(theme.weaponColor).stroke({ color: 0xfff3b0, width: 2 });
      view.rect(-64, -18, 18, 36).fill(0x8d99ae).stroke({ color: theme.accentColor, width: 2 });
      view.moveTo(-12, -34).lineTo(-28, -66).stroke({ color: 0xffd166, width: 3 });
      view.circle(-30, -70, 5).fill(0xff4d6d);
      view.circle(-42, -40, 10).fill(0x111111);
      view.circle(-42, 40, 10).fill(0x111111);
      view.circle(42, -40, 10).fill(0x111111);
      view.circle(42, 40, 10).fill(0x111111);
    }
  }

  private drawMagicianBossState(boss: BossActor): void {
    if (!this.isRoamingBossInvulnerable(boss)) {
      this.drawBossSprite(boss.view, boss.bossId);
      boss.view.alpha = 1;
      return;
    }
    const theme = BOSS_VISUAL_THEMES.magician;
    boss.view.clear();
    boss.view
      .ellipse(0, 10, 46, 14)
      .fill(theme.armorColor)
      .stroke({ color: theme.accentColor, alpha: 0.95, width: 4 })
      .rect(-24, -36, 48, 48)
      .fill(theme.armorColor)
      .stroke({ color: theme.weaponColor, alpha: 0.9, width: 3 })
      .rect(-28, -2, 56, 10)
      .fill(theme.accentColor);
    boss.view.alpha = 0.9;
  }

  private findOpenBossSpawnPosition(bossId: BossId): { x: number; y: number } {
    return getBossTerritorySpawnPosition(bossId);
  }

  private getNextRoamTarget(boss: Pick<BossActor, "bossId" | "x" | "y">): { x: number; y: number } {
    this.spawnSeed += 1;
    return getBossRoamTargetInTerritory(boss.bossId, this.spawnSeed);
  }

  private triggerBossSkill(boss: BossActor): void {
    boss.skillElapsedMs = 0;
    if (!this.player) return;
    let skill = getNextAdvancedBossSkill(boss.bossId, boss.advancedSkillCursor);
    boss.advancedSkillCursor += 1;
    if (
      boss.bossId === "beastmaster" &&
      skill.id === "total-frenzy" &&
      !shouldTriggerBeastmasterFrenzy({
        health: boss.health,
        maxHealth: boss.maxHealth,
        frenzyUsed: boss.beastmasterFrenzyUsed ?? false,
      })
    ) {
      skill = getNextAdvancedBossSkill(boss.bossId, boss.advancedSkillCursor);
      boss.advancedSkillCursor += 1;
    }
    if (
      boss.bossId === "chef" &&
      skill.id === "meat-grinder" &&
      !shouldTriggerChefMeatGrinder({
        health: boss.health,
        maxHealth: boss.maxHealth,
        used: boss.chefMeatGrinderUsed ?? false,
      })
    ) {
      skill = getNextAdvancedBossSkill(boss.bossId, boss.advancedSkillCursor);
      boss.advancedSkillCursor += 1;
    }
    this.triggerAdvancedBossSkill(boss, skill);
    return;
    if (boss.bossId === "chef") {
      this.throwChiliOil(boss);
      this.emitState(this.getBossName(boss.bossId) + " starts a charge.");
      return;
    }
    if (boss.bossId === "clown") {
      for (let index = 0; index < 12; index += 1) {
        const angle = (Math.PI * 2 * index) / 12;
        this.spawnKnifeHazard(boss.x, boss.y, angle, 440);
      }
      this.emitState(this.getBossName(boss.bossId) + " releases a ring barrage.");
      return;
    }
    const angle = Math.atan2(this.player!.y - boss.y, this.player!.x - boss.x);
    boss.mode = "windup";
    boss.windupMs = 650;
    boss.pendingChargeAngle = angle;
    this.spawnChargeTelegraph(boss, angle);
    this.emitState(this.getBossName(boss.bossId) + " throws explosive parcels.");
  }

  private triggerAdvancedBossSkill(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    if (skill.id === "chili-oil-cover") {
      this.spawnChefChiliOilCover(boss, skill);
    } else if (skill.id === "crash-landing") {
      this.spawnChefCrashLanding(boss, skill);
    } else if (skill.id === "meat-grinder") {
      if (boss.chefMeatGrinderUsed) return;
      this.startChefMeatGrinder(boss);
    } else if (skill.id === "hidden-magic-box") {
      this.spawnHiddenMagicBox(boss, skill);
    } else if (skill.id === "knife-burst") {
      this.spawnClownKnifeBurst(boss, skill);
    } else if (skill.id === "surprise-drop") {
      this.spawnClownSurpriseDrop(boss, skill);
    } else if (skill.id === "spiral-knife-ultimate") {
      this.startClownSpiralKnives(boss, skill);
    } else if (skill.id === "delivery-route") {
      this.spawnCourierDeliveryRoute(boss, skill);
    } else if (skill.id === "explosive-parcel") {
      this.spawnCourierExplosiveParcels(skill);
    } else if (skill.id === "locker-teleport") {
      this.spawnCourierLockerTeleport(boss, skill);
    } else if (skill.id === "signature-lock") {
      this.spawnCourierSignatureLock(boss, skill);
    } else if (skill.id === "citywide-delivery") {
      this.startCourierCitywideDelivery(boss, skill);
    } else if (skill.id === "zombie-siege") {
      this.spawnBeastmasterZombieSiege(skill);
    } else if (skill.id === "hound-rush") {
      this.spawnBeastmasterHoundRush(skill);
    } else if (skill.id === "beast-unstoppable") {
      this.applyBeastmasterUnstoppable(boss, skill);
    } else if (skill.id === "stampede-command") {
      this.commandBeastmasterStampede(skill);
    } else if (skill.id === "total-frenzy") {
      if (boss.beastmasterFrenzyUsed) return;
      boss.beastmasterFrenzyUsed = true;
      this.spawnBeastmasterTotalFrenzy(boss);
    } else if (skill.id === "toxic-cloud") {
      this.spawnPlagueDoctorToxicClouds(boss, skill);
    } else if (skill.id === "infected-patients") {
      this.spawnPlagueDoctorPatients(boss, skill);
    } else if (skill.id === "sedative-dart") {
      this.firePlagueDoctorSedativeDart(boss, skill);
    } else if (skill.id === "infusion-stand") {
      this.spawnPlagueDoctorInfusionStands(boss, skill, 3);
    } else if (skill.id === "quarantine-ward") {
      this.castPlagueDoctorQuarantineWard(boss, skill);
    } else if (skill.id === "tesla-turret") {
      this.spawnTeslaEngineerTurrets(boss, skill);
    } else if (skill.id === "magnetic-mine") {
      this.spawnTeslaEngineerMagneticMines(boss, skill);
    } else if (skill.id === "electric-grid") {
      this.spawnTeslaEngineerElectricGrid(boss, skill);
    } else if (skill.id === "overload-repair") {
      this.castTeslaEngineerOverloadRepair(boss, skill);
    } else if (skill.id === "blackout-field") {
      this.castTeslaEngineerBlackoutField(boss, skill);
    } else if (skill.id === "commander-deploy") {
      this.castWarConvoyCommanderDeploy(boss, skill);
    } else if (skill.id === "armored-corridor") {
      this.castWarConvoyArmoredCorridor(boss, skill);
    } else if (skill.id === "escort-crossfire") {
      this.castWarConvoyEscortCrossfire(boss, skill);
    } else if (skill.id === "ammo-truck-sacrifice") {
      this.castWarConvoyAmmoTruckSacrifice(boss, skill);
    } else if (skill.id === "iron-encirclement") {
      this.castWarConvoyIronEncirclement(boss, skill);
    } else if (skill.id === "curtain-shift") {
      this.castMagicianCurtainShift(boss, skill);
    } else if (skill.id === "spotlight-judgement") {
      this.castMagicianSpotlightJudgement(boss, skill);
    } else if (skill.id === "hat-maze") {
      this.castMagicianHatMaze(boss, skill);
    } else if (skill.id === "mirror-hall") {
      this.castMagicianMirrorHall(boss, skill);
    } else if (skill.id === "finale-theater") {
      this.castMagicianFinaleTheater(boss, skill);
    } else {
      this.triggerGenericBossSkill(boss, skill);
    }
    this.emitState(this.getBossName(boss.bossId) + ": " + skill.name);
  }

  private triggerGenericBossSkill(boss: BossActor, skill: AdvancedBossSkill): void {
    if (skill.role === "summon") {
      this.spawnGenericBossSummons(boss, skill, boss.bossId === "beastmaster" ? 6 : 4);
      return;
    }
    if (skill.role === "charge") {
      this.startBossCharge(boss, skill.warningMs, boss.bossId === "war-convoy" ? 860 : 560, skill.damage, BOSS_VISUAL_THEMES[boss.bossId].accentColor);
      return;
    }
    if (skill.role === "projectile") {
      this.spawnKnifeGala(boss, skill);
      return;
    }
    if (skill.role === "lock") {
      this.spawnDeliveryLock(boss, skill);
      return;
    }
    const target = this.player ?? boss;
    const spread = boss.bossId === "war-convoy" ? [-180, 0, 180] : [0];
    for (const offset of spread) {
      const x = clamp(target.x + offset, 24, MAP_WIDTH - 24);
      const y = clamp(target.y + (spread.length > 1 ? (Math.random() - 0.5) * 120 : 0), 24, MAP_HEIGHT - 24);
      this.spawnDelayedBossBlast(x, y, skill.radius, skill.damage, skill.warningMs, BOSS_VISUAL_THEMES[boss.bossId].accentColor, skill.name);
    }
  }

  private castWarConvoyCommanderDeploy(boss: BossActor, skill: AdvancedBossSkill): void {
    for (const vehicle of [...this.convoyVehicles].filter((candidate) => candidate.boss === boss && candidate.kind === "escort")) {
      this.detonateConvoyVehicle(vehicle);
    }
    const count = 4;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + this.spawnSeed * 0.24;
      this.createConvoyVehicle("escort", boss, angle, skill.radius, 190, 21000, skill.damage);
    }
    this.spawnSeed += 1;
    this.addScreenShake(180, 4);
  }

  private castWarConvoyArmoredCorridor(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
    this.startBossCharge(boss, skill.warningMs, 980, skill.damage, 0xff9f1c, 1250);
    const laneOffsets = [-170, 170];
    for (let step = 0; step < 8; step += 1) {
      for (const side of laneOffsets) {
        const forward = 160 + step * 110;
        const x = clamp(boss.x + Math.cos(angle) * forward + Math.cos(angle + Math.PI / 2) * side, 24, MAP_WIDTH - 24);
        const y = clamp(boss.y + Math.sin(angle) * forward + Math.sin(angle + Math.PI / 2) * side, 24, MAP_HEIGHT - 24);
        this.spawnDelayedBossBlast(x, y, 86, Math.round(skill.damage * 0.5), skill.warningMs + step * 80, 0xff9f1c, "fire corridor");
      }
    }
  }

  private castWarConvoyEscortCrossfire(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const firePoints = this.getActiveConvoyFirePoints(boss);
    const total = 28;
    for (let index = 0; index < total; index += 1) {
      const source = firePoints[index % firePoints.length];
      window.setTimeout(() => {
        if (!this.bosses.includes(boss)) return;
        const target = this.player ?? boss;
        const wobble = ((index % 7) - 3) * 0.055;
        const angle = Math.atan2(target.y - source.y, target.x - source.x) + wobble;
        this.spawnBossHazard(source.x, source.y, angle, 620, 0xffd166, 1450, 8, "bossProjectile", skill.damage);
      }, skill.warningMs + index * 42);
    }
  }

  private castWarConvoyAmmoTruckSacrifice(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const count = 3;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + this.spawnSeed * 0.31;
      const vehicle = this.createConvoyVehicle("ammo", boss, angle, skill.radius, 125, 12000, skill.damage);
      vehicle.speed = 230 + index * 24;
    }
    this.spawnSeed += 1;
  }

  private castWarConvoyIronEncirclement(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const center = { x: this.player.x, y: this.player.y };
    const count = 6;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      const x = clamp(center.x + Math.cos(angle) * 360, 24, MAP_WIDTH - 24);
      const y = clamp(center.y + Math.sin(angle) * 300, 24, MAP_HEIGHT - 24);
      this.spawnDelayedBossBlast(x, y, 116, Math.round(skill.damage * 0.55), skill.warningMs + index * 90, 0xffd166, "encirclement vehicle");
      window.setTimeout(() => {
        if (!this.bosses.includes(boss) || !this.player) return;
        const fireAngle = Math.atan2(center.y - y, center.x - x);
        this.spawnBossHazard(x, y, fireAngle, 540, 0xff9f1c, 1600, 12, "bossProjectile", 12);
      }, skill.warningMs + index * 90);
    }
    window.setTimeout(() => {
      if (!this.bosses.includes(boss) || !this.player) return;
      const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
      boss.pendingChargeAngle = angle;
      this.startBossCharge(boss, 260, 1160, skill.damage, 0xff4d6d, 950);
    }, skill.warningMs + 650);
    this.addScreenShake(360, 9);
  }

  private createConvoyVehicle(
    kind: ConvoyVehicleActor["kind"],
    boss: BossActor,
    angle: number,
    radius: number,
    health: number,
    lifeMs: number,
    damage: number,
  ): ConvoyVehicleActor {
    const x = clamp(boss.x + Math.cos(angle) * radius, 24, MAP_WIDTH - 24);
    const y = clamp(boss.y + Math.sin(angle) * radius, 24, MAP_HEIGHT - 24);
    const view = new Graphics();
    this.drawConvoyVehicle(view, kind);
    view.position.set(x, y);
    view.rotation = angle;
    this.world.addChild(view);
    const vehicle: ConvoyVehicleActor = {
      kind,
      view,
      boss,
      x,
      y,
      health,
      radius: kind === "escort" ? 32 : 36,
      lifeMs,
      tickElapsedMs: kind === "escort" ? 760 : 1200,
      damage,
      orbitAngle: angle,
      orbitRadius: radius,
      speed: kind === "ammo" ? 210 : undefined,
    };
    this.convoyVehicles.push(vehicle);
    return vehicle;
  }

  private getActiveConvoyFirePoints(boss: BossActor): { x: number; y: number }[] {
    const escorts = this.convoyVehicles.filter((vehicle) => vehicle.boss === boss && vehicle.kind === "escort");
    if (escorts.length > 0) return escorts.map((vehicle) => ({ x: vehicle.x, y: vehicle.y }));
    return [
      { x: boss.x - 80, y: boss.y - 54 },
      { x: boss.x - 80, y: boss.y + 54 },
      { x: boss.x + 80, y: boss.y - 54 },
      { x: boss.x + 80, y: boss.y + 54 },
    ];
  }

  private drawConvoyVehicle(view: Graphics, kind: ConvoyVehicleActor["kind"]): void {
    view.clear();
    view
      .roundRect(-38, -24, 76, 48, 5)
      .fill({ color: kind === "escort" ? 0x293241 : 0x3a2f24, alpha: 0.95 })
      .stroke({ color: kind === "escort" ? 0xffd166 : 0xff9f1c, alpha: 0.88, width: 3 })
      .rect(-18, -34, 36, 20)
      .fill(kind === "escort" ? 0x577590 : 0x8d99ae)
      .circle(-24, 26, 8)
      .fill(0x111111)
      .circle(24, 26, 8)
      .fill(0x111111)
      .rect(-24, -8, 48, 16)
      .fill({ color: kind === "escort" ? 0xfff3b0 : 0xffd166, alpha: 0.72 });
    if (kind === "escort") {
      view.rect(28, -10, 28, 8).fill(0xd90429);
      view.rect(28, 4, 28, 8).fill(0xd90429);
    } else {
      view.rect(-28, -6, 56, 12).fill({ color: 0xff4d6d, alpha: 0.72 });
    }
  }

  private spawnTeslaEngineerTurrets(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const count = 3;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + this.spawnSeed * 0.23;
      const x = clamp(this.player.x + Math.cos(angle) * 260, 24, MAP_WIDTH - 24);
      const y = clamp(this.player.y + Math.sin(angle) * 230, 24, MAP_HEIGHT - 24);
      this.createTeslaDevice(boss, "turret", x, y, 110, 16000);
    }
    this.spawnHitSparks(boss.x, boss.y, 0x68e1fd, 18);
    this.spawnSeed += 1;
  }

  private spawnTeslaEngineerMagneticMines(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const count = 4;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + this.spawnSeed * 0.41;
      const x = clamp(this.player.x + Math.cos(angle) * (170 + (index % 2) * 90), 24, MAP_WIDTH - 24);
      const y = clamp(this.player.y + Math.sin(angle) * (170 + (index % 2) * 90), 24, MAP_HEIGHT - 24);
      const marker = new Graphics();
      marker.circle(0, 0, skill.radius).fill({ color: 0x68e1fd, alpha: 0.08 }).stroke({ color: 0xd9f7ff, alpha: 0.68, width: 3 });
      marker.position.set(x, y);
      this.world.addChild(marker);
      window.setTimeout(() => {
        if (!marker.destroyed) {
          this.world.removeChild(marker);
          marker.destroy();
        }
        if (!this.bosses.includes(boss)) return;
        this.spawnBossHazard(x, y, 0, 0, 0x68e1fd, 4200, skill.radius, "magneticMine", skill.damage);
      }, skill.warningMs);
    }
    this.spawnSeed += 1;
  }

  private spawnTeslaEngineerElectricGrid(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const nodes: TeslaDeviceActor[] = [];
    const count = 4;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.PI / 4 + this.spawnSeed * 0.13;
      const node = this.createTeslaDevice(
        boss,
        "node",
        clamp(this.player.x + Math.cos(angle) * 330, 24, MAP_WIDTH - 24),
        clamp(this.player.y + Math.sin(angle) * 270, 24, MAP_HEIGHT - 24),
        70,
        10500,
      );
      nodes.push(node);
    }
    for (let index = 0; index < nodes.length; index += 1) {
      this.createTeslaGrid(nodes[index], nodes[(index + 1) % nodes.length], skill.damage, 9500);
    }
    this.spawnSeed += 1;
  }

  private castTeslaEngineerOverloadRepair(boss: BossActor, skill: AdvancedBossSkill): void {
    const devices = this.teslaDevices.filter((device) => device.boss === boss);
    if (devices.length === 0) {
      boss.health = Math.min(boss.maxHealth, boss.health + 420);
      this.showDamageNumber(boss.x, boss.y - 50, 420, "#68e1fd", "+");
      this.spawnTeslaEngineerTurrets(boss, { ...skill, damage: 8, radius: 9999 });
      return;
    }
    for (const device of devices) {
      device.health += 65;
      device.lifeMs += 4500;
      device.tickElapsedMs = Math.max(device.tickElapsedMs, 900);
      this.spawnHitSparks(device.x, device.y, 0xd9f7ff, 10);
    }
    for (const grid of this.teslaGrids.filter((candidate) => candidate.start.boss === boss || candidate.end.boss === boss)) {
      grid.lifeMs += 3600;
      grid.damage += 2;
    }
    this.spawnDelayedBossBlast(boss.x, boss.y, skill.radius, skill.damage, skill.warningMs, 0x68e1fd, "overload repair");
  }

  private castTeslaEngineerBlackoutField(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const center = { x: this.player.x, y: this.player.y };
    const safeZones = [0, 1, 2].map((index) => {
      const angle = (Math.PI * 2 * index) / 3 + this.spawnSeed * 0.37;
      return {
        x: clamp(center.x + Math.cos(angle) * 310, 24, MAP_WIDTH - 24),
        y: clamp(center.y + Math.sin(angle) * 250, 24, MAP_HEIGHT - 24),
        radius: 105,
      };
    });
    const field = new Graphics();
    field
      .circle(0, 0, 720)
      .fill({ color: 0x05070d, alpha: 0.36 })
      .stroke({ color: 0x68e1fd, alpha: 0.72, width: 7 });
    for (const zone of safeZones) {
      field
        .circle(zone.x - center.x, zone.y - center.y, zone.radius)
        .fill({ color: 0xd9f7ff, alpha: 0.16 })
        .stroke({ color: 0xd9f7ff, alpha: 0.85, width: 4 });
    }
    field.position.set(center.x, center.y);
    this.world.addChild(field);
    this.spawnTeslaEngineerTurrets(boss, { ...skill, damage: 8 });
    this.spawnTeslaEngineerElectricGrid(boss, { ...skill, damage: 10 });
    window.setTimeout(() => {
      if (!field.destroyed) {
        this.world.removeChild(field);
        field.destroy();
      }
      if (!this.player || !this.bosses.includes(boss)) return;
      const safe = safeZones.some((zone) => distance(this.player!, zone) <= zone.radius);
      if (!safe && distance(this.player, center) <= 760) {
        this.applyPlayerDamage(skill.damage);
        this.playerSlowMs = Math.max(this.playerSlowMs, 1800);
        this.addScreenShake(420, 10);
      }
    }, 5200);
    this.spawnSeed += 1;
  }

  private createTeslaDevice(boss: BossActor, kind: "turret" | "node", x: number, y: number, health: number, lifeMs: number): TeslaDeviceActor {
    const view = new Graphics();
    this.drawTeslaDevice(view, kind);
    view.position.set(x, y);
    this.world.addChild(view);
    const device: TeslaDeviceActor = {
      view,
      kind,
      boss,
      x,
      y,
      health,
      radius: kind === "turret" ? 32 : 26,
      lifeMs,
      tickElapsedMs: kind === "turret" ? 900 : 0,
    };
    this.teslaDevices.push(device);
    return device;
  }

  private createTeslaGrid(start: TeslaDeviceActor, end: TeslaDeviceActor, damage: number, lifeMs: number): void {
    const view = new Graphics();
    this.world.addChild(view);
    this.teslaGrids.push({
      view,
      start,
      end,
      lifeMs,
      tickElapsedMs: 420,
      damage,
    });
  }

  private drawTeslaDevice(view: Graphics, kind: "turret" | "node"): void {
    view.clear();
    if (kind === "turret") {
      view
        .rect(-24, -18, 48, 36)
        .fill({ color: 0x1f2937, alpha: 0.94 })
        .stroke({ color: 0x68e1fd, alpha: 0.9, width: 3 })
        .rect(10, -6, 38, 12)
        .fill(0xc8d5d9)
        .circle(0, 0, 10)
        .fill(0x68e1fd);
      return;
    }
    view
      .circle(0, 0, 24)
      .fill({ color: 0x111827, alpha: 0.92 })
      .stroke({ color: 0xd9f7ff, alpha: 0.86, width: 3 })
      .circle(0, 0, 9)
      .fill(0x68e1fd)
      .rect(-4, -42, 8, 84)
      .fill({ color: 0xc8d5d9, alpha: 0.74 });
  }

  private spawnPlagueDoctorToxicClouds(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const lowHealth = boss.health <= (skill.lowHealthThreshold ?? 0);
    const count = lowHealth ? 5 : 3;
    for (let index = 0; index < count; index += 1) {
      const angle = this.spawnSeed * 0.71 + (Math.PI * 2 * index) / count;
      const ring = index === 0 ? 0 : 150 + (index % 2) * 115;
      const x = clamp(this.player.x + Math.cos(angle) * ring, 24, MAP_WIDTH - 24);
      const y = clamp(this.player.y + Math.sin(angle) * ring, 24, MAP_HEIGHT - 24);
      this.spawnDelayedBossBlast(x, y, skill.radius + (lowHealth ? 45 : 0), 1, skill.warningMs, 0xa7c957, "toxic cloud", () =>
        this.spawnToxicCloud(x, y, skill.radius + (lowHealth ? 70 : 25), lowHealth ? (skill.lowHealthDamage ?? skill.damage) : skill.damage, lowHealth ? 7200 : 5600),
      );
    }
    this.spawnSeed += 1;
  }

  private spawnPlagueDoctorPatients(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const count = 7;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + this.spawnSeed * 0.17;
      const x = clamp(boss.x + Math.cos(angle) * (210 + (index % 3) * 42), 24, MAP_WIDTH - 24);
      const y = clamp(boss.y + Math.sin(angle) * (210 + (index % 3) * 42), 24, MAP_HEIGHT - 24);
      const patient = this.spawnEnemyActor(x, y, "zombie", 42, 42);
      patient.plaguePatient = true;
      patient.contactDamageElapsedMs = 700;
      this.drawPlaguePatient(patient.view);
    }
    this.spawnHitSparks(boss.x, boss.y, 0xa7c957, 18);
  }

  private firePlagueDoctorSedativeDart(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
    this.spawnBossHazard(boss.x, boss.y, angle, 560, 0xa7c957, 1800, 12, "sedativeDart", skill.damage);
    this.spawnHitSparks(boss.x, boss.y, 0xc8d5d9, 8);
  }

  private spawnPlagueDoctorInfusionStands(boss: BossActor, skill: AdvancedBossSkill, count: number): void {
    if (!this.player) return;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + this.spawnSeed * 0.31;
      const x = clamp(this.player.x + Math.cos(angle) * skill.radius, 24, MAP_WIDTH - 24);
      const y = clamp(this.player.y + Math.sin(angle) * skill.radius, 24, MAP_HEIGHT - 24);
      const view = new Graphics();
      this.drawInfusionStand(view);
      view.position.set(x, y);
      this.world.addChild(view);
      this.infusionStands.push({
        view,
        boss,
        x,
        y,
        health: 90,
        radius: 28,
        lifeMs: 12000,
        tickElapsedMs: 1000,
      });
      this.spawnToxicCloud(x, y, 76, Math.max(3, Math.round(skill.damage * 0.5)), 2200);
    }
    this.spawnSeed += 1;
  }

  private castPlagueDoctorQuarantineWard(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const center = { x: this.player.x, y: this.player.y };
    const radius = 520;
    const ward = new Graphics();
    ward
      .circle(0, 0, radius)
      .fill({ color: 0x142315, alpha: 0.1 })
      .stroke({ color: 0xa7c957, alpha: 0.88, width: 8 })
      .circle(0, 0, radius - 64)
      .stroke({ color: 0xc8d5d9, alpha: 0.28, width: 3 });
    ward.position.set(center.x, center.y);
    this.world.addChild(ward);
    this.spawnPlagueDoctorInfusionStands(boss, { ...skill, radius: 300, damage: 10 }, 3);
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10;
      const patient = this.spawnEnemyActor(
        clamp(center.x + Math.cos(angle) * 390, 24, MAP_WIDTH - 24),
        clamp(center.y + Math.sin(angle) * 390, 24, MAP_HEIGHT - 24),
        "zombie",
        36,
        48,
      );
      patient.plaguePatient = true;
      this.drawPlaguePatient(patient.view);
    }
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12;
      this.spawnToxicCloud(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius, 92, 10, 8200);
    }
    window.setTimeout(() => {
      if (!ward.destroyed) {
        this.world.removeChild(ward);
        ward.destroy();
      }
      if (!this.player || !this.bosses.includes(boss)) return;
      const activeStands = this.infusionStands.filter((stand) => stand.boss === boss && distance(stand, center) <= radius + 60).length;
      if (activeStands > 0 && distance(this.player, center) <= radius) {
        this.applyPlayerDamage(skill.damage + activeStands * 6);
        this.playerSlowMs = Math.max(this.playerSlowMs, 2400);
        this.addScreenShake(360, 9);
      }
    }, 8200);
    this.addScreenShake(220, 5);
  }

  private spawnToxicCloud(x: number, y: number, radius: number, damage: number, lifeMs: number): void {
    const view = new Graphics();
    view
      .circle(0, 0, radius)
      .fill({ color: 0x4f772d, alpha: 0.22 })
      .stroke({ color: 0xa7c957, alpha: 0.58, width: 4 });
    for (let index = 0; index < 9; index += 1) {
      const angle = (Math.PI * 2 * index) / 9;
      view.circle(Math.cos(angle) * radius * 0.48, Math.sin(angle) * radius * 0.42, radius * 0.12).fill({ color: 0xa7c957, alpha: 0.16 });
    }
    view.position.set(clamp(x, 24, MAP_WIDTH - 24), clamp(y, 24, MAP_HEIGHT - 24));
    this.world.addChild(view);
    this.bossHazards.push({
      view,
      kind: "toxicCloud",
      x: view.position.x,
      y: view.position.y,
      radius,
      lifeMs,
      damage,
      tickElapsedMs: 520,
      expiresIntoFire: false,
      velocityX: 0,
      velocityY: 0,
    });
  }

  private spawnMedicineMist(x: number, y: number): void {
    const radius = 130;
    const view = new Graphics();
    view
      .circle(0, 0, radius)
      .fill({ color: 0xc8d5d9, alpha: 0.14 })
      .stroke({ color: 0xa7c957, alpha: 0.44, width: 3 })
      .circle(0, 0, 32)
      .fill({ color: 0xa7c957, alpha: 0.16 });
    view.position.set(x, y);
    this.world.addChild(view);
    this.bossHazards.push({
      view,
      kind: "medicineMist",
      x,
      y,
      radius,
      lifeMs: 5200,
      damage: 0,
      tickElapsedMs: 700,
      expiresIntoFire: false,
      velocityX: 0,
      velocityY: 0,
    });
  }

  private healActorsNear(x: number, y: number, radius: number, amount: number): void {
    for (const enemy of this.enemies) {
      if (distance(enemy, { x, y }) > radius) continue;
      enemy.health += amount;
      this.showDamageNumber(enemy.x, enemy.y - 24, amount, "#a7c957", "+");
    }
    for (const boss of this.bosses) {
      if (distance(boss, { x, y }) > radius + 34) continue;
      boss.health = Math.min(boss.maxHealth, boss.health + amount * 3);
      this.showDamageNumber(boss.x, boss.y - 46, amount * 3, "#a7c957", "+");
    }
  }

  private drawInfusionStand(view: Graphics): void {
    view.clear();
    view
      .rect(-4, -54, 8, 102)
      .fill({ color: 0xc8d5d9, alpha: 0.94 })
      .circle(0, -62, 10)
      .fill(0xa7c957)
      .rect(-28, -18, 56, 36)
      .fill({ color: 0x142315, alpha: 0.86 })
      .stroke({ color: 0xa7c957, alpha: 0.82, width: 3 })
      .circle(-12, 0, 8)
      .fill(0x4f772d)
      .circle(12, 0, 8)
      .fill(0xc8d5d9);
  }

  private drawPlaguePatient(view: Graphics): void {
    this.drawZombieEnemy(view);
    view.circle(0, -18, 6).fill({ color: 0xa7c957, alpha: 0.8 });
    view.circle(7, -13, 4).fill({ color: 0xc8d5d9, alpha: 0.72 });
  }

  private spawnBeastmasterZombieSiege(skill: AdvancedBossSkill): void {
    if (!this.player) return;
    this.spawnEnemiesAroundPlayer(BEASTMASTER_ZOMBIE_SIEGE_COUNT, skill.radius, (x, y) =>
      this.spawnEnemyActor(x, y, "zombie", 32, 76),
    );
    this.drawPhaseRing(this.player.x, this.player.y, skill.radius);
  }

  private spawnBeastmasterHoundRush(skill: AdvancedBossSkill): void {
    if (!this.player) return;
    this.spawnEnemiesAroundPlayer(BEASTMASTER_HOUND_COUNT, skill.radius, (x, y) => {
      const hound = this.spawnEnemyActor(x, y, "hound", BEASTMASTER_HOUND_HEALTH, BEASTMASTER_HOUND_SPEED);
      hound.dashElapsedMs = 0;
      return hound;
    });
    this.spawnHitSparks(this.player.x, this.player.y, 0xa7c957, 18);
  }

  private applyBeastmasterUnstoppable(boss: BossActor, skill: AdvancedBossSkill): void {
    for (const enemy of this.enemies) {
      if (distance(enemy, boss) > skill.radius) continue;
      enemy.invulnerableMs = Math.max(enemy.invulnerableMs ?? 0, BEASTMASTER_INVULNERABLE_MS);
      enemy.view.alpha = 0.72;
      window.setTimeout(() => {
        if (enemy.view.destroyed) return;
        enemy.view.alpha = 1;
      }, BEASTMASTER_INVULNERABLE_MS);
    }
    this.drawPhaseRing(boss.x, boss.y, skill.radius * 0.45);
  }

  private commandBeastmasterStampede(skill: AdvancedBossSkill): void {
    if (!this.player) return;
    for (const enemy of this.enemies) {
      if (distance(enemy, this.player) > skill.radius) continue;
      enemy.dashMs = 620;
      enemy.dashAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      enemy.dashSpeed = BEASTMASTER_STAMPEDE_SPEED;
    }
    this.drawPhaseRing(this.player.x, this.player.y, skill.radius * 0.5);
  }

  private spawnBeastmasterTotalFrenzy(boss: BossActor): void {
    if (!this.player) return;
    this.spawnEnemiesAroundPlayer(BEASTMASTER_TOTAL_FRENZY_COUNT, 840, (x, y) =>
      this.spawnEnemyActor(x, y, "zombie", BEASTMASTER_TOTAL_FRENZY_HEALTH, BEASTMASTER_TOTAL_FRENZY_SPEED),
    );
    this.addScreenShake(620, 10);
    this.spawnHitSparks(boss.x, boss.y, 0xff4d6d, 26);
  }

  private spawnEnemiesAroundPlayer(count: number, radius: number, spawn: (x: number, y: number) => EnemyActor): EnemyActor[] {
    if (!this.player) return [];
    const spawned: EnemyActor[] = [];
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + this.spawnSeed * 0.07;
      const ringJitter = index % 2 === 0 ? 0 : 42;
      const x = clamp(this.player.x + Math.cos(angle) * (radius + ringJitter), 24, this.getMapWidth() - 24);
      const y = clamp(this.player.y + Math.sin(angle) * (radius + ringJitter), 24, this.getMapHeight() - 24);
      spawned.push(spawn(x, y));
    }
    this.spawnSeed += 1;
    return spawned;
  }

  private spawnGenericBossSummons(boss: BossActor, skill: AdvancedBossSkill, count: number): void {
    if (!this.player) return;
    const lineSpacing = 46;
    for (let index = 0; index < count; index += 1) {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const x = clamp(this.player.x - lineSpacing + col * lineSpacing + (boss.x < this.player.x ? -190 : 190), 24, this.getMapWidth() - 24);
      const y = clamp(this.player.y - 70 + row * lineSpacing, 24, this.getMapHeight() - 24);
      this.spawnEnemyActor(
        x,
        y,
        "zombie",
        34 + Math.round(skill.damage),
        boss.bossId === "beastmaster" ? 132 : 82,
      );
    }
    this.spawnHitSparks(boss.x, boss.y, BOSS_VISUAL_THEMES[boss.bossId].accentColor, 18);
  }

  private spawnChefChiliOilCover(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    for (let index = 0; index < CHEF_CHILI_OIL_BOTTLE_COUNT; index += 1) {
      const angle = (Math.PI * 2 * index) / CHEF_CHILI_OIL_BOTTLE_COUNT + this.spawnSeed * 0.31;
      const ring = index % 2 === 0 ? CHEF_CHILI_OIL_SPREAD_RADIUS * 0.34 : CHEF_CHILI_OIL_SPREAD_RADIUS * 0.62;
      const x = clamp(this.player.x + Math.cos(angle) * ring, 24, this.getMapWidth() - 24);
      const y = clamp(this.player.y + Math.sin(angle) * ring, 24, this.getMapHeight() - 24);
      this.spawnChefChiliOilBottle(boss.x, boss.y, x, y, index);
      this.spawnDelayedBossBlast(x, y, skill.radius, skill.damage, skill.warningMs + CHEF_CHILI_OIL_BOTTLE_FLIGHT_MS + index * 70, 0xff6b00, "chili oil", () =>
        this.spawnFirePit(x, y),
      );
    }
    this.spawnSeed += 1;
  }

  private spawnChefChiliOilBottle(startX: number, startY: number, targetX: number, targetY: number, index: number): void {
    const bottle = new Graphics();
    this.drawChiliOilBottle(bottle);
    bottle.position.set(startX, startY - 30);
    bottle.rotation = Math.atan2(targetY - startY, targetX - startX);
    this.world.addChild(bottle);
    gsap.to(bottle.position, {
      x: targetX,
      y: targetY,
      duration: (CHEF_CHILI_OIL_BOTTLE_FLIGHT_MS + index * 70) / 1000,
      ease: "power2.out",
      onUpdate: () => {
        bottle.rotation += 0.24;
      },
      onComplete: () => {
        if (bottle.destroyed) return;
        this.world.removeChild(bottle);
        bottle.destroy();
      },
    });
  }

  private drawChiliOilBottle(view: Graphics): void {
    view.clear();
    view
      .roundRect(-8, -18, 16, 34, 5)
      .fill({ color: 0xff6b00, alpha: 0.9 })
      .stroke({ color: 0xfff3b0, width: 2 })
      .rect(-5, -26, 10, 10)
      .fill(0x5a1f08)
      .circle(0, 2, 5)
      .fill({ color: 0xffba08, alpha: 0.7 });
  }

  private spawnChefCrashLanding(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    this.spawnSeed += 1;
    const angle = this.spawnSeed * 2.399963229728653;
    const x = clamp(this.player.x + Math.cos(angle) * 120, 24, this.getMapWidth() - 24);
    const y = clamp(this.player.y + Math.sin(angle) * 120, 24, this.getMapHeight() - 24);
    boss.chefAirborne = true;
    boss.mode = "windup";
    boss.windupMs = skill.warningMs + 180;
    boss.view.visible = true;
    boss.label.visible = true;
    gsap.killTweensOf(boss.view.position);
    gsap.to(boss.view.position, {
      y: boss.y + CHEF_CRASH_AIRBORNE_OFFSET_Y,
      duration: 0.28,
      ease: "power2.in",
      onUpdate: () => {
        boss.y = boss.view.position.y;
        boss.label.position.set(boss.x - 64, boss.y - 62);
      },
      onComplete: () => {
        if (!this.bosses.includes(boss)) return;
        boss.view.visible = false;
        boss.label.visible = false;
      },
    });
    this.spawnDelayedBossBlast(x, y, skill.radius, skill.damage, skill.warningMs, 0xc8d5d9, "鍧犳満", () => {
      if (!this.bosses.includes(boss)) return;
      gsap.killTweensOf(boss.view.position);
      boss.chefAirborne = false;
      boss.mode = "chase";
      boss.windupMs = 0;
      boss.chargeMs = 0;
      boss.view.visible = true;
      boss.label.visible = true;
      this.setActorPosition(boss, x, y);
      this.spawnHitSparks(x, y, 0xfff3b0, 24);
    });
  }

  private startChefMeatGrinder(boss: BossActor): void {
    boss.chefMeatGrinderUsed = true;
    boss.chefMeatGrinderMs = CHEF_MEAT_GRINDER_DURATION_MS;
    boss.chefMeatGrinderTickMs = 0;
    boss.chefMeatGrinderAngle = boss.view.rotation;
    if (!boss.chefMeatGrinderView || boss.chefMeatGrinderView.destroyed) {
      boss.chefMeatGrinderView = new Graphics();
      this.world.addChild(boss.chefMeatGrinderView);
    }
    this.drawChefMeatGrinder(boss);
    this.addScreenShake(260, 6);
  }

  private updateChefMeatGrinder(boss: BossActor, deltaMs: number): void {
    if ((boss.chefMeatGrinderMs ?? 0) <= 0) return;
    boss.chefMeatGrinderMs = Math.max(0, (boss.chefMeatGrinderMs ?? 0) - deltaMs);
    boss.chefMeatGrinderTickMs = (boss.chefMeatGrinderTickMs ?? 0) + deltaMs;
    boss.chefMeatGrinderAngle = (boss.chefMeatGrinderAngle ?? 0) + deltaMs * 0.009;
    this.drawChefMeatGrinder(boss);

    if (this.player && boss.chefMeatGrinderTickMs >= CHEF_MEAT_GRINDER_TICK_MS) {
      boss.chefMeatGrinderTickMs = 0;
      if (this.isPlayerInsideChefMeatGrinder(boss)) {
        this.applyPlayerDamage(CHEF_MEAT_GRINDER_DAMAGE);
      }
    }

    if ((boss.chefMeatGrinderMs ?? 0) <= 0 && boss.chefMeatGrinderView && !boss.chefMeatGrinderView.destroyed) {
      this.world.removeChild(boss.chefMeatGrinderView);
      boss.chefMeatGrinderView.destroy();
      boss.chefMeatGrinderView = undefined;
    }
  }

  private drawChefMeatGrinder(boss: BossActor): void {
    if (!boss.chefMeatGrinderView) return;
    const view = boss.chefMeatGrinderView;
    view.clear();
    view.position.set(boss.x, boss.y);
    const baseAngle = boss.chefMeatGrinderAngle ?? 0;
    for (let index = 0; index < CHEF_MEAT_GRINDER_ARM_COUNT; index += 1) {
      const angle = baseAngle + (Math.PI * 2 * index) / CHEF_MEAT_GRINDER_ARM_COUNT;
      const endX = Math.cos(angle) * CHEF_MEAT_GRINDER_ARM_LENGTH;
      const endY = Math.sin(angle) * CHEF_MEAT_GRINDER_ARM_LENGTH;
      view
        .moveTo(0, 0)
        .lineTo(endX, endY)
        .stroke({ color: 0xff6b00, alpha: 0.88, width: 16 })
        .circle(endX, endY, 18)
        .fill({ color: 0xc8d5d9, alpha: 0.95 })
        .stroke({ color: 0xfff3b0, alpha: 0.78, width: 3 });
    }
    view.circle(0, 0, 34).fill({ color: 0x6b1f1f, alpha: 0.72 }).stroke({ color: 0xff6b00, width: 4 });
  }

  private isPlayerInsideChefMeatGrinder(boss: BossActor): boolean {
    if (!this.player) return false;
    const baseAngle = boss.chefMeatGrinderAngle ?? 0;
    for (let index = 0; index < CHEF_MEAT_GRINDER_ARM_COUNT; index += 1) {
      const angle = baseAngle + (Math.PI * 2 * index) / CHEF_MEAT_GRINDER_ARM_COUNT;
      const end = {
        x: boss.x + Math.cos(angle) * CHEF_MEAT_GRINDER_ARM_LENGTH,
        y: boss.y + Math.sin(angle) * CHEF_MEAT_GRINDER_ARM_LENGTH,
      };
      if (distancePointToSegment(this.player, boss, end) <= 32) return true;
    }
    return distance(this.player, boss) <= 46;
  }

  private spawnPressureCookerBomb(boss: BossActor, skill: AdvancedBossSkill): void {
    const target = this.player ?? boss;
    const lowHealth = boss.health <= (skill.lowHealthThreshold ?? 0);
    this.spawnDelayedBossBlast(
      target.x,
      target.y,
      skill.radius,
      lowHealth ? (skill.lowHealthDamage ?? skill.damage) : skill.damage,
      skill.warningMs,
      0xc8d5d9,
      "pressure cooker",
      () => (lowHealth ? this.spawnBigFirePit(target.x, target.y) : this.spawnFirePit(target.x, target.y)),
    );
  }

  private spawnHiddenMagicBox(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x) + (this.spawnSeed % 2 === 0 ? 0.65 : -0.65);
    const x = clamp(this.player.x + Math.cos(angle) * 110, 24, this.getMapWidth() - 24);
    const y = clamp(this.player.y + Math.sin(angle) * 110, 24, this.getMapHeight() - 24);
    const view = new Graphics();
    this.drawHiddenMagicBox(view);
    view.position.set(x, y);
    this.world.addChild(view);
    this.spawnSeed += 1;
    this.bossHazards.push({
      view,
      kind: "magicBox",
      x,
      y,
      radius: CLOWN_MAGIC_BOX_TRIGGER_RADIUS,
      lifeMs: 9000,
      damage: skill.damage,
      tickElapsedMs: 0,
      expiresIntoFire: false,
      velocityX: 0,
      velocityY: 0,
      effect: "freeze",
    });
  }

  private drawHiddenMagicBox(view: Graphics): void {
    view.clear();
    view
      .roundRect(-24, -22, 48, 44, 7)
      .fill({ color: 0x241433, alpha: 0.42 })
      .stroke({ color: 0xfff3b0, alpha: 0.28, width: 2 })
      .rect(-18, -4, 36, 8)
      .fill({ color: 0xff4d6d, alpha: 0.36 })
      .rect(-4, -18, 8, 36)
      .fill({ color: 0x68e1fd, alpha: 0.28 });
  }

  private spawnClownKnifeBurst(boss: BossActor, skill: AdvancedBossSkill): void {
    this.drawPhaseRing(boss.x, boss.y, 150);
    window.setTimeout(() => {
      if (!this.bosses.includes(boss)) return;
      for (let index = 0; index < CLOWN_KNIFE_BURST_COUNT; index += 1) {
        const angle = (Math.PI * 2 * index) / CLOWN_KNIFE_BURST_COUNT;
        this.spawnKnifeHazard(boss.x, boss.y, angle, 460, skill.damage);
      }
    }, skill.warningMs);
  }

  private spawnClownSurpriseDrop(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const approachAngle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
    const target = {
      x: clamp(this.player.x - Math.cos(approachAngle) * 76, 24, this.getMapWidth() - 24),
      y: clamp(this.player.y - Math.sin(approachAngle) * 76, 24, this.getMapHeight() - 24),
    };
    this.spawnClownSurpriseMarker(target.x, target.y, skill.radius, skill.warningMs);
    window.setTimeout(() => {
      if (!this.player || !this.bosses.includes(boss)) return;
      this.setActorPosition(boss, target.x, target.y);
      boss.view.rotation = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
      this.spawnHitSparks(boss.x, boss.y, 0xff4d6d, 18);
      for (let index = 0; index < CLOWN_SURPRISE_SLASH_COUNT; index += 1) {
        window.setTimeout(() => {
          if (!this.player || !this.bosses.includes(boss)) return;
          this.spawnClownSlashVisual(boss.x, boss.y, boss.view.rotation + (index === 0 ? -0.22 : 0.22));
          if (distance(this.player, boss) <= skill.radius + 18) {
            this.applyPlayerDamage(CLOWN_SURPRISE_SLASH_DAMAGE);
          }
        }, index * 170);
      }
      window.setTimeout(() => {
        if (!this.player || !this.bosses.includes(boss)) return;
        const retreatAngle = Math.atan2(boss.y - this.player.y, boss.x - this.player.x);
        const x = clamp(this.player.x + Math.cos(retreatAngle) * CLOWN_SURPRISE_RETREAT_DISTANCE, 24, this.getMapWidth() - 24);
        const y = clamp(this.player.y + Math.sin(retreatAngle) * CLOWN_SURPRISE_RETREAT_DISTANCE, 24, this.getMapHeight() - 24);
        this.setActorPosition(boss, x, y);
      }, CLOWN_SURPRISE_SLASH_COUNT * 170 + 140);
    }, skill.warningMs);
  }

  private spawnClownSlashVisual(x: number, y: number, angle: number): void {
    const slash = new Graphics();
    slash
      .moveTo(0, 0)
      .lineTo(96, 0)
      .stroke({ color: 0xfff3b0, alpha: 0.95, width: 8 })
      .moveTo(12, -14)
      .lineTo(82, 14)
      .stroke({ color: 0xff4d6d, alpha: 0.72, width: 4 });
    slash.position.set(x, y);
    slash.rotation = angle;
    this.world.addChild(slash);
    window.setTimeout(() => {
      if (slash.destroyed) return;
      this.world.removeChild(slash);
      slash.destroy();
    }, 160);
  }

  private spawnClownSurpriseMarker(x: number, y: number, radius: number, lifeMs: number): void {
    const marker = new Graphics();
    marker
      .circle(0, 0, radius)
      .fill({ color: 0xff4d6d, alpha: 0.12 })
      .stroke({ color: 0xfff3b0, alpha: 0.78, width: 3 })
      .moveTo(-radius * 0.45, 0)
      .lineTo(radius * 0.45, 0)
      .stroke({ color: 0xff4d6d, alpha: 0.85, width: 5 });
    marker.position.set(x, y);
    this.world.addChild(marker);
    window.setTimeout(() => {
      if (marker.destroyed) return;
      this.world.removeChild(marker);
      marker.destroy();
    }, lifeMs);
  }

  private startClownSpiralKnives(boss: BossActor, skill: AdvancedBossSkill): void {
    this.drawPhaseRing(boss.x, boss.y, 230);
    window.setTimeout(() => {
      if (!this.bosses.includes(boss)) return;
      boss.clownSpiralKnifeMs = CLOWN_SPIRAL_KNIFE_DURATION_MS;
      boss.clownSpiralKnifeTickMs = 0;
      boss.clownSpiralKnifeAngle = boss.view.rotation;
      this.spawnHitSparks(boss.x, boss.y, 0xfff3b0, 24);
    }, skill.warningMs);
  }

  private updateClownSpiralKnives(boss: BossActor, deltaMs: number): void {
    if ((boss.clownSpiralKnifeMs ?? 0) <= 0) return;
    boss.clownSpiralKnifeMs = Math.max(0, (boss.clownSpiralKnifeMs ?? 0) - deltaMs);
    boss.clownSpiralKnifeTickMs = (boss.clownSpiralKnifeTickMs ?? 0) + deltaMs;
    if (boss.clownSpiralKnifeTickMs < CLOWN_SPIRAL_KNIFE_TICK_MS) return;
    boss.clownSpiralKnifeTickMs = 0;
    const baseAngle = boss.clownSpiralKnifeAngle ?? 0;
    boss.clownSpiralKnifeAngle = baseAngle + CLOWN_SPIRAL_KNIFE_STEP;
    this.spawnKnifeHazard(boss.x, boss.y, baseAngle, 360, 8);
    this.spawnKnifeHazard(boss.x, boss.y, baseAngle + Math.PI, 360, 8);
  }

  private spawnJackInTheBox(boss: BossActor, skill: AdvancedBossSkill): void {
    const angle = Math.atan2((this.player?.y ?? boss.y) - boss.y, (this.player?.x ?? boss.x) - boss.x);
    const x = boss.x + Math.cos(angle) * 220;
    const y = boss.y + Math.sin(angle) * 220;
    this.spawnMagicBox(x, y, skill);
  }

  private spawnMagicBox(x: number, y: number, skill: AdvancedBossSkill): void {
    const view = new Graphics();
    view
      .roundRect(-26, -26, 52, 52, 7)
      .fill({ color: 0xff4d6d, alpha: 0.26 })
      .stroke({ color: 0xfff3b0, alpha: 0.88, width: 3 })
      .rect(-20, -4, 40, 8)
      .fill({ color: 0x68e1fd, alpha: 0.75 })
      .rect(-4, -20, 8, 40)
      .fill({ color: 0x68e1fd, alpha: 0.75 });
    view.position.set(x, y);
    this.world.addChild(view);
    const effect = JESTER_BOX_EFFECTS[this.spawnSeed % JESTER_BOX_EFFECTS.length];
    this.spawnSeed += 1;
    this.bossHazards.push({
      view,
      kind: "magicBox",
      x,
      y,
      radius: skill.radius,
      lifeMs: 7600,
      damage: skill.damage,
      tickElapsedMs: 0,
      expiresIntoFire: false,
      velocityX: 0,
      velocityY: 0,
      effect,
    });
  }

  private triggerMagicBoxEffect(hazard: HazardActor): void {
    if (!this.player) return;
    const effect = hazard.effect ?? "blast";
    if (effect === "blast") {
      this.applyPlayerDamage(80);
      this.spawnHitSparks(hazard.x, hazard.y, 0xff4d6d, 24);
      this.emitState("Magic box blast: player took heavy damage.");
      return;
    }
    if (effect === "freeze") {
      this.playerFreezeMs = Math.max(this.playerFreezeMs, CLOWN_MAGIC_BOX_FREEZE_MS);
      this.emitState("Magic box freeze: player cannot move.");
      return;
    }
    this.playerVisionNarrowMs = Math.max(this.playerVisionNarrowMs, 5000);
    this.emitState("Magic box illusion: player vision narrowed.");
  }

  private spawnCauldronDescend(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    this.spawnSeed += 1;
    const angle = this.spawnSeed * 2.399963229728653;
    const x = clamp(this.player.x + Math.cos(angle) * 160, 24, MAP_WIDTH - 24);
    const y = clamp(this.player.y + Math.sin(angle) * 160, 24, MAP_HEIGHT - 24);
    this.spawnDelayedBossBlast(x, y, skill.radius, skill.damage, skill.warningMs, 0xc8d5d9, "澶攨", () => {
      if (!this.bosses.includes(boss)) return;
      this.setActorPosition(boss, x, y);
      this.spawnHitSparks(x, y, 0xfff3b0, 20);
    });
  }

  private castMagicianCurtainShift(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    this.removeMagicianStageProps();
    const curtains = createMagicianCurtains(this.spawnSeed);
    const centerX = this.getMapWidth() / 2;
    const centerY = this.getMapHeight() / 2;
    const laneWidth = this.getMapWidth() / (curtains.length + 1);
    const curtainHeight = this.getMapHeight() + 400;
    for (const curtain of curtains) {
      const x = clamp(centerX + curtain.lane * laneWidth, 24, this.getMapWidth() - 24);
      const y = centerY;
      const view = new Graphics();
      view
        .rect(-22, -curtainHeight / 2, 44, curtainHeight)
        .fill({ color: 0x180d26, alpha: curtain.kind === 'solid' ? 0.78 : 0.34 })
        .stroke({ color: curtain.kind === 'solid' ? 0xfff3b0 : 0x9d4edd, alpha: curtain.kind === 'solid' ? 0.9 : 0.38, width: curtain.kind === 'solid' ? 3 : 2 });
      view.position.set(x, y);
      this.world.addChild(view);
      this.magicianStageProps.push({
        view,
        kind: 'curtain',
        solid: curtain.kind === 'solid',
        x,
        y,
        radius: curtainHeight / 2,
        damage: curtain.kind === 'solid' ? 2 : 0,
        expiresAtMs: performance.now() + 3600,
      });
    }
    window.setTimeout(() => {
      if (!this.player || !this.bosses.includes(boss)) return;
      for (const prop of this.magicianStageProps.filter((candidate) => candidate.kind === 'curtain' && candidate.solid)) {
        this.spawnDelayedBossBlast(prop.x, this.player.y, 180, skill.damage, 80, 0xfff3b0, '幕布合拢');
      }
      this.startMagicianCurtainCall(boss.x, boss.y, 'standard');
    }, skill.warningMs + 1200);
    this.spawnSeed += 1;
  }

  private castMagicianSpotlightJudgement(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    this.removeMagicianStageProps();
    const spotlights = createMagicianSpotlights(this.spawnSeed);
    const orbitDurationMs = Math.max(3000, skill.warningMs);
    const orbitSpeed = Math.PI * 2 * MAGICIAN_SPOTLIGHT_ORBIT_ROUNDS / (orbitDurationMs / 1000);
    const now = performance.now();
    const centerX = this.player.x;
    const centerY = this.player.y;
    const radius = Math.max(MAGICIAN_SPOTLIGHT_STAGE_RADIUS, skill.radius);
    const orbitRadiusX = Math.min(980, Math.max(760, radius * 3.85));
    const orbitRadiusY = Math.min(700, Math.max(520, radius * 2.75));
    for (const spotlight of spotlights) {
      const angle = (Math.PI * 2 * spotlight.index) / spotlights.length - Math.PI / 2;
      const x = clamp(centerX + Math.cos(angle) * orbitRadiusX, 24, this.getMapWidth() - 24);
      const y = clamp(centerY + Math.sin(angle) * orbitRadiusY, 24, this.getMapHeight() - 24);
      const view = new Graphics();
      this.drawMagicianSpotlight(view, radius, false, false);
      view.position.set(x, y);
      this.world.addChild(view);
      this.magicianStageProps.push({
        view,
        kind: 'spotlight',
        real: spotlight.safe,
        x,
        y,
        radius,
        damage: skill.damage,
        birthMs: now,
        revealAtMs: now + orbitDurationMs,
        expiresAtMs: now + orbitDurationMs + MAGICIAN_SPOTLIGHT_CHOOSE_MS + 650,
        centerX,
        centerY,
        orbitRadiusX,
        orbitRadiusY,
        orbitAngle: angle,
        orbitSpeed,
        orbitDirection: 1,
      });
    }
    window.setTimeout(() => {
      if (!this.player || !this.bosses.includes(boss)) return;
      const safe = this.magicianStageProps.find((prop) => prop.kind === 'spotlight' && prop.real);
      for (const fake of this.magicianStageProps.filter((prop) => prop.kind === 'spotlight' && !prop.real)) {
        this.spawnDelayedBossBlast(
          fake.x,
          fake.y,
          MAGICIAN_SPOTLIGHT_FALSE_BLAST_RADIUS,
          Math.max(5, Math.round(skill.damage * 0.45)),
          80,
          0x9d4edd,
          "fake light",
        );
      }
      if (!safe || distance(this.player, safe) > (safe.radius ?? 92)) {
        this.applyPlayerDamage(skill.damage);
        this.addScreenShake(260, 7);
      } else {
        this.startMagicianCurtainCall(boss.x, boss.y, 'revealed');
        return;
      }
      this.startMagicianCurtainCall(boss.x, boss.y, 'standard');
    }, orbitDurationMs + MAGICIAN_SPOTLIGHT_CHOOSE_MS);
    this.spawnSeed += 1;
  }

  private castMagicianHatMaze(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    this.removeMagicianStageProps();
    const hats = createMagicianHatMaze(this.spawnSeed);
    for (const hat of hats) {
      const angle = (Math.PI * 2 * hat.index) / hats.length + this.spawnSeed * 0.17;
      const x = clamp(this.player.x + Math.cos(angle) * 270, 24, this.getMapWidth() - 24);
      const y = clamp(this.player.y + Math.sin(angle) * 210, 24, this.getMapHeight() - 24);
      const view = new Graphics();
      this.drawMagicianHat(view, hat.real ? 0.78 : 0.48);
      view.position.set(x, y);
      this.world.addChild(view);
      this.magicianStageProps.push({
        view,
        kind: 'hat',
        real: hat.real,
        x,
        y,
        radius: 34,
        damage: skill.damage,
        expiresAtMs: performance.now() + 4200,
      });
    }
    window.setTimeout(() => {
      if (!this.bosses.includes(boss)) return;
      const realHat = this.magicianStageProps.find((prop) => prop.kind === 'hat' && prop.real);
      if (realHat) this.setActorPosition(boss, realHat.x, realHat.y);
      this.startMagicianCurtainCall(realHat?.x ?? boss.x, realHat?.y ?? boss.y, 'standard');
    }, 4200);
    this.spawnSeed += 1;
  }

  private castMagicianMirrorHall(boss: BossActor, skill: AdvancedBossSkill): void {
    this.removeMagicianStageProps();
    const bodies = createMagicianMirrorHall(this.spawnSeed);
    const center = this.player ?? boss;
    for (const body of bodies) {
      const angle = body.orbitOffset + 0.52;
      const x = clamp(center.x + Math.cos(angle) * 470, 24, this.getMapWidth() - 24);
      const y = clamp(center.y + Math.sin(angle) * 310, 24, this.getMapHeight() - 24);
      const view = new Graphics();
      this.drawBossSprite(view, 'magician');
      view.alpha = body.real ? 0.88 : 0.5;
      if (body.real) {
        view.circle(0, 34, 24).stroke({ color: 0xfff3b0, alpha: 0.36, width: 2 });
      }
      view.position.set(x, y);
      this.world.addChild(view);
      this.magicianStageProps.push({
        view,
        kind: 'mirror',
        real: body.real,
        x,
        y,
        radius: 34,
        damage: skill.damage,
        centerX: center.x,
        centerY: center.y,
        orbitRadiusX: 470,
        orbitRadiusY: 310,
        orbitAngle: angle,
        orbitSpeed: MAGICIAN_MIRROR_ORBIT_SPEED,
        orbitDirection: body.orbitDirection,
        expiresAtMs: performance.now() + 3800,
      });
    }
    window.setTimeout(() => {
      if (!this.bosses.includes(boss)) return;
      const realMirror = this.magicianStageProps.find((prop) => prop.kind === 'mirror' && prop.real);
      this.startMagicianCurtainCall(realMirror?.x ?? boss.x, realMirror?.y ?? boss.y, 'standard');
    }, 3800);
    this.spawnSeed += 1;
  }

  private castMagicianFinaleTheater(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player || this.magicianFinaleInProgress) return;
    this.magicianFinaleInProgress = true;
    this.removeMagicianStageProps();
    this.drawPhaseRing(this.player.x, this.player.y, 620);
    this.emitState('终幕剧场：三幕演出开始。');
    window.setTimeout(() => this.castMagicianCurtainShift(boss, { ...skill, warningMs: 520, damage: skill.damage, radius: 190 }), 200);
    window.setTimeout(() => this.castMagicianSpotlightJudgement(boss, { ...skill, warningMs: 620, damage: skill.damage + 4, radius: 230 }), 2600);
    window.setTimeout(() => {
      this.castMagicianHatMaze(boss, { ...skill, warningMs: 560, damage: skill.damage, radius: 130 });
      this.castMagicianMirrorHall(boss, { ...skill, warningMs: 560, damage: skill.damage, radius: 170 });
    }, 14600);
    window.setTimeout(() => {
      if (!this.bosses.includes(boss)) return;
      this.magicianFinaleInProgress = false;
      this.removeMagicianStageProps();
      this.startMagicianCurtainCall(boss.x, boss.y, 'finale');
    }, 18800);
    this.spawnSeed += 1;
  }

  private startMagicianCurtainCall(x: number, y: number, kind: MagicianCurtainCallKind): void {
    const boss = this.bosses.find((candidate) => candidate.bossId === 'magician');
    if (!boss) return;
    const duration = getMagicianCurtainCallMs(kind);
    this.magicianCurtainCallUntilMs = Math.max(this.magicianCurtainCallUntilMs, performance.now() + duration);
    if (kind === 'finale-revealed') this.magicianFinaleInProgress = false;
    this.setActorPosition(boss, clamp(x, 24, this.getMapWidth() - 24), clamp(y, 24, this.getMapHeight() - 24));
    this.drawBossSprite(boss.view, 'magician');
    this.spawnHitSparks(boss.x, boss.y, kind.includes('finale') ? 0xff4d6d : 0xfff3b0, kind.includes('finale') ? 28 : 16);
    this.emitState("Magician curtain call: " + Math.round(duration / 1000) + " seconds.");
    window.setTimeout(() => {
      if (!this.bosses.includes(boss) || performance.now() < this.magicianCurtainCallUntilMs) return;
      this.drawMagicianHat(boss.view, 0.86);
    }, duration);
  }

  private drawMagicianHat(view: Graphics, alpha: number): void {
    view.clear();
    view
      .ellipse(0, 14, 46, 16)
      .fill({ color: 0x22122f, alpha })
      .stroke({ color: 0xfff3b0, alpha: 0.65, width: 3 })
      .rect(-22, -42, 44, 52)
      .fill({ color: 0x2b1740, alpha })
      .stroke({ color: 0x9d4edd, alpha: 0.7, width: 3 })
      .rect(-26, -4, 52, 10)
      .fill({ color: 0xff4d6d, alpha: 0.62 });
  }

  private drawMagicianSpotlight(view: Graphics, radius: number, safe: boolean, revealed: boolean): void {
    view.clear();
    if (!revealed) {
      view
        .circle(0, 0, radius)
        .fill({ color: 0xfff3b0, alpha: 0.08 })
        .stroke({ color: 0xfff3b0, alpha: 0.26, width: 2 })
        .circle(0, 0, radius * 0.62)
        .stroke({ color: 0xfff3b0, alpha: 0.12, width: 3 })
        .circle(0, 0, radius * 0.26)
        .fill({ color: 0xfff3b0, alpha: 0.045 });
      return;
    }
    view
      .circle(0, 0, radius)
      .fill({ color: 0xfff3b0, alpha: safe ? 0.13 : 0.115 })
      .stroke({ color: safe ? 0xfff3b0 : 0xe6c56b, alpha: safe ? 0.46 : 0.38, width: 3 })
      .circle(0, 0, radius * 0.66)
      .stroke({ color: safe ? 0xfff3b0 : 0x9d4edd, alpha: safe ? 0.18 : 0.2, width: 4 })
      .circle(0, 0, radius * 0.22)
      .fill({ color: safe ? 0xfff3b0 : 0x9d4edd, alpha: safe ? 0.18 : 0.09 });
  }

  private spawnMagicianMirrorShardBurst(x: number, y: number, damage: number): void {
    for (let index = 0; index < MAGICIAN_MIRROR_SHARD_COUNT; index += 1) {
      const angle = (Math.PI * 2 * index) / MAGICIAN_MIRROR_SHARD_COUNT;
      this.spawnBossHazard(x, y, angle, MAGICIAN_MIRROR_SHARD_SPEED, 0xd9f7ff, 1200, 6, "bossProjectile", Math.max(4, Math.round(damage * 0.7)));
    }
    this.spawnHitSparks(x, y, 0xd9f7ff, 22);
    this.addScreenShake(110, 4);
  }

  private spawnCourierDeliveryRoute(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
    const target = {
      x: clamp(this.player.x + Math.cos(angle) * 90, 24, this.getMapWidth() - 24),
      y: clamp(this.player.y + Math.sin(angle) * 90, 24, this.getMapHeight() - 24),
    };
    this.drawCourierRouteTelegraph(boss, target, skill.warningMs, 0xffd166);
    window.setTimeout(() => {
      if (!this.bosses.includes(boss)) return;
      this.spawnCourierRouteResidue({ x: boss.x, y: boss.y }, target, skill.damage);
      const chargeAngle = Math.atan2(target.y - boss.y, target.x - boss.x);
      boss.mode = "charge";
      boss.chargeMs = 360;
      boss.chargeAngle = chargeAngle;
      boss.chargeDamage = skill.damage;
      boss.chargeSpeed = COURIER_LOCKED_CHARGE_SPEED;
    }, skill.warningMs);
  }

  private spawnCourierExplosiveParcels(skill: AdvancedBossSkill): void {
    if (!this.player) return;
    for (let index = 0; index < COURIER_EXPLOSIVE_PARCEL_COUNT; index += 1) {
      const angle = (Math.PI * 2 * index) / COURIER_EXPLOSIVE_PARCEL_COUNT + this.spawnSeed * 0.41;
      const parcelDistance = COURIER_EXPLOSIVE_PARCEL_MIN_DISTANCE + index * COURIER_EXPLOSIVE_PARCEL_DISTANCE_STEP;
      const x = clamp(this.player.x + Math.cos(angle) * parcelDistance, 24, this.getMapWidth() - 24);
      const y = clamp(this.player.y + Math.sin(angle) * parcelDistance, 24, this.getMapHeight() - 24);
      this.spawnCourierParcel(x, y, skill.damage, skill.radius);
    }
    this.spawnSeed += 1;
  }

  private spawnCourierParcel(x: number, y: number, damage: number, radius: number): void {
    const view = new Graphics();
    this.drawCourierParcel(view);
    view.position.set(x, y);
    this.world.addChild(view);
    const hazard: HazardActor = {
      view,
      kind: "courierParcel",
      x,
      y,
      radius: Math.max(radius, COURIER_PARCEL_TRIGGER_RADIUS),
      lifeMs: 6200,
      damage,
      tickElapsedMs: 0,
      expiresIntoFire: false,
      velocityX: 0,
      velocityY: 0,
    };
    this.bossHazards.push(hazard);
  }

  private spawnCourierLockerTeleport(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const lockers: Actor[] = [];
    for (let index = 0; index < COURIER_LOCKER_COUNT; index += 1) {
      const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x) + (index === 0 ? -1.2 : 1.2);
      const x = clamp(this.player.x + Math.cos(angle) * 240, 24, this.getMapWidth() - 24);
      const y = clamp(this.player.y + Math.sin(angle) * 240, 24, this.getMapHeight() - 24);
      const view = new Graphics();
      this.drawCourierLocker(view);
      view.position.set(x, y);
      this.world.addChild(view);
      lockers.push({ view, x, y });
    }
    window.setTimeout(() => {
      for (const locker of lockers) {
        if (!locker.view.destroyed) {
          this.world.removeChild(locker.view);
          locker.view.destroy();
        }
      }
      if (!this.player || !this.bosses.includes(boss) || lockers.length < 2) return;
      const exit = lockers[1];
      this.setActorPosition(boss, exit.x, exit.y);
      const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
      this.spawnChargeTelegraph(boss, angle, 560, 0xffd166);
      window.setTimeout(() => {
        if (!this.bosses.includes(boss)) return;
        boss.mode = "charge";
        boss.chargeMs = 300;
        boss.chargeAngle = angle;
        boss.chargeDamage = skill.damage;
        boss.chargeSpeed = COURIER_LOCKED_CHARGE_SPEED * 0.82;
      }, 260);
    }, skill.warningMs);
  }

  private spawnCourierSignatureLock(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const x = this.player.x;
    const y = this.player.y;
    const marker = new Graphics();
    marker
      .circle(0, 0, skill.radius)
      .fill({ color: 0xffd166, alpha: 0.16 })
      .stroke({ color: 0xd90429, alpha: 0.88, width: 4 })
      .rect(-48, -18, 96, 36)
      .fill({ color: 0xfff3b0, alpha: 0.18 })
      .stroke({ color: 0xfff3b0, alpha: 0.72, width: 2 });
    marker.position.set(x, y);
    this.world.addChild(marker);
    window.setTimeout(() => {
      if (!marker.destroyed) {
        this.world.removeChild(marker);
        marker.destroy();
      }
      if (!this.player || !this.bosses.includes(boss)) return;
      if (getCourierSignatureLockOutcome(distance(this.player, { x, y }), skill.radius) === "safe") {
        this.showDamageNumber(x, y - 42, 0, "#fff3b0", "SAFE ");
        return;
      }
      const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
      boss.mode = "charge";
      boss.chargeMs = 320;
      boss.chargeAngle = angle;
      boss.chargeDamage = Math.round(skill.damage * 0.75);
      boss.chargeSpeed = COURIER_LOCKED_CHARGE_SPEED * 0.78;
      this.spawnChargeTelegraph(boss, angle, 260, 0xffd166);
      this.showDamageNumber(this.player.x, this.player.y - 42, 0, "#ff9f1c", "AMBUSH ");
    }, COURIER_SIGNATURE_LOCK_MS);
  }

  private startCourierCitywideDelivery(boss: BossActor, skill: AdvancedBossSkill): void {
    this.drawPhaseRing(boss.x, boss.y, 260);
    window.setTimeout(() => {
      if (!this.bosses.includes(boss)) return;
      boss.courierCitywideMs = COURIER_CITYWIDE_DELIVERY_DURATION_MS;
      boss.courierCitywideTickMs = COURIER_CITYWIDE_DELIVERY_TICK_MS;
      boss.chargeDamage = skill.damage;
      this.spawnHitSparks(boss.x, boss.y, 0xffd166, 28);
    }, skill.warningMs);
  }

  private updateCourierCitywideDelivery(boss: BossActor, deltaMs: number): void {
    if ((boss.courierCitywideMs ?? 0) <= 0) return;
    boss.courierCitywideMs = Math.max(0, (boss.courierCitywideMs ?? 0) - deltaMs);
    boss.courierCitywideTickMs = (boss.courierCitywideTickMs ?? 0) + deltaMs;
    if (boss.courierCitywideTickMs < COURIER_CITYWIDE_DELIVERY_TICK_MS || !this.player) return;
    boss.courierCitywideTickMs = 0;
    const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x) + (this.spawnSeed % 3 - 1) * 0.42;
    const target = {
      x: clamp(this.player.x + Math.cos(angle) * 180, 24, this.getMapWidth() - 24),
      y: clamp(this.player.y + Math.sin(angle) * 180, 24, this.getMapHeight() - 24),
    };
    this.spawnCourierRouteResidue({ x: boss.x, y: boss.y }, target, boss.chargeDamage || 10);
    boss.mode = "charge";
    boss.chargeMs = 240;
    boss.chargeAngle = Math.atan2(target.y - boss.y, target.x - boss.x);
    boss.chargeDamage = 10;
    boss.chargeSpeed = COURIER_LOCKED_CHARGE_SPEED;
    if (this.spawnSeed % 2 === 0) {
      this.spawnCourierParcel(target.x, target.y, 10, COURIER_PARCEL_TRIGGER_RADIUS);
    }
    this.spawnSeed += 1;
  }

  private drawCourierRouteTelegraph(start: { x: number; y: number }, end: { x: number; y: number }, lifeMs: number, color: number): void {
    const route = new Graphics();
    route.moveTo(start.x, start.y).lineTo(end.x, end.y).stroke({ color, alpha: 0.38, width: COURIER_ROUTE_RESIDUE_RADIUS * 2 });
    route.moveTo(start.x, start.y).lineTo(end.x, end.y).stroke({ color: 0xfff3b0, alpha: 0.86, width: 5 });
    this.world.addChild(route);
    window.setTimeout(() => {
      if (route.destroyed) return;
      this.world.removeChild(route);
      route.destroy();
    }, lifeMs);
  }

  private spawnCourierRouteResidue(start: { x: number; y: number }, end: { x: number; y: number }, damage: number): void {
    const route = new Graphics();
    route.moveTo(start.x, start.y).lineTo(end.x, end.y).stroke({ color: 0xffd166, alpha: 0.26, width: COURIER_ROUTE_RESIDUE_RADIUS * 2 });
    route.moveTo(start.x, start.y).lineTo(end.x, end.y).stroke({ color: 0xd90429, alpha: 0.82, width: 8 });
    this.world.addChild(route);
    this.courierRoutes.push({
      view: route,
      start,
      end,
      lifeMs: COURIER_ROUTE_RESIDUE_LIFE_MS,
      tickElapsedMs: 0,
      damage: Math.max(4, Math.round(damage * 0.35)),
    });
  }

  private drawCourierParcel(view: Graphics): void {
    view.clear();
    view
      .roundRect(-24, -18, 48, 36, 4)
      .fill({ color: 0x9b5e2e, alpha: 0.95 })
      .stroke({ color: 0xfff3b0, alpha: 0.8, width: 2 })
      .rect(-4, -18, 8, 36)
      .fill({ color: 0xffd166, alpha: 0.65 })
      .rect(-24, -4, 48, 8)
      .fill({ color: 0xffd166, alpha: 0.5 });
  }

  private drawCourierLocker(view: Graphics): void {
    view.clear();
    view
      .roundRect(-34, -48, 68, 96, 6)
      .fill({ color: 0x2b2520, alpha: 0.94 })
      .stroke({ color: 0xffd166, alpha: 0.9, width: 3 });
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        view.rect(-26 + col * 28, -36 + row * 25, 22, 18).fill({ color: 0x3d342c, alpha: 0.9 }).stroke({ color: 0xfff3b0, alpha: 0.25, width: 1 });
      }
    }
  }

  private spawnCourierDroneAirdrop(skill: AdvancedBossSkill): void {
    if (!this.player) return;
    for (const [index, offset] of [-80, 95].entries()) {
      const x = clamp(this.player.x + offset + (Math.random() - 0.5) * 90, 24, MAP_WIDTH - 24);
      const y = clamp(this.player.y + (Math.random() - 0.5) * 150, 24, MAP_HEIGHT - 24);
      this.spawnDelayedBossBlast(
        x,
        y,
        skill.radius,
        skill.damage,
        skill.warningMs,
        offset < 0 ? 0xff6b00 : 0x68e1fd,
        "drone",
        () => {
          if (!this.player || distance(this.player, { x, y }) > skill.radius + 16) return;
          if (index === 0) {
            this.applyPlayerDamage(10);
          } else {
            this.playerSlowMs = Math.max(this.playerSlowMs, 5000);
          }
        },
      );
    }
  }

  private spawnDeliveryLock(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const lock = new Graphics();
    lock
      .roundRect(-45, -24, 90, 48, 5)
      .fill({ color: 0xfff3b0, alpha: 0.22 })
      .stroke({ color: 0xd90429, alpha: 0.92, width: 3 })
      .rect(-28, -4, 56, 8)
      .fill({ color: 0xd90429, alpha: 0.8 });
    lock.position.set(this.player.x, this.player.y - 42);
    this.world.addChild(lock);
    window.setTimeout(() => {
      if (lock.destroyed) return;
      this.world.removeChild(lock);
      lock.destroy();
      if (!this.player || !this.bosses.includes(boss)) return;
      this.startBossCharge(boss, 320, 760, skill.damage, 0xd90429, COURIER_LOCKED_CHARGE_SPEED);
    }, skill.warningMs);
  }

  private spawnClownClones(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    const candidates = [...this.enemies]
      .sort((a, b) => distance(a, this.player!) - distance(b, this.player!))
      .slice(0, 3);
    for (let index = 0; index < 3; index += 1) {
      const angle = (Math.PI * 2 * index) / 3 + this.spawnSeed;
      const x = clamp(this.player.x + Math.cos(angle) * skill.radius, 24, MAP_WIDTH - 24);
      const y = clamp(this.player.y + Math.sin(angle) * skill.radius, 24, MAP_HEIGHT - 24);
      const enemy = candidates[index];
      if (enemy) {
        this.setActorPosition(enemy, x, y);
        enemy.health = 16;
        enemy.speed = 118;
        enemy.kind = "zombie";
        this.destroyEnemyStoryVisual(enemy);
        this.drawBossSprite(enemy.view, "clown");
        enemy.view.alpha = 1;
      } else {
        const view = new Graphics();
        this.drawBossSprite(view, "clown");
        view.alpha = 1;
        view.position.set(x, y);
        this.world.addChild(view);
        this.enemies.push({
          view,
          kind: "zombie",
          x,
          y,
          health: 16,
          speed: 118,
          contactDamageElapsedMs: 700,
        });
      }
    }
    this.spawnSeed += 1;
    this.spawnHitSparks(boss.x, boss.y, 0xff4d6d, 14);
  }

  private spawnKnifeGala(boss: BossActor, skill: AdvancedBossSkill): void {
    const count = 16;
    window.setTimeout(() => {
      if (!this.bosses.includes(boss)) return;
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count;
        this.spawnKnifeHazard(boss.x, boss.y, angle, 224, skill.damage);
      }
      this.emitState(this.getBossName(boss.bossId) + " releases knife gala.");
    }, skill.warningMs);
  }

  private startBossCharge(
    boss: BossActor,
    warningMs: number,
    distanceScale: number,
    damage: number,
    color: number,
    speed?: number,
  ): void {
    if (!this.player) return;
    const angle = Math.atan2(this.player!.y - boss.y, this.player!.x - boss.x);
    boss.mode = "windup";
    boss.windupMs = warningMs;
    boss.pendingChargeAngle = angle;
    boss.chargeDamage = damage;
    boss.chargeSpeed = speed;
    this.spawnChargeTelegraph(boss, angle, distanceScale, color);
  }

  private spawnDelayedBossBlast(
    x: number,
    y: number,
    radius: number,
    damage: number,
    warningMs: number,
    color: number,
    label: string,
    onExplode?: () => void,
  ): void {
    const marker = new Graphics();
    marker
      .circle(0, 0, radius)
      .fill({ color, alpha: 0.18 })
      .stroke({ color: 0xfff3b0, alpha: 0.82, width: 3 })
      .circle(0, 0, 18)
      .fill({ color, alpha: 0.82 });
    marker.position.set(x, y);
    this.world.addChild(marker);
    const text = new Text({
      text: label,
      style: new TextStyle({ fill: "#fff3b0", fontFamily: "Arial", fontSize: 14, fontWeight: "700" }),
    });
    text.anchor.set(0.5);
    text.position.set(x, y - radius - 20);
    this.world.addChild(text);
    window.setTimeout(() => {
      if (!marker.destroyed) {
        this.world.removeChild(marker);
        marker.destroy();
      }
      if (!text.destroyed) {
        this.world.removeChild(text);
        text.destroy();
      }
      this.spawnHitSparks(x, y, color, 18);
      this.addScreenShake(140, 7);
      if (this.player && this.getVisibilityZoneId(this.player) === this.getVisibilityZoneId({ x, y }) && distance(this.player, { x, y }) <= radius + 16) {
        this.applyPlayerDamage(damage);
      }
      onExplode?.();
    }, warningMs);
  }

  private throwChiliOil(boss: BossActor): void {
    if (!this.player) return;
    const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
    const travelMs = clamp((distance(boss, this.player) / 360) * 1000, 520, 1350);
    this.spawnBossHazard(boss.x, boss.y, angle, 360, 0xff6b00, travelMs, 11, "chiliOil", 8, true);
  }

  private spawnKnifeHazard(x: number, y: number, angle: number, speed: number, damage = 7): void {
    const view = new Graphics();
    this.drawFlyingKnife(view);
    view.position.set(x, y);
    view.rotation = angle;
    this.world.addChild(view);
    this.bossHazards.push({
      view,
      kind: "knife",
      x,
      y,
      radius: 13,
      lifeMs: 1800,
      damage,
      tickElapsedMs: 0,
      expiresIntoFire: false,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
    });
  }

  private drawFlyingKnife(view: Graphics): void {
    view.clear();
    view
      .poly([18, 0, 2, -5, -12, -3, -14, 0, -12, 3, 2, 5])
      .fill(0xdce8ef)
      .stroke({ color: 0x47315f, width: 1.4 });
    view.rect(-20, -3, 9, 6).fill(0x9d4edd);
    view.circle(-22, 0, 3).fill(0xffd166);
  }

  private spawnFirePit(x: number, y: number): void {
    const view = new Graphics();
    view
      .circle(0, 0, 56)
      .fill({ color: 0xff5a1f, alpha: 0.28 })
      .stroke({ color: 0xffd166, alpha: 0.72, width: 3 });
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      view.circle(Math.cos(angle) * 30, Math.sin(angle) * 30, 8).fill({ color: 0xffba08, alpha: 0.55 });
    }
    view.position.set(x, y);
    this.world.addChild(view);
    this.bossHazards.push({
      view,
      kind: "firePit",
      x,
      y,
      radius: 56,
      lifeMs: 4600,
      damage: 4,
      tickElapsedMs: 450,
      expiresIntoFire: false,
      velocityX: 0,
      velocityY: 0,
    });
  }

  private spawnBigFirePit(x: number, y: number): void {
    const view = new Graphics();
    view
      .circle(0, 0, BIG_FIRE_PIT.radius)
      .fill({ color: 0xff3d00, alpha: 0.18 })
      .stroke({ color: 0xffd166, alpha: 0.78, width: 6 });
    for (let index = 0; index < 18; index += 1) {
      const angle = (Math.PI * 2 * index) / 18;
      const ring = index % 2 === 0 ? 110 : 210;
      view.circle(Math.cos(angle) * ring, Math.sin(angle) * ring, 18).fill({ color: 0xffba08, alpha: 0.5 });
    }
    view.position.set(x, y);
    this.world.addChild(view);
    this.bossHazards.push({
      view,
      kind: "bigFirePit",
      x,
      y,
      radius: BIG_FIRE_PIT.radius,
      lifeMs: BIG_FIRE_PIT.lifeMs,
      damage: BIG_FIRE_PIT.damage,
      tickElapsedMs: BIG_FIRE_PIT.tickMs,
      expiresIntoFire: false,
      velocityX: 0,
      velocityY: 0,
    });
  }

  private spawnChargeTelegraph(boss: BossActor, angle: number, length = 980, color = 0xd90429): void {
    const view = new Graphics();
    view
      .rect(0, -82, length, 164)
      .fill({ color, alpha: 0.28 })
      .stroke({ color: 0xfff3b0, alpha: 0.7, width: 3 });
    view.position.set(boss.x, boss.y);
    view.rotation = angle;
    this.world.addChild(view);
    this.bossTelegraphs.push({ view, lifeMs: 650, maxLifeMs: 650 });
  }

  private spawnBossHazard(
    x: number,
    y: number,
    angle: number,
    speed: number,
    color: number,
    lifeMs: number,
    radius: number,
    kind: HazardKind = "bossProjectile",
    damage = 9,
    expiresIntoFire = false,
  ): void {
    const view = new Graphics();
    view.circle(0, 0, radius).fill({ color, alpha: 0.85 }).stroke({ color: 0xfff3b0, alpha: 0.7, width: 2 });
    view.position.set(x, y);
    this.world.addChild(view);
    this.bossHazards.push({
      view,
      kind,
      x,
      y,
      radius,
      lifeMs,
      damage,
      tickElapsedMs: 0,
      expiresIntoFire,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
    });
  }

  private getNearestBoss(): BossActor | undefined {
    if (!this.player) return this.bosses[0];
    return [...this.bosses].sort((a, b) => distance(this.player!, a) - distance(this.player!, b))[0];
  }

  private highlightNearbyNode(): void {
    const nearby = this.getNearbyNode();
    for (const marker of this.nodeMarkers) {
      marker.view.clear();
      const node = this.state.exploration.nodes.find((candidate) => candidate.id === marker.nodeId);
      const color = node?.kind === "resource" ? 0x74c69d : node?.kind === "event" ? 0xf2cc8f : 0xe07a5f;
      marker.view.rect(-20, -20, 40, 40).fill({ color, alpha: 0.9 });
      if (marker === nearby) {
        marker.view.stroke({ color: 0xffffff, width: 4 });
      }
    }
  }

  private tryActivateStoryLighthouse(): boolean {
    if (!this.isStoryMode() || !this.player) return false;
    if (this.litStoryLighthouseIds.has(STORY_CENTER_LIGHTHOUSE.id)) return false;
    if (distance(this.player, STORY_CENTER_LIGHTHOUSE.position) > this.getInteractionRadius() + 260) return false;

    this.storySliceRenderer?.setLighthouseCharging();
    this.litStoryLighthouseIds.add(STORY_CENTER_LIGHTHOUSE.id);
    this.emitState("Center lighthouse lit: vision expanded and nearby monster pressure rises.");
    this.storySliceRenderer?.setLighthouseLit(true);
    this.storySliceRenderer?.playScanPulse(STORY_CENTER_LIGHTHOUSE.position);
    this.emitMetrics();
    return true;
  }

  private collectNearbyNode(): void {
    const marker = this.getNearbyNode();
    if (!marker) {
      this.emitState("No searchable point nearby.");
      return;
    }
    const node = this.state.exploration.nodes.find((candidate: MapNode) => candidate.id === marker.nodeId);
    this.state = collectNode(this.state, marker.nodeId);
    marker.view.alpha = 0.35;
    this.emitState("Search: " + (node?.name ?? marker.nodeId));
  }

  private getNearbyNode(): NodeActor | undefined {
    if (!this.player) return undefined;
    return this.nodeMarkers.find((marker) => {
      const alreadyResolved = this.state.exploration.resolvedNodeIds.includes(marker.nodeId);
      return !alreadyResolved && distance(this.player!, marker) <= this.getInteractionRadius();
    });
  }

  private updateCamera(): void {
    if (!this.player) return;
    const shakeAngle = Math.random() * Math.PI * 2;
    const shakeDistance = this.screenShakeMs > 0 ? Math.random() * this.screenShakeMagnitude : 0;
    const projectedPlayer = this.projectPoint(this.player);
    this.world.position.set(
      this.app.screen.width / 2 - projectedPlayer.x + Math.cos(shakeAngle) * shakeDistance,
      this.app.screen.height / 2 - projectedPlayer.y + Math.sin(shakeAngle) * shakeDistance,
    );
  }

  private updateVisibility(): void {
    const currentBuildingId = this.getCurrentBuildingId();
    this.updateInteriorVisibilityMask(currentBuildingId);

    for (const building of this.buildingVisuals) {
      const isCurrentInterior = currentBuildingId === building.id;
      building.shell.alpha = isCurrentInterior ? 0.72 : 0.44;
      building.roof.alpha = isCurrentInterior ? 0.08 : 0.94;
    }

    for (const enemy of this.enemies) {
      enemy.view.visible = this.isVisibleFromPlayerZone(enemy);
    }
    for (const boss of this.bosses) {
      const visible = this.isVisibleFromPlayerZone(boss);
      boss.view.visible = visible;
      boss.label.visible = visible;
    }
    for (const boss of this.getFinalBosses()) {
      const visible = this.isVisibleFromPlayerZone(boss);
      boss.view.visible = visible;
      boss.label.visible = visible;
    }
    for (const boss of this.getHospitalKnights()) {
      const visible = this.isVisibleFromPlayerZone(boss);
      boss.view.visible = visible;
      boss.label.visible = visible;
    }
    for (const pile of this.bonePiles) {
      pile.view.visible = this.isVisibleFromPlayerZone(pile);
    }
    for (const deathVisual of this.storyDeathVisuals) {
      deathVisual.view.visible = this.isVisibleFromPlayerZone(deathVisual);
    }
    if (this.playerTrap) {
      this.playerTrap.view.visible = this.isVisibleFromPlayerZone(this.playerTrap);
    }
    for (const bullet of this.bullets) {
      bullet.view.visible = this.isVisibleFromPlayerZone(bullet);
    }
    for (const projectile of this.heavyProjectiles) {
      projectile.view.visible = this.isVisibleFromPlayerZone(projectile);
    }
    for (const strike of this.autoStrikes) {
      strike.view.visible = this.isVisibleFromPlayerZone(strike);
    }
    for (const mine of this.warpMines) {
      mine.view.visible = this.isVisibleFromPlayerZone(mine);
    }
    for (const hazard of this.bossHazards) {
      hazard.view.visible = this.isVisibleFromPlayerZone(hazard);
    }
    for (const telegraph of this.bossTelegraphs) {
      telegraph.view.visible = this.getCurrentBuildingId() === null;
    }
    for (const marker of this.nodeMarkers) {
      marker.view.visible = this.isVisibleFromPlayerZone(marker);
    }
  }

  private updateInteriorVisibilityMask(currentBuildingId: string | null): void {
    this.interiorVisibilityMask.clear();
    this.interiorVisibilityMask.visible = currentBuildingId !== null || this.playerVisionNarrowMs > 0 || this.isStoryMode();
    if (!currentBuildingId) {
      if (this.isStoryMode() && this.player) {
        const storyRadius = this.getCurrentStoryVisionRadius() || STORY_FOG_BASE_RADIUS;
        const radius = this.playerVisionNarrowMs > 0 ? Math.min(storyRadius, 56) : storyRadius;
        for (const rect of getStoryCircularFogCoverRects(
          { width: this.getMapWidth(), height: this.getMapHeight() },
          this.player,
          radius,
          96,
        )) {
          this.interiorVisibilityMask.rect(rect.x, rect.y, rect.width, rect.height);
        }
        this.interiorVisibilityMask
          .fill({ color: 0x030403, alpha: 0.91 })
          .circle(this.player.x, this.player.y, radius)
          .stroke({ color: this.litStoryLighthouseIds.size > 0 ? 0xffd166 : 0x68e1fd, alpha: 0.7, width: 3 });
        return;
      }
      if (this.playerVisionNarrowMs <= 0 || !this.player) return;
      const radius = 56;
      const left = this.player.x - radius;
      const right = this.player.x + radius;
      const top = this.player.y - radius;
      const bottom = this.player.y + radius;
      this.interiorVisibilityMask
        .rect(0, 0, this.getMapWidth(), top)
        .rect(0, bottom, this.getMapWidth(), this.getMapHeight() - bottom)
        .rect(0, top, left, radius * 2)
        .rect(right, top, this.getMapWidth() - right, radius * 2)
        .fill({ color: 0x030403, alpha: 0.97 })
        .circle(this.player.x, this.player.y, radius)
        .stroke({ color: 0xff4d6d, alpha: 0.85, width: 3 });
      return;
    }

    const building = this.buildingVisuals.find((visual) => visual.id === currentBuildingId);
    if (!building) return;

    const left = building.x - building.width / 2;
    const right = building.x + building.width / 2;
    const top = building.y - building.height / 2;
    const bottom = building.y + building.height / 2;

    this.interiorVisibilityMask
      .rect(0, 0, this.getMapWidth(), top)
      .rect(0, bottom, this.getMapWidth(), this.getMapHeight() - bottom)
      .rect(0, top, left, building.height)
      .rect(right, top, this.getMapWidth() - right, building.height)
      .fill({ color: 0x030403, alpha: 0.96 });
  }

  private emitState(message: string): void {
    this.callbacks.onRunState(this.state);
    this.callbacks.onMessage(localizeGameMessage(message));
    this.emitMetrics();
  }

  private emitMetrics(): void {
    const bossNames = this.bosses.map((boss) => this.getBossName(boss.bossId));
    for (let index = 0; index < this.getFinalBosses().length; index += 1) {
      bossNames.push(FINAL_BOSS_DEFINITION.name);
    }
    for (let index = 0; index < this.getHospitalKnights().length; index += 1) {
      bossNames.push(HOSPITAL_KNIGHT_DEFINITION.name);
    }
    const nearestBoss = this.getNearestBoss();
    const finalBosses = this.getFinalBosses();
    const hospitalKnights = this.getHospitalKnights();
    const currentBuildingId = this.getCurrentBuildingId();
    const insideBuilding = this.player ? pointInsideBuildings(this.player, this.getActiveBuildings()) : false;
    const metrics = {
      enemyCount: this.enemies.length,
      bossCount: this.bosses.length + finalBosses.length + hospitalKnights.length,
      bossHazardCount: this.bossHazards.length,
      bulletCount:
        this.bullets.length +
        this.heavyProjectiles.length +
        this.autoStrikes.length +
        this.laserEffects.length +
        this.warpMines.length,
      buildingCount: this.getActiveBuildings().length,
      renderedBuildingCount: this.buildingVisuals.length,
      mapWidth: this.getMapWidth(),
      mapHeight: this.getMapHeight(),
      attackMode: this.attackMode,
      bossName: finalBosses.length > 0
        ? FINAL_BOSS_DEFINITION.name
        : hospitalKnights.length > 0
          ? HOSPITAL_KNIGHT_DEFINITION.name
          : nearestBoss
            ? this.getBossName(nearestBoss.bossId)
            : null,
      bossNames,
      insideBuilding,
      currentBuildingId,
      playerX: this.player?.x,
      playerY: this.player?.y,
      playerHealth: this.state.health,
      storyVisionRadius: this.isStoryMode() ? this.getCurrentStoryVisionRadius() : undefined,
      storyLitLighthouseCount: this.isStoryMode() ? this.litStoryLighthouseIds.size : undefined,
      storyMonsterPressureMultiplier: this.isStoryMode() ? this.getStoryMonsterPressureMultiplier() : undefined,
      storyMagicianInterferenceActive: this.isStoryMode() ? this.storyMagicianInterferenceActive : undefined,
      storyMagicianInterferenceCount: this.isStoryMode() ? this.storyMagicianInterferenceCount : undefined,
      selectedStoryMechId: this.isStoryMode() ? (this.options.storyMechId ?? null) : undefined,
      storyArtSliceEnabled: this.isStoryMode() && Boolean(this.storySliceRenderer),
      storyLighthouseVisualState: this.storySliceRenderer?.getLighthouseVisualState(),
      storyArtSpriteCount: this.storySliceRenderer?.debugSpriteCount(),
      story2_5dEnabled: this.isStoryMode(),
      story2_5dGroundScaleY: this.isStoryMode() ? STORY_2_5D_CONFIG.groundScaleY : undefined,
      story2_5dPlayerScreenY: this.isStoryMode() && this.player ? this.projectPoint(this.player).y : undefined,
    };
    this.callbacks.onMetrics(metrics);
    window.__prototypeDebug = metrics;
  }

  private getBossName(bossId: BossId): string {
    return BOSS_DEFINITIONS.find((boss) => boss.id === bossId)?.name ?? bossId;
  }

  private setActorPosition(actor: Actor, x: number, y: number, depthOffset = 20): void {
    actor.x = x;
    actor.y = y;
    this.setViewPosition(actor.view, x, y);
    actor.view.zIndex = this.getStoryVisualDepth({ x, y }, depthOffset);
  }

  private getBasicGunDamage(): number {
    return BASIC_GUN.damage + getSkillUpgradeStats(this.state.skillUpgradeRanks).basicDamageBonus;
  }

  private getBasicGunIntervalMs(): number {
    const interval = BASIC_GUN.attackIntervalMs * getSkillUpgradeStats(this.state.skillUpgradeRanks).attackIntervalMultiplier;
    return Math.max(35, Math.round(interval));
  }

  private getPlayerMoveSpeed(): number {
    const slow = this.playerSlowMs > 0 ? FINAL_BOSS_PHASE_ONE_SKILL.slowMultiplier : 1;
    const storyDebugMultiplier = this.isStoryMode() ? STORY_DEBUG_PLAYER_SPEED_MULTIPLIER : 1;
    return 260 * storyDebugMultiplier * getSkillUpgradeStats(this.state.skillUpgradeRanks).moveSpeedMultiplier * (this.mechTransformMs > 0 ? 1.55 : 1) * slow;
  }

  private getCurrentStoryVisionRadius(): number {
    if (!this.isStoryMode() || !this.player) return 0;
    return getStoryVisionRadius(this.player, [...this.litStoryLighthouseIds]);
  }

  private getStoryMonsterPressureMultiplier(): number {
    if (!this.isStoryMode() || !this.player) return 1;
    return getStoryMonsterPressureMultiplier(this.player, [...this.litStoryLighthouseIds]);
  }

  private getEffectiveCombatRange(baseRange: number): number {
    if (!this.isStoryMode()) return baseRange;
    return getStoryEffectiveAttackRange(baseRange, this.getCurrentStoryVisionRadius());
  }

  private getManualAttackTarget(): { x: number; y: number } | undefined {
    if (!this.player) return undefined;
    if (!this.isStoryMode()) return this.pointerWorld;
    return this.canAttackTarget(this.pointerWorld, 620) ? this.pointerWorld : undefined;
  }

  private canAttackTarget(target: { x: number; y: number }, baseRange: number): boolean {
    if (!this.player) return false;
    if (!this.isSameVisibilityZone(this.player, target)) return false;
    return distance(this.player, target) <= this.getEffectiveCombatRange(baseRange);
  }

  private isPointInsideCurrentStoryVision(point: { x: number; y: number }): boolean {
    if (!this.isStoryMode() || !this.player) return true;
    return isPointInsideStoryVision(this.player, point, this.getCurrentStoryVisionRadius());
  }

  private getSkillProjectileDamage(): number {
    return Math.round(72 * getSkillUpgradeStats(this.state.skillUpgradeRanks).skillDamageMultiplier);
  }

  private getInteractionRadius(): number {
    return 72 + getSkillUpgradeStats(this.state.skillUpgradeRanks).pickupRadiusBonus;
  }

  private getMechEnergyColor(): number {
    if (this.state.selectedMechFormId === "blade") return 0xff4d6d;
    if (this.state.selectedMechFormId === "laser") return 0xd9f7ff;
    if (this.state.selectedMechFormId === "missile") return 0xfff3b0;
    const stage = getMechEvolutionStage(this.state.skillUpgradeRanks);
    if (stage === "temporal") return 0xb56cff;
    if (stage === "laser") return 0xd9f7ff;
    if (stage === "heavy") return 0xfff3b0;
    return 0x68e1fd;
  }

  private getCurrentBuildingId(): string | null {
    return this.player ? getContainingBuildingId(this.player, this.getActiveBuildings()) : null;
  }

  private getVisibilityZoneId(point: { x: number; y: number }): string | null {
    return getContainingBuildingId(point, this.getActiveBuildings());
  }

  private isVisibleFromPlayerZone(actor: { x: number; y: number }): boolean {
    if (!this.player) return true;
    if (this.isStoryMode()) {
      return distance(this.player, actor) <= this.getCurrentStoryVisionRadius();
    }
    return this.getVisibilityZoneId(actor) === this.getCurrentBuildingId();
  }

  private isSameVisibilityZone(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
    return this.getVisibilityZoneId(a) === this.getVisibilityZoneId(b);
  }

  private applyPlayerDamage(amount: number): void {
    if (!this.player || this.state.health <= 0) return;
    const previousHealth = this.state.health;
    this.state = applyRunDamage(this.state, amount);
    const damage = previousHealth - this.state.health;
    if (damage <= 0) return;

    this.showDamageNumber(this.player.x, this.player.y - 34, damage, "#ff4d6d", "-");
    this.flashPlayerMech();
    this.callbacks.onRunState(this.state);
    if (this.state.health <= 0) {
      this.gameOver = true;
      this.callbacks.onGameOver(this.state);
    }
  }

  private updatePlayerHistory(deltaMs: number): void {
    if (!this.player) return;
    this.playerHistory = this.playerHistory
      .map((entry) => ({ ...entry, ageMs: entry.ageMs + deltaMs }))
      .filter((entry) => entry.ageMs <= 4200);
    const latest = this.playerHistory[0];
    if (!latest || latest.ageMs >= 220) {
      this.playerHistory.unshift({
        x: this.player.x,
        y: this.player.y,
        health: this.state.health,
        ageMs: 0,
      });
    }
  }

  private showDamageNumber(
    x: number,
    y: number,
    amount: number,
    color: string,
    prefix = "",
  ): void {
    const view = new Text({
      text: prefix + String(Math.round(amount)),
      style: new TextStyle({
        fill: color,
        fontFamily: "Arial",
        fontSize: 18,
        fontWeight: "700",
        stroke: { color: "#1a120f", width: 3 },
      }),
    });
    view.anchor.set(0.5);
    view.position.set(x, y);
    this.world.addChild(view);
    this.damageNumbers.push({ view, lifeMs: 650, velocityY: -44 });
  }

  private flashPlayerMech(): void {
    if (!this.player) return;
    if (this.playerStoryVisual) {
      this.triggerPlayerStoryOneShot("hit", this.movementDirection);
      this.playerStoryVisual.flash();
      return;
    }
    this.drawPlayerMech(this.player.view, 0xff4d6d);
    window.setTimeout(() => {
      if (!this.player || this.player.view.destroyed) return;
      this.drawPlayerMech(this.player.view);
    }, 80);
  }

  private playShotSound(): void {
    try {
      this.shotSound.play();
    } catch {
      // Browsers may block audio until a user gesture; the shot still fires.
    }
  }

  private isLeftDown(): boolean {
    return this.keys.has("a") || this.keys.has("arrowleft");
  }

  private isRightDown(): boolean {
    return this.keys.has("d") || this.keys.has("arrowright");
  }

  private isUpDown(): boolean {
    return this.keys.has("w") || this.keys.has("arrowup");
  }

  private isDownDown(): boolean {
    return this.keys.has("s") || this.keys.has("arrowdown");
  }
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distancePointToSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy || 1;
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return distance(point, { x: start.x + dx * t, y: start.y + dy * t });
}

function distancePointToRect(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
): number {
  const dx = Math.max(Math.abs(point.x - rect.x) - rect.width / 2, 0);
  const dy = Math.max(Math.abs(point.y - rect.y) - rect.height / 2, 0);
  return Math.hypot(dx, dy);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function getBuildingAccentColor(id: string): number {
  if (id === "res-police-hq") return 0x68e1fd;
  if (id === "res-hospital") return 0xff4d6d;
  if (id === "res-fire-station") return 0xff9f1c;
  if (id === "res-courier-station") return 0xffd166;
  if (id.startsWith("story-gate-wall-")) return 0xffd166;
  if (id.startsWith("story-passage-wall-")) return 0xffd166;
  if (id.startsWith("story-region-wall-")) return getStoryWallPalette(id).trim;
  if (id.startsWith("ent-maze-fake-wall-")) return 0xb8a7ff;
  if (id.startsWith("ent-maze-wall-")) return 0x9d4edd;
  if (id.startsWith("res-")) return 0x8d99ae;
  return 0x9a8c5f;
}

function getStoryWallPalette(id: string): { base: number; trim: number; detail: number } {
  if (id.includes("entertainment-zone")) return { base: 0x3c113f, trim: 0xffd166, detail: 0x9d4edd };
  if (id.includes("residential-zone")) return { base: 0x30353a, trim: 0xffd166, detail: 0x8d99ae };
  if (id.includes("research-zone")) return { base: 0x30354a, trim: 0x68e1fd, detail: 0xb8a7ff };
  if (id.includes("industrial-zone")) return { base: 0x3a332b, trim: 0xff9f1c, detail: 0x6c584c };
  if (id.includes("military-zone")) return { base: 0x25352b, trim: 0x74c69d, detail: 0x8a817c };
  if (id.includes("central-plaza")) return { base: 0x26342e, trim: 0xf8f4e3, detail: 0xffd166 };
  return { base: 0x262a2f, trim: 0x9a8c5f, detail: 0x59614f };
}

declare global {
  interface Window {
    __prototypeDebug?: GameMetrics;
  }
}
