import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, createUser, updateUser, deactivateUser, fetchRoles } from "../api/users";
import { User, UserCreate, UserUpdate, Role, CurrentUser } from "../types/auth";

interface UserManagementProps {
  currentUser: CurrentUser;
}

export function UserManagement({ currentUser }: UserManagementProps) {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const isAdmin = currentUser.roles.includes("admin");

  // Fetch Users
  const { data: users = [], isLoading: isLoadingUsers, isError: isErrorUsers, error: errorUsers } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: isAdmin,
  });

  // Fetch Roles
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: fetchRoles,
    enabled: isAdmin,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: UserCreate) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSuccess("Usuario creado correctamente.");
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
      showSuccess("Usuario actualizado correctamente.");
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
      showSuccess("Usuario inactivado correctamente.");
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Error al inactivar el usuario.");
    },
  });

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const openCreateForm = () => {
    setEditingUser(null);
    setFullName("");
    setEmail("");
    setPassword("");
    setIsActive(true);
    setSelectedRoles(["consulta"]); // default role
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const openEditForm = (user: User) => {
    setEditingUser(user);
    setFullName(user.full_name);
    setEmail(user.email);
    setPassword(""); // Keep blank to not change password
    setIsActive(user.is_active);
    setSelectedRoles(user.roles || []);
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
      prev.includes(roleName)
        ? prev.filter((r) => r !== roleName)
        : [...prev, roleName]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
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
      const payload: UserUpdate = {
        full_name: fullName,
        email: email,
        is_active: isActive,
        roles: selectedRoles,
      };
      if (password) {
        payload.password = password;
      }
      updateMutation.mutate({ id: editingUser.id, data: payload });
    } else {
      const payload: UserCreate = {
        full_name: fullName,
        email: email,
        password: password,
        roles: selectedRoles,
      };
      createMutation.mutate(payload);
    }
  };

  const handleDeactivate = (user: User) => {
    if (window.confirm(`¿Está seguro de que desea inactivar al usuario "${user.full_name}"?`)) {
      deactivateMutation.mutate(user.id);
    }
  };

  // Authorization Check
  if (!isAdmin) {
    return (
      <div className="error-panel text-center">
        <h3>Acceso Denegado</h3>
        <p>No tienes permisos para gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <section className="workspace user-management">
      <header className="topbar">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Gestión de Usuarios</h1>
        </div>
        <button className="btn-primary" onClick={openCreateForm}>
          + Nuevo Usuario
        </button>
      </header>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {errorMsg && !isFormOpen && <div className="alert alert-danger">{errorMsg}</div>}

      {isLoadingUsers ? (
        <div className="loading">Cargando usuarios...</div>
      ) : isErrorUsers ? (
        <div className="alert alert-danger">
          Error al cargar usuarios: {(errorUsers as any)?.message || "Sin acceso"}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium">{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>
                    <div className="tag-container">
                      {user.roles?.map((role) => (
                        <span key={role} className="tag tag-role">
                          {role.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`user-status ${
                        user.is_active ? "user-status-active" : "user-status-inactive"
                      }`}
                    >
                      {user.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn-edit"
                      onClick={() => openEditForm(user)}
                      title="Editar usuario"
                    >
                      Editar
                    </button>
                    {user.is_active && user.id !== currentUser.id && (
                      <button
                        className="btn-delete"
                        onClick={() => handleDeactivate(user)}
                        title="Inactivar usuario"
                      >
                        Inactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      {isFormOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</h2>
            {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}

            <form onSubmit={handleSubmit} className="user-form">
              <label>
                Nombre Completo
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  required
                />
              </label>

              <label>
                Correo Electrónico
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@sena.edu.co"
                  required
                />
              </label>

              <label>
                {editingUser ? "Nueva Contraseña (Opcional)" : "Contraseña"}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? "Dejar en blanco para conservar" : "Mínimo 8 caracteres"}
                  required={!editingUser}
                />
              </label>

              {editingUser && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Usuario Activo
                </label>
              )}

              <div className="roles-section">
                <span className="section-label">Asignar Roles</span>
                {isLoadingRoles ? (
                  <p>Cargando roles...</p>
                ) : (
                  <div className="role-checkbox-grid">
                    {roles.map((role) => (
                      <label key={role.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role.name)}
                          onChange={() => handleRoleToggle(role.name)}
                          disabled={editingUser?.id === currentUser.id && role.name === "admin"}
                        />
                        <div className="role-details">
                          <strong>{role.name.toUpperCase()}</strong>
                          <span className="role-desc">{role.description}</span>
                        </div>
                      </label>
                    ))}
                    {roles.length === 0 && (
                      ["admin", "coordinador", "programador", "consulta"].map((roleName) => (
                        <label key={roleName} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedRoles.includes(roleName)}
                            onChange={() => handleRoleToggle(roleName)}
                            disabled={editingUser?.id === currentUser.id && roleName === "admin"}
                          />
                          <div className="role-details">
                            <strong>{roleName.toUpperCase()}</strong>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeForm}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Guardando..."
                    : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
