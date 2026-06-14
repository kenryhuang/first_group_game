# War Core City Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework 失控战争核心 into a four-phase city-authority final Boss with an underground armory phase and post-kill evacuation timer.

**Architecture:** Keep the existing final Boss pipeline in `PixiWastelandGame.ts`, but extend the endgame rules in `src/systems/endgame.ts` so phase selection, P4 constants, and evacuation outcomes are testable outside Pixi. Reuse current city-facility attacks for P1-P3, then add a focused underground armory state inside the Pixi game runtime for P4 and extraction.

**Tech Stack:** TypeScript, PixiJS, Vitest, Playwright e2e, existing Vite app.

---

## File Structure

- Modify `src/systems/endgame.ts`
  - Add phase 4 typing and constants.
  - Add evacuation outcome helper.
  - Keep existing ultimate definitions and endgame readiness unchanged.
- Modify `src/systems/endgame.test.ts`
  - Test four-phase health thresholds.
  - Test P4 armory and evacuation constants.
  - Test evacuation success/failure helper.
- Modify `src/game/PixiWastelandGame.ts`
  - Expand `FinalBossActor.phase` to `1 | 2 | 3 | 4`.
  - Add P4 underground armory state, collapse state, and extraction actor.
  - Add P4 pressure attacks using existing blast/hazard primitives.
  - Route final Boss defeat through extraction when defeated in P4.
- Modify `tests/e2e/prototype.spec.ts`
  - Keep broad Boss Rush spawn coverage passing.
  - Add a lightweight debug-facing assertion only if a stable UI signal already exists after implementation.

---

### Task 1: Extend Endgame Rules To Four Phases

**Files:**
- Modify: `src/systems/endgame.ts`
- Modify: `src/systems/endgame.test.ts`

- [ ] **Step 1: Write failing tests for four phases and P4 constants**

Add these imports in `src/systems/endgame.test.ts`:

```ts
import {
  FINAL_BOSS_DEFINITION,
  FINAL_BOSS_PHASE_FOUR_SKILL,
  FINAL_BOSS_PHASE_ONE_SKILL,
  FINAL_BOSS_PHASE_THREE_SKILL,
  FINAL_BOSS_PHASE_TWO_SKILL,
  getEndgameUltimateDefinition,
  getFinalBossPhase,
  getWarCoreEvacuationOutcome,
  isEndgameReady,
} from "./endgame";
```

Replace the phase test with:

```ts
it("tracks the city authority war core through four absolute-health phases", () => {
  expect(FINAL_BOSS_DEFINITION.maxHealth).toBe(10000);
  expect(getFinalBossPhase(9000)).toBe(1);
  expect(getFinalBossPhase(7000)).toBe(2);
  expect(getFinalBossPhase(5000)).toBe(3);
  expect(getFinalBossPhase(2000)).toBe(4);
});
```

Add this new test:

```ts
it("defines phase four as the underground armory and collapse evacuation", () => {
  expect(FINAL_BOSS_PHASE_FOUR_SKILL.armoryWidth).toBeGreaterThanOrEqual(1800);
  expect(FINAL_BOSS_PHASE_FOUR_SKILL.armoryHeight).toBeGreaterThanOrEqual(1200);
  expect(FINAL_BOSS_PHASE_FOUR_SKILL.pressureTickMs).toBeLessThanOrEqual(900);
  expect(FINAL_BOSS_PHASE_FOUR_SKILL.barrageDamage).toBeGreaterThan(0);
  expect(FINAL_BOSS_PHASE_FOUR_SKILL.collapseEscapeMs).toBeGreaterThanOrEqual(20000);
  expect(FINAL_BOSS_PHASE_FOUR_SKILL.exitRadius).toBeGreaterThanOrEqual(80);
});
```

Add this new test:

