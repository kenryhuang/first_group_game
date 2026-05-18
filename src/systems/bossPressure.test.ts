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
