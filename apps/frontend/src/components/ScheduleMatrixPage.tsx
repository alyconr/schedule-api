import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchList } from "../api/masterData";
import { fetchSchedulesDetailed } from "../api/schedules";
import { Group, Instructor, LearningResult } from "../types/masterData";
import { ScheduleDetailed, ScheduleFilters } from "../types/schedules";
import { groupLabel, instructorLabel, rapLabel, ScheduleFilterBar, ScheduleQueryStatus } from "./ScheduleQueryShared";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const shortDate = (value: string) => new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
const STATUS_LABELS: Record<string, string> = {
  validated: "Válido",
  valid: "Válido",
  warning: "Advertencia",
  blocked: "Bloqueado",
  cancelled: "Cancelado",
  deleted: "Eliminado",
  draft: "Borrador",
};

export function ScheduleMatrixPage() {
  const [filters, setFilters] = useState<ScheduleFilters>({});
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleDetailed | null>(null);

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

  useEffect(() => {
    const firstDate = filters.date_from || schedules[0]?.date;
    if (firstDate) setVisibleMonth(new Date(`${firstDate}T00:00:00`));
  }, [filters.date_from, schedules]);

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, ScheduleDetailed[]>();
    schedules.forEach((schedule) => map.set(schedule.date, [...(map.get(schedule.date) ?? []), schedule]));
    map.forEach((items) => items.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [schedules]);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmptyDays = (new Date(year, month, 1).getDay() + 6) % 7;
    return [
      ...Array.from({ length: leadingEmptyDays }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
    ];
  }, [visibleMonth]);

  const moveMonth = (amount: number) => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  const monthTitle = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(visibleMonth);
  const scheduledDays = schedulesByDate.size;
  const todayKey = new Date().toLocaleDateString("en-CA");
  const activeFilterLabels = useMemo(() => {
    const labels: { name: string; value: string }[] = [];
    const group = filters.group_id ? groupsQuery.data?.find((item) => item.id === filters.group_id) : undefined;
    const instructor = filters.instructor_id ? instructorsQuery.data?.find((item) => item.id === filters.instructor_id) : undefined;
    const rap = filters.learning_result_id ? learningResultsQuery.data?.find((item) => item.id === filters.learning_result_id) : undefined;
    if (filters.group_id) labels.push({ name: "Ficha", value: group ? groupLabel(group) : String(filters.group_id) });
    if (filters.instructor_id) labels.push({ name: "Instructor", value: instructor ? instructorLabel(instructor) : String(filters.instructor_id) });
    if (filters.learning_result_id) labels.push({ name: "RAP", value: rap ? rapLabel(rap) : String(filters.learning_result_id) });
    if (filters.date_from || filters.date_to) labels.push({
      name: "Fechas",
      value: `${filters.date_from ? shortDate(filters.date_from) : "Inicio"} – ${filters.date_to ? shortDate(filters.date_to) : "Actualidad"}`,
    });
    return labels;
  }, [filters, groupsQuery.data, instructorsQuery.data, learningResultsQuery.data]);

  return (
    <section className="workspace schedule-query-workspace">
      <header className="topbar">
        <div><p className="eyebrow">Panorama académico</p><h1>Matriz Académica</h1><p className="page-intro">Explora la programación mensual y abre cualquier sesión para consultar su detalle.</p></div>
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
        <section className="academic-calendar" aria-label="Calendario de la matriz académica">
          <header className="academic-calendar-toolbar">
            <button type="button" className="calendar-nav-button" onClick={() => moveMonth(-1)} aria-label="Mes anterior">‹</button>
            <div className="calendar-period">
              <span>{schedules.length} sesiones · {scheduledDays} días</span>
              <h2>{monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1)}</h2>
              <div className="calendar-active-filters" aria-label="Filtros activos">
                {activeFilterLabels.map((filter) => <span key={filter.name}><strong>{filter.name}</strong>{filter.value}</span>)}
              </div>
            </div>
            <button type="button" className="calendar-nav-button" onClick={() => moveMonth(1)} aria-label="Mes siguiente">›</button>
          </header>
          <div className="academic-calendar-grid" role="grid">
            {WEEKDAYS.map((weekday) => <div className="calendar-weekday" role="columnheader" key={weekday}>{weekday}</div>)}
            {calendarDays.map((date, index) => {
              if (!date) return <div className="calendar-day calendar-day-empty" key={`empty-${index}`} aria-hidden="true" />;
              const key = `${monthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;
              const daySchedules = schedulesByDate.get(key) ?? [];
              return (
                <div className={`calendar-day${daySchedules.length ? " has-events" : ""}${key === todayKey ? " is-today" : ""}`} role="gridcell" key={key}>
                  <span className="calendar-day-number">{date.getDate()}</span>
                  <div className="calendar-events">
                    {daySchedules.map((schedule) => (
                      <button type="button" className={`calendar-event status-${schedule.status}`} key={schedule.id} onClick={() => setSelectedSchedule(schedule)}>
                        <strong>{schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}</strong>
                        <span>{schedule.group_code} · {schedule.instructor_name}</span>
                        <small>{schedule.environment_name}</small>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {selectedSchedule && (
        <div className="modal-overlay calendar-detail-overlay" role="presentation" onMouseDown={() => setSelectedSchedule(null)}>
          <section className="detail-dialog calendar-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="calendar-detail-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="detail-dialog-header">
              <div><p className="eyebrow">Programación #{selectedSchedule.id}</p><h2 id="calendar-detail-title">{selectedSchedule.group_code}</h2><p>{selectedSchedule.group_name || "Ficha programada"}</p></div>
              <button type="button" className="detail-dialog-close" onClick={() => setSelectedSchedule(null)} aria-label="Cerrar">×</button>
            </header>
            <div className="calendar-detail-grid">
              <span><strong>Fecha</strong>{selectedSchedule.weekday_label}, {selectedSchedule.date}</span>
              <span><strong>Horario</strong>{selectedSchedule.start_time.slice(0, 5)} – {selectedSchedule.end_time.slice(0, 5)}</span>
              <span><strong>Estado</strong><em className={`schedule-status status-${selectedSchedule.status}`}>{STATUS_LABELS[selectedSchedule.status] || "Borrador"}</em></span>
              <span><strong>Instructor</strong>{selectedSchedule.instructor_name}</span>
              <span><strong>Ficha</strong>{selectedSchedule.group_code}{selectedSchedule.group_name ? ` · ${selectedSchedule.group_name}` : ""}</span>
              <span><strong>Programa</strong>{selectedSchedule.training_program_name || "Sin programa"}</span>
              <span><strong>Ambiente</strong>{selectedSchedule.environment_name}</span>
              <span className="calendar-detail-wide"><strong>RAP</strong>{selectedSchedule.learning_result_code || "Sin RAP"}{selectedSchedule.learning_result_description ? ` · ${selectedSchedule.learning_result_description}` : ""}</span>
              <span className="calendar-detail-wide"><strong>Temática</strong>{selectedSchedule.topic_name || "Sin temática registrada"}</span>
            </div>
            <footer className="calendar-detail-footer"><button type="button" className="btn-primary" onClick={() => setSelectedSchedule(null)}>Cerrar detalle</button></footer>
          </section>
        </div>
      )}
    </section>
  );
}
