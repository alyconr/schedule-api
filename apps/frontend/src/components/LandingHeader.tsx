import { useState, useEffect, useRef } from "react";

interface LandingHeaderProps {
  onOpenLogin: () => void;
}

export function LandingHeader({ onOpenLogin }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
        toggleBtnRef.current?.focus();
      }
    };

    const handleResize = () => {
      if (window.innerWidth > 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    toggleBtnRef.current?.focus();
  };

  return (
    <header className={`landing-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="landing-header-container">
        <a href="#hero" className="landing-brand" onClick={() => setMobileMenuOpen(false)}>
          <img src="/logo-sena.svg" alt="SENA" className="landing-logo" width="36" height="36" />
          <div className="landing-brand-text">
            <span className="landing-brand-title">Gestión de Horarios</span>
            <span className="landing-brand-subtitle">CGMLTI Bogotá</span>
          </div>
        </a>

        <nav className="landing-nav-desktop" aria-label="Navegación principal">
          <a href="#hero" className="landing-nav-link">Inicio</a>
          <a href="#como-funciona" className="landing-nav-link">Cómo funciona</a>
          <a href="#comunidad" className="landing-nav-link">Comunidad</a>
        </nav>

        <div className="landing-header-actions">
          <button
            type="button"
            className="landing-btn-login"
            onClick={onOpenLogin}
          >
            Ingresar a la plataforma
          </button>

          <button
            ref={toggleBtnRef}
            type="button"
            className="landing-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú de navegación"}
          >
            <span className={`hamburger-bar ${mobileMenuOpen ? "open" : ""}`} />
            <span className={`hamburger-bar ${mobileMenuOpen ? "open" : ""}`} />
            <span className={`hamburger-bar ${mobileMenuOpen ? "open" : ""}`} />
          </button>
        </div>
      </div>

      {/* Drawer Móvil */}
      {mobileMenuOpen && (
        <div id="landing-mobile-menu" className="landing-mobile-drawer">
          <nav className="landing-nav-mobile" aria-label="Navegación móvil">
            <a href="#hero" className="landing-mobile-link" onClick={closeMobileMenu}>Inicio</a>
            <a href="#como-funciona" className="landing-mobile-link" onClick={closeMobileMenu}>Cómo funciona</a>
            <a href="#comunidad" className="landing-mobile-link" onClick={closeMobileMenu}>Comunidad</a>
            <button
              type="button"
              className="landing-btn-login mobile-full"
              onClick={() => {
                closeMobileMenu();
                onOpenLogin();
              }}
            >
              Ingresar a la plataforma
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}

