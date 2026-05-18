import Phaser from "phaser";
import { BOSS_ORDER } from "../data/prototypeData";
import type { RunState } from "../domain/types";
import { createRunState, collectNode, gainRunExperience, killRunBoss, useRunSkill } from "../systems/runState";
import { createHudLines } from "../ui/hud";

type NodeMarker = Phaser.GameObjects.Rectangle & { nodeId: string };

export class PrototypeScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Arc;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private state: RunState = createRunState();
  private hud?: Phaser.GameObjects.Text;
  private message?: Phaser.GameObjects.Text;
  private nodeMarkers: NodeMarker[] = [];
  private attackMode: "auto" | "manual" = "auto";

  constructor() {
    super("prototype");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#171a16");
    this.add.rectangle(640, 380, 1180, 600, 0x23271f).setStrokeStyle(2, 0x4f5b45);
    this.add.grid(640, 380, 1180, 600, 80, 80, 0x2f382b, 0.4, 0x2f382b, 0.2);

    this.player = this.add.circle(640, 360, 14, 0x95d5b2);
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
    });
    this.message = this.add.text(20, 640, "", {
      color: "#ffd166",
      fontFamily: "Arial",
      fontSize: "18px",
    });

    this.createNodeMarkers();
    this.bindKeys();
    this.refreshHud("WASD/方向键移动，E 搜刮，Q 普攻模式，1-4 技能，B 击杀当前追杀 Boss，X 获得经验");
  }

  update(_time: number, delta: number): void {
    this.movePlayer(delta);
    this.highlightNearbyNode();
  }

  private createNodeMarkers(): void {
    for (const node of this.state.exploration.nodes) {
      const color = node.kind === "resource" ? 0x74c69d : node.kind === "event" ? 0xf2cc8f : 0xe07a5f;
      const marker = this.add.rectangle(node.x, node.y, 34, 34, color, 0.9) as NodeMarker;
      marker.nodeId = node.id;
      this.add.text(node.x - 38, node.y + 24, node.name, {
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
    this.input.keyboard?.on("keydown-X", () => {
      this.state = gainRunExperience(this.state, 120);
      this.refreshHud("击杀普通丧尸群，获得经验。");
    });
    this.input.keyboard?.on("keydown-B", () => this.killActiveBoss());
    for (let index = 0; index < 4; index += 1) {
      this.input.keyboard?.on(`keydown-${index + 1}`, () => this.castSkill(index));
    }
  }

  private movePlayer(delta: number): void {
    if (!this.player) return;
    const speed = 220;
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
    this.player.x = Phaser.Math.Clamp(this.player.x, 70, 1210);
    this.player.y = Phaser.Math.Clamp(this.player.y, 90, 680);
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

  private castSkill(index: number): void {
    const skillId = this.state.activeSkillIds[index];
    if (!skillId) {
      this.refreshHud(`技能槽 ${index + 1} 为空。`);
      return;
    }
    this.state = useRunSkill(this.state, skillId);
    this.refreshHud(`释放技能槽 ${index + 1}。`);
  }

  private killActiveBoss(): void {
    const activeBossId = this.state.bossPressure.activeHunterId;
    if (!activeBossId) {
      const nextBoss = BOSS_ORDER.find((boss) => !this.state.killedBossIds.includes(boss.id));
      if (!nextBoss) {
        this.refreshHud("30 级原型阶段结算：三个 Boss 已清理。");
        return;
      }
      this.state = killRunBoss(this.state, nextBoss.id);
      this.refreshHud(`主动狩猎成功：${nextBoss.name}`);
      return;
    }
    const boss = BOSS_ORDER.find((candidate) => candidate.id === activeBossId);
    this.state = killRunBoss(this.state, activeBossId);
    this.refreshHud(`击杀追杀 Boss：${boss?.name ?? activeBossId}`);
  }

  private getNearbyNode(): NodeMarker | undefined {
    if (!this.player) return undefined;
    return this.nodeMarkers.find((marker) => {
      const distance = Phaser.Math.Distance.Between(this.player!.x, this.player!.y, marker.x, marker.y);
      return distance <= 58 && !this.state.exploration.resolvedNodeIds.includes(marker.nodeId);
    });
  }

  private refreshHud(text: string): void {
    this.hud?.setText([...createHudLines(this.state), `普攻 ${this.attackMode === "auto" ? "自动" : "手动"}`].join("\n"));
    this.message?.setText(text);
  }
}
