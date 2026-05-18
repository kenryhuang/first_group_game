import Phaser from "phaser";
import { createGameConfig } from "./game/sceneConfig";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app container");
}

new Phaser.Game(createGameConfig("app"));
