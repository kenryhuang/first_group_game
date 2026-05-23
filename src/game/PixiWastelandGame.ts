import { Application, Container, Graphics, Text, TextStyle, type Ticker } from "pixi.js";
import { Howl } from "howler";
import { gsap } from "gsap";
import { BOSS_ORDER, SKILL_UPGRADES } from "../data/prototypeData";
import type { BossId, MapNode, RunState } from "../domain/types";
import {
  applyRunDamage,
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
  MAP_HEIGHT,
  MAP_WIDTH,
  PLAYER_START,
  getNodeWorldPosition,
  getSpawnPositionAroundPlayer,
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
  getActiveEnergySkills,
  getEnergySkillPower,
  getMechEvolutionStage,
  isEnergySkillReady,
  type EnergySkillDefinition,
  type EnergySkillId,
} from "../systems/energyWeapons";
import { getNextAdvancedBossSkill, type AdvancedBossSkill } from "../systems/bossSkills";
import {
  getBossRoamTargetInTerritory,
  getBossTerritorySpawnPosition,
  isPointInBossTerritory,
} from "../systems/bossTerritories";
import { BASIC_GUN } from "../systems/weapons";
import type { GameMetrics } from "../app/gameStore";

type AttackMode = "auto" | "manual";
type BossMode = "roam" | "chase" | "charge" | "windup";
type HazardKind = "bossProjectile" | "chiliOil" | "firePit" | "knife";

interface GameCallbacks {
  onMetrics(metrics: GameMetrics): void;
  onMessage(message: string): void;
  onRunState(state: RunState): void;
  onGameOver(state: RunState): void;
}

interface Actor {
  view: Graphics;
  x: number;
  y: number;
}

