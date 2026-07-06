import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login } from "../api/auth";

const loginSchema = z.object({
  email: z.string().email("Debe ser un correo electrónico válido").min(1, "El correo es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginSchemaType = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onLoginSuccess: (token: string) => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="login-container">
      <div className="login-bg-shapes" aria-hidden="true" />
      <div className="login-card">
        <div className="login-header">
          <img className="sena-login-logo" src="/logo-sena.svg" alt="SENA" />
          <p className="login-eyebrow">CGMLTI Bogotá</p>
          <h1 className="login-title">Gestión de Horarios</h1>
          <p className="login-subtitle">Accede para programar y consultar la asignación académica</p>
        </div>

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
  );
}