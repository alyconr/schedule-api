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
      <div className="login-card">
        <div className="login-header">
          <img className="sena-login-logo" src="/logo-sena.svg" alt="SENA" />
          <p className="eyebrow">CGMLTI Bogotá</p>
          <h1>GESTION DE HORARIOS CGMLTI</h1>
          <p className="subtitle">Accede para gestionar y programar horarios</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form">
          <label>
            Correo Institucional
            <input
              type="email"
              placeholder="ejemplo@sena.edu.co"
              {...register("email")}
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && <span className="error-message">{errors.email.message}</span>}
          </label>

          <label>
            Contraseña
            <input
              type="password"
              placeholder="••••••••"
              {...register("password")}
              className={errors.password ? "input-error" : ""}
            />
            {errors.password && <span className="error-message">{errors.password.message}</span>}
          </label>

          {apiError && <p className="form-error">{apiError}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
