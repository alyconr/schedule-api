import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { fetchList, createItem, updateItem, deleteItem } from "../api/masterData";
import { CurrentUser } from "../types/auth";
import { useToast } from "./ToastProvider";
import { ConfirmDialog } from "./ConfirmDialog";
import { DetailDialog } from "./DetailDialog";
import { SearchableSelect, SearchableSelectOption } from "./SearchableSelect";

function ResourceCrudSearchableField({ label, name, initialValue, options, required }: {
  label: string;
  name: string;
  initialValue: string | number | "";
  options: SearchableSelectOption[];
  required?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  return <SearchableSelect label={label} name={name} value={value} options={options} required={required} searchPlaceholder={`Buscar ${label.toLowerCase()}...`} onChange={setValue} />;
}

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

export type FieldConfig = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "time" | "textarea" | "select" | "checkbox";
  required?: boolean;
  readOnly?: boolean;
  options?: { label: string; value: string | number }[];
  relatedEndpoint?: string;
  relatedDisplayField?: string;
};

export type ResourceConfig = {
  key: string;
  label: string;
  endpoint: string;
  fields: FieldConfig[];
};

interface ResourceCrudProps {
  config: ResourceConfig;
  currentUser: CurrentUser;
}

function getFieldValue(item: any, field: FieldConfig, relatedDataMap: Record<string, any[]>): string {
  if (field.name === "duration_hours" && item.duration_minutes != null) {
    return String(Number(item.duration_minutes) / 60);
  }
  const rawVal = item[field.name];
  if (field.type === "checkbox") return rawVal ? "Sí" : "No";
  if (field.relatedEndpoint) {
    const list = relatedDataMap[field.relatedEndpoint] || [];
    const matched = list.find((x) => x.id === rawVal);
    if (matched) return String(matched[field.relatedDisplayField || "name"] || "");
  }
  if (field.options) {
    const opt = field.options.find((o) => o.value === rawVal);
    if (opt) return opt.label;
  }
  return rawVal !== undefined && rawVal !== null ? String(rawVal) : "";
}

