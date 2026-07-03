import { CurrentUser } from "../types/auth";

interface AppLayoutProps {
  currentUser: CurrentUser;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export function AppLayout({
  currentUser,
  onLogout,
  activeTab,
  setActiveTab,
  children,
}: AppLayoutProps) {
  const roles = currentUser.roles || [];
  const canWrite = roles.includes("admin") || roles.includes("coordinador") || roles.includes("programador");
  const isAdmin = roles.includes("admin");

  const menuItems = [
    ...(isAdmin ? [{ id: "users", label: "Usuarios" }] : []),
    { id: "schedules", label: "Programación de Horarios" },
    { id: "contract-types", label: "Tipos de Contrato" },
    { id: "instructors", label: "Instructores" },
    { id: "training-programs", label: "Programas de Formación" },
    { id: "competencies", label: "Competencias" },
    { id: "learning-results", label: "Resultados (RAP)" },
    { id: "groups", label: "Fichas / Grupos" },
    { id: "environments", label: "Ambientes" },
    { id: "time-blocks", label: "Bloques Horarios" },
    ...(canWrite ? [{ id: "validation", label: "Validación Manual" }] : []),
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <p className="eyebrow">CGMLTI Bogotá</p>
          <h2>GESTION DE HORARIOS CGMLTI</h2>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-btn ${activeTab === item.id ? "active" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <div className="user-profile">
            <span className="user-avatar">{currentUser.full_name.charAt(0)}</span>
            <div className="user-details">
              <span className="user-name">{currentUser.full_name}</span>
              <span className="user-roles">
                {currentUser.roles.map((r) => r.toUpperCase()).join(", ")}
              </span>
            </div>
          </div>
          <button className="btn-logout" onClick={onLogout}>
            Cerrar Sesión
          </button>
        </header>

        <section className="tab-pane" aria-live="polite">
          {children}
        </section>
      </main>
    </div>
  );
}
