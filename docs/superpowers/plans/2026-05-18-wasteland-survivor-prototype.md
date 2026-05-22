# Wasteland Survivor Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 30-level first playable prototype for the wasteland survivor roguelite: one compact map, three Bosses, active/manual combat, profession fragments, pollution pressure, and a level-30 stage result.

**Architecture:** Use a small TypeScript domain layer for deterministic rules and tests, then bind those rules to a Phaser scene for the playable prototype. Keep game data in plain modules so Bosses, skills, fragments, event chains, and numbers can be tuned without rewriting scene code.

**Tech Stack:** Node.js, Vite, TypeScript, Phaser 3, Vitest, Playwright.

---

## Scope Boundary

This plan implements the first prototype described in the spec:

- 1 open small map.
- 3 regular Bosses: Chef, Clown, Courier.
- 2-3 elite enemies per Boss.
- Auto/manual basic attack toggle.
- 4 active skill slots.
- Passive pollution load.
- Simplified resource and event chains.
- Level 30 stage result that stands in for the full level-100 endgame.

This plan does not implement the full 9-Boss campaign, the final Boss, out-of-run progression, complex story branches, or pollution cleansing.

## File Structure

- `package.json`: scripts, dependencies, and test commands.
- `index.html`: Vite entry HTML.
- `tsconfig.json`: strict TypeScript settings.
- `vite.config.ts`: Vite dev and test configuration.
- `src/main.ts`: Phaser boot entry.
- `src/game/PrototypeScene.ts`: playable scene, input, rendering, and scene-to-domain wiring.
- `src/game/sceneConfig.ts`: Phaser config constants.
- `src/domain/types.ts`: shared domain types.
- `src/data/prototypeData.ts`: prototype Boss, elite, skill, fragment, map, and numeric data.
- `src/systems/progression.ts`: level, experience, stat growth, and level milestone rules.
- `src/systems/pollution.ts`: pollution totals, bands, benefits, and risks.
- `src/systems/loadout.ts`: active skill slots and passive fragment equip rules.
- `src/systems/exploration.ts`: map nodes, resource points, event chains, and discovery state.
- `src/systems/combat.ts`: deterministic combat primitives, attacks, skills, enemy damage, and loot.
- `src/systems/bossPressure.ts`: Boss descent, early-kill skip rules, and active pressure queue.
- `src/systems/runState.ts`: run initialization and reducers that compose the systems.
- `src/ui/hud.ts`: small DOM-free HUD model helpers used by the scene.
- `src/**/*.test.ts`: Vitest unit tests beside implementation files.
- `tests/e2e/prototype.spec.ts`: Playwright smoke test for the running game.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/main.ts`
- Create: `src/game/sceneConfig.ts`
- Create: `src/game/PrototypeScene.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "first-group-game",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  },
  "dependencies": {
    "phaser": "^3.85.2"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.2",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.0",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>末日废土幸存者原型</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create the first Phaser config**

Put this in `src/game/sceneConfig.ts`:

```ts
import Phaser from "phaser";
import { PrototypeScene } from "./PrototypeScene";

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#171a16",
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scene: [PrototypeScene],
  };
}
```

- [ ] **Step 6: Create a minimal playable scene**

Put this in `src/game/PrototypeScene.ts`:

```ts
import Phaser from "phaser";

export class PrototypeScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Arc;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;

  constructor() {
    super("prototype");
  }

  create(): void {
    this.add.text(24, 20, "末日废土幸存者原型", {
      color: "#f2ead3",
      fontFamily: "Arial",
      fontSize: "24px",
    });
    this.player = this.add.circle(640, 360, 14, 0x95d5b2);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;
  }

  update(_time: number, delta: number): void {
    if (!this.player) return;

    const speed = 220;
    const seconds = delta / 1000;
    const dx =
      (this.cursors?.right.isDown || this.wasd?.D.isDown ? 1 : 0) -
      (this.cursors?.left.isDown || this.wasd?.A.isDown ? 1 : 0);
    const dy =
      (this.cursors?.down.isDown || this.wasd?.S.isDown ? 1 : 0) -
      (this.cursors?.up.isDown || this.wasd?.W.isDown ? 1 : 0);
    const length = Math.hypot(dx, dy) || 1;

    this.player.x += (dx / length) * speed * seconds;
    this.player.y += (dy / length) * speed * seconds;
    this.player.x = Phaser.Math.Clamp(this.player.x, 16, 1264);
    this.player.y = Phaser.Math.Clamp(this.player.y, 56, 704);
  }
}
```

- [ ] **Step 7: Create the boot entry**

Put this in `src/main.ts`:

```ts
import Phaser from "phaser";
import { createGameConfig } from "./game/sceneConfig";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app container");
}

new Phaser.Game(createGameConfig("app"));
```

- [ ] **Step 8: Install dependencies**

Run: `npm install`

Expected: command exits 0 and creates `package-lock.json`.

- [ ] **Step 9: Run the build**

Run: `npm run build`

Expected: TypeScript and Vite build exit 0 and create `dist/`.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json index.html tsconfig.json vite.config.ts src/main.ts src/game/sceneConfig.ts src/game/PrototypeScene.ts
git commit -m "chore: scaffold Phaser prototype"
```

---

### Task 2: Prototype Data Model

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/data/prototypeData.ts`
- Create: `src/data/prototypeData.test.ts`

- [ ] **Step 1: Write the failing data tests**

Put this in `src/data/prototypeData.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  BOSS_ORDER,
  PLAYER_BASELINE,
  PROTOTYPE_LIMITS,
  SKILLS,
} from "./prototypeData";

describe("prototype data", () => {
  it("defines the 30-level prototype Boss order from the spec", () => {
    expect(BOSS_ORDER.map((boss) => boss.id)).toEqual([
      "chef",
      "clown",
      "courier",
    ]);
    expect(BOSS_ORDER.map((boss) => boss.descentLevel)).toEqual([10, 20, 30]);
    expect(BOSS_ORDER.map((boss) => boss.specialItem.name)).toEqual([
      "血肉菜谱",
      "裂笑面具",
      "染血运单",
    ]);
  });

  it("keeps player baseline and active slot limits aligned with the spec", () => {
    expect(PLAYER_BASELINE).toMatchObject({
      maxHealth: 100,
      moveSpeed: 5,
      basicDamage: 10,
      basicAttackIntervalMs: 600,
      pickupRadius: 2.5,
      safePollutionLoad: 100,
    });
    expect(PROTOTYPE_LIMITS.activeSkillSlots).toBe(4);
    expect(PROTOTYPE_LIMITS.levelCap).toBe(30);
  });

  it("includes at least one explosive skill for the courier chain", () => {
    expect(SKILLS.some((skill) => skill.tags.includes("explosive"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/data/prototypeData.test.ts`

Expected: FAIL because `src/data/prototypeData.ts` does not exist.

- [ ] **Step 3: Add shared domain types**

Put this in `src/domain/types.ts`:

```ts
export type BossId = "chef" | "clown" | "courier";
export type SkillTag =
  | "melee"
  | "fire"
  | "oil"
  | "projectile"
  | "fear"
  | "dash"
  | "throw"
  | "explosive";

export interface PlayerBaseline {
  maxHealth: number;
  moveSpeed: number;
  basicDamage: number;
  basicAttackIntervalMs: number;
  pickupRadius: number;
  startingPollution: number;
  safePollutionLoad: number;
}

export interface PrototypeLimits {
  levelCap: number;
  activeSkillSlots: number;
}

export interface SkillDefinition {
  id: string;
  name: string;
  cooldownMs: number;
  damage: number;
  temporaryPollution: number;
  tags: SkillTag[];
}

export interface PassiveFragment {
  id: string;
  name: string;
  pollutionLoad: number;
  description: string;
  tags: SkillTag[];
}

export interface EliteDefinition {
  id: string;
  name: string;
  bossId: BossId;
  healthMultiplier: number;
  damageMultiplier: number;
}

export interface BossDefinition {
  id: BossId;
  name: string;
  descentLevel: number;
  maxHealth: number;
  role: string;
  specialItem: {
    id: string;
    name: string;
    stagePollution: number;
  };
  eliteIds: string[];
  rewardTags: SkillTag[];
}
```

- [ ] **Step 4: Add prototype data**

Put this in `src/data/prototypeData.ts`:

```ts
import type {
  BossDefinition,
  EliteDefinition,
  PassiveFragment,
  PlayerBaseline,
  PrototypeLimits,
  SkillDefinition,
} from "../domain/types";

export const PROTOTYPE_LIMITS: PrototypeLimits = {
  levelCap: 30,
  activeSkillSlots: 4,
};

export const PLAYER_BASELINE: PlayerBaseline = {
  maxHealth: 100,
  moveSpeed: 5,
  basicDamage: 10,
  basicAttackIntervalMs: 600,
  pickupRadius: 2.5,
  startingPollution: 0,
  safePollutionLoad: 100,
};

export const SKILLS: SkillDefinition[] = [
  {
    id: "cleaver-dash",
    name: "菜刀冲刺",
    cooldownMs: 4200,
    damage: 42,
    temporaryPollution: 3,
    tags: ["melee", "dash"],
  },
  {
    id: "oil-flame",
    name: "油污火焰",
    cooldownMs: 6200,
    damage: 55,
    temporaryPollution: 6,
    tags: ["fire", "oil"],
  },
  {
    id: "balloon-barrage",
    name: "气球弹幕",
    cooldownMs: 3600,
    damage: 34,
    temporaryPollution: 4,
    tags: ["projectile", "fear"],
  },
  {
    id: "explosive-parcel",
    name: "爆炸包裹",
    cooldownMs: 5200,
    damage: 64,
    temporaryPollution: 7,
    tags: ["throw", "explosive"],
  },
];

export const PASSIVE_FRAGMENTS: PassiveFragment[] = [
  {
    id: "greasy-edge",
    name: "油污刀锋",
    pollutionLoad: 15,
    description: "近战和火焰技能伤害提高。",
    tags: ["melee", "fire", "oil"],
  },
  {
    id: "delayed-laugh",
    name: "延迟笑声",
    pollutionLoad: 20,
    description: "投射物命中后追加一次小爆炸。",
    tags: ["projectile", "fear", "explosive"],
  },
  {
    id: "express-route",
    name: "急件路线",
    pollutionLoad: 25,
    description: "冲刺和投掷技能冷却缩短。",
    tags: ["dash", "throw"],
  },
];

export const ELITES: EliteDefinition[] = [
  { id: "butcher-apprentice", name: "剁肉学徒", bossId: "chef", healthMultiplier: 6, damageMultiplier: 1.6 },
  { id: "oil-carrier", name: "油锅搬运工", bossId: "chef", healthMultiplier: 5, damageMultiplier: 1.5 },
  { id: "balloon-gunner", name: "气球枪手", bossId: "clown", healthMultiplier: 5, damageMultiplier: 1.8 },
  { id: "bomb-doll", name: "炸弹玩偶", bossId: "clown", healthMultiplier: 6, damageMultiplier: 1.7 },
  { id: "parcel-rider", name: "爆包骑手", bossId: "courier", healthMultiplier: 6, damageMultiplier: 1.8 },
  { id: "route-blocker", name: "路线封锁员", bossId: "courier", healthMultiplier: 7, damageMultiplier: 1.5 },
];

export const BOSS_ORDER: BossDefinition[] = [
  {
    id: "chef",
    name: "变异厨师",
    descentLevel: 10,
    maxHealth: 3500,
    role: "高血量、低移速的硬压迫 Boss",
    specialItem: { id: "flesh-recipe", name: "血肉菜谱", stagePollution: 15 },
    eliteIds: ["butcher-apprentice", "oil-carrier"],
    rewardTags: ["melee", "fire", "oil"],
  },
  {
    id: "clown",
    name: "变异小丑",
    descentLevel: 20,
    maxHealth: 5500,
    role: "低血量、高远程压力 Boss",
    specialItem: { id: "cracked-smile-mask", name: "裂笑面具", stagePollution: 15 },
    eliteIds: ["balloon-gunner", "bomb-doll"],
    rewardTags: ["projectile", "fear", "explosive"],
  },
  {
    id: "courier",
    name: "变异快递员",
    descentLevel: 30,
    maxHealth: 8500,
    role: "高速冲撞与爆炸包裹 Boss",
    specialItem: { id: "bloodstained-waybill", name: "染血运单", stagePollution: 15 },
    eliteIds: ["parcel-rider", "route-blocker"],
    rewardTags: ["dash", "throw", "explosive"],
  },
];
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/data/prototypeData.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/data/prototypeData.ts src/data/prototypeData.test.ts
git commit -m "feat: add prototype game data"
```

---

### Task 3: Progression Rules

**Files:**
- Create: `src/systems/progression.ts`
- Create: `src/systems/progression.test.ts`
- Modify: `src/domain/types.ts`

- [ ] **Step 1: Write the failing progression tests**

Put this in `src/systems/progression.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { gainExperience, getExperienceForNextLevel, getMilestoneBossId } from "./progression";

describe("progression", () => {
  it("uses increasing experience thresholds through level 30", () => {
    expect(getExperienceForNextLevel(1)).toBe(30);
    expect(getExperienceForNextLevel(10)).toBe(120);
    expect(getExperienceForNextLevel(11)).toBe(140);
    expect(getExperienceForNextLevel(30)).toBe(420);
  });

  it("levels up repeatedly when enough experience is gained", () => {
    const result = gainExperience({ level: 1, experience: 0 }, 200);
    expect(result.level).toBe(4);
    expect(result.experience).toBe(20);
    expect(result.levelsGained).toEqual([2, 3, 4]);
  });

  it("maps prototype milestone levels to Boss ids", () => {
    expect(getMilestoneBossId(10)).toBe("chef");
    expect(getMilestoneBossId(20)).toBe("clown");
    expect(getMilestoneBossId(30)).toBe("courier");
    expect(getMilestoneBossId(21)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/systems/progression.test.ts`

Expected: FAIL because `src/systems/progression.ts` does not exist.

- [ ] **Step 3: Add progression types**

Append this to `src/domain/types.ts`:

```ts
export interface ProgressState {
  level: number;
  experience: number;
}

export interface ExperienceGainResult extends ProgressState {
  levelsGained: number[];
}
```

- [ ] **Step 4: Implement progression**

Put this in `src/systems/progression.ts`:

```ts
import { BOSS_ORDER, PROTOTYPE_LIMITS } from "../data/prototypeData";
import type { BossId, ExperienceGainResult, ProgressState } from "../domain/types";

export function getExperienceForNextLevel(level: number): number {
  if (level <= 10) return 20 + level * 10;
  return 20 + level * 20 - 100;
}

export function gainExperience(state: ProgressState, amount: number): ExperienceGainResult {
  let level = state.level;
  let experience = state.experience + amount;
  const levelsGained: number[] = [];

  while (level < PROTOTYPE_LIMITS.levelCap) {
    const threshold = getExperienceForNextLevel(level);
    if (experience < threshold) break;
    experience -= threshold;
    level += 1;
    levelsGained.push(level);
  }

  if (level >= PROTOTYPE_LIMITS.levelCap) {
    experience = 0;
  }

  return { level, experience, levelsGained };
}

export function getMilestoneBossId(level: number): BossId | null {
  return BOSS_ORDER.find((boss) => boss.descentLevel === level)?.id ?? null;
}
```

- [ ] **Step 5: Run the progression tests**

Run: `npm test -- src/systems/progression.test.ts`

Expected: PASS.

- [ ] **Step 6: Run all unit tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/types.ts src/systems/progression.ts src/systems/progression.test.ts
git commit -m "feat: add prototype progression rules"
```

---

### Task 4: Pollution and Loadout Systems

**Files:**
- Create: `src/systems/pollution.ts`
- Create: `src/systems/pollution.test.ts`
- Create: `src/systems/loadout.ts`
- Create: `src/systems/loadout.test.ts`
- Modify: `src/domain/types.ts`

- [ ] **Step 1: Write failing pollution tests**

Put this in `src/systems/pollution.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getPollutionBand, getPollutionTotals, tickTemporaryPollution } from "./pollution";

