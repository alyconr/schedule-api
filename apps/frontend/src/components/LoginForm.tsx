import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login } from "../api/auth";
import { loadAiFxRuntime } from "../utils/loadAiFxRuntime";

const loginSchema = z.object({
  email: z.string().email("Debe ser un correo electrónico válido").min(1, "El correo es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginSchemaType = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onLoginSuccess: (token: string) => void;
  onBackToLanding?: () => void;
}

export function LoginForm({ onLoginSuccess, onBackToLanding }: LoginFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [effectAvailable, setEffectAvailable] = useState(true);

  useEffect(() => {
    let active = true;

    loadAiFxRuntime().catch(() => {
      if (active) {
        setEffectAvailable(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginSchemaType) => {
    setLoading(true);
    setApiError(null);
    try {
      const response = await login(data.email, data.password);
      onLoginSuccess(response.access_token);
    } catch (err: any) {
      setApiError(err.message || "Error al iniciar sesión. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Panel Izquierdo: Formulario de inicio de sesión */}
      <section className="login-form-panel">
        <div className="login-form-content">
          {onBackToLanding && (
            <button
              type="button"
              className="btn-back-landing"
              onClick={onBackToLanding}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
              Volver al inicio
            </button>
          )}

          <div className="login-card">
            <div className="login-brand-header">
              <img src="/logo-sena.svg" alt="SENA" width="40" height="40" />
              <div className="login-brand-titles">
                <h1>Gestión de Horarios</h1>
                <p>CGMLTI Bogotá</p>
              </div>
            </div>

            <p className="login-subtitle">Accede para programar y consultar la asignación académica</p>

            <form onSubmit={handleSubmit(onSubmit)} className="login-form" noValidate>
              <div className="login-field">
                <label htmlFor="login-email">Correo Institucional</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="ejemplo@sena.edu.co"
                  {...register("email")}
                  className={errors.email ? "input-error" : ""}
                  autoComplete="email"
                />
                {errors.email && <span className="field-error">{errors.email.message}</span>}
              </div>

              <div className="login-field">
                <label htmlFor="login-password">Contraseña</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Ingrese su contraseña"
                  {...register("password")}
                  className={errors.password ? "input-error" : ""}
                  autoComplete="current-password"
                />
                {errors.password && <span className="field-error">{errors.password.message}</span>}
              </div>

              {apiError && <div className="login-api-error">{apiError}</div>}

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? "Iniciando sesión…" : "Iniciar Sesión"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Panel Derecho: Pixel Grid animado y Contenido Institucional */}
      <aside
        className={`login-effect-panel ${
          effectAvailable ? "" : "effect-unavailable"
        }`}
      >
        <div
          data-aifx="blocky"
          className="login-pixel-grid"
          aria-hidden="true"
        />

        <div className="login-effect-overlay" aria-hidden="true" />

        <div className="login-effect-content">
          <img
            src="/logo-sena.svg"
            alt=""
            className="login-effect-logo"
            aria-hidden="true"
          />

          <p className="login-effect-eyebrow">
            Planeación académica CGMLTI
          </p>

          <h2>
            Información conectada para construir mejores horarios
          </h2>

          <p>
            Fichas, trimestres, instructores, ambientes, RAP y bloques
            horarios reunidos en una misma plataforma.
          </p>

          <div className="login-entity-tags" aria-hidden="true">
            <span className="entity-chip highlight">Ficha 2998451</span>
            <span className="entity-chip">Trimestre 3</span>
            <span className="entity-chip">Instructor</span>
            <span className="entity-chip">Ambiente 401</span>
            <span className="entity-chip">RAP 240201064</span>
          </div>
        </div>
      </aside>
    </div>
  );
}