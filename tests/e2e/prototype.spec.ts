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
    .toBe(3);
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
    .toBe(3);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.bossNames.join(" / ") ?? ""))
    .toContain("变异厨师");
  await expect(page.getByText(/Boss 3\/3/)).toBeVisible();
});

async function canvasHasVisiblePixels(handle: ElementHandle<SVGElement | HTMLElement> | null): Promise<boolean> {
  if (!handle) return false;
  return handle.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    if (canvas.width <= 0 || canvas.height <= 0) return false;

    return canvas.toDataURL("image/png").length > 100;
  });
}
