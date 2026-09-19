import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, createUser, updateUser, deactivateUser, fetchRoles } from "../api/users";
import { fetchCoordinations } from "../api/coordinations";
import { User, UserCreate, UserUpdate, Role, CurrentUser } from "../types/auth";
import { Coordination } from "../types/masterData";
import { useToast } from "./ToastProvider";
import { ConfirmDialog } from "./ConfirmDialog";
import { DetailDialog } from "./DetailDialog";

interface UserManagementProps {
  currentUser: CurrentUser;
}

export function UserManagement({ currentUser }: UserManagementProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<User | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCoordinationIds, setSelectedCoordinationIds] = useState<number[]>([]);

  const isAdmin = currentUser.roles.includes("admin");

  const { data: users = [], isLoading: isLoadingUsers, isError: isErrorUsers, error: errorUsers } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: isAdmin,
  });

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: fetchRoles,
    enabled: isAdmin,
  });

  const { data: coordinations = [] } = useQuery<Coordination[]>({
    queryKey: ["coordinations"],
    queryFn: fetchCoordinations,
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (data: UserCreate) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      addToast("success", "Usuario creado correctamente.");
      closeForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Error al crear el usuario.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserUpdate }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      addToast("success", "Usuario actualizado correctamente.");
      closeForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Error al actualizar el usuario.");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      addToast("success", "Usuario inactivado correctamente.");
    },
    onError: (err: any) => {
      addToast("error", err.message || "Error al inactivar el usuario.");
    },
  });

  const openCreateForm = () => {
    setEditingUser(null);
    setFullName("");
    setEmail("");
    setPassword("");
    setIsActive(true);
    setSelectedRoles(["consulta"]);
    setSelectedCoordinationIds([]);
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const openEditForm = (user: User) => {
    setEditingUser(user);
    setFullName(user.full_name);
    setEmail(user.email);
    setPassword("");
    setIsActive(user.is_active);
    setSelectedRoles(user.roles || []);
    setSelectedCoordinationIds(user.coordination_ids || []);
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    setErrorMsg(null);
  };

  const handleRoleToggle = (roleName: string) => {
    if (editingUser && editingUser.id === currentUser.id && roleName === "admin") {
      setErrorMsg("No puedes quitarte tu propio rol de administrador.");
      return;
    }
    setSelectedRoles((prev) =>
      prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !email.trim()) {
      setErrorMsg("El nombre completo y el correo electrónico son obligatorios.");
      return;
    }

    if (selectedRoles.length === 0) {
      setErrorMsg("Debe seleccionar al menos un rol para el usuario.");
      return;
    }

    if (editingUser && editingUser.id === currentUser.id && !selectedRoles.includes("admin")) {
      setErrorMsg("No puedes quitarte tu propio rol de administrador.");
      return;
    }

    if (!editingUser && (!password || password.length < 8)) {
      setErrorMsg("La contraseña es obligatoria y debe tener al menos 8 caracteres.");
      return;
    }

    if (editingUser && password && password.length < 8) {
      setErrorMsg("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (editingUser) {
      const payload: UserUpdate = { full_name: fullName, email: email, is_active: isActive, roles: selectedRoles, coordination_ids: selectedCoordinationIds };
      if (password) payload.password = password;
      updateMutation.mutate({ id: editingUser.id, data: payload });
    } else {
      createMutation.mutate({ full_name: fullName, email: email, password: password, roles: selectedRoles, coordination_ids: selectedCoordinationIds });
    }
  };

  const handleDeactivate = (user: User) => {
    setConfirmDeactivate(user);
  };

  if (!isAdmin) {
    return (
      <div className="error-panel">
        <h3>Acceso Denegado</h3>
        <p>No tienes permisos para gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div className="crud-section">
      <div className="crud-header">
        <div className="crud-header-text">
          <h2>Gestión de Usuarios</h2>
          <p className="crud-subtitle">Administra usuarios, estado de acceso y roles del sistema.</p>
        </div>
        <button className="btn-primary" onClick={openCreateForm}>+ Nuevo Usuario</button>
      </div>

      {errorMsg && !isFormOpen && <div className="toast toast-error">{errorMsg}</div>}

      {isLoadingUsers ? (
        <div className="loader">Cargando usuarios...</div>
      ) : isErrorUsers ? (
        <div className="error-panel">
          <h3>Error al cargar los datos</h3>
          <p>{(errorUsers as any)?.message || "No fue posible conectar con el servidor."}</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Coordinaciones</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center empty-cell">
                    <strong>Aún no hay usuarios registrados.</strong>
                    <span>Utilice el botón "Nuevo Usuario" para agregar el primero.</span>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const userCoordNames = (user.coordination_ids || []).map((cid) => coordinations.find((c) => c.id === cid)?.name).filter(Boolean);
                  return (
                  <tr
                    key={user.id}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={(event) => {
                      if (!(event.target as HTMLElement).closest("button, input, a, select, textarea, label")) setDetailUser(user);
                    }}
                    onKeyDown={(event) => {
                      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        setDetailUser(user);
                      }
                    }}
                    aria-label={`Ver detalle de ${user.full_name}`}
                  >
                    <td className="cell-default"><span className="cell-text">{user.full_name}</span></td>
                    <td className="cell-default"><span className="cell-text">{user.email}</span></td>
                    <td>
                      <div className="tag-container">
                        {user.roles?.map((role) => (
                          <span key={role} className="tag-role">{role.toUpperCase()}</span>
                        ))}
                      </div>
                    </td>
                    <td className="cell-default">
                      <span className="cell-text">{userCoordNames.length > 0 ? userCoordNames.join(", ") : "—"}</span>
                    </td>
                    <td>
                      <span className={`user-status ${user.is_active ? "user-status-active" : "user-status-inactive"}`}>
                        {user.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button className="btn-edit" onClick={() => openEditForm(user)}>Editar</button>
                      {user.is_active && user.id !== currentUser.id && (
                        <button className="btn-delete" onClick={() => handleDeactivate(user)}>Inactivar</button>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {isFormOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
          <div className="modal-content">
            <h3 id="user-modal-title">{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</h3>
            {errorMsg && <div className="toast toast-error" style={{ marginBottom: 16 }}>{errorMsg}</div>}

            <form onSubmit={handleSubmit} className="crud-form">
              <div className="form-fields" style={{ gridTemplateColumns: "1fr" }}>
                <label className="form-label">
                  Nombre Completo *
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej. Juan Pérez" required />
                </label>

                <label className="form-label">
                  Correo Electrónico *
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ejemplo@sena.edu.co" required />
                </label>

                <label className="form-label">
                  {editingUser ? "Nueva Contraseña (Opcional)" : "Contraseña"}
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editingUser ? "Dejar en blanco para conservar" : "Mínimo 8 caracteres"} required={!editingUser} />
                </label>

                {editingUser && (
                  <label className="checkbox-label" style={{ marginTop: 4 }}>
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                    Usuario Activo
                  </label>
                )}
              </div>

              <div className="roles-section">
                <span className="section-label">Asignar Roles</span>
                {isLoadingRoles ? (
                  <p style={{ color: "#64748b", fontSize: "0.85rem" }}>Cargando roles...</p>
                ) : (
                  <div className="role-checkbox-grid">
                    {roles.length > 0
                      ? roles.map((role) => (
                          <label key={role.id} className="checkbox-label">
                            <input type="checkbox" checked={selectedRoles.includes(role.name)} onChange={() => handleRoleToggle(role.name)} disabled={editingUser?.id === currentUser.id && role.name === "admin"} />
                            <div className="role-details">
                              <strong>{role.name.toUpperCase()}</strong>
                              <span className="role-desc">{role.description}</span>
                            </div>
                          </label>
                        ))
                      : ["admin", "coordinador", "programador", "consulta"].map((roleName) => (
                          <label key={roleName} className="checkbox-label">
                            <input type="checkbox" checked={selectedRoles.includes(roleName)} onChange={() => handleRoleToggle(roleName)} disabled={editingUser?.id === currentUser.id && roleName === "admin"} />
                            <div className="role-details">
                              <strong>{roleName.toUpperCase()}</strong>
                            </div>
                          </label>
                        ))}
                  </div>
                )}
              </div>

              <div className="roles-section">
                <span className="section-label">Coordinaciones</span>
                <div className="role-checkbox-grid">
                  {coordinations.map((coord) => (
                    <label key={coord.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedCoordinationIds.includes(coord.id)}
                        onChange={() => {
                          setSelectedCoordinationIds((prev) =>
                            prev.includes(coord.id) ? prev.filter((c) => c !== coord.id) : [...prev, coord.id]
                          );
                        }}
                      />
                      <div className="role-details">
                        <strong>{coord.name}</strong>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={closeForm} disabled={createMutation.isPending || updateMutation.isPending}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DetailDialog
        open={detailUser !== null}
        title={detailUser?.full_name || "Usuario"}
        fields={detailUser ? [
          { label: "Nombre", value: detailUser.full_name },
          { label: "Correo electrónico", value: detailUser.email },
          { label: "Roles", value: detailUser.roles?.join(", ") },
          { label: "Coordinaciones", value: (detailUser.coordination_ids || []).map((cid) => coordinations.find((c) => c.id === cid)?.name).filter(Boolean).join(", ") || "—" },
          { label: "Estado", value: detailUser.is_active ? "Activo" : "Inactivo" },
        ] : []}
        onClose={() => setDetailUser(null)}
      />

      <ConfirmDialog
        open={confirmDeactivate !== null}
        title="Inactivar usuario"
        message={confirmDeactivate ? `¿Está seguro de que desea inactivar al usuario "${confirmDeactivate.full_name}"?` : ""}
        confirmLabel="Inactivar"
        confirmDanger
        onConfirm={() => { if (confirmDeactivate) { deactivateMutation.mutate(confirmDeactivate.id); setConfirmDeactivate(null); } }}
        onCancel={() => setConfirmDeactivate(null)}
      />
    </div>
  );
}
