import Phaser from "phaser";

export class PrototypeScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Arc;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;

  constructor() {
    super("prototype");
  }

  create(): void {
    this.add.text(24, 20, "末日废土幸存者原型", {
      color: "#f2ead3",
      fontFamily: "Arial",
      fontSize: "24px",
    });
    this.player = this.add.circle(640, 360, 14, 0x95d5b2);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;
  }

  update(_time: number, delta: number): void {
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
    this.player.x = Phaser.Math.Clamp(this.player.x, 16, 1264);
    this.player.y = Phaser.Math.Clamp(this.player.y, 56, 704);
  }
}
