import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchList } from "../api/masterData";
import { fetchSchedulesDetailed } from "../api/schedules";
import { Group, Instructor, LearningResult } from "../types/masterData";
import { ScheduleDetailed, ScheduleFilters } from "../types/schedules";
import { ScheduleFilterBar, ScheduleQueryStatus } from "./ScheduleQueryShared";

const WEEKDAY_ORDER = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function dateRangeLabel(filters: ScheduleFilters): string {
  if (filters.date_from && filters.date_to) return `${filters.date_from} a ${filters.date_to}`;
  if (filters.date_from) return `Desde ${filters.date_from}`;
  if (filters.date_to) return `Hasta ${filters.date_to}`;
  return "Sin rango de fechas";
}

export function ScheduleMatrixPage() {
  const [filters, setFilters] = useState<ScheduleFilters>({});

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

  const groupedByWeekday = useMemo(() => {
    const map = new Map<string, ScheduleDetailed[]>();
    schedules.forEach((schedule) => {
      const key = schedule.weekday_label || "Sin día";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(schedule);
    });
    return WEEKDAY_ORDER.filter((day) => map.has(day)).map((day) => ({
      weekday: day,
      schedules: map.get(day)!.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        return dateCompare !== 0 ? dateCompare : a.start_time.localeCompare(b.start_time);
      }),
    }));
  }, [schedules]);

  return (
    <section className="workspace">
      <header className="topbar">
        <div>
          <p className="eyebrow">Operación</p>
          <h1>Matriz Académica</h1>
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
        <>
          <div className="schedule-summary-grid" aria-label="Resumen de la matriz">
            <div className="schedule-summary-card">
              <span>Total horarios</span>
              <strong>{schedules.length}</strong>
            </div>
            <div className="schedule-summary-card">
              <span>Días con programación</span>
              <strong>{groupedByWeekday.map((group) => group.weekday).join(", ")}</strong>
            </div>
            <div className="schedule-summary-card">
              <span>Rango consultado</span>
              <strong>{dateRangeLabel(filters)}</strong>
            </div>
          </div>

          <section className="week-view-card" aria-label="Matriz académica">
            <div className="week-grid" role="list">
              {groupedByWeekday.map((day) => (
                <div className="week-day-column" key={day.weekday}>
                  <div className="week-day-heading">
                    <strong>{day.weekday}</strong>
                    <span>{day.schedules.length}</span>
                  </div>
                  <div className="week-day-body">
                    {day.schedules.map((schedule) => (
                      <div className="week-schedule-card" key={schedule.id}>
                        <span className="week-schedule-date">{schedule.date}</span>
                        <span className="week-schedule-time">{schedule.start_time} - {schedule.end_time}</span>
                        <span><strong>Instructor:</strong> {schedule.instructor_name}</span>
                        <span><strong>Ficha:</strong> {schedule.group_code}</span>
                        <span className="week-rap"><strong>RAP:</strong> {schedule.learning_result_code || "Sin RAP"}</span>
                        <span className="week-topic"><strong>Temática:</strong> {schedule.topic_name || "Sin temática"}</span>
                        <span><strong>Ambiente:</strong> {schedule.environment_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
