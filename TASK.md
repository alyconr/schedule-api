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

## Fase 4 técnica - Programación persistente

- [x] Implementar CRUD backend mínimo de programación.
- [x] Conectar creación de horarios con datos reales de base de datos.
- [x] Validar cruces reales por instructor, ficha y ambiente.
- [x] Calcular carga semanal real del instructor.
- [x] Validar RAP contra programa de la ficha.
- [x] Bloquear guardado cuando existan reglas bloqueantes.
- [x] Guardar horarios válidos o con advertencias.
- [x] Persistir validaciones asociadas al horario.
- [x] Mantener compatibilidad con endpoint de validación existente.

## Fase 4 - Frontend inicial

- [x] Crear estructura base de la interfaz.
- [x] Disenar primera pantalla operativa del flujo principal.
- [x] Conectar pantalla inicial con la API de validacion.
- [x] Implementar CRUD y formularios de datos maestros.
- [x] Aplicar sistema visual definitivo.

## Fase 5 técnica - Autenticación JWT y roles

- [x] Crear modelos de usuarios, roles y relación usuario-rol.
- [x] Crear migración Alembic para autenticación.
- [x] Implementar hash seguro de contraseñas.
- [x] Implementar emisión y validación de JWT.
- [x] Implementar endpoints de login y usuario actual.
- [x] Implementar CRUD mínimo de usuarios protegido por admin.
- [x] Implementar dependencias get_current_user y require_roles.
- [x] Proteger endpoints de datos maestros según rol.
- [x] Proteger endpoints de programación según rol.
- [x] Crear mecanismo seguro para crear primer usuario administrador.
- [x] Agregar tests mínimos de autenticación y roles.

## Fase 5 - Integracion y validacion

- [x] Probar flujos principales end-to-end.
- [x] Revisar seguridad basica en configuracion, CORS, entradas y respuestas.
- [x] Corregir errores y ajustar reglas de negocio.
- [x] Preparar una primera version funcional para revision.
- [x] Documentar lo que queda pendiente para la siguiente iteracion.

## Fase 6 - Frontend login y CRUD datos maestros

- [x] Implementar pantalla de login.
- [x] Implementar manejo de sesión con JWT.
- [x] Implementar cliente API con Authorization Bearer.
- [x] Implementar consulta de usuario actual.
- [x] Implementar layout autenticado.
- [x] Implementar logout.
- [x] Implementar CRUD frontend de tipos de contrato.
- [x] Implementar CRUD frontend de instructores.
- [x] Implementar CRUD frontend de programas.
- [x] Implementar CRUD frontend de competencias.
- [x] Implementar CRUD frontend de RAP.
- [x] Implementar CRUD frontend de fichas.
- [x] Implementar CRUD frontend de ambientes.
- [x] Implementar CRUD frontend de bloques horarios.
- [x] Manejar visualmente errores 401 y 403.
- [x] Mantener build frontend funcionando.

## Reglas de trabajo

- Priorizar la simplicidad y el MVP.
- Usar las skills del proyecto cuando aplique: ponytail, fastapi, frontend-design, security-best-practices y review/audit.
- Consultar AGENTS.md antes de iniciar cambios importantes.
- No empezar una funcionalidad grande sin tener un paso anterior validado.

