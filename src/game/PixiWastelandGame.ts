import { Application, Container, Graphics, Text, TextStyle, type Ticker } from "pixi.js";
import { Howl } from "howler";
import { gsap } from "gsap";
import { BOSS_ORDER, SKILL_UPGRADES } from "../data/prototypeData";
import type { BossId, MapNode, RunState } from "../domain/types";
import {
  applyRunDamage,
  chooseRunMechForm,
  chooseRunSkillUpgrade,
  collectNode,
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
  BUILDINGS,
  getContainingBuildingId,
  pointInsideBuildings,
  resolveBlockedMovement,
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
import { getUltimateDefinition, type UltimateDefinition } from "../systems/mechForms";
import {
  FINAL_BOSS_DEFINITION,
  FINAL_BOSS_PHASE_ONE_SKILL,
  FINAL_BOSS_PHASE_THREE_SKILL,
  FINAL_BOSS_PHASE_TWO_SKILL,
  getEndgameUltimateDefinition,
  getFinalBossPhase,
  isEndgameReady,
  type EndgameUltimateDefinition,
} from "../systems/endgame";
import {
  HOSPITAL_KNIGHT_AGGRO_RADIUS,
  BONE_CONTACT_DAMAGE,
  BONE_SOLDIER_CONTACT_DAMAGE,
  GIANT_SWORD_TRAP_MS,
  HOSPITAL_KNIGHT_DEFINITION,
  HOSPITAL_KNIGHT_SPAWN,
  getHospitalKnightGuardRoamTarget,
  getHospitalKnightPhase,
  getInitialBoneHordeCount,
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
import type { GameMetrics } from "../app/gameStore";

type AttackMode = "auto" | "manual";
type BossMode = "roam" | "chase" | "charge" | "windup";
type HazardKind = "bossProjectile" | "chiliOil" | "firePit" | "bigFirePit" | "knife" | "magicBox";
type EnemyKind = "zombie" | "bone" | "boneSoldier";

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
}

interface FinalBossActor extends Actor {
  health: number;
  maxHealth: number;
  label: Text;
  phase: 1 | 2 | 3;
  skillElapsedMs: number;
  skillCooldownMs: number;
  contactDamageElapsedMs: number;
  skillCursor: number;
  wantedUsed: boolean;
  finalBeamUsed: boolean;
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
  private state: RunState = createRunState();
  private nodeMarkers: NodeActor[] = [];
  private enemies: EnemyActor[] = [];
  private bullets: BulletActor[] = [];
  private heavyProjectiles: HeavyProjectileActor[] = [];
  private autoStrikes: AutoStrikeActor[] = [];
  private laserEffects: LaserEffectActor[] = [];
  private warpMines: WarpMineActor[] = [];
  private bossHazards: HazardActor[] = [];
  private bossTelegraphs: TelegraphActor[] = [];
  private bosses: BossActor[] = [];
  private finalBoss?: FinalBossActor;
  private finalBossBombs: FinalBossBombActor[] = [];
  private finalBossMissiles: FinalBossMissileActor[] = [];
  private finalBossCrawlers: FinalBossCrawlerActor[] = [];
  private hospitalKnight?: HospitalKnightActor;
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
  private spawnSeed = 1;
  private readonly shotSound = new Howl({ src: [BULLET_SOUND], volume: 0.035 });

  constructor(
    private readonly host: HTMLElement,
    private readonly callbacks: GameCallbacks,
  ) {}

  async start(): Promise<void> {
    await this.app.init({
      backgroundColor: 0x171a16,
      resizeTo: this.host,
      antialias: true,
      preserveDrawingBuffer: true,
    });

    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.drawWorld();
    this.createPlayer();
    this.createNodeMarkers();
    if (!EXPERIMENTAL_DISABLE_SMALL_ENEMIES) {
      this.spawnInitialBosses();
      this.spawnHospitalKnight();
    }
    this.world.addChild(this.interiorVisibilityMask);
    this.bindInput();
    if (!EXPERIMENTAL_DISABLE_SMALL_ENEMIES) {
      this.spawnEnemyWave(getEnemySpawnBatchSize(this.state.level, 1000));
    }
    this.app.ticker.add(this.update);
    this.emitState("10000x10000 城市废土已展开。");
  }

  destroy(): void {
    this.unbindInput();
    this.app.ticker.remove(this.update);
    this.clearSkillChoiceOverlay();
    this.clearFormChoiceOverlay();
    this.app.destroy(true, { children: true });
  }

  private readonly update = (ticker: Ticker): void => {
    if (this.gameOver) return;
    const delta = ticker.deltaMS;
    if (this.state.pendingSkillChoiceIds.length > 0) {
      this.showSkillChoiceOverlay();
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
    if (wasTransformed && this.mechTransformMs === 0 && this.player) {
      this.drawPlayerMech(this.player.view);
    }
    this.updatePlayerSlow(delta);
    this.ensureEndgameBoss();
    this.movePlayer(delta);
    this.updateEnemies(delta);
    this.updateMechTransformationDamage(delta);
    this.updateBosses(delta);
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
    background.rect(0, 0, MAP_WIDTH, MAP_HEIGHT).fill(0x20251e);
    this.world.addChild(background);

    const grid = new Graphics();
    for (let x = 0; x <= MAP_WIDTH; x += 200) {
      grid.moveTo(x, 0).lineTo(x, MAP_HEIGHT).stroke({ color: 0x2f382b, alpha: 0.2, width: 1 });
    }
    for (let y = 0; y <= MAP_HEIGHT; y += 200) {
      grid.moveTo(0, y).lineTo(MAP_WIDTH, y).stroke({ color: 0x2f382b, alpha: 0.2, width: 1 });
    }
    this.world.addChild(grid);

    this.drawDistricts();
    this.drawBuildings();
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
    for (const building of BUILDINGS) {
      this.drawBuilding(building.id, building.x, building.y, building.width, building.height);
    }

  }

  private drawBuilding(id: string, x: number, y: number, width: number, height: number): void {
    const shape = new Graphics();
    shape
      .rect(x - width / 2, y - height / 2, width, height)
      .fill({ color: 0x1f2a24, alpha: 0.52 })
      .stroke({ color: 0x9a8c5f, alpha: 0.72, width: 2 });
    this.world.addChild(shape);

    const roof = new Graphics();
    roof
      .rect(x - width / 2, y - height / 2, width, height)
      .fill({ color: 0x111510, alpha: 0.9 })
      .stroke({ color: 0xfff3b0, alpha: 0.62, width: 2 });
    roof
      .rect(x - width / 2 + 14, y - height / 2 + 13, width - 28, 7)
      .fill({ color: 0xfff3b0, alpha: 0.5 });
    this.world.addChild(roof);
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

  private createPlayer(): void {
    const view = new Graphics();
    this.drawPlayerMech(view);
    view.position.set(PLAYER_START.x, PLAYER_START.y);
    this.world.addChild(view);
    this.player = { view, x: PLAYER_START.x, y: PLAYER_START.y };
    this.playerWeapon = this.createPlayerWeapon();
    this.updateCamera();
  }

  private createPlayerWeapon(): WeaponVisual {
    const container = new Container();
    container.position.set(PLAYER_START.x, PLAYER_START.y);

    const barrel = new Graphics();
    barrel
      .roundRect(2, -6, 46, 12, 4)
      .fill(0x15202b)
      .stroke({ color: 0x8ee7ff, alpha: 0.78, width: 1.5 });
    barrel.rect(10, -2, 24, 4).fill({ color: 0x68e1fd, alpha: 0.9 });
    barrel.rect(28, -9, 14, 5).fill(0x283a4d);
    barrel.rect(28, 4, 14, 5).fill(0x283a4d);
    barrel.rect(43, -4, 15, 3).fill(0xd9f7ff);
    barrel.rect(43, 1, 15, 3).fill(0xd9f7ff);
    container.addChild(barrel);

    const muzzleFlash = new Graphics();
    muzzleFlash
      .poly([52, 0, 74, -11, 66, 0, 74, 11])
      .fill({ color: 0xfff3b0, alpha: 0.9 })
      .circle(57, 0, 7)
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
  }

  private unbindInput(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.app.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.app.canvas.removeEventListener("pointerdown", this.handlePointerMove);
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
      this.fireProjectile(this.pointerWorld, "basic", this.getBasicGunDamage(), BASIC_GUN.projectileSpeed, "手动普攻");
    }
    if (event.key.toLowerCase() === "q") {
      this.attackMode = this.attackMode === "auto" ? "manual" : "auto";
      this.emitState(`普攻模式：${this.attackMode === "auto" ? "自动" : "手动"}`);
    }
    if (event.key.toLowerCase() === "e") {
      this.collectNearbyNode();
    }
    if (event.key.toLowerCase() === "x") {
      this.state = gainRunExperience(this.state, 120);
      this.emitState("调试：获得经验。Boss 已作为游荡威胁常驻地图。");
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
    this.pointerWorld = {
      x: event.clientX - rect.left - this.world.x,
      y: event.clientY - rect.top - this.world.y,
    };
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
    if (this.playerFreezeMs > 0) return;
    const moveSpeed = this.getPlayerMoveSpeed();
    const desired = {
      x: clamp(this.player.x + (dx / length) * moveSpeed * seconds, 24, MAP_WIDTH - 24),
      y: clamp(this.player.y + (dy / length) * moveSpeed * seconds, 24, MAP_HEIGHT - 24),
    };
    let resolved = resolveBlockedMovement(this.player, desired, 16);
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
      enemy.contactDamageElapsedMs += deltaMs;
      if (this.isDormantHospitalEnemy(enemy)) {
        this.updateDormantHospitalEnemy(enemy, deltaMs);
        continue;
      }
      const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      const desired = {
        x: enemy.x + Math.cos(angle) * enemy.speed * seconds,
        y: enemy.y + Math.sin(angle) * enemy.speed * seconds,
      };
      const resolved = resolveBlockedMovement(enemy, desired, 11);
      this.setActorPosition(enemy, resolved.x, resolved.y);
      enemy.view.rotation = angle;
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
          clamp(enemy.x + Math.cos(enemy.dashAngle ?? angle) * 520 * seconds, 24, MAP_WIDTH - 24),
          clamp(enemy.y + Math.sin(enemy.dashAngle ?? angle) * 520 * seconds, 24, MAP_HEIGHT - 24),
        );
      }
      if (
        enemy.contactDamageElapsedMs >= 700 &&
        this.isSameVisibilityZone(this.player, enemy) &&
        distance(this.player, enemy) <= 28
      ) {
        enemy.contactDamageElapsedMs = 0;
        this.applyPlayerDamage(
          enemy.kind === "boneSoldier" ? BONE_SOLDIER_CONTACT_DAMAGE : enemy.kind === "bone" ? BONE_CONTACT_DAMAGE : 5,
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
      const shouldTargetPlayer = shouldRoamingBossTargetPlayer({
        finalBossActive,
        sameZoneAsPlayer,
        playerInTerritory,
        distanceToPlayer: playerDistance,
      });

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

      if (shouldTargetPlayer && boss.skillElapsedMs >= boss.skillCooldownMs) {
        this.triggerBossSkill(boss);
      }

      const movement = this.getBossMovementTarget(boss);
      const speed = boss.mode === "windup" ? 0 : boss.mode === "charge" ? this.getBossChargeSpeed(boss) : boss.mode === "chase" ? 112 : 68;
      const angle = Math.atan2(movement.y - boss.y, movement.x - boss.x);
      const desired = {
        x: boss.x + Math.cos(angle) * speed * seconds,
        y: boss.y + Math.sin(angle) * speed * seconds,
      };
      const resolved = resolveBlockedMovement(boss, desired, 34);
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
      boss.label.position.set(boss.x - 64, boss.y - 62);
      boss.label.text = `${this.getBossName(boss.bossId)} ${Math.ceil(boss.health)}/${boss.maxHealth}`;
    }
  }

  private updateFinalBoss(deltaMs: number): void {
    if (!this.player || !this.finalBoss) return;
    const boss = this.finalBoss;
    const phase = getFinalBossPhase(boss.health, boss.maxHealth);
    this.updateFinalBossBombs(deltaMs);
    this.updateFinalBossMissiles(deltaMs);
    this.updateFinalBossCrawlers(deltaMs);
    this.updateFinalBossBuildings(deltaMs, phase);

    if (phase !== boss.phase) {
      boss.phase = phase;
      this.drawFinalBossSprite(boss.view, phase);
      if (phase === 3) {
        this.clearSniperBuildings();
      }
      this.emitState(`${FINAL_BOSS_DEFINITION.name} 进入 P${phase}`);
    }

    boss.skillElapsedMs += deltaMs;
    boss.contactDamageElapsedMs += deltaMs;
    const seconds = deltaMs / 1000;
    const speed = phase === 3 ? FINAL_BOSS_PHASE_THREE_SKILL.mechSpeed : FINAL_BOSS_PHASE_ONE_SKILL.coreSpeed;
    const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
    if (speed > 0) {
      const desired = {
        x: clamp(boss.x + Math.cos(angle) * speed * seconds, 24, MAP_WIDTH - 24),
        y: clamp(boss.y + Math.sin(angle) * speed * seconds, 24, MAP_HEIGHT - 24),
      };
      const resolved = resolveBlockedMovement(boss, desired, 46);
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

  private getBossMovementTarget(boss: BossActor): { x: number; y: number } {
    if (boss.mode === "charge") {
      return {
      x: boss.x + Math.cos(boss.chargeAngle) * 320,
      y: boss.y + Math.sin(boss.chargeAngle) * 320,
      };
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
      this.setActorPosition(bullet, bullet.projectile.x, bullet.projectile.y);

      if (
        bullet.projectile.expired ||
        bullet.x < 0 ||
        bullet.y < 0 ||
        bullet.x > MAP_WIDTH ||
        bullet.y > MAP_HEIGHT
      ) {
        this.removeBullet(bullet);
        continue;
      }

      if (
        this.hitEnemyWithBullet(bullet) ||
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
      missile.view.rotation = Math.atan2(missile.velocityY, missile.velocityX);
      this.setActorPosition(
        missile,
        missile.x + missile.velocityX * seconds,
        missile.y + missile.velocityY * seconds,
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
        hazard.x > MAP_WIDTH ||
        hazard.y > MAP_HEIGHT
      ) {
        if (hazard.expiresIntoFire) {
          this.spawnFirePit(hazard.x, hazard.y);
        }
        this.removeBossHazard(hazard);
        continue;
      }
      if (
        this.player &&
        this.isSameVisibilityZone(this.player, hazard) &&
        distance(this.player, hazard) <= hazard.radius + 16
      ) {
        if (hazard.kind === "firePit" || hazard.kind === "bigFirePit") {
          const tickMs = hazard.kind === "bigFirePit" ? BIG_FIRE_PIT.tickMs : 450;
          if (hazard.tickElapsedMs >= tickMs) {
            hazard.tickElapsedMs = 0;
            this.applyPlayerDamage(hazard.damage);
          }
        } else if (hazard.kind === "magicBox") {
          this.triggerMagicBoxEffect(hazard);
          this.removeBossHazard(hazard);
        } else {
          this.applyPlayerDamage(hazard.damage);
          if (hazard.expiresIntoFire) {
            this.spawnFirePit(hazard.x, hazard.y);
          }
          this.removeBossHazard(hazard);
        }
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
    if (
      !shouldAllowSmallEnemySpawning({
        experimentalDisabled: EXPERIMENTAL_DISABLE_SMALL_ENEMIES,
        finalBossActive: Boolean(this.finalBoss),
      })
    ) {
      return;
    }
    this.enemySpawnElapsed += deltaMs;
    const maxAlive = getEnemyMaxAlive(this.state.level);
    let ticks = 0;
    while (this.enemySpawnElapsed >= ENEMY_SPAWN_TICK_MS && this.enemies.length < maxAlive && ticks < 8) {
      this.enemySpawnElapsed -= ENEMY_SPAWN_TICK_MS;
      ticks += 1;
      const spawnCount = Math.min(
        getEnemySpawnBatchSize(this.state.level, ENEMY_SPAWN_TICK_MS),
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
      this.fireProjectile(target, "basic", this.getBasicGunDamage(), BASIC_GUN.projectileSpeed, "自动普攻");
    }
  }

  private spawnEnemyWave(count: number): void {
    if (!this.player) return;
    for (let index = 0; index < count; index += 1) {
      const position = this.findOpenEnemySpawnPosition();
      const view = new Graphics();
      this.drawZombieEnemy(view);
      view.position.set(position.x, position.y);
      this.world.addChild(view);
      this.enemies.push({
        view,
        kind: "zombie",
        x: position.x,
        y: position.y,
        health: 28,
        speed: 58 + (this.spawnSeed % 4) * 8,
        contactDamageElapsedMs: 700,
      });
    }
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

  private flashEnemy(enemy: EnemyActor): void {
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
    const player = this.player ?? PLAYER_START;
    const position = getSpawnPositionAroundPlayer(player, this.spawnSeed);
    this.spawnSeed += 1;
    return position;
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
      view.rotation = Math.atan2(projectile.velocityY, projectile.velocityX);
    } else {
      view.circle(0, 0, projectile.radius).fill(0xff9f1c);
    }
    view.position.set(projectile.x, projectile.y);
    this.world.addChild(view);
    this.bullets.push({ view, x: projectile.x, y: projectile.y, projectile });
    if (kind === "basic") {
      this.animateGunshot();
    }
    this.playShotSound();
    if (label) {
      this.emitState(`${label}：发射子弹。`);
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
    view.position.set(launchPoint.x, launchPoint.y);
    view.rotation = launchAngle;
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
    this.emitState("聚能激光：穿透扫射");
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
      if (distancePointToSegment(enemy, start, end) > beamRadius + 11) continue;
      if (enemy.kind === "bone" || enemy.kind === "boneSoldier") {
        this.aggroHospitalKnight();
      }
      enemy.health -= damage;
      this.showDamageNumber(enemy.x, enemy.y - 24, damage, "#9ffcff");
      this.flashEnemy(enemy);
      if (enemy.health <= 0) {
        this.defeatEnemy(enemy);
      }
    }
    for (const boss of [...this.bosses]) {
      if (this.getVisibilityZoneId(boss) !== this.getVisibilityZoneId(start)) continue;
      if (distancePointToSegment(boss, start, end) > beamRadius + 34) continue;
      boss.health -= damage;
      this.showDamageNumber(boss.x, boss.y - 46, damage, "#9ffcff");
      gsap.fromTo(boss.view.scale, { x: 1.12, y: 1.12 }, { x: 1, y: 1, duration: 0.12 });
      if (boss.health <= 0) {
        this.defeatBoss(boss);
      }
    }
    if (this.finalBoss && distancePointToSegment(this.finalBoss, start, end) <= beamRadius + 58) {
      this.damageFinalBoss(damage, "direct");
    }
    if (
      this.hospitalKnight &&
      this.getVisibilityZoneId(this.hospitalKnight) === this.getVisibilityZoneId(start) &&
      distancePointToSegment(this.hospitalKnight, start, end) <= beamRadius + 46
    ) {
      this.damageHospitalKnight(damage);
    }
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
      this.emitState("技能被抑制中：相位闪现失效");
      return true;
    }
    const skill = ENERGY_SKILL_DEFINITIONS.find((candidate) => candidate.id === "phase-blink");
    if (!skill || !this.player || (this.state.skillUpgradeRanks["phase-blink"] ?? 0) <= 0) return false;
    this.energySkillElapsedMs["phase-blink"] = (this.energySkillElapsedMs["phase-blink"] ?? skill.cooldownMs) + 0;
    if (!isEnergySkillReady(skill, this.energySkillElapsedMs["phase-blink"] ?? 0)) {
      const seconds = Math.ceil((skill.cooldownMs - (this.energySkillElapsedMs["phase-blink"] ?? 0)) / 1000);
      this.emitState(`相位闪现冷却中：${seconds}s`);
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
    const resolved = resolveBlockedMovement(this.player, desired, 16);
    this.drawPhaseRing(this.player.x, this.player.y, radius);
    this.setActorPosition(this.player, resolved.x, resolved.y);
    this.drawPhaseRing(this.player.x, this.player.y, radius);
    this.detonateAutoWeapon(this.player.x, this.player.y, radius, damage, 0xb56cff);
    this.emitState("相位闪现：折跃脱离");
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
    this.emitState("时间回溯：返回安全坐标");
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
    this.emitState("折跃地雷：后方布设");
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
      this.emitState("技能被抑制中");
      return;
    }
    const skillId = this.state.activeSkillIds[index];
    if (!skillId) {
      this.emitState(`技能槽 ${index + 1} 为空。`);
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
    this.emitState(`释放技能槽 ${index + 1}：扇形弹幕。`);
  }

  private castUltimate(): void {
    if (this.skillSuppressMs > 0) {
      this.emitState("技能被抑制中：终极技无法释放");
      return;
    }
    if (!this.player || !this.state.selectedMechFormId) {
      this.emitState("终极形态尚未上线。");
      return;
    }
    const ultimate = getUltimateDefinition(this.state.selectedMechFormId);
    if (this.ultimateElapsedMs < ultimate.cooldownMs) {
      const seconds = Math.ceil((ultimate.cooldownMs - this.ultimateElapsedMs) / 1000);
      this.emitState(`终极技冷却中：${seconds}s`);
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
    this.emitState(`${ultimate.name}：轨道激光矩阵锁定。`);
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
    this.emitState(`${ultimate.name}：导弹舱全开，区域饱和覆盖。`);
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
    const end = resolveBlockedMovement(this.player, desired, 16);
    this.drawPhaseRing(start.x, start.y, ultimate.radius * 0.55);
    this.drawLaserEffect(start, end, 0xff4d6d);
    this.damageTargetsAlongLine(start, end, ultimate.radius, ultimate.damage);
    this.setActorPosition(this.player, end.x, end.y);
    this.drawPhaseRing(end.x, end.y, ultimate.radius * 0.7);
    this.detonateAutoWeapon(end.x, end.y, ultimate.radius * 0.55, Math.round(ultimate.damage * 0.75), 0xff4d6d);
    this.addScreenShake(260, 8);
    this.emitState(`${ultimate.name}：高热刀刃贯穿战场。`);
  }

  private castEndgameUltimate(): void {
    if (this.skillSuppressMs > 0) {
      this.emitState("技能被抑制中：超级大招无法释放");
      return;
    }
    if (!this.player || !this.state.selectedMechFormId) {
      this.emitState("终局大招尚未解锁。");
      return;
    }
    if (!isEndgameReady(this.state)) {
      this.emitState("终局阶段尚未开始。");
      return;
    }
    const ultimate = getEndgameUltimateDefinition(this.state.selectedMechFormId);
    if (this.endgameUltimateElapsedMs < ultimate.cooldownMs) {
      const seconds = Math.ceil((ultimate.cooldownMs - this.endgameUltimateElapsedMs) / 1000);
      this.emitState(`超级大招冷却中：${seconds}s`);
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
    this.emitState(`${ultimate.name}：整片天空被光柱贯穿。`);
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
    this.emitState(`${ultimate.name}：核弹坐标已确认。`);
  }

  private castMechTransformUltimate(ultimate: EndgameUltimateDefinition): void {
    if (!this.player) return;
    this.mechTransformMs = 12000;
    this.drawPlayerMech(this.player.view, 0xff4d6d);
    this.drawPhaseRing(this.player.x, this.player.y, ultimate.radius);
    this.detonateAutoWeapon(this.player.x, this.player.y, ultimate.radius, ultimate.damage, 0xff4d6d);
    this.addScreenShake(420, 9);
    this.emitState(`${ultimate.name}：突击装甲展开，近身碾压启动。`);
  }

  private hitEnemyWithBullet(bullet: BulletActor): boolean {
    for (const enemy of [...this.enemies]) {
      if (!this.isSameVisibilityZone(bullet, enemy)) continue;
      if (!projectileHitsCircle(bullet.projectile, { x: enemy.x, y: enemy.y, radius: 11 })) continue;
      if (enemy.kind === "bone" || enemy.kind === "boneSoldier") {
        this.aggroHospitalKnight();
      }
      enemy.health -= bullet.projectile.damage;
      this.spawnHitSparks(enemy.x, enemy.y, 0x68e1fd, 5);
      this.showDamageNumber(enemy.x, enemy.y - 20, bullet.projectile.damage, "#ffe066");
      this.flashEnemy(enemy);
      if (enemy.health <= 0) {
        this.defeatEnemy(enemy);
      }
      return true;
    }
    return false;
  }

  private hitBossWithBullet(bullet: BulletActor): boolean {
    for (const boss of [...this.bosses]) {
      if (!this.isSameVisibilityZone(bullet, boss)) continue;
      if (!projectileHitsCircle(bullet.projectile, { x: boss.x, y: boss.y, radius: 34 })) continue;
      boss.health -= bullet.projectile.damage;
      this.spawnHitSparks(boss.x, boss.y, 0xfff3b0, 9);
      this.addScreenShake(55, 3.2);
      this.showDamageNumber(boss.x, boss.y - 42, bullet.projectile.damage, "#ff9f1c");
      gsap.fromTo(boss.view.scale, { x: 1.18, y: 1.18 }, { x: 1, y: 1, duration: 0.12 });
      if (boss.health <= 0) {
        this.defeatBoss(boss);
      }
      return true;
    }
    return false;
  }

  private hitFinalBossWithBullet(bullet: BulletActor): boolean {
    const boss = this.finalBoss;
    if (!boss) return false;
    if (!projectileHitsCircle(bullet.projectile, { x: boss.x, y: boss.y, radius: 58 })) return false;
    this.damageFinalBoss(bullet.projectile.damage, "direct");
    this.spawnHitSparks(boss.x, boss.y, 0xff4d6d, 12);
    this.addScreenShake(80, 3.8);
    return true;
  }

  private hitHospitalKnightWithBullet(bullet: BulletActor): boolean {
    const boss = this.hospitalKnight;
    if (!boss) return false;
    if (!this.isSameVisibilityZone(bullet, boss)) return false;
    if (!projectileHitsCircle(bullet.projectile, { x: boss.x, y: boss.y, radius: 46 })) return false;
    this.aggroHospitalKnight();
    this.damageHospitalKnight(bullet.projectile.damage);
    this.spawnHitSparks(boss.x, boss.y, 0xd9f7ff, 10);
    this.addScreenShake(70, 3.4);
    return true;
  }

  private damageFinalBoss(amount: number, kind: "direct" | "explosive" = "direct"): void {
    const boss = this.finalBoss;
    if (!boss) return;
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
      this.defeatFinalBoss();
    }
  }

  private damageHospitalKnight(amount: number): void {
    const boss = this.hospitalKnight;
    if (!boss) return;
    this.aggroHospitalKnight();
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
      this.defeatHospitalKnight();
    }
  }

  private defeatHospitalKnight(): void {
    const boss = this.hospitalKnight;
    if (!boss) return;
    this.world.removeChild(boss.view);
    this.world.removeChild(boss.label);
    boss.view.destroy();
    boss.label.destroy();
    this.hospitalKnight = undefined;
    this.addScreenShake(520, 10);
    this.emitState("Hospital knight defeated. The ruined hospital falls silent.");
  }

  private defeatFinalBoss(): void {
    const boss = this.finalBoss;
    if (!boss) return;
    this.world.removeChild(boss.view);
    this.world.removeChild(boss.label);
    boss.view.destroy();
    boss.label.destroy();
    this.finalBoss = undefined;
    this.gameOver = true;
    this.addScreenShake(800, 12);
    this.emitState("任务完成：最终 Boss 已击杀");
    this.callbacks.onRunState(this.state);
    this.callbacks.onMissionSuccess(this.state);
  }

  private defeatEnemy(enemy: EnemyActor): void {
    if (enemy.kind === "bone" || enemy.kind === "boneSoldier") {
      this.spawnBonePile(enemy.x, enemy.y);
    }
    this.world.removeChild(enemy.view);
    enemy.view.destroy();
    this.enemies = this.enemies.filter((candidate) => candidate !== enemy);
    this.state = recordRunEnemyKill(gainRunExperience(this.state, 6));
    if (this.state.pendingSkillChoiceIds.length > 0) {
      this.emitState("击杀充能完成，选择一个机甲强化。");
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
      this.emitState(`${skill.name}：轨道校准`);
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
      this.emitState(`${weapon.name}：目标锁定`);
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
      this.emitState(`${weapon.name}：蜂群发射`);
      return true;
    }

    const target = this.getAutoWeaponTarget(weapon);
    if (!target) return false;
    this.spawnHeavyProjectile(weapon, target, damage, 0);
    this.emitState(`${weapon.name}：导弹发射`);
    return true;
  }

  private defeatBoss(boss: BossActor): void {
    this.world.removeChild(boss.view, boss.label);
    boss.view.destroy();
    boss.label.destroy();
    this.bosses = this.bosses.filter((candidate) => candidate !== boss);
    this.state = killRunBoss(this.state, boss.bossId);
    this.emitState(`击杀 Boss：${this.getBossName(boss.bossId)}`);
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
      text: "击杀充能已满，点击一个选项或按 1-3 继续战斗",
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
    if (this.player) {
      this.drawPlayerMech(this.player.view);
    }
    this.clearSkillChoiceOverlay();
    this.emitState(`选择强化：${definition?.name ?? upgradeId}`);
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
      text: "Lv50 形态核心上线。点击一个选项或按 1-3，R 释放终极大招。",
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
    if (this.player) {
      this.drawPlayerMech(this.player.view);
    }
    this.clearFormChoiceOverlay();
    this.emitState(`最终形态：${this.getMechFormName(formId)}，终极技 ${getUltimateDefinition(formId).name}`);
  }

  private getMechFormName(formId: NonNullable<RunState["selectedMechFormId"]>): string {
    if (formId === "laser") return "激光形态";
    if (formId === "missile") return "导弹形态";
    return "大刀形态";
  }

  private getMechFormDescription(formId: NonNullable<RunState["selectedMechFormId"]>): string {
    if (formId === "laser") {
      return "强化持续激光、折射链路和轨道锁定。终极技召唤多束天基裁决光束。";
    }
    if (formId === "missile") {
      return "强化爆炸、导弹舱和高射炮覆盖。终极技在目标区进行末日饱和轰炸。";
    }
    return "强化冲刺、回溯和近身压制。终极技拔出热熔斩舰刀向指向位置突进斩击。";
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
      if (distance(enemy, { x, y }) > radius + 11) continue;
      if (enemy.kind === "bone" || enemy.kind === "boneSoldier") {
        this.aggroHospitalKnight();
      }
      enemy.health -= damage;
      this.showDamageNumber(enemy.x, enemy.y - 24, damage, "#ffe066");
      this.flashEnemy(enemy);
      if (enemy.health <= 0) {
        this.defeatEnemy(enemy);
      }
    }

    for (const boss of [...this.bosses]) {
      if (this.getVisibilityZoneId(boss) !== this.getVisibilityZoneId({ x, y })) continue;
      if (distance(boss, { x, y }) > radius + 34) continue;
      boss.health -= damage;
      this.showDamageNumber(boss.x, boss.y - 46, damage, "#ff9f1c");
      gsap.fromTo(boss.view.scale, { x: 1.16, y: 1.16 }, { x: 1, y: 1, duration: 0.14 });
      if (boss.health <= 0) {
        this.defeatBoss(boss);
      }
    }

    if (this.finalBoss && distance(this.finalBoss, { x, y }) <= radius + 58) {
      this.damageFinalBoss(damage, "explosive");
    }

    if (
      this.hospitalKnight &&
      this.getVisibilityZoneId(this.hospitalKnight) === this.getVisibilityZoneId({ x, y }) &&
      distance(this.hospitalKnight, { x, y }) <= radius + 46
    ) {
      this.damageHospitalKnight(damage);
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

  private getNearestTarget(maxDistance: number): { x: number; y: number } | undefined {
    if (!this.player) return undefined;
    let nearest: { x: number; y: number; distance: number } | undefined;
    for (const enemy of this.enemies) {
      if (!this.isSameVisibilityZone(this.player, enemy)) continue;
      const distanceToEnemy = distance(this.player, enemy);
      if (distanceToEnemy <= maxDistance && (!nearest || distanceToEnemy < nearest.distance)) {
        nearest = { x: enemy.x, y: enemy.y, distance: distanceToEnemy };
      }
    }
    for (const boss of this.bosses) {
      if (!this.isSameVisibilityZone(this.player, boss)) continue;
      const distanceToBoss = distance(this.player, boss);
      if (distanceToBoss <= maxDistance && (!nearest || distanceToBoss < nearest.distance)) {
        nearest = { x: boss.x, y: boss.y, distance: distanceToBoss };
      }
    }
    if (this.finalBoss) {
      const distanceToFinalBoss = distance(this.player, this.finalBoss);
      if (distanceToFinalBoss <= maxDistance && (!nearest || distanceToFinalBoss < nearest.distance)) {
        nearest = { x: this.finalBoss.x, y: this.finalBoss.y, distance: distanceToFinalBoss };
      }
    }
    if (this.hospitalKnight) {
      const distanceToHospitalKnight = distance(this.player, this.hospitalKnight);
      if (distanceToHospitalKnight <= maxDistance && (!nearest || distanceToHospitalKnight < nearest.distance)) {
        nearest = { x: this.hospitalKnight.x, y: this.hospitalKnight.y, distance: distanceToHospitalKnight };
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
    const targets: Actor[] = [...this.enemies, ...this.bosses];
    if (this.finalBoss) {
      targets.push(this.finalBoss);
    }
    if (this.hospitalKnight) {
      targets.push(this.hospitalKnight);
    }
    return targets.filter(
      (target) => this.isSameVisibilityZone(this.player!, target) && distance(this.player!, target) <= maxDistance,
    );
  }

  private countTargetsNear(origin: Actor, radius: number): number {
    const targets: Actor[] = [...this.enemies, ...this.bosses];
    if (this.finalBoss) {
      targets.push(this.finalBoss);
    }
    if (this.hospitalKnight) {
      targets.push(this.hospitalKnight);
    }
    return targets.filter(
      (target) => this.isSameVisibilityZone(origin, target) && distance(origin, target) <= radius,
    ).length;
  }

  private updateWeaponAim(target = this.getWeaponAimTarget()): void {
    if (!this.player || !this.playerWeapon) return;
    this.playerWeapon.container.position.set(this.player.x, this.player.y);
    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    this.playerWeapon.container.rotation = angle;
    this.player.view.rotation = angle + Math.PI / 2;
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
    const muzzleX = this.player.x + Math.cos(angle) * 58;
    const muzzleY = this.player.y + Math.sin(angle) * 58;

    for (let index = 0; index < BASIC_GUN.sparkCount; index += 1) {
      const sparkAngle = angle + (Math.random() - 0.5) * 0.75;
      const spark = new Graphics();
      spark.circle(0, 0, 1.2 + Math.random() * 2.2).fill(index % 2 === 0 ? 0xfff3b0 : 0x68e1fd);
      spark.position.set(muzzleX, muzzleY);
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
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const spark = new Graphics();
      spark.rect(-1, -1, 2 + Math.random() * 3, 2).fill(color);
      spark.position.set(x, y);
      spark.rotation = angle;
      this.world.addChild(spark);
      gsap.to(spark, {
        x: x + Math.cos(angle) * (18 + Math.random() * 24),
        y: y + Math.sin(angle) * (18 + Math.random() * 24),
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
      this.emitState("当前地图上没有常规 Boss。");
      return;
    }
    gsap.fromTo(boss.view.scale, { x: 1.45, y: 1.45 }, { x: 1, y: 1, duration: 0.32 });
    this.emitState(`最近 Boss：${this.getBossName(boss.bossId)}，正在${boss.mode === "roam" ? "游荡" : "追击"}。`);
  }

  private ensureEndgameBoss(): void {
    if (!this.player || this.finalBoss || !isEndgameReady(this.state)) return;
    this.spawnFinalBoss();
  }

  private spawnFinalBoss(): void {
    if (!this.player) return;
    const position = {
      x: PLAYER_START.x,
      y: PLAYER_START.y,
    };
    const view = new Graphics();
    this.drawFinalBossSprite(view, 1);
    view.position.set(position.x, position.y);
    this.world.addChild(view);
    const label = new Text({
      text: "",
      style: new TextStyle({ fill: "#ff4d6d", fontFamily: "Arial", fontSize: 18, fontWeight: "700" }),
    });
    label.position.set(position.x - 108, position.y - 86);
    this.world.addChild(label);
    this.finalBoss = {
      view,
      label,
      x: position.x,
      y: position.y,
      health: FINAL_BOSS_DEFINITION.maxHealth,
      maxHealth: FINAL_BOSS_DEFINITION.maxHealth,
      phase: 1,
      skillElapsedMs: 0,
      skillCooldownMs: 2600,
      contactDamageElapsedMs: 650,
      skillCursor: 0,
      wantedUsed: false,
      finalBeamUsed: false,
    };
    this.addScreenShake(500, 9);
    this.engageRoamingBossesForFinalFight();
    this.emitState(`${FINAL_BOSS_DEFINITION.name} 已降临，终局阶段开始。按 T 释放超级大招。`);
  }

  private engageRoamingBossesForFinalFight(): void {
    for (const boss of this.bosses) {
      boss.mode = boss.mode === "charge" || boss.mode === "windup" ? boss.mode : "chase";
      boss.roamTarget = this.player ? { x: this.player.x, y: this.player.y } : boss.roamTarget;
      boss.skillElapsedMs = Math.max(boss.skillElapsedMs, boss.skillCooldownMs);
    }
    if (this.hospitalKnight) {
      this.aggroHospitalKnight();
    }
  }

  private drawFinalBossSprite(view: Graphics, phase: 1 | 2 | 3): void {
    const accent = phase === 1 ? 0xff9f1c : phase === 2 ? 0x68e1fd : 0xff4d6d;
    view.clear();
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

  private castFinalBossCoreRay(boss: FinalBossActor): void {
    const skill = FINAL_BOSS_PHASE_ONE_SKILL;
    this.drawExpandingRing(boss.x, boss.y, skill.interferenceRadius, 0xff1744, skill.beamDelayMs);
    if (this.player) {
      this.playerSlowMs = Math.max(this.playerSlowMs, skill.slowMs);
      this.showDamageNumber(this.player.x, this.player.y - 44, 0, "#68e1fd", "SLOW ");
    }
    this.drawExpandingRing(boss.x, boss.y, 132, 0xffffff, skill.beamDelayMs);
    window.setTimeout(() => {
      if (!this.player || !this.finalBoss || this.finalBoss !== boss || boss.phase === 3 || boss.view.destroyed) return;
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
    this.emitState(`${FINAL_BOSS_DEFINITION.name}: 干扰波展开，红色射线锁定中`);
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
    this.emitState(`${FINAL_BOSS_DEFINITION.name}: 轰炸区域已标记`);
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
    this.emitState(`${FINAL_BOSS_DEFINITION.name}: 全城通缉，狙击手占领楼顶`);
  }

  private clearSniperBuildings(): void {
    for (const building of this.buildingVisuals) {
      if (!building.isSniperNest) continue;
      building.isSniperNest = false;
      this.redrawBuildingRoof(building);
    }
  }

  private updateFinalBossBuildings(deltaMs: number, phase: 1 | 2 | 3): void {
    this.finalBossBuildingCollisionElapsedMs = Math.min(
      FINAL_BOSS_PHASE_ONE_SKILL.buildingCollisionIntervalMs,
      this.finalBossBuildingCollisionElapsedMs + deltaMs,
    );
    for (const building of this.buildingVisuals) {
      building.chargeCooldownMs = Math.max(0, building.chargeCooldownMs - deltaMs);
      building.weaponCooldownMs = Math.max(0, building.weaponCooldownMs - deltaMs);
      building.sniperCooldownMs = Math.max(0, building.sniperCooldownMs - deltaMs);
    }
    if (!this.player || !this.finalBoss) return;
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

  private updateSniperBuilding(building: BuildingVisual, phase: 1 | 2 | 3): void {
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
    this.emitState(`${FINAL_BOSS_DEFINITION.name}: 操控楼房砸向玩家`);
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
    this.emitState(`${FINAL_BOSS_DEFINITION.name}: 橙色贯城光束`);
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
    this.emitState(`${FINAL_BOSS_DEFINITION.name}: 背部导弹锁定`);
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
    this.emitState(`${FINAL_BOSS_DEFINITION.name}: 抑制爬虫释放`);
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
    this.emitState(`${FINAL_BOSS_DEFINITION.name}: 最终毁灭光束`);
    this.addScreenShake(1400, 16);
    for (let index = 0; index < 6; index += 1) {
      window.setTimeout(() => {
        if (!this.finalBoss || !this.player || this.gameOver) return;
        const angle = startAngle + index * (Math.PI / 10);
        const end = {
          x: clamp(boss.x + Math.cos(angle) * FINAL_BOSS_PHASE_ONE_SKILL.beamRange, 24, MAP_WIDTH - 24),
          y: clamp(boss.y + Math.sin(angle) * FINAL_BOSS_PHASE_ONE_SKILL.beamRange, 24, MAP_HEIGHT - 24),
        };
        this.drawWideBeam(boss, end, 0x8b0016, 150, 360);
        if (distancePointToSegment(this.player, boss, end) <= 150) {
          this.gameOver = true;
          this.state = { ...this.state, health: 0 };
          this.callbacks.onRunState(this.state);
          this.callbacks.onGameOver(this.state);
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

  private spawnHospitalKnight(): void {
    if (this.hospitalKnight) return;
    const view = new Graphics();
    this.drawHospitalKnight(view, 1);
    view.position.set(HOSPITAL_KNIGHT_SPAWN.x, HOSPITAL_KNIGHT_SPAWN.y);
    this.world.addChild(view);
    const label = new Text({
      text: "",
      style: new TextStyle({ fill: "#fff3b0", fontFamily: "Arial", fontSize: 17, fontWeight: "700" }),
    });
    this.world.addChild(label);
    this.hospitalKnight = {
      view,
      label,
      x: HOSPITAL_KNIGHT_SPAWN.x,
      y: HOSPITAL_KNIGHT_SPAWN.y,
      health: HOSPITAL_KNIGHT_DEFINITION.maxHealth,
      maxHealth: HOSPITAL_KNIGHT_DEFINITION.maxHealth,
      phase: 1,
      skillElapsedMs: 0,
      skillCooldownMs: 3400,
      skillCursor: 0,
      holyShroudCasts: 0,
      contactDamageElapsedMs: 700,
      chargeMs: 0,
      chargeAngle: 0,
      aggro: false,
      guardTarget: getHospitalKnightGuardRoamTarget(this.spawnSeed),
    };
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

  private spawnBoneEnemy(x: number, y: number, kind: "bone" | "boneSoldier"): void {
    const view = new Graphics();
    this.drawBoneEnemy(view, kind);
    view.position.set(x, y);
    this.world.addChild(view);
    this.enemies.push({
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
    });
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
    const knight = this.hospitalKnight;
    if (!this.player || !knight) return;

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
    const resolved = resolveBlockedMovement(knight, desired, 44);
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
    knight.label.text = `${HOSPITAL_KNIGHT_DEFINITION.name} P${knight.phase} ${Math.ceil(knight.health)}/${knight.maxHealth}${shield}`;
  }

  private updateDormantHospitalKnight(knight: HospitalKnightActor, deltaMs: number): void {
    if (!this.player) return;
    if (shouldHospitalKnightAggro(distance(this.player, knight), false)) {
      this.aggroHospitalKnight();
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
    knight.label.text = `${HOSPITAL_KNIGHT_DEFINITION.name} GUARD ${Math.ceil(knight.health)}/${knight.maxHealth}`;
  }

  private aggroHospitalKnight(): void {
    const knight = this.hospitalKnight;
    if (!knight || knight.aggro) return;
    knight.aggro = true;
    knight.skillElapsedMs = 0;
    this.addScreenShake(160, 4);
    this.emitState("Hospital knight awakened: the ruined hospital is hostile.");
  }

  private triggerHospitalKnightSkill(knight: HospitalKnightActor): void {
    knight.skillElapsedMs = 0;
    if (!this.player) return;
    if (knight.phase === 2 && shouldConvertZombieToBoneSoldier(knight.holyShroudCasts)) {
      knight.holyShroudCasts += 1;
      this.convertNearbyZombiesToBoneSoldiers(knight, 12);
      this.drawHolyShroud(knight);
      this.emitState(`Holy shroud ${knight.holyShroudCasts}/3: nearby zombies become bone soldiers.`);
      return;
    }

    if (knight.skillCursor % 2 === 0) {
      this.castGiantSwordShackle();
    } else {
      this.castHolyCharge(knight);
    }
    knight.skillCursor += 1;
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
    knight.chargeMs = 620;
    this.spawnHospitalChargeTelegraph(knight, angle);
    for (const bone of this.enemies) {
      if (bone.kind === "zombie" || distance(bone, this.player) > 520) continue;
      bone.dashAngle = Math.atan2(this.player.y - bone.y, this.player.x - bone.x);
      bone.dashMs = bone.kind === "boneSoldier" ? 340 : 240;
      bone.dashElapsedMs = 0;
    }
    this.emitState("Hospital knight casts Holy Charge.");
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

  private spawnBoss(bossId: BossId): void {
    if (!this.player || this.bosses.some((boss) => boss.bossId === bossId)) return;
    const definition = BOSS_ORDER.find((boss) => boss.id === bossId);
    if (!definition) return;
    const position = this.findOpenBossSpawnPosition(bossId);
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
    const maxHealth = runtimeStats.maxHealth;
    this.bosses.push({
      view,
      label,
      bossId,
      x: position.x,
      y: position.y,
      maxHealth,
      health: maxHealth,
      mode: "roam",
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
    });
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
      view.rect(37, -30, 8, 62).fill(theme.weaponColor).stroke({ color: 0x4a1717, width: 2 });
      view.poly([45, -34, 63, -22, 48, -5]).fill(0xc8d5d9);
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
    const skill = getNextAdvancedBossSkill(boss.bossId, boss.advancedSkillCursor);
    boss.advancedSkillCursor += 1;
    this.triggerAdvancedBossSkill(boss, skill);
    return;
    if (boss.bossId === "chef") {
      this.throwChiliOil(boss);
      this.emitState(`${this.getBossName(boss.bossId)} 发起冲锋。`);
      return;
    }
    if (boss.bossId === "clown") {
      for (let index = 0; index < 12; index += 1) {
        const angle = (Math.PI * 2 * index) / 12;
        this.spawnKnifeHazard(boss.x, boss.y, angle, 440);
      }
      this.emitState(`${this.getBossName(boss.bossId)} 释放环形弹幕。`);
      return;
    }
    const angle = Math.atan2(this.player!.y - boss.y, this.player!.x - boss.x);
    boss.mode = "windup";
    boss.windupMs = 650;
    boss.pendingChargeAngle = angle;
    this.spawnChargeTelegraph(boss, angle);
    this.emitState(`${this.getBossName(boss.bossId)} 投出爆炸包。`);
  }

  private triggerAdvancedBossSkill(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    if (skill.id === "pressure-cooker-bomb") {
      this.spawnPressureCookerBomb(boss, skill);
    } else if (skill.id === "chopping-board-charge") {
      this.startBossCharge(boss, skill.warningMs, 520, skill.damage, 0xff9f1c);
    } else if (skill.id === "cauldron-descend") {
      this.spawnCauldronDescend(boss, skill);
    } else if (skill.id === "jack-in-the-box") {
      this.spawnJackInTheBox(boss, skill);
    } else if (skill.id === "clone-trick") {
      this.spawnClownClones(boss, skill);
    } else if (skill.id === "knife-gala") {
      this.spawnKnifeGala(boss, skill);
    } else if (skill.id === "drone-airdrop") {
      this.spawnCourierDroneAirdrop(skill);
    } else {
      this.spawnDeliveryLock(boss, skill);
    }
    this.emitState(`${this.getBossName(boss.bossId)}: ${skill.name}`);
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
      "高压锅",
      () => (lowHealth ? this.spawnBigFirePit(target.x, target.y) : this.spawnFirePit(target.x, target.y)),
    );
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
      this.emitState("魔盒爆炸：玩家受到重创。");
      return;
    }
    if (effect === "freeze") {
      this.playerFreezeMs = Math.max(this.playerFreezeMs, 3000);
      this.emitState("魔盒冰冻：玩家无法移动。");
      return;
    }
    this.playerVisionNarrowMs = Math.max(this.playerVisionNarrowMs, 5000);
    this.emitState("魔盒幻术：玩家视野被压缩。");
  }

  private spawnCauldronDescend(boss: BossActor, skill: AdvancedBossSkill): void {
    if (!this.player) return;
    this.spawnSeed += 1;
    const angle = this.spawnSeed * 2.399963229728653;
    const x = clamp(this.player.x + Math.cos(angle) * 160, 24, MAP_WIDTH - 24);
    const y = clamp(this.player.y + Math.sin(angle) * 160, 24, MAP_HEIGHT - 24);
    this.spawnDelayedBossBlast(x, y, skill.radius, skill.damage, skill.warningMs, 0xc8d5d9, "太锅", () => {
      if (!this.bosses.includes(boss)) return;
      this.setActorPosition(boss, x, y);
      this.spawnHitSparks(x, y, 0xfff3b0, 20);
    });
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
        "无人机",
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
      this.emitState(`${this.getBossName(boss.bossId)} 释放华丽飞刀。`);
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

  private collectNearbyNode(): void {
    const marker = this.getNearbyNode();
    if (!marker) {
      this.emitState("附近没有可搜索点。");
      return;
    }
    const node = this.state.exploration.nodes.find((candidate: MapNode) => candidate.id === marker.nodeId);
    this.state = collectNode(this.state, marker.nodeId);
    marker.view.alpha = 0.35;
    this.emitState(`搜索：${node?.name ?? marker.nodeId}`);
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
    this.world.position.set(
      this.app.screen.width / 2 - this.player.x + Math.cos(shakeAngle) * shakeDistance,
      this.app.screen.height / 2 - this.player.y + Math.sin(shakeAngle) * shakeDistance,
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
    if (this.finalBoss) {
      const visible = this.isVisibleFromPlayerZone(this.finalBoss);
      this.finalBoss.view.visible = visible;
      this.finalBoss.label.visible = visible;
    }
    if (this.hospitalKnight) {
      const visible = this.isVisibleFromPlayerZone(this.hospitalKnight);
      this.hospitalKnight.view.visible = visible;
      this.hospitalKnight.label.visible = visible;
    }
    for (const pile of this.bonePiles) {
      pile.view.visible = this.isVisibleFromPlayerZone(pile);
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
    this.interiorVisibilityMask.visible = currentBuildingId !== null || this.playerVisionNarrowMs > 0;
    if (!currentBuildingId) {
      if (this.playerVisionNarrowMs <= 0 || !this.player) return;
      const radius = 56;
      const left = this.player.x - radius;
      const right = this.player.x + radius;
      const top = this.player.y - radius;
      const bottom = this.player.y + radius;
      this.interiorVisibilityMask
        .rect(0, 0, MAP_WIDTH, top)
        .rect(0, bottom, MAP_WIDTH, MAP_HEIGHT - bottom)
        .rect(0, top, left, radius * 2)
        .rect(right, top, MAP_WIDTH - right, radius * 2)
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
      .rect(0, 0, MAP_WIDTH, top)
      .rect(0, bottom, MAP_WIDTH, MAP_HEIGHT - bottom)
      .rect(0, top, left, building.height)
      .rect(right, top, MAP_WIDTH - right, building.height)
      .fill({ color: 0x030403, alpha: 0.96 });
  }

  private emitState(message: string): void {
    this.callbacks.onRunState(this.state);
    this.callbacks.onMessage(message);
    this.emitMetrics();
  }

  private emitMetrics(): void {
    const bossNames = this.bosses.map((boss) => this.getBossName(boss.bossId));
    if (this.finalBoss) {
      bossNames.push(FINAL_BOSS_DEFINITION.name);
    }
    if (this.hospitalKnight) {
      bossNames.push(HOSPITAL_KNIGHT_DEFINITION.name);
    }
    const nearestBoss = this.getNearestBoss();
    const currentBuildingId = this.getCurrentBuildingId();
    const insideBuilding = this.player ? pointInsideBuildings(this.player) : false;
    const metrics = {
      enemyCount: this.enemies.length,
      bossCount: this.bosses.length + (this.finalBoss ? 1 : 0) + (this.hospitalKnight ? 1 : 0),
      bulletCount:
        this.bullets.length +
        this.heavyProjectiles.length +
        this.autoStrikes.length +
        this.laserEffects.length +
        this.warpMines.length,
      buildingCount: BUILDINGS.length,
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      attackMode: this.attackMode,
      bossName: this.finalBoss
        ? FINAL_BOSS_DEFINITION.name
        : this.hospitalKnight
          ? HOSPITAL_KNIGHT_DEFINITION.name
          : nearestBoss
            ? this.getBossName(nearestBoss.bossId)
            : null,
      bossNames,
      insideBuilding,
      currentBuildingId,
      playerHealth: this.state.health,
    };
    this.callbacks.onMetrics(metrics);
    window.__prototypeDebug = metrics;
  }

  private getBossName(bossId: BossId): string {
    return BOSS_ORDER.find((boss) => boss.id === bossId)?.name ?? bossId;
  }

  private setActorPosition(actor: Actor, x: number, y: number): void {
    actor.x = x;
    actor.y = y;
    actor.view.position.set(x, y);
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
    return 260 * getSkillUpgradeStats(this.state.skillUpgradeRanks).moveSpeedMultiplier * (this.mechTransformMs > 0 ? 1.55 : 1) * slow;
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
    return this.player ? getContainingBuildingId(this.player) : null;
  }

  private getVisibilityZoneId(point: { x: number; y: number }): string | null {
    return getContainingBuildingId(point);
  }

  private isVisibleFromPlayerZone(actor: { x: number; y: number }): boolean {
    if (!this.player) return true;
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
      text: `${prefix}${Math.round(amount)}`,
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

declare global {
  interface Window {
    __prototypeDebug?: GameMetrics;
  }
}
