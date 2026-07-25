interface StickyProductPreviewProps {
  activeStep: number;
}

export function StickyProductPreview({ activeStep }: StickyProductPreviewProps) {
  return (
    <div className="sticky-preview-container" aria-label={`Demostración interactiva - Paso ${activeStep}`}>
      <div className="sticky-preview-card">
        {/* Cabecera del panel */}
        <div className="sticky-preview-header">
          <div className="sticky-preview-tabs">
            <span className={`tab-pill ${activeStep === 1 ? "active" : ""}`}>1. Datos Maestros</span>
            <span className={`tab-pill ${activeStep === 2 ? "active" : ""}`}>2. Asignación</span>
            <span className={`tab-pill ${activeStep === 3 ? "active" : ""}`}>3. Validación</span>
            <span className={`tab-pill ${activeStep === 4 ? "active" : ""}`}>4. Matriz & Consulta</span>
          </div>
        </div>

        {/* Cuerpos dinámicos según el paso activo */}
        <div className="sticky-preview-content">
          {/* PASO 1: Organizar la información */}
          {activeStep === 1 && (
            <div className="step-view view-organize">
              <div className="view-badge">Una sola fuente de información académica</div>
              <p className="view-intro">Categorías centralizadas para la planeación académica:</p>

              <div className="entity-cards-grid">
                <div className="entity-card-item">
                  <svg className="entity-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <div className="entity-info">
                    <strong>Instructores</strong>
                    <span>Planta y Contratistas</span>
                  </div>
                </div>

                <div className="entity-card-item highlighted">
                  <svg className="entity-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <div className="entity-info">
                    <strong>Fichas académicas</strong>
                    <span className="badge-trimestre">Trimestre 3</span>
                  </div>
                </div>

                <div className="entity-card-item">
                  <svg className="entity-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                  <div className="entity-info">
                    <strong>Competencias & RAP</strong>
                    <span>Resultados de Aprendizaje</span>
                  </div>
                </div>

                <div className="entity-card-item">
                  <svg className="entity-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18" />
                    <path d="M14 9h3" />
                    <path d="M14 15h3" />
                  </svg>
                  <div className="entity-info">
                    <strong>Ambientes</strong>
                    <span>Físicos, Virtuales y Externos</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Construir la programación */}
          {activeStep === 2 && (
            <div className="step-view view-build">
              <div className="view-badge">Ficha + trimestre + instructor + RAP + ambiente</div>
              
              <div className="builder-form-mock">
                <div className="form-field-mock">
                  <label>1. Seleccionar Ficha</label>
                  <div className="field-select-mock">
                    <span>Ficha 2998451</span>
                    <span className="badge-trimestre-inline">Trimestre 3</span>
                  </div>
                </div>

                <div className="form-field-mock">
                  <label>2. Asignar Instructor</label>
                  <div className="field-select-mock">
                    <span>Laura Gómez — Instructor Planta</span>
                  </div>
                </div>

                <div className="form-field-mock">
                  <label>3. Definir RAP & Temática</label>
                  <div className="field-select-mock">
                    <span>RAP 240201064 · Modelado de datos</span>
                  </div>
                </div>

                <div className="form-field-mock">
                  <label>4. Seleccionar Ambiente & Bloque</label>
                  <div className="field-select-mock">
                    <span>Ambiente 401 · Lunes 08:00 – 12:00</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: Validar antes de consolidar */}
          {activeStep === 3 && (
            <div className="step-view view-validate">
              <div className="view-badge">Detectar antes de publicar</div>
              <p className="view-intro">Validación automática de reglas de negocio:</p>

              <div className="validation-list-mock">
                <div className="val-item val-valid">
                  <svg className="val-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.5" aria-hidden="true" focusable="false">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <div className="val-details">
                    <strong>Disponibilidad de Instructor</strong>
                    <span>Laura Gómez no presenta solapamientos en la franja.</span>
                  </div>
                  <span className="val-badge valid-bg">VÁLIDO</span>
                </div>

                <div className="val-item val-warning">
                  <svg className="val-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" aria-hidden="true" focusable="false">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div className="val-details">
                    <strong>Capacidad de Ambiente</strong>
                    <span>Ficha 2998451 (32 aprendices) vs Ambiente 401 (Capacidad 30).</span>
                  </div>
                  <span className="val-badge warning-bg">ADVERTENCIA</span>
                </div>

                <div className="val-item val-blocked">
                  <svg className="val-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.5" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  <div className="val-details">
                    <strong>Cruce de Ficha en otro Ambiente</strong>
                    <span>La Ficha 2998451 (Trimestre 3) ya tiene sesión asignada en Amb. 102.</span>
                  </div>
                  <span className="val-badge danger-bg">BLOQUEADO</span>
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: Consultar con claridad */}
          {activeStep === 4 && (
            <div className="step-view view-query">
              <div className="view-badge">Información académica fácil de consultar</div>

              <div className="matrix-filters-mock">
                <span className="filter-chip active">Ficha: 2998451</span>
                <span className="filter-chip">Trimestre 3</span>
                <span className="filter-chip">Instructor: Laura Gómez</span>
                <span className="filter-chip">Mes: Julio 2026</span>
              </div>

              <div className="popover-detail-card">
                <div className="popover-header">
                  <strong>Detalle de la Sesión Académica</strong>
                  <span className="status-badge-green">Programada</span>
                </div>
                <div className="popover-grid">
                  <div><span className="label">Ficha:</span> 2998451</div>
                  <div><span className="label">Trimestre:</span> Trimestre 3</div>
                  <div><span className="label">Instructor:</span> Laura Gómez</div>
                  <div><span className="label">Programa:</span> ADSO</div>
                  <div><span className="label">Ambiente:</span> 401 (Físico)</div>
                  <div><span className="label">RAP:</span> 240201064</div>
                  <div><span className="label">Temática:</span> Modelado de datos</div>
                  <div><span className="label">Horario:</span> Lunes 08:00 – 12:00</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Microcopy inferior del Mockup */}
        <div className="sticky-preview-footer">
          <span className="footer-step-tag">Paso {activeStep} de 4</span>
          <span className="footer-step-desc">
            {activeStep === 1 && "Centralización de entidades y datos maestros."}
            {activeStep === 2 && "Trazabilidad completa en cada franja horaria."}
            {activeStep === 3 && "Evaluación previa de reglas institucionales."}
            {activeStep === 4 && "Matriz académica lista para la comunidad."}
          </span>
        </div>
      </div>
    </div>
  );
}

