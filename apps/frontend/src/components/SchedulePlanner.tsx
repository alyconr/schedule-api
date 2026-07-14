import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { fetchList } from "../api/masterData";
import {
  fetchSchedules,
  createSchedule,
  updateSchedule,
  cancelSchedule,
  deleteSchedule,
  fetchScheduleValidations,
} from "../api/schedules";
import { getTopicSelection } from "../api/topics";
import {
  Instructor,
  Group,
  TrainingProgram,
  Competency,
  LearningResult,
  Environment,
  TimeBlock,
  ContractType,
} from "../types/masterData";
import {
  Schedule,
  ScheduleFilters,
  ValidationResult,
} from "../types/schedules";
import { CurrentUser } from "../types/auth";
import { useToast } from "./ToastProvider";
import { ConfirmDialog } from "./ConfirmDialog";
import { DetailDialog } from "./DetailDialog";
import { ValidationAlertDialog, validationRuleLabel } from "./ValidationAlertDialog";
import { SearchableSelect } from "./SearchableSelect";

interface SchedulePlannerProps {
  currentUser: CurrentUser;
  setActiveTab: (tab: string) => void;
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

function noteValue(notes: string | undefined | null, label: string): string {
  const match = notes?.match(new RegExp(`${label}:\\s*([^|]+)`, "i"));
  return match?.[1]?.trim() || "";
}

function trimesterFromRapCode(code: string): string {
  const match = code.match(/(?:TRIMESTRE_|T)([IVX0-9]+)/i);
  return match ? `T${match[1].replace(/_/g, " ")}` : "";
}

function includesSearch(value: string, search: string): boolean {
  return normalizeSearchText(value).includes(normalizeSearchText(search.trim()));
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeRapDescription(value: string): string {
  return normalizeSearchText(value).replace(/^\s*\d+\s*[\.\-:]?\s*/, "");
}

function toLocalIsoDate(date: Date): string {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
}

function dateFromIso(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
}

function datesForWeekdays(startValue: string, endValue: string, weekdays: number[]): string[] {
  const current = dateFromIso(startValue);
  const end = dateFromIso(endValue);
  if (!current || !end) return [];
  const dates: string[] = [];
  while (current <= end) {
    if (weekdays.includes(current.getDay())) dates.push(toLocalIsoDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function getDefaultTrimesterRange(): ScheduleFilters {
  return { date_from: "", date_to: "", limit: 500 };
}

function formatProgrammedDay(dateValue: string): string {
  if (!dateValue) return "Sin fecha";
  const date = new Date(`${dateValue}T00:00:00`);
  const weekday = new Intl.DateTimeFormat("es-CO", { weekday: "long" }).format(date);
  const formattedDate = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formattedDate}`;
}

const MAX_WEEKDAY_CARDS = 30;

export function SchedulePlanner({ currentUser, setActiveTab }: SchedulePlannerProps) {
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
  const [trimesterStartDate, setTrimesterStartDate] = useState("");
  const [trimesterEndDate, setTrimesterEndDate] = useState("");
  const [activeFilters, setActiveFilters] = useState<ScheduleFilters>(() => getDefaultTrimesterRange());

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
  const [rapSearch, setRapSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [programSearch, setProgramSearch] = useState("");
  const [competencySearch, setCompetencySearch] = useState("");
  const [instructorSearch, setInstructorSearch] = useState("");
  const [environmentSearch, setEnvironmentSearch] = useState("");
  const [blockSearch, setBlockSearch] = useState("");
  const [filterInstructorSearch, setFilterInstructorSearch] = useState("");
  const [learningResultTopicId, setLearningResultTopicId] = useState<number | "">("");
  const [manualTopicName, setManualTopicName] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const deferredRapSearch = useDeferredValue(rapSearch);

  // Feedback states
  const { addToast } = useToast();
  const [validationStatus, setValidationStatus] = useState<string | null>(null);
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [detailSchedule, setDetailSchedule] = useState<Schedule | null>(null);
  const [showBlockingAlert, setShowBlockingAlert] = useState(false);
  const [warningSchedule, setWarningSchedule] = useState<Schedule | null>(null);
  const selectedLearningResultId = typeof learningResultId === "number" ? learningResultId : undefined;
  const selectedProgramId = typeof programId === "number" ? programId : undefined;

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
      { queryKey: ["contract-types"], queryFn: () => fetchList<ContractType>("contract-types") },
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
    contractTypesQuery,
  ] = masterQueries;

  const instructors = instructorsQuery.data || [];
  const groups = groupsQuery.data || [];
  const programs = programsQuery.data || [];
  const competencies = competenciesQuery.data || [];
  const learningResults = learningResultsQuery.data || [];
  const environments = environmentsQuery.data || [];
  const timeBlocks = timeBlocksQuery.data || [];
const contractTypes = contractTypesQuery.data || [];
  const hasMasterData = instructors.length > 0 && groups.length > 0 && environments.length > 0 && learningResults.length > 0;

  // useMemo maps for fast lookups
  const instructorsById = useMemo(() => new Map(instructors.map((i) => [i.id, i])), [instructors]);
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const programsById = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs]);
  const environmentsById = useMemo(() => new Map(environments.map((e) => [e.id, e])), [environments]);
  const learningResultsById = useMemo(() => new Map(learningResults.map((lr) => [lr.id, lr])), [learningResults]);
  const contractTypesById = useMemo(() => new Map(contractTypes.map((ct) => [ct.id, ct])), [contractTypes]);
  const programIdsWithGroups = useMemo(
    () => new Set(groups.map((group) => group.training_program_id).filter((id): id is number => typeof id === "number")),
    [groups]
  );

  // rap search autocomplete
  const selectedProgram = selectedProgramId ? programsById.get(selectedProgramId) : undefined;

  const programTopicsQuery = useQuery({
    queryKey: ["program-topics", selectedProgramId],
    queryFn: () => getTopicSelection({ training_program_id: selectedProgramId }),
    enabled: Boolean(selectedProgramId),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const programTopics = programTopicsQuery.data ?? [];
  const linkedLearningResults = useMemo<LearningResult[]>(() => {
    const byId = new Map<number, LearningResult>();
    programTopics.forEach((topic) => {
      if (!byId.has(topic.learning_result_id)) {
        byId.set(topic.learning_result_id, {
          id: topic.learning_result_id,
          code: topic.learning_result_code,
          description: topic.learning_result_description,
        });
      }
    });
    return Array.from(byId.values());
  }, [programTopics]);
  const rapSource =
    selectedProgramId && (programTopicsQuery.isLoading || linkedLearningResults.length > 0)
      ? linkedLearningResults
      : learningResults;
  const rapSourceById = useMemo(() => new Map(rapSource.map((lr) => [lr.id, lr])), [rapSource]);
  const selectedRapOption = selectedLearningResultId
    ? rapSourceById.get(selectedLearningResultId) || learningResultsById.get(selectedLearningResultId)
    : undefined;

  const rapAliasDescriptions = useMemo(() => {
    const term = normalizeSearchText(deferredRapSearch.trim());
    if (!term || rapSource === learningResults) return new Set<string>();
    return new Set(
      learningResults
        .filter((lr) => normalizeSearchText(`${lr.code} ${lr.description}`).includes(term))
        .map((lr) => normalizeRapDescription(lr.description))
    );
  }, [learningResults, rapSource, deferredRapSearch]);

  const rapOptions = useMemo(() => {
    const term = normalizeSearchText(deferredRapSearch.trim());
    if (!term) return rapSource.slice(0, 20);
    return rapSource
      .filter(
        (lr) =>
          normalizeSearchText(`${lr.code} ${lr.description}`).includes(term) ||
          rapAliasDescriptions.has(normalizeRapDescription(lr.description))
      )
      .slice(0, 20);
  }, [rapSource, deferredRapSearch, rapAliasDescriptions]);

  // rapTopics query
  const rapTopicsQuery = useQuery({
    queryKey: ["rap-topics", selectedLearningResultId, selectedProgramId],
    queryFn: () => getTopicSelection({ learning_result_id: selectedLearningResultId, training_program_id: selectedProgramId }),
    enabled: Boolean(selectedLearningResultId && selectedProgramId),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const rapTopics = rapTopicsQuery.data ?? [];

  const allTopicsQuery = useQuery({
    queryKey: ["topic-selection-all"],
    queryFn: () => getTopicSelection(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const topicsByRelationId = useMemo(() => {
    const map = new Map<number, string>();
    (allTopicsQuery.data ?? []).forEach((topic) => {
      if (topic.learning_result_topic_id) map.set(topic.learning_result_topic_id, topic.topic_name);
    });
    return map;
  }, [allTopicsQuery.data]);

  useEffect(() => {
    if (!selectedLearningResultId || !selectedProgramId) {
      setLearningResultTopicId("");
      setManualTopicName("");
      return;
    }
    if (rapTopicsQuery.isLoading) return;
    if (rapTopics.length === 1 && rapTopics[0].learning_result_topic_id) {
      setLearningResultTopicId(rapTopics[0].learning_result_topic_id);
      setManualTopicName("");
    } else if (!rapTopics.some((topic) => topic.learning_result_topic_id === learningResultTopicId)) {
      setLearningResultTopicId("");
    }
  }, [selectedLearningResultId, selectedProgramId, rapTopics, rapTopicsQuery.isLoading, learningResultTopicId]);

  const instructorLabel = (ins: Instructor) => {
    const vinculation = contractTypesById.get(ins.contract_type_id ?? -1)?.name || "sin vinculación";
    return `${ins.first_name} ${ins.last_name} - ${vinculation} - max ${ins.weekly_max_hours} h`;
  };
  const groupLabel = (group: Group) => {
    const trimester = noteValue(group.notes, "Trimestre");
    return `${group.code}${group.name ? ` - ${group.name}` : ""}${group.jornada ? ` - ${group.jornada}` : ""}${trimester ? ` - ${trimester}` : ""}`;
  };
  const environmentLabel = (env: Environment) => `${env.code} - ${env.location || env.name}`;
  const rapLabel = (rap: LearningResult) => {
    const trimester = trimesterFromRapCode(rap.code);
    return `${rap.code}${trimester ? ` - ${trimester}` : ""} - ${rap.description.slice(0, 70)}`;
  };

  const filteredGroups = useMemo(
    () => groups.filter((g) => includesSearch(groupLabel(g), groupSearch)),
    [groups, groupSearch]
  );
  const filteredPrograms = useMemo(
    () =>
      programs.filter(
        (p) =>
          (programIdsWithGroups.size === 0 || programIdsWithGroups.has(p.id)) &&
          includesSearch(`${p.code} ${p.name}`, programSearch)
      ),
    [programs, programIdsWithGroups, programSearch]
  );
  const filteredCompetencies = useMemo(
    () => competencies.filter((comp) => includesSearch(`${comp.code} ${comp.name}`, competencySearch)),
    [competencies, competencySearch]
  );
  const filteredInstructors = useMemo(
    () => instructors.filter((ins) => includesSearch(instructorLabel(ins), instructorSearch)),
    [instructors, instructorSearch, contractTypesById]
  );
  const filteredEnvironments = useMemo(
    () => environments.filter((env) => includesSearch(environmentLabel(env), environmentSearch)),
    [environments, environmentSearch]
  );
  const filteredTimeBlocks = useMemo(
    () => timeBlocks.filter((tb) => includesSearch(`${tb.name} ${tb.start_time} ${tb.end_time}`, blockSearch)),
    [timeBlocks, blockSearch]
  );
  const filteredFilterInstructors = useMemo(
    () => instructors.filter((ins) => includesSearch(instructorLabel(ins), filterInstructorSearch)),
    [instructors, filterInstructorSearch, contractTypesById]
  );
  // 2. Fetch Schedules
const {
  data: schedules = [],
  isLoading: schedulesLoading,
  isError: schedulesError,
  isFetching: schedulesFetching,
} = useQuery<Schedule[]>({
  queryKey: ["schedules", activeFilters],
  queryFn: () => fetchSchedules({ ...activeFilters, include_inactive: true }),
  staleTime: 60 * 1000,
  refetchOnWindowFocus: false,
  placeholderData: (previousData) => previousData,
});

// Keep deleted rows visible in the table, but out of the active weekly matrix.
  const activeSchedules = useMemo(
    () => schedules.filter((s) => !["cancelled", "deleted"].includes(s.status)),
    [schedules]
  );
  const visibleSchedules = useMemo(() => schedules.slice(0, 100), [schedules]);
  const plannerStats = useMemo(() => ({
    active: activeSchedules.length,
    warnings: activeSchedules.filter((s) => s.status === "warning").length,
    instructors: new Set(activeSchedules.map((s) => s.instructor_id)).size,
    environments: new Set(activeSchedules.map((s) => s.environment_id)).size,
  }), [activeSchedules]);
const schedulesByWeekday = useMemo(() => weekDays.map((day) => {
  const allDaySchedules = activeSchedules
    .filter((schedule) => getWeekdayFromDate(schedule.date) === day.index)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  return { ...day, total: allDaySchedules.length, schedules: allDaySchedules.slice(0, MAX_WEEKDAY_CARDS) };
}), [activeSchedules]);

const warningValidationsQuery = useQuery({
  queryKey: ["schedule-validations", warningSchedule?.id],
  queryFn: () => fetchScheduleValidations(Number(warningSchedule?.id)),
  enabled: Boolean(warningSchedule?.id),
  staleTime: 60 * 1000,
  refetchOnWindowFocus: false,
});

const getScheduleDisplayData = (schedule: Schedule) => {
    const instructor = instructorsById.get(schedule.instructor_id);
    const group = groupsById.get(schedule.group_id);
    const environment = environmentsById.get(schedule.environment_id);
    const rap = learningResultsById.get(schedule.learning_result_id);
    const topicName =
      schedule.manual_topic_name ||
      (schedule.learning_result_topic_id ? topicsByRelationId.get(schedule.learning_result_topic_id) : "") ||
      "";
    const statusClass =
      schedule.status === "validated" || schedule.status === "valid"
        ? "status-validated"
        : schedule.status === "warning"
        ? "status-warning"
        : schedule.status === "blocked"
        ? "status-blocked"
        : schedule.status === "cancelled"
        ? "status-cancelled"
        : schedule.status === "deleted"
        ? "status-deleted"
        : "status-idle";
    const statusName =
      schedule.status === "validated" || schedule.status === "valid"
        ? "Válido"
        : schedule.status === "warning"
        ? "Advertencia"
        : schedule.status === "blocked"
        ? "Bloqueado"
        : schedule.status === "cancelled"
        ? "Cancelado"
        : schedule.status === "deleted"
        ? "Eliminado"
        : "Borrador";

    return { instructor, group, environment, rap, topicName, statusClass, statusName };
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
    setRapSearch("");
    setGroupSearch("");
    setProgramSearch("");
    setCompetencySearch("");
    setInstructorSearch("");
    setEnvironmentSearch("");
    setBlockSearch("");
    setLearningResultTopicId("");
    setManualTopicName("");
    setSelectedWeekdays([]);
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
    setLearningResultTopicId(sch.learning_result_topic_id || "");
    setManualTopicName(sch.manual_topic_name || "");
    setSelectedWeekdays([getWeekdayFromDate(sch.date)]);
    const rap = learningResultsById.get(sch.learning_result_id);
    const group = groupsById.get(sch.group_id);
    if (group?.start_date && !trimesterStartDate) setTrimesterStartDate(group.start_date);
    if (group?.end_date && !trimesterEndDate) setTrimesterEndDate(group.end_date);
    const program = sch.training_program_id ? programsById.get(sch.training_program_id) : undefined;
    const competency = sch.competency_id ? competencies.find((comp) => comp.id === sch.competency_id) : undefined;
    const instructor = instructorsById.get(sch.instructor_id);
    const environment = environmentsById.get(sch.environment_id);
    const block = sch.block_id ? timeBlocks.find((tb) => tb.id === sch.block_id) : undefined;
    setGroupSearch(group ? groupLabel(group) : "");
    setProgramSearch(program ? `${program.code} - ${program.name}` : "");
    setCompetencySearch(competency ? `${competency.code} - ${competency.name}` : "");
    setInstructorSearch(instructor ? instructorLabel(instructor) : "");
    setEnvironmentSearch(environment ? environmentLabel(environment) : "");
    setBlockSearch(block ? `${block.name} ${block.start_time} - ${block.end_time}` : "");
    setRapSearch(rap ? `${rap.code} - ${rap.description.slice(0, 100)}` : "");
  };

// Mutations
  const createMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: (res) => {
      setValidationStatus(res.status);
      setValidations(res.validations || []);
      setShowBlockingAlert((res.validations || []).some((item) => item.is_blocking || item.severity === "BLOCKING"));

      if (res.status === "blocked") {
        setErrorMsg("Error: La programación está bloqueada por reglas del negocio.");
      } else {
        queryClient.invalidateQueries({ queryKey: ["schedules"] });
        addToast(
          "success",
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
      setShowBlockingAlert((res.validations || []).some((item) => item.is_blocking || item.severity === "BLOCKING"));

      if (res.status === "blocked") {
        setErrorMsg("Error: La actualización está bloqueada por reglas de negocio.");
      } else {
        queryClient.invalidateQueries({ queryKey: ["schedules"] });
        addToast(
          "success",
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

const cancelMutation = useMutation({
    mutationFn: cancelSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      addToast("success", "Horario cancelado correctamente.");
    },
    onError: (err: any) => {
      addToast("error", err.message || "Error al cancelar el horario.");
    },
  });

const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      addToast("success", "Horario eliminado correctamente.");
    },
    onError: (err: any) => {
      addToast("error", err.message || "Error al eliminar el horario.");
    },
});

  // Event handlers
  const handleFichaChange = (id: number | "") => {
    setLearningResultId("");
    setCompetencyId("");
    setRapSearch("");
    if (id === "") {
      setGroupId("");
      setProgramId("");
      setGroupSearch("");
      setProgramSearch("");
      setLearningResultTopicId("");
      setManualTopicName("");
      return;
    }
    setGroupId(id);
    const g = groups.find((x) => x.id === id);
    if (g?.start_date && !trimesterStartDate) setTrimesterStartDate(g.start_date);
    if (g?.end_date && !trimesterEndDate) setTrimesterEndDate(g.end_date);
    setGroupSearch(g ? groupLabel(g) : "");
    if (g?.training_program_id) {
      setProgramId(g.training_program_id);
      const program = programsById.get(g.training_program_id);
      setProgramSearch(program ? `${program.code} - ${program.name}` : "");
    } else {
      setProgramId("");
      setProgramSearch("");
    }
    setLearningResultTopicId("");
    setManualTopicName("");
  };

  const handleRapChange = (id: number) => {
    setLearningResultId(id);
    const r = rapSourceById.get(id) || learningResultsById.get(id);
    setCompetencyId(r?.competency_id || "");
    setLearningResultTopicId("");
    setManualTopicName("");
    if (r) setRapSearch(`${r.code} - ${r.description.slice(0, 100)}`);
  };

  const handleBlockChange = (id: number | "") => {
    setBlockId(id);
    if (id === "") {
      setBlockSearch("");
      return;
    }
    const b = timeBlocks.find((x) => x.id === id);
    if (b) {
      setBlockSearch(`${b.name} ${b.start_time} - ${b.end_time}`);
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
    setErrorMsg(null);
    if (!trimesterStartDate || !trimesterEndDate) {
      setErrorMsg("Debe seleccionar la fecha de inicio y fin del trimestre.");
      return;
    }
    if (trimesterStartDate > trimesterEndDate) {
      setErrorMsg("La fecha de inicio del trimestre no puede ser mayor a la fecha fin.");
      return;
    }
    const newFilters: ScheduleFilters = { date_from: trimesterStartDate, date_to: trimesterEndDate, limit: 500 };
    if (filterInstructor) newFilters.instructor_id = Number(filterInstructor);
    if (filterGroup) newFilters.group_id = Number(filterGroup);
    if (filterEnvironment) newFilters.environment_id = Number(filterEnvironment);
    setActiveFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilterInstructor("");
    setFilterGroup("");
    setFilterEnvironment("");
    setTrimesterStartDate("");
    setTrimesterEndDate("");
    setFilterInstructorSearch("");
    setActiveFilters(getDefaultTrimesterRange());
  };

  const handleCancelClick = (id: number) => {
    setConfirmCancelId(id);
  };

  const handleDeleteClick = (id: number) => {
    setConfirmDeleteId(id);
  };

  const toggleWeekday = (weekdayIndex: number) => {
    setSelectedWeekdays((current) =>
      current.includes(weekdayIndex)
        ? current.filter((day) => day !== weekdayIndex)
        : [...current, weekdayIndex].sort((a, b) => a - b)
    );
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!trimesterStartDate || !trimesterEndDate) {
      setErrorMsg("Debe seleccionar la fecha de inicio y fin del trimestre.");
      return;
    }
    if (trimesterStartDate > trimesterEndDate) {
      setErrorMsg("La fecha de inicio del trimestre no puede ser mayor a la fecha fin.");
      return;
    }

    if (!groupId || !learningResultId || !instructorId || !environmentId || (editingSchedule && !dateVal) || !startTime || !endTime) {
      setErrorMsg("Por favor, rellene todos los campos obligatorios.");
      return;
    }
    if (!editingSchedule && selectedWeekdays.length === 0) {
      setErrorMsg("Seleccione al menos un día de lunes a sábado para programar el RAP.");
      return;
    }

    const calculatedDur = Number(durationHours) || calculateDurationHours(startTime, endTime);
    if (calculatedDur <= 0) {
      setErrorMsg("Error: La hora final debe ser posterior a la de inicio.");
      return;
    }
    const cleanedManualTopic = manualTopicName.trim();
    if (!selectedProgramId) {
      setErrorMsg("Seleccione primero una ficha o programa de formación para consultar la temática del RAP.");
      return;
    }
    if (rapTopics.length > 0 && !learningResultTopicId) {
      setErrorMsg("Seleccione la temática asociada al RAP.");
      return;
    }
    if (rapTopics.length === 0 && !cleanedManualTopic) {
      setErrorMsg("Registre una temática manual para este RAP.");
      return;
    }

    const targetDates = editingSchedule
      ? [dateVal]
      : datesForWeekdays(trimesterStartDate, trimesterEndDate, selectedWeekdays);
    if (targetDates.length === 0) {
      setErrorMsg("No hay fechas dentro del trimestre que coincidan con los días seleccionados.");
      return;
    }

    const basePayload: any = {
      instructor_id: Number(instructorId),
      group_id: Number(groupId),
      training_program_id: programId ? Number(programId) : null,
      competency_id: competencyId ? Number(competencyId) : null,
      learning_result_id: Number(learningResultId),
      learning_result_topic_id: learningResultTopicId ? Number(learningResultTopicId) : null,
      manual_topic_name: learningResultTopicId ? null : cleanedManualTopic,
      environment_id: Number(environmentId),
      start_time: startTime,
      end_time: endTime,
      duration_hours: calculatedDur,
      block_id: blockId ? Number(blockId) : null,
      notes: notes || null,
    };

    if (editingSchedule) {
      const payload = { ...basePayload, date: dateVal, weekday: getWeekdayFromDate(dateVal) };
      updateMutation.mutate({ id: editingSchedule.id, payload });
    } else if (targetDates.length === 1) {
      const payload = { ...basePayload, date: targetDates[0], weekday: getWeekdayFromDate(targetDates[0]) };
      createMutation.mutate(payload);
    } else {
      setIsBulkSubmitting(true);
      const blockedDays: string[] = [];
      const warnings: ValidationResult[] = [];
      let savedCount = 0;
      try {
        for (const targetDate of targetDates) {
          const result = await createSchedule({
            ...basePayload,
            date: targetDate,
            weekday: getWeekdayFromDate(targetDate),
          });
          warnings.push(...(result.validations || []));
          if (result.status === "blocked") {
            blockedDays.push(targetDate);
          } else {
            savedCount += 1;
          }
        }
        setValidationStatus(blockedDays.length ? "blocked" : warnings.length ? "warning" : "validated");
        setValidations(warnings);
        setShowBlockingAlert(blockedDays.length > 0);
        queryClient.invalidateQueries({ queryKey: ["schedules"] });
        if (blockedDays.length) {
          setErrorMsg(`No se pudieron programar estos días por reglas de negocio: ${blockedDays.join(", ")}.`);
        } else {
          addToast("success", `${savedCount} horarios programados correctamente.`);
          resetForm(true);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Error al programar los días seleccionados.");
      } finally {
        setIsBulkSubmitting(false);
      }
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

      {errorMsg && <div className="toast toast-error">{errorMsg}</div>}
      {!hasMasterData && !isConsulta && (
        <div className="empty-panel">Primero cargue el archivo normalizado desde Carga Masiva.</div>
      )}

      {/* 2. Filter panel */}
      <form className="schedule-filters" onSubmit={handleApplyFilters}>
        <div className="filter-heading">
          <span className="eyebrow">Filtros</span>
          <strong>Consulta de agenda</strong>
        </div>
        <div className="filter-fields">
          <label>
            Fecha inicio trimestre <span className="req">*</span>
            <input type="date" value={trimesterStartDate} onChange={(e) => setTrimesterStartDate(e.target.value)} required />
          </label>
          <label>
            Fecha fin trimestre <span className="req">*</span>
            <input type="date" value={trimesterEndDate} onChange={(e) => setTrimesterEndDate(e.target.value)} required />
          </label>
          <SearchableSelect label="Instructor" value={filterInstructor} placeholder="Todos los instructores" searchPlaceholder="Buscar instructor..." options={instructors.map((ins) => ({ value: ins.id, label: instructorLabel(ins) }))} onChange={(value) => setFilterInstructor(String(value))} />
                </div>
                <div className="filter-actions">
                  <button type="submit" className="btn-primary">Consultar trimestre</button>
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
                    {schedulesFetching && !schedulesLoading && (
                      <div className="soft-loading-indicator">Actualizando programación...</div>
                    )}
                    <section className="week-view-card" aria-label="Vista de programación por días">
                      <div className="week-view-header">
                        <div>
                          <span className="eyebrow">Matriz académica</span>
                          <h3>Vista de programación por días</h3>
                        </div>
                        <span className="week-view-count">{activeSchedules.length} horarios</span>
                        <button className="btn-secondary btn-expand-matrix" onClick={() => setActiveTab("schedule-matrix")} type="button">
                          Ver matriz académica
                        </button>
                      </div>
                      <div className="week-grid" role="list">
                        {schedulesByWeekday.map((day) => (
                          <div className="week-day-column" key={day.index}>
                            <div className="week-day-heading">
                              <strong>{day.label}</strong>
                              <span>{day.total}</span>
                            </div>
                            <div className="week-day-body">
                              {day.schedules.length === 0 ? (
  <p className="week-empty">Sin programación</p>
) : (
  <>
    {day.schedules.map((sch) => {
      const { instructor, environment, rap, topicName, statusClass } = getScheduleDisplayData(sch);
      return (
        <button className={`week-schedule-card ${statusClass}`} disabled={!canWrite} key={sch.id}
          onClick={() => handleEditInit(sch)} title={canWrite ? "Editar horario" : "Modo consulta"} type="button"
        >
          <span className="week-schedule-date">{formatProgrammedDay(sch.date)}</span>
          <span className="week-schedule-time">{sch.start_time} - {sch.end_time}</span>
          <span><strong>Instructor:</strong> {instructor ? `${instructor.first_name} ${instructor.last_name}` : `ID ${sch.instructor_id}`}</span>
          <span><strong>Ambiente:</strong> {environment ? `${environment.code} - ${environment.name}` : `ID ${sch.environment_id}`}</span>
          <span className="week-rap"><strong>RAP:</strong> {rap ? rapLabel(rap) : `ID ${sch.learning_result_id}`}</span>
          <span className="week-topic"><strong>Temática:</strong> {topicName || "Sin temática"}</span>
        </button>
      );
    })}
    {day.total > MAX_WEEKDAY_CARDS && (
      <p className="week-empty">Mostrando {MAX_WEEKDAY_CARDS} de {day.total}. Usa filtros para reducir resultados.</p>
    )}
  </>
)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="week-view-card" style={{ marginTop: "24px" }} aria-label="Listado de horarios programados">
                      <div className="week-view-header">
                        <div>
                          <span className="eyebrow">Programación detallada</span>
                          <h3>Listado de horarios</h3>
                        </div>
                        <span className="week-view-count">{schedules.length} registros</span>
                        <button className="btn-secondary" onClick={() => setActiveTab("schedule-detail")} type="button">
                          Ver programación detallada
                        </button>
                      </div>

                      <div className="table-responsive">
                        <table className="crud-table">
                          <thead>
                            <tr>
                              <th>Días programados</th><th>Horario</th><th>Instructor</th><th>Ficha</th><th>Ambiente</th><th>RAP</th><th>Estado</th>
                              {!isConsulta && <th>Acciones</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {schedules.length === 0 ? (
                              <tr>
                                <td colSpan={isConsulta ? 7 : 8} className="text-center empty-cell">
                                  <strong>No hay horarios programados</strong>
                                  <span>Ajusta los filtros o registra una nueva programación académica.</span>
                                </td>
                              </tr>
                            ) : (
                              visibleSchedules.map((sch) => {
                                const ins = instructorsById.get(sch.instructor_id);
                                const grp = groupsById.get(sch.group_id);
                                const env = environmentsById.get(sch.environment_id);
                                const rap = learningResultsById.get(sch.learning_result_id);
                                const { topicName, statusClass, statusName } = getScheduleDisplayData(sch);
                                const isCancelled = sch.status === "cancelled";
                                const isDeleted = sch.status === "deleted";
                                return (
                                  <tr
                                    key={sch.id}
                                    className="clickable-row"
                                    tabIndex={0}
                                    onClick={(event) => {
                                      if (!(event.target as HTMLElement).closest("button, input, a, select, textarea, label")) setDetailSchedule(sch);
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                                        event.preventDefault();
                                        setDetailSchedule(sch);
                                      }
                                    }}
                                    aria-label={`Ver detalle del horario ${sch.id}`}
                                  >
                                    <td>{formatProgrammedDay(sch.date)}</td>
                                    <td>{sch.start_time} - {sch.end_time}</td>
                                    <td>{ins ? `${ins.first_name} ${ins.last_name}` : `ID ${sch.instructor_id}`}</td>
                                    <td>{grp ? grp.code : `ID ${sch.group_id}`}</td>
                                    <td>{env ? env.name : `ID ${sch.environment_id}`}</td>
                                    <td>
                                      {rap ? rap.code : `ID ${sch.learning_result_id}`}
                                      {topicName && <small className="schedule-topic-note">{topicName}</small>}
                                    </td>
                                    <td><span className={`schedule-status ${statusClass}`}>{statusName}</span></td>
                                    {!isConsulta && (
                                      <td className="actions-cell">
                                        {isDeleted ? (
                                          <span className="row-action-state">Eliminado</span>
                                        ) : isCancelled ? (
                                          <>
                                            <span className="row-action-state">Cancelado</span>
                                            {canDelete && (
                                              <button type="button" className="btn-delete" onClick={() => handleDeleteClick(sch.id)}>Eliminar</button>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            {canWrite && (
                                              <button type="button" className="btn-edit" onClick={() => handleEditInit(sch)}>Editar</button>
                                            )}
                                            {canWrite && (
                                              <button type="button" className="btn-cancel" onClick={() => handleCancelClick(sch.id)}>Cancelar</button>
                                            )}
                                            {canDelete && (
                                              <button type="button" className="btn-delete" onClick={() => handleDeleteClick(sch.id)}>Eliminar</button>
                                            )}
                                          </>
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
                      {schedules.length > 100 && (
                        <p className="text-muted" style={{ padding: "8px 0 0", fontSize: "0.85rem" }}>
                          Mostrando los primeros 100 horarios. Usa filtros para reducir los resultados.
                        </p>
                      )}
                    </section>
                  </>
                )}
              </div>

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
                        <p className="form-section-subtitle">Periodo del trimestre</p>
                        <div className="form-row-compact">
                          <label className="form-label">
                            Fecha inicio trimestre <span className="req">*</span>
                            <input type="date" value={trimesterStartDate} onChange={(e) => setTrimesterStartDate(e.target.value)} required />
                          </label>
                          <label className="form-label">
                            Fecha fin trimestre <span className="req">*</span>
                            <input type="date" value={trimesterEndDate} onChange={(e) => setTrimesterEndDate(e.target.value)} required />
                          </label>
                        </div>
                        {editingSchedule && (
                          <label className="form-label">
                            Fecha programada <span className="req">*</span>
                            <input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} required />
                          </label>
                        )}
                        {!editingSchedule && (
                          <fieldset className="weekday-selector">
                            <legend>Días a programar</legend>
                            <div className="weekday-options" role="group" aria-label="Días de la semana a programar">
                              {weekDays.map((day) => (
                                <label
                                  key={day.index}
                                  className={`weekday-option ${selectedWeekdays.includes(day.index) ? "selected" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedWeekdays.includes(day.index)}
                                    onChange={() => toggleWeekday(day.index)}
                                  />
                                  <span>{day.label}</span>
                                </label>
                              ))}
                            </div>
                          </fieldset>
                        )}
                      </div>

                      <div className="schedule-form-group">
                        <p className="form-group-title">Datos académicos</p>
                        <SearchableSelect label="Ficha / Grupo" value={groupId} required placeholder="Seleccione ficha..." searchPlaceholder="Buscar ficha..." options={groups.map((group) => ({ value: group.id, label: groupLabel(group) }))} onChange={(value) => handleFichaChange(value === "" ? "" : Number(value))} />
                        <SearchableSelect
                          label="Programa de Formación"
                          value={programId}
                          placeholder="Auto-detectado por ficha"
                          searchPlaceholder="Buscar programa..."
                          options={programs.filter((program) => programIdsWithGroups.size === 0 || programIdsWithGroups.has(program.id)).map((program) => ({ value: program.id, label: `${program.code} - ${program.name}` }))}
                          onChange={(value) => {
                              const nextProgramId = value === "" ? "" : Number(value);
                              setProgramId(nextProgramId);
                              const program = typeof nextProgramId === "number" ? programsById.get(nextProgramId) : undefined;
                              setProgramSearch(program ? `${program.code} - ${program.name}` : "");
                              setLearningResultId("");
                              setCompetencyId("");
                              setRapSearch("");
                              setLearningResultTopicId("");
                              setManualTopicName("");
                          }}
                        />
                        <SearchableSelect
                          label="Resultado de Aprendizaje (RAP)"
                          value={learningResultId}
                          required
                          placeholder="Seleccione RAP..."
                          searchPlaceholder="Buscar RAP por código o descripción..."
                          maxVisibleOptions={20}
                          options={rapSource.map((rap) => ({ value: rap.id, label: rap.code, description: rap.description }))}
                          onChange={(value) => value !== "" && handleRapChange(Number(value))}
                        />

                        {learningResultId && !selectedProgramId && (
                          <div className="rap-info-card rap-info-empty">
                            <p className="form-group-title">InformaciÃ³n del RAP seleccionado</p>
                            <p className="rap-empty-msg">Seleccione una ficha o programa para consultar las temáticas del RAP.</p>
                          </div>
                        )}

                        {learningResultId && selectedProgramId && rapTopicsQuery.isLoading && (
                          <div className="rap-info-card">
                            <p className="form-group-title">Información del RAP seleccionado</p>
                            <p className="rap-empty-msg">Cargando temáticas del RAP...</p>
                          </div>
                        )}

                        {learningResultId && selectedProgramId && !rapTopicsQuery.isLoading && rapTopics.length > 0 && (
                          <div className="rap-info-card">
                            <p className="form-group-title">Información del RAP seleccionado</p>
                            <div className="rap-info-row"><span className="rap-info-label">Programa:</span><span className="rap-info-value">{selectedProgram?.name || rapTopics[0]?.training_program_name || ""}</span></div>
                            <div className="rap-info-row"><span className="rap-info-label">Trimestre:</span><span className="rap-info-value">{rapTopics[0]?.trimester_label || `Trimestre ${rapTopics[0]?.trimester_number || ""}`}</span></div>
                            <div className="rap-info-row"><span className="rap-info-label">Tipo de oferta:</span><span className="rap-info-value">{rapTopics[0]?.program_scope_label || ""}</span></div>
                            <div className="rap-info-topics">
                              <span className="rap-info-label">Temáticas asociadas:</span>
                              {rapTopics.map((t, i) => (
                                <label key={t.relation_id || i} className="rap-topic-choice">
                                  <input
                                    type="radio"
                                    name="learning_result_topic_id"
                                    checked={learningResultTopicId === t.learning_result_topic_id}
                                    onChange={() => {
                                      setLearningResultTopicId(t.learning_result_topic_id || "");
                                      setManualTopicName("");
                                    }}
                                  />
                                  <span className="rap-topic-item">
                                    <span className="rap-topic-name">{t.topic_name}</span>
                                    {t.topic_hours != null && <span className="rap-topic-hours">{t.topic_hours}h</span>}
                                    {t.relation_status && <span className="rap-topic-status">{t.relation_status}</span>}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {learningResultId && selectedProgramId && !rapTopicsQuery.isLoading && rapTopics.length === 0 && (
                          <div className="rap-info-card rap-info-empty">
                            <p className="form-group-title">Información del RAP seleccionado</p>
                            <p className="rap-empty-msg">Este RAP no tiene temáticas importadas para el programa seleccionado.</p>
                            <label className="form-label">
                              Temática manual <span className="req">*</span>
                              <input
                                type="text"
                                value={manualTopicName}
                                onChange={(e) => setManualTopicName(e.target.value)}
                                placeholder="Nombre de la temática a programar"
                              />
                            </label>
                          </div>
                        )}

                        <SearchableSelect label="Competencia Asociada" value={competencyId} placeholder="Auto-detectado por RAP" searchPlaceholder="Buscar competencia..." options={competencies.map((competency) => ({ value: competency.id, label: `${competency.code} - ${competency.name}` }))} onChange={(value) => setCompetencyId(value === "" ? "" : Number(value))} />
                      </div>

                      <div className="schedule-form-group">
                        <p className="form-group-title">Asignación</p>
                        <SearchableSelect label="Instructor" value={instructorId} required placeholder="Seleccione instructor..." searchPlaceholder="Buscar instructor..." options={instructors.map((instructor) => ({ value: instructor.id, label: instructorLabel(instructor) }))} onChange={(value) => setInstructorId(value === "" ? "" : Number(value))} />
                        <SearchableSelect label="Ambiente" value={environmentId} required placeholder="Seleccione ambiente..." searchPlaceholder="Buscar ambiente..." options={environments.map((environment) => ({ value: environment.id, label: environmentLabel(environment) }))} onChange={(value) => setEnvironmentId(value === "" ? "" : Number(value))} />
                      </div>

                <div className="schedule-form-group">
                  <p className="form-group-title">Bloque y duración</p>
                <SearchableSelect label="Bloque Horario Institucional" value={blockId} placeholder="Carga manual / Sin bloque" searchPlaceholder="Buscar bloque..." options={timeBlocks.map((block) => ({ value: block.id, label: `${block.name} (${block.start_time} - ${block.end_time})` }))} onChange={(value) => handleBlockChange(value === "" ? "" : Number(value))} />

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
                  <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending || isBulkSubmitting}>
                    {isBulkSubmitting ? "Programando días..." : editingSchedule ? "Actualizar Horario" : "Programar Horario"}
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
                        <strong>{validationRuleLabel(v.rule_code)}:</strong> {v.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {warningSchedule && (() => {
        const detail = getScheduleDisplayData(warningSchedule);
        const warningItems = warningValidationsQuery.data ?? [];
        return (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="warning-detail-title" onMouseDown={() => setWarningSchedule(null)}>
            <div className="warning-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
              <div className="modal-header-row">
                <div>
                  <span className="eyebrow">Advertencias del horario</span>
                  <h3 id="warning-detail-title">Horario #{warningSchedule.id}</h3>
                </div>
                <button type="button" className="btn-secondary" onClick={() => setWarningSchedule(null)}>Cerrar</button>
              </div>
              <div className="warning-schedule-summary">
                <span><strong>Fecha:</strong> {warningSchedule.date}</span>
                <span><strong>Horario:</strong> {warningSchedule.start_time} - {warningSchedule.end_time}</span>
                <span><strong>Ficha:</strong> {detail.group ? groupLabel(detail.group) : `ID ${warningSchedule.group_id}`}</span>
                <span><strong>Instructor:</strong> {detail.instructor ? instructorLabel(detail.instructor) : `ID ${warningSchedule.instructor_id}`}</span>
                <span><strong>Ambiente:</strong> {detail.environment ? environmentLabel(detail.environment) : `ID ${warningSchedule.environment_id}`}</span>
              </div>
              {warningValidationsQuery.isLoading ? (
                <p className="expanded-filter-empty">Cargando advertencias...</p>
              ) : warningValidationsQuery.isError ? (
                <p className="expanded-filter-empty">No fue posible cargar las advertencias.</p>
              ) : warningItems.length === 0 ? (
                <p className="expanded-filter-empty">Este horario no tiene advertencias registradas.</p>
              ) : (
                <div className="warning-list">
                  {warningItems.map((validation) => (
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
      })()}

      <ValidationAlertDialog
        open={showBlockingAlert}
        validations={validations}
        onClose={() => setShowBlockingAlert(false)}
      />

      <DetailDialog
        open={detailSchedule !== null}
        title={detailSchedule ? `Horario #${detailSchedule.id}` : "Horario"}
        fields={detailSchedule ? (() => {
          const detail = getScheduleDisplayData(detailSchedule);
          return [
            { label: "Fecha", value: detailSchedule.date },
            { label: "Horario", value: `${detailSchedule.start_time} - ${detailSchedule.end_time}` },
            { label: "Duración", value: `${detailSchedule.duration_hours} horas` },
            { label: "Instructor", value: detail.instructor ? `${detail.instructor.first_name} ${detail.instructor.last_name}` : detailSchedule.instructor_id },
            { label: "Ficha", value: detail.group ? groupLabel(detail.group) : detailSchedule.group_id },
            { label: "Ambiente", value: detail.environment ? environmentLabel(detail.environment) : detailSchedule.environment_id },
            { label: "RAP", value: detail.rap ? rapLabel(detail.rap) : detailSchedule.learning_result_id },
            { label: "Temática", value: detail.topicName },
            { label: "Estado", value: detail.statusName },
            { label: "Notas", value: detailSchedule.notes },
          ];
        })() : []}
        onClose={() => setDetailSchedule(null)}
      />

      <ConfirmDialog
        open={confirmCancelId !== null}
        title="Cancelar horario"
        message="¿Seguro que deseas marcar este horario como cancelado?"
        confirmLabel="Cancelar horario"
        confirmDanger
        onConfirm={() => { if (confirmCancelId) { cancelMutation.mutate(confirmCancelId); setConfirmCancelId(null); } }}
        onCancel={() => setConfirmCancelId(null)}
      />
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Eliminar horario"
        message="¿Seguro que deseas marcar este horario como eliminado?"
        confirmLabel="Eliminar horario"
        confirmDanger
        onConfirm={() => { if (confirmDeleteId) { deleteMutation.mutate(confirmDeleteId); setConfirmDeleteId(null); } }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
