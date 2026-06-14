import { describe, expect, it } from "vitest";
import {
  COURIER_CITYWIDE_DELIVERY_DURATION_MS,
  COURIER_CITYWIDE_DELIVERY_TICK_MS,
  COURIER_EXPLOSIVE_PARCEL_COUNT,
  COURIER_EXPLOSIVE_PARCEL_DISTANCE_STEP,
  COURIER_EXPLOSIVE_PARCEL_MIN_DISTANCE,
  COURIER_PARCEL_REDELIVERY_MS,
  COURIER_PARCEL_TRIGGER_RADIUS,
  COURIER_ROUTE_RESIDUE_LIFE_MS,
  COURIER_SIGNATURE_LOCK_MS,
  getCourierParcelOutcome,
  getCourierSignatureLockOutcome,
} from "./courier";

describe("courier boss rules", () => {
  it("defines the requested stronger courier mechanics", () => {
    expect(COURIER_ROUTE_RESIDUE_LIFE_MS).toBeGreaterThanOrEqual(3500);
    expect(COURIER_EXPLOSIVE_PARCEL_COUNT).toBeGreaterThanOrEqual(3);
    expect(COURIER_PARCEL_REDELIVERY_MS).toBeGreaterThan(0);
    expect(COURIER_SIGNATURE_LOCK_MS).toBeGreaterThanOrEqual(1200);
    expect(COURIER_CITYWIDE_DELIVERY_DURATION_MS).toBe(10000);
    expect(COURIER_CITYWIDE_DELIVERY_TICK_MS).toBeLessThanOrEqual(900);
    expect(COURIER_EXPLOSIVE_PARCEL_MIN_DISTANCE).toBeGreaterThanOrEqual(210);
    expect(COURIER_EXPLOSIVE_PARCEL_DISTANCE_STEP).toBeGreaterThanOrEqual(32);
  });

  it("keeps players safe inside signature delivery zones and ambushes them outside", () => {
    expect(getCourierSignatureLockOutcome(149, 150)).toBe("safe");
    expect(getCourierSignatureLockOutcome(151, 150)).toBe("ambush");
  });

  it("detonates courier parcels only when the player touches the trigger radius", () => {
    expect(getCourierParcelOutcome(COURIER_PARCEL_TRIGGER_RADIUS + 1, COURIER_PARCEL_TRIGGER_RADIUS)).toBe("idle");
    expect(getCourierParcelOutcome(COURIER_PARCEL_TRIGGER_RADIUS, COURIER_PARCEL_TRIGGER_RADIUS)).toBe("detonate");
  });
});
