import { FormEvent, useState } from "react";
import { UseQueryResult } from "@tanstack/react-query";
import { Group, Instructor, LearningResult } from "../types/masterData";
import { ScheduleDetailed, ScheduleFilters, ScheduleValidation } from "../types/schedules";
import { fetchScheduleValidations } from "../api/schedules";
import { useQuery } from "@tanstack/react-query";
import { validationRuleLabel } from "./ValidationAlertDialog";
import { SearchableSelect } from "./SearchableSelect";

export function groupLabel(group: Group): string {
  return `${group.code}${group.name ? ` - ${group.name}` : ""}`;
}

export function instructorLabel(instructor: Instructor): string {
  return `${instructor.first_name} ${instructor.last_name}`;
}

export function rapLabel(rap: LearningResult): string {
  return `${rap.code} - ${rap.description.slice(0, 70)}`;
}

export function formatProgrammedDay(dateValue: string): string {
  if (!dateValue) return "Sin fecha";
  const date = new Date(`${dateValue}T00:00:00`);
  const weekday = new Intl.DateTimeFormat("es-CO", { weekday: "long" }).format(date);
  const formattedDate = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formattedDate}`;
}

type ScheduleFilterBarProps = {
  groups: Group[];
  instructors: Instructor[];
  learningResults: LearningResult[];
  onApply: (filters: ScheduleFilters) => void;
  onClear: () => void;
};

export function ScheduleFilterBar({ groups, instructors, learningResults, onApply, onClear }: ScheduleFilterBarProps) {
  const [groupId, setGroupId] = useState<number | "">("");
  const [instructorId, setInstructorId] = useState<number | "">("");
  const [learningResultId, setLearningResultId] = useState<number | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply({
      group_id: groupId === "" ? undefined : Number(groupId),
      instructor_id: instructorId === "" ? undefined : Number(instructorId),
      learning_result_id: learningResultId === "" ? undefined : Number(learningResultId),
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      limit: 500,
    });
  };

  const clear = () => {
    setGroupId("");
    setInstructorId("");
    setLearningResultId("");
    setDateFrom("");
    setDateTo("");
    onClear();
  };

  return (
    <form className="schedule-filters schedule-query-filters" onSubmit={submit}>
      <div className="filter-heading">
        <span className="eyebrow">Filtros</span>
        <strong>Consultar horarios programados</strong>
      </div>
      <div className="filter-fields">
        <SearchableSelect
          label="Ficha"
          value={groupId}
          placeholder="Seleccione ficha..."
          searchPlaceholder="Buscar ficha..."
          options={groups.map((group) => ({ value: group.id, label: groupLabel(group) }))}
          onChange={(value) => setGroupId(value === "" ? "" : Number(value))}
        />
        <SearchableSelect
          label="Instructor"
          value={instructorId}
          placeholder="Seleccione instructor..."
          searchPlaceholder="Buscar instructor..."
          options={instructors.map((instructor) => ({ value: instructor.id, label: instructorLabel(instructor) }))}
          onChange={(value) => setInstructorId(value === "" ? "" : Number(value))}
        />
        <SearchableSelect
          label="RAP"
          value={learningResultId}
          placeholder="Todos los RAP"
          searchPlaceholder="Buscar RAP..."
          options={learningResults.map((rap) => ({ value: rap.id, label: rapLabel(rap) }))}
          onChange={(value) => setLearningResultId(value === "" ? "" : Number(value))}
        />
        <label>
          Fecha inicio
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label>
          Fecha fin
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
      </div>
      <div className="filter-actions">
        <button type="submit" className="btn-primary">Consultar</button>
        <button type="button" className="btn-secondary" onClick={clear}>Limpiar</button>
      </div>
    </form>
  );
}

type ScheduleQueryStatusProps = {
  hasFilter: boolean;
  query: UseQueryResult<ScheduleDetailed[]>;
};

export function ScheduleQueryStatus({ hasFilter, query }: ScheduleQueryStatusProps) {
  if (!hasFilter) {
    return <div className="empty-panel">Seleccione una ficha o un instructor para consultar horarios programados.</div>;
  }
  if (query.isLoading) {
    return <div className="loader">Cargando horarios programados...</div>;
  }
  if (query.isError) {
    return (
      <div className="error-panel">
        <h3>Error al cargar horarios</h3>
        <p>No fue posible cargar la programación.</p>
      </div>
    );
  }
  if ((query.data ?? []).length === 0) {
    return <div className="empty-panel">No hay horarios programados para los filtros seleccionados.</div>;
  }
  return null;
}

type ScheduleWarningDialogProps = {
  schedule: ScheduleDetailed;
  onClose: () => void;
};

export function ScheduleWarningDialog({ schedule, onClose }: ScheduleWarningDialogProps) {
  const validationsQuery = useQuery<ScheduleValidation[]>({
    queryKey: ["schedule-validations", schedule.id],
    queryFn: () => fetchScheduleValidations(schedule.id),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const items = validationsQuery.data ?? [];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="warning-detail-title" onMouseDown={onClose}>
      <div className="warning-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header-row">
          <div>
            <span className="eyebrow">Advertencias del horario</span>
            <h3 id="warning-detail-title">Horario #{schedule.id}</h3>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
        <div className="warning-schedule-summary">
          <span><strong>Fecha:</strong> {schedule.date}</span>
          <span><strong>Horario:</strong> {schedule.start_time} - {schedule.end_time}</span>
          <span><strong>Ficha:</strong> {schedule.group_code}</span>
          <span><strong>Instructor:</strong> {schedule.instructor_name}</span>
          <span><strong>Ambiente:</strong> {schedule.environment_name}</span>
        </div>
        {validationsQuery.isLoading ? (
          <p className="expanded-filter-empty">Cargando advertencias...</p>
        ) : validationsQuery.isError ? (
          <p className="expanded-filter-empty">No fue posible cargar las advertencias.</p>
        ) : items.length === 0 ? (
          <p className="expanded-filter-empty">Este horario no tiene advertencias registradas.</p>
        ) : (
          <div className="warning-list">
            {items.map((validation) => (
              <article className={`warning-detail-item severity-${validation.severity.toLowerCase()}`} key={validation.id}>
                <div className="warning-detail-heading">
                  <strong>{validationRuleLabel(validation.rule_code)}</strong>
                  <span>{validation.severity === "BLOCKING" ? "Bloqueante" : validation.severity === "WARNING" ? "Advertencia" : "Información"}</span>
                </div>
                <p>{validation.message}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