```ts
it("resolves underground armory evacuation by timer and exit distance", () => {
  expect(getWarCoreEvacuationOutcome({ collapseMs: 1000, distanceToExit: 40, exitRadius: 90 })).toBe("escaped");
  expect(getWarCoreEvacuationOutcome({ collapseMs: 1000, distanceToExit: 120, exitRadius: 90 })).toBe("still-running");
  expect(getWarCoreEvacuationOutcome({ collapseMs: 0, distanceToExit: 120, exitRadius: 90 })).toBe("buried");
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/systems/endgame.test.ts
```

Expected: FAIL because `FINAL_BOSS_PHASE_FOUR_SKILL` and `getWarCoreEvacuationOutcome` do not exist, and `getFinalBossPhase(2000)` still returns phase 3.

- [ ] **Step 3: Implement four-phase endgame rules**

In `src/systems/endgame.ts`, change `getFinalBossPhase` return type and implementation:

```ts
export type FinalBossPhase = 1 | 2 | 3 | 4;

export function getFinalBossPhase(health: number, _maxHealth = FINAL_BOSS_DEFINITION.maxHealth): FinalBossPhase {
  if (health <= 2000) return 4;
  if (health <= 5000) return 3;
  if (health <= 7000) return 2;
  return 1;
}
```

Add P4 constants:

```ts
export const FINAL_BOSS_PHASE_FOUR_SKILL = {
  armoryWidth: 2200,
  armoryHeight: 1500,
  coreSpeed: 68,
  pressureTickMs: 720,
  barrageDamage: 22,
  barrageRadius: 86,
  barrageWarningMs: 520,
  ammoRackDamage: 34,
  ammoRackRadius: 145,
  turretDamage: 12,
  turretProjectileSpeed: 620,
  collapseEscapeMs: 28000,
  collapseTickMs: 1000,
  collapseDamage: 10,
  exitRadius: 96,
} as const;
```

Add evacuation helper:

```ts
export type WarCoreEvacuationOutcome = "escaped" | "buried" | "still-running";

export function getWarCoreEvacuationOutcome(input: {
  collapseMs: number;
  distanceToExit: number;
  exitRadius: number;
}): WarCoreEvacuationOutcome {
  if (input.distanceToExit <= input.exitRadius) return "escaped";
  if (input.collapseMs <= 0) return "buried";
  return "still-running";
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm test -- src/systems/endgame.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/endgame.ts src/systems/endgame.test.ts
git commit -m "feat: model four-phase war core endgame"
```

---

### Task 2: Add P4 Runtime State And Underground Armory Transition

**Files:**
- Modify: `src/game/PixiWastelandGame.ts`
- Test: `src/systems/endgame.test.ts` from Task 1 remains the model coverage.

- [ ] **Step 1: Write a failing type-level implementation target**

Update imports in `src/game/PixiWastelandGame.ts` to include:

```ts
  FINAL_BOSS_PHASE_FOUR_SKILL,
  type FinalBossPhase,
```

Replace all local final Boss phase unions with `FinalBossPhase`:

```ts
interface FinalBossActor extends Actor {
  health: number;
  maxHealth: number;
  label: Text;
  phase: FinalBossPhase;
  skillElapsedMs: number;
  skillCooldownMs: number;
  contactDamageElapsedMs: number;
  skillCursor: number;
  wantedUsed: boolean;
  finalBeamUsed: boolean;
}
```

Run:

```bash
npm run build
```

Expected: FAIL until all phase-specific unions and switch logic understand phase 4.

- [ ] **Step 2: Add underground armory fields**

Add interfaces near the other final Boss actors:

```ts
interface WarCoreExtractionActor extends Actor {
  radius: number;
}
```

Add fields to `PixiWastelandGame`:

```ts
  private warCoreArmoryActive = false;
  private warCoreCollapseMs = 0;
  private warCoreCollapseTickMs = 0;
  private warCoreArmoryPressureMs = 0;
  private warCoreExtraction?: WarCoreExtractionActor;
  private warCoreArmoryOverlay?: Graphics;
```

- [ ] **Step 3: Route phase transitions into P4**

In `updateFinalBossActor`, change phase handling:

