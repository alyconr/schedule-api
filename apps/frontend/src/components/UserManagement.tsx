import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, createUser, updateUser, deactivateUser, fetchRoles } from "../api/users";
import { fetchCoordinations, fetchSpecialties } from "../api/coordinations";
import { User, UserCreate, UserUpdate, Role, CurrentUser, Specialty } from "../types/auth";
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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["lider_equipo"]);
  const [selectedCoordinationId, setSelectedCoordinationId] = useState<number | "">("");
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | "">("");

  const isAdmin = currentUser.roles.includes("admin") || currentUser.roles.includes("superadmin");

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

  const { data: specialties = [] } = useQuery<Specialty[]>({
    queryKey: ["specialties"],
    queryFn: () => fetchSpecialties(),
    enabled: isAdmin,
  });

  const filteredSpecialties = useMemo(() => {
    if (!selectedCoordinationId) return [];
    return specialties.filter((s) => s.coordination_id === Number(selectedCoordinationId));
  }, [specialties, selectedCoordinationId]);

  const isAsgardOperationalRole = selectedRoles.some((r) => r === "lider_equipo" || r === "usuario_adicional");

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
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setIsActive(true);
    setSelectedRoles(["lider_equipo"]);
    setSelectedCoordinationId("");
    setSelectedSpecialtyId("");
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const openEditForm = (user: User) => {
    setEditingUser(user);
    setFirstName(user.first_name || user.full_name.split(" ")[0] || "");
    setLastName(user.last_name || user.full_name.split(" ").slice(1).join(" ") || "");
    setPhone(user.phone || "");
    setEmail(user.email);
    setPassword("");
    setConfirmPassword("");
    setIsActive(user.is_active);
    setSelectedRoles(user.roles || []);
    setSelectedCoordinationId(user.coordination_id || (user.coordination_ids?.[0] ?? ""));
    setSelectedSpecialtyId(user.specialty_id || "");
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    setErrorMsg(null);
  };

  const handleRoleToggle = (roleName: string) => {
    if (editingUser && editingUser.id === currentUser.id && (roleName === "admin" || roleName === "superadmin")) {
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

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMsg("El correo electrónico es obligatorio.");
      return;
    }

    if (selectedRoles.length === 0) {
      setErrorMsg("Debe seleccionar al menos un rol para el usuario.");
      return;
    }

    if (isAsgardOperationalRole) {
      if (!trimmedFirst || !trimmedLast) {
        setErrorMsg("Los Nombres y Apellidos son obligatorios para el Líder de equipo o Usuario adicional.");
        return;
      }
      if (!trimmedPhone) {
        setErrorMsg("El Teléfono es obligatorio para el Líder de equipo o Usuario adicional.");
        return;
      }
      if (!selectedCoordinationId) {
        setErrorMsg("La Coordinación es obligatoria. No se puede crear el usuario sin coordinación.");
        return;
      }
      if (!selectedSpecialtyId) {
        setErrorMsg("La Especialidad es obligatoria para organizar al líder o usuario. Si la coordinación no tiene especialidades configuradas, configúrela primero.");
        return;
      }
    }

    if (!editingUser) {
      if (!password || password.length < 8) {
        setErrorMsg("La contraseña es obligatoria y debe tener al menos 8 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Las contraseñas no coinciden. Por favor verifíquelas.");
        return;
      }
    } else if (password) {
      if (password.length < 8) {
        setErrorMsg("La nueva contraseña debe tener al menos 8 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Las contraseñas no coinciden. Por favor verifíquelas.");
        return;
      }
    }

    const full_name = `${trimmedFirst} ${trimmedLast}`.trim() || trimmedEmail;
    const coordId = selectedCoordinationId ? Number(selectedCoordinationId) : null;
    const specId = selectedSpecialtyId ? Number(selectedSpecialtyId) : null;
    const coordList = coordId ? [coordId] : [];

    if (editingUser) {
      const payload: UserUpdate = {
        full_name,
        first_name: trimmedFirst || undefined,
        last_name: trimmedLast || undefined,
        phone: trimmedPhone || undefined,
        email: trimmedEmail,
        is_active: isActive,
        roles: selectedRoles,
        coordination_id: coordId,
        specialty_id: specId,
        coordination_ids: coordList,
      };
      if (password) {
        payload.password = password;
        payload.confirm_password = confirmPassword;
      }
      updateMutation.mutate({ id: editingUser.id, data: payload });
    } else {
      createMutation.mutate({
        full_name,
        first_name: trimmedFirst,
        last_name: trimmedLast,
        phone: trimmedPhone,
        email: trimmedEmail,
        password,
        confirm_password: confirmPassword,
        roles: selectedRoles,
        coordination_id: coordId,
        specialty_id: specId,
        coordination_ids: coordList,
      });
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
          <h2>Gestión de Usuarios (ASGARD)</h2>
          <p className="crud-subtitle">
            Administra Administradores, Líderes de Equipo Ejecutor y Usuarios Adicionales organizados por Coordinación y Especialidad.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreateForm}>+ Nuevo Líder / Usuario</button>
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
                <th>Nombre y Apellidos</th>
                <th>Email / Teléfono</th>
                <th>Roles ASGARD</th>
                <th>Coordinación</th>
                <th>Especialidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center empty-cell">
                    <strong>Aún no hay usuarios registrados.</strong>
                    <span>Utilice el botón "+ Nuevo Líder / Usuario" para agregar el primero.</span>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const coordName = user.coordination_name || (user.coordination_ids || []).map((cid) => coordinations.find((c) => c.id === cid)?.name).filter(Boolean).join(", ") || "—";
                  const specName = user.specialty_name || specialties.find((s) => s.id === user.specialty_id)?.name || "—";
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
                      <td className="cell-default">
                        <span className="cell-text font-semibold">{user.full_name}</span>
                      </td>
                      <td className="cell-default">
                        <div className="text-sm">
                          <div>{user.email}</div>
                          {user.phone && <div className="text-xs text-slate-500">Tel: {user.phone}</div>}
                        </div>
                      </td>
                      <td>
                        <div className="tag-container">
                          {user.roles?.map((role) => (
                            <span key={role} className="tag-role">{role.toUpperCase().replace("_", " ")}</span>
                          ))}
                        </div>
                      </td>
                      <td className="cell-default">
                        <span className="cell-text">{coordName}</span>
                      </td>
                      <td className="cell-default">
                        <span className="cell-text font-medium text-emerald-700">{specName}</span>
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
          <div className="modal-content" style={{ maxWidth: "650px" }}>
            <h3 id="user-modal-title">{editingUser ? "Editar Usuario" : "Crear Usuario ASGARD"}</h3>
            {errorMsg && <div className="toast toast-error" style={{ marginBottom: 16 }}>{errorMsg}</div>}

            <form onSubmit={handleSubmit} className="crud-form">
              <div className="form-fields" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label className="form-label">
                  Nombres *
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej. Juan Carlos"
                    required={isAsgardOperationalRole}
                  />
                </label>

                <label className="form-label">
                  Apellidos *
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej. Gómez Pérez"
                    required={isAsgardOperationalRole}
                  />
                </label>

                <label className="form-label">
                  Correo Electrónico *
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@sena.edu.co"
                    required
                  />
                </label>

                <label className="form-label">
                  Teléfono *
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 3101234567"
                    required={isAsgardOperationalRole}
                  />
                </label>

                <label className="form-label">
                  Coordinación Académica *
                  <select
                    value={selectedCoordinationId}
                    onChange={(e) => {
                      const newCoordId = e.target.value === "" ? "" : Number(e.target.value);
                      setSelectedCoordinationId(newCoordId);
                      setSelectedSpecialtyId("");
                    }}
                    required={isAsgardOperationalRole}
                  >
                    <option value="">-- Seleccione Coordinación --</option>
                    {coordinations.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>

                <label className="form-label">
                  Especialidad / Programa *
                  <select
                    value={selectedSpecialtyId}
                    onChange={(e) => setSelectedSpecialtyId(e.target.value === "" ? "" : Number(e.target.value))}
                    disabled={!selectedCoordinationId}
                    required={isAsgardOperationalRole}
                  >
                    <option value="">
                      {!selectedCoordinationId
                        ? "-- Seleccione primero la coordinación --"
                        : filteredSpecialties.length === 0
                        ? "-- Sin especialidades configuradas --"
                        : "-- Seleccione Especialidad --"}
                    </option>
                    {filteredSpecialties.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </label>

                <label className="form-label">
                  {editingUser ? "Nueva Contraseña (Opcional)" : "Contraseña *"}
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? "Dejar en blanco para conservar" : "Mínimo 8 caracteres"}
                    required={!editingUser}
                  />
                </label>

                <label className="form-label">
                  {editingUser ? "Confirmar Nueva Contraseña" : "Reescribir Contraseña *"}
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita la contraseña"
                    required={!editingUser || Boolean(password)}
                  />
                </label>
              </div>

              {editingUser && (
                <label className="checkbox-label" style={{ marginTop: 12 }}>
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  Usuario Activo
                </label>
              )}

              <div className="roles-section" style={{ marginTop: 16 }}>
                <span className="section-label font-medium">Asignar Perfil / Rol en ASGARD</span>
                {isLoadingRoles ? (
                  <p style={{ color: "#64748b", fontSize: "0.85rem" }}>Cargando roles...</p>
                ) : (
                  <div className="role-checkbox-grid">
                    {(roles.length > 0
                      ? roles
                      : [
                          { id: 1, name: "superadmin", description: "Control general del aplicativo" },
                          { id: 2, name: "admin", description: "Gestión operativa, accesos y validaciones (Equipo Pedagógico)" },
                          { id: 3, name: "lider_equipo", description: "Líder ejecutor: subida de matrices y planeación asignada" },
                          { id: 4, name: "usuario_adicional", description: "Apoyo con permisos de líder para procesos asignados" },
                        ]
                    ).map((role) => (
                      <label key={role.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.name)}
                          onChange={() => handleRoleToggle(role.name)}
                          disabled={editingUser?.id === currentUser.id && (role.name === "admin" || role.name === "superadmin")}
                        />
                        <div className="role-details">
                          <strong>{role.name.toUpperCase().replace("_", " ")}</strong>
                          <span className="role-desc">{role.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions" style={{ marginTop: 24 }}>
                <button type="button" className="btn-secondary" onClick={closeForm} disabled={createMutation.isPending || updateMutation.isPending}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Guardando..." : "Guardar Usuario"}
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
          { label: "Nombres y Apellidos", value: detailUser.full_name },
          { label: "Correo electrónico", value: detailUser.email },
          { label: "Teléfono", value: detailUser.phone || "—" },
          { label: "Roles", value: detailUser.roles?.map((r) => r.replace("_", " ").toUpperCase()).join(", ") },
          { label: "Coordinación", value: detailUser.coordination_name || coordinations.find((c) => c.id === detailUser.coordination_id)?.name || "—" },
          { label: "Especialidad", value: detailUser.specialty_name || specialties.find((s) => s.id === detailUser.specialty_id)?.name || "—" },
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

