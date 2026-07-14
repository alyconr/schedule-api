import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchList } from "../api/masterData";
import { fetchSchedulesDetailed } from "../api/schedules";
import { Group, Instructor, LearningResult } from "../types/masterData";
import { ScheduleDetailed, ScheduleFilters } from "../types/schedules";
import { ScheduleFilterBar, ScheduleQueryStatus, ScheduleWarningDialog } from "./ScheduleQueryShared";

const STATUS_LABELS: Record<string, string> = {
  validated: "Válido",
  valid: "Válido",
  warning: "Advertencia",
  blocked: "Bloqueado",
  cancelled: "Cancelado",
  deleted: "Eliminado",
  draft: "Borrador",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] || "Borrador";
}

function statusClass(status: string): string {
  return `status-${status in STATUS_LABELS ? status : "idle"}`;
}

export function ScheduleDetailPage() {
  const [filters, setFilters] = useState<ScheduleFilters>({});
  const [warningSchedule, setWarningSchedule] = useState<ScheduleDetailed | null>(null);

  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: () => fetchList<Group>("groups") });
  const instructorsQuery = useQuery({ queryKey: ["instructors"], queryFn: () => fetchList<Instructor>("instructors") });
  const learningResultsQuery = useQuery({ queryKey: ["learning-results"], queryFn: () => fetchList<LearningResult>("learning-results") });

  const hasFilter = Boolean(filters.group_id || filters.instructor_id);
  const schedulesQuery = useQuery<ScheduleDetailed[]>({
    queryKey: ["schedules-detailed", filters],
    queryFn: () => fetchSchedulesDetailed(filters),
    enabled: hasFilter,
  });
  const schedules = schedulesQuery.data ?? [];

  return (
    <section className="workspace">
      <header className="topbar">
        <div>
          <p className="eyebrow">Operación</p>
          <h1>Programación Detallada</h1>
        </div>
      </header>

      <ScheduleFilterBar
        groups={groupsQuery.data ?? []}
        instructors={instructorsQuery.data ?? []}
        learningResults={learningResultsQuery.data ?? []}
        onApply={setFilters}
        onClear={() => setFilters({})}
      />

      <ScheduleQueryStatus hasFilter={hasFilter} query={schedulesQuery} />

      {hasFilter && schedules.length > 0 && (
        <section className="week-view-card" aria-label="Listado detallado de horarios">
          <div className="table-responsive">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Día programado</th>
                  <th>Horario</th>
                  <th>Instructor</th>
                  <th>Ficha</th>
                  <th>Programa</th>
                  <th>RAP</th>
                  <th>Temática</th>
                  <th>Ambiente</th>
                  <th>Estado</th>
                  <th>Advertencias</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td>{schedule.weekday_label} {schedule.date}</td>
                    <td>{schedule.start_time} - {schedule.end_time}</td>
                    <td>{schedule.instructor_name}</td>
                    <td>{schedule.group_code}</td>
                    <td>{schedule.training_program_name || "-"}</td>
                    <td>{schedule.learning_result_code || "-"}</td>
                    <td>{schedule.topic_name || "-"}</td>
                    <td>{schedule.environment_name}</td>
                    <td><span className={`schedule-status ${statusClass(schedule.status)}`}>{statusLabel(schedule.status)}</span></td>
                    <td>
                      {schedule.status === "warning" ? (
                        <button
                          type="button"
                          className="schedule-status status-warning status-clickable"
                          onClick={() => setWarningSchedule(schedule)}
                          title="Ver detalle de advertencias"
                        >
                          Ver advertencias
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {warningSchedule && (
        <ScheduleWarningDialog schedule={warningSchedule} onClose={() => setWarningSchedule(null)} />
      )}
    </section>
  );
}
