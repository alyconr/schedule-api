import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTopicSelection, getTopicSelectionOptions } from "../api/topics";
import { CurrentUser } from "../types/auth";
import { TopicSelectionItem } from "../types/topics";

interface TopicSelectionPageProps {
  currentUser: CurrentUser;
  onSelectionChange?: (items: TopicSelectionItem[]) => void;
}

function topicHours(item: TopicSelectionItem): number {
  return Number(item.topic_hours ?? 0) || 0;
}

function compactText(text: string, max = 90): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function TopicSelectionPage({ onSelectionChange }: TopicSelectionPageProps) {
  const [programScope, setProgramScope] = useState("");
  const [trimesterNumber, setTrimesterNumber] = useState("");
  const [learningResultId, setLearningResultId] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, TopicSelectionItem>>({});

  const optionsParams = {
    program_scope: programScope || undefined,
    trimester_number: trimesterNumber ? Number(trimesterNumber) : undefined,
  };
  const selectionParams = {
    ...optionsParams,
    learning_result_id: learningResultId ? Number(learningResultId) : undefined,
    search: search.trim() || undefined,
  };

  const optionsQuery = useQuery({
    queryKey: ["topic-selection-options", optionsParams],
    queryFn: () => getTopicSelectionOptions(optionsParams),
  });

  const topicsQuery = useQuery({
    queryKey: ["topic-selection", selectionParams],
    queryFn: () => getTopicSelection(selectionParams),
  });

  const selectedItems = useMemo(() => Object.values(selected), [selected]);
  const selectedHours = selectedItems.reduce((total, item) => total + topicHours(item), 0);
  const selectedRapCount = new Set(selectedItems.map((item) => item.learning_result_id)).size;
  const selectedByRap = selectedItems.reduce<Record<string, TopicSelectionItem[]>>((groups, item) => {
    const key = `${item.learning_result_code} - ${item.learning_result_description}`;
    groups[key] = [...(groups[key] ?? []), item];
    return groups;
  }, {});

  useEffect(() => {
    onSelectionChange?.(selectedItems);
  }, [onSelectionChange, selectedItems]);

  const toggleTopic = (item: TopicSelectionItem) => {
    setSelected((current) => {
      const next = { ...current };
      if (next[item.relation_id]) {
        delete next[item.relation_id];
      } else {
        next[item.relation_id] = item;
      }
      return next;
    });
  };

  const handleProgramScopeChange = (value: string) => {
    setProgramScope(value);
    setLearningResultId("");
  };

  const handleTrimesterChange = (value: string) => {
    setTrimesterNumber(value);
    setLearningResultId("");
  };

  const options = optionsQuery.data;
  const topics = topicsQuery.data ?? [];
  const hasOptions = Boolean(options?.program_scopes.length || options?.trimesters.length || options?.learning_results.length);
  const noLearningResults = Boolean(programScope || trimesterNumber) && options && options.learning_results.length === 0;

  return (
    <div className="topic-selection-page">
      <div className="planner-hero">
        <div>
          <p className="eyebrow">RAP / Tematicas</p>
          <h2>Seleccion de Tematicas</h2>
          <p className="subtitle">
            Filtra las tematicas por tipo de oferta, trimestre y resultado de aprendizaje.
          </p>
        </div>
      </div>

      <section className="topic-filters" aria-label="Filtros de tematicas">
        <label>
          Tipo de oferta
          <select value={programScope} onChange={(event) => handleProgramScopeChange(event.target.value)}>
            <option value="">Todas</option>
            <option value="oferta_abierta">Oferta abierta</option>
            <option value="oferta_cerrada">Oferta cerrada / cadena de formacion</option>
          </select>
        </label>
        <label>
          Trimestre
          <select value={trimesterNumber} onChange={(event) => handleTrimesterChange(event.target.value)}>
            <option value="">Todos</option>
            {(options?.trimesters ?? []).map((trimester) => (
              <option key={trimester} value={trimester}>
                Trimestre {trimester}
              </option>
            ))}
          </select>
        </label>
        <label>
          Resultado de Aprendizaje
          <select value={learningResultId} onChange={(event) => setLearningResultId(event.target.value)}>
            <option value="">Todos los RAP</option>
            {(options?.learning_results ?? []).map((result) => (
              <option key={`${result.id}-${result.program_scope}-${result.trimester_number}`} value={result.id}>
                {result.code} - {compactText(result.description, 70)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Buscar
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tematica, codigo o RAP"
          />
        </label>
      </section>

      {optionsQuery.isLoading || topicsQuery.isLoading ? (
        <div className="loader">Cargando tematicas relacionadas...</div>
      ) : optionsQuery.isError || topicsQuery.isError ? (
        <div className="error-panel">
          <h3>Error al cargar tematicas</h3>
          <p>No fue posible consultar las relaciones RAP / tematica.</p>
        </div>
      ) : !hasOptions ? (
        <div className="empty-panel">
          No hay tematicas relacionadas. Primero importa el archivo normalizado RA / Tematicas desde Carga Masiva usando
          el tipo "Semaforos RA / Tematicas".
        </div>
      ) : noLearningResults ? (
        <div className="empty-panel">
          No existen resultados de aprendizaje para el tipo de oferta y trimestre seleccionados.
        </div>
      ) : (
        <div className="topic-selection-grid">
          <section className="table-responsive topic-table-wrap">
            <table className="crud-table topic-table">
              <thead>
                <tr>
                  <th>Seleccionar</th>
                  <th>Tipo de oferta</th>
                  <th>Trimestre</th>
                  <th>Resultado de aprendizaje</th>
                  <th>Tematica</th>
                  <th>Horas</th>
                  <th>Estado</th>
                  <th>Revision</th>
                </tr>
              </thead>
              <tbody>
                {topics.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center empty-cell">
                      <strong>No hay tematicas para los filtros actuales</strong>
                      <span>Ajusta el tipo de oferta, trimestre, RAP o busqueda.</span>
                    </td>
                  </tr>
                ) : (
                  topics.map((item) => (
                    <tr key={item.relation_id}>
                      <td>
                        <input
                          aria-label={`Seleccionar ${item.topic_name}`}
                          checked={Boolean(selected[item.relation_id])}
                          onChange={() => toggleTopic(item)}
                          type="checkbox"
                        />
                      </td>
                      <td>{item.program_scope_label}</td>
                      <td>{item.trimester_number ? `Trimestre ${item.trimester_number}` : "Sin trimestre"}</td>
                      <td>
                        <strong>{item.learning_result_code}</strong>
                        <span className="topic-muted">{compactText(item.learning_result_description)}</span>
                      </td>
                      <td>
                        <strong>{item.topic_name}</strong>
                        <span className="topic-muted">{item.topic_code}</span>
                      </td>
                      <td>{topicHours(item) || "-"}</td>
                      <td>
                        <span className={item.relation_status === "OK" ? "schedule-status status-validated" : "schedule-status status-warning"}>
                          {item.relation_status === "OK" ? "Relacion validada" : item.relation_status || "Sin estado"}
                        </span>
                        {item.confidence && (
                          <span className="topic-confidence">Confianza {item.confidence}</span>
                        )}
                      </td>
                      <td>
                        {item.needs_manual_review ? (
                          <span className="schedule-status status-warning">Revisar relacion</span>
                        ) : (
                          <span className="topic-muted">No requiere</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <aside className="topic-summary">
            <div className="topic-summary-stats">
              <span>Tematicas seleccionadas</span>
              <strong>{selectedItems.length}</strong>
              <span>Horas estimadas seleccionadas</span>
              <strong>{selectedHours}</strong>
              <span>RAP involucrados</span>
              <strong>{selectedRapCount}</strong>
            </div>
            <div className="topic-summary-list">
              {selectedItems.length === 0 ? (
                <p className="topic-muted">Selecciona una o varias tematicas para ver el resumen.</p>
              ) : (
                Object.entries(selectedByRap).map(([rap, items]) => (
                  <div key={rap} className="topic-rap-group">
                    <strong>Resultado: {compactText(rap, 72)}</strong>
                    <ul>
                      {items.map((item) => (
                        <li key={item.relation_id}>
                          {item.topic_name} - {topicHours(item) || 0} horas
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
