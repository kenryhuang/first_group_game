# Magician Stage Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the Boss Rush magician into a true/false stage boss with hat immunity, stage hazards, illusion tells, and curtain-call damage windows.

**Architecture:** Keep the magician rule data in `src/systems/magician.ts`, update the shared boss skill table in `src/systems/bossSkills.ts`, and wire the visual/runtime behavior through the existing Pixi boss-skill dispatch in `src/game/PixiWastelandGame.ts`. Existing poker-card stage logic will be replaced by stage curtains, spotlights, hat maze, mirror hall, and finale theater.

**Tech Stack:** TypeScript, PixiJS Graphics, Vitest, Vite.

---

### Task 1: Replace Magician Rule Tests

**Files:**
- Modify: `src/systems/magician.test.ts`
- Modify: `src/systems/magician.ts`

- [ ] **Step 1: Write the failing tests**

Replace `src/systems/magician.test.ts` with tests for the new rule helpers:

```ts
import { describe, expect, it } from "vitest";
import {
  MAGICIAN_FINALE_CURTAIN_CALL_MS,
  MAGICIAN_FINALE_REVEALED_CURTAIN_CALL_MS,
  MAGICIAN_REVEALED_CURTAIN_CALL_MS,
  MAGICIAN_STANDARD_CURTAIN_CALL_MS,
  createMagicianCurtains,
  createMagicianHatMaze,
  createMagicianMirrorHall,
  createMagicianSpotlights,
  getMagicianCurtainCallMs,
} from "./magician";

describe("magician stage rules", () => {
  it("creates true and false curtains with stable visual tells", () => {
    const curtains = createMagicianCurtains(3);

    expect(curtains).toHaveLength(5);
    expect(curtains.some((curtain) => curtain.kind === "solid")).toBe(true);
    expect(curtains.some((curtain) => curtain.kind === "illusion")).toBe(true);
    expect(curtains.filter((curtain) => curtain.kind === "solid").every((curtain) => curtain.tell === "gold-edge")).toBe(true);
    expect(curtains.filter((curtain) => curtain.kind === "illusion").every((curtain) => curtain.tell === "soft-edge")).toBe(true);
  });

  it("creates one true spotlight among false spotlights", () => {
    const spotlights = createMagicianSpotlights(5);

    expect(spotlights).toHaveLength(5);
    expect(spotlights.filter((spotlight) => spotlight.safe).length).toBe(1);
    expect(spotlights.find((spotlight) => spotlight.safe)?.tell).toBe("warm-steady");
    expect(spotlights.filter((spotlight) => !spotlight.safe).every((spotlight) => spotlight.tell === "purple-flicker")).toBe(true);
  });

  it("creates a hat maze with exactly one real hat", () => {
    const hats = createMagicianHatMaze(8);

    expect(hats).toHaveLength(5);
    expect(hats.filter((hat) => hat.real).length).toBe(1);
    expect(hats.find((hat) => hat.real)?.reward).toBe("extended-curtain-call");
    expect(hats.filter((hat) => !hat.real).every((hat) => hat.punishment === "minor-blast")).toBe(true);
  });

  it("creates mirror hall clones with exactly one true body", () => {
    const bodies = createMagicianMirrorHall(11);

    expect(bodies).toHaveLength(5);
    expect(bodies.filter((body) => body.real).length).toBe(1);
    expect(bodies.find((body) => body.real)?.tell).toBe("shadow-ring");
    expect(bodies.filter((body) => !body.real).every((body) => body.breaksInto === "mirror-shards")).toBe(true);
  });

  it("defines curtain call windows for normal, revealed, finale, and broken finale states", () => {
    expect(MAGICIAN_STANDARD_CURTAIN_CALL_MS).toBe(2500);
    expect(MAGICIAN_REVEALED_CURTAIN_CALL_MS).toBe(4500);
    expect(MAGICIAN_FINALE_CURTAIN_CALL_MS).toBe(6000);
    expect(MAGICIAN_FINALE_REVEALED_CURTAIN_CALL_MS).toBe(8000);
    expect(getMagicianCurtainCallMs("standard")).toBe(2500);
    expect(getMagicianCurtainCallMs("revealed")).toBe(4500);
    expect(getMagicianCurtainCallMs("finale")).toBe(6000);
    expect(getMagicianCurtainCallMs("finale-revealed")).toBe(8000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/systems/magician.test.ts`

Expected: FAIL because the new functions and constants are not exported yet.

- [ ] **Step 3: Implement rule helpers**

Replace the poker-card exports in `src/systems/magician.ts` with:

```ts
export type MagicianCurtainKind = "solid" | "illusion";
export type MagicianCurtainTell = "gold-edge" | "soft-edge";
export type MagicianSpotlightTell = "warm-steady" | "purple-flicker";
export type MagicianCurtainCallKind = "standard" | "revealed" | "finale" | "finale-revealed";

export interface MagicianCurtainRule {
  lane: number;
  kind: MagicianCurtainKind;
  tell: MagicianCurtainTell;
}

export interface MagicianSpotlightRule {
  index: number;
  safe: boolean;
  tell: MagicianSpotlightTell;
}

export interface MagicianHatRule {
  index: number;
  real: boolean;
  reward?: "extended-curtain-call";
  punishment?: "minor-blast";
}

export interface MagicianMirrorBodyRule {
  index: number;
  real: boolean;
  tell: "shadow-ring" | "flat-light";
  breaksInto?: "mirror-shards";
}

export const MAGICIAN_STANDARD_CURTAIN_CALL_MS = 2500;
export const MAGICIAN_REVEALED_CURTAIN_CALL_MS = 4500;
export const MAGICIAN_FINALE_CURTAIN_CALL_MS = 6000;
export const MAGICIAN_FINALE_REVEALED_CURTAIN_CALL_MS = 8000;

export function createMagicianCurtains(seed = 0): MagicianCurtainRule[] {
  return Array.from({ length: 5 }, (_, lane) => {
    const solid = (lane + seed) % 2 === 0 || lane === 2;
    return { lane, kind: solid ? "solid" : "illusion", tell: solid ? "gold-edge" : "soft-edge" };
  });
}

export function createMagicianSpotlights(seed = 0): MagicianSpotlightRule[] {
  const safeIndex = Math.abs(seed) % 5;
  return Array.from({ length: 5 }, (_, index) => ({
    index,
    safe: index === safeIndex,
    tell: index === safeIndex ? "warm-steady" : "purple-flicker",
  }));
}

export function createMagicianHatMaze(seed = 0): MagicianHatRule[] {
  const realIndex = Math.abs(seed * 3 + 1) % 5;
  return Array.from({ length: 5 }, (_, index) =>
    index === realIndex
      ? { index, real: true, reward: "extended-curtain-call" }
      : { index, real: false, punishment: "minor-blast" },
  );
}

export function createMagicianMirrorHall(seed = 0): MagicianMirrorBodyRule[] {
  const realIndex = Math.abs(seed * 5 + 2) % 5;
  return Array.from({ length: 5 }, (_, index) =>
    index === realIndex
      ? { index, real: true, tell: "shadow-ring" }
      : { index, real: false, tell: "flat-light", breaksInto: "mirror-shards" },
  );
}

export function getMagicianCurtainCallMs(kind: MagicianCurtainCallKind): number {
  if (kind === "revealed") return MAGICIAN_REVEALED_CURTAIN_CALL_MS;
  if (kind === "finale") return MAGICIAN_FINALE_CURTAIN_CALL_MS;
  if (kind === "finale-revealed") return MAGICIAN_FINALE_REVEALED_CURTAIN_CALL_MS;
  return MAGICIAN_STANDARD_CURTAIN_CALL_MS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/systems/magician.test.ts`

Expected: PASS.

### Task 2: Replace Magician Skill Table

**Files:**
- Modify: `src/systems/bossSkills.test.ts`
- Modify: `src/systems/bossSkills.ts`

- [ ] **Step 1: Write the failing tests**

Update the magician assertions in `src/systems/bossSkills.test.ts`:

```ts
expect(getAdvancedBossSkills("magician").map((skill) => skill.id)).toEqual([
  "curtain-shift",
  "spotlight-judgement",
  "hat-maze",
  "mirror-hall",
  "finale-theater",
]);
```

Update the detailed skill assertion:

```ts
const finaleTheater = getAdvancedBossSkills("magician").find((skill) => skill.id === "finale-theater");
expect(finaleTheater).toMatchObject({ warningMs: 900, damage: 18, radius: 9999 });
```

Update the deterministic cycle assertions:

```ts
expect(getNextAdvancedBossSkill("magician", 0).id).toBe("curtain-shift");
expect(getNextAdvancedBossSkill("magician", 1).id).toBe("spotlight-judgement");
expect(getNextAdvancedBossSkill("magician", 2).id).toBe("hat-maze");
expect(getNextAdvancedBossSkill("magician", 3).id).toBe("mirror-hall");
expect(getNextAdvancedBossSkill("magician", 4).id).toBe("finale-theater");
expect(getNextAdvancedBossSkill("magician", 5).id).toBe("curtain-shift");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/systems/bossSkills.test.ts`

Expected: FAIL because the old magician skill ids are still exported.

- [ ] **Step 3: Update skill ids and table**

In `src/systems/bossSkills.ts`, replace magician ids in `AdvancedBossSkillId` with:

```ts
  | "curtain-shift"
  | "spotlight-judgement"
  | "hat-maze"
  | "mirror-hall"
  | "finale-theater"
```

Replace magician skill rows with:

```ts
  { id: "curtain-shift", bossId: "magician", name: "幕布换场", role: "area", warningMs: 700, damage: 16, radius: 240 },
  { id: "spotlight-judgement", bossId: "magician", name: "聚光灯审判", role: "area", warningMs: 850, damage: 22, radius: 210 },
  { id: "hat-maze", bossId: "magician", name: "礼帽迷宫", role: "lock", warningMs: 760, damage: 15, radius: 120 },
  { id: "mirror-hall", bossId: "magician", name: "镜厅分身", role: "summon", warningMs: 680, damage: 10, radius: 170 },
  { id: "finale-theater", bossId: "magician", name: "终幕剧场", role: "summon", warningMs: 900, damage: 18, radius: 9999 },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/systems/bossSkills.test.ts`

Expected: PASS.

### Task 3: Wire Runtime Stage Skills

**Files:**
- Modify: `src/game/PixiWastelandGame.ts`

- [ ] **Step 1: Add runtime actors and imports**

Update imports from `src/systems/magician.ts` to use the new helpers. Add focused actor interfaces for stage props:

```ts
interface MagicianStagePropActor extends Actor {
  kind: "curtain" | "spotlight" | "hat" | "mirror";
  real?: boolean;
  solid?: boolean;
  damage?: number;
  expiresAtMs?: number;
}
```

Add class properties:

```ts
private magicianStageProps: MagicianStagePropActor[] = [];
private magicianCurtainCallUntilMs = 0;
private magicianFinaleInProgress = false;
```

- [ ] **Step 2: Replace poker-card update and hit logic**

Remove active poker-card behavior from update and bullet collision. Add stage prop collision handling:

```ts
private hitMagicianStagePropWithBullet(bullet: BulletActor): boolean {
  for (const prop of [...this.magicianStageProps]) {
    if (prop.kind !== "hat" && prop.kind !== "mirror") continue;
    if (!projectileHitsCircle(bullet.projectile, { x: prop.x, y: prop.y, radius: 28 })) continue;
    if (prop.real) {
      this.removeMagicianStageProps();
      this.startMagicianCurtainCall(prop.x, prop.y, "revealed");
    } else {
      this.spawnDelayedBossBlast(prop.x, prop.y, 82, prop.damage ?? 12, 80, 0x9d4edd, "假象碎裂");
    }
    return true;
  }
  return false;
}
```

- [ ] **Step 3: Implement stage skill spawners**

Add methods:

```ts
private castMagicianCurtainShift(boss: BossActor, skill: AdvancedBossSkill): void;
private castMagicianSpotlightJudgement(boss: BossActor, skill: AdvancedBossSkill): void;
private castMagicianHatMaze(boss: BossActor, skill: AdvancedBossSkill): void;
private castMagicianMirrorHall(boss: BossActor, skill: AdvancedBossSkill): void;
private castMagicianFinaleTheater(boss: BossActor, skill: AdvancedBossSkill): void;
private startMagicianCurtainCall(x: number, y: number, kind: MagicianCurtainCallKind): void;
private removeMagicianStageProps(): void;
```

Use existing `Graphics`, `spawnDelayedBossBlast`, `drawPhaseRing`, `drawMagicianHat`, `drawBossSprite`, `spawnBossHazard`, and `window.setTimeout` patterns.

- [ ] **Step 4: Update dispatch**

Replace old magician dispatch with:

```ts
if (skill.id === "curtain-shift") {
  this.castMagicianCurtainShift(boss, skill);
} else if (skill.id === "spotlight-judgement") {
  this.castMagicianSpotlightJudgement(boss, skill);
} else if (skill.id === "hat-maze") {
  this.castMagicianHatMaze(boss, skill);
} else if (skill.id === "mirror-hall") {
  this.castMagicianMirrorHall(boss, skill);
} else if (skill.id === "finale-theater") {
  this.castMagicianFinaleTheater(boss, skill);
}
```

- [ ] **Step 5: Run TypeScript build**

Run: `npm run build`

Expected: PASS with no missing imports or stale poker-card references.

### Task 4: Verify and Open Game

**Files:**
- No planned file edits.

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/systems/magician.test.ts src/systems/bossSkills.test.ts`

Expected: PASS.

- [ ] **Step 2: Run full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Run e2e**

Run: `npm run e2e`

Expected: PASS or existing documented skips only.

- [ ] **Step 5: Open the game**

Run:

```powershell
$portOpen = Test-NetConnection -ComputerName 127.0.0.1 -Port 5317 -InformationLevel Quiet
if (-not $portOpen) {
  Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory 'd:\cursor_projects\first_group_game' -WindowStyle Hidden
  Start-Sleep -Seconds 4
}
Start-Process 'http://127.0.0.1:5317'
```

Expected: Browser opens the local game.

## Self-Review

- Spec coverage: hat immunity, stage hazards, false tells, reveal rewards, finale sequence, and tests are covered.
- Placeholder scan: no TBD/TODO/fill-later items.
- Type consistency: new skill ids are used consistently across tests, skill table, and Pixi dispatch.