export function ResourceCrud({ config, currentUser }: ResourceCrudProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  const roles = currentUser.roles || [];
  const canWrite = roles.includes("admin") || roles.includes("coordinador") || roles.includes("programador");
  const canDelete = roles.includes("admin") || roles.includes("coordinador");

  const { data: items = [], isLoading, isError, error } = useQuery<any[]>({
    queryKey: [config.endpoint],
    queryFn: () => fetchList<any>(config.endpoint),
  });

  const relatedEndpoints = Array.from(
    new Set(config.fields.map((f) => f.relatedEndpoint).filter(Boolean))
  ) as string[];

  const relatedQueries = useQueries({
    queries: relatedEndpoints.map((endpoint) => ({
      queryKey: [endpoint],
      queryFn: () => fetchList<any>(endpoint),
    })),
  });

  const relatedDataMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    relatedEndpoints.forEach((endpoint, index) => {
      map[endpoint] = relatedQueries[index]?.data || [];
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relatedEndpoints, ...relatedQueries.map((q) => q.data)]);

  const filteredItems = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return items;
    const term = debouncedSearchTerm.toLowerCase();
    return items.filter((item: any) =>
      config.fields.some((f) => {
        const val = getFieldValue(item, f, relatedDataMap);
        return val.toLowerCase().includes(term);
      })
    );
  }, [items, debouncedSearchTerm, config.fields, relatedDataMap]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleIds = paginatedItems.map((item: any) => item.id).filter((id: any) => typeof id === "number");
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;

  useEffect(() => {
    const validIds = new Set(items.map((item: any) => item.id));
    setSelectedIds((prev) => new Set([...prev].filter((id) => validIds.has(id))));
  }, [items]);

  const createMutation = useMutation({
    mutationFn: (data: any) => createItem(config.endpoint, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.endpoint] });
      addToast("success", "Registro creado correctamente.");
      closeForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Error al crear el registro.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateItem(config.endpoint, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.endpoint] });
      addToast("success", "Registro actualizado correctamente.");
      closeForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Error al actualizar el registro.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteItem(config.endpoint, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.endpoint] });
      addToast("success", "Registro eliminado o inactivado correctamente.");
    },
    onError: (err: any) => {
      addToast("error", err.message || "Error al eliminar el registro.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => deleteItem(config.endpoint, id)));
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.endpoint] });
      addToast("success", "Registros eliminados o inactivados correctamente.");
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
    },
    onError: (err: any) => {
      addToast("error", err.message || "Error al eliminar registros.");
    },
  });

  const openCreateForm = () => {
    setEditingItem(null);
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const openEditForm = (item: any) => {
    setEditingItem(item);
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setErrorMsg(null);
  };

  const handleDelete = (item: any) => {
    setConfirmDelete(item);
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const confirmDeleteAction = () => {
    if (confirmDelete) {
      deleteMutation.mutate(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const confirmBulkDeleteAction = () => {
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const payload: Record<string, any> = {};

    config.fields.forEach((field) => {
      const val = formData.get(field.name);

      if (field.type === "checkbox") {
        payload[field.name] = val === "on";
      } else if (field.type === "number") {
        payload[field.name] = val !== null && val !== "" ? Number(val) : null;
      } else {
        payload[field.name] = val !== null && val !== "" ? String(val) : null;
      }
    });

    if (config.key === "time-blocks") {
      const [startHour, startMinute] = String(payload.start_time).split(":").map(Number);
      const [endHour, endMinute] = String(payload.end_time).split(":").map(Number);
      const durationMinutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
      if (!Number.isFinite(durationMinutes) || durationMinutes < 120) {
        setErrorMsg("El bloque horario debe durar mínimo 2 horas.");
        return;
      }
      delete payload.duration_hours;
      payload.duration_minutes = durationMinutes;
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const renderFieldValue = (item: any, field: FieldConfig) => {
    return getFieldValue(item, field, relatedDataMap);
  };

  return (
    <div className="crud-section">
      <div className="crud-header">
        <div className="crud-header-text">
          <h2>{config.label}</h2>
          <p className="crud-subtitle">Administra la información base usada para la programación académica.</p>
        </div>
        {canWrite && (
          <button className="btn-primary" onClick={openCreateForm}>
            Nuevo Registro
          </button>
        )}
      </div>

      {errorMsg && <div className="toast toast-error">{errorMsg}</div>}

      <div className="crud-toolbar">
        <input
          className="crud-search"
          type="text"
          placeholder="Buscar registros..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="crud-count">
          Mostrando {filteredItems.length} de {items.length} registros
        </span>
        {canDelete && filteredItems.length > 0 && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setSelectedIds(new Set(filteredItems.map((item: any) => item.id)))}
          >
            Seleccionar todos los filtrados
          </button>
        )}
      </div>

      {canDelete && selectedIds.size > 0 && (
        <div className="bulk-actions-bar">
          <span>
            {selectedIds.size} seleccionados
            {selectedVisibleCount > 0 ? ` (${selectedVisibleCount} en esta página)` : ""}
          </span>
          <button type="button" className="btn-secondary btn-sm" onClick={clearSelection}>
            Limpiar selección
          </button>
          <button
            type="button"
            className="btn-delete btn-sm"
            onClick={() => setConfirmBulkDelete(true)}
            disabled={bulkDeleteMutation.isPending}
          >
            Eliminar seleccionados
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="loader">Cargando datos...</div>
      ) : isError ? (
        <div className="error-panel">
          <h3>Error al cargar los datos</h3>
          <p>{error?.toString() || "No fue posible conectar con el servidor."}</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="crud-table">
            <thead>
              <tr>
                {canDelete && (
                  <th className="selection-cell">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectVisible}
                      aria-label="Seleccionar registros visibles"
                    />
                  </th>
                )}
                {config.fields.map((f) => (
                  <th key={f.name}>{f.label}</th>
                ))}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={config.fields.length + (canDelete ? 2 : 1)} className="text-center empty-cell">
                    <strong>Aún no hay registros para este módulo.</strong>
                    <span>Utilice el botón "Nuevo Registro" para agregar el primero.</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={config.fields.length + (canDelete ? 2 : 1)} className="text-center empty-cell">
                    <strong>No se encontraron registros con ese criterio.</strong>
                    <span>Intente con otro término de búsqueda.</span>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item: any) => (
                  <tr
                    key={item.id}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={() => setDetailItem(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setDetailItem(item);
                      }
                    }}
                    aria-label={`Ver detalle de ${config.label}`}
                  >
                    {canDelete && (
                      <td className="selection-cell">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelectOne(item.id)}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Seleccionar registro ${item.id}`}
                        />
                      </td>
                    )}
                    {config.fields.map((f) => (
                      <td key={f.name} className={f.type === "textarea" ? "cell-textarea" : "cell-default"}>
                        <span className="cell-text">{renderFieldValue(item, f)}</span>
                      </td>
                    ))}
                    <td className="actions-cell">
                      {canWrite && (
                        <button className="btn-edit" onClick={(event) => { event.stopPropagation(); openEditForm(item); }}>
                          Editar
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn-delete" onClick={(event) => { event.stopPropagation(); handleDelete(item); }}>
                          Eliminar
                        </button>
                      )}
                      {!canWrite && <span className="text-muted">Solo lectura</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="pagination-bar">
              <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
              <span>Página {page} de {totalPages}</span>
              <button className="btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
            </div>
          )}
        </div>
      )}

      {isFormOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="crud-modal-title">
          <div className="modal-content">
            <h3 id="crud-modal-title">{editingItem ? `Editar ${config.label}` : `Nuevo ${config.label}`}</h3>
            <form
              onSubmit={handleFormSubmit}
              onChange={(event) => {
                if (config.key !== "time-blocks") return;
                const form = event.currentTarget;
                const start = form.elements.namedItem("start_time") as HTMLInputElement | null;
                const end = form.elements.namedItem("end_time") as HTMLInputElement | null;
                const hours = form.elements.namedItem("duration_hours") as HTMLInputElement | null;
                if (!start?.value || !end?.value || !hours) return;
                const [startHour, startMinute] = start.value.split(":").map(Number);
                const [endHour, endMinute] = end.value.split(":").map(Number);
                const minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
                hours.value = minutes > 0 ? String(Number((minutes / 60).toFixed(2))) : "";
              }}
              className="crud-form"
            >
              <div className={`form-fields${config.key === "time-blocks" ? " time-block-fields" : ""}`}>
                {config.fields.map((field) => {
                  const defaultValue = editingItem
                    ? field.name === "duration_hours"
                      ? Number(editingItem.duration_minutes || 0) / 60
                      : editingItem[field.name]
                    : "";

                  if (field.type === "select") {
                    const options: SearchableSelectOption[] = field.options ?? (relatedDataMap[field.relatedEndpoint || ""] || []).map((option: any) => ({
                      value: option.id,
                      label: String(option[field.relatedDisplayField || "name"]),
                    }));
                    return (
                      <div key={`${editingItem?.id ?? "new"}-${field.name}`} className={`crud-field-${field.name}`}>
                        <ResourceCrudSearchableField label={field.label} name={field.name} initialValue={defaultValue || ""} options={options} required={field.required} />
                      </div>
                    );
                  }

                  return (
                    <label key={field.name} className={`form-label crud-field-${field.name}`}>
                      {field.label} {field.required && <span className="req">*</span>}
                      {field.type === "textarea" ? (
                        <textarea
                          name={field.name}
                          defaultValue={defaultValue || ""}
                          required={field.required}
                        />
                      ) : field.type === "checkbox" ? (
                        <input
                          type="checkbox"
                          name={field.name}
                          defaultChecked={!!defaultValue}
                          className="form-checkbox"
                        />
                      ) : (
                        <input
                          type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
                          name={field.name}
                          defaultValue={defaultValue ?? ""}
                          required={field.required}
                          readOnly={field.readOnly}
                          step={field.type === "number" ? "any" : undefined}
                        />
                      )}
                    </label>
                  );
                })}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={closeForm}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DetailDialog
        open={detailItem !== null}
        title={detailItem ? String(detailItem.name || detailItem.code || `${config.label} #${detailItem.id}`) : config.label}
        fields={detailItem ? config.fields.map((field) => ({ label: field.label, value: renderFieldValue(detailItem, field) })) : []}
        onClose={() => setDetailItem(null)}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Eliminar registro"
        message={`¿Está seguro de eliminar o inactivar "${confirmDelete ? (confirmDelete.name || confirmDelete.code || confirmDelete.id) : ""}"?`}
        confirmLabel="Eliminar"
        confirmDanger
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Eliminar registros seleccionados"
        message={`¿Está seguro de eliminar o inactivar ${selectedIds.size} registros seleccionados?`}
        confirmLabel={bulkDeleteMutation.isPending ? "Eliminando..." : "Eliminar seleccionados"}
        confirmDanger
        onConfirm={confirmBulkDeleteAction}
        onCancel={() => setConfirmBulkDelete(false)}
      />
    </div>
  );
}
