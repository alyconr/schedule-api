import { useState, useEffect, useRef } from "react";
import { StickyProductPreview } from "./StickyProductPreview";

export function StorySection() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const stepRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  useEffect(() => {
    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: "-35% 0px -45% 0px",
      threshold: 0,
    };

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const stepIndex = Number(entry.target.getAttribute("data-step"));
          if (stepIndex) {
            setActiveStep(stepIndex);
          }
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    stepRefs.forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section id="como-funciona" className="story-section">
      <div className="story-header-container">
        <span className="story-eyebrow">Una programación conectada</span>
        <h2 className="story-main-title">Del dato académico a un horario claro y validado</h2>
        <p className="story-main-description">
          La plataforma reúne la información necesaria, acompaña la programación y ayuda a identificar
          conflictos antes de que afecten el desarrollo de la formación.
        </p>
      </div>

      <div className="story-body-grid">
        {/* Columna Izquierda: Pasos narrativos */}
        <div className="story-steps-column">
          <div className="story-progress-line" aria-hidden="true">
            <div
              className="story-progress-bar"
              style={{ height: `${((activeStep - 1) / 3) * 100}%` }}
            />
          </div>

          {/* PASO 1 */}
          <div
            ref={stepRefs[0]}
            data-step="1"
            className={`story-step-card ${activeStep === 1 ? "is-active" : ""}`}
          >
            <div className="step-badge-number">Paso 1</div>
            <h3 className="step-title">Todo comienza con información organizada</h3>
            <p className="step-text">
              Instructores, fichas, trimestres, programas, competencias, RAP, temáticas, ambientes y bloques
              horarios se administran desde una misma plataforma.
            </p>
            <span className="step-microcopy">Una sola fuente de información académica</span>

            {/* Visual incrustada para vista móvil */}
            <div className="mobile-step-visual">
              <StickyProductPreview activeStep={1} />
            </div>
          </div>

          {/* PASO 2 */}
          <div
            ref={stepRefs[1]}
            data-step="2"
            className={`story-step-card ${activeStep === 2 ? "is-active" : ""}`}
          >
            <div className="step-badge-number">Paso 2</div>
            <h3 className="step-title">Cada asignación conserva su contexto</h3>
            <p className="step-text">
              Al programar una sesión se relacionan la ficha, su trimestre, el instructor, el RAP, la temática, el
              ambiente y la franja horaria correspondiente.
            </p>
            <span className="step-microcopy">Ficha + trimestre + instructor + RAP + ambiente</span>

            {/* Visual incrustada para vista móvil */}
            <div className="mobile-step-visual">
              <StickyProductPreview activeStep={2} />
            </div>
          </div>

          {/* PASO 3 */}
          <div
            ref={stepRefs[2]}
            data-step="3"
            className={`story-step-card ${activeStep === 3 ? "is-active" : ""}`}
          >
            <div className="step-badge-number">Paso 3</div>
            <h3 className="step-title">Las reglas institucionales acompañan la programación</h3>
            <p className="step-text">
              El sistema identifica cruces de instructor, ficha o ambiente, revisa la carga horaria y genera
              advertencias cuando una asignación necesita atención.
            </p>
            <span className="step-microcopy">Detectar antes de publicar</span>

            {/* Visual incrustada para vista móvil */}
            <div className="mobile-step-visual">
              <StickyProductPreview activeStep={3} />
            </div>
          </div>

          {/* PASO 4 */}
          <div
            ref={stepRefs[3]}
            data-step="4"
            className={`story-step-card ${activeStep === 4 ? "is-active" : ""}`}
          >
            <div className="step-badge-number">Paso 4</div>
            <h3 className="step-title">La comunidad encuentra una programación más clara</h3>
            <p className="step-text">
              La matriz académica y la programación detallada permiten consultar las sesiones por ficha,
              trimestre, instructor, RAP, ambiente y periodo.
            </p>
            <span className="step-microcopy">Información académica fácil de consultar</span>

            {/* Visual incrustada para vista móvil */}
            <div className="mobile-step-visual">
              <StickyProductPreview activeStep={4} />
            </div>
          </div>
        </div>

        {/* Columna Derecha: Sticky Product Preview (Escritorio/Tablet) */}
        <div className="story-sticky-column">
          <StickyProductPreview activeStep={activeStep} />
        </div>
      </div>
    </section>
  );
}
