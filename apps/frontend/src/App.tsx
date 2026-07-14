import { FormEvent, useEffect, useState, useTransition } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getMe } from "./api/auth";
import { apiRequest } from "./api/client";
import { LoginForm } from "./components/LoginForm";
import { AppLayout } from "./components/AppLayout";
import { ToastProvider } from "./components/ToastProvider";
import { ResourceCrud, ResourceConfig } from "./components/ResourceCrud";
import { SchedulePlanner } from "./components/SchedulePlanner";
import { UserManagement } from "./components/UserManagement";
import { ImportWizard } from "./components/ImportWizard";
import { ValidationAlertDialog, validationRuleLabel } from "./components/ValidationAlertDialog";
import { CurrentUser } from "./types/auth";

type ValidationResult = {
  rule_code: string;
  severity: "INFO" | "WARNING" | "BLOCKING";
  message: string;
  is_blocking: boolean;
  field: string | null;
};

type ValidationResponse = {
  status: "valid" | "warning" | "blocked";
  validations: ValidationResult[];
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// Definitions for the 8 Master Data entities
const resourceConfigs: Record<string, ResourceConfig> = {
  "contract-types": {
    key: "contract-types",
    label: "Tipos de Vinculación",
    endpoint: "contract-types",
    fields: [
      { name: "name", label: "Tipo de vinculación", type: "text", required: true },
      {
        name: "category",
        label: "Categoría",
        type: "select",
        required: true,
        options: [
          { label: "Planta / Carrera administrativa", value: "planta" },
          { label: "Contratista", value: "contratista" },
          { label: "Otro", value: "otro" },
        ],
      },
      { name: "monthly_training_hours", label: "Horas formación mes", type: "number" },
      { name: "monthly_additional_hours", label: "Horas adicionales mes", type: "number" },
      { name: "weekly_base_hours", label: "Regla semanal base", type: "number", required: true },
      { name: "weekly_max_hours", label: "Regla semanal máxima", type: "number", required: true },
      { name: "source_label", label: "Etiqueta origen", type: "text" },
      { name: "description", label: "Descripción", type: "textarea" },
    ],
  },
  instructors: {
    key: "instructors",
    label: "Instructores",
    endpoint: "instructors",
    fields: [
      { name: "document_type", label: "Tipo de Documento", type: "text", required: true },
      { name: "document_number", label: "Número de Documento", type: "text", required: true },
      { name: "first_name", label: "Nombres", type: "text", required: true },
      { name: "last_name", label: "Apellidos", type: "text", required: true },
      { name: "email", label: "Correo Electrónico", type: "text", required: true },
      { name: "phone", label: "Teléfono", type: "text" },
      {
        name: "contract_type_id",
        label: "Tipo de Vinculación",
        type: "select",
        relatedEndpoint: "contract-types",
        relatedDisplayField: "name",
      },
      { name: "area", label: "Área", type: "text" },
      { name: "specialty", label: "Especialidad", type: "text" },
      { name: "monthly_training_hours", label: "Horas formación mes", type: "number" },
      { name: "monthly_additional_hours", label: "Horas adicionales mes", type: "number" },
      { name: "weekly_base_hours", label: "Regla semanal base", type: "number", required: true },
      { name: "weekly_max_hours", label: "Regla semanal máxima", type: "number", required: true },
      { name: "notes", label: "Notas / Observaciones", type: "textarea" },
    ],
  },
  "training-programs": {
    key: "training-programs",
    label: "Programas de Formación",
    endpoint: "training-programs",
    fields: [
      { name: "code", label: "Código", type: "text", required: true },
      { name: "name", label: "Nombre del Programa", type: "text", required: true },
      { name: "version", label: "Versión", type: "text" },
      { name: "level", label: "Nivel de Formación", type: "text" },
      { name: "duration_hours", label: "Duración (Horas)", type: "number" },
    ],
  },
  competencies: {
    key: "competencies",
    label: "Competencias",
    endpoint: "competencies",
    fields: [
      { name: "code", label: "Código de Competencia", type: "text", required: true },
      { name: "name", label: "Descripción / Nombre", type: "text", required: true },
      {
        name: "training_program_id",
        label: "Programa de Formación",
        type: "select",
        relatedEndpoint: "training-programs",
        relatedDisplayField: "name",
      },
      { name: "hours", label: "Horas Totales", type: "number" },
    ],
  },
  "learning-results": {
    key: "learning-results",
    label: "Resultados de Aprendizaje (RAP)",
    endpoint: "learning-results",
    fields: [
      { name: "code", label: "Código RAP", type: "text", required: true },
      { name: "description", label: "Descripción del RAP", type: "textarea", required: true },
      {
        name: "competency_id",
        label: "Competencia",
        type: "select",
        relatedEndpoint: "competencies",
        relatedDisplayField: "name",
      },
      { name: "estimated_hours", label: "Horas Estimadas", type: "number" },
      { name: "result_type", label: "Tipo de Resultado", type: "text" },
    ],
  },
  groups: {
    key: "groups",
    label: "Fichas / Grupos",
    endpoint: "groups",
    fields: [
      { name: "code", label: "Código / Número de Ficha", type: "text", required: true },
      { name: "name", label: "Nombre alternativo", type: "text" },
      {
        name: "training_program_id",
        label: "Programa de Formación",
        type: "select",
        relatedEndpoint: "training-programs",
        relatedDisplayField: "name",
      },
      { name: "jornada", label: "Jornada", type: "text" },
      { name: "modality", label: "Modalidad", type: "text" },
      { name: "start_date", label: "Fecha Inicio", type: "date" },
      { name: "end_date", label: "Fecha Fin", type: "date" },
      { name: "productive_stage_start_date", label: "Fecha inicio etapa productiva", type: "date" },
      { name: "productive_stage_end_date", label: "Fecha fin etapa productiva", type: "date" },
      { name: "learners_count", label: "Número de Aprendices", type: "number", required: true },
      { name: "notes", label: "Observaciones", type: "textarea" },
    ],
  },
  environments: {
    key: "environments",
    label: "Ambientes",
    endpoint: "environments",
    fields: [
      { name: "code", label: "Código / Nombre de Ambiente", type: "text", required: true },
      { name: "name", label: "Descripción", type: "text", required: true },
      { name: "location", label: "Ubicación / Piso", type: "text" },
      { name: "capacity", label: "Capacidad Máxima", type: "number", required: true },
      {
        name: "environment_type",
        label: "Tipo de Ambiente",
        type: "select",
        required: true,
        options: [
          { label: "Físico", value: "fisico" },
          { label: "Virtual", value: "virtual" },
          { label: "Externo", value: "externo" },
        ],
      },
      { name: "resources", label: "Recursos disponibles", type: "textarea" },
      { name: "notes", label: "Observaciones", type: "textarea" },
    ],
  },
  "time-blocks": {
    key: "time-blocks",
    label: "Bloques Horarios",
    endpoint: "time-blocks",
    fields: [
      { name: "name", label: "Nombre del Bloque", type: "text", required: true },
      {
        name: "weekday",
        label: "Día de la Semana",
        type: "select",
        required: true,
        options: [
          { label: "Lunes", value: 1 },
          { label: "Martes", value: 2 },
          { label: "Miércoles", value: 3 },
          { label: "Jueves", value: 4 },
          { label: "Viernes", value: 5 },
          { label: "Sábado", value: 6 },
          { label: "Domingo", value: 7 },
        ],
      },
      { name: "start_time", label: "Hora de Inicio", type: "text", required: true },
      { name: "end_time", label: "Hora de Fin", type: "text", required: true },
      { name: "duration_minutes", label: "Duración (Minutos)", type: "number", required: true },
      { name: "jornada", label: "Jornada", type: "text" },
    ],
  },
};

function AppContent() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeTab, setActiveTab] = useState("schedules");
  const [isTabPending, startTabTransition] = useTransition();

  const handleTabChange = (tab: string) => {
    startTabTransition(() => setActiveTab(tab));
  };

  useEffect(() => {
    if (activeTab === "topic-selection") {
      setActiveTab("schedules");
    }
  }, [activeTab]);

  // Validation Form state
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [validationError, setValidationError] = useState("");
  const [validating, setValidating] = useState(false);
  const [showValidationAlert, setShowValidationAlert] = useState(false);

  const checkUserSession = async () => {
    const token = localStorage.getItem("schedule_api_token");
    if (!token) {
      setCurrentUser(null);
      setLoadingUser(false);
      return;
    }
    try {
      const user = await getMe();
      setCurrentUser(user);
    } catch {
      localStorage.removeItem("schedule_api_token");
      setCurrentUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    checkUserSession();

    // Listen to unauthorized event
    const handleUnauthorized = () => {
      setCurrentUser(null);
    };

    window.addEventListener("auth-unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth-unauthorized", handleUnauthorized);
    };
  }, []);

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem("schedule_api_token", token);
    setLoadingUser(true);
    checkUserSession();
  };

  const handleLogout = () => {
    localStorage.removeItem("schedule_api_token");
    setCurrentUser(null);
  };

const validateSchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");
    setValidating(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      instructor_id: String(form.get("instructor_id")),
      group_id: String(form.get("group_id")),
      environment_id: String(form.get("environment_id")),
      learning_result_id: String(form.get("learning_result_id")),
      program_learning_result_ids: String(form.get("program_learning_result_ids"))
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      date: String(form.get("date")),
      start_time: String(form.get("start_time")),
      end_time: String(form.get("end_time")),
      duration_hours: Number(form.get("duration_hours")),
      instructor_contract_type: String(form.get("instructor_contract_type")),
      instructor_weekly_hours: Number(form.get("instructor_weekly_hours")),
      group_learners: Number(form.get("group_learners")),
      environment_capacity: Number(form.get("environment_capacity")),
      environment_type: String(form.get("environment_type")),
      instructor_active: form.get("instructor_active") === "on",
      group_active: form.get("group_active") === "on",
      environment_active: form.get("environment_active") === "on",
      existing_schedules: [],
    };

    try {
      const data = await apiRequest<ValidationResponse>("/schedules/validate", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setValidationResult(data);
      setShowValidationAlert(data.validations.some((item) => item.is_blocking || item.severity === "BLOCKING"));
    } catch (caught: any) {
      setValidationError(caught.message || "Error inesperado.");
      setValidationResult(null);
    } finally {
      setValidating(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="app-loader">
        <div className="spinner"></div>
        <p>Cargando sesión...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  const statusLabel =
    validationResult?.status === "blocked"
      ? "Bloqueado"
      : validationResult?.status === "warning"
      ? "Con alertas"
      : validationResult
      ? "Válido"
      : "Sin validar";

  const roles = currentUser?.roles || [];
  const canValidate = roles.includes("admin") || roles.includes("coordinador") || roles.includes("programador");
  const visibleTab = activeTab === "topic-selection" ? "schedules" : activeTab;

  return (
<AppLayout
      currentUser={currentUser}
      onLogout={handleLogout}
      activeTab={visibleTab}
      setActiveTab={handleTabChange}
      isNavigating={isTabPending}
    >
      {visibleTab === "users" ? (
        <UserManagement currentUser={currentUser} />
      ) : visibleTab === "imports" ? (
        <ImportWizard currentUser={currentUser} />
      ) : visibleTab === "schedules" ? (
        <SchedulePlanner currentUser={currentUser} />
      ) : visibleTab === "validation" ? (
        !canValidate ? (
          <div className="error-panel">
            <h3>Acceso Denegado</h3>
            <p>No tienes suficientes permisos para validar horarios.</p>
          </div>
        ) : (
          <section className="workspace">
            <header className="topbar">
            <div>
              <p className="eyebrow">Validación de Horarios</p>
              <h1>Validar Asignación</h1>
            </div>
            <output className={`status status-${validationResult?.status ?? "idle"}`}>{statusLabel}</output>
          </header>

          <form className="planner" onSubmit={validateSchedule}>
            <div className="band">
              <label>
                Instructor
                <input name="instructor_id" defaultValue="inst-1" required />
              </label>
              <label>
                Ficha
                <input name="group_id" defaultValue="ficha-1" required />
              </label>
              <label>
                Ambiente
                <input name="environment_id" defaultValue="amb-1" required />
              </label>
              <label>
                RAP
                <input name="learning_result_id" defaultValue="rap-1" required />
              </label>
            </div>

            <div className="band">
              <label>
                RAP del programa
                <input name="program_learning_result_ids" defaultValue="rap-1,rap-2" required />
              </label>
              <label>
                Fecha
                <input name="date" type="date" defaultValue="2026-07-06" required />
              </label>
              <label>
                Inicio
                <input name="start_time" type="time" defaultValue="08:00" required />
              </label>
              <label>
                Fin
                <input name="end_time" type="time" defaultValue="10:00" required />
              </label>
            </div>

            <div className="band compact">
              <label>
                Horas bloque
                <input name="duration_hours" type="number" min="0.5" step="0.5" defaultValue="2" required />
              </label>
              <label>
                Vinculación
                <select name="instructor_contract_type" defaultValue="planta">
                  <option value="planta">Planta</option>
                  <option value="contratista">Contratista</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
              <label>
                Horas semana
                <input name="instructor_weekly_hours" type="number" min="0" step="0.5" defaultValue="28" required />
              </label>
              <label>
                Aprendices
                <input name="group_learners" type="number" min="0" defaultValue="25" required />
              </label>
              <label>
                Capacidad
                <input name="environment_capacity" type="number" min="0" defaultValue="30" required />
              </label>
              <label>
                Tipo ambiente
                <select name="environment_type" defaultValue="fisico">
                  <option value="fisico">Físico</option>
                  <option value="virtual">Virtual</option>
                  <option value="externo">Externo</option>
                </select>
              </label>
            </div>

            <fieldset className="checks">
              <label>
                <input name="instructor_active" type="checkbox" defaultChecked /> Instructor activo
              </label>
              <label>
                <input name="group_active" type="checkbox" defaultChecked /> Ficha activa
              </label>
              <label>
                <input name="environment_active" type="checkbox" defaultChecked /> Ambiente activo
              </label>
            </fieldset>

            <button disabled={validating} type="submit" className="btn-primary">
              {validating ? "Validando..." : "Validar horario"}
            </button>
          </form>

          {validationError && <p className="error">{validationError}</p>}

          <section className="results" aria-live="polite">
            {validationResult?.validations.length ? (
              validationResult.validations.map((item) => (
                <article className={`finding finding-${item.severity.toLowerCase()}`} key={item.rule_code}>
                  <strong>{validationRuleLabel(item.rule_code)}</strong>
                  <span>{item.message}</span>
                </article>
              ))
            ) : (
              <p className="empty">La franja queda lista para programación cuando la API responde sin bloqueos.</p>
            )}
          </section>
          <ValidationAlertDialog
            open={showValidationAlert}
            validations={validationResult?.validations || []}
            onClose={() => setShowValidationAlert(false)}
          />
        </section>
      )
      ) : (
        <ResourceCrud config={resourceConfigs[visibleTab]} currentUser={currentUser} />
      )}
    </AppLayout>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </QueryClientProvider>
  );
}
