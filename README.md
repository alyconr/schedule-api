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

API base: `http://localhost:8000/api/v1`.
Frontend: `http://localhost:3000`.
