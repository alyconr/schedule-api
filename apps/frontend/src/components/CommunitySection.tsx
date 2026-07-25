interface CommunitySectionProps {
  onOpenLogin: () => void;
}

export function CommunitySection({ onOpenLogin }: CommunitySectionProps) {
  return (
    <section id="comunidad" className="community-section">
      <div className="community-container">
        {/* Header de la sección */}
        <div className="community-header">
          <span className="community-eyebrow">Una plataforma para toda la comunidad</span>
          <h2 className="community-title">La misma información, vista desde las necesidades de cada persona</h2>
          <p className="community-description">
            Una programación organizada mejora la coordinación institucional y facilita el desarrollo de las actividades formativas.
          </p>
        </div>

        {/* 4 Tarjetas de usuarios/audiencia */}
        <div className="audience-cards-grid">
          {/* Instructores */}
          <div className="audience-card">
            <div className="audience-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3 className="audience-title">Instructores</h3>
            <p className="audience-text">
              Consulta clara de horarios, fichas, trimestres, ambientes, RAP y temáticas asignadas.
            </p>
          </div>

          {/* Aprendices */}
          <div className="audience-card">
            <div className="audience-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <h3 className="audience-title">Aprendices</h3>
            <p className="audience-text">
              Una experiencia formativa respaldada por horarios más organizados y coherentes.
            </p>
          </div>

          {/* Directivas y coordinación */}
          <div className="audience-card">
            <div className="audience-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <h3 className="audience-title">Directivas y coordinación</h3>
            <p className="audience-text">
              Una visión integral para revisar programación, cargas, conflictos y disponibilidad académica.
            </p>
          </div>

          {/* Personal administrativo */}
          <div className="audience-card">
            <div className="audience-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h3 className="audience-title">Personal administrativo</h3>
            <p className="audience-text">
              Herramientas para cargar información, mantener datos actualizados y apoyar la programación.
            </p>
          </div>
        </div>

        {/* Franja de beneficios */}
        <div className="benefit-strip-container">
          <div className="benefit-item">
            <svg className="benefit-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="benefit-text">Programación organizada</span>
          </div>
          <div className="benefit-item">
            <svg className="benefit-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="benefit-text">Validaciones oportunas</span>
          </div>
          <div className="benefit-item">
            <svg className="benefit-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <span className="benefit-text">Información centralizada</span>
          </div>
          <div className="benefit-item">
            <svg className="benefit-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="benefit-text">Consulta por diferentes criterios</span>
          </div>
        </div>

        {/* CTA Final de alto contraste (Fondo Verde Oscuro Institutional) */}
        <div className="final-cta-banner">
          <div className="cta-content">
            <img src="/logo-sena.svg" alt="SENA" className="cta-sena-logo" width="48" height="48" />
            <h3 className="cta-title">
              Construimos mejores horarios para acompañar mejores procesos de formación
            </h3>
            <p className="cta-text">
              Ingresa a la plataforma y consulta las herramientas disponibles para la planeación académica del CGMLTI.
            </p>

            <div className="cta-actions">
              <button
                type="button"
                className="landing-btn-cta"
                onClick={onOpenLogin}
              >
                Ingresar a la plataforma
              </button>

              <a href="#hero" className="cta-link-secondary">
                Volver al inicio ↑
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
