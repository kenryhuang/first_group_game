import { expect, test, type ElementHandle } from "@playwright/test";

declare global {
  interface Window {
    __prototypeDebug?: {
      enemyCount: number;
      bossCount: number;
      mapWidth: number;
      mapHeight: number;
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
    .toBeGreaterThanOrEqual(4096);
  await expect
    .poll(() => page.evaluate(() => window.__prototypeDebug?.enemyCount ?? 0))
    .toBeGreaterThan(0);

  const beforeInput = await canvas.evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL(),
  );
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
    .toBe(1);
});

async function canvasHasVisiblePixels(handle: ElementHandle<SVGElement | HTMLElement> | null): Promise<boolean> {
  if (!handle) return false;
  return handle.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    if (!context) return false;

    const width = Math.min(canvas.width, 320);
    const height = Math.min(canvas.height, 180);
    const pixels = context.getImageData(0, 0, width, height).data;
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const alpha = pixels[index + 3];
      if (alpha > 0 && (red > 40 || green > 40 || blue > 40)) {
        return true;
      }
    }
    return false;
  });
}