describe("pollution", () => {
  it("combines passive, temporary, and stage pollution", () => {
    expect(
      getPollutionTotals({
        passiveLoad: 45,
        temporaryPollution: 12,
        stagePollution: 30,
      }),
    ).toEqual({
      total: 87,
      passiveLoad: 45,
      temporaryPollution: 12,
      stagePollution: 30,
      overSafeLoad: false,
    });
  });

  it("maps pollution to benefit and risk bands", () => {
    expect(getPollutionBand(40).damageMultiplier).toBe(1);
    expect(getPollutionBand(120)).toMatchObject({
      label: "unstable",
      damageMultiplier: 1.2,
      cooldownMultiplier: 0.9,
      hordeDensityMultiplier: 1.15,
    });
    expect(getPollutionBand(220).fakeResourcePoints).toBe(true);
  });

  it("decays temporary pollution without going below zero", () => {
    expect(tickTemporaryPollution(9, 3000)).toBe(6);
    expect(tickTemporaryPollution(2, 5000)).toBe(0);
  });
});
```

- [ ] **Step 2: Write failing loadout tests**

Put this in `src/systems/loadout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PASSIVE_FRAGMENTS, SKILLS } from "../data/prototypeData";
import { equipActiveSkill, equipPassiveFragment } from "./loadout";

