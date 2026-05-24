import { expect, test, type ElementHandle } from "@playwright/test";

declare global {
  interface Window {
    __prototypeDebug?: {
      enemyCount: number;
      bossCount: number;
      bulletCount: number;
      buildingCount: number;
      mapWidth: number;
      mapHeight: number;
      attackMode: "auto" | "manual";
      bossName: string | null;
      bossNames: string[];
      insideBuilding: boolean;
      currentBuildingId: string | null;
      playerHealth: number;
    };
  }
}

test("prototype loads and responds to keyboard controls", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "开始游戏" })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "开始游戏" }).click();

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

async function canvasHasVisiblePixels(handle: ElementHandle<SVGElement | HTMLElement> | null): Promise<boolean> {
  if (!handle) return false;
  return handle.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    if (canvas.width <= 0 || canvas.height <= 0) return false;

    return canvas.toDataURL("image/png").length > 100;
  });
}
