import React, { useState } from "react";
import { CurrentUser } from "../types/auth";
import { previewImport, commitImport } from "../api/imports";
import { ImportPreviewResponse, ImportCommitResponse, ImportIssue, ImportType } from "../types/imports";

interface ImportWizardProps {
  currentUser: CurrentUser;
}

export function ImportWizard({ currentUser }: ImportWizardProps) {
  const [importType, setImportType] = useState<ImportType>("schedule_normalized");
  const [scheduleYear, setScheduleYear] = useState<number>(new Date().getFullYear());
  const [scheduleQuarter, setScheduleQuarter] = useState<1 | 2 | 3 | 4>(
    (Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4,
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [result, setResult] = useState<ImportCommitResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const roles = currentUser.roles || [];
  const canWrite = roles.includes("admin") || roles.includes("coordinador") || roles.includes("programador");

  if (!canWrite) {
    return (
      <div className="error-panel text-center">
        <h3>Acceso Denegado</h3>
        <p>No tienes permisos para realizar cargas masivas de datos.</p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setPreview(null);
      setResult(null);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg("Por favor, selecciona un archivo.");
      return;
    }
    const period = importType === "schedule_history" ? { scheduleYear, scheduleQuarter } : undefined;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPreview(null);
    setResult(null);

    try {
      const data = await previewImport(file, importType, period);
      setPreview(data);
      if (data.errors && data.errors.length > 0) {
        setErrorMsg("El archivo analizado contiene errores críticos que impiden la importación.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al analizar el archivo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!file || !preview) return;

    setIsCommitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setResult(null);

    try {
      const period = importType === "schedule_history" ? { scheduleYear, scheduleQuarter } : undefined;
      const data = await commitImport(file, importType, "upsert", period);
      setResult(data);
      if (data.status === "failed") {
        setErrorMsg("La importación falló debido a errores en la base de datos.");
      } else {
        setSuccessMsg("¡Importación de datos completada con éxito!");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al confirmar la importación.");
    } finally {
      setIsCommitting(false);
    }
  };

  const copyErrorsToClipboard = (issues: ImportIssue[]) => {
    const text = issues
      .map(
        (issue) =>
          `[${issue.severity.toUpperCase()}] Hoja: ${issue.sheet} | Fila: ${issue.row || "N/A"} | Detalle: ${
            issue.message
          } (Valor: ${issue.raw_value || "N/A"})`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    setSuccessMsg("Observaciones copiadas al portapapeles.");
  };

  const translateEntity = (key: string): string => {
    switch (key) {
      case "instructors":
        return "Instructores";
      case "environments":
        return "Ambientes";
      case "groups":
        return "Fichas / Grupos";
      case "learning_results":
        return "Resultados de Aprendizaje (RAP)";
      case "topics":
        return "Temáticas";
      case "color_groups":
        return "Grupos por Color";
      case "ra_topic_relations":
      case "learning_result_topics":
        return "Relaciones RA-Temática";
      case "contract_types":
        return "Tipos de Vinculación";
      case "programs":
        return "Programas de Formación";
      case "competencies":
        return "Competencias";
      case "schedules":
        return "Horarios históricos";
      default:
        return key;
    }
  };

  return (
    <section className="workspace import-wizard">
      <header className="topbar">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Carga de datos e históricos</h1>
        </div>
      </header>

      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="upload-card">
        <form onSubmit={handlePreview} className="import-form">
          <div className="form-row">
            <label>
              Tipo de carga
              <select
                value={importType}
                onChange={(event) => {
                  setImportType(event.target.value as ImportType);
                  setFile(null);
                  setPreview(null);
                  setResult(null);
                }}
              >
                <option value="schedule_normalized">Datos maestros normalizados</option>
                <option value="schedule_history">Histórico de horarios por trimestre</option>
              </select>
            </label>
          </div>
          {importType === "schedule_history" && (
            <div className="form-row">
              <label>
                Año del histórico
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={scheduleYear}
                  onChange={(event) => setScheduleYear(Number(event.target.value))}
                  required
                />
              </label>
              <label>
                Trimestre del histórico
                <select
                  value={scheduleQuarter}
                  onChange={(event) => setScheduleQuarter(Number(event.target.value) as 1 | 2 | 3 | 4)}
                  required
                >
                  <option value="1">I Trimestre</option>
                  <option value="2">II Trimestre</option>
                  <option value="3">III Trimestre</option>
                  <option value="4">IV Trimestre</option>
                </select>
              </label>
            </div>
          )}
          <div className="form-row">
            <label>
              Archivo (.xlsx)
              <input type="file" accept=".xlsx" onChange={handleFileChange} />
              <small className="field-help">
                {importType === "schedule_history"
                  ? "Use una hoja con: fecha, documento_instructor, ficha, ambiente, codigo_rap, hora_inicio, hora_fin y duracion_horas. Todas las fechas deben pertenecer al periodo seleccionado."
                  : "Cargue únicamente el archivo normalizado SEMAFOROS_NORMALIZADO_SCHEDULE_API.xlsx con las hojas institucionales requeridas."}
              </small>
            </label>
          </div>

          <button className="btn-primary" type="submit" disabled={isLoading || !file}>
            {isLoading ? "Analizando..." : "Analizar archivo"}
          </button>
        </form>
      </div>

      {preview && (
        <div className="preview-results-card">
          <h2>Vista Previa del Análisis</h2>
          <p className="filename-label">Archivo: <strong>{preview.filename}</strong></p>

          <div className="sheets-detected-section">
            <span className="section-label">Hojas detectadas:</span>
            <div className="sheets-badges-container">
              {preview.sheets_detected.map((sheet) => (
                <span key={sheet} className="sheet-badge">{sheet}</span>
              ))}
            </div>
          </div>

          <div className="import-summary-grid">
            {Object.entries(preview.summary).map(([key, value]) => (
              <div key={key} className="summary-card">
                <h3>{translateEntity(key)}</h3>
                <div className="summary-stats">
                  <div className="stat stat-valid">
                    <span className="stat-count">{value.valid}</span>
                    <span className="stat-label">Válidos</span>
                  </div>
                  <div className="stat stat-warning">
                    <span className="stat-count">{value.warnings}</span>
                    <span className="stat-label">Advertencias</span>
                  </div>
                  <div className="stat stat-rejected">
                    <span className="stat-count">{value.rejected}</span>
                    <span className="stat-label">Rechazados</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {preview.warnings && preview.warnings.length > 0 && (
            <div className="issue-section warning-section">
              <div className="issue-section-header">
                <h3>Advertencias ({preview.warnings.length})</h3>
                <button className="btn-secondary btn-sm" onClick={() => copyErrorsToClipboard(preview.warnings)}>
                  Copiar Advertencias
                </button>
              </div>
              <div className="issue-list-container">
                <ul className="issue-list">
                  {preview.warnings.map((warn, index) => (
                    <li key={index} className="issue-item issue-warning">
                      <strong>Fila {warn.row || "N/A"} ({warn.sheet}):</strong> {warn.message}{" "}
                      {warn.raw_value && <span className="raw-val">Valor: "{warn.raw_value}"</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {preview.errors && preview.errors.length > 0 && (
            <div className="issue-section error-section">
              <div className="issue-section-header">
                <h3>Errores Críticos ({preview.errors.length})</h3>
                <button className="btn-secondary btn-sm" onClick={() => copyErrorsToClipboard(preview.errors)}>
                  Copiar Errores
                </button>
              </div>
              <div className="issue-list-container">
                <ul className="issue-list">
                  {preview.errors.map((err, index) => (
                    <li key={index} className="issue-item issue-error">
                      <strong>Fila {err.row || "N/A"} ({err.sheet}):</strong> {err.message}{" "}
                      {err.raw_value && <span className="raw-val">Valor: "{err.raw_value}"</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {(!preview.errors || preview.errors.length === 0) && !result && (
            <div className="commit-action-box text-center">
              <p>El archivo está libre de errores críticos. Puedes proceder con la importación definitiva.</p>
              <button className="btn-primary btn-lg" onClick={handleCommit} disabled={isCommitting}>
                {isCommitting ? "Importando..." : "Confirmar Importación"}
              </button>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="commit-results-card">
          <h2>Resultado de la Importación</h2>
          <div className="status-indicator">
            Estado final:{" "}
            <span className={`status-badge ${result.status === "completed" ? "status-success" : "status-warning"}`}>
              {result.status === "completed" ? "Completado" : "Completado con advertencias"}
            </span>
          </div>

          <div className="results-grid">
            <div className="results-box">
              <h3>Registros Creados</h3>
              <ul>
                {Object.entries(result.created).map(([key, val]) => (
                  <li key={key}><strong>{translateEntity(key)}:</strong> {val}</li>
                ))}
              </ul>
            </div>

            <div className="results-box">
              <h3>Registros Actualizados (Upsert)</h3>
              <ul>
                {Object.entries(result.updated).map(([key, val]) => (
                  <li key={key}><strong>{translateEntity(key)}:</strong> {val}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
