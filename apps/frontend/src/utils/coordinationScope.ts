import type { AccessScope } from "../types/auth";
import type { BusySlot } from "../types/schedules";

export function initialCoordinationId(scope: AccessScope): number | null {
  return scope.is_global || scope.coordinations.length !== 1 ? null : scope.coordinations[0].id;
}

export function includePrimaryCoordination(primaryId: number, coordinationIds: number[]): number[] {
  return Array.from(new Set([primaryId, ...coordinationIds]));
}

export function busySlotView(slot: BusySlot): BusySlot {
  const { date, start_time, end_time, availability, label } = slot;
  return { date, start_time, end_time, availability, label };
}
