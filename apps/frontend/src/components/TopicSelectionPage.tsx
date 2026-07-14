import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DetailDialog } from "./DetailDialog";
import { getTopicSelection, getTopicSelectionOptions } from "../api/topics";
import { CurrentUser } from "../types/auth";
import { TopicSelectionItem } from "../types/topics";
import { SearchableSelect } from "./SearchableSelect";

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
  const [detailTopic, setDetailTopic] = useState<TopicSelectionItem | null>(null);

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
        <SearchableSelect label="Tipo de oferta" value={programScope} placeholder="Todas" options={[{ value: "oferta_abierta", label: "Oferta abierta" }, { value: "cadena", label: "Cadena de formación" }]} onChange={(value) => handleProgramScopeChange(String(value))} />
        <SearchableSelect label="Trimestre" value={trimesterNumber} placeholder="Todos" options={(options?.trimesters ?? []).map((trimester) => ({ value: trimester, label: `Trimestre ${trimester}` }))} onChange={(value) => handleTrimesterChange(String(value))} />
        <SearchableSelect label="Resultado de Aprendizaje" value={learningResultId} placeholder="Todos los RAP" searchPlaceholder="Buscar RAP..." options={(options?.learning_results ?? []).map((result) => ({ value: result.id, label: result.code, description: compactText(result.description, 100) }))} onChange={(value) => setLearningResultId(String(value))} />
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
          No hay tematicas relacionadas. Primero cargue el archivo normalizado desde Carga Masiva.
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
                    <tr
                      key={item.relation_id}
                      className="clickable-row"
                      tabIndex={0}
                      onClick={(event) => {
                        if (!(event.target as HTMLElement).closest("button, input, a, select, textarea, label")) setDetailTopic(item);
                      }}
                      onKeyDown={(event) => {
                        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          setDetailTopic(item);
                        }
                      }}
                      aria-label={`Ver detalle de ${item.topic_name}`}
                    >
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
      <DetailDialog
        open={detailTopic !== null}
        title={detailTopic?.topic_name || "Temática"}
        fields={detailTopic ? [
          { label: "Tipo de oferta", value: detailTopic.program_scope_label },
          { label: "Trimestre", value: detailTopic.trimester_number ? `Trimestre ${detailTopic.trimester_number}` : "Sin trimestre" },
          { label: "Código RAP", value: detailTopic.learning_result_code },
          { label: "Resultado de aprendizaje", value: detailTopic.learning_result_description },
          { label: "Código temática", value: detailTopic.topic_code },
          { label: "Temática", value: detailTopic.topic_name },
          { label: "Horas", value: topicHours(detailTopic) },
          { label: "Estado", value: detailTopic.relation_status },
          { label: "Confianza", value: detailTopic.confidence },
          { label: "Revisión manual", value: detailTopic.needs_manual_review ? "Sí" : "No" },
        ] : []}
        onClose={() => setDetailTopic(null)}
      />
    </div>
  );
}
