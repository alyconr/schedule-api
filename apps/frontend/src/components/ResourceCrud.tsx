import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { fetchList, createItem, updateItem, deleteItem } from "../api/masterData";
import { CurrentUser } from "../types/auth";
import { useToast } from "./ToastProvider";
import { ConfirmDialog } from "./ConfirmDialog";

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
  type: "text" | "number" | "date" | "textarea" | "select" | "checkbox";
  required?: boolean;
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

  const confirmDeleteAction = () => {
    if (confirmDelete) {
      deleteMutation.mutate(confirmDelete.id);
      setConfirmDelete(null);
    }
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
      </div>

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
                {config.fields.map((f) => (
                  <th key={f.name}>{f.label}</th>
                ))}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={config.fields.length + 1} className="text-center empty-cell">
                    <strong>Aún no hay registros para este módulo.</strong>
                    <span>Utilice el botón "Nuevo Registro" para agregar el primero.</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={config.fields.length + 1} className="text-center empty-cell">
                    <strong>No se encontraron registros con ese criterio.</strong>
                    <span>Intente con otro término de búsqueda.</span>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item: any) => (
                  <tr key={item.id}>
                    {config.fields.map((f) => (
                      <td key={f.name} className={f.type === "textarea" ? "cell-textarea" : "cell-default"}>
                        <span className="cell-text">{renderFieldValue(item, f)}</span>
                      </td>
                    ))}
                    <td className="actions-cell">
                      {canWrite && (
                        <button className="btn-edit" onClick={() => openEditForm(item)}>
                          Editar
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn-delete" onClick={() => handleDelete(item)}>
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
            <form onSubmit={handleFormSubmit} className="crud-form">
              <div className="form-fields">
                {config.fields.map((field) => {
                  const defaultValue = editingItem ? editingItem[field.name] : "";

                  return (
                    <label key={field.name} className="form-label">
                      {field.label} {field.required && <span className="req">*</span>}
                      {field.type === "textarea" ? (
                        <textarea
                          name={field.name}
                          defaultValue={defaultValue || ""}
                          required={field.required}
                        />
                      ) : field.type === "select" ? (
                        <select name={field.name} defaultValue={defaultValue || ""} required={field.required}>
                          <option value="">Seleccione una opción...</option>
                          {field.options
                            ? field.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))
                            : (relatedDataMap[field.relatedEndpoint || ""] || []).map((opt: any) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt[field.relatedDisplayField || "name"]}
                                </option>
                              ))}
                        </select>
                      ) : field.type === "checkbox" ? (
                        <input
                          type="checkbox"
                          name={field.name}
                          defaultChecked={!!defaultValue}
                          className="form-checkbox"
                        />
                      ) : (
                        <input
                          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                          name={field.name}
                          defaultValue={defaultValue ?? ""}
                          required={field.required}
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

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Eliminar registro"
        message={`¿Está seguro de eliminar o inactivar "${confirmDelete ? (confirmDelete.name || confirmDelete.code || confirmDelete.id) : ""}"?`}
        confirmLabel="Eliminar"
        confirmDanger
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}