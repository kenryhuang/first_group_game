import { Application, Container, Graphics, Text, TextStyle, type Ticker } from "pixi.js";
import { Howl } from "howler";
import { gsap } from "gsap";
import { BOSS_ORDER } from "../data/prototypeData";
import type { BossId, MapNode, RunState } from "../domain/types";
import { createRunState, collectNode, gainRunExperience, killRunBoss, useRunSkill } from "../systems/runState";
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
import type { GameMetrics } from "../app/gameStore";

type AttackMode = "auto" | "manual";

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
}

interface BulletActor extends Actor {
  projectile: ProjectileState;
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
  private boss?: BossActor;
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
    this.bindInput();
    this.spawnEnemyWave(12);
    this.app.ticker.add(this.update);
    this.emitState("城市废土已展开。怪物会持续刷新，子弹会被楼房挡住。");
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
    this.updateBoss(delta);
    this.updateProjectiles(delta);
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
    for (let x = 0; x <= MAP_WIDTH; x += 160) {
      grid.moveTo(x, 0).lineTo(x, MAP_HEIGHT).stroke({ color: 0x2f382b, alpha: 0.22, width: 1 });
    }
    for (let y = 0; y <= MAP_HEIGHT; y += 160) {
      grid.moveTo(0, y).lineTo(MAP_WIDTH, y).stroke({ color: 0x2f382b, alpha: 0.22, width: 1 });
    }
    this.world.addChild(grid);

