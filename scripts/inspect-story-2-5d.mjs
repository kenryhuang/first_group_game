import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5317";
const outputPath = process.env.STORY_2_5D_SCREENSHOT ?? "/tmp/story-2-5d.png";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(baseURL);
await page.getByTestId("story-mode-button").click();
await page.getByTestId("story-intro-continue").click();
await page.getByTestId("story-mech-vanguard").click();
await page.locator("canvas").first().waitFor({ state: "visible" });
await page.waitForFunction(() => window.__prototypeDebug?.story2_5dEnabled === true);
await page.waitForTimeout(900);

const metrics = await page.evaluate(() => window.__prototypeDebug);
await page.screenshot({ path: outputPath, fullPage: true });
await browser.close();

console.log(JSON.stringify({
  outputPath,
  story2_5dEnabled: metrics?.story2_5dEnabled,
  story2_5dGroundScaleY: metrics?.story2_5dGroundScaleY,
  story2_5dPlayerScreenY: metrics?.story2_5dPlayerScreenY,
  enemyCount: metrics?.enemyCount,
  storyArtSpriteCount: metrics?.storyArtSpriteCount,
}, null, 2));
