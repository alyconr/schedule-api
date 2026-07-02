# Contexto Maestro del Proyecto

## Proyecto

Aplicacion de Horarios para Instructores SENA - CGMLTI Bogota.

## Objetivo del sistema

Construir una aplicacion web que permita planear, validar, generar, ajustar, aprobar, consultar y exportar horarios de instructores, fichas de formacion, ambientes, competencias, RAP, bloques y subbloques, respetando las reglas de negocio definidas para el CGMLTI SENA Bogota.

## Documentos fuente obligatorios existentes

El agente IA debe leer y respetar estos documentos antes de generar codigo:

1. `docs/BUSINESS_RULES.md`
2. `docs/PRD.md`
3. `docs/SPECS.md`

Los documentos `docs/context/01_PRD.md`, `docs/context/02_BUSINESS_RULES.md`, `docs/context/03_TECH_SPECS.md`, `docs/context/04_DATA_MODEL.md`, `docs/context/05_USER_STORIES.md`, `docs/context/06_ACCEPTANCE_CRITERIA.md` y `docs/context/07_DEPLOYMENT_DOKPLOY.md` no existen actualmente en este repositorio. No deben tratarse como fuente hasta que sean creados.

## Jerarquia de autoridad documental

Si existe conflicto entre documentos, aplicar esta prioridad:

1. Reglas de negocio.
2. PRD.
3. Specs tecnicos.
4. Modelo de datos y API descritos en specs.
5. Criterios de aceptacion.
6. Documentacion auxiliar.

## Reglas criticas del dominio

- No generar ni guardar horarios sin validar disponibilidad de instructor.
- No generar ni guardar horarios sin validar disponibilidad de ambiente.
- No permitir solapamiento de eventos para un mismo instructor.
- No permitir solapamiento de eventos para una misma ficha.
- No permitir doble ocupacion simultanea de un ambiente fisico.
- No permitir que una ficha tenga eventos simultaneos incompatibles ni RAP duplicado en el mismo bloque.
- Validar horas maximas o minimas segun tipo de contrato.
- Instructor de planta: programacion frecuente de 30 horas semanales; maximo permitido de 32 horas.
- Instructor de planta con mas de 30 y hasta 32 horas: permitido con alerta informativa si las horas adicionales quedan identificadas.
- Instructor de planta con mas de 32 horas: bloquear.
- Instructor contratista: carga esperada minima de 40 horas semanales.
- Contratista con menos de 40 horas: generar alerta y permitir registrar horas faltantes como adicionales, complementarias o pendientes.
- Contratista con mas de 40 horas: generar alerta, pero permitir salvo configuracion contraria.
- Ambiente con capacidad inferior al numero de aprendices: advertir, pero no bloquear.
- RAP invalido o no asociado al programa de la ficha: bloquear.
- Instructor, ficha o ambiente inactivo: bloquear.
- Las horas ejecutadas son inicialmente las horas programadas por el aplicativo.
- Las excepciones deben ser aprobadas por coordinacion y registrar justificacion, solicitante, aprobador, fechas, estado y observaciones.

## Modulos del sistema

- Autenticacion y usuarios.
- Roles y permisos.
- Datos maestros: instructores, fichas, programas, competencias, RAP, ambientes, jornadas, bloques, subbloques, tipos de contrato, sedes y coordinaciones.
- Carga masiva desde Excel o CSV.
- Programacion de horarios.
- Motor de validaciones.
- Alertas y bloqueos.
- Aprobacion de excepciones.
- Consultas.
- Reportes y exportaciones.
- Auditoria y trazabilidad.

## Stack inicial sugerido

- Frontend: React, TypeScript, Tailwind CSS.
- Datos frontend: TanStack Query.
- Formularios y validacion frontend: React Hook Form y Zod.
- Vista de calendario: FullCalendar o componente similar.
- Backend: FastAPI, Python, Pydantic.
- Base de datos: PostgreSQL.
- ORM: SQLAlchemy o SQLModel.
- Migraciones: Alembic.
- Autenticacion: JWT.
- Despliegue: Docker + Docker Compose + Dokploy en VPS.
- Reverse proxy: Traefik o Nginx segun configuracion Dokploy.
- Documentacion tecnica: Markdown.
- Control de versiones: Git/GitHub.

## Alcance MVP

El MVP debe incluir login y roles, CRUD de instructores, fichas, ambientes, programas, competencias y RAP, programacion manual asistida, validacion de cruces, validacion de carga horaria, alertas y bloqueos, aprobacion basica de excepciones, consulta por instructor/ficha/ambiente, exportacion basica y despliegue en Dokploy.

## Fuera de alcance inicial

No incluir inicialmente nomina, liquidacion contractual, integracion directa con Sofia Plus, control biometrico, firma digital, aplicacion movil nativa, inteligencia artificial para generacion automatica completa de horarios, notificaciones automaticas por WhatsApp/correo, control detallado de asistencia real ni reportes financieros.

## Principio de construccion

El agente IA no debe escribir codigo hasta haber revisado PRD, reglas de negocio, specs tecnicos y criterios de aceptacion existentes. Las reglas de negocio deben implementarse en un servicio central de validacion, no dispersas en controladores o componentes de interfaz.

## Definicion de terminado

Una funcionalidad se considera terminada cuando tiene backend implementado, frontend funcional si aplica, validaciones, control de errores, permisos por rol, pruebas minimas para logica critica, documentacion suficiente, soporte Docker/Dokploy y cumplimiento de los criterios de aceptacion definidos.
