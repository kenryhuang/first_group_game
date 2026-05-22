import { Application, Container, Graphics, Text, TextStyle, type Ticker } from "pixi.js";
import { Howl } from "howler";
import { gsap } from "gsap";
import { BOSS_ORDER } from "../data/prototypeData";
import type { BossId, MapNode, RunState } from "../domain/types";
import { applyRunDamage, collectNode, createRunState, gainRunExperience, killRunBoss, useRunSkill } from "../systems/runState";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  PLAYER_START,
  getBossSpawnPosition,
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
import { BASIC_GUN } from "../systems/weapons";
import type { GameMetrics } from "../app/gameStore";

type AttackMode = "auto" | "manual";
type BossMode = "roam" | "chase" | "charge";

interface GameCallbacks {
  onMetrics(metrics: GameMetrics): void;
  onMessage(message: string): void;
  onRunState(state: RunState): void;
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
  chargeMs: number;
  chargeAngle: number;
  contactDamageElapsedMs: number;
}

interface BulletActor extends Actor {
  projectile: ProjectileState;
}

interface HazardActor extends Actor {
  velocityX: number;
  velocityY: number;
  radius: number;
  lifeMs: number;
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
  private bossHazards: HazardActor[] = [];
  private bosses: BossActor[] = [];
  private damageNumbers: DamageNumberActor[] = [];
  private buildingVisuals: BuildingVisual[] = [];
  private interiorVisibilityMask = new Graphics();
  private keys = new Set<string>();
  private pointerWorld = { x: PLAYER_START.x + 1, y: PLAYER_START.y };
  private movementDirection = { x: 1, y: 0 };
  private attackMode: AttackMode = "auto";
  private enemySpawnElapsed = 0;
  private autoAttackElapsed = 0;
  private screenShakeMs = 0;
  private screenShakeMagnitude = 0;
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
    this.app.destroy(true, { children: true });
  }

  private readonly update = (ticker: Ticker): void => {
    const delta = ticker.deltaMS;
    this.movePlayer(delta);
    this.updateEnemies(delta);
    this.updateBosses(delta);
    this.updateProjectiles(delta);
    this.updateBossHazards(delta);
    this.updateDamageNumbers(delta);
    this.updateSpawning(delta);
    this.updateAutoAttack(delta);
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

  private drawPlayerMech(view: Graphics, energyColor = 0x68e1fd): void {
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
    if (event.code === "Space") {
      event.preventDefault();
      this.fireProjectile(this.pointerWorld, "basic", BASIC_GUN.damage, BASIC_GUN.projectileSpeed, "手动普攻");
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
    const skillIndex = Number(event.key) - 1;
    if (skillIndex >= 0 && skillIndex < 4) {
      this.castSkill(skillIndex);
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
    const desired = {
      x: clamp(this.player.x + (dx / length) * 260 * seconds, 24, MAP_WIDTH - 24),
      y: clamp(this.player.y + (dy / length) * 260 * seconds, 24, MAP_HEIGHT - 24),
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
      const playerDistance = sameZoneAsPlayer ? distance(this.player, boss) : Number.POSITIVE_INFINITY;
      if (boss.chargeMs <= 0) {
        boss.mode = playerDistance < 900 ? "chase" : "roam";
      }

      if (sameZoneAsPlayer && playerDistance < 900 && boss.skillElapsedMs >= boss.skillCooldownMs) {
        this.triggerBossSkill(boss);
      }

      const movement = this.getBossMovementTarget(boss);
      const speed = boss.mode === "charge" ? 360 : boss.mode === "chase" ? 112 : 68;
      const angle = Math.atan2(movement.y - boss.y, movement.x - boss.x);
      const desired = {
        x: boss.x + Math.cos(angle) * speed * seconds,
        y: boss.y + Math.sin(angle) * speed * seconds,
      };
      const resolved = resolveBlockedMovement(boss, desired, 34);
      this.setActorPosition(boss, resolved.x, resolved.y);
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
    if (boss.mode === "chase" && this.player) {
      return this.player;
    }
    return boss.roamTarget;
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

  private updateBossHazards(deltaMs: number): void {
    const seconds = deltaMs / 1000;
    for (const hazard of [...this.bossHazards]) {
      hazard.lifeMs -= deltaMs;
      this.setActorPosition(hazard, hazard.x + hazard.velocityX * seconds, hazard.y + hazard.velocityY * seconds);
      if (
        hazard.lifeMs <= 0 ||
        hazard.x < 0 ||
        hazard.y < 0 ||
        hazard.x > MAP_WIDTH ||
        hazard.y > MAP_HEIGHT
      ) {
        this.removeBossHazard(hazard);
        continue;
      }
      if (
        this.player &&
        this.isSameVisibilityZone(this.player, hazard) &&
        distance(this.player, hazard) <= hazard.radius + 16
      ) {
        this.applyPlayerDamage(hazard.radius >= 12 ? 18 : 9);
        this.removeBossHazard(hazard);
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
    if (this.autoAttackElapsed < BASIC_GUN.attackIntervalMs) return;
    this.autoAttackElapsed = 0;
    const target = this.getNearestTarget(620);
    if (target) {
      this.fireProjectile(target, "basic", BASIC_GUN.damage, BASIC_GUN.projectileSpeed, "自动普攻");
    }
  }

  private spawnEnemyWave(count: number): void {
    if (!this.player) return;
    for (let index = 0; index < count; index += 1) {
      const position = this.findOpenEnemySpawnPosition();
      const view = new Graphics();
      view.circle(0, 0, 11).fill(0x8d99ae);
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
        72,
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
      this.flash(enemy.view, 0xd90429, 0x8d99ae, 11);
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
    this.state = gainRunExperience(this.state, 6);
  }

  private defeatBoss(boss: BossActor): void {
    this.world.removeChild(boss.view, boss.label);
    boss.view.destroy();
    boss.label.destroy();
    this.bosses = this.bosses.filter((candidate) => candidate !== boss);
    this.state = killRunBoss(this.state, boss.bossId);
    this.emitState(`击杀 Boss：${this.getBossName(boss.bossId)}`);
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
    const color: Record<BossId, number> = {
      chef: 0xe63946,
      clown: 0x9d4edd,
      courier: 0xf77f00,
    };
    const view = new Graphics();
    view.circle(0, 0, 34).fill(color[bossId]).stroke({ color: 0xfff3b0, width: 4 });
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
      chargeMs: 0,
      chargeAngle: 0,
      contactDamageElapsedMs: 700,
    });
  }

  private findOpenBossSpawnPosition(bossId: BossId): { x: number; y: number } {
    return getBossSpawnPosition(this.player ?? PLAYER_START, bossId);
  }

  private getNextRoamTarget(boss: Pick<BossActor, "bossId" | "x" | "y">): { x: number; y: number } {
    const seed = boss.bossId === "chef" ? 0.2 : boss.bossId === "clown" ? 2.1 : 4.0;
    const angle = seed + this.spawnSeed * 0.83;
    const range = boss.bossId === "courier" ? 780 : 560;
    return {
      x: clamp(boss.x + Math.cos(angle) * range, 80, MAP_WIDTH - 80),
      y: clamp(boss.y + Math.sin(angle) * range, 80, MAP_HEIGHT - 80),
    };
  }

  private triggerBossSkill(boss: BossActor): void {
    boss.skillElapsedMs = 0;
    if (!this.player) return;
    if (boss.bossId === "chef") {
      boss.mode = "charge";
      boss.chargeMs = 520;
      boss.chargeAngle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
      this.emitState(`${this.getBossName(boss.bossId)} 发起冲锋。`);
      return;
    }
    if (boss.bossId === "clown") {
      for (let index = 0; index < 10; index += 1) {
        const angle = (Math.PI * 2 * index) / 10;
        this.spawnBossHazard(boss.x, boss.y, angle, 210, 0x9d4edd, 1500, 7);
      }
      this.emitState(`${this.getBossName(boss.bossId)} 释放环形弹幕。`);
      return;
    }
    const angle = Math.atan2(this.player.y - boss.y, this.player.x - boss.x);
    boss.mode = "charge";
    boss.chargeMs = 360;
    boss.chargeAngle = angle;
    this.spawnBossHazard(boss.x, boss.y, angle, 160, 0xf77f00, 1900, 12);
    this.emitState(`${this.getBossName(boss.bossId)} 投出爆炸包。`);
  }

  private spawnBossHazard(
    x: number,
    y: number,
    angle: number,
    speed: number,
    color: number,
    lifeMs: number,
    radius: number,
  ): void {
    const view = new Graphics();
    view.circle(0, 0, radius).fill({ color, alpha: 0.85 }).stroke({ color: 0xfff3b0, alpha: 0.7, width: 2 });
    view.position.set(x, y);
    this.world.addChild(view);
    this.bossHazards.push({
      view,
      x,
      y,
      radius,
      lifeMs,
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
      return !alreadyResolved && distance(this.player!, marker) <= 72;
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
    for (const hazard of this.bossHazards) {
      hazard.view.visible = this.isVisibleFromPlayerZone(hazard);
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
      bulletCount: this.bullets.length,
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

  private flash(view: Graphics, hitColor: number, baseColor: number, radius: number): void {
    view.clear();
    view.circle(0, 0, radius).fill(hitColor);
    window.setTimeout(() => {
      if (view.destroyed) return;
      view.clear();
      view.circle(0, 0, radius).fill(baseColor);
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

declare global {
  interface Window {
    __prototypeDebug?: GameMetrics;
  }
}
