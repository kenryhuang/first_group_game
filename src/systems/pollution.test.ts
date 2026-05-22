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
