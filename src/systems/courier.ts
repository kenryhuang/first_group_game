export const COURIER_ROUTE_RESIDUE_LIFE_MS = 4200;
export const COURIER_ROUTE_RESIDUE_TICK_MS = 420;
export const COURIER_ROUTE_RESIDUE_RADIUS = 42;
export const COURIER_EXPLOSIVE_PARCEL_COUNT = 4;
export const COURIER_EXPLOSIVE_PARCEL_MIN_DISTANCE = 220;
export const COURIER_EXPLOSIVE_PARCEL_DISTANCE_STEP = 42;
export const COURIER_PARCEL_REDELIVERY_MS = 2600;
export const COURIER_PARCEL_TRIGGER_RADIUS = 82;
export const COURIER_LOCKER_COUNT = 2;
export const COURIER_SIGNATURE_LOCK_MS = 1500;
export const COURIER_CITYWIDE_DELIVERY_DURATION_MS = 10000;
export const COURIER_CITYWIDE_DELIVERY_TICK_MS = 760;

export type CourierSignatureLockOutcome = "safe" | "ambush";
export type CourierParcelOutcome = "idle" | "detonate";

export function getCourierSignatureLockOutcome(distanceToMarker: number, markerRadius: number): CourierSignatureLockOutcome {
  return distanceToMarker <= markerRadius ? "safe" : "ambush";
}

export function getCourierParcelOutcome(distanceToParcel: number, triggerRadius: number): CourierParcelOutcome {
  return distanceToParcel <= triggerRadius ? "detonate" : "idle";
}
