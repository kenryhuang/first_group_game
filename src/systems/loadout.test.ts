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
