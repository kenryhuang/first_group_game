import Phaser from "phaser";
import { BOSS_ORDER } from "../data/prototypeData";
import type { BossId, RunState } from "../domain/types";
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
import { createHudLines } from "../ui/hud";

type NodeMarker = Phaser.GameObjects.Rectangle & { nodeId: string };
type EnemyMarker = Phaser.GameObjects.Arc & { health: number; speed: number };
type BossMarker = Phaser.GameObjects.Arc & { bossId: BossId; health: number; maxHealth: number };
type BulletMarker = Phaser.GameObjects.Arc & { projectile: ProjectileState };

interface PrototypeDebugState {
  enemyCount: number;
  bossCount: number;
  bulletCount: number;
  buildingCount: number;
  mapWidth: number;
  mapHeight: number;
}

declare global {
  interface Window {
    __prototypeDebug?: PrototypeDebugState;
  }
}

export class PrototypeScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Arc;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private state: RunState = createRunState();
  private hud?: Phaser.GameObjects.Text;
  private message?: Phaser.GameObjects.Text;
  private nodeMarkers: NodeMarker[] = [];
  private enemies: EnemyMarker[] = [];
  private bullets: BulletMarker[] = [];
  private boss?: BossMarker;
  private bossLabel?: Phaser.GameObjects.Text;
  private attackMode: "auto" | "manual" = "auto";
  private enemySpawnElapsed = 0;
  private autoAttackElapsed = 0;
  private spawnSeed = 1;

  constructor() {
    super("prototype");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#171a16");
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    this.add.rectangle(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 0x20251e).setDepth(0);
    this.add
      .grid(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 160, 160, 0x2f382b, 0.45, 0x2f382b, 0.18)
      .setDepth(1);
    this.drawDistricts();
    this.drawBuildings();

    this.player = this.add.circle(PLAYER_START.x, PLAYER_START.y, 16, 0x95d5b2).setDepth(20);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;

    this.hud = this.add
      .text(20, 18, "", {
        color: "#f2ead3",
        fontFamily: "Arial",
        fontSize: "18px",
        lineSpacing: 6,
      })
      .setScrollFactor(0)
      .setDepth(1000);
    this.message = this.add
      .text(20, 640, "", {
        color: "#ffd166",
        fontFamily: "Arial",
        fontSize: "18px",
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.createNodeMarkers();
    this.bindKeys();
    this.spawnEnemyWave(12);
    this.refreshHud("城市废土已展开。怪物会持续刷新，子弹会被楼房挡住。");
  }

  update(_time: number, delta: number): void {
    this.movePlayer(delta);
    this.updateEnemies(delta);
    this.updateBoss(delta);
    this.updateProjectiles(delta);
    this.updateSpawning(delta);
    this.updateAutoAttack(delta);
    this.highlightNearbyNode();
    this.updateDebugState();
  }

  private drawDistricts(): void {
    const districts = [
      { x: 760, y: 780, w: 760, h: 520, color: 0x343127, label: "废弃街区" },
      { x: 2940, y: 900, w: 720, h: 500, color: 0x2c2835, label: "剧院广场" },
      { x: 940, y: 3040, w: 820, h: 560, color: 0x29353a, label: "破医院" },
      { x: 3050, y: 3020, w: 760, h: 620, color: 0x352b25, label: "快递站" },
      { x: 2050, y: 2040, w: 900, h: 680, color: 0x27342d, label: "幸存者活动区" },
    ];

    for (const district of districts) {
      this.add
        .rectangle(district.x, district.y, district.w, district.h, district.color, 0.82)
        .setStrokeStyle(2, 0x59614f, 0.6)
        .setDepth(2);
      this.add
        .text(district.x - district.w / 2 + 24, district.y - district.h / 2 + 18, district.label, {
          color: "#b9c7a7",
          fontFamily: "Arial",
          fontSize: "20px",
        })
        .setDepth(3);
    }
  }

  private drawBuildings(): void {
    for (const building of BUILDINGS) {
      this.add
        .rectangle(building.x, building.y, building.width, building.height, 0x121512, 0.96)
        .setStrokeStyle(3, 0x68705d, 0.78)
        .setDepth(8);
      this.add
        .rectangle(building.x, building.y - building.height / 2 + 16, building.width - 28, 7, 0x9a8c5f, 0.5)
        .setDepth(9);

      for (let offset = 42; offset < building.width - 32; offset += 82) {
        this.add
          .rectangle(building.x - building.width / 2 + offset, building.y, 24, building.height - 52, 0x262a24, 0.72)
          .setDepth(9);
      }
    }
  }

  private createNodeMarkers(): void {
    for (const node of this.state.exploration.nodes) {
      const position = getNodeWorldPosition(node);
      const color = node.kind === "resource" ? 0x74c69d : node.kind === "event" ? 0xf2cc8f : 0xe07a5f;
      const marker = this.add.rectangle(position.x, position.y, 40, 40, color, 0.9).setDepth(12) as NodeMarker;
      marker.nodeId = node.id;
      this.add
        .text(position.x - 42, position.y + 28, node.name, {
          color: "#f8f4e3",
          fontFamily: "Arial",
          fontSize: "14px",
        })
        .setDepth(13);
      this.nodeMarkers.push(marker);
    }
  }

  private bindKeys(): void {
    this.input.keyboard?.on("keydown-E", () => this.collectNearbyNode());
    this.input.keyboard?.on("keydown-Q", () => {
      this.attackMode = this.attackMode === "auto" ? "manual" : "auto";
      this.refreshHud(`普攻模式：${this.attackMode === "auto" ? "自动" : "手动"}`);
    });
    this.input.keyboard?.on("keydown-SPACE", () => {
      const pointer = this.input.activePointer;
      this.fireProjectile(
        { x: pointer.worldX, y: pointer.worldY },
        "basic",
        34,
        720,
        "手动普攻",
      );
    });
    this.input.keyboard?.on("keydown-X", () => {
      this.state = gainRunExperience(this.state, 120);
      this.syncBossFromPressure();
      this.refreshHud("调试：获得经验并检查 Boss 降临。");
    });
    this.input.keyboard?.on("keydown-B", () => this.spawnOrFocusBoss());
    for (let index = 0; index < 4; index += 1) {
      this.input.keyboard?.on(`keydown-${index + 1}`, () => this.castSkill(index));
    }
  }

  private movePlayer(delta: number): void {
    if (!this.player) return;
    const speed = 260;
    const seconds = delta / 1000;
    const dx =
      (this.cursors?.right.isDown || this.wasd?.D.isDown ? 1 : 0) -
      (this.cursors?.left.isDown || this.wasd?.A.isDown ? 1 : 0);
    const dy =
      (this.cursors?.down.isDown || this.wasd?.S.isDown ? 1 : 0) -
      (this.cursors?.up.isDown || this.wasd?.W.isDown ? 1 : 0);
    const length = Math.hypot(dx, dy) || 1;
    const desired = {
      x: Phaser.Math.Clamp(this.player.x + (dx / length) * speed * seconds, 24, MAP_WIDTH - 24),
      y: Phaser.Math.Clamp(this.player.y + (dy / length) * speed * seconds, 24, MAP_HEIGHT - 24),
    };
    const resolved = resolveBlockedMovement(this.player, desired, 16);
    this.player.setPosition(resolved.x, resolved.y);
  }

  private updateEnemies(delta: number): void {
    if (!this.player) return;
    const seconds = delta / 1000;

    for (const enemy of this.enemies) {
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const desired = {
        x: enemy.x + Math.cos(angle) * enemy.speed * seconds,
        y: enemy.y + Math.sin(angle) * enemy.speed * seconds,
      };
      const resolved = resolveBlockedMovement(enemy, desired, 11);
      enemy.setPosition(resolved.x, resolved.y);
    }
  }

  private updateBoss(delta: number): void {
    if (!this.player || !this.boss) return;
    const seconds = delta / 1000;
    const angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
    const desired = {
      x: this.boss.x + Math.cos(angle) * 92 * seconds,
      y: this.boss.y + Math.sin(angle) * 92 * seconds,
    };
    const resolved = resolveBlockedMovement(this.boss, desired, 34);
    this.boss.setPosition(resolved.x, resolved.y);
    this.bossLabel?.setPosition(this.boss.x - 54, this.boss.y - 58);
    this.bossLabel?.setText(`${this.getBossName(this.boss.bossId)} ${Math.ceil(this.boss.health)}/${this.boss.maxHealth}`);
  }

  private updateProjectiles(delta: number): void {
    for (const bullet of [...this.bullets]) {
      const nextState = updateProjectileState(bullet.projectile, delta);
      bullet.projectile = nextState;
      bullet.setPosition(nextState.x, nextState.y);

      if (
        nextState.expired ||
        nextState.x < 0 ||
        nextState.y < 0 ||
        nextState.x > MAP_WIDTH ||
        nextState.y > MAP_HEIGHT ||
        pointInsideBuildings(nextState) ||
        circleIntersectsBuildings(nextState)
      ) {
        this.removeBullet(bullet);
        continue;
      }

      if (this.hitEnemyWithBullet(bullet) || this.hitBossWithBullet(bullet)) {
        this.removeBullet(bullet);
      }
    }
  }

  private updateSpawning(delta: number): void {
    this.enemySpawnElapsed += delta;
    if (this.enemySpawnElapsed < 900) return;
    this.enemySpawnElapsed = 0;

    if (this.enemies.length < 55) {
      this.spawnEnemyWave(3);
    }
  }

  private updateAutoAttack(delta: number): void {
    if (this.attackMode !== "auto") return;
    this.autoAttackElapsed += delta;
    if (this.autoAttackElapsed < 600) return;
    this.autoAttackElapsed = 0;

    const target = this.getNearestTarget(620);
    if (!target) return;
    this.fireProjectile(target, "basic", 34, 720, "自动普攻");
  }

  private spawnEnemyWave(count: number): void {
    if (!this.player) return;

    for (let index = 0; index < count; index += 1) {
      const position = this.findOpenEnemySpawnPosition();
      const enemy = this.add.circle(position.x, position.y, 11, 0x8d99ae).setDepth(18) as EnemyMarker;
      enemy.health = 28;
      enemy.speed = 58 + (this.spawnSeed % 4) * 8;
      this.enemies.push(enemy);
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
    const color = kind === "skill" ? 0xff9f1c : 0xf7e967;
    const bullet = this.add.circle(projectile.x, projectile.y, projectile.radius, color, 0.98).setDepth(19) as BulletMarker;
    bullet.projectile = projectile;
    this.bullets.push(bullet);
    if (label) {
      this.refreshHud(`${label}：发射子弹。`);
    }
  }

  private castSkill(index: number): void {
    const skillId = this.state.activeSkillIds[index];
    if (!skillId) {
      this.refreshHud(`技能槽 ${index + 1} 为空。`);
      return;
    }

    this.state = useRunSkill(this.state, skillId);
    const target = this.getNearestTarget(820) ?? {
      x: (this.player?.x ?? PLAYER_START.x) + 1,
      y: this.player?.y ?? PLAYER_START.y,
    };
    const baseAngle = Phaser.Math.Angle.Between(this.player?.x ?? PLAYER_START.x, this.player?.y ?? PLAYER_START.y, target.x, target.y);
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
    this.refreshHud(`释放技能槽 ${index + 1}：扇形弹幕。`);
  }

  private hitEnemyWithBullet(bullet: BulletMarker): boolean {
    for (const enemy of [...this.enemies]) {
      if (!projectileHitsCircle(bullet.projectile, { x: enemy.x, y: enemy.y, radius: 11 })) continue;
      enemy.health -= bullet.projectile.damage;
      enemy.setFillStyle(0xd90429);
      this.time.delayedCall(80, () => enemy.active && enemy.setFillStyle(0x8d99ae));

      if (enemy.health <= 0) {
        this.defeatEnemy(enemy);
      }
      return true;
    }

    return false;
  }

  private hitBossWithBullet(bullet: BulletMarker): boolean {
    if (!this.boss || !projectileHitsCircle(bullet.projectile, { x: this.boss.x, y: this.boss.y, radius: 34 })) {
      return false;
    }

    this.boss.health -= bullet.projectile.damage;
    this.boss.setScale(1.12);
    this.time.delayedCall(90, () => this.boss?.active && this.boss.setScale(1));

    if (this.boss.health <= 0) {
      const defeatedBoss = this.boss.bossId;
      this.boss.destroy();
      this.bossLabel?.destroy();
      this.boss = undefined;
      this.bossLabel = undefined;
      this.state = killRunBoss(this.state, defeatedBoss);
      this.refreshHud(`击杀 Boss：${this.getBossName(defeatedBoss)}`);
    }
    return true;
  }

  private defeatEnemy(enemy: EnemyMarker): void {
    enemy.destroy();
    this.enemies = this.enemies.filter((candidate) => candidate !== enemy);
    this.state = gainRunExperience(this.state, 6);
    this.syncBossFromPressure();
  }

  private removeBullet(bullet: BulletMarker): void {
    bullet.destroy();
    this.bullets = this.bullets.filter((candidate) => candidate !== bullet);
  }

  private getNearestTarget(maxDistance: number): { x: number; y: number } | undefined {
    if (!this.player) return undefined;
    let nearest: { x: number; y: number; distance: number } | undefined;

    for (const enemy of this.enemies) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance <= maxDistance && (!nearest || distance < nearest.distance)) {
        nearest = { x: enemy.x, y: enemy.y, distance };
      }
    }

    if (this.boss) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
      if (distance <= maxDistance && (!nearest || distance < nearest.distance)) {
        nearest = { x: this.boss.x, y: this.boss.y, distance };
      }
    }

    return nearest ? { x: nearest.x, y: nearest.y } : undefined;
  }

  private spawnOrFocusBoss(): void {
    if (this.boss) {
      this.cameras.main.pan(this.boss.x, this.boss.y, 220);
      this.refreshHud(`Boss 已在地图上：${this.getBossName(this.boss.bossId)}`);
      return;
    }

    const activeBossId = this.state.bossPressure.activeHunterId;
    const bossId = activeBossId ?? BOSS_ORDER.find((boss) => !this.state.killedBossIds.includes(boss.id))?.id;
    if (!bossId) {
      this.refreshHud("30 级原型阶段结算：三个 Boss 已清理。");
      return;
    }

    this.spawnBoss(bossId);
    this.refreshHud(`${activeBossId ? "等级追猎" : "主动狩猎"}：${this.getBossName(bossId)} 已出现。`);
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

    this.boss = this.add.circle(position.x, position.y, 34, color[bossId]).setDepth(21) as BossMarker;
    this.boss.bossId = bossId;
    this.boss.maxHealth = Math.round(definition.maxHealth / 35);
    this.boss.health = this.boss.maxHealth;
    this.boss.setStrokeStyle(4, 0xfff3b0);
    this.bossLabel = this.add
      .text(position.x - 54, position.y - 58, "", {
        color: "#fff3b0",
        fontFamily: "Arial",
        fontSize: "16px",
      })
      .setDepth(22);
  }

  private findOpenBossSpawnPosition(bossId: BossId): { x: number; y: number } {
    const base = getBossSpawnPosition(this.player ?? PLAYER_START, bossId);
    if (!circleIntersectsBuildings({ ...base, radius: 34 })) {
      return base;
    }

    const player = this.player ?? PLAYER_START;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const angle = attempt * 0.72;
      const distance = 520 + attempt * 28;
      const position = {
        x: Phaser.Math.Clamp(player.x + Math.cos(angle) * distance, 48, MAP_WIDTH - 48),
        y: Phaser.Math.Clamp(player.y + Math.sin(angle) * distance, 48, MAP_HEIGHT - 48),
      };
      if (!circleIntersectsBuildings({ ...position, radius: 34 })) {
        return position;
      }
    }

    return base;
  }

  private highlightNearbyNode(): void {
    const nearby = this.getNearbyNode();
    for (const marker of this.nodeMarkers) {
      marker.setStrokeStyle(marker === nearby ? 4 : 0, 0xffffff);
    }
  }

  private collectNearbyNode(): void {
    const marker = this.getNearbyNode();
    if (!marker) {
      this.refreshHud("附近没有可搜索点。");
      return;
    }
    const node = this.state.exploration.nodes.find((candidate) => candidate.id === marker.nodeId);
    this.state = collectNode(this.state, marker.nodeId);
    marker.setAlpha(0.35);
    this.refreshHud(`搜索：${node?.name ?? marker.nodeId}`);
  }

  private getNearbyNode(): NodeMarker | undefined {
    if (!this.player) return undefined;
    return this.nodeMarkers.find((marker) => {
      const distance = Phaser.Math.Distance.Between(this.player!.x, this.player!.y, marker.x, marker.y);
      return distance <= 72 && !this.state.exploration.resolvedNodeIds.includes(marker.nodeId);
    });
  }

  private getBossName(bossId: BossId): string {
    return BOSS_ORDER.find((boss) => boss.id === bossId)?.name ?? bossId;
  }

  private updateDebugState(): void {
    window.__prototypeDebug = {
      enemyCount: this.enemies.length,
      bossCount: this.boss ? 1 : 0,
      bulletCount: this.bullets.length,
      buildingCount: BUILDINGS.length,
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
    };
  }

  private refreshHud(text: string): void {
    const enemyLine = `地图 ${MAP_WIDTH}x${MAP_HEIGHT}  怪物 ${this.enemies.length}  子弹 ${this.bullets.length}  楼房 ${BUILDINGS.length}  Boss ${
      this.boss ? this.getBossName(this.boss.bossId) : "无"
    }`;
    this.hud?.setText([
      ...createHudLines(this.state),
      enemyLine,
      `普攻 ${this.attackMode === "auto" ? "自动" : "手动"}  Space 发射子弹  1-4 技能弹幕`,
    ].join("\n"));
    this.message?.setText(text);
  }
}
