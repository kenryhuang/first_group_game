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
    expect(result.level).toBe(5);
    expect(result.experience).toBe(20);
    expect(result.levelsGained).toEqual([2, 3, 4, 5]);
  });

  it("maps prototype milestone levels to Boss ids", () => {
    expect(getMilestoneBossId(10)).toBe("chef");
    expect(getMilestoneBossId(20)).toBe("clown");
    expect(getMilestoneBossId(30)).toBe("courier");
    expect(getMilestoneBossId(21)).toBeNull();
  });
});
