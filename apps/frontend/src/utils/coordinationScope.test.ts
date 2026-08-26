import assert from "node:assert/strict";
import test from "node:test";
import { busySlotView, includePrimaryCoordination, initialCoordinationId } from "./coordinationScope.ts";

test("single scope is selected while multi and global scopes keep the union", () => {
  assert.equal(initialCoordinationId({ is_global: false, coordinations: [{ id: 1, code: "LOG", name: "Logística" }] }), 1);
  assert.equal(initialCoordinationId({ is_global: false, coordinations: [{ id: 1, code: "LOG", name: "Logística" }, { id: 2, code: "MER", name: "Mercadeo" }] }), null);
  assert.equal(initialCoordinationId({ is_global: true, coordinations: [] }), null);
});

test("the primary instructor coordination is always included once", () => {
  assert.deepEqual(includePrimaryCoordination(3, [1, 2, 3]), [3, 1, 2]);
});

test("busy slot view explicitly drops foreign schedule details", () => {
  const view = busySlotView({
    date: "2026-08-26",
    start_time: "08:00:00",
    end_time: "12:00:00",
    availability: "busy_other_coordination",
    label: "Ocupado por otra coordinación",
    coordination_name: "Mercadeo",
    schedule_id: 99,
  } as never);
  assert.deepEqual(Object.keys(view), ["date", "start_time", "end_time", "availability", "label"]);
  assert.equal(JSON.stringify(view).includes("Mercadeo"), false);
  assert.equal(JSON.stringify(view).includes("99"), false);
});