```ts
const phase = getFinalBossPhase(boss.health, boss.maxHealth);
if (phase !== boss.phase) {
  boss.phase = phase;
  this.drawFinalBossSprite(boss.view, phase);
  if (phase === 3) {
    this.clearSniperBuildings();
  }
  if (phase === 4) {
    this.enterWarCoreArmory(boss);
  }
  this.emitState(`${FINAL_BOSS_DEFINITION.name} 进入 P${phase}`);
}
```

Change the speed line:

```ts
const speed =
  phase === 4
    ? FINAL_BOSS_PHASE_FOUR_SKILL.coreSpeed
    : phase === 3
      ? FINAL_BOSS_PHASE_THREE_SKILL.mechSpeed
      : FINAL_BOSS_PHASE_ONE_SKILL.coreSpeed;
```

- [ ] **Step 4: Implement armory transition helpers**

Add methods near other final Boss helpers:

```ts
private enterWarCoreArmory(boss: FinalBossActor): void {
  if (this.warCoreArmoryActive) return;
  this.warCoreArmoryActive = true;
  this.warCoreCollapseMs = 0;
  this.warCoreCollapseTickMs = 0;
  this.warCoreArmoryPressureMs = 0;
  this.clearSniperBuildings();
  for (const bomb of [...this.finalBossBombs]) this.removeFinalBossBomb(bomb);
  for (const missile of [...this.finalBossMissiles]) this.removeFinalBossMissile(missile);
  for (const crawler of [...this.finalBossCrawlers]) this.removeFinalBossCrawler(crawler);
  this.drawWarCoreArmoryOverlay();
  const centerX = this.getMapWidth() / 2;
  const centerY = this.getMapHeight() / 2;
  this.setActorPosition(boss, centerX, centerY - 220);
  if (this.player) {
    this.setActorPosition(this.player, centerX, centerY + 260);
  }
  this.addScreenShake(700, 14);
  this.emitState("失控战争核心炸毁地表，将你拖入地下军火库。");
}

private drawWarCoreArmoryOverlay(): void {
  if (this.warCoreArmoryOverlay && !this.warCoreArmoryOverlay.destroyed) {
    this.world.removeChild(this.warCoreArmoryOverlay);
    this.warCoreArmoryOverlay.destroy();
  }
  const overlay = new Graphics();
  const centerX = this.getMapWidth() / 2;
  const centerY = this.getMapHeight() / 2;
  const width = FINAL_BOSS_PHASE_FOUR_SKILL.armoryWidth;
  const height = FINAL_BOSS_PHASE_FOUR_SKILL.armoryHeight;
  overlay
    .rect(centerX - width / 2, centerY - height / 2, width, height)
    .fill({ color: 0x17130f, alpha: 0.88 })
    .stroke({ color: 0xff9f1c, alpha: 0.7, width: 8 });
  overlay
    .rect(centerX - width / 2 + 80, centerY - height / 2 + 80, width - 160, height - 160)
    .stroke({ color: 0x8d99ae, alpha: 0.35, width: 4 });
  this.world.addChildAt(overlay, 1);
  this.warCoreArmoryOverlay = overlay;
}
```

- [ ] **Step 5: Update draw method signatures for phase 4**

Change `drawFinalBossSprite(view: Graphics, phase: 1 | 2 | 3)` to:

```ts
private drawFinalBossSprite(view: Graphics, phase: FinalBossPhase): void {
```

Add a P4 visual branch:

```ts
if (phase === 4) {
  view.circle(0, 0, 54).fill(0x1a1010).stroke({ color: 0xff4d6d, width: 7 });
  view.rect(-80, -16, 160, 32).fill(0x293241).stroke({ color: 0xff9f1c, width: 4 });
  view.rect(-18, -92, 36, 184).fill(0x3a0f12).stroke({ color: 0xffd166, width: 3 });
  view.circle(-72, -54, 16).fill(0xd90429);
  view.circle(72, -54, 16).fill(0xd90429);
  view.circle(-72, 54, 16).fill(0xd90429);
  view.circle(72, 54, 16).fill(0xd90429);
  return;
}
```