    this.drawDistricts();
    this.drawBuildings();
  }

  private drawDistricts(): void {
    const districts = [
      { x: 760, y: 780, w: 760, h: 520, color: 0x343127, label: "废弃街区" },
      { x: 2940, y: 900, w: 720, h: 500, color: 0x2c2835, label: "剧院广场" },
      { x: 940, y: 3040, w: 820, h: 560, color: 0x29353a, label: "破医院" },
      { x: 3050, y: 3020, w: 760, h: 620, color: 0x352b25, label: "快递站" },
      { x: 2050, y: 2040, w: 900, h: 680, color: 0x27342d, label: "幸存者活动区" },
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
      const shape = new Graphics();
      shape
        .rect(building.x - building.width / 2, building.y - building.height / 2, building.width, building.height)
        .fill({ color: 0x121512, alpha: 0.96 })
        .stroke({ color: 0x68705d, alpha: 0.78, width: 3 });
      this.world.addChild(shape);

      const roofLine = new Graphics();
      roofLine
        .rect(building.x - building.width / 2 + 14, building.y - building.height / 2 + 13, building.width - 28, 7)
        .fill({ color: 0x9a8c5f, alpha: 0.5 });
      this.world.addChild(roofLine);

      for (let offset = 42; offset < building.width - 32; offset += 82) {
        const shaft = new Graphics();
        shaft
          .rect(building.x - building.width / 2 + offset - 12, building.y - building.height / 2 + 26, 24, building.height - 52)
          .fill({ color: 0x262a24, alpha: 0.72 });
        this.world.addChild(shaft);
      }
    }
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
      this.syncBossFromPressure();
      this.emitState("调试：获得经验并检查 Boss 降临。");
    }
    if (event.key.toLowerCase() === "b") {
      this.spawnOrFocusBoss();
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

  private updateBoss(deltaMs: number): void {
    if (!this.player || !this.boss) return;
    const seconds = deltaMs / 1000;
    const angle = Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x);
    const desired = {
      x: this.boss.x + Math.cos(angle) * 92 * seconds,
      y: this.boss.y + Math.sin(angle) * 92 * seconds,
    };
    const resolved = resolveBlockedMovement(this.boss, desired, 34);
    this.setActorPosition(this.boss, resolved.x, resolved.y);
    this.boss.label.position.set(this.boss.x - 54, this.boss.y - 58);
    this.boss.label.text = `${this.getBossName(this.boss.bossId)} ${Math.ceil(this.boss.health)}/${this.boss.maxHealth}`;
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
    this.syncBossFromPressure();
    this.emitState(`释放技能槽 ${index + 1}：扇形弹幕。`);
  }

  private hitEnemyWithBullet(bullet: BulletActor): boolean {
    for (const enemy of [...this.enemies]) {
      if (!projectileHitsCircle(bullet.projectile, { x: enemy.x, y: enemy.y, radius: 11 })) continue;
      enemy.health -= bullet.projectile.damage;
      this.flash(enemy.view, 0xd90429, 0x8d99ae);
      if (enemy.health <= 0) {
        this.defeatEnemy(enemy);
      }
      return true;
    }
    return false;
  }

  private hitBossWithBullet(bullet: BulletActor): boolean {
    if (!this.boss || !projectileHitsCircle(bullet.projectile, { x: this.boss.x, y: this.boss.y, radius: 34 })) {
      return false;
    }
    this.boss.health -= bullet.projectile.damage;
    gsap.fromTo(this.boss.view.scale, { x: 1.18, y: 1.18 }, { x: 1, y: 1, duration: 0.12 });
    if (this.boss.health <= 0) {
      const defeatedBoss = this.boss.bossId;
      this.world.removeChild(this.boss.view, this.boss.label);
      this.boss.view.destroy();
      this.boss.label.destroy();
      this.boss = undefined;
      this.state = killRunBoss(this.state, defeatedBoss);
      this.emitState(`击杀 Boss：${this.getBossName(defeatedBoss)}`);
    }
    return true;
  }

  private defeatEnemy(enemy: EnemyActor): void {
    this.world.removeChild(enemy.view);
    enemy.view.destroy();
    this.enemies = this.enemies.filter((candidate) => candidate !== enemy);
    this.state = gainRunExperience(this.state, 6);
    this.syncBossFromPressure();
  }

  private removeBullet(bullet: BulletActor): void {
    this.world.removeChild(bullet.view);
    bullet.view.destroy();
    this.bullets = this.bullets.filter((candidate) => candidate !== bullet);
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
    if (this.boss) {
      const distanceToBoss = distance(this.player, this.boss);
      if (distanceToBoss <= maxDistance && (!nearest || distanceToBoss < nearest.distance)) {
        nearest = { x: this.boss.x, y: this.boss.y, distance: distanceToBoss };
      }
    }
    return nearest ? { x: nearest.x, y: nearest.y } : undefined;
  }

  private spawnOrFocusBoss(): void {
    if (this.boss) {
      this.emitState(`Boss 已在地图上：${this.getBossName(this.boss.bossId)}`);
      return;
    }
    const activeBossId = this.state.bossPressure.activeHunterId;
    const bossId = activeBossId ?? BOSS_ORDER.find((boss) => !this.state.killedBossIds.includes(boss.id))?.id;
    if (!bossId) {
      this.emitState("30 级原型阶段结算：三个 Boss 已清理。");
      return;
    }
    this.spawnBoss(bossId);
    this.emitState(`${activeBossId ? "等级追猎" : "主动狩猎"}：${this.getBossName(bossId)} 已出现。`);
  }

  private syncBossFromPressure(): void {
    if (!this.state.bossPressure.activeHunterId || this.boss) return;
    this.spawnBoss(this.state.bossPressure.activeHunterId);
  }

  private spawnBoss(bossId: BossId): void {
    if (!this.player) return;
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
    label.position.set(position.x - 54, position.y - 58);
    this.world.addChild(label);
    this.boss = {
      view,
      label,
      bossId,
      x: position.x,
      y: position.y,
      maxHealth: Math.round(definition.maxHealth / 35),
      health: Math.round(definition.maxHealth / 35),
    };
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
        x: clamp(player.x + Math.cos(angle) * (520 + attempt * 28), 48, MAP_WIDTH - 48),
        y: clamp(player.y + Math.sin(angle) * (520 + attempt * 28), 48, MAP_HEIGHT - 48),
      };
      if (!circleIntersectsBuildings({ ...candidate, radius: 34 })) {
        return candidate;
      }
    }
    return base;
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
    const metrics = {
      enemyCount: this.enemies.length,
      bossCount: this.boss ? 1 : 0,
      bulletCount: this.bullets.length,
      buildingCount: BUILDINGS.length,
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      attackMode: this.attackMode,
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

  private flash(view: Graphics, hitColor: number, baseColor: number): void {
    view.clear();
    view.circle(0, 0, 11).fill(hitColor);
    window.setTimeout(() => {
      if (view.destroyed) return;
      view.clear();
      view.circle(0, 0, 11).fill(baseColor);
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