describe("loadout", () => {
  it("limits active skills to four slots", () => {
    let activeSkillIds: string[] = [];
    for (const skill of SKILLS) {
      activeSkillIds = equipActiveSkill(activeSkillIds, skill.id).activeSkillIds;
    }
    const overflow = equipActiveSkill(activeSkillIds, "fifth-skill");
    expect(overflow.activeSkillIds).toHaveLength(4);
    expect(overflow.accepted).toBe(false);
  });

  it("allows passive fragments to exceed the safe pollution load but reports the load", () => {
    const result = PASSIVE_FRAGMENTS.reduce(
      (state, fragment) => equipPassiveFragment(state.passiveFragmentIds, fragment.id),
      { passiveFragmentIds: [] as string[], passiveLoad: 0 },
    );
    expect(result.passiveFragmentIds).toEqual(["greasy-edge", "delayed-laugh", "express-route"]);
    expect(result.passiveLoad).toBe(60);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/systems/pollution.test.ts src/systems/loadout.test.ts`

Expected: FAIL because both implementation files do not exist.

- [ ] **Step 4: Add pollution and loadout types**

Append this to `src/domain/types.ts`:

```ts
export interface PollutionState {
  passiveLoad: number;
  temporaryPollution: number;
  stagePollution: number;
}

export interface PollutionTotals extends PollutionState {
  total: number;
  overSafeLoad: boolean;
}

export interface PollutionBand {
  label: "calm" | "charged" | "unstable" | "dangerous" | "overrun";
  damageMultiplier: number;
  cooldownMultiplier: number;
  monsterSenseMultiplier: number;
  hordeDensityMultiplier: number;
  eventDanger: boolean;
  fakeResourcePoints: boolean;
  bossEmpowered: boolean;
}
```

- [ ] **Step 5: Implement pollution**

Put this in `src/systems/pollution.ts`:

```ts
import { PLAYER_BASELINE } from "../data/prototypeData";
import type { PollutionBand, PollutionState, PollutionTotals } from "../domain/types";

export function getPollutionTotals(state: PollutionState): PollutionTotals {
  const total = state.passiveLoad + state.temporaryPollution + state.stagePollution;
  return {
    ...state,
    total,
    overSafeLoad: state.passiveLoad > PLAYER_BASELINE.safePollutionLoad,
  };
}

export function getPollutionBand(total: number): PollutionBand {
  if (total <= 50) {
    return band("calm", 1, 1, 1, 1, false, false, false);
  }
  if (total <= 100) {
    return band("charged", 1.1, 1, 1.1, 1, false, false, false);
  }
  if (total <= 150) {
    return band("unstable", 1.2, 0.9, 1.1, 1.15, false, false, false);
  }
  if (total <= 200) {
    return band("dangerous", 1.35, 0.82, 1.3, 1.25, true, false, true);
  }
  return band("overrun", 1.5, 0.75, 1.45, 1.4, true, true, true);
}

export function tickTemporaryPollution(current: number, elapsedMs: number): number {
  const decay = elapsedMs / 1000;
  return Math.max(0, Math.round((current - decay) * 100) / 100);
}

function band(
  label: PollutionBand["label"],
  damageMultiplier: number,
  cooldownMultiplier: number,
  monsterSenseMultiplier: number,
  hordeDensityMultiplier: number,
  eventDanger: boolean,
  fakeResourcePoints: boolean,
  bossEmpowered: boolean,
): PollutionBand {
  return {
    label,
    damageMultiplier,
    cooldownMultiplier,
    monsterSenseMultiplier,
    hordeDensityMultiplier,
    eventDanger,
    fakeResourcePoints,
    bossEmpowered,
  };
}
```

- [ ] **Step 6: Implement loadout**

Put this in `src/systems/loadout.ts`:

```ts
import { PASSIVE_FRAGMENTS, PROTOTYPE_LIMITS } from "../data/prototypeData";

export function equipActiveSkill(activeSkillIds: string[], skillId: string): {
  activeSkillIds: string[];
  accepted: boolean;
} {
  if (activeSkillIds.includes(skillId)) {
    return { activeSkillIds, accepted: false };
  }
  if (activeSkillIds.length >= PROTOTYPE_LIMITS.activeSkillSlots) {
    return { activeSkillIds, accepted: false };
  }
  return { activeSkillIds: [...activeSkillIds, skillId], accepted: true };
}

export function equipPassiveFragment(passiveFragmentIds: string[], fragmentId: string): {
  passiveFragmentIds: string[];
  passiveLoad: number;
  accepted: boolean;
} {
  if (passiveFragmentIds.includes(fragmentId)) {
    return {
      passiveFragmentIds,
      passiveLoad: getPassiveLoad(passiveFragmentIds),
      accepted: false,
    };
  }
  const next = [...passiveFragmentIds, fragmentId];
  return {
    passiveFragmentIds: next,
    passiveLoad: getPassiveLoad(next),
    accepted: true,
  };
}

export function getPassiveLoad(passiveFragmentIds: string[]): number {
  return passiveFragmentIds.reduce((sum, id) => {
    const fragment = PASSIVE_FRAGMENTS.find((item) => item.id === id);
    return sum + (fragment?.pollutionLoad ?? 0);
  }, 0);
}
```

- [ ] **Step 7: Run system tests**

Run: `npm test -- src/systems/pollution.test.ts src/systems/loadout.test.ts`

Expected: PASS.

- [ ] **Step 8: Run all tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/domain/types.ts src/systems/pollution.ts src/systems/pollution.test.ts src/systems/loadout.ts src/systems/loadout.test.ts
git commit -m "feat: add pollution and loadout systems"
```

---

### Task 5: Exploration Map and Event Chains

**Files:**
- Create: `src/systems/exploration.ts`
- Create: `src/systems/exploration.test.ts`
- Modify: `src/domain/types.ts`

- [ ] **Step 1: Write failing exploration tests**

Put this in `src/systems/exploration.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createExplorationState, resolveMapNode } from "./exploration";

describe("exploration", () => {
  it("creates one compact map with three Boss influence chains", () => {
    const state = createExplorationState();
    expect(state.nodes.map((node) => node.id)).toEqual([
      "street-fridge",
      "greasy-kitchen",
      "stage-crate",
      "laughing-crowd",
      "blood-waybill",
      "courier-locker",
      "safe-cache",
    ]);
    expect(state.nodes.filter((node) => node.bossId === "chef")).toHaveLength(2);
    expect(state.nodes.filter((node) => node.bossId === "clown")).toHaveLength(2);
    expect(state.nodes.filter((node) => node.bossId === "courier")).toHaveLength(2);
  });

  it("resolving a node grants rewards and records discovered Boss clues", () => {
    const state = createExplorationState();
    const result = resolveMapNode(state, "blood-waybill");
    expect(result.rewards.experience).toBe(35);
    expect(result.rewards.skillIds).toEqual(["explosive-parcel"]);
    expect(result.nextState.discoveredBossClues).toContain("courier");
    expect(result.nextState.resolvedNodeIds).toContain("blood-waybill");
  });

  it("does not grant the same resource twice", () => {
    const state = createExplorationState();
    const first = resolveMapNode(state, "safe-cache");
    const second = resolveMapNode(first.nextState, "safe-cache");
    expect(first.rewards.healing).toBe(25);
    expect(second.rewards.healing).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/systems/exploration.test.ts`

Expected: FAIL because `src/systems/exploration.ts` does not exist.

- [ ] **Step 3: Add exploration types**

Append this to `src/domain/types.ts`:

```ts
export interface MapNode {
  id: string;
  name: string;
  kind: "resource" | "event" | "influence";
  bossId: BossId | null;
  x: number;
  y: number;
  rewards: ExplorationRewards;
}

export interface ExplorationRewards {
  experience: number;
  healing: number;
  skillIds: string[];
  passiveFragmentIds: string[];
  clueBossIds: BossId[];
  temporaryPollution: number;
}

export interface ExplorationState {
  nodes: MapNode[];
  resolvedNodeIds: string[];
  discoveredBossClues: BossId[];
}
```

- [ ] **Step 4: Implement exploration**

Put this in `src/systems/exploration.ts`:

```ts
import type { ExplorationRewards, ExplorationState, MapNode } from "../domain/types";

const emptyRewards: ExplorationRewards = {
  experience: 0,
  healing: 0,
  skillIds: [],
  passiveFragmentIds: [],
  clueBossIds: [],
  temporaryPollution: 0,
};

const nodes: MapNode[] = [
  {
    id: "street-fridge",
    name: "血肉冰箱",
    kind: "resource",
    bossId: "chef",
    x: 220,
    y: 180,
    rewards: { ...emptyRewards, experience: 20, passiveFragmentIds: ["greasy-edge"], clueBossIds: ["chef"] },
  },
  {
    id: "greasy-kitchen",
    name: "油污厨房",
    kind: "influence",
    bossId: "chef",
    x: 340,
    y: 260,
    rewards: { ...emptyRewards, experience: 30, skillIds: ["oil-flame"], clueBossIds: ["chef"], temporaryPollution: 4 },
  },
  {
    id: "stage-crate",
    name: "舞台箱",
    kind: "resource",
    bossId: "clown",
    x: 820,
    y: 190,
    rewards: { ...emptyRewards, experience: 25, skillIds: ["balloon-barrage"], clueBossIds: ["clown"] },
  },
  {
    id: "laughing-crowd",
    name: "笑脸观众",
    kind: "event",
    bossId: "clown",
    x: 940,
    y: 270,
    rewards: { ...emptyRewards, experience: 40, passiveFragmentIds: ["delayed-laugh"], clueBossIds: ["clown"], temporaryPollution: 5 },
  },
  {
    id: "blood-waybill",
    name: "染血配送单",
    kind: "event",
    bossId: "courier",
    x: 760,
    y: 530,
    rewards: { ...emptyRewards, experience: 35, skillIds: ["explosive-parcel"], clueBossIds: ["courier"] },
  },
  {
    id: "courier-locker",
    name: "快递柜",
    kind: "influence",
    bossId: "courier",
    x: 960,
    y: 560,
    rewards: { ...emptyRewards, experience: 35, passiveFragmentIds: ["express-route"], clueBossIds: ["courier"], temporaryPollution: 6 },
  },
  {
    id: "safe-cache",
    name: "药柜",
    kind: "resource",
    bossId: null,
    x: 560,
    y: 400,
    rewards: { ...emptyRewards, healing: 25, experience: 15 },
  },
];

export function createExplorationState(): ExplorationState {
  return {
    nodes,
    resolvedNodeIds: [],
    discoveredBossClues: [],
  };
}

export function resolveMapNode(state: ExplorationState, nodeId: string): {
  nextState: ExplorationState;
  rewards: ExplorationRewards;
} {
  if (state.resolvedNodeIds.includes(nodeId)) {
    return { nextState: state, rewards: emptyRewards };
  }

  const node = state.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    return { nextState: state, rewards: emptyRewards };
  }

  const discoveredBossClues = Array.from(
    new Set([...state.discoveredBossClues, ...node.rewards.clueBossIds]),
  );

  return {
    nextState: {
      ...state,
      resolvedNodeIds: [...state.resolvedNodeIds, nodeId],
      discoveredBossClues,
    },
    rewards: node.rewards,
  };
}
```

- [ ] **Step 5: Run exploration tests**

Run: `npm test -- src/systems/exploration.test.ts`

Expected: PASS.

- [ ] **Step 6: Run all tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/types.ts src/systems/exploration.ts src/systems/exploration.test.ts
git commit -m "feat: add exploration event chains"
```

---

### Task 6: Combat, Skills, and Loot

**Files:**
- Create: `src/systems/combat.ts`
- Create: `src/systems/combat.test.ts`
- Modify: `src/domain/types.ts`

- [ ] **Step 1: Write failing combat tests**

Put this in `src/systems/combat.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BOSS_ORDER } from "../data/prototypeData";
import { applyDamage, createEnemy, defeatBoss, useSkill } from "./combat";

describe("combat", () => {
  it("applies basic and skill damage to enemies", () => {
    const enemy = createEnemy("common-zombie", "普通丧尸", 40, 5);
    expect(applyDamage(enemy, 10).health).toBe(30);
    expect(applyDamage(enemy, 99).defeated).toBe(true);
  });

  it("skill use returns damage and temporary pollution", () => {
    const result = useSkill("explosive-parcel", 1.2);
    expect(result.damage).toBe(77);
    expect(result.temporaryPollution).toBe(7);
    expect(result.tags).toContain("explosive");
  });

  it("Boss defeat awards special item and stage pollution", () => {
    const result = defeatBoss(BOSS_ORDER[0]);
    expect(result.specialItemId).toBe("flesh-recipe");
    expect(result.stagePollution).toBe(15);
    expect(result.experience).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/systems/combat.test.ts`

Expected: FAIL because `src/systems/combat.ts` does not exist.

- [ ] **Step 3: Add combat types**

Append this to `src/domain/types.ts`:

```ts
export interface EnemyState {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  damage: number;
  defeated: boolean;
}

export interface SkillUseResult {
  skillId: string;
  damage: number;
  temporaryPollution: number;
  tags: SkillTag[];
}

export interface BossDefeatReward {
  bossId: BossId;
  specialItemId: string;
  stagePollution: number;
  experience: number;
}
```

- [ ] **Step 4: Implement combat**

Put this in `src/systems/combat.ts`:

```ts
import { SKILLS } from "../data/prototypeData";
import type { BossDefeatReward, BossDefinition, EnemyState, SkillUseResult } from "../domain/types";
import { getExperienceForNextLevel } from "./progression";

export function createEnemy(id: string, name: string, health: number, damage: number): EnemyState {
  return {
    id,
    name,
    health,
    maxHealth: health,
    damage,
    defeated: false,
  };
}

export function applyDamage(enemy: EnemyState, amount: number): EnemyState {
  const health = Math.max(0, enemy.health - amount);
  return {
    ...enemy,
    health,
    defeated: health === 0,
  };
}

export function useSkill(skillId: string, damageMultiplier: number): SkillUseResult {
  const skill = SKILLS.find((candidate) => candidate.id === skillId);
  if (!skill) {
    return { skillId, damage: 0, temporaryPollution: 0, tags: [] };
  }
  return {
    skillId,
    damage: Math.round(skill.damage * damageMultiplier),
    temporaryPollution: skill.temporaryPollution,
    tags: skill.tags,
  };
}

export function defeatBoss(boss: BossDefinition): BossDefeatReward {
  return {
    bossId: boss.id,
    specialItemId: boss.specialItem.id,
    stagePollution: boss.specialItem.stagePollution,
    experience: getExperienceForNextLevel(boss.descentLevel),
  };
}
```

- [ ] **Step 5: Run combat tests**

Run: `npm test -- src/systems/combat.test.ts`

Expected: PASS.

- [ ] **Step 6: Run all tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/types.ts src/systems/combat.ts src/systems/combat.test.ts
git commit -m "feat: add combat skill and loot rules"
```

---

### Task 7: Boss Pressure Queue

**Files:**
- Create: `src/systems/bossPressure.ts`
- Create: `src/systems/bossPressure.test.ts`
- Modify: `src/domain/types.ts`

- [ ] **Step 1: Write failing Boss pressure tests**

Put this in `src/systems/bossPressure.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createBossPressureState, markBossKilled, processLevelMilestone } from "./bossPressure";

describe("boss pressure", () => {
  it("starts one active hunter at the matching level", () => {
    const state = createBossPressureState();
    const result = processLevelMilestone(state, 10);
    expect(result.activeHunterId).toBe("chef");
    expect(result.pendingBossIds).toEqual([]);
    expect(result.triggeredMilestones).toContain(10);
  });

  it("queues later Bosses as map pressure while one hunter is active", () => {
    const chefActive = processLevelMilestone(createBossPressureState(), 10);
    const clownQueued = processLevelMilestone(chefActive, 20);
    expect(clownQueued.activeHunterId).toBe("chef");
    expect(clownQueued.pendingBossIds).toEqual(["clown"]);
  });

  it("skips descent after early Boss kill", () => {
    const state = markBossKilled(createBossPressureState(), "chef");
    const result = processLevelMilestone(state, 10);
    expect(result.activeHunterId).toBeNull();
    expect(result.resolvedMilestones).toContain(10);
  });

  it("promotes queued Boss after the current hunter dies", () => {
    const chefActive = processLevelMilestone(createBossPressureState(), 10);
    const clownQueued = processLevelMilestone(chefActive, 20);
    const afterChef = markBossKilled(clownQueued, "chef");
    expect(afterChef.activeHunterId).toBe("clown");
    expect(afterChef.killedBossIds).toContain("chef");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/systems/bossPressure.test.ts`

Expected: FAIL because `src/systems/bossPressure.ts` does not exist.

- [ ] **Step 3: Add Boss pressure type**

Append this to `src/domain/types.ts`:

```ts
export interface BossPressureState {
  activeHunterId: BossId | null;
  pendingBossIds: BossId[];
  killedBossIds: BossId[];
  triggeredMilestones: number[];
  resolvedMilestones: number[];
}
```

- [ ] **Step 4: Implement Boss pressure**

Put this in `src/systems/bossPressure.ts`:

```ts
import { BOSS_ORDER } from "../data/prototypeData";
import type { BossId, BossPressureState } from "../domain/types";
import { getMilestoneBossId } from "./progression";

export function createBossPressureState(): BossPressureState {
  return {
    activeHunterId: null,
    pendingBossIds: [],
    killedBossIds: [],
    triggeredMilestones: [],
    resolvedMilestones: [],
  };
}

export function processLevelMilestone(state: BossPressureState, level: number): BossPressureState {
  const bossId = getMilestoneBossId(level);
  if (!bossId || state.triggeredMilestones.includes(level) || state.resolvedMilestones.includes(level)) {
    return state;
  }

  if (state.killedBossIds.includes(bossId)) {
    return {
      ...state,
      resolvedMilestones: [...state.resolvedMilestones, level],
    };
  }

  if (state.activeHunterId) {
    return {
      ...state,
      pendingBossIds: state.pendingBossIds.includes(bossId)
        ? state.pendingBossIds
        : [...state.pendingBossIds, bossId],
      triggeredMilestones: [...state.triggeredMilestones, level],
    };
  }

  return {
    ...state,
    activeHunterId: bossId,
    triggeredMilestones: [...state.triggeredMilestones, level],
  };
}

export function markBossKilled(state: BossPressureState, bossId: BossId): BossPressureState {
  const killedBossIds = state.killedBossIds.includes(bossId)
    ? state.killedBossIds
    : [...state.killedBossIds, bossId];
  const pendingBossIds = state.pendingBossIds.filter((candidate) => candidate !== bossId);
  const activeHunterId = state.activeHunterId === bossId ? pendingBossIds[0] ?? null : state.activeHunterId;
  const nextPending = state.activeHunterId === bossId ? pendingBossIds.slice(1) : pendingBossIds;
  const boss = BOSS_ORDER.find((candidate) => candidate.id === bossId);
  const resolvedMilestones = boss
    ? Array.from(new Set([...state.resolvedMilestones, boss.descentLevel]))
    : state.resolvedMilestones;

  return {
    ...state,
    activeHunterId,
    pendingBossIds: nextPending,
    killedBossIds,
    resolvedMilestones,
  };
}
```

- [ ] **Step 5: Run Boss pressure tests**

Run: `npm test -- src/systems/bossPressure.test.ts`

Expected: PASS.

- [ ] **Step 6: Run all tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/types.ts src/systems/bossPressure.ts src/systems/bossPressure.test.ts
git commit -m "feat: add boss pressure queue"
```

---

### Task 8: Run State Composition

**Files:**
- Create: `src/systems/runState.ts`
- Create: `src/systems/runState.test.ts`
- Modify: `src/domain/types.ts`

- [ ] **Step 1: Write failing run state tests**

Put this in `src/systems/runState.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRunState, collectNode, gainRunExperience, killRunBoss, useRunSkill } from "./runState";

describe("run state", () => {
  it("starts as an ordinary survivor with no out-of-run growth", () => {
    const state = createRunState();
    expect(state.level).toBe(1);
    expect(state.health).toBe(100);
    expect(state.activeSkillIds).toEqual(["cleaver-dash"]);
    expect(state.killedBossIds).toEqual([]);
    expect(state.specialItemIds).toEqual([]);
  });

  it("collecting a node can add skills, fragments, clues, and pollution", () => {
    const state = collectNode(createRunState(), "greasy-kitchen");
    expect(state.experience).toBe(30);
    expect(state.activeSkillIds).toContain("oil-flame");
    expect(state.discoveredBossClues).toContain("chef");
    expect(state.temporaryPollution).toBe(4);
  });

  it("level milestones trigger Boss pressure", () => {
    const state = gainRunExperience(createRunState(), 630);
    expect(state.level).toBe(10);
    expect(state.bossPressure.activeHunterId).toBe("chef");
  });

  it("Boss kill adds special item and stage pollution", () => {
    const state = killRunBoss(createRunState(), "chef");
    expect(state.killedBossIds).toEqual(["chef"]);
    expect(state.specialItemIds).toEqual(["flesh-recipe"]);
    expect(state.stagePollution).toBe(15);
  });

  it("skill use adds temporary pollution", () => {
    const state = useRunSkill(createRunState(), "cleaver-dash");
    expect(state.temporaryPollution).toBe(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/systems/runState.test.ts`

Expected: FAIL because `src/systems/runState.ts` does not exist.

- [ ] **Step 3: Add run state type**

Append this to `src/domain/types.ts`:

```ts
export interface RunState {
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  baseDamage: number;
  activeSkillIds: string[];
  passiveFragmentIds: string[];
  specialItemIds: string[];
  killedBossIds: BossId[];
  passiveLoad: number;
  temporaryPollution: number;
  stagePollution: number;
  exploration: ExplorationState;
  discoveredBossClues: BossId[];
  bossPressure: BossPressureState;
}
```

- [ ] **Step 4: Implement run state composition**

Put this in `src/systems/runState.ts`:

```ts
import { BOSS_ORDER, PLAYER_BASELINE } from "../data/prototypeData";
import type { BossId, RunState } from "../domain/types";
import { processLevelMilestone, createBossPressureState, markBossKilled } from "./bossPressure";
import { defeatBoss, useSkill } from "./combat";
import { createExplorationState, resolveMapNode } from "./exploration";
import { equipActiveSkill, equipPassiveFragment, getPassiveLoad } from "./loadout";
import { gainExperience } from "./progression";

export function createRunState(): RunState {
  return {
    level: 1,
    experience: 0,
    health: PLAYER_BASELINE.maxHealth,
    maxHealth: PLAYER_BASELINE.maxHealth,
    baseDamage: PLAYER_BASELINE.basicDamage,
    activeSkillIds: ["cleaver-dash"],
    passiveFragmentIds: [],
    specialItemIds: [],
    killedBossIds: [],
    passiveLoad: 0,
    temporaryPollution: PLAYER_BASELINE.startingPollution,
    stagePollution: 0,
    exploration: createExplorationState(),
    discoveredBossClues: [],
    bossPressure: createBossPressureState(),
  };
}

export function gainRunExperience(state: RunState, amount: number): RunState {
  const progress = gainExperience({ level: state.level, experience: state.experience }, amount);
  const bossPressure = progress.levelsGained.reduce(
    (pressure, level) => processLevelMilestone(pressure, level),
    state.bossPressure,
  );

  return {
    ...state,
    level: progress.level,
    experience: progress.experience,
    maxHealth: PLAYER_BASELINE.maxHealth + (progress.level - 1) * 2,
    baseDamage: Math.round(PLAYER_BASELINE.basicDamage * (1 + (progress.level - 1) * 0.03)),
    bossPressure,
  };
}

export function collectNode(state: RunState, nodeId: string): RunState {
  const result = resolveMapNode(state.exploration, nodeId);
  let next = gainRunExperience(
    {
      ...state,
      exploration: result.nextState,
      health: Math.min(state.maxHealth, state.health + result.rewards.healing),
      temporaryPollution: state.temporaryPollution + result.rewards.temporaryPollution,
      discoveredBossClues: Array.from(
        new Set([...state.discoveredBossClues, ...result.rewards.clueBossIds]),
      ),
    },
    result.rewards.experience,
  );

  for (const skillId of result.rewards.skillIds) {
    const equipped = equipActiveSkill(next.activeSkillIds, skillId);
    next = { ...next, activeSkillIds: equipped.activeSkillIds };
  }

  for (const fragmentId of result.rewards.passiveFragmentIds) {
    const equipped = equipPassiveFragment(next.passiveFragmentIds, fragmentId);
    next = {
      ...next,
      passiveFragmentIds: equipped.passiveFragmentIds,
      passiveLoad: equipped.passiveLoad,
    };
  }

  return next;
}

export function useRunSkill(state: RunState, skillId: string): RunState {
  const skill = useSkill(skillId, 1);
  return {
    ...state,
    temporaryPollution: state.temporaryPollution + skill.temporaryPollution,
  };
}

export function killRunBoss(state: RunState, bossId: BossId): RunState {
  const boss = BOSS_ORDER.find((candidate) => candidate.id === bossId);
  if (!boss || state.killedBossIds.includes(bossId)) {
    return state;
  }
  const reward = defeatBoss(boss);
  const killedBossIds = [...state.killedBossIds, bossId];
  const specialItemIds = [...state.specialItemIds, reward.specialItemId];

  return {
    ...gainRunExperience(state, reward.experience),
    killedBossIds,
    specialItemIds,
    passiveLoad: getPassiveLoad(state.passiveFragmentIds),
    stagePollution: state.stagePollution + reward.stagePollution,
    bossPressure: markBossKilled(state.bossPressure, bossId),
  };
}
```

- [ ] **Step 5: Run run state tests**

Run: `npm test -- src/systems/runState.test.ts`

Expected: PASS.

- [ ] **Step 6: Run all tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/types.ts src/systems/runState.ts src/systems/runState.test.ts
git commit -m "feat: compose run state systems"
```

---

### Task 9: HUD Model and Scene Integration

**Files:**
- Create: `src/ui/hud.ts`
- Create: `src/ui/hud.test.ts`
- Modify: `src/game/PrototypeScene.ts`

- [ ] **Step 1: Write failing HUD tests**

Put this in `src/ui/hud.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRunState } from "../systems/runState";
import { createHudLines } from "./hud";

describe("hud", () => {
  it("summarizes level, health, pollution, Boss pressure, and loadout", () => {
    const lines = createHudLines({
      ...createRunState(),
      level: 10,
      health: 84,
      temporaryPollution: 12,
      bossPressure: {
        activeHunterId: "chef",
        pendingBossIds: [],
        killedBossIds: [],
        triggeredMilestones: [10],
        resolvedMilestones: [],
      },
    });
    expect(lines[0]).toContain("Lv 10");
    expect(lines[1]).toContain("污染 12");
    expect(lines[2]).toContain("追杀 变异厨师");
    expect(lines[3]).toContain("技能 菜刀冲刺");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/ui/hud.test.ts`

Expected: FAIL because `src/ui/hud.ts` does not exist.

- [ ] **Step 3: Implement HUD helpers**

Put this in `src/ui/hud.ts`:

```ts
import { BOSS_ORDER, SKILLS } from "../data/prototypeData";
import type { RunState } from "../domain/types";
import { getPollutionBand, getPollutionTotals } from "../systems/pollution";

export function createHudLines(state: RunState): string[] {
  const pollution = getPollutionTotals(state);
  const band = getPollutionBand(pollution.total);
  const activeHunterName =
    BOSS_ORDER.find((boss) => boss.id === state.bossPressure.activeHunterId)?.name ?? "无";
  const skillNames = state.activeSkillIds
    .map((id) => SKILLS.find((skill) => skill.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  return [
    `Lv ${state.level}  HP ${state.health}/${state.maxHealth}  EXP ${state.experience}`,
    `污染 ${pollution.total}  阶段 ${state.stagePollution}  状态 ${band.label}`,
    `追杀 ${activeHunterName}  已击杀 ${state.killedBossIds.length}/3  线索 ${state.discoveredBossClues.length}`,
    `技能 ${skillNames.join(" / ") || "无"}`,
  ];
}
```

- [ ] **Step 4: Run HUD tests**

Run: `npm test -- src/ui/hud.test.ts`

Expected: PASS.

- [ ] **Step 5: Replace the scene with a playable prototype loop**

Replace `src/game/PrototypeScene.ts` with:

```ts
import Phaser from "phaser";
import { BOSS_ORDER } from "../data/prototypeData";
import type { RunState } from "../domain/types";
import { createRunState, collectNode, gainRunExperience, killRunBoss, useRunSkill } from "../systems/runState";
import { createHudLines } from "../ui/hud";

type NodeMarker = Phaser.GameObjects.Rectangle & { nodeId: string };

export class PrototypeScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Arc;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private state: RunState = createRunState();
  private hud?: Phaser.GameObjects.Text;
  private message?: Phaser.GameObjects.Text;
  private nodeMarkers: NodeMarker[] = [];
  private attackMode: "auto" | "manual" = "auto";

  constructor() {
    super("prototype");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#171a16");
    this.add.rectangle(640, 380, 1180, 600, 0x23271f).setStrokeStyle(2, 0x4f5b45);
    this.addGrid(640, 380, 1180, 600, 80, 80, 0x2f382b, 0.4, 0x2f382b, 0.2);

    this.player = this.add.circle(640, 360, 14, 0x95d5b2);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;

    this.hud = this.add.text(20, 18, "", {
      color: "#f2ead3",
      fontFamily: "Arial",
      fontSize: "18px",
      lineSpacing: 6,
    });
    this.message = this.add.text(20, 640, "", {
      color: "#ffd166",
      fontFamily: "Arial",
      fontSize: "18px",
    });

    this.createNodeMarkers();
    this.bindKeys();
    this.refreshHud("WASD/方向键移动，E 搜刮，Q 普攻模式，1-4 技能，B 击杀当前追杀 Boss，X 获得经验");
  }

  update(_time: number, delta: number): void {
    this.movePlayer(delta);
    this.highlightNearbyNode();
  }

  private createNodeMarkers(): void {
    for (const node of this.state.exploration.nodes) {
      const color = node.kind === "resource" ? 0x74c69d : node.kind === "event" ? 0xf2cc8f : 0xe07a5f;
      const marker = this.add.rectangle(node.x, node.y, 34, 34, color, 0.9) as NodeMarker;
      marker.nodeId = node.id;
      this.add.text(node.x - 38, node.y + 24, node.name, {
        color: "#f8f4e3",
        fontFamily: "Arial",
        fontSize: "14px",
      });
      this.nodeMarkers.push(marker);
    }
  }

  private bindKeys(): void {
    this.input.keyboard?.on("keydown-E", () => this.collectNearbyNode());
    this.input.keyboard?.on("keydown-Q", () => {
      this.attackMode = this.attackMode === "auto" ? "manual" : "auto";
      this.refreshHud(`普攻模式：${this.attackMode === "auto" ? "自动" : "手动"}`);
    });
    this.input.keyboard?.on("keydown-X", () => {
      this.state = gainRunExperience(this.state, 120);
      this.refreshHud("击杀普通丧尸群，获得经验。");
    });
    this.input.keyboard?.on("keydown-B", () => this.killActiveBoss());
    for (let index = 0; index < 4; index += 1) {
      this.input.keyboard?.on(`keydown-${index + 1}`, () => this.castSkill(index));
    }
  }

  private movePlayer(delta: number): void {
    if (!this.player) return;
    const speed = 220;
    const seconds = delta / 1000;
    const dx =
      (this.cursors?.right.isDown || this.wasd?.D.isDown ? 1 : 0) -
      (this.cursors?.left.isDown || this.wasd?.A.isDown ? 1 : 0);
    const dy =
      (this.cursors?.down.isDown || this.wasd?.S.isDown ? 1 : 0) -
      (this.cursors?.up.isDown || this.wasd?.W.isDown ? 1 : 0);
    const length = Math.hypot(dx, dy) || 1;

    this.player.x += (dx / length) * speed * seconds;
    this.player.y += (dy / length) * speed * seconds;
    this.player.x = Phaser.Math.Clamp(this.player.x, 70, 1210);
    this.player.y = Phaser.Math.Clamp(this.player.y, 90, 680);
  }

  private highlightNearbyNode(): void {
    const nearby = this.getNearbyNode();
    for (const marker of this.nodeMarkers) {
      marker.setStrokeStyle(marker === nearby ? 4 : 0, 0xffffff);
    }
  }

  private collectNearbyNode(): void {
    const marker = this.getNearbyNode();
    if (!marker) {
      this.refreshHud("附近没有可搜刮点。");
      return;
    }
    const node = this.state.exploration.nodes.find((candidate) => candidate.id === marker.nodeId);
    this.state = collectNode(this.state, marker.nodeId);
    marker.setAlpha(0.35);
    this.refreshHud(`搜刮：${node?.name ?? marker.nodeId}`);
  }

  private castSkill(index: number): void {
    const skillId = this.state.activeSkillIds[index];
    if (!skillId) {
      this.refreshHud(`技能槽 ${index + 1} 为空。`);
      return;
    }
    this.state = useRunSkill(this.state, skillId);
    this.refreshHud(`释放技能槽 ${index + 1}。`);
  }

  private killActiveBoss(): void {
    const activeBossId = this.state.bossPressure.activeHunterId;
    if (!activeBossId) {
      const nextBoss = BOSS_ORDER.find((boss) => !this.state.killedBossIds.includes(boss.id));
      if (!nextBoss) {
        this.refreshHud("30 级原型阶段结算：三个 Boss 已清理。");
        return;
      }
      this.state = killRunBoss(this.state, nextBoss.id);
      this.refreshHud(`主动狩猎成功：${nextBoss.name}`);
      return;
    }
    const boss = BOSS_ORDER.find((candidate) => candidate.id === activeBossId);
    this.state = killRunBoss(this.state, activeBossId);
    this.refreshHud(`击杀追杀 Boss：${boss?.name ?? activeBossId}`);
  }

  private getNearbyNode(): NodeMarker | undefined {
    if (!this.player) return undefined;
    return this.nodeMarkers.find((marker) => {
      const distance = Phaser.Math.Distance.Between(this.player!.x, this.player!.y, marker.x, marker.y);
      return distance <= 58 && !this.state.exploration.resolvedNodeIds.includes(marker.nodeId);
    });
  }

  private refreshHud(text: string): void {
    this.hud?.setText([...createHudLines(this.state), `普攻 ${this.attackMode === "auto" ? "自动" : "手动"}`].join("\n"));
    this.message?.setText(text);
  }
}
```

- [ ] **Step 6: Run all tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 7: Run the build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/ui/hud.ts src/ui/hud.test.ts src/game/PrototypeScene.ts
git commit -m "feat: wire prototype systems into scene"
```

---

### Task 10: Browser Smoke Test and README Update

**Files:**
- Create: `tests/e2e/prototype.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Create Playwright smoke test**

Put this in `tests/e2e/prototype.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("prototype loads and responds to keyboard controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("末日废土幸存者原型")).toBeVisible();
  await expect(page.getByText(/Lv 1/)).toBeVisible();
  await page.keyboard.press("X");
  await expect(page.getByText(/获得经验/)).toBeVisible();
  await page.keyboard.press("Q");
  await expect(page.getByText(/普攻模式/)).toBeVisible();
});
```

- [ ] **Step 2: Add Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  webServer: {
    command: "npm run dev -- --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
  },
});
```

- [ ] **Step 3: Run the E2E test to verify it passes**

Run: `npx playwright install chromium`

Expected: Chromium browser dependency is installed.

Run: `npm run e2e`

Expected: PASS.

- [ ] **Step 4: Update README with prototype commands**

Add this section to `README.md` after the prototype scope:

```md
## 本地运行

安装依赖：

```bash
npm install
```

启动原型：

```bash
npm run dev
```

验证：

```bash
npm test
npm run build
npm run e2e
```

原型操作：

- `WASD` 或方向键移动。
- `E` 搜刮附近资源点或事件点。
- `Q` 切换自动/手动普攻。
- `1` 到 `4` 释放主动技能。
- `X` 模拟击杀普通怪并获得经验。
- `B` 击杀当前追杀 Boss；没有追杀 Boss 时执行主动狩猎。
```

- [ ] **Step 5: Run final verification**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `npm run e2e`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add README.md playwright.config.ts tests/e2e/prototype.spec.ts
git commit -m "test: add prototype browser smoke test"
```

---

## Self-Review

**Spec coverage:**

- Open exploration: Task 5 creates compact map nodes and simplified event chains; Task 9 makes them collectable in-scene.
- Active hunting and level pursuit: Task 7 implements early kill, level descent, and one active hunter; Task 9 exposes active hunting with `B`.
- Profession fragments: Task 2 defines skills and passives; Task 4 equips them; Task 5 grants them from themed nodes.
- Pollution: Task 4 implements passive, temporary, and stage pollution bands; Task 8 composes the totals into run state.
- Boss rewards: Task 6 defines special item drops; Task 8 records special items and stage pollution.
- Prototype scope: Bosses are Chef, Clown, and Courier only; level cap is 30.
- Combat operation model: Task 9 includes movement, auto/manual attack mode, four skill keys, and skill pollution.
- Verification: Tasks 2-8 cover deterministic unit tests; Task 10 adds browser smoke testing.

**Known intentional simplifications:**

- Enemy movement and real collision combat are represented by deterministic rules and keyboard simulation in this prototype. This keeps the first pass focused on loop validation.
- Boss mechanics are represented by pressure state and kill events. Boss-specific attack patterns should be added after the core loop proves readable.
- The level-30 ending is a stage result, not the final Boss.

**Placeholder scan:**

- No task uses unspecified placeholder work.
- Every code creation step includes concrete file contents.
- Each task has explicit commands and expected results.

**Type consistency:**

- `BossId`, `RunState`, `BossPressureState`, and pollution types are defined before use.
- `bossPressure.activeHunterId`, `killedBossIds`, `specialItemIds`, and `discoveredBossClues` use the same names across tests and implementation.
- Skill IDs and Boss IDs used in tests match `src/data/prototypeData.ts`.