- [ ] **Step 6: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/PixiWastelandGame.ts
git commit -m "feat: transition war core into underground armory"
```

---

### Task 3: Add Underground Armory Pressure Attacks

**Files:**
- Modify: `src/game/PixiWastelandGame.ts`

- [ ] **Step 1: Route P4 skills**

In `triggerFinalBossSkill`, add phase 4 before phase 3:

```ts
if (boss.phase === 4) {
  this.triggerFinalBossPhaseFourSkill(boss);
  return;
}
```

- [ ] **Step 2: Implement P4 skill scheduler**

Add:

```ts
private triggerFinalBossPhaseFourSkill(boss: FinalBossActor): void {
  const cursor = boss.skillCursor % 3;
  boss.skillCursor += 1;
  if (cursor === 0) {
    this.castWarCoreArmoryBarrage();
  } else if (cursor === 1) {
    this.castWarCoreAmmoRackChain();
  } else {
    this.castWarCoreTurretCrossfire(boss);
  }
}
```

- [ ] **Step 3: Implement armory barrage**

Add:

```ts
private castWarCoreArmoryBarrage(): void {
  if (!this.player) return;
  const skill = FINAL_BOSS_PHASE_FOUR_SKILL;
  const center = { x: this.player.x, y: this.player.y };
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8 + this.spawnSeed * 0.17;
    const ring = 140 + (index % 3) * 85;
    const x = clamp(center.x + Math.cos(angle) * ring, 24, this.getMapWidth() - 24);
    const y = clamp(center.y + Math.sin(angle) * ring, 24, this.getMapHeight() - 24);
    this.spawnDelayedBossBlast(x, y, skill.barrageRadius, skill.barrageDamage, skill.barrageWarningMs + index * 60, 0xff9f1c, "armory barrage");
  }
  this.spawnSeed += 1;
}
```

- [ ] **Step 4: Implement ammo rack chain explosions**

Add:

```ts
private castWarCoreAmmoRackChain(): void {
  if (!this.player) return;
  const skill = FINAL_BOSS_PHASE_FOUR_SKILL;
  const startX = this.player.x - 360;
  const y = this.player.y + (this.spawnSeed % 2 === 0 ? -180 : 180);
  for (let index = 0; index < 7; index += 1) {
    const x = clamp(startX + index * 120, 24, this.getMapWidth() - 24);
    this.spawnDelayedBossBlast(x, clamp(y, 24, this.getMapHeight() - 24), skill.ammoRackRadius, skill.ammoRackDamage, 500 + index * 120, 0xff4d6d, "ammo rack");
  }
  this.spawnSeed += 1;
}
```

- [ ] **Step 5: Implement turret crossfire**

Add:

```ts
private castWarCoreTurretCrossfire(boss: FinalBossActor): void {
  if (!this.player) return;
  const skill = FINAL_BOSS_PHASE_FOUR_SKILL;
  const offsets = [
    { x: -520, y: -320 },
    { x: 520, y: -320 },
    { x: -520, y: 320 },
    { x: 520, y: 320 },
  ];
  for (let index = 0; index < 20; index += 1) {
    const sourceOffset = offsets[index % offsets.length];
    window.setTimeout(() => {
      if (!this.getFinalBosses().includes(boss) || !this.player) return;
      const source = {
        x: clamp(boss.x + sourceOffset.x, 24, this.getMapWidth() - 24),
        y: clamp(boss.y + sourceOffset.y, 24, this.getMapHeight() - 24),
      };
      const angle = Math.atan2(this.player.y - source.y, this.player.x - source.x);
      this.spawnBossHazard(source.x, source.y, angle, skill.turretProjectileSpeed, 0xffd166, 1500, 10, "bossProjectile", skill.turretDamage);
    }, index * 70);
  }
}
```

- [ ] **Step 6: Add passive armory pressure**

In `updateFinalBoss`, after `this.updateFinalBossCrawlers(deltaMs);`, add:

```ts
this.updateWarCoreArmoryPressure(deltaMs);
```

Add:

```ts
private updateWarCoreArmoryPressure(deltaMs: number): void {
  if (!this.warCoreArmoryActive || this.warCoreCollapseMs > 0 || !this.player) return;
  this.warCoreArmoryPressureMs += deltaMs;
  if (this.warCoreArmoryPressureMs < FINAL_BOSS_PHASE_FOUR_SKILL.pressureTickMs) return;
  this.warCoreArmoryPressureMs = 0;
  const side = this.spawnSeed % 2 === 0 ? -1 : 1;
  const x = clamp(this.player.x + side * 420, 24, this.getMapWidth() - 24);
  const y = clamp(this.player.y + ((this.spawnSeed % 3) - 1) * 140, 24, this.getMapHeight() - 24);
  this.spawnDelayedBossBlast(x, y, FINAL_BOSS_PHASE_FOUR_SKILL.barrageRadius, FINAL_BOSS_PHASE_FOUR_SKILL.barrageDamage, 420, 0xff9f1c, "armory pressure");
  this.spawnSeed += 1;
}
```

- [ ] **Step 7: Run build and focused tests**

Run:

```bash
npm test -- src/systems/endgame.test.ts
npm run build
```

Expected: both PASS.

- [ ] **Step 8: Commit**

```bash
git add src/game/PixiWastelandGame.ts
git commit -m "feat: add underground armory pressure attacks"
```

---

### Task 4: Add Core Collapse And Evacuation Win/Loss

**Files:**
- Modify: `src/game/PixiWastelandGame.ts`
- Modify: `src/app/gameStore.ts` only if an existing success/failure message needs a distinct armory buried result.

- [ ] **Step 1: Add extraction actor**

Add:

```ts
private startWarCoreCollapse(): void {
  if (this.warCoreCollapseMs > 0) return;
  this.warCoreCollapseMs = FINAL_BOSS_PHASE_FOUR_SKILL.collapseEscapeMs;
  this.warCoreCollapseTickMs = 0;
  this.spawnWarCoreExtraction();
  this.addScreenShake(900, 16);
  this.emitState("战争核心崩塌。地下军火库即将塌陷，立刻撤离。");
}

