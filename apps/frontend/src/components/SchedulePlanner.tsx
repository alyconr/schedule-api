import { FormEvent, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { fetchList } from "../api/masterData";
import {
  fetchSchedules,
  createSchedule,
  updateSchedule,
  cancelSchedule,
} from "../api/schedules";
import {
  Instructor,
  Group,
  TrainingProgram,
  Competency,
  LearningResult,
  Environment,
  TimeBlock,
} from "../types/masterData";
import {
  Schedule,
  ScheduleFilters,
  ValidationResult,
} from "../types/schedules";
import { CurrentUser } from "../types/auth";

interface SchedulePlannerProps {
  currentUser: CurrentUser;
}

function calculateDurationHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const diffMinutes = eh * 60 + em - (sh * 60 + sm);
  return diffMinutes > 0 ? Number((diffMinutes / 60).toFixed(1)) : 0;
}

const weekDays = [
  { index: 1, label: "Lunes" },
  { index: 2, label: "Martes" },
  { index: 3, label: "Miércoles" },
  { index: 4, label: "Jueves" },
  { index: 5, label: "Viernes" },
  { index: 6, label: "Sábado" },
];

function getWeekdayFromDate(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day).getDay() : 0;
}

export function SchedulePlanner({ currentUser }: SchedulePlannerProps) {
  const queryClient = useQueryClient();

  // Roles permissions check
  const roles = currentUser.roles || [];
  const isConsulta = roles.includes("consulta") && roles.length === 1;
  const canWrite = roles.includes("admin") || roles.includes("coordinador") || roles.includes("programador");
  const canDelete = roles.includes("admin") || roles.includes("coordinador");

  // State for search filters
  const [filterInstructor, setFilterInstructor] = useState<string>("");
  const [filterGroup, setFilterGroup] = useState<string>("");
  const [filterEnvironment, setFilterEnvironment] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [activeFilters, setActiveFilters] = useState<ScheduleFilters>({});

  // Form states
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [dateVal, setDateVal] = useState("");
  const [groupId, setGroupId] = useState<number | "">("");
  const [programId, setProgramId] = useState<number | "">("");
  const [competencyId, setCompetencyId] = useState<number | "">("");
  const [learningResultId, setLearningResultId] = useState<number | "">("");
  const [instructorId, setInstructorId] = useState<number | "">("");
  const [environmentId, setEnvironmentId] = useState<number | "">("");
  const [blockId, setBlockId] = useState<number | "">("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationHours, setDurationHours] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  // Feedback states
  const [validationStatus, setValidationStatus] = useState<string | null>(null);
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Fetch Master Data
  const masterQueries = useQueries({
    queries: [
      { queryKey: ["instructors"], queryFn: () => fetchList<Instructor>("instructors") },
      { queryKey: ["groups"], queryFn: () => fetchList<Group>("groups") },
      { queryKey: ["training-programs"], queryFn: () => fetchList<TrainingProgram>("training-programs") },
      { queryKey: ["competencies"], queryFn: () => fetchList<Competency>("competencies") },
      { queryKey: ["learning-results"], queryFn: () => fetchList<LearningResult>("learning-results") },
      { queryKey: ["environments"], queryFn: () => fetchList<Environment>("environments") },
      { queryKey: ["time-blocks"], queryFn: () => fetchList<TimeBlock>("time-blocks") },
    ],
  });

  const [
    instructorsQuery,
    groupsQuery,
    programsQuery,
    competenciesQuery,
    learningResultsQuery,
    environmentsQuery,
    timeBlocksQuery,
  ] = masterQueries;

  const instructors = instructorsQuery.data || [];
  const groups = groupsQuery.data || [];
  const programs = programsQuery.data || [];
  const competencies = competenciesQuery.data || [];
  const learningResults = learningResultsQuery.data || [];
  const environments = environmentsQuery.data || [];
  const timeBlocks = timeBlocksQuery.data || [];

  // 2. Fetch Schedules
  const { data: schedules = [], isLoading: schedulesLoading, isError: schedulesError } = useQuery<Schedule[]>({
    queryKey: ["schedules", activeFilters],
    queryFn: () => fetchSchedules(activeFilters),
  });

  // Filter out logically deleted schedules
  const activeSchedules = schedules.filter((s) => s.status !== "cancelled");
  const plannerStats = {
    active: activeSchedules.length,
    warnings: activeSchedules.filter((s) => s.status === "warning").length,
    instructors: new Set(activeSchedules.map((s) => s.instructor_id)).size,
    environments: new Set(activeSchedules.map((s) => s.environment_id)).size,
  };
  const schedulesByWeekday = weekDays.map((day) => ({
    ...day,
    schedules: activeSchedules
      .filter((schedule) => getWeekdayFromDate(schedule.date) === day.index)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  }));

  const getScheduleDisplayData = (schedule: Schedule) => {
    const instructor = instructors.find((x) => x.id === schedule.instructor_id);
    const group = groups.find((x) => x.id === schedule.group_id);
    const environment = environments.find((x) => x.id === schedule.environment_id);
    const rap = learningResults.find((x) => x.id === schedule.learning_result_id);
    const statusClass =
      schedule.status === "validated" || schedule.status === "valid"
        ? "status-validated"
        : schedule.status === "warning"
        ? "status-warning"
        : schedule.status === "blocked"
        ? "status-blocked"
        : "status-idle";
    const statusName =
      schedule.status === "validated" || schedule.status === "valid"
        ? "Válido"
        : schedule.status === "warning"
        ? "Advertencia"
        : schedule.status === "blocked"
        ? "Bloqueado"
        : "Borrador";

    return { instructor, group, environment, rap, statusClass, statusName };
  };

  // Reset form helper
  const resetForm = (keepValidation = false) => {
    setEditingSchedule(null);
    setDateVal("");
    setGroupId("");
    setProgramId("");
    setCompetencyId("");
    setLearningResultId("");
    setInstructorId("");
    setEnvironmentId("");
    setBlockId("");
    setStartTime("");
    setEndTime("");
    setDurationHours("");
    setNotes("");
    setErrorMsg(null);
    if (!keepValidation) {
      setValidationStatus(null);
      setValidations([]);
    }
  };

  // Populate form for editing
  const handleEditInit = (sch: Schedule) => {
    setErrorMsg(null);
    setValidationStatus(null);
    setValidations([]);
    setEditingSchedule(sch);
    setDateVal(sch.date);
    setGroupId(sch.group_id);
    setProgramId(sch.training_program_id || "");
    setCompetencyId(sch.competency_id || "");
    setLearningResultId(sch.learning_result_id);
    setInstructorId(sch.instructor_id);
    setEnvironmentId(sch.environment_id);
    setBlockId(sch.block_id || "");
    setStartTime(sch.start_time);
    setEndTime(sch.end_time);
    setDurationHours(sch.duration_hours);
    setNotes(sch.notes || "");
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: (res) => {
      setValidationStatus(res.status);
      setValidations(res.validations || []);

      if (res.status === "blocked") {
        setErrorMsg("Error: La programación está bloqueada por reglas del negocio.");
      } else {
        queryClient.invalidateQueries({ queryKey: ["schedules"] });
        showSuccess(
          res.status === "warning"
            ? "Horario guardado con advertencias."
            : "Horario programado exitosamente."
        );
        resetForm(true);
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Error al crear la programación.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateSchedule(id, payload),
    onSuccess: (res) => {
      setValidationStatus(res.status);
      setValidations(res.validations || []);

      if (res.status === "blocked") {
        setErrorMsg("Error: La actualización está bloqueada por reglas de negocio.");
      } else {
        queryClient.invalidateQueries({ queryKey: ["schedules"] });
        showSuccess(
          res.status === "warning"
            ? "Horario actualizado con advertencias."
            : "Horario actualizado exitosamente."
        );
        resetForm(true);
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Error al actualizar la programación.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: cancelSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      showSuccess("Horario cancelado correctamente (borrado lógico).");
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Error al cancelar el horario.");
    },
  });

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Event handlers
  const handleFichaChange = (id: number) => {
    setGroupId(id);
    const g = groups.find((x) => x.id === id);
    if (g?.training_program_id) {
      setProgramId(g.training_program_id);
    } else {
      setProgramId("");
    }
  };

  const handleRapChange = (id: number) => {
    setLearningResultId(id);
    const r = learningResults.find((x) => x.id === id);
    if (r?.competency_id) {
      setCompetencyId(r.competency_id);
    } else {
      setCompetencyId("");
    }
  };

  const handleBlockChange = (id: number | "") => {
    setBlockId(id);
    if (id === "") return;
    const b = timeBlocks.find((x) => x.id === id);
    if (b) {
      setStartTime(b.start_time);
      setEndTime(b.end_time);
      setDurationHours(b.duration_minutes / 60);
    }
  };

  const handleTimeChange = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
    if (start && end) {
      const dur = calculateDurationHours(start, end);
      setDurationHours(dur);
    }
  };

  const handleApplyFilters = (e: FormEvent) => {
    e.preventDefault();
    const newFilters: ScheduleFilters = {};
    if (filterInstructor) newFilters.instructor_id = Number(filterInstructor);
    if (filterGroup) newFilters.group_id = Number(filterGroup);
    if (filterEnvironment) newFilters.environment_id = Number(filterEnvironment);
    if (filterDate) newFilters.date = filterDate;
    setActiveFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilterInstructor("");
    setFilterGroup("");
    setFilterEnvironment("");
    setFilterDate("");
    setActiveFilters({});
  };

  const handleCancelClick = (id: number) => {
    if (window.confirm("¿Seguro que deseas cancelar este horario?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!groupId || !learningResultId || !instructorId || !environmentId || !dateVal || !startTime || !endTime) {
      setErrorMsg("Por favor, rellene todos los campos obligatorios.");
      return;
    }

    const calculatedDur = Number(durationHours) || calculateDurationHours(startTime, endTime);
    if (calculatedDur <= 0) {
      setErrorMsg("Error: La hora final debe ser posterior a la de inicio.");
      return;
    }

    const payload: any = {
      instructor_id: Number(instructorId),
      group_id: Number(groupId),
      training_program_id: programId ? Number(programId) : null,
      competency_id: competencyId ? Number(competencyId) : null,
      learning_result_id: Number(learningResultId),
      environment_id: Number(environmentId),
      date: dateVal,
      start_time: startTime,
      end_time: endTime,
      duration_hours: calculatedDur,
      block_id: blockId ? Number(blockId) : null,
      notes: notes || null,
    };

    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="schedule-planner">
      {/* 1. Header & Quick stats */}
      <div className="planner-hero">
        <div>
          <p className="eyebrow">Programación académica</p>
          <h2>Planificación de Horarios</h2>
          <p className="subtitle">
            Organiza la programación académica por instructor, ficha, ambiente y RAP.
          </p>
        </div>
      </div>

      <div className="schedule-summary-grid" aria-label="Resumen de programación">
        <div className="schedule-summary-card">
          <span>Horarios activos</span>
          <strong>{plannerStats.active}</strong>
        </div>
        <div className="schedule-summary-card warning">
          <span>Con advertencias</span>
          <strong>{plannerStats.warnings}</strong>
        </div>
        <div className="schedule-summary-card">
          <span>Instructores programados</span>
          <strong>{plannerStats.instructors}</strong>
        </div>
        <div className="schedule-summary-card">
          <span>Ambientes usados</span>
          <strong>{plannerStats.environments}</strong>
        </div>
      </div>

      {successMsg && <div className="toast toast-success">{successMsg}</div>}
      {errorMsg && <div className="toast toast-error">{errorMsg}</div>}

      {/* 2. Filter panel */}
      <form className="schedule-filters" onSubmit={handleApplyFilters}>
        <div className="filter-heading">
          <span className="eyebrow">Filtros</span>
          <strong>Consulta de agenda</strong>
        </div>
        <div className="filter-fields">
          <label>
            Fecha
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </label>
          <label>
            Instructor
            <select value={filterInstructor} onChange={(e) => setFilterInstructor(e.target.value)}>
              <option value="">Todos los instructores</option>
              {instructors.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.first_name} {ins.last_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ficha / Grupo
            <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
              <option value="">Todas las fichas</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ambiente
            <select value={filterEnvironment} onChange={(e) => setFilterEnvironment(e.target.value)}>
              <option value="">Todos los ambientes</option>
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.code} ({env.name})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="filter-actions">
          <button type="submit" className="btn-primary">Filtrar</button>
          <button type="button" className="btn-secondary" onClick={handleClearFilters}>Limpiar</button>
        </div>
      </form>

      {/* 3. Main Workspace Grid */}
      <div className={`schedule-grid ${isConsulta ? "full-grid" : ""}`}>
        {/* Grilla de listado (Izquierda) */}
        <div className="schedule-table-section">
          {schedulesLoading ? (
            <div className="loader">Cargando programación de horarios...</div>
          ) : schedulesError ? (
            <div className="error-panel">
              <h3>Error al cargar horarios</h3>
              <p>No fue posible conectar con el servidor.</p>
            </div>
          ) : (
            <>
              <section className="week-view-card" aria-label="Vista semanal de programación">
                <div className="week-view-header">
                  <div>
                    <span className="eyebrow">Matriz académica</span>
                    <h3>Vista semanal de programación</h3>
                  </div>
                  <span className="week-view-count">{activeSchedules.length} horarios</span>
                </div>
                <div className="week-grid" role="list">
                  {schedulesByWeekday.map((day) => (
                    <div className="week-day-column" key={day.index}>
                      <div className="week-day-heading">
                        <strong>{day.label}</strong>
                        <span>{day.schedules.length}</span>
                      </div>
                      <div className="week-day-body">
                        {day.schedules.length === 0 ? (
                          <p className="week-empty">Sin programación</p>
                        ) : (
                          day.schedules.map((sch) => {
                            const { instructor, group, environment, rap, statusClass, statusName } =
                              getScheduleDisplayData(sch);
                            return (
                              <button
                                className={`week-schedule-card ${statusClass}`}
                                disabled={!canWrite}
                                key={sch.id}
                                onClick={() => handleEditInit(sch)}
                                title={canWrite ? "Editar horario" : "Modo consulta"}
                                type="button"
                              >
                                <span className="week-schedule-time">
                                  {sch.start_time} - {sch.end_time}
                                </span>
                                <strong>{instructor ? `${instructor.first_name} ${instructor.last_name}` : `ID: ${sch.instructor_id}`}</strong>
                                <span>Ficha {group ? group.code : sch.group_id}</span>
                                <span>{environment ? environment.code : `Ambiente ${sch.environment_id}`}</span>
                                {rap?.code && <span className="week-rap">{rap.code}</span>}
                                <small>{statusName}</small>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="table-responsive">
                <table className="crud-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Horario</th>
                      <th>Instructor</th>
                      <th>Ficha</th>
                      <th>Ambiente</th>
                      <th>RAP</th>
                      <th>Estado</th>
                      {!isConsulta && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {activeSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={isConsulta ? 7 : 8} className="text-center empty-cell">
                          <strong>No hay horarios programados</strong>
                          <span>Ajusta los filtros o registra una nueva programación académica.</span>
                        </td>
                      </tr>
                    ) : (
                      activeSchedules.map((sch) => {
                        const ins = instructors.find((x) => x.id === sch.instructor_id);
                        const grp = groups.find((x) => x.id === sch.group_id);
                        const env = environments.find((x) => x.id === sch.environment_id);
                        const rap = learningResults.find((x) => x.id === sch.learning_result_id);

                        const statusClass =
                          sch.status === "validated" || sch.status === "valid"
                            ? "status-validated"
                            : sch.status === "warning"
                            ? "status-warning"
                            : sch.status === "blocked"
                            ? "status-blocked"
                            : "status-idle";

                        const statusName =
                          sch.status === "validated" || sch.status === "valid"
                            ? "Válido"
                            : sch.status === "warning"
                            ? "Con Alertas"
                            : sch.status === "blocked"
                            ? "Bloqueado"
                            : "Borrador";

                        return (
                          <tr key={sch.id}>
                            <td><strong>{sch.date}</strong></td>
                            <td>
                              <div>{sch.start_time} - {sch.end_time}</div>
                              <small className="text-muted">{sch.duration_hours} hrs</small>
                            </td>
                            <td>{ins ? `${ins.first_name} ${ins.last_name}` : `ID: ${sch.instructor_id}`}</td>
                            <td>{grp ? grp.code : `ID: ${sch.group_id}`}</td>
                            <td>{env ? env.code : `ID: ${sch.environment_id}`}</td>
                            <td>
                              <div className="text-truncate" title={rap?.description}>
                                <strong>{rap?.code}</strong>
                              </div>
                            </td>
                            <td>
                              <span className={`schedule-status ${statusClass}`}>{statusName}</span>
                            </td>
                            {!isConsulta && (
                              <td className="actions-cell">
                                <button className="btn-edit" onClick={() => handleEditInit(sch)}>
                                  Editar
                                </button>
                                {canDelete && (
                                  <button className="btn-delete" onClick={() => handleCancelClick(sch.id)}>
                                    Cancelar
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Formulario e Info de Validación (Derecha - Oculto para consulta) */}
        {!isConsulta && (
          <div className="schedule-form-section">
            <div className="form-card">
              <div className="form-card-header">
                <span className="eyebrow">Panel de programación</span>
                <h3>{editingSchedule ? "Editar Programación" : "Programar Horario"}</h3>
              </div>
              <form onSubmit={handleFormSubmit} className="schedule-form">
                <div className="schedule-form-group">
                  <p className="form-group-title">Horario</p>
                <label className="form-label">
                  Fecha <span className="req">*</span>
                  <input
                    type="date"
                    value={dateVal}
                    onChange={(e) => setDateVal(e.target.value)}
                    required
                  />
                </label>
                </div>

                <div className="schedule-form-group">
                  <p className="form-group-title">Datos académicos</p>
                <label className="form-label">
                  Ficha / Grupo <span className="req">*</span>
                  <select
                    value={groupId}
                    onChange={(e) => handleFichaChange(Number(e.target.value))}
                    required
                  >
                    <option value="">Seleccione ficha...</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} {g.name ? `- ${g.name}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-label">
                  Programa de Formación
                  <select
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Auto-detectado por ficha</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-label">
                  Resultado de Aprendizaje (RAP) <span className="req">*</span>
                  <select
                    value={learningResultId}
                    onChange={(e) => handleRapChange(Number(e.target.value))}
                    required
                  >
                    <option value="">Seleccione RAP...</option>
                    {learningResults.map((lr) => (
                      <option key={lr.id} value={lr.id}>
                        {lr.code} - {lr.description.slice(0, 60)}...
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-label">
                  Competencia Asociada
                  <select
                    value={competencyId}
                    onChange={(e) => setCompetencyId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Auto-detectado por RAP</option>
                    {competencies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.code} - {comp.name.slice(0, 50)}...
                      </option>
                    ))}
                  </select>
                </label>
                </div>

                <div className="schedule-form-group">
                  <p className="form-group-title">Asignación</p>
                <label className="form-label">
                  Instructor <span className="req">*</span>
                  <select
                    value={instructorId}
                    onChange={(e) => setInstructorId(Number(e.target.value))}
                    required
                  >
                    <option value="">Seleccione instructor...</option>
                    {instructors.map((ins) => (
                      <option key={ins.id} value={ins.id}>
                        {ins.first_name} {ins.last_name} ({ins.specialty || "Sin especialidad"})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-label">
                  Ambiente <span className="req">*</span>
                  <select
                    value={environmentId}
                    onChange={(e) => setEnvironmentId(Number(e.target.value))}
                    required
                  >
                    <option value="">Seleccione ambiente...</option>
                    {environments.map((env) => (
                      <option key={env.id} value={env.id}>
                        {env.code} - {env.name} (Capacidad: {env.capacity})
                      </option>
                    ))}
                  </select>
                </label>
                </div>

                <div className="schedule-form-group">
                  <p className="form-group-title">Bloque y duración</p>
                <label className="form-label">
                  Bloque Horario Institucional
                  <select
                    value={blockId}
                    onChange={(e) => handleBlockChange(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Carga manual / Sin bloque</option>
                    {timeBlocks.map((tb) => (
                      <option key={tb.id} value={tb.id}>
                        {tb.name} ({tb.start_time} - {tb.end_time})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="form-row-compact">
                  <label className="form-label">
                    Inicio <span className="req">*</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => handleTimeChange(e.target.value, endTime)}
                      required
                    />
                  </label>
                  <label className="form-label">
                    Fin <span className="req">*</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => handleTimeChange(startTime, e.target.value)}
                      required
                    />
                  </label>
                  <label className="form-label">
                    Horas
                    <input
                      type="number"
                      step="0.1"
                      value={durationHours}
                      onChange={(e) => setDurationHours(e.target.value ? Number(e.target.value) : "")}
                      readOnly
                      className="readonly-input"
                    />
                  </label>
                </div>
                </div>

                <label className="form-label">
                  Notas / Observaciones
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalles de la programación..."
                  />
                </label>

                <div className="form-actions-inline">
                  {editingSchedule && (
                    <button type="button" className="btn-secondary" onClick={() => resetForm()}>
                      Cancelar
                    </button>
                  )}
                  <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingSchedule ? "Actualizar Horario" : "Programar Horario"}
                  </button>
                </div>
              </form>
            </div>

            {/* Panel de retroalimentación de validación */}
            {(validationStatus || validations.length > 0) && (
              <div
                className={`validation-panel validation-panel-${
                  validationStatus === "blocked" ? "blocked" : validationStatus === "warning" ? "warning" : "valid"
                }`}
              >
                <div className="validation-heading">
                  <span className="validation-light" aria-hidden="true"></span>
                  <div>
                    <h4>Resultado de Validación del Backend</h4>
                    <p>
                      {validationStatus === "blocked"
                        ? "Bloqueado por reglas de negocio"
                        : validationStatus === "warning"
                        ? "Guardado con advertencias"
                        : "Programación válida"}
                    </p>
                  </div>
                </div>
                <div className="validation-list">
                  {validations.length === 0 ? (
                    <p className="no-violations">No se detectaron infracciones de reglas de negocio.</p>
                  ) : (
                    validations.map((v, i) => (
                      <div key={i} className={`validation-item val-${v.severity.toLowerCase()}`}>
                        <strong>[{v.rule_code}]</strong> {v.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
