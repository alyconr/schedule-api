import { useState } from "react";
import { CurrentUser } from "../types/auth";

interface AppLayoutProps {
  currentUser: CurrentUser;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isNavigating?: boolean;
  children: React.ReactNode;
}

export function AppLayout({
  currentUser,
  onLogout,
  activeTab,
  setActiveTab,
  isNavigating = false,
  children,
}: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const roles = currentUser.roles || [];
  const canWrite = roles.includes("admin") || roles.includes("coordinador") || roles.includes("programador");
  const isAdmin = roles.includes("admin");

  const menuSections = [
    {
      title: "Operación",
      items: [
        { id: "schedules", label: "Programación de Horarios" },
        ...(canWrite ? [{ id: "validation", label: "Validación Manual" }] : []),
        ...(canWrite ? [{ id: "imports", label: "Carga Masiva" }] : []),
      ],
    },
    {
      title: "Datos maestros",
      items: [
        { id: "contract-types", label: "Tipos de Contrato" },
        { id: "instructors", label: "Instructores" },
        { id: "training-programs", label: "Programas de Formación" },
        { id: "competencies", label: "Competencias" },
        { id: "learning-results", label: "Resultados RAP" },
        { id: "groups", label: "Fichas / Grupos" },
        { id: "environments", label: "Ambientes" },
        { id: "time-blocks", label: "Bloques Horarios" },
      ],
    },
    {
      title: "Administración",
      items: isAdmin ? [{ id: "users", label: "Usuarios" }] : [],
    },
  ].filter((section) => section.items.length > 0);
  const activeLabel =
    menuSections.flatMap((section) => section.items).find((item) => item.id === activeTab)?.label ||
    "Panel académico";
  const userInitial = currentUser.full_name.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="app-layout">
      <aside className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-brand">
            <div className="sidebar-logo-container">
              <img className="sena-sidebar-logo" src="/logo-sena.svg" alt="SENA" />
              <p className="eyebrow">CGMLTI Bogotá</p>
            </div>
            <h2>Gestión de Horarios CGMLTI</h2>
          </div>
          <nav className="sidebar-nav">
            {menuSections.map((section) => (
              <div className="nav-section" key={section.title}>
                <p className="nav-section-title">{section.title}</p>
                {section.items.map((item) => (
<button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`nav-btn ${activeTab === item.id ? "active" : ""}`}
                    disabled={isNavigating}
                  >
                    {item.label}
                    {isNavigating && activeTab !== item.id ? "…" : ""}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <button
            className="btn-toggle-sidebar"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            aria-label={isSidebarCollapsed ? "Mostrar menú" : "Ocultar menú"}
            title={isSidebarCollapsed ? "Mostrar menú" : "Ocultar menú"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isSidebarCollapsed ? (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="18" y1="20" x2="12" y2="12"></line>
                  <line x1="12" y1="12" x2="18" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="4"></line>
                </>
              )}
            </svg>
          </button>

          <div className="header-context">
            <span className="eyebrow">Planeación académica</span>
            <strong>{activeLabel}</strong>
          </div>

          <div className="main-header-right">
            <div className="user-profile">
              <span className="user-avatar">{userInitial}</span>
              <div className="user-details">
                <span className="user-name">{currentUser.full_name}</span>
                <span className="user-roles">{currentUser.roles.map((r) => r.toUpperCase()).join(", ")}</span>
              </div>
            </div>
            <button className="btn-logout" onClick={onLogout}>
              Cerrar Sesión
            </button>
          </div>
        </header>

        <section className="tab-pane" aria-live="polite">
          {children}
        </section>
      </main>
    </div>
  );
}
