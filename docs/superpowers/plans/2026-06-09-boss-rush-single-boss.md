# Boss Rush Single Boss Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 10 selectable single-Boss duel entries to Boss Rush.

**Architecture:** Reuse the existing Boss Rush scenario pipeline by representing every duel as a `BossRushScenario` with one entry. Add new roaming Boss ids for simple single-boss fights, while keeping hospital knight and final boss on their existing special systems.

**Tech Stack:** TypeScript, Vue render functions, Pixi.js, Vitest.

---

### Task 1: Boss Rush Duel Data

**Files:**
- Modify: `src/systems/bossRush.ts`
- Modify: `src/systems/bossRush.test.ts`
- Modify: `src/domain/types.ts`
- Modify: `src/data/prototypeData.ts`

- [ ] Add tests that assert 10 single-boss duel scenarios exist and each has one main entry.
- [ ] Extend `BossId` with `beastmaster`, `plague-doctor`, `tesla-engineer`, `magician`, and `war-convoy`.
- [ ] Add five roaming boss definitions, runtime data, and visual themes.
- [ ] Keep existing challenge scenarios available after the 10 duel entries.

### Task 2: UI Selection

**Files:**
- Modify: `src/app/App.ts`

- [ ] Update Boss Rush copy to say players can choose a single Boss duel.
- [ ] Render all 10 single-boss duel entries from the scenario list.

### Task 3: Game Spawn Support

**Files:**
- Modify: `src/game/PixiWastelandGame.ts`

- [ ] Ensure new roaming Boss ids draw correctly.
- [ ] Ensure single-boss scenarios spawn exactly one Boss.
- [ ] Keep completion logic based on all Boss actors being defeated.

### Task 4: Verification

**Files:**
- Test: `src/systems/bossRush.test.ts`
- Test: existing test suite

- [ ] Run `npm test -- src/systems/bossRush.test.ts`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Open `http://127.0.0.1:5317`.
