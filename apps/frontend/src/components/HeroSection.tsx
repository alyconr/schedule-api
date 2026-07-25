import { AnimatedSchedulePreview } from "./AnimatedSchedulePreview";

interface HeroSectionProps {
  onOpenLogin: () => void;
}

export function HeroSection({ onOpenLogin }: HeroSectionProps) {
  return (
    <section id="hero" className="hero-section">
      <div className="hero-container">
        {/* Columna Izquierda: Copy & Acciones */}
        <div className="hero-copy-column">
          <div className="hero-eyebrow-badge">
            <span className="eyebrow-dot" />
            CGMLTI Bogotá · Planeación académica
          </div>

          <h1 className="hero-title">
            Horarios claros para una comunidad educativa mejor conectada
          </h1>

          <p className="hero-description">
            Una plataforma para organizar, validar y consultar la programación académica,
            conectando fichas, trimestres, instructores, ambientes, RAP y temáticas en un solo lugar.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="landing-btn-primary hero-btn"
              onClick={onOpenLogin}
            >
              Ingresar a la plataforma
            </button>

            <a href="#como-funciona" className="landing-btn-secondary hero-btn">
              Conocer cómo funciona
            </a>
          </div>

          <div className="hero-institutional-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Tecnología al servicio de instructores, aprendices, directivas y personal administrativo.</span>
          </div>
        </div>

        {/* Columna Derecha: Mockup Animado */}
        <div className="hero-visual-column">
          <AnimatedSchedulePreview />
        </div>
      </div>

      {/* Indicador de desplazamiento */}
      <div className="hero-scroll-indicator">
        <a href="#como-funciona" aria-label="Desplazarse a la sección cómo funciona">
          <span>Desplázate para conocer el proceso</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </a>
      </div>
    </section>
  );
}
