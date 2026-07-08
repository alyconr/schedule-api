import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { fetchList } from "../api/masterData";
import {
  fetchSchedules,
  createSchedule,
  updateSchedule,
  cancelSchedule,
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

function dateForWeekday(referenceDate: string, weekdayIndex: number): string {
  const date = dateFromIso(referenceDate);
  if (!date) return referenceDate;
  const currentWeekday = date.getDay() || 7;
  date.setDate(date.getDate() - currentWeekday + weekdayIndex);
  return toLocalIsoDate(date);
}

function weekRangeFromDate(referenceDate: string): ScheduleFilters {
  const date = dateFromIso(referenceDate);
  if (!date) return getCurrentWeekRange();
  const weekday = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - weekday + 1);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return { date_from: toLocalIsoDate(monday), date_to: toLocalIsoDate(saturday), limit: 200 };
}

function getCurrentWeekRange(): ScheduleFilters {
  const today = new Date();
  const weekday = today.getDay() || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - weekday + 1);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return { date_from: toLocalIsoDate(monday), date_to: toLocalIsoDate(saturday), limit: 200 };
}

const MAX_WEEKDAY_CARDS = 30;

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
  const [activeFilters, setActiveFilters] = useState<ScheduleFilters>(() => getCurrentWeekRange());

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
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [showFullscreenMatrix, setShowFullscreenMatrix] = useState(false);
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
    const contract = contractTypesById.get(ins.contract_type_id ?? -1)?.name || "sin contrato";
    return `${ins.first_name} ${ins.last_name} - ${contract} - max ${ins.weekly_max_hours} h`;
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
  queryFn: () => fetchSchedules(activeFilters),
  staleTime: 60 * 1000,
  refetchOnWindowFocus: false,
  placeholderData: (previousData) => previousData,
});

// Filter out logically deleted schedules
  const activeSchedules = useMemo(
    () => schedules.filter((s) => s.status !== "cancelled"),
    [schedules]
  );
  const visibleSchedules = useMemo(() => activeSchedules.slice(0, 100), [activeSchedules]);
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
        : "status-idle";
    const statusName =
      schedule.status === "validated" || schedule.status === "valid"
        ? "Válido"
        : schedule.status === "warning"
        ? "Advertencia"
        : schedule.status === "blocked"
        ? "Bloqueado"
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

