import { useState, useEffect } from "react";

interface LandingHeaderProps {
  onOpenLogin: () => void;
}

export function LandingHeader({ onOpenLogin }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className={`landing-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="landing-header-container">
        <a href="#hero" className="landing-brand" onClick={closeMobileMenu}>
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
            type="button"
            className="landing-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
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
        <div className="landing-mobile-drawer">
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
