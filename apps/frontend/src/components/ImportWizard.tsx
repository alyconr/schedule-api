import React, { useEffect, useState } from "react";
import { CurrentUser } from "../types/auth";
import { previewImport, commitImport } from "../api/imports";
import { fetchCoordinations } from "../api/coordinations";
import {
  ImportPreviewResponse,
  ImportCommitResponse,
  ImportIssue,
  ImportType,
  ImportConflictItem,
  ImportChangeItem,
} from "../types/imports";
import { Coordination } from "../types/masterData";

interface ImportWizardProps {
  currentUser: CurrentUser;
}

export function ImportWizard({ currentUser }: ImportWizardProps) {
  const [importType, setImportType] = useState<ImportType>("schedule_normalized");
  const [scheduleYear, setScheduleYear] = useState<number>(new Date().getFullYear());
  const [scheduleQuarter, setScheduleQuarter] = useState<1 | 2 | 3 | 4>(
    (Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4,
  );
  const [coordinations, setCoordinations] = useState<Coordination[]>([]);
  const [selectedCoordinationId, setSelectedCoordinationId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [result, setResult] = useState<ImportCommitResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showChangesDetail, setShowChangesDetail] = useState<boolean>(false);

  const roles = currentUser.roles || [];
  const canWrite = roles.includes("admin") || roles.includes("coordinador") || roles.includes("programador");

  useEffect(() => {
    async function loadCoordinations() {
      try {
        const coords = await fetchCoordinations();
        setCoordinations(coords);
        if (coords.length === 1) {
          setSelectedCoordinationId(coords[0].id);
        } else if (currentUser.scope?.coordinations?.length === 1) {
          setSelectedCoordinationId(currentUser.scope.coordinations[0].id);
        }
      } catch (err: any) {
        // Fallback to user scope
        if (currentUser.scope?.coordinations) {
          const list = currentUser.scope.coordinations.map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            description: undefined,
            is_active: true,
          }));
          setCoordinations(list);
          if (list.length === 1) {
            setSelectedCoordinationId(list[0].id);
          }
        }
      }
    }
    loadCoordinations();
  }, [currentUser]);

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

    if (importType === "schedule_normalized" && !selectedCoordinationId && !currentUser.scope?.is_global) {
      setErrorMsg("Debes seleccionar una coordinación activa para la carga.");
      return;
    }

    const period = importType === "schedule_history" ? { scheduleYear, scheduleQuarter } : undefined;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPreview(null);
    setResult(null);

    try {
      const data = await previewImport(
        file,
        importType,
        selectedCoordinationId ?? undefined,
        period,
      );
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

    if (importType === "schedule_normalized" && !selectedCoordinationId && !currentUser.scope?.is_global) {
      setErrorMsg("Debes seleccionar una coordinación activa para la importación.");
      return;
    }

    setIsCommitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setResult(null);

    try {
      const period = importType === "schedule_history" ? { scheduleYear, scheduleQuarter } : undefined;
      const data = await commitImport(
        file,
        importType,
        "safe_merge",
        selectedCoordinationId ?? undefined,
        period,
      );
      setResult(data);
      if (data.status === "failed") {
        setErrorMsg("La importación falló debido a errores en la base de datos.");
      } else if (data.status === "completed_with_warnings") {
        setSuccessMsg("¡Importación completada con advertencias y/o conflictos omitidos de forma segura!");
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
      case "academic_periods":
        return "Periodos Académicos";
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
          <h1>Carga de datos e históricos por Coordinación</h1>
        </div>
      </header>

      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="alert alert-info" style={{ marginBottom: "1rem" }}>
        <strong>Principio de importación incremental:</strong> La carga es incremental mediante{" "}
        <em>safe_merge</em>. Los registros existentes que no aparezcan en el archivo no se eliminarán ni desactivarán.
        Cada coordinación gestiona sus fichas sin afectar ni sobreescribir datos de otras coordinaciones.
      </div>

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
                <option value="schedule_normalized">Datos maestros normalizados institucional SENA</option>
                <option value="schedule_history">Histórico de horarios por trimestre</option>
              </select>
            </label>

            {importType === "schedule_normalized" && (
              <label>
                Coordinación activa <span style={{ color: "red" }}>*</span>
                <select
                  value={selectedCoordinationId ?? ""}
                  onChange={(e) => setSelectedCoordinationId(e.target.value ? Number(e.target.value) : null)}
                  required={!currentUser.scope?.is_global}
                >
                  <option value="">-- Seleccione una Coordinación --</option>
                  {coordinations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Modo de carga
              <select value="safe_merge" disabled>
                <option value="safe_merge">Actualización segura incremental (safe_merge)</option>
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
              Archivo Excel (.xlsx)
              <input type="file" accept=".xlsx" onChange={handleFileChange} />
              <small className="field-help">
                {importType === "schedule_history"
                  ? "Use una hoja con: fecha, documento_instructor, ficha, ambiente, codigo_rap, hora_inicio, hora_fin y duracion_horas. Todas las fechas deben pertenecer al periodo seleccionado."
                  : "Cargue la matriz institucional normalizada .xlsx (FICHAS, LISTA INSTRUCTORES, AMBIENTES, TRIMESTRE y matrices de semáforo)."}
              </small>
            </label>
          </div>

          <button className="btn-primary" type="submit" disabled={isLoading || !file}>
            {isLoading ? "Analizando y comparando con base de datos..." : "Analizar archivo (Preview)"}
          </button>
        </form>
      </div>

      {preview && (
        <div className="preview-results-card">
          <h2>Vista Previa Diferencial</h2>
          <p className="filename-label">
            Archivo: <strong>{preview.filename}</strong>{" "}
            {preview.file_sha256 && (
              <span style={{ fontSize: "0.85em", color: "#666" }}>
                (SHA-256: {preview.file_sha256.substring(0, 16)}...)
              </span>
            )}
          </p>

          {preview.is_reimport && (
            <div className="alert alert-warning">
              <strong>Atención:</strong> Este mismo archivo ya fue importado anteriormente para esta coordinación.
              La reimportación aplicará safe_merge idempotente sin duplicar información.
            </div>
          )}

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
                  <div className="stat stat-valid" title="Nuevos registros">
                    <span className="stat-count">{value.created ?? 0}</span>
                    <span className="stat-label">Nuevos</span>
                  </div>
                  <div className="stat stat-warning" title="Registros a actualizar">
                    <span className="stat-count">{value.updated ?? 0}</span>
                    <span className="stat-label">Actualizar</span>
                  </div>
                  <div className="stat" title="Registros sin cambios" style={{ color: "#4b5563" }}>
                    <span className="stat-count">{value.unchanged ?? 0}</span>
                    <span className="stat-label">Sin cambio</span>
                  </div>
                  <div className="stat stat-rejected" title="Conflictos de scope o integridad">
                    <span className="stat-count">{value.conflicts ?? 0}</span>
                    <span className="stat-label">Conflictos</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Panel de Conflictos si existen */}
          {preview.conflicts_detail && preview.conflicts_detail.length > 0 && (
            <div className="issue-section error-section">
              <div className="issue-section-header">
                <h3>Conflictos Detectados ({preview.conflicts_detail.length})</h3>
              </div>
              <p style={{ margin: "0.5rem 0", color: "#b91c1c", fontSize: "0.9rem" }}>
                Los siguientes registros entran en conflicto de coordinación o datos institucionales. Serán omitidos de forma segura durante la importación.
              </p>
              <div className="issue-list-container">
                <table className="table" style={{ width: "100%", fontSize: "0.9rem" }}>
                  <thead>
                    <tr>
                      <th>Entidad</th>
                      <th>Clave Natural</th>
                      <th>Ubicación</th>
                      <th>Motivo del Conflicto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.conflicts_detail.map((c, idx) => (
                      <tr key={idx}>
                        <td><strong>{translateEntity(c.entity)}</strong></td>
                        <td><code>{c.natural_key}</code></td>
                        <td>{c.sheet ? `${c.sheet}${c.row ? ` (Fila ${c.row})` : ""}` : "N/A"}</td>
                        <td>{c.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Panel de Cambios Detectados si existen */}
          {preview.changes_detail && preview.changes_detail.length > 0 && (
            <div className="issue-section" style={{ border: "1px solid #93c5fd", background: "#eff6ff" }}>
              <div className="issue-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3>Cambios Propuestos ({preview.changes_detail.length})</h3>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setShowChangesDetail(!showChangesDetail)}
                >
                  {showChangesDetail ? "Ocultar detalles de cambios" : "Ver detalle de campos modificados"}
                </button>
              </div>
              {showChangesDetail && (
                <div className="issue-list-container" style={{ marginTop: "0.5rem" }}>
                  <table className="table" style={{ width: "100%", fontSize: "0.85rem" }}>
                    <thead>
                      <tr>
                        <th>Entidad</th>
                        <th>Clave</th>
                        <th>Campo</th>
                        <th>Valor Actual</th>
                        <th>Nuevo Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.changes_detail.flatMap((item, i) =>
                        Object.entries(item.changes).map(([fld, diff], j) => (
                          <tr key={`${i}-${j}`}>
                            <td>{translateEntity(item.entity)}</td>
                            <td><code>{item.natural_key}</code></td>
                            <td><strong>{fld}</strong></td>
                            <td style={{ color: "#dc2626" }}>{String(diff.before ?? "vacio")}</td>
                            <td style={{ color: "#16a34a" }}>{String(diff.after ?? "vacio")}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

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
                <h3>Errores Críticos del Archivo ({preview.errors.length})</h3>
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
            <div className="commit-action-box text-center" style={{ marginTop: "1.5rem" }}>
              <p>El archivo es válido para procesar con safe_merge. Los registros seguros se importarán en una transacción atómica.</p>
              <button className="btn-primary btn-lg" onClick={handleCommit} disabled={isCommitting}>
                {isCommitting ? "Importando con transacción atómica..." : "Confirmar e Importar Lote"}
              </button>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="commit-results-card">
          <h2>Resultado de la Importación</h2>
          <div className="status-indicator">
            Estado del lote {result.batch_id ? `#${result.batch_id}` : ""}:{" "}
            <span
              className={`status-badge ${
                result.status === "completed"
                  ? "status-success"
                  : result.status === "completed_with_warnings"
                  ? "status-warning"
                  : "status-danger"
              }`}
            >
              {result.status === "completed"
                ? "Completado exitosamente"
                : result.status === "completed_with_warnings"
                ? "Completado con advertencias/conflictos omitidos"
                : "Falló"}
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
              <h3>Registros Actualizados (Safe Update)</h3>
              <ul>
                {Object.entries(result.updated).map(([key, val]) => (
                  <li key={key}><strong>{translateEntity(key)}:</strong> {val}</li>
                ))}
              </ul>
            </div>

            {result.unchanged && Object.keys(result.unchanged).length > 0 && (
              <div className="results-box">
                <h3>Registros Sin Cambios</h3>
                <ul>
                  {Object.entries(result.unchanged).map(([key, val]) => (
                    <li key={key}><strong>{translateEntity(key)}:</strong> {val}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
