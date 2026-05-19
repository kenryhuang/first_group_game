import { Application, Container, Graphics, Text, TextStyle, type Ticker } from "pixi.js";
import { Howl } from "howler";
import { gsap } from "gsap";
import { BOSS_ORDER } from "../data/prototypeData";
import type { BossId, MapNode, RunState } from "../domain/types";
import { collectNode, createRunState, gainRunExperience, killRunBoss, useRunSkill } from "../systems/runState";
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
  circleIntersectsBuildings,
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

const BULLET_SOUND =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

export class PixiWastelandGame {
  private app = new Application();
  private world = new Container();
  private player?: Actor;
  private state: RunState = createRunState();
  private nodeMarkers: NodeActor[] = [];
  private enemies: EnemyActor[] = [];
  private bullets: BulletActor[] = [];
  private bossHazards: HazardActor[] = [];
  private bosses: BossActor[] = [];
  private keys = new Set<string>();
  private pointerWorld = { x: PLAYER_START.x + 1, y: PLAYER_START.y };
  private attackMode: AttackMode = "auto";
  private enemySpawnElapsed = 0;
  private autoAttackElapsed = 0;
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
    this.updateSpawning(delta);
    this.updateAutoAttack(delta);
    this.highlightNearbyNode();
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
      this.drawBuilding(building.x, building.y, building.width, building.height);
    }

    const cityBlocks = [
      [4620, 4580, 420, 260],
      [5480, 4680, 360, 520],
      [4940, 5580, 620, 300],
      [4140, 5320, 300, 460],
      [6100, 5200, 420, 420],
      [2100, 1260, 520, 360],
      [7420, 2320, 580, 320],
      [2820, 7420, 620, 360],
      [7280, 8060, 500, 460],
    ] as const;
    for (const [x, y, width, height] of cityBlocks) {
      this.drawBuilding(x, y, width, height);
    }
  }

  private drawBuilding(x: number, y: number, width: number, height: number): void {
    const shape = new Graphics();
    shape
      .rect(x - width / 2, y - height / 2, width, height)
      .fill({ color: 0x121512, alpha: 0.96 })
      .stroke({ color: 0x68705d, alpha: 0.78, width: 3 });
    this.world.addChild(shape);

    const roofLine = new Graphics();
    roofLine
      .rect(x - width / 2 + 14, y - height / 2 + 13, width - 28, 7)
      .fill({ color: 0x9a8c5f, alpha: 0.5 });
    this.world.addChild(roofLine);
  }

  private createPlayer(): void {
    const view = new Graphics();
    view.circle(0, 0, 16).fill(0x95d5b2);
    view.position.set(PLAYER_START.x, PLAYER_START.y);
    this.world.addChild(view);
    this.player = { view, x: PLAYER_START.x, y: PLAYER_START.y };
    this.updateCamera();
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
      this.fireProjectile(this.pointerWorld, "basic", 34, 720, "手动普攻");
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
      const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      const desired = {
        x: enemy.x + Math.cos(angle) * enemy.speed * seconds,
        y: enemy.y + Math.sin(angle) * enemy.speed * seconds,
      };
      const resolved = resolveBlockedMovement(enemy, desired, 11);
      this.setActorPosition(enemy, resolved.x, resolved.y);
    }
  }

  private updateBosses(deltaMs: number): void {
    if (!this.player) return;
    const seconds = deltaMs / 1000;

    for (const boss of this.bosses) {
      boss.skillElapsedMs += deltaMs;
      const playerDistance = distance(this.player, boss);
      if (boss.chargeMs <= 0) {
        boss.mode = playerDistance < 900 ? "chase" : "roam";
      }

      if (boss.skillElapsedMs >= boss.skillCooldownMs) {
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
        bullet.y > MAP_HEIGHT ||
        pointInsideBuildings(bullet.projectile) ||
        circleIntersectsBuildings(bullet.projectile)
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
        hazard.y > MAP_HEIGHT ||
        circleIntersectsBuildings({ x: hazard.x, y: hazard.y, radius: hazard.radius })
      ) {
        this.removeBossHazard(hazard);
      }
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
    if (this.autoAttackElapsed < 600) return;
    this.autoAttackElapsed = 0;
    const target = this.getNearestTarget(620);
    if (target) {
      this.fireProjectile(target, "basic", 34, 720, "自动普攻");
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
      });
    }
  }

  private findOpenEnemySpawnPosition(): { x: number; y: number } {
    const player = this.player ?? PLAYER_START;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const position = getSpawnPositionAroundPlayer(player, this.spawnSeed);
      this.spawnSeed += 1;
      if (!circleIntersectsBuildings({ ...position, radius: 11 })) {
        return position;
      }
    }
    return getSpawnPositionAroundPlayer(player, this.spawnSeed++);
  }

  private fireProjectile(
    target: { x: number; y: number },
    kind: ProjectileKind,
    damage: number,
    speed: number,
    label?: string,
  ): void {
    if (!this.player) return;
    const projectile = createProjectileState(this.player, target, kind, speed, damage);
    const view = new Graphics();
    view.circle(0, 0, projectile.radius).fill(kind === "skill" ? 0xff9f1c : 0xf7e967);
    view.position.set(projectile.x, projectile.y);
    this.world.addChild(view);
    this.bullets.push({ view, x: projectile.x, y: projectile.y, projectile });
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
      if (!projectileHitsCircle(bullet.projectile, { x: enemy.x, y: enemy.y, radius: 11 })) continue;
      enemy.health -= bullet.projectile.damage;
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
      if (!projectileHitsCircle(bullet.projectile, { x: boss.x, y: boss.y, radius: 34 })) continue;
      boss.health -= bullet.projectile.damage;
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
      const distanceToEnemy = distance(this.player, enemy);
      if (distanceToEnemy <= maxDistance && (!nearest || distanceToEnemy < nearest.distance)) {
        nearest = { x: enemy.x, y: enemy.y, distance: distanceToEnemy };
      }
    }
    for (const boss of this.bosses) {
      const distanceToBoss = distance(this.player, boss);
      if (distanceToBoss <= maxDistance && (!nearest || distanceToBoss < nearest.distance)) {
        nearest = { x: boss.x, y: boss.y, distance: distanceToBoss };
      }
    }
    return nearest ? { x: nearest.x, y: nearest.y } : undefined;
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
    });
  }

  private findOpenBossSpawnPosition(bossId: BossId): { x: number; y: number } {
    const base = getBossSpawnPosition(this.player ?? PLAYER_START, bossId);
    if (!circleIntersectsBuildings({ ...base, radius: 34 })) {
      return base;
    }
    const player = this.player ?? PLAYER_START;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const angle = attempt * 0.72;
      const candidate = {
        x: clamp(player.x + Math.cos(angle) * (900 + attempt * 60), 48, MAP_WIDTH - 48),
        y: clamp(player.y + Math.sin(angle) * (900 + attempt * 60), 48, MAP_HEIGHT - 48),
      };
      if (!circleIntersectsBuildings({ ...candidate, radius: 34 })) {
        return candidate;
      }
    }
    return base;
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
    this.world.position.set(
      this.app.screen.width / 2 - this.player.x,
      this.app.screen.height / 2 - this.player.y,
    );
  }

  private emitState(message: string): void {
    this.callbacks.onRunState(this.state);
    this.callbacks.onMessage(message);
    this.emitMetrics();
  }

  private emitMetrics(): void {
    const bossNames = this.bosses.map((boss) => this.getBossName(boss.bossId));
    const nearestBoss = this.getNearestBoss();
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
