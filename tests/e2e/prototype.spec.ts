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

  await expect(page.getByTestId("classic-mode-button")).toBeVisible();
  await expect(page.getByTestId("story-mode-button")).toBeVisible();
  await expect(page.getByTestId("boss-rush-button")).toBeVisible();
  await expect(page.getByTestId("coop-mode-button")).toBeDisabled();
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
  await page.getByTestId("story-mode-button").click();
  await expect(page.getByTestId("story-intro")).toBeVisible();
});

test("story mode map tuning starts with zombie waves and without boss encounters", async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto("/");

  await page.getByTestId("story-mode-button").click();
  await expect(page.getByTestId("story-intro")).toBeVisible();

  await page.getByTestId("story-intro-continue").click();
  await expect(page.getByTestId("story-mech-select")).toBeVisible();

  await page.getByTestId("story-mech-vanguard").click();

  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await expect(page.getByText(/全城开放调图中/)).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.mapWidth ?? 0), {
      timeout: 20_000,
    })
    .toBe(40000);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.mapHeight ?? 0))
    .toBe(40000);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.selectedStoryMechId ?? null))
    .toBe("vanguard");
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyLitLighthouseCount ?? -1))
    .toBe(0);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyVisionRadius ?? 0))
    .toBe(40000);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.bossCount ?? -1))
    .toBe(0);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.enemyCount ?? -1))
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => (window.__prototypeDebug as any)?.renderedBuildingCount ?? -1))
    .toBeGreaterThanOrEqual(150);
  await expect
    .poll(async () => canvasHasVisiblePixels(await canvas.elementHandle()))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyArtSliceEnabled ?? false))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyLighthouseVisualState ?? null))
    .toBe("off");
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyArtSpriteCount ?? 0))
    .toBeGreaterThanOrEqual(18);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyArtSpriteCount ?? 0))
    .toBeLessThan(3000);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dEnabled ?? false))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dProjectionMode ?? null))
    .toBe("isometric-a1");
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dIsoTileWidth ?? 0))
    .toBe(256);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dIsoTileHeight ?? 0))
    .toBe(128);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dIsoLogicalTileSize ?? 0))
    .toBe(256);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyIsoMapMode ?? null))
    .toBe("a2-preview");
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyIsoMapTileCount ?? 0))
    .toBe(25760);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyIsoMapRoadTileCount ?? 0))
    .toBe(6168);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyIsoMapPropCount ?? 0))
    .toBe(8);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyIsoMapDepthSortedPropCount ?? 0))
    .toBe(8);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyIsoMapBlockedFootprintCount ?? 0))
    .toBe(6);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dVolumePropCount ?? 0))
    .toBeGreaterThanOrEqual(8);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dDepthSortedPropCount ?? 0))
    .toBeGreaterThanOrEqual(8);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dProjectedUnderlayEnabled ?? false))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dProjectedRoadUnderlayAlpha ?? 1))
    .toBeLessThanOrEqual(0.1);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.story2_5dProjectedDistrictUnderlayAlpha ?? 1))
    .toBeLessThanOrEqual(0.1);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const metrics = window.__prototypeDebug;
        if (
          !metrics?.playerX ||
          !metrics.playerY ||
          !metrics.story2_5dPlayerScreenX ||
          !metrics.story2_5dPlayerScreenY ||
          !metrics.story2_5dIsoTileWidth ||
          !metrics.story2_5dIsoTileHeight ||
          !metrics.story2_5dIsoLogicalTileSize
        ) {
          return false;
        }
        const originX = 20000;
        const originY = 19800;
        const dx = (metrics.playerX - originX) / metrics.story2_5dIsoLogicalTileSize;
        const dy = (metrics.playerY - originY) / metrics.story2_5dIsoLogicalTileSize;
        const expectedX = originX + (dx - dy) * (metrics.story2_5dIsoTileWidth / 2);
        const expectedY = originY + (dx + dy) * (metrics.story2_5dIsoTileHeight / 2);

        return (
          Math.abs(metrics.story2_5dPlayerScreenX - expectedX) < 0.5 &&
          Math.abs(metrics.story2_5dPlayerScreenY - expectedY) < 0.5 &&
          Math.abs(metrics.story2_5dPlayerScreenX - metrics.playerX) > 1 &&
          Math.abs(metrics.story2_5dPlayerScreenY - metrics.playerY) > 1
        );
      }),
    )
    .toBe(true);

  await page.keyboard.press("E");
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyLitLighthouseCount ?? 0))
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyMonsterPressureMultiplier ?? 1))
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyLighthouseVisualState ?? null))
    .toBe("on");
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyMagicianInterferenceActive ?? false))
    .toBe(false);

  await page.keyboard.down("w");
  await page.waitForTimeout(2700);
  await page.keyboard.up("w");

  const beforeRightMoveX = await page.evaluate(
    () => window.__prototypeDebug?.playerX ?? 0,
  );
  await page.keyboard.down("d");
  await page.waitForTimeout(4200);
  await page.keyboard.up("d");
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.playerX ?? 99999), { timeout: 3000 })
    .toBeGreaterThan(beforeRightMoveX + 600);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.storyMagicianInterferenceActive ?? false))
    .toBe(false);
});

test("boss rush selection starts a dungeon without normal enemy waves", async ({ page }) => {
  const kitchenBrawl = BOSS_RUSH_SCENARIOS.find((scenario) => scenario.id === "kitchen-brawl");
  if (!kitchenBrawl) throw new Error("Missing kitchen-brawl scenario");

  await page.goto("/");

  await page.getByRole("button", { name: "Boss Rush" }).click();
  await expect(page.getByRole("heading", { name: "Boss Rush" })).toBeVisible();
  for (const scenario of BOSS_RUSH_SCENARIOS) {
    await expect(page.getByRole("button", { name: new RegExp(scenario.name) })).toBeVisible();
  }

  await page.getByRole("button", { name: new RegExp(kitchenBrawl.name) }).click();
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
    "duel-war-core-phase-1": 1,
    "duel-war-core-phase-2": 1,
    "duel-war-core-phase-3": 1,
    "duel-war-core-phase-4": 1,
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
