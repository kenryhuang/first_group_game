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
