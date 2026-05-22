import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";

describe("prototype tech stack", () => {
  it("uses Vue, PixiJS, Pinia, Howler, GSAP, and Express", () => {
    expect(packageJson.dependencies).toMatchObject({
      "express": expect.any(String),
      "gsap": expect.any(String),
      "howler": expect.any(String),
      "pinia": expect.any(String),
      "pixi.js": expect.any(String),
      "vue": expect.any(String),
    });
    expect(packageJson.dependencies).not.toHaveProperty("phaser");
  });
});
