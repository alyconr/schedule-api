interface LandingFooterProps {
  onOpenLogin: () => void;
}

export function LandingFooter({ onOpenLogin }: LandingFooterProps) {
  return (
    <footer className="landing-footer">
      <div className="footer-container">
        <div className="footer-main-info">
          <div className="footer-brand">
            <img src="/logo-sena.svg" alt="SENA" className="footer-logo" width="32" height="32" />
            <div>
              <strong>Gestión de Horarios CGMLTI</strong>
              <p className="footer-center-name">
                Centro de Gestión de Mercados, Logística y Tecnologías de la Información — SENA Bogotá
              </p>
            </div>
          </div>

          <nav className="footer-nav" aria-label="Navegación pie de página">
            <a href="#hero">Inicio</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#comunidad">Comunidad</a>
            <button type="button" className="footer-link-btn" onClick={onOpenLogin}>
              Ingresar
            </button>
          </nav>
        </div>

        <div className="footer-bottom-bar">
          <p className="footer-tagline">Tecnología al servicio de la comunidad educativa.</p>
          <p className="footer-copyright">
            © {new Date().getFullYear()} SENA CGMLTI. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