private spawnWarCoreExtraction(): void {
  if (this.warCoreExtraction && !this.warCoreExtraction.view.destroyed) {
    this.world.removeChild(this.warCoreExtraction.view);
    this.warCoreExtraction.view.destroy();
  }
  const x = this.getMapWidth() / 2;
  const y = this.getMapHeight() / 2 + FINAL_BOSS_PHASE_FOUR_SKILL.armoryHeight / 2 - 160;
  const view = new Graphics();
  view
    .circle(0, 0, FINAL_BOSS_PHASE_FOUR_SKILL.exitRadius)
    .fill({ color: 0xa7c957, alpha: 0.22 })
    .stroke({ color: 0xf8f4e3, alpha: 0.9, width: 5 })
    .rect(-42, -18, 84, 36)
    .fill({ color: 0xf8f4e3, alpha: 0.18 });
  view.position.set(x, y);
  this.world.addChild(view);
  this.warCoreExtraction = { view, x, y, radius: FINAL_BOSS_PHASE_FOUR_SKILL.exitRadius };
}
```

- [ ] **Step 2: Route final Boss death in P4 to collapse instead of immediate victory**

In `damageFinalBoss`, keep health from going below zero and call defeat as it currently does.

In `defeatFinalBoss`, add at the top:

```ts
if (boss.phase === 4 && this.warCoreArmoryActive && this.warCoreCollapseMs <= 0) {
  this.world.removeChild(boss.view);
  boss.view.destroy();
  boss.label.destroy();
  if (this.finalBoss === boss) {
    this.finalBoss = undefined;
  } else {
    this.extraFinalBosses = this.extraFinalBosses.filter((candidate) => candidate !== boss);
  }
  this.startWarCoreCollapse();
  return;
}
```

- [ ] **Step 3: Update collapse countdown**

In `updateFinalBoss`, add after armory pressure:

```ts
this.updateWarCoreCollapse(deltaMs);
```

Add:

```ts
private updateWarCoreCollapse(deltaMs: number): void {
  if (this.warCoreCollapseMs <= 0 || !this.player || !this.warCoreExtraction) return;
  this.warCoreCollapseMs = Math.max(0, this.warCoreCollapseMs - deltaMs);
  this.warCoreCollapseTickMs += deltaMs;

  const outcome = getWarCoreEvacuationOutcome({
    collapseMs: this.warCoreCollapseMs,
    distanceToExit: distance(this.player, this.warCoreExtraction),
    exitRadius: this.warCoreExtraction.radius,
  });

  if (outcome === "escaped") {
    this.finishWarCoreEvacuation();
    return;
  }

  if (this.warCoreCollapseTickMs >= FINAL_BOSS_PHASE_FOUR_SKILL.collapseTickMs) {
    this.warCoreCollapseTickMs = 0;
    this.applyPlayerDamage(FINAL_BOSS_PHASE_FOUR_SKILL.collapseDamage);
    this.addScreenShake(180, 6);
    this.emitState(`军火库塌陷：剩余 ${Math.ceil(this.warCoreCollapseMs / 1000)} 秒`);
  }

  if (outcome === "buried") {
    this.applyPlayerDamage(99999);
    this.emitState("核心已毁，但你被埋在军火库中。");
  }
}
```

- [ ] **Step 4: Finish evacuation**

Add:

```ts
private finishWarCoreEvacuation(): void {
  this.warCoreCollapseMs = 0;
  this.warCoreArmoryActive = false;
  if (this.warCoreExtraction && !this.warCoreExtraction.view.destroyed) {
    this.world.removeChild(this.warCoreExtraction.view);
    this.warCoreExtraction.view.destroy();
  }
  this.warCoreExtraction = undefined;
  if (this.warCoreArmoryOverlay && !this.warCoreArmoryOverlay.destroyed) {
    this.world.removeChild(this.warCoreArmoryOverlay);
    this.warCoreArmoryOverlay.destroy();
  }
  this.warCoreArmoryOverlay = undefined;
  this.state = {
    ...this.state,
    status: "success",
  };
  this.gameOver = true;
  this.emitState("你逃出了地下军火库。失控战争核心彻底毁灭。");
  this.callbacks.onComplete?.(this.state);
}
```

If `RunState.status` does not accept `"success"`, use the existing success transition already used by current `defeatFinalBoss`.

- [ ] **Step 5: Run full verification**

Run:

```bash
npm test
npm run build
npm run e2e
```

Expected:

- Vitest: all test files pass.
- Build: `tsc --noEmit && vite build` succeeds.
- E2E: existing 5 pass, 2 skipped pattern remains acceptable.

- [ ] **Step 6: Commit**

```bash
git add src/game/PixiWastelandGame.ts src/systems/endgame.ts src/systems/endgame.test.ts
git commit -m "feat: require evacuation after war core collapse"
```

---

## Self-Review

Spec coverage:

- P1 city control: covered by preserving and extending existing city facility attacks.
- P2 permission pressure: covered by existing shield, bombing, wanted, and building control mechanics.
- P3 core body: covered by existing phase 3 movement plus new phase 4 split.
- P4 underground armory: Task 2 creates armory transition and visuals; Task 3 adds pressure attacks.
- Collapse evacuation: Task 4 adds post-kill countdown, exit, success, and buried failure.
- Boss Rush compatibility: Task 4 full e2e includes Boss Rush spawn coverage; implementation keeps existing final Boss spawn path.

Placeholder scan:

- The plan contains no TBD/TODO placeholders.
- Each code-changing task includes concrete code blocks and commands.

Type consistency:

- `FinalBossPhase` is introduced in Task 1 and used in Task 2.
- `FINAL_BOSS_PHASE_FOUR_SKILL` is introduced in Task 1 and used in Tasks 2-4.
- `getWarCoreEvacuationOutcome` is introduced in Task 1 and used in Task 4.
