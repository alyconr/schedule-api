# TASK.md - Plan inicial de construccion

## Objetivo

Orientar el desarrollo del proyecto paso a paso desde la inicializacion hasta la primera version funcional.

## Fase 1 - Preparacion del proyecto

- [x] Revisar documentacion base: PRD, reglas de negocio y specs.
- [x] Definir estructura del repositorio para frontend y backend.
- [x] Configurar entorno local de desarrollo.
- [x] Preparar variables de entorno y configuracion base.
- [x] Crear un primer punto de partida estable para empezar a iterar.

## Fase 2 - Base tecnica

- [x] Inicializar backend con FastAPI.
- [x] Configurar base de datos y conexion.
- [x] Crear modelos iniciales y migraciones.
- [x] Definir contratos de API basicos.
- [x] Preparar endpoints minimos para pruebas iniciales.

## Fase 3 técnica - CRUD backend de datos maestros

- [x] Implementar CRUD backend mínimo de tipos de contrato.
- [x] Implementar CRUD backend mínimo de instructores.
- [x] Implementar CRUD backend mínimo de programas.
- [x] Implementar CRUD backend mínimo de competencias.
- [x] Implementar CRUD backend mínimo de RAP.
- [x] Implementar CRUD backend mínimo de fichas.
- [x] Implementar CRUD backend mínimo de ambientes.
- [x] Implementar CRUD backend mínimo de bloques horarios.

## Fase 3 - Reglas de negocio criticas

- [x] Implementar validaciones iniciales de disponibilidad de instructor.
- [x] Implementar validaciones iniciales de disponibilidad de ambiente.
- [x] Evitar solapamientos de horarios por instructor y ficha en el endpoint de validacion.
- [x] Validar reglas iniciales de capacidad y carga horaria.
- [x] Asegurar que las reglas de negocio queden centralizadas y no dispersas.

## Fase 4 - Frontend inicial

- [x] Crear estructura base de la interfaz.
- [x] Disenar primera pantalla operativa del flujo principal.
- [x] Conectar pantalla inicial con la API de validacion.
- [ ] Implementar CRUD y formularios de datos maestros.
- [ ] Aplicar sistema visual definitivo.

## Fase 5 - Integracion y validacion

- [ ] Probar flujos principales end-to-end.
- [x] Revisar seguridad basica en configuracion, CORS, entradas y respuestas.
- [ ] Corregir errores y ajustar reglas de negocio.
- [ ] Preparar una primera version funcional para revision.
- [ ] Documentar lo que queda pendiente para la siguiente iteracion.

## Reglas de trabajo

- Priorizar la simplicidad y el MVP.
- Usar las skills del proyecto cuando aplique: ponytail, fastapi, frontend-design, security-best-practices y review/audit.
- Consultar AGENTS.md antes de iniciar cambios importantes.
- No empezar una funcionalidad grande sin tener un paso anterior validado.
