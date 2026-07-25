import { useState, useEffect } from "react";

export function AnimatedSchedulePreview() {
  // Animación narrada en 4 etapas principales (0: vacía, 1: conectando datos, 2: conflicto detectado, 3: resuelto/válido)
  const [stage, setStage] = useState<number>(0);

  useEffect(() => {
    // Si el usuario prefiere movimiento reducido, pausar en etapa final resuelta
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setStage(3);
      return;
    }

    let timer: ReturnType<typeof setInterval> | null = null;

    const startTimer = () => {
      if (!timer) {
        timer = setInterval(() => {
          setStage((prev) => (prev + 1) % 4);
        }, 2800);
      }
    };

    const stopTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopTimer();
      } else {
        startTimer();
      }
    };

    startTimer();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div
      className="hero-preview-wrapper"
      aria-label="Simulación visual decorativa de programación académica en cuatro etapas"
      role="img"
    >
      <div className="hero-preview-card" aria-hidden="true">
        {/* Cabecera del Mockup */}
        <div className="preview-topbar">
          <div className="preview-dots">
            <span className="dot dot-red" />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
          </div>
          <span className="preview-title">Planeación Semanal CGMLTI — Vista de Asignación</span>
          <span className="preview-badge-live">
            <span className="pulse-dot" /> Simulación de programación
          </span>
        </div>

        {/* Panel de Datos Vinculados */}
        <div className="preview-entity-strip">
          <div className={`preview-entity-tag tag-ficha ${stage >= 1 ? "active" : ""}`}>
            <span className="tag-label">Ficha</span>
            <span className="tag-val">2998451</span>
            <span className="tag-sub">Trimestre 3</span>
          </div>

          <div className={`preview-entity-tag tag-instructor ${stage >= 1 ? "active" : ""}`}>
            <span className="tag-label">Instructor</span>
            <span className="tag-val">Laura Gómez</span>
          </div>

          <div className={`preview-entity-tag tag-ambiente ${stage >= 1 ? "active" : ""}`}>
            <span className="tag-label">Ambiente</span>
            <span className="tag-val">401 · Sistemas</span>
          </div>

          <div className={`preview-entity-tag tag-rap ${stage >= 1 ? "active" : ""}`}>
            <span className="tag-label">RAP 240201064</span>
            <span className="tag-val">Modelado de datos</span>
          </div>
        </div>

        {/* Cuadrícula Semanal */}
        <div className="preview-grid-container">
          <div className="grid-header">
            <div className="time-col-header">Hora</div>
            <div className={`day-col-header ${stage === 2 ? "highlight-day" : ""}`}>Lunes</div>
            <div className="day-col-header">Martes</div>
            <div className="day-col-header">Miércoles</div>
            <div className="day-col-header">Jueves</div>
            <div className="day-col-header">Viernes</div>
          </div>

          <div className="grid-body">
            {/* Fila 8:00 AM */}
            <div className="grid-row">
              <div className="time-cell">08:00 AM</div>
              
              {/* Celda del Lunes */}
              <div className="grid-cell slot-monday">
                {stage === 0 && (
                  <div className="placeholder-slot">
                    <span className="plus-icon">+</span> Asignar bloque
                  </div>
                )}

                {stage === 1 && (
                  <div className="preview-block block-animating">
                    <div className="block-header">
                      <strong>Ficha 2998451 (Trimestre 3)</strong>
                    </div>
                    <div className="block-meta">Conectando instructor y RAP...</div>
                  </div>
                )}

                {stage === 2 && (
                  <div className="preview-block block-conflict">
                    <div className="block-header">
                      <span className="status-dot dot-warning" />
                      <strong>Ficha 2998451 · Trim. 3</strong>
                    </div>
                    <div className="block-body-text">Instructor: Laura Gómez</div>
                    <div className="block-alert-badge">
                      Alerta: Conflicto de franja horaria
                    </div>
                  </div>
                )}

                {stage === 3 && (
                  <div className="preview-block block-valid">
                    <div className="block-header">
                      <span className="status-dot dot-success" />
                      <strong>Ficha 2998451 · Trim. 3</strong>
                    </div>
                    <div className="block-body-text">Modelado de datos · Amb. 401</div>
                    <div className="block-meta">08:00 a. m. – 12:00 m.</div>
                    <div className="block-success-badge">
                      ✓ Programación válida
                    </div>
                  </div>
                )}
              </div>

              {/* Días restantes */}
              <div className="grid-cell">
                <div className="existing-block">Ficha 2840192 · Trim. 5</div>
              </div>
              <div className="grid-cell empty-cell"></div>
              <div className="grid-cell">
                <div className="existing-block">Ficha 2901124 · Trim. 2</div>
              </div>
              <div className="grid-cell empty-cell"></div>
            </div>

            {/* Fila 10:00 AM */}
            <div className="grid-row">
              <div className="time-cell">10:00 AM</div>
              <div className="grid-cell empty-cell"></div>
              <div className="grid-cell empty-cell"></div>
              <div className="grid-cell">
                <div className="existing-block">Ficha 2998451 · Trim. 3</div>
              </div>
              <div className="grid-cell empty-cell"></div>
              <div className="grid-cell empty-cell"></div>
            </div>
          </div>
        </div>

        {/* Footer del Mockup con trazabilidad de validación */}
        <div className="preview-footer">
          <div className="footer-status-indicator">
            {stage === 0 && <span className="status-text idle">Iniciando selección de horario...</span>}
            {stage === 1 && <span className="status-text linking">Vinculando Ficha 2998451, Trimestre 3 y RAP 240201064...</span>}
            {stage === 2 && <span className="status-text warning">Validando reglas: Se detectó un traslape temporal previo.</span>}
            {stage === 3 && <span className="status-text valid">✓ Franja validada: Sin cruces de instructor, ficha ni ambiente.</span>}
          </div>
          <div className="footer-step-counter">
            Paso {stage + 1} de 4
          </div>
        </div>
      </div>
    </div>
  );
}