interface EnemyActor extends Actor {
  health: number;
  speed: number;
  contactDamageElapsedMs: number;
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
  windupMs: number;
  pendingChargeAngle: number;
  contactDamageElapsedMs: number;
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
  private damageNumbers: DamageNumberActor[] = [];
  private buildingVisuals: BuildingVisual[] = [];
  private skillChoiceOverlay?: Container;
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
    this.spawnInitialBosses();
    this.world.addChild(this.interiorVisibilityMask);
    this.bindInput();
    this.spawnEnemyWave(12);
    this.app.ticker.add(this.update);
    this.emitState("10000x10000 城市废土已展开，所有常规 Boss 正在游荡。");
  }

  destroy(): void {
    this.unbindInput();
    this.app.ticker.remove(this.update);
    this.clearSkillChoiceOverlay();
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
    this.movePlayer(delta);
    this.updateEnemies(delta);
    this.updateBosses(delta);
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
    this.buildingVisuals.push({ id, shell: shape, roof, x, y, width, height });
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
    const stage = getMechEvolutionStage(this.state.skillUpgradeRanks);
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
    if (event.code === "Space") {
      event.preventDefault();
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
    const moveSpeed = this.getPlayerMoveSpeed();
    const desired = {
      x: clamp(this.player.x + (dx / length) * moveSpeed * seconds, 24, MAP_WIDTH - 24),
      y: clamp(this.player.y + (dy / length) * moveSpeed * seconds, 24, MAP_HEIGHT - 24),
    };
    const resolved = resolveBlockedMovement(this.player, desired, 16);
    this.setActorPosition(this.player, resolved.x, resolved.y);
  }

  private updateEnemies(deltaMs: number): void {
    if (!this.player) return;
    const seconds = deltaMs / 1000;

    for (const enemy of this.enemies) {
      enemy.contactDamageElapsedMs += deltaMs;
      const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      const desired = {
        x: enemy.x + Math.cos(angle) * enemy.speed * seconds,
        y: enemy.y + Math.sin(angle) * enemy.speed * seconds,
      };
      const resolved = resolveBlockedMovement(enemy, desired, 11);
      this.setActorPosition(enemy, resolved.x, resolved.y);
      enemy.view.rotation = angle;
      if (
        enemy.contactDamageElapsedMs >= 700 &&
        this.isSameVisibilityZone(this.player, enemy) &&
        distance(this.player, enemy) <= 28
      ) {
        enemy.contactDamageElapsedMs = 0;
        this.applyPlayerDamage(5);
      }
    }
  }

  private updateBosses(deltaMs: number): void {
    if (!this.player) return;
    const seconds = deltaMs / 1000;

    for (const boss of this.bosses) {
      boss.skillElapsedMs += deltaMs;
      boss.contactDamageElapsedMs += deltaMs;
      const sameZoneAsPlayer = this.isSameVisibilityZone(this.player, boss);
      const playerInTerritory = isPointInBossTerritory(boss.bossId, this.player);
      const playerDistance = sameZoneAsPlayer && playerInTerritory ? distance(this.player, boss) : Number.POSITIVE_INFINITY;

      if (boss.mode === "windup") {
        boss.windupMs = Math.max(0, boss.windupMs - deltaMs);
        if (boss.windupMs === 0) {
          boss.mode = "charge";
          boss.chargeMs = 360;
          boss.chargeAngle = boss.pendingChargeAngle;
        }
      } else if (boss.chargeMs <= 0) {
        boss.mode = playerDistance < 900 ? "chase" : "roam";
      }

      if (sameZoneAsPlayer && playerDistance < 900 && boss.skillElapsedMs >= boss.skillCooldownMs) {
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
        this.applyPlayerDamage(boss.mode === "charge" ? 22 : 12);
      }

      boss.chargeMs = Math.max(0, boss.chargeMs - deltaMs);
      if (boss.chargeMs === 0 && boss.mode === "charge") {
        boss.mode = playerDistance < 900 ? "chase" : "roam";
      }
      if (distance(boss, boss.roamTarget) < 80) {
        boss.roamTarget = this.getNextRoamTarget(boss);
      }
      boss.label.position.set(boss.x - 64, boss.y - 62);
      boss.label.text = `${this.getBossName(boss.bossId)} ${Math.ceil(boss.health)}/${boss.maxHealth}`;
    }
  }

  private getBossMovementTarget(boss: BossActor): { x: number; y: number } {
    if (boss.mode === "charge") {
      return {
      x: boss.x + Math.cos(boss.chargeAngle) * 320,
      y: boss.y + Math.sin(boss.chargeAngle) * 320,
      };
    }
    if (boss.mode === "chase" && this.player && isPointInBossTerritory(boss.bossId, this.player)) {
      return this.player;
    }
    return boss.roamTarget;
  }

  private getBossChargeSpeed(boss: BossActor): number {
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

      if (this.hitEnemyWithBullet(bullet) || this.hitBossWithBullet(bullet)) {
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
        if (hazard.kind === "firePit") {
          if (hazard.tickElapsedMs >= 450) {
            hazard.tickElapsedMs = 0;
            this.applyPlayerDamage(hazard.damage);
          }
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

  private updateSpawning(deltaMs: number): void {
    this.enemySpawnElapsed += deltaMs;
    if (this.enemySpawnElapsed < 900) return;
    this.enemySpawnElapsed = 0;
    if (this.enemies.length < 55) {
      this.spawnEnemyWave(3);
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
      enemy.health -= damage;
      this.showDamageNumber(enemy.x, enemy.y - 24, damage, "#9ffcff");
      this.flashZombieEnemy(enemy.view);
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

  private shouldPhaseBlink(): boolean {
    if (!this.player) return false;
    const nearbyEnemies = this.getVisibleCombatTargets(180).length;
    return nearbyEnemies >= 4 || this.state.health <= this.state.maxHealth * 0.42;
  }

  private phaseBlink(damage: number, radius: number, range: number): void {
    if (!this.player) return;
    const angle = Math.atan2(
      this.pointerWorld.y - this.player.y || this.movementDirection.y,
      this.pointerWorld.x - this.player.x || this.movementDirection.x,
    );
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

  private hitEnemyWithBullet(bullet: BulletActor): boolean {
    for (const enemy of [...this.enemies]) {
      if (!this.isSameVisibilityZone(bullet, enemy)) continue;
      if (!projectileHitsCircle(bullet.projectile, { x: enemy.x, y: enemy.y, radius: 11 })) continue;
      enemy.health -= bullet.projectile.damage;
      this.spawnHitSparks(enemy.x, enemy.y, 0x68e1fd, 5);
      this.showDamageNumber(enemy.x, enemy.y - 20, bullet.projectile.damage, "#ffe066");
      this.flashZombieEnemy(enemy.view);
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

  private defeatEnemy(enemy: EnemyActor): void {
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
    for (const skill of getActiveEnergySkills(this.state.skillUpgradeRanks)) {
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
      enemy.health -= damage;
      this.showDamageNumber(enemy.x, enemy.y - 24, damage, "#ffe066");
      this.flashZombieEnemy(enemy.view);
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
    return [...this.enemies, ...this.bosses].filter(
      (target) => this.isSameVisibilityZone(this.player!, target) && distance(this.player!, target) <= maxDistance,
    );
  }

  private countTargetsNear(origin: Actor, radius: number): number {
    return [...this.enemies, ...this.bosses].filter(
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
    const maxHealth = Math.round(definition.maxHealth / 6);
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
      skillCooldownMs: bossId === "chef" ? 3200 : bossId === "clown" ? 4200 : 3600,
      advancedSkillCursor: 0,
      chargeMs: 0,
      chargeAngle: 0,
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
    const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
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
    } else if (skill.id === "jack-in-the-box") {
      this.spawnJackInTheBox(boss, skill);
    } else if (skill.id === "clone-trick") {
      this.spawnClownClones(boss, skill);
    } else if (skill.id === "drone-airdrop") {
      this.spawnCourierDroneAirdrop(skill);
    } else {
      this.spawnDeliveryLock(boss, skill);
    }
    this.emitState(`${this.getBossName(boss.bossId)}: ${skill.name}`);
  }

  private throwChiliOil(boss: BossActor): void {
    if (!this.player) return;
    const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
    const travelMs = clamp((distance(boss, this.player) / 360) * 1000, 520, 1350);
    this.spawnBossHazard(boss.x, boss.y, angle, 360, 0xff6b00, travelMs, 11, "chiliOil", 8, true);
  }

  private spawnKnifeHazard(x: number, y: number, angle: number, speed: number): void {
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
      damage: 7,
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

  private spawnChargeTelegraph(boss: BossActor, angle: number): void {
    const view = new Graphics();
    view
      .rect(0, -82, 980, 164)
      .fill({ color: 0xd90429, alpha: 0.28 })
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
    this.interiorVisibilityMask.visible = currentBuildingId !== null;
    if (!currentBuildingId) return;

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
    const nearestBoss = this.getNearestBoss();
    const currentBuildingId = this.getCurrentBuildingId();
    const insideBuilding = this.player ? pointInsideBuildings(this.player) : false;
    const metrics = {
      enemyCount: this.enemies.length,
      bossCount: this.bosses.length,
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
      bossName: nearestBoss ? this.getBossName(nearestBoss.bossId) : null,
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
    return 260 * getSkillUpgradeStats(this.state.skillUpgradeRanks).moveSpeedMultiplier;
  }

  private getSkillProjectileDamage(): number {
    return Math.round(72 * getSkillUpgradeStats(this.state.skillUpgradeRanks).skillDamageMultiplier);
  }

  private getInteractionRadius(): number {
    return 72 + getSkillUpgradeStats(this.state.skillUpgradeRanks).pickupRadiusBonus;
  }

  private getMechEnergyColor(): number {
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

declare global {
  interface Window {
    __prototypeDebug?: GameMetrics;
  }
}
