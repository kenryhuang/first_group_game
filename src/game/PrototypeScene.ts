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
import { createHudLines } from "../ui/hud";

type NodeMarker = Phaser.GameObjects.Rectangle & { nodeId: string };
type EnemyMarker = Phaser.GameObjects.Arc & { health: number; speed: number };
type BossMarker = Phaser.GameObjects.Arc & { bossId: BossId; health: number; maxHealth: number };

interface PrototypeDebugState {
  enemyCount: number;
  bossCount: number;
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

    this.add.rectangle(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 0x20251e);
    this.add.grid(MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH, MAP_HEIGHT, 160, 160, 0x2f382b, 0.45, 0x2f382b, 0.18);
    this.drawDistricts();

    this.player = this.add.circle(PLAYER_START.x, PLAYER_START.y, 16, 0x95d5b2);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;

    this.hud = this.add.text(20, 18, "", {
      color: "#f2ead3",
      fontFamily: "Arial",
      fontSize: "18px",
      lineSpacing: 6,
    }).setScrollFactor(0);
    this.message = this.add.text(20, 640, "", {
      color: "#ffd166",
      fontFamily: "Arial",
      fontSize: "18px",
    }).setScrollFactor(0);

    this.createNodeMarkers();
    this.bindKeys();
    this.spawnEnemyWave(12);
    this.refreshHud("大地图已展开。普通怪会自动刷新；B 召唤/定位 Boss，Space 手动普攻。");
  }

  update(_time: number, delta: number): void {
    this.movePlayer(delta);
    this.updateEnemies(delta);
    this.updateBoss(delta);
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
      this.add.rectangle(district.x, district.y, district.w, district.h, district.color, 0.82)
        .setStrokeStyle(2, 0x59614f, 0.6);
      this.add.text(district.x - district.w / 2 + 24, district.y - district.h / 2 + 18, district.label, {
        color: "#b9c7a7",
        fontFamily: "Arial",
        fontSize: "20px",
      });
    }
  }

  private createNodeMarkers(): void {
    for (const node of this.state.exploration.nodes) {
      const position = getNodeWorldPosition(node);
      const color = node.kind === "resource" ? 0x74c69d : node.kind === "event" ? 0xf2cc8f : 0xe07a5f;
      const marker = this.add.rectangle(position.x, position.y, 40, 40, color, 0.9) as NodeMarker;
      marker.nodeId = node.id;
      this.add.text(position.x - 42, position.y + 28, node.name, {
        color: "#f8f4e3",
        fontFamily: "Arial",
        fontSize: "14px",
      });
      this.nodeMarkers.push(marker);
    }
  }

  private bindKeys(): void {
    this.input.keyboard?.on("keydown-E", () => this.collectNearbyNode());
    this.input.keyboard?.on("keydown-Q", () => {
      this.attackMode = this.attackMode === "auto" ? "manual" : "auto";
      this.refreshHud(`普攻模式：${this.attackMode === "auto" ? "自动" : "手动"}`);
    });
    this.input.keyboard?.on("keydown-SPACE", () => this.basicAttack("手动普攻"));
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

    this.player.x += (dx / length) * speed * seconds;
    this.player.y += (dy / length) * speed * seconds;
    this.player.x = Phaser.Math.Clamp(this.player.x, 24, MAP_WIDTH - 24);
    this.player.y = Phaser.Math.Clamp(this.player.y, 24, MAP_HEIGHT - 24);
  }

  private updateEnemies(delta: number): void {
    if (!this.player) return;
    const seconds = delta / 1000;

    for (const enemy of this.enemies) {
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      enemy.x += Math.cos(angle) * enemy.speed * seconds;
      enemy.y += Math.sin(angle) * enemy.speed * seconds;
    }
  }

  private updateBoss(delta: number): void {
    if (!this.player || !this.boss) return;
    const seconds = delta / 1000;
    const angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
    this.boss.x += Math.cos(angle) * 92 * seconds;
    this.boss.y += Math.sin(angle) * 92 * seconds;
    this.bossLabel?.setPosition(this.boss.x - 54, this.boss.y - 58);
    this.bossLabel?.setText(`${this.getBossName(this.boss.bossId)} ${Math.ceil(this.boss.health)}/${this.boss.maxHealth}`);
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
    this.basicAttack("自动普攻");
  }

  private spawnEnemyWave(count: number): void {
    if (!this.player) return;

    for (let index = 0; index < count; index += 1) {
      const position = getSpawnPositionAroundPlayer(this.player, this.spawnSeed);
      this.spawnSeed += 1;
      const enemy = this.add.circle(position.x, position.y, 11, 0x8d99ae) as EnemyMarker;
      enemy.health = 28;
      enemy.speed = 58 + (this.spawnSeed % 4) * 8;
      this.enemies.push(enemy);
    }
  }

  private basicAttack(label: string): void {
    const defeated = this.damageEnemiesNearPlayer(34, 170);
    const bossHit = this.damageBossNearPlayer(42, 190);
    if (defeated > 0 || bossHit) {
      this.state = gainRunExperience(this.state, defeated * 6);
      this.syncBossFromPressure();
      this.refreshHud(`${label}：击中 ${defeated} 个普通怪${bossHit ? "，命中 Boss" : ""}。`);
      return;
    }
    this.refreshHud(`${label}：附近没有目标。`);
  }

  private damageEnemiesNearPlayer(damage: number, radius: number): number {
    if (!this.player) return 0;
    let defeated = 0;

    for (const enemy of [...this.enemies]) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance > radius) continue;
      enemy.health -= damage;
      enemy.setFillStyle(0xd90429);
      this.time.delayedCall(80, () => enemy.active && enemy.setFillStyle(0x8d99ae));

      if (enemy.health <= 0) {
        enemy.destroy();
        this.enemies = this.enemies.filter((candidate) => candidate !== enemy);
        defeated += 1;
      }
    }

    return defeated;
  }

  private damageBossNearPlayer(damage: number, radius: number): boolean {
    if (!this.player || !this.boss) return false;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
    if (distance > radius) return false;

    this.boss.health -= damage;
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

  private castSkill(index: number): void {
    const skillId = this.state.activeSkillIds[index];
    if (!skillId) {
      this.refreshHud(`技能槽 ${index + 1} 为空。`);
      return;
    }
    this.state = useRunSkill(this.state, skillId);
    const defeated = this.damageEnemiesNearPlayer(72, 260);
    const bossHit = this.damageBossNearPlayer(96, 300);
    this.state = gainRunExperience(this.state, defeated * 6);
    this.syncBossFromPressure();
    this.refreshHud(`释放技能槽 ${index + 1}：击中 ${defeated} 个普通怪${bossHit ? "，命中 Boss" : ""}。`);
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
    this.refreshHud(`${activeBossId ? "等级追杀" : "主动狩猎"}：${this.getBossName(bossId)} 已出现。`);
  }

  private syncBossFromPressure(): void {
    if (!this.state.bossPressure.activeHunterId || this.boss) return;
    this.spawnBoss(this.state.bossPressure.activeHunterId);
  }

  private spawnBoss(bossId: BossId): void {
    if (!this.player) return;
    const definition = BOSS_ORDER.find((boss) => boss.id === bossId);
    if (!definition) return;

    const position = getBossSpawnPosition(this.player, bossId);
    const color: Record<BossId, number> = {
      chef: 0xe63946,
      clown: 0x9d4edd,
      courier: 0xf77f00,
    };

    this.boss = this.add.circle(position.x, position.y, 34, color[bossId]) as BossMarker;
    this.boss.bossId = bossId;
    this.boss.maxHealth = Math.round(definition.maxHealth / 35);
    this.boss.health = this.boss.maxHealth;
    this.boss.setStrokeStyle(4, 0xfff3b0);
    this.bossLabel = this.add.text(position.x - 54, position.y - 58, "", {
      color: "#fff3b0",
      fontFamily: "Arial",
      fontSize: "16px",
    });
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
      this.refreshHud("附近没有可搜刮点。");
      return;
    }
    const node = this.state.exploration.nodes.find((candidate) => candidate.id === marker.nodeId);
    this.state = collectNode(this.state, marker.nodeId);
    marker.setAlpha(0.35);
    this.refreshHud(`搜刮：${node?.name ?? marker.nodeId}`);
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
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
    };
  }

  private refreshHud(text: string): void {
    const enemyLine = `地图 ${MAP_WIDTH}x${MAP_HEIGHT}  普通怪 ${this.enemies.length}  Boss ${this.boss ? this.getBossName(this.boss.bossId) : "无"}`;
    this.hud?.setText([
      ...createHudLines(this.state),
      enemyLine,
      `普攻 ${this.attackMode === "auto" ? "自动" : "手动"}  Space 手动普攻`,
    ].join("\n"));
    this.message?.setText(text);
  }
}
