import { expect, test, type ElementHandle } from "@playwright/test";

test("prototype loads and responds to keyboard controls", async ({ page }) => {
  await page.goto("/");

  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () => canvasHasVisiblePixels(await canvas.elementHandle()))
    .toBe(true);

  const beforeInput = await canvas.evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL(),
  );
  await page.keyboard.press("X");
  await page.keyboard.press("Q");
  await expect
    .poll(async () =>
      canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL()),
    )
    .not.toBe(beforeInput);
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
