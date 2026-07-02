import { FormEvent, useState } from "react";

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

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export function App() {
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const statusLabel =
    result?.status === "blocked" ? "Bloqueado" : result?.status === "warning" ? "Con alertas" : result ? "Valido" : "Sin validar";

  async function validateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

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
      const response = await fetch(`${API_URL}/schedules/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("No se pudo validar el horario.");
      setResult((await response.json()) as ValidationResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error inesperado.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">CGMLTI Bogota</p>
            <h1>Schedule Stack</h1>
          </div>
          <output className={`status status-${result?.status ?? "idle"}`}>{statusLabel}</output>
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
              Contrato
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
                <option value="fisico">Fisico</option>
                <option value="virtual">Virtual</option>
                <option value="externo">Externo</option>
              </select>
            </label>
          </div>

          <fieldset className="checks">
            <label><input name="instructor_active" type="checkbox" defaultChecked /> Instructor activo</label>
            <label><input name="group_active" type="checkbox" defaultChecked /> Ficha activa</label>
            <label><input name="environment_active" type="checkbox" defaultChecked /> Ambiente activo</label>
          </fieldset>

          <button disabled={loading} type="submit">{loading ? "Validando" : "Validar horario"}</button>
        </form>

        {error && <p className="error">{error}</p>}

        <section className="results" aria-live="polite">
          {result?.validations.length ? (
            result.validations.map((item) => (
              <article className={`finding finding-${item.severity.toLowerCase()}`} key={item.rule_code}>
                <strong>{item.rule_code}</strong>
                <span>{item.message}</span>
              </article>
            ))
          ) : (
            <p className="empty">La franja queda lista para programacion cuando la API responde sin bloqueos.</p>
          )}
        </section>
      </section>
    </main>
  );
}
