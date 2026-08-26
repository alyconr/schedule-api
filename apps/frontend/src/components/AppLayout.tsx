import { useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  FileUp,
  GraduationCap,
  ListChecks,
  LogOut,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Rows3,
  ShieldCheck,
  Table2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { CurrentUser } from "../types/auth";
import { useCoordinationScope } from "./CoordinationScopeContext";

interface AppLayoutProps {
  currentUser: CurrentUser;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isNavigating?: boolean;
  children: React.ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "schedule-sidebar-collapsed";

export function AppLayout({
  currentUser,
  onLogout,
  activeTab,
  setActiveTab,
  isNavigating = false,
  children,
}: AppLayoutProps) {
  const { activeCoordinationId, setActiveCoordinationId, availableCoordinations, isGlobal } = useCoordinationScope();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => {
      const storedPreference = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      return storedPreference === null
        ? window.matchMedia("(max-width: 1024px)").matches
        : storedPreference === "true";
    },
  );
  const roles = currentUser.roles || [];
  const canWrite = roles.includes("admin") || roles.includes("coordinador") || roles.includes("programador");
  const isAdmin = roles.includes("admin");

  // Coordination selector options
  const showCoordSelector = isGlobal || availableCoordinations.length > 1;
  const selectorOptions = availableCoordinations;
  const activeCoordName = activeCoordinationId
    ? availableCoordinations.find((c) => c.id === activeCoordinationId)?.name
    : isGlobal ? "Todas las coordinaciones" : "Todas mis coordinaciones";

  const menuSections = [
    {
      title: "Operación",
      items: [
        { id: "schedules", label: "Programación de horarios", icon: CalendarDays },
        { id: "schedule-matrix", label: "Matriz académica", icon: Table2 },
        { id: "schedule-detail", label: "Programación detallada", icon: Rows3 },
        ...(canWrite ? [{ id: "validation", label: "Validación manual", icon: BadgeCheck }] : []),
        ...(canWrite ? [{ id: "imports", label: "Carga masiva", icon: FileUp }] : []),
      ],
    },
    {
      title: "Datos maestros",
      items: [
        { id: "contract-types", label: "Tipos de vinculación", icon: BriefcaseBusiness },
        { id: "instructors", label: "Instructores", icon: UserRound },
        { id: "training-programs", label: "Programas de formación", icon: GraduationCap },
        { id: "competencies", label: "Competencias", icon: Network },
        { id: "learning-results", label: "Resultados RAP", icon: ListChecks },
        { id: "groups", label: "Fichas / Grupos", icon: UsersRound },
        { id: "environments", label: "Ambientes", icon: Building2 },
        { id: "time-blocks", label: "Bloques horarios", icon: Clock3 },
      ],
    },
    {
      title: "Administración",
      items: isAdmin ? [
        { id: "users", label: "Usuarios", icon: ShieldCheck },
        { id: "coordinations", label: "Coordinaciones", icon: Network },
      ] : [],
    },
  ].filter((section) => section.items.length > 0);
  const activeLabel =
    menuSections.flatMap((section) => section.items).find((item) => item.id === activeTab)?.label ||
    "Panel académico";
  const userInitial = currentUser.full_name.trim().charAt(0).toUpperCase() || "U";
  const updateSidebar = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  };
  const toggleSidebar = () => {
    updateSidebar(!isSidebarCollapsed);
  };
  const navigateFromSidebar = (tab: string) => {
    setActiveTab(tab);
    if (window.matchMedia("(max-width: 1024px)").matches) {
      updateSidebar(true);
    }
  };

  return (
    <div className="app-layout">
      <aside className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-brand">
            <div className="sidebar-logo-container">
              <img className="sena-sidebar-logo" src="/logo-sena.svg" alt="SENA" />
              <div className="sidebar-brand-copy">
                <p className="eyebrow">CGMLTI Bogotá</p>
                <strong>Gestión de horarios</strong>
              </div>
              <button
                type="button"
                className="sidebar-mobile-close"
                onClick={() => updateSidebar(true)}
                aria-label="Cerrar menú"
                title="Cerrar menú"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
          <nav className="sidebar-nav" aria-label="Menú principal">
            {menuSections.map((section) => (
              <div className="nav-section" key={section.title}>
                <p className="nav-section-title">{section.title}</p>
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigateFromSidebar(item.id)}
                    className={`nav-btn ${activeTab === item.id ? "active" : ""}`}
                    disabled={isNavigating}
                    aria-current={activeTab === item.id ? "page" : undefined}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <item.icon className="nav-icon" size={20} strokeWidth={1.8} aria-hidden="true" />
                    <span className="nav-label">{item.label}</span>
                    {isNavigating && activeTab !== item.id ? <span className="nav-progress">…</span> : null}
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
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? "Expandir menú" : "Contraer menú"}
            title={isSidebarCollapsed ? "Expandir menú" : "Contraer menú"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>

          <div className="header-context">
            <span className="eyebrow">Planeación académica</span>
            <strong>{activeLabel}</strong>
          </div>

          <div className="main-header-right">
            {showCoordSelector && (
              <div className="coord-scope-selector">
                <label className="coord-scope-label">Ámbito de trabajo</label>
                <select
                  className="coord-scope-select"
                  value={activeCoordinationId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveCoordinationId(val === "" ? null : Number(val));
                  }}
                  title="Seleccionar coordinación"
                >
                  <option value="">{isGlobal ? "Todas las coordinaciones" : "Todas mis coordinaciones"}</option>
                  {selectorOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            {!showCoordSelector && activeCoordName && (
              <span className="coord-scope-current">Coordinación: {activeCoordName}</span>
            )}
            <div className="user-profile">
              <span className="user-avatar">{userInitial}</span>
              <div className="user-details">
                <span className="user-name">{currentUser.full_name}</span>
                <span className="user-roles">{currentUser.roles.map((r) => r.toUpperCase()).join(", ")}</span>
              </div>
            </div>
            <button className="btn-logout" onClick={onLogout}>
              <LogOut size={17} aria-hidden="true" />
              Cerrar sesión
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
