# GESTION DE HORARIOS CGMLTI

Aplicacion web para planear y validar horarios de instructores SENA CGMLTI.

## Estructura

```text
apps/
  backend/   FastAPI + reglas de validacion
  frontend/  React + Vite
docs/        PRD, reglas de negocio y specs
```

## Inicio local

Backend:

```powershell
python -m venv .venv
.\\.venv\\Scripts\\python -m pip install -r apps\\backend\\requirements.txt
.\\.venv\\Scripts\\python -m uvicorn app.main:app --app-dir apps\\backend --reload
```

Pruebas backend:

```powershell
.\\.venv\\Scripts\\python -m pip install -r apps\\backend\\requirements-dev.txt
$env:PYTHONPATH='apps/backend'
.\\.venv\\Scripts\\python -m unittest discover apps/backend/tests
```

Frontend:

```powershell
cd apps\\frontend
npm install
npm run dev
```

Docker:

```powershell
docker compose up --build
```

API base desde el frontend Docker: `/api/v1` (Nginx la reenvia internamente a `schedule-backend:8000`).
Frontend: `http://localhost:3000`.

## CI/CD

El workflow `.github/workflows/ci-cd.yml` valida los pull requests y pushes a `develop`:

- Ejecuta las pruebas del backend.
- Compila el frontend.
- Valida Docker Compose.
- Construye las imágenes de la aplicación.
- Despliega en Dokploy únicamente después de un CI exitoso en `develop`.

Configuración necesaria:

1. En Dokploy, copia la URL de despliegue disponible en `Deployments`.
2. En GitHub, abre `Settings > Secrets and variables > Actions`.
3. Crea el secreto `DOKPLOY_WEBHOOK_URL` con esa URL.
4. Desactiva `Auto Deploy` en Dokploy para evitar despliegues antes de que termine el CI.
