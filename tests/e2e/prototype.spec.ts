import { expect, test, type ElementHandle } from "@playwright/test";
import { BOSS_RUSH_SCENARIOS, type BossRushScenarioId } from "../../src/systems/bossRush";
import type { GameMetrics } from "../../src/app/gameStore";

declare global {
  interface Window {
    __prototypeDebug?: GameMetrics;
  }
}

test.skip("prototype loads and responds to keyboard controls", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "经典" })).toBeVisible();
  await expect(page.getByRole("button", { name: "剧情模式" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Boss Rush" })).toBeVisible();
  await expect(page.getByRole("button", { name: "联机 未开发" })).toBeDisabled();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "经典" }).click();

  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () => canvasHasVisiblePixels(await canvas.elementHandle()))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.mapWidth ?? 0))
    .toBe(10000);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.mapHeight ?? 0))
    .toBe(10000);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.bossCount ?? 0))
    .toBeGreaterThanOrEqual(4);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.enemyCount ?? 0))
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.buildingCount ?? 0))
    .toBeGreaterThanOrEqual(14);
  await expect
    .poll(() => page.evaluate(() => typeof window.__prototypeDebug?.insideBuilding))
    .toBe("boolean");
  await expect
    .poll(() => page.evaluate(() => Object.hasOwn(window.__prototypeDebug ?? {}, "currentBuildingId")))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => typeof window.__prototypeDebug?.playerHealth))
    .toBe("number");

  const beforeInput = await canvas.evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL(),
  );
  await page.keyboard.press("1");
  await page.mouse.move(720, 300);
  await page.keyboard.press("Space");
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.bulletCount ?? 0))
    .toBeGreaterThan(0);
  await page.keyboard.press("X");
  await page.keyboard.press("Q");
  await page.keyboard.press("B");
  await expect
    .poll(async () =>
      canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL()),
    )
    .not.toBe(beforeInput);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.bossCount ?? 0))
    .toBeGreaterThanOrEqual(4);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.bossNames.length ?? 0))
    .toBeGreaterThanOrEqual(4);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.bossNames.includes("失控战争核心")))
    .toBe(false);
});

test("classic mode loads and responds to keyboard controls", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("classic-mode-button")).toBeVisible();
  await expect(page.getByTestId("story-mode-button")).toBeVisible();
  await expect(page.getByTestId("boss-rush-button")).toBeVisible();
  await expect(page.getByTestId("coop-mode-button")).toBeDisabled();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByTestId("classic-mode-button").click();

  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () => canvasHasVisiblePixels(await canvas.elementHandle()))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.mapWidth ?? 0))
    .toBe(10000);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.mapHeight ?? 0))
    .toBe(10000);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.bossCount ?? 0))
    .toBeGreaterThanOrEqual(4);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.enemyCount ?? 0))
    .toBeGreaterThan(0);

  const beforeInput = await canvas.evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL(),
  );
  await page.keyboard.press("1");
  await page.mouse.move(720, 300);
  await page.keyboard.press("Space");
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.bulletCount ?? 0))
    .toBeGreaterThan(0);
  await page.keyboard.press("X");
  await page.keyboard.press("Q");
  await page.keyboard.press("B");
  await expect
    .poll(async () =>
      canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL()),
    )
    .not.toBe(beforeInput);
});

test("in-game return button goes back to the main menu", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("classic-mode-button").click();
  await expect(page.locator("canvas").first()).toBeVisible();

  await page.getByTestId("return-menu-button").click();

  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByTestId("classic-mode-button")).toBeVisible();
  await expect(page.getByTestId("boss-rush-button")).toBeVisible();
});

test.skip("story mode can be selected from the main menu", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "剧情模式" }).click();

  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await expect(page.getByText(/剧情模式/)).toBeVisible();
  await expect(page.getByText(/中心开放区/)).toBeVisible();
  await expect(page.getByText(/封锁区不可进入/)).toBeVisible();
  await expect(page.getByText(/北部入口区/)).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.mapWidth ?? 0))
    .toBe(20000);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.mapHeight ?? 0))
    .toBe(20000);
  await expect
    .poll(async () => canvasHasVisiblePixels(await canvas.elementHandle()))
    .toBe(true);
});

test("story mode first phase starts through intro, mech select, and fog lighthouse", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("story-mode-button").click();
  await expect(page.getByTestId("story-intro")).toBeVisible();

  await page.getByTestId("story-intro-continue").click();
  await expect(page.getByTestId("story-mech-select")).toBeVisible();

  await page.getByTestId("story-mech-vanguard").click();

  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await expect(page.getByText(/灯塔/)).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.mapWidth ?? 0))
    .toBe(20000);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.mapHeight ?? 0))
    .toBe(20000);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.selectedStoryMechId ?? null))
    .toBe("vanguard");
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyLitLighthouseCount ?? -1))
    .toBe(0);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyVisionRadius ?? 0))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => canvasHasVisiblePixels(await canvas.elementHandle()))
    .toBe(true);

  await page.keyboard.press("E");
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyLitLighthouseCount ?? 0))
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyMonsterPressureMultiplier ?? 1))
    .toBeGreaterThan(1);
});

test("boss rush selection starts a dungeon without normal enemy waves", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Boss Rush" }).click();
  await expect(page.getByRole("heading", { name: "Boss Rush" })).toBeVisible();
  await expect(page.getByRole("button", { name: /终焉之战/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /厨房混战/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /远程狙击/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /圣光审判/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /杂技表演/ })).toBeVisible();

  await page.getByRole("button", { name: /厨房混战/ }).click();
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.bossCount ?? 0))
    .toBe(6);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.enemyCount ?? -1))
    .toBe(0);
});

test("boss rush dungeons spawn every configured boss", async ({ page }) => {
  const expectedBossCounts: Record<BossRushScenarioId, number> = {
    "duel-chef": 1,
    "duel-clown": 1,
    "duel-courier": 1,
    "duel-hospital-knight": 1,
    "duel-beastmaster": 1,
    "duel-plague-doctor": 1,
    "duel-tesla-engineer": 1,
    "duel-magician": 1,
    "duel-war-convoy": 1,
    "duel-war-core": 1,
    "final-war": 5,
    "kitchen-brawl": 6,
    "sniper-crossfire": 5,
    "holy-judgment": 3,
    "circus-show": 20,
  };

  for (const scenario of BOSS_RUSH_SCENARIOS) {
    await page.goto("/");
    await page.getByRole("button", { name: "Boss Rush" }).click();
    await page.getByRole("button", { name: new RegExp(scenario.name) }).click();
    await expect(page.locator("canvas").first()).toBeVisible();

    await expect
      .poll(() => page.evaluate(() => window.__prototypeDebug?.bossCount ?? -1))
      .toBe(expectedBossCounts[scenario.id]);
  }
});

async function canvasHasVisiblePixels(handle: ElementHandle<SVGElement | HTMLElement> | null): Promise<boolean> {
  if (!handle) return false;
  return handle.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    if (canvas.width <= 0 || canvas.height <= 0) return false;

    return canvas.toDataURL("image/png").length > 100;
  });
}