const deleteMutation = useMutation({
    mutationFn: cancelSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      addToast("success", "Horario cancelado correctamente.");
    },
    onError: (err: any) => {
      addToast("error", err.message || "Error al cancelar el horario.");
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
    const newFilters: ScheduleFilters = { limit: 200 };
    if (filterInstructor) newFilters.instructor_id = Number(filterInstructor);
    if (filterGroup) newFilters.group_id = Number(filterGroup);
    if (filterEnvironment) newFilters.environment_id = Number(filterEnvironment);
    if (filterDate) {
      newFilters.date = filterDate;
    } else {
      const weekRange = getCurrentWeekRange();
      newFilters.date_from = weekRange.date_from;
      newFilters.date_to = weekRange.date_to;
    }
    setActiveFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilterInstructor("");
    setFilterGroup("");
    setFilterEnvironment("");
    setFilterDate("");
    setFilterInstructorSearch("");
    setActiveFilters(getCurrentWeekRange());
  };

  const handleCancelClick = (id: number) => {
    setConfirmCancelId(id);
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

    if (!groupId || !learningResultId || !instructorId || !environmentId || !dateVal || !startTime || !endTime) {
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
      : selectedWeekdays.length > 0
      ? selectedWeekdays.map((weekday) => dateForWeekday(dateVal, weekday))
      : [dateVal];

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
      setActiveFilters(weekRangeFromDate(dateVal));
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
        queryClient.invalidateQueries({ queryKey: ["schedules"] });
        setActiveFilters(weekRangeFromDate(dateVal));
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
            Fecha
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </label>
          <label>
            Instructor
            <input
              type="search"
              value={filterInstructorSearch}
              onChange={(e) => setFilterInstructorSearch(e.target.value)}
              placeholder="Buscar instructor..."
            />
            <select value={filterInstructor} onChange={(e) => setFilterInstructor(e.target.value)}>
              <option value="">Todos los instructores</option>
              {filteredFilterInstructors.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {instructorLabel(ins)}
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
                    {schedulesFetching && !schedulesLoading && (
                      <div className="soft-loading-indicator">Actualizando programación...</div>
                    )}
                    <section className="week-view-card" aria-label="Vista semanal de programación">
                      <div className="week-view-header">
                        <div>
                          <span className="eyebrow">Matriz académica</span>
                          <h3>Vista semanal de programación</h3>
                        </div>
                        <span className="week-view-count">{activeSchedules.length} horarios</span>
                        <button className="btn-secondary btn-expand-matrix" onClick={() => setShowFullscreenMatrix(true)} type="button" aria-label="Ampliar matriz">
                          Ampliar matriz
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

                    <div className="table-responsive">
                      <table className="crud-table">
                        <thead>
                          <tr>
                            <th>Fecha</th><th>Horario</th><th>Instructor</th><th>Ficha</th><th>Ambiente</th><th>RAP</th><th>Estado</th>
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
                            visibleSchedules.map((sch) => {
                              const ins = instructorsById.get(sch.instructor_id);
                              const grp = groupsById.get(sch.group_id);
                              const env = environmentsById.get(sch.environment_id);
                              const rap = learningResultsById.get(sch.learning_result_id);
                              const { topicName, statusClass, statusName } = getScheduleDisplayData(sch);
                              return (
                                <tr key={sch.id}>
                                  <td>{sch.date}</td>
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
                                      <button className="btn-edit" onClick={() => handleEditInit(sch)}>Editar</button>
                                      {canDelete && sch.status !== "cancelled" && (
                                        <button className="btn-delete" onClick={() => handleCancelClick(sch.id)}>Cancelar</button>
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
                    {activeSchedules.length > 100 && (
                      <p className="text-muted" style={{ padding: "8px 0 0", fontSize: "0.85rem" }}>
                        Mostrando los primeros 100 horarios. Usa filtros para reducir los resultados.
                      </p>
                    )}
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
                        <label className="form-label">
                          {editingSchedule ? "Fecha" : "Semana de referencia"} <span className="req">*</span>
                          <input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} required />
                        </label>
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
                        <label className="form-label">
                          Ficha / Grupo <span className="req">*</span>
                          <input
                            type="search"
                            value={groupSearch}
                            onChange={(e) => setGroupSearch(e.target.value)}
                            placeholder="Buscar ficha..."
                          />
                          <select value={groupId} onChange={(e) => handleFichaChange(e.target.value ? Number(e.target.value) : "")} required>
                            <option value="">Seleccione ficha...</option>
                            {filteredGroups.map((g) => (<option key={g.id} value={g.id}>{groupLabel(g)}</option>))}
                          </select>
                        </label>
                        <label className="form-label">
                          Programa de Formación
                          <input
                            type="search"
                            value={programSearch}
                            onChange={(e) => setProgramSearch(e.target.value)}
                            placeholder="Buscar programa..."
                          />
                          <select
                            value={programId}
                            onChange={(e) => {
                              const nextProgramId = e.target.value ? Number(e.target.value) : "";
                              setProgramId(nextProgramId);
                              const program = typeof nextProgramId === "number" ? programsById.get(nextProgramId) : undefined;
                              setProgramSearch(program ? `${program.code} - ${program.name}` : "");
                              setLearningResultId("");
                              setCompetencyId("");
                              setRapSearch("");
                              setLearningResultTopicId("");
                              setManualTopicName("");
                            }}
                          >
                            <option value="">Auto-detectado por ficha</option>
                            {filteredPrograms.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                          </select>
                        </label>
                        <label className="form-label rap-search-field">
                          Resultado de Aprendizaje (RAP) <span className="req">*</span>
                          <input
                            type="text"
                            value={rapSearch}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) => {
                              const nextSearch = e.target.value;
                              setRapSearch(nextSearch);
                              const selectedLabel = selectedRapOption ? `${selectedRapOption.code} - ${selectedRapOption.description.slice(0, 100)}` : "";
                              if (!nextSearch.trim() || nextSearch !== selectedLabel) {
                                setLearningResultId("");
                                setCompetencyId("");
                                setLearningResultTopicId("");
                                setManualTopicName("");
                              }
                            }}
                            placeholder="Buscar RAP por código o descripción..."
                            autoComplete="off"
                          />
                          <input type="hidden" value={learningResultId} required readOnly />
                          <div className="rap-autocomplete-list">
                            {rapOptions.map((lr) => (
                              <button type="button" key={lr.id}
                                className={`rap-autocomplete-item ${learningResultId === lr.id ? "selected" : ""}`}
                                onClick={() => handleRapChange(lr.id)}
                              >
                                <strong>{lr.code}</strong>
                                <span>{lr.description.slice(0, 140)}</span>
                              </button>
                            ))}
                            {deferredRapSearch.trim() && rapOptions.length === 0 && (
                              <div className="rap-autocomplete-empty">No se encontraron RAP con ese criterio.</div>
                            )}
                            {rapSource.length > 20 && !deferredRapSearch.trim() && (
                              <div className="rap-autocomplete-hint">Escriba para buscar entre todos los resultados de aprendizaje.</div>
                            )}
                          </div>
                          {selectedRapOption && (
                            <div className="selected-rap-summary">
                              <strong>RAP seleccionado:</strong> {selectedRapOption.code}
                            </div>
                          )}
                        </label>

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

                        <label className="form-label">
                          Competencia Asociada
                          <input
                            type="search"
                            value={competencySearch}
                            onChange={(e) => setCompetencySearch(e.target.value)}
                            placeholder="Buscar competencia..."
                          />
                          <select value={competencyId} onChange={(e) => {
                            const nextCompetencyId = e.target.value ? Number(e.target.value) : "";
                            setCompetencyId(nextCompetencyId);
                            const competency = typeof nextCompetencyId === "number"
                              ? competencies.find((comp) => comp.id === nextCompetencyId)
                              : undefined;
                            setCompetencySearch(competency ? `${competency.code} - ${competency.name}` : "");
                          }}>
                            <option value="">Auto-detectado por RAP</option>
                            {filteredCompetencies.map((comp) => (<option key={comp.id} value={comp.id}>{comp.code} - {comp.name.slice(0, 50)}...</option>))}
                          </select>
                        </label>
                      </div>

                      <div className="schedule-form-group">
                        <p className="form-group-title">Asignación</p>
                        <label className="form-label">
                          Instructor <span className="req">*</span>
                          <input
                            type="search"
                            value={instructorSearch}
                            onChange={(e) => setInstructorSearch(e.target.value)}
                            placeholder="Buscar instructor..."
                          />
                          <select value={instructorId} onChange={(e) => {
                            const nextInstructorId = e.target.value ? Number(e.target.value) : "";
                            setInstructorId(nextInstructorId);
                            const instructor = typeof nextInstructorId === "number" ? instructorsById.get(nextInstructorId) : undefined;
                            setInstructorSearch(instructor ? instructorLabel(instructor) : "");
                          }} required>
                            <option value="">Seleccione instructor...</option>
                            {filteredInstructors.map((ins) => (<option key={ins.id} value={ins.id}>{instructorLabel(ins)}</option>))}
                          </select>
                        </label>
                        <label className="form-label">
                          Ambiente <span className="req">*</span>
                          <input
                            type="search"
                            value={environmentSearch}
                            onChange={(e) => setEnvironmentSearch(e.target.value)}
                            placeholder="Buscar ambiente..."
                          />
                          <select value={environmentId} onChange={(e) => {
                            const nextEnvironmentId = e.target.value ? Number(e.target.value) : "";
                            setEnvironmentId(nextEnvironmentId);
                            const environment = typeof nextEnvironmentId === "number" ? environmentsById.get(nextEnvironmentId) : undefined;
                            setEnvironmentSearch(environment ? environmentLabel(environment) : "");
                          }} required>
                            <option value="">Seleccione ambiente...</option>
                            {filteredEnvironments.map((env) => (<option key={env.id} value={env.id}>{environmentLabel(env)}</option>))}
                          </select>
                        </label>
                      </div>

                <div className="schedule-form-group">
                  <p className="form-group-title">Bloque y duración</p>
                <label className="form-label">
                  Bloque Horario Institucional
                  <input
                    type="search"
                    value={blockSearch}
                    onChange={(e) => setBlockSearch(e.target.value)}
                    placeholder="Buscar bloque..."
                  />
                  <select
                    value={blockId}
                    onChange={(e) => handleBlockChange(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Carga manual / Sin bloque</option>
                    {filteredTimeBlocks.map((tb) => (
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

      {/* Fullscreen matrix modal */}
      {showFullscreenMatrix && (
        <div className="modal-overlay fullscreen-matrix" role="dialog" aria-modal="true" aria-labelledby="matrix-title">
          <div className="fullscreen-matrix-content">
            <div className="fullscreen-matrix-header">
              <div>
                <span className="eyebrow">Matriz académica</span>
                <h3 id="matrix-title">Matriz semanal de programación</h3>
                <p className="fullscreen-matrix-subtitle">Visualización ampliada de la programación académica por día, instructor, ficha, ambiente y RAP.</p>
              </div>
              <button className="btn-secondary" onClick={() => setShowFullscreenMatrix(false)} aria-label="Cerrar matriz">Cerrar</button>
            </div>
            <div className="fullscreen-week-grid">
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
                            <button
                              className={`week-schedule-card ${statusClass}`}
                              disabled={!canWrite}
                              key={sch.id}
                              onClick={() => { setShowFullscreenMatrix(false); handleEditInit(sch); }}
                              title={canWrite ? "Editar horario" : "Modo consulta"}
                              type="button"
                            >
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
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancelId !== null}
        title="Cancelar horario"
        message="¿Seguro que deseas cancelar este horario?"
        confirmLabel="Cancelar horario"
        confirmDanger
        onConfirm={() => { if (confirmCancelId) { deleteMutation.mutate(confirmCancelId); setConfirmCancelId(null); } }}
        onCancel={() => setConfirmCancelId(null)}
      />
    </div>
  );
}
