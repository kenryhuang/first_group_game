import Phaser from "phaser";
import { PrototypeScene } from "./PrototypeScene";

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#171a16",
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scene: [PrototypeScene],
  };
}
