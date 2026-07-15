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

type SummaryDetail = "warnings" | "instructors" | "groups" | "environments";

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

function weekdayIndex(schedule: Schedule): number {
  return schedule.weekday || new Date(`${schedule.date}T00:00:00`).getDay() || 7;
}

function weekdayName(schedule: Schedule): string {
  return weekDays.find((day) => day.index === weekdayIndex(schedule))?.label || "Domingo";
}

function weeklyBlockKey(schedule: Schedule): string {
  return [schedule.group_id, schedule.instructor_id, schedule.environment_id, schedule.learning_result_id, schedule.learning_result_topic_id, schedule.manual_topic_name, schedule.start_time, schedule.end_time].join("|");
}

function weeklySchedules(schedules: Schedule[]): Schedule[] {
  return [...new Map(schedules.map((schedule) => [
    `${schedule.weekday || weekdayName(schedule)}|${weeklyBlockKey(schedule)}`,
    schedule,
  ])).values()].sort((a, b) => weekdayIndex(a) - weekdayIndex(b) || a.start_time.localeCompare(b.start_time));
}

function dateForWeekday(date: string, targetWeekday: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  const currentWeekday = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + targetWeekday - currentWeekday);
  return value.toISOString().slice(0, 10);
}

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

function latestValidationResults(items: ValidationResult[]): ValidationResult[] {
  return [...new Map(items.map((item) => [item.rule_code, item])).values()];
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

const PLANNER_SUMMARY_FILTERS: ScheduleFilters = { limit: 2000 };

export function SchedulePlanner({ currentUser, setActiveTab }: SchedulePlannerProps) {
  const queryClient = useQueryClient();

  // Roles permissions check
  const roles = currentUser.roles || [];
  const isConsulta = roles.includes("consulta") && roles.length === 1;
  const canWrite = roles.includes("admin") || roles.includes("coordinador") || roles.includes("programador");
  const canDelete = roles.includes("admin") || roles.includes("coordinador");

  const [trimesterStartDate, setTrimesterStartDate] = useState("");
  const [trimesterEndDate, setTrimesterEndDate] = useState("");

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
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<number[] | null>(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [detailSchedule, setDetailSchedule] = useState<Schedule | null>(null);
  const [showBlockingAlert, setShowBlockingAlert] = useState(false);
  const [warningSchedule, setWarningSchedule] = useState<Schedule | null>(null);
  const [summaryDetail, setSummaryDetail] = useState<SummaryDetail | null>(null);
  const [summarySearch, setSummarySearch] = useState("");
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<number | null>(null);
  const [selectedSummaryEntityId, setSelectedSummaryEntityId] = useState<number | null>(null);
  const [draggedScheduleId, setDraggedScheduleId] = useState<number | null>(null);
  const [selectedWeeklyBlockIds, setSelectedWeeklyBlockIds] = useState<number[]>([]);
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
  // 2. Fetch Schedules
const { data: schedules = [] } = useQuery<Schedule[]>({
  queryKey: ["schedules", "planner-summary"],
  queryFn: () => fetchSchedules({ ...PLANNER_SUMMARY_FILTERS, include_inactive: true }),
  staleTime: 60 * 1000,
  refetchOnWindowFocus: false,
  placeholderData: (previousData) => previousData,
});

// Keep deleted rows visible in the table, but out of the active weekly matrix.
  const activeSchedules = useMemo(
    () => schedules.filter((s) => !["cancelled", "deleted"].includes(s.status)),
    [schedules]
  );
  const latestWarningsByInstructor = useMemo(() => {
    const latest = new Map<number, Schedule>();
    activeSchedules
      .filter((schedule) => schedule.status === "warning")
      .sort((a, b) => `${b.date}T${b.start_time}`.localeCompare(`${a.date}T${a.start_time}`) || b.id - a.id)
      .forEach((schedule) => {
        if (!latest.has(schedule.instructor_id)) latest.set(schedule.instructor_id, schedule);
      });
    return [...latest.values()];
  }, [activeSchedules]);
  const plannerStats = useMemo(() => ({
    warnings: latestWarningsByInstructor.length,
    instructors: new Set(activeSchedules.map((s) => s.instructor_id)).size,
    groups: new Set(activeSchedules.map((s) => s.group_id)).size,
    environments: new Set(activeSchedules.map((s) => s.environment_id)).size,
  }), [activeSchedules, latestWarningsByInstructor]);
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

  const summaryItems = useMemo(() => {
    if (!summaryDetail) return [];
    if (summaryDetail === "warnings") {
      return latestWarningsByInstructor
        .map((schedule) => {
          const detail = getScheduleDisplayData(schedule);
          return {
            id: schedule.id,
            primary: `${weekdayName(schedule)} · ${detail.group?.code || `Ficha ${schedule.group_id}`} · ${detail.instructor ? instructorLabel(detail.instructor) : `Instructor ${schedule.instructor_id}`}`,
            secondary: `${schedule.start_time.slice(0, 5)}–${schedule.end_time.slice(0, 5)} · ${detail.environment ? environmentLabel(detail.environment) : `Ambiente ${schedule.environment_id}`}`,
          };
        });
    }
    if (summaryDetail === "instructors" || summaryDetail === "groups") return [];
    const ids = [...new Set(activeSchedules.map((schedule) => schedule.environment_id))];
    return ids.map((id) => {
      const count = activeSchedules.filter((schedule) => schedule.environment_id === id).length;
      const entity = environmentsById.get(id);
      return {
        id,
        primary: entity ? environmentLabel(entity) : `Ambiente ${id}`,
        secondary: `${count} ${count === 1 ? "sesión programada" : "sesiones programadas"}`,
      };
    });
  }, [summaryDetail, activeSchedules, environmentsById, latestWarningsByInstructor]);

  const instructorScheduleGroups = useMemo(() => summaryDetail === "instructors"
    ? [...new Set(activeSchedules.map((schedule) => schedule.instructor_id))].map((id) => ({
        id,
        instructor: instructorsById.get(id),
        schedules: weeklySchedules(activeSchedules.filter((schedule) => schedule.instructor_id === id)),
      }))
    : [], [summaryDetail, activeSchedules, instructorsById]);

  const groupScheduleGroups = useMemo(() => summaryDetail === "groups"
    ? [...new Set(activeSchedules.map((schedule) => schedule.group_id))].map((id) => ({
        id,
        group: groupsById.get(id),
        schedules: weeklySchedules(activeSchedules.filter((schedule) => schedule.group_id === id)),
      }))
    : [], [summaryDetail, activeSchedules, groupsById]);

  const environmentScheduleGroups = useMemo(() => summaryDetail === "environments"
    ? [...new Set(activeSchedules.map((schedule) => schedule.environment_id))].map((id) => ({
        id,
        environment: environmentsById.get(id),
        schedules: weeklySchedules(activeSchedules.filter((schedule) => schedule.environment_id === id)),
      }))
    : [], [summaryDetail, activeSchedules, environmentsById]);

  const summaryTitle = summaryDetail === "warnings" ? "Horarios con advertencias" : summaryDetail === "instructors" ? "Instructores programados" : summaryDetail === "groups" ? "Fichas programadas" : "Ambientes usados";
  const summarySearchTerm = normalizeSearchText(summarySearch.trim());
  const scheduleSearchText = (schedule: Schedule) => {
    const detail = getScheduleDisplayData(schedule);
    const program = schedule.training_program_id ? programsById.get(schedule.training_program_id) : undefined;
    return normalizeSearchText([
      weekdayName(schedule), schedule.start_time, schedule.end_time,
      detail.instructor ? instructorLabel(detail.instructor) : "",
      detail.group ? groupLabel(detail.group) : "",
      detail.environment ? environmentLabel(detail.environment) : "",
      detail.rap ? `${detail.rap.code} ${detail.rap.description}` : "",
      detail.topicName, program ? `${program.code} ${program.name}` : "",
    ].join(" "));
  };
  const filteredSummaryItems = summarySearchTerm
    ? summaryItems.filter((item) => normalizeSearchText(`${item.primary} ${item.secondary}`).includes(summarySearchTerm))
    : summaryItems;
  const filteredInstructorScheduleGroups = summarySearchTerm
    ? instructorScheduleGroups.filter((group) => normalizeSearchText(group.instructor ? instructorLabel(group.instructor) : `Instructor ${group.id}`).includes(summarySearchTerm) || group.schedules.some((schedule) => scheduleSearchText(schedule).includes(summarySearchTerm)))
    : instructorScheduleGroups;
  const filteredGroupScheduleGroups = summarySearchTerm
    ? groupScheduleGroups.filter((group) => normalizeSearchText(group.group ? groupLabel(group.group) : `Ficha ${group.id}`).includes(summarySearchTerm) || group.schedules.some((schedule) => scheduleSearchText(schedule).includes(summarySearchTerm)))
    : groupScheduleGroups;
  const searchedEntityId = summarySearchTerm
    ? summaryDetail === "groups" && filteredGroupScheduleGroups.length === 1
      ? filteredGroupScheduleGroups[0].id
      : summaryDetail === "instructors" && filteredInstructorScheduleGroups.length === 1
      ? filteredInstructorScheduleGroups[0].id
      : null
    : null;
  const searchedEnvironmentId = summarySearchTerm && summaryDetail === "environments" && filteredSummaryItems.length === 1
    ? filteredSummaryItems[0].id
    : null;
  const selectedEnvironmentGroup = environmentScheduleGroups.find((group) => group.id === selectedEnvironmentId);
  const selectedInstructorGroup = instructorScheduleGroups.find((group) => group.id === selectedSummaryEntityId);
  const selectedGroupSchedule = groupScheduleGroups.find((group) => group.id === selectedSummaryEntityId);
  const selectedWeeklySchedule = summaryDetail === "instructors"
    ? selectedInstructorGroup
    : summaryDetail === "groups"
    ? selectedGroupSchedule
    : summaryDetail === "environments"
    ? selectedEnvironmentGroup
    : undefined;

  useEffect(() => {
    setSummarySearch("");
    setSelectedEnvironmentId(null);
    setSelectedSummaryEntityId(null);
  }, [summaryDetail]);

  useEffect(() => {
    if (summaryDetail === "groups" || summaryDetail === "instructors") {
      setSelectedSummaryEntityId(searchedEntityId);
    }
  }, [summaryDetail, searchedEntityId]);

  useEffect(() => {
    if (summaryDetail === "environments") setSelectedEnvironmentId(searchedEnvironmentId);
  }, [summaryDetail, searchedEnvironmentId]);

  useEffect(() => {
    setSelectedWeeklyBlockIds([]);
  }, [summaryDetail, selectedSummaryEntityId, selectedEnvironmentId]);

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

  const handleCancelClick = (id: number) => {
    setConfirmCancelId(id);
  };

  const handleDeleteClick = (id: number) => {
    setConfirmDeleteIds([id]);
  };

  const weeklySeriesIds = (scheduleIds: number[]) => {
    const anchors = activeSchedules.filter((schedule) => scheduleIds.includes(schedule.id));
    return [...new Set(activeSchedules
      .filter((schedule) => anchors.some((anchor) => weeklyBlockKey(schedule) === weeklyBlockKey(anchor) && weekdayIndex(schedule) === weekdayIndex(anchor)))
      .map((schedule) => schedule.id))];
  };

  const deleteWeeklySchedules = async () => {
    if (!confirmDeleteIds?.length) return;
    setIsBulkSubmitting(true);
    try {
      await Promise.all(confirmDeleteIds.map(deleteSchedule));
      await queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setSelectedWeeklyBlockIds([]);
      addToast("success", `${confirmDeleteIds.length} ${confirmDeleteIds.length === 1 ? "horario eliminado" : "horarios eliminados"}.`);
    } catch (error: any) {
      addToast("error", error.message || "No fue posible eliminar los horarios seleccionados.");
    } finally {
      setConfirmDeleteIds(null);
      setIsBulkSubmitting(false);
    }
  };

  const moveWeeklyBlock = async (targetWeekday: number) => {
    const dragged = activeSchedules.find((schedule) => schedule.id === draggedScheduleId);
    setDraggedScheduleId(null);
    if (!canWrite || !dragged || weekdayIndex(dragged) === targetWeekday) return;

    const occurrences = activeSchedules.filter((schedule) => weeklyBlockKey(schedule) === weeklyBlockKey(dragged) && weekdayIndex(schedule) === weekdayIndex(dragged));
    setIsBulkSubmitting(true);
    try {
      for (const schedule of occurrences) {
        const result = await updateSchedule(schedule.id, { date: dateForWeekday(schedule.date, targetWeekday), weekday: targetWeekday });
        if (result.status === "blocked") throw new Error(result.validations.map((item) => item.message).join(" ") || "El cambio está bloqueado por las reglas de programación.");
      }
      await queryClient.invalidateQueries({ queryKey: ["schedules"] });
      addToast("success", `Bloque movido a ${weekDays.find((day) => day.index === targetWeekday)?.label}.`);
    } catch (error: any) {
      addToast("error", error.message || "No fue posible mover la programación.");
    } finally {
      setIsBulkSubmitting(false);
    }
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
        const currentValidations = latestValidationResults(warnings);
        setValidationStatus(blockedDays.length ? "blocked" : currentValidations.length ? "warning" : "validated");
        setValidations(currentValidations);
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

      <div className="schedule-summary-grid planner-summary-grid" aria-label="Resumen de programación">
        <button type="button" className="schedule-summary-card warning" onClick={() => setSummaryDetail("warnings")} aria-label={`Ver ${plannerStats.warnings} horarios con advertencias`}>
          <span>Con advertencias</span>
          <strong>{plannerStats.warnings}</strong>
          <small>Ver detalle →</small>
        </button>
        <button type="button" className="schedule-summary-card" onClick={() => setSummaryDetail("instructors")} aria-label={`Ver ${plannerStats.instructors} instructores programados`}>
          <span>Instructores programados</span>
          <strong>{plannerStats.instructors}</strong>
          <small>Ver detalle →</small>
        </button>
        <button type="button" className="schedule-summary-card" onClick={() => setSummaryDetail("groups")} aria-label={`Ver ${plannerStats.groups} fichas programadas`}>
          <span>Fichas programadas</span>
          <strong>{plannerStats.groups}</strong>
          <small>Ver detalle →</small>
        </button>
        <button type="button" className="schedule-summary-card" onClick={() => setSummaryDetail("environments")} aria-label={`Ver ${plannerStats.environments} ambientes usados`}>
          <span>Ambientes usados</span>
          <strong>{plannerStats.environments}</strong>
          <small>Ver detalle →</small>
        </button>
      </div>

      {summaryDetail && (
        <div className="modal-overlay" role="presentation" onMouseDown={() => setSummaryDetail(null)}>
          <section className={`summary-detail-modal${summaryDetail === "instructors" || summaryDetail === "groups" || summaryDetail === "environments" ? " instructor-schedule-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="summary-detail-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="modal-header-row">
              <div><span className="eyebrow">Resumen de programación</span><h3 id="summary-detail-title">{summaryTitle}</h3></div>
              <button type="button" className="detail-dialog-close" onClick={() => setSummaryDetail(null)} aria-label="Cerrar">×</button>
            </header>
            <label className="summary-modal-search">
              <span>Buscar en {summaryTitle.toLowerCase()}</span>
              <input type="search" value={summarySearch} onChange={(event) => setSummarySearch(event.target.value)} placeholder="Escriba un nombre, ficha, día, RAP o ambiente..." autoFocus />
            </label>
            <p className="summary-detail-count">{summaryDetail === "instructors" ? filteredInstructorScheduleGroups.length : summaryDetail === "groups" ? filteredGroupScheduleGroups.length : filteredSummaryItems.length} resultados</p>
              {selectedWeeklySchedule ? (
                <div className="weekly-chronogram-page">
                  <button type="button" className="summary-back-button" onClick={() => summaryDetail === "environments" ? setSelectedEnvironmentId(null) : setSelectedSummaryEntityId(null)}>
                    ← Volver a {summaryDetail === "instructors" ? "instructores" : summaryDetail === "groups" ? "fichas" : "ambientes"}
                  </button>
                  <header className="weekly-chronogram-heading">
                    <div>
                      <span>Cronograma semanal</span>
                      <h4>
                        {summaryDetail === "instructors"
                          ? selectedInstructorGroup?.instructor
                            ? instructorLabel(selectedInstructorGroup.instructor)
                            : `Instructor ${selectedSummaryEntityId}`
                          : summaryDetail === "groups" && selectedGroupSchedule?.group
                          ? groupLabel(selectedGroupSchedule.group)
                          : summaryDetail === "groups"
                          ? `Ficha ${selectedSummaryEntityId}`
                          : selectedEnvironmentGroup?.environment
                          ? environmentLabel(selectedEnvironmentGroup.environment)
                          : `Ambiente ${selectedEnvironmentId}`}
                      </h4>
                    </div>
                    <div className="weekly-chronogram-selection">
                      <strong>{selectedWeeklySchedule.schedules.length} bloques</strong>
                      {canDelete && (
                        <>
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedWeeklyBlockIds.length === selectedWeeklySchedule.schedules.length && selectedWeeklySchedule.schedules.length > 0}
                              onChange={(event) => setSelectedWeeklyBlockIds(event.target.checked ? selectedWeeklySchedule.schedules.map((schedule) => schedule.id) : [])}
                            />
                            Seleccionar todos
                          </label>
                          <button
                            type="button"
                            className="weekly-delete-selected"
                            disabled={!selectedWeeklyBlockIds.length || isBulkSubmitting}
                            onClick={() => setConfirmDeleteIds(weeklySeriesIds(selectedWeeklyBlockIds))}
                          >
                            Eliminar seleccionados
                          </button>
                        </>
                      )}
                    </div>
                  </header>
                  <div className="weekly-chronogram-scroll">
                    <div className="weekly-chronogram-grid">
                      {weekDays.map((day) => {
                        const daySchedules = selectedWeeklySchedule.schedules.filter((schedule) => weekdayIndex(schedule) === day.index);
                        return (
                          <section
                            className={`weekly-chronogram-day${draggedScheduleId ? " is-drop-target" : ""}`}
                            key={day.index}
                            onDragOver={(event) => {
                              if (canWrite) event.preventDefault();
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              void moveWeeklyBlock(day.index);
                            }}
                          >
                            <header>
                              <strong>{day.label}</strong>
                              <span>{daySchedules.length}</span>
                            </header>
                            <div className="weekly-chronogram-blocks">
                              {daySchedules.length ? daySchedules.map((schedule) => {
                                const detail = getScheduleDisplayData(schedule);
                                return (
                                  <article
                                    className="weekly-chronogram-block"
                                    key={schedule.id}
                                    draggable={canWrite && !isBulkSubmitting}
                                    onDragStart={(event) => {
                                      setDraggedScheduleId(schedule.id);
                                      event.dataTransfer.effectAllowed = "move";
                                      event.dataTransfer.setData("text/plain", String(schedule.id));
                                    }}
                                    onDragEnd={() => setDraggedScheduleId(null)}
                                    aria-label={`${weekdayName(schedule)}, ${schedule.start_time.slice(0, 5)} a ${schedule.end_time.slice(0, 5)}${canWrite ? ". Arrastrable para reprogramar" : ""}`}
                                  >
                                    {canDelete && (
                                      <div className="weekly-block-actions">
                                        <label>
                                          <input
                                            type="checkbox"
                                            checked={selectedWeeklyBlockIds.includes(schedule.id)}
                                            onChange={(event) => setSelectedWeeklyBlockIds((current) => event.target.checked ? [...current, schedule.id] : current.filter((id) => id !== schedule.id))}
                                          />
                                          Seleccionar
                                        </label>
                                        <button type="button" onClick={() => setConfirmDeleteIds(weeklySeriesIds([schedule.id]))}>Eliminar</button>
                                      </div>
                                    )}
                                    <div className="weekly-chronogram-time">
                                      <strong>{schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}</strong>
                                      <span className={`status-pill ${detail.statusClass}`}>{detail.statusName}</span>
                                    </div>
                                    <h5>
                                      {summaryDetail === "instructors"
                                        ? detail.group ? groupLabel(detail.group) : `Ficha ${schedule.group_id}`
                                        : summaryDetail === "groups"
                                        ? detail.instructor ? instructorLabel(detail.instructor) : `Instructor ${schedule.instructor_id}`
                                        : `${detail.group ? groupLabel(detail.group) : `Ficha ${schedule.group_id}`} · ${detail.instructor ? instructorLabel(detail.instructor) : `Instructor ${schedule.instructor_id}`}`}
                                    </h5>
                                    <dl>
                                      <div><dt>Ambiente</dt><dd>{detail.environment ? environmentLabel(detail.environment) : `Ambiente ${schedule.environment_id}`}</dd></div>
                                      <div><dt>RAP</dt><dd>{detail.rap ? `${detail.rap.code} · ${detail.rap.description}` : `RAP ${schedule.learning_result_id}`}</dd></div>
                                      <div><dt>Temática</dt><dd>{detail.topicName || "Sin temática registrada"}</dd></div>
                                    </dl>
                                  </article>
                                );
                              }) : <p className="weekly-chronogram-empty">Sin programación</p>}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : summaryDetail === "instructors" && filteredInstructorScheduleGroups.length ? (
              <div className="instructor-schedule-groups">
                {filteredInstructorScheduleGroups.map((group) => (
                        <section
                          className="instructor-schedule-group schedule-entity-card"
                          key={group.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedSummaryEntityId(group.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") setSelectedSummaryEntityId(group.id);
                          }}
                        >
                    <header><div><span>Instructor</span><h4>{group.instructor ? instructorLabel(group.instructor) : `Instructor ${group.id}`}</h4></div><strong>{group.schedules.length} {group.schedules.length === 1 ? "bloque semanal" : "bloques semanales"}</strong></header>
                    <div className="instructor-session-list">
                      {group.schedules.map((schedule) => {
                        const detail = getScheduleDisplayData(schedule);
                        const program = schedule.training_program_id ? programsById.get(schedule.training_program_id) : undefined;
                        const competency = schedule.competency_id ? competencies.find((item) => item.id === schedule.competency_id) : undefined;
                        return (
                          <article key={schedule.id}>
                            <div className="instructor-session-heading"><strong>{detail.group ? groupLabel(detail.group) : `Ficha ${schedule.group_id}`}</strong><span className={`schedule-status ${detail.statusClass}`}>{detail.statusName}</span></div>
                            <dl>
                              <div><dt>Día y horario</dt><dd>{weekdayName(schedule)} · {schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)} · {schedule.duration_hours} h</dd></div>
                              <div><dt>Programa</dt><dd>{program ? `${program.code} · ${program.name}` : "Sin programa"}</dd></div>
                              <div><dt>Competencia</dt><dd>{competency ? `${competency.code} · ${competency.name}` : "Sin competencia"}</dd></div>
                              <div><dt>RAP</dt><dd>{detail.rap ? `${detail.rap.code} · ${detail.rap.description}` : "Sin RAP"}</dd></div>
                              <div><dt>Temática</dt><dd>{detail.topicName || "Sin temática"}</dd></div>
                              <div><dt>Ambiente</dt><dd>{detail.environment ? environmentLabel(detail.environment) : `Ambiente ${schedule.environment_id}`}</dd></div>
                              <div className="instructor-session-wide"><dt>Observaciones</dt><dd>{schedule.notes || "Sin observaciones"}</dd></div>
                            </dl>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : summaryDetail === "groups" && filteredGroupScheduleGroups.length ? (
              <div className="instructor-schedule-groups">
                {filteredGroupScheduleGroups.map((group) => (
                        <section
                          className="instructor-schedule-group schedule-entity-card"
                          key={group.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedSummaryEntityId(group.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") setSelectedSummaryEntityId(group.id);
                          }}
                        >
                    <header><div><span>Ficha</span><h4>{group.group ? groupLabel(group.group) : `Ficha ${group.id}`}</h4></div><strong>{group.schedules.length} {group.schedules.length === 1 ? "bloque semanal" : "bloques semanales"}</strong></header>
                    <div className="instructor-session-list">
                      {group.schedules.map((schedule) => {
                        const detail = getScheduleDisplayData(schedule);
                        const program = schedule.training_program_id ? programsById.get(schedule.training_program_id) : undefined;
                        const competency = schedule.competency_id ? competencies.find((item) => item.id === schedule.competency_id) : undefined;
                        return (
                          <article key={schedule.id}>
                            <div className="instructor-session-heading"><strong>{weekdayName(schedule)} · {schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}</strong><span className={`schedule-status ${detail.statusClass}`}>{detail.statusName}</span></div>
                            <dl>
                              <div><dt>Instructor</dt><dd>{detail.instructor ? instructorLabel(detail.instructor) : `Instructor ${schedule.instructor_id}`}</dd></div>
                              <div><dt>Duración</dt><dd>{schedule.duration_hours} horas</dd></div>
                              <div><dt>Programa</dt><dd>{program ? `${program.code} · ${program.name}` : "Sin programa"}</dd></div>
                              <div><dt>Competencia</dt><dd>{competency ? `${competency.code} · ${competency.name}` : "Sin competencia"}</dd></div>
                              <div><dt>RAP</dt><dd>{detail.rap ? `${detail.rap.code} · ${detail.rap.description}` : "Sin RAP"}</dd></div>
                              <div><dt>Temática</dt><dd>{detail.topicName || "Sin temática"}</dd></div>
                              <div><dt>Ambiente</dt><dd>{detail.environment ? environmentLabel(detail.environment) : `Ambiente ${schedule.environment_id}`}</dd></div>
                              <div className="instructor-session-wide"><dt>Observaciones</dt><dd>{schedule.notes || "Sin observaciones"}</dd></div>
                            </dl>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : summaryDetail === "environments" && selectedEnvironmentGroup ? (
              <div className="instructor-schedule-groups">
                <button type="button" className="summary-back-button" onClick={() => setSelectedEnvironmentId(null)}>← Volver a ambientes</button>
                <section className="instructor-schedule-group">
                  <header><div><span>Ambiente</span><h4>{selectedEnvironmentGroup.environment ? environmentLabel(selectedEnvironmentGroup.environment) : `Ambiente ${selectedEnvironmentGroup.id}`}</h4></div><strong>{selectedEnvironmentGroup.schedules.length} {selectedEnvironmentGroup.schedules.length === 1 ? "bloque semanal" : "bloques semanales"}</strong></header>
                  {selectedEnvironmentGroup.environment && <div className="environment-meta"><span><strong>Tipo</strong>{selectedEnvironmentGroup.environment.environment_type}</span><span><strong>Capacidad</strong>{selectedEnvironmentGroup.environment.capacity}</span><span><strong>Ubicación</strong>{selectedEnvironmentGroup.environment.location || "Sin ubicación"}</span></div>}
                  <div className="instructor-session-list">
                    {selectedEnvironmentGroup.schedules.map((schedule) => {
                      const detail = getScheduleDisplayData(schedule);
                      const program = schedule.training_program_id ? programsById.get(schedule.training_program_id) : undefined;
                      return (
                        <article key={schedule.id}>
                          <div className="instructor-session-heading"><strong>{weekdayName(schedule)} · {schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}</strong><span className={`schedule-status ${detail.statusClass}`}>{detail.statusName}</span></div>
                          <dl>
                            <div><dt>Instructor</dt><dd>{detail.instructor ? instructorLabel(detail.instructor) : `Instructor ${schedule.instructor_id}`}</dd></div>
                            <div><dt>Ficha</dt><dd>{detail.group ? groupLabel(detail.group) : `Ficha ${schedule.group_id}`}</dd></div>
                            <div><dt>Programa</dt><dd>{program ? `${program.code} · ${program.name}` : "Sin programa"}</dd></div>
                            <div><dt>RAP</dt><dd>{detail.rap ? `${detail.rap.code} · ${detail.rap.description}` : "Sin RAP"}</dd></div>
                            <div className="instructor-session-wide"><dt>Temática</dt><dd>{detail.topicName || "Sin temática"}</dd></div>
                          </dl>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </div>
            ) : filteredSummaryItems.length ? (
              <div className="summary-detail-list">
                {filteredSummaryItems.map((item) => summaryDetail === "warnings" ? (
                  <button
                    type="button"
                    className="summary-warning-item"
                    key={item.id}
                    onClick={() => {
                      const schedule = activeSchedules.find((current) => current.id === item.id);
                      if (schedule) setWarningSchedule(schedule);
                      setSummaryDetail(null);
                    }}
                  >
                    <strong>{item.primary}</strong>
                    <span>{item.secondary}</span>
                    <small>Ver información de la advertencia →</small>
                  </button>
                ) : summaryDetail === "environments" ? (
                  <button type="button" className="summary-environment-item" key={item.id} onClick={() => setSelectedEnvironmentId(item.id)}>
                    <strong>{item.primary}</strong><span>{item.secondary}</span><small>Ver programación del ambiente →</small>
                  </button>
                ) : <article key={item.id}><strong>{item.primary}</strong><span>{item.secondary}</span></article>)}
              </div>
            ) : (
              <div className="empty-panel">No hay resultados para la búsqueda.</div>
            )}
          </section>
        </div>
      )}

      {errorMsg && <div className="toast toast-error">{errorMsg}</div>}
      {!hasMasterData && !isConsulta && (
        <div className="empty-panel">Primero cargue el archivo normalizado desde Carga Masiva.</div>
      )}

              {/* 2. Main Workspace */}
              <div className="schedule-grid full-grid planner-sections-stack">
                {/* Grilla de listado (Izquierda) */}
<div className="schedule-table-section">
                <section className="week-view-card schedule-navigation-card" aria-label="Consultas de programación">
                  <div className="week-view-header">
                    <div>
                      <span className="eyebrow">Consultas de programación</span>
                      <h3>Visualización de horarios</h3>
                      <p className="text-muted">Consulte la matriz académica o el listado detallado en páginas independientes.</p>
                    </div>
                  </div>
                  <div className="quick-links-grid">
                    <button type="button" className="btn-secondary" onClick={() => setActiveTab("schedule-matrix")}>Ver Matriz Académica</button>
                    <button type="button" className="btn-secondary" onClick={() => setActiveTab("schedule-detail")}>Ver Programación Detallada</button>
                  </div>
                </section>
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
        open={Boolean(confirmDeleteIds?.length)}
        title={confirmDeleteIds && confirmDeleteIds.length > 1 ? "Eliminar horarios" : "Eliminar horario"}
        message={`¿Seguro que deseas eliminar ${confirmDeleteIds?.length || 0} ${confirmDeleteIds?.length === 1 ? "horario" : "horarios"}?`}
        confirmLabel={confirmDeleteIds && confirmDeleteIds.length > 1 ? "Eliminar horarios" : "Eliminar horario"}
        confirmDanger
        onConfirm={() => void deleteWeeklySchedules()}
        onCancel={() => setConfirmDeleteIds(null)}
      />
    </div>
  );
}
