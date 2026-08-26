SPECS.md

## Importacion relacional de semaforos

## Acceso por coordinaciones

### Principio

Rol = qué puede hacer el usuario. Coordinación = sobre qué información puede hacerlo. Son dimensiones independientes.

### Entidades

- `Coordination`: id, code (unique), name, description, is_active, timestamps.
- `UserCoordination`: M:N user ↔ coordination con UNIQUE(user_id, coordination_id).
- `InstructorCoordination`: M:N instructor ↔ coordination con UNIQUE(instructor_id, coordination_id).
- `Group.coordination_id`: FK nullable (legacy). Nuevas fichas deben tener coordinación.
- `Instructor.primary_coordination_id`: FK nullable. Debe pertenecer a las coordinaciones disponibles.
- `Schedule.coordination_id`: FK nullable (legacy). Para horarios académicos se deriva de Group. Para horas adicionales se exige explícita.

### AccessScope

```python
@dataclass(frozen=True)
class AccessScope:
    user_id: int
    roles: frozenset[str]
    coordination_ids: frozenset[int]
    is_global: bool  # True si el usuario es admin
```

Resuelto desde PostgreSQL en cada request, no desde el JWT.

### Endpoints

```
GET    /api/v1/coordinations          # lista scope-visible
GET    /api/v1/coordinations/{id}     # 404 si fuera de scope
POST   /api/v1/coordinations          # admin
PUT    /api/v1/coordinations/{id}     # admin
DELETE /api/v1/coordinations/{id}    # admin (soft delete si hay refs)

GET    /api/v1/instructors/{id}/busy-slots  # slots ajenos enmascarados
```

### Reglas de seguridad

- Recursos individuales fuera de scope → 404 (no 403).
- Query params `coordination_id` siempre se intersectan con el scope autorizado.
- `_existing_for_date` y `validate_schedule` NO se filtran por coordinación (conflictos globales).
- Carga horaria del instructor calculada globalmente.
- Busy-slots no retornan IDs internos ni detalles académicos.

### Coordinaciones iniciales

```
LOGISTICA, MERCADEO, TELEINFORMATICA_INDUSTRIAS_CREATIVAS,
ARTICULACION_MEDIA, TRANSVERSALES
```

## Periodo obligatorio de horarios

- `schedules.schedule_year`: `SMALLINT NOT NULL`, rango 2000-2100.
- `schedules.schedule_quarter`: `SMALLINT NOT NULL`, rango 1-4.
- La migración deriva ambos campos desde `schedules.date` antes de hacerlos obligatorios.
- `GET /api/v1/schedules/periods` agrupa sesiones por instructor o ficha.
- `GET /api/v1/schedules/detailed` exige `schedule_year` y `schedule_quarter`.
- `POST` y `PUT /api/v1/schedules` validan que la fecha pertenezca al periodo.
- `schedule_history` recibe `.xlsx`, año y trimestre mediante los endpoints existentes de previsualización y confirmación de importaciones.

El importador soporta el tipo `semaforos_relacional` para reconstruir la relacion entre resultados de aprendizaje y tematicas desde hojas de semaforo de Oferta Abierta y Cadena. La regla aplicada es:

```text
mismo contexto + mismo trimestre + mismo color de fondo
```

La vista previa entrega `learning_results`, `topics`, `color_groups` y `ra_topic_relations`. En el commit se crean o actualizan resultados de aprendizaje, tematicas y la tabla puente `learning_result_topics`, conservando contexto, hoja, direccion de celda, trimestre, color y marca de revision manual cuando un bloque de color contiene varios RA y varias tematicas.
Aplicación de Programación de Horarios de Instructores SENA
CGMLTI SENA Bogotá
1. Propósito del proyecto
Construir una aplicación web que permita gestionar, validar, programar y consultar los horarios de instructores, fichas de formación, ambientes, resultados de aprendizaje y actividades asociadas a la planeación académica del CGMLTI SENA Bogotá.
La aplicación debe reducir errores manuales, evitar cruces de horarios, aplicar reglas de negocio institucionales y entregar una vista clara de la carga horaria de instructores, fichas y ambientes.
El sistema debe permitir la programación manual asistida, con validaciones automáticas, alertas, bloqueos y reportes que faciliten la toma de decisiones por parte de coordinación académica.
---
2. Objetivos funcionales
La aplicación debe permitir:
Registrar y administrar instructores.
Registrar fichas de formación.
Registrar programas de formación.
Registrar competencias, RAP y actividades de proyecto.
Registrar ambientes físicos o virtuales.
Crear horarios por bloque y subbloque.
Asignar instructores a fichas, RAP, ambientes y franjas horarias.
Validar automáticamente reglas de negocio.
Detectar cruces de instructor, ficha y ambiente.
Controlar la carga horaria semanal.
Generar alertas y bloqueos según el tipo de contrato.
Consultar horarios por instructor, ficha, ambiente y fecha.
Exportar horarios en formatos administrativos.
Registrar excepciones aprobadas por coordinación.
Mantener trazabilidad de cambios.
---
3. Tipos de usuario
3.1 Administrador del sistema
Responsable de configurar datos maestros, usuarios, roles, parámetros generales y reglas de negocio.
Puede:
Crear usuarios.
Asignar roles.
Configurar tipos de contrato.
Configurar franjas horarias.
Configurar ambientes.
Configurar parámetros institucionales.
Consultar auditoría general.
3.2 Coordinador académico
Responsable de validar, aprobar y hacer seguimiento a la programación.
Puede:
Crear y modificar programación.
Aprobar excepciones.
Consultar alertas.
Ver carga horaria.
Revisar reportes.
Autorizar programación con observaciones.
3.3 Programador académico
Responsable de construir los horarios operativos.
Puede:
Cargar información base.
Asignar instructores.
Asignar ambientes.
Asignar fichas.
Programar bloques y subbloques.
Consultar conflictos.
Corregir horarios antes de aprobación.
3.4 Instructor
Usuario de consulta.
Puede:
Consultar su horario.
Ver fichas asignadas.
Ver ambientes asignados.
Descargar su programación.
Reportar novedades, si se habilita esta función en una fase posterior.
3.5 Usuario de consulta
Perfil limitado para revisión de horarios.
Puede:
Consultar horarios publicados.
Filtrar por ficha, instructor o ambiente.
No puede modificar información.
---
4. Entidades principales del sistema
4.1 Instructor
Campos mínimos:
ID interno.
Tipo de documento.
Número de documento.
Nombres.
Apellidos.
Correo institucional.
Teléfono.
Tipo de vinculación.
Área o coordinación.
Especialidad.
Estado: activo, inactivo.
Horas máximas o mínimas según contrato.
Observaciones.
Tipos de vinculación iniciales:
Instructor de planta.
Instructor contratista.
Otro tipo configurable.
4.2 Ficha de formación
Campos mínimos:
ID interno.
Número de ficha.
Trimestre académico (`trimester`: VARCHAR(50), obligatorio para nuevas fichas e importaciones; backfill automático desde `notes`).
Programa de formación.
Jornada.
Modalidad.
Fecha de inicio.
Fecha de finalización.
Número de aprendices.
Estado.
Coordinación asociada.
Observaciones.
4.3 Programa de formación
Campos mínimos:
Código del programa.
Nombre del programa.
Versión.
Nivel de formación.
Duración.
Estado.
4.4 Competencia
Campos mínimos:
Código de competencia.
Nombre de competencia.
Programa asociado.
Horas asociadas.
Estado.
4.5 Resultado de Aprendizaje - RAP
Campos mínimos:
Código RAP.
Descripción.
Competencia asociada.
Horas estimadas.
Tipo: específico, básico, transversal.
Estado.
4.6 Ambiente
Campos mínimos:
Código o nombre del ambiente.
Sede.
Piso o ubicación.
Capacidad.
Tipo de ambiente.
Recursos disponibles.
Estado.
Observaciones.
Tipos de ambiente:
Físico.
Virtual.
Laboratorio.
Aula convencional.
Ambiente especializado.
Ambiente externo.
4.7 Bloque horario
Campos mínimos:
Día de la semana.
Hora de inicio.
Hora de fin.
Duración.
Jornada.
Estado.
Los bloques y subbloques deben mantenerse según la estructura definida por el cliente. La aplicación no debe modificar la duración institucional de los bloques ya establecidos.
4.8 Programación
Campos mínimos:
Instructor.
Ficha.
Programa.
Competencia.
RAP.
Ambiente.
Fecha.
Día.
Hora de inicio.
Hora de fin.
Bloque.
Subbloque.
Tipo de actividad.
Estado de programación.
Observaciones.
Usuario creador.
Fecha de creación.
Última modificación.
Estados sugeridos:
Borrador.
Validado.
Con alerta.
Bloqueado.
Aprobado.
Publicado.
Cancelado.
---
5. Reglas de negocio
5.1 Regla de carga horaria para instructores de planta
Los instructores de planta se programan normalmente con 30 horas semanales.
Sin embargo, el sistema debe permitir programar hasta 32 horas semanales como máximo.
La diferencia de hasta 2 horas adicionales debe registrarse en un bloque diferente al bloque principal de programación.
Reglas:
Hasta 30 horas: permitido sin alerta crítica.
Más de 30 y hasta 32 horas: permitido con alerta informativa.
Más de 32 horas: bloqueado.
Las 2 horas adicionales deben quedar identificadas como horas adicionales o complementarias.
La aplicación debe mostrar el total semanal del instructor en tiempo real.
Ejemplo:
```text
Instructor de planta:
Horas programadas: 30
Estado: válido

Horas programadas: 32
Estado: válido con alerta informativa

Horas programadas: 34
Estado: bloqueado
```
5.2 Regla de carga horaria para instructores contratistas
Los instructores contratistas deben cumplir la carga horaria definida en su contrato.
Regla inicial:
Si el instructor contratista tiene menos de 40 horas semanales programadas, el sistema debe generar alerta.
El sistema debe permitir identificar las horas faltantes.
El sistema debe sugerir o registrar horas adicionales para completar la carga.
Si supera 40 horas, el sistema debe generar alerta, pero no necesariamente bloquear, salvo que el cliente defina un máximo estricto.
Esta regla debe quedar parametrizable porque puede variar según contrato, mes, disponibilidad o lineamiento institucional.
5.3 Regla de cruce de instructor
Un instructor no puede estar programado en dos actividades al mismo tiempo.
El sistema debe validar:
Fecha.
Día.
Hora de inicio.
Hora de fin.
Bloque.
Subbloque.
Si existe cruce:
La programación debe bloquearse.
Debe mostrarse el conflicto exacto.
Debe indicar con qué ficha, ambiente y RAP se cruza.
5.4 Regla de cruce de ficha
Una ficha no puede tener dos eventos simultáneos para el mismo periodo de tiempo.
El sistema debe validar que una ficha no esté programada en dos actividades al mismo tiempo, especialmente cuando se trate del mismo RAP o de actividades incompatibles.
Si hay cruce:
Se bloquea la programación.
Se informa la actividad existente.
Se indica instructor, ambiente, RAP y horario en conflicto.
5.5 Regla de cruce de ambiente
Un ambiente físico no puede ser usado por dos fichas o dos instructores al mismo tiempo.
Si el ambiente ya está ocupado:
La programación debe bloquearse.
El sistema debe sugerir revisar disponibilidad.
Debe mostrarse la programación que ya ocupa el ambiente.
Para ambientes virtuales, esta regla debe ser parametrizable, porque un ambiente virtual podría permitir mayor flexibilidad dependiendo de la configuración institucional.
5.6 Regla de capacidad del ambiente
Si la cantidad de aprendices de una ficha supera la capacidad del ambiente, el sistema debe generar advertencia.
Esta regla inicialmente no debe bloquear la programación.
Ejemplo:
```text
Ficha: 35 aprendices
Ambiente: capacidad 25
Estado: advertencia

Mensaje:
La capacidad del ambiente es inferior al número de aprendices de la ficha.
```
5.7 Regla de bloques y subbloques
La aplicación debe respetar la estructura de bloques y subbloques definida por el cliente.
El sistema no debe cambiar automáticamente:
Duración de bloques.
Duración de subbloques.
Jornada.
Franjas institucionales.
Estructura base de programación.
Cualquier ajuste a bloques o subbloques debe ser realizado por un usuario autorizado.
5.8 Regla de RAP
Una programación debe estar asociada a un RAP cuando la actividad académica lo requiera.
El sistema debe validar:
Que el RAP exista.
Que el RAP pertenezca al programa de formación de la ficha.
Que el RAP esté asociado a una competencia válida.
Que la ficha pueda recibir programación sobre ese RAP.
5.9 Regla de horas ejecutadas
Las horas ejecutadas deben ser producto de la programación registrada en el sistema.
El sistema debe calcular automáticamente:
Horas programadas por instructor.
Horas programadas por ficha.
Horas programadas por RAP.
Horas programadas por ambiente.
Horas por semana.
Horas por mes.
Horas por periodo académico.
Inicialmente, “horas ejecutadas” se entenderá como horas programadas, salvo que en una fase posterior se implemente control de asistencia o ejecución real.
5.10 Regla de aprobación de excepciones
Cuando una programación incumpla una regla no crítica, el sistema debe permitir registrar una excepción.
Las excepciones deben ser aprobadas por coordinación.
Una excepción debe guardar:
Regla afectada.
Justificación.
Usuario que solicita.
Fecha de solicitud.
Usuario que aprueba.
Fecha de aprobación.
Estado.
Observaciones.
Estados de excepción:
Pendiente.
Aprobada.
Rechazada.
Anulada.
5.11 Reglas bloqueantes iniciales
Deben bloquear la programación:
Instructor con cruce horario.
Ficha con cruce horario.
Ambiente físico ocupado.
Instructor de planta con más de 32 horas semanales.
RAP no asociado al programa de la ficha.
Instructor inactivo.
Ficha inactiva.
Ambiente inactivo.
5.12 Reglas de advertencia iniciales
Deben generar alerta, pero no bloqueo:
Instructor de planta con más de 30 y hasta 32 horas.
Contratista con menos de 40 horas.
Contratista con más de 40 horas, salvo configuración contraria.
Ambiente con capacidad inferior al número de aprendices.
Programación sin observaciones en casos excepcionales.
Uso de ambiente virtual con configuración incompleta.
---
6. Módulos funcionales
6.1 Módulo de autenticación y usuarios
Debe permitir:
Inicio de sesión.
Cierre de sesión.
Recuperación de contraseña.
Gestión de usuarios.
Asignación de roles.
Control de permisos.
Roles iniciales:
Administrador.
Coordinador.
Programador.
Instructor.
Consulta.
6.2 Módulo de datos maestros
Debe permitir administrar:
Instructores.
Fichas.
Programas.
Competencias.
RAP.
Ambientes.
Jornadas.
Bloques.
Subbloques.
Tipos de contrato.
Sedes.
Coordinaciones.
6.3 Módulo de carga masiva
Debe permitir cargar información desde archivos Excel o CSV.
Cargas iniciales:
Instructores.
Fichas.
Ambientes.
Programas.
Competencias.
RAP.
Planeación base.
El sistema debe validar:
Campos obligatorios.
Duplicados.
Formato de fechas.
Formato de horas.
Relaciones inexistentes.
Errores de integridad.
La carga debe mostrar:
Registros correctos.
Registros con advertencias.
Registros rechazados.
Archivo de errores descargable.
6.4 Módulo de programación de horarios
Debe ser el módulo central de la aplicación.
Debe permitir:
Crear programación por semana.
Seleccionar ficha.
Seleccionar instructor.
Seleccionar RAP.
Seleccionar ambiente.
Seleccionar bloque y subbloque.
Validar disponibilidad.
Guardar como borrador.
Validar programación.
Enviar a aprobación.
Publicar horario.
La interfaz debe mostrar alertas en tiempo real.
6.5 Módulo de validación
Debe ejecutar reglas automáticas antes de guardar o aprobar una programación.
Validaciones mínimas:
Cruce de instructor.
Cruce de ficha.
Cruce de ambiente.
Carga semanal del instructor.
Capacidad del ambiente.
RAP válido.
Estado de entidades.
Completitud de datos.
Resultado de validación:
```text
Válido
Válido con advertencias
Bloqueado
Requiere aprobación
```
6.6 Módulo de aprobación
Debe permitir a coordinación revisar programaciones con advertencias o excepciones.
Debe permitir:
Aprobar.
Rechazar.
Solicitar ajuste.
Registrar observaciones.
Ver historial de validaciones.
Ver usuario responsable.
6.7 Módulo de consultas
Consultas mínimas:
Horario por instructor.
Horario por ficha.
Horario por ambiente.
Horario por día.
Horario por semana.
Carga horaria por instructor.
RAP programados por ficha.
Ambientes ocupados.
Alertas activas.
6.8 Módulo de reportes
Reportes iniciales:
Horario semanal por instructor.
Horario semanal por ficha.
Horario de ambientes.
Carga horaria consolidada.
Instructores con horas faltantes.
Instructores con sobrecarga.
Ambientes con sobreocupación.
Programación con excepciones.
Programación por RAP.
Formatos de exportación:
Excel.
PDF.
CSV.
6.9 Módulo de auditoría
Debe registrar:
Usuario que crea.
Usuario que modifica.
Fecha de creación.
Fecha de modificación.
Antes y después del cambio.
Entidad afectada.
Motivo del cambio, cuando aplique.
Eventos auditables:
Creación de programación.
Modificación de programación.
Eliminación lógica.
Aprobación.
Rechazo.
Carga masiva.
Cambio de reglas.
Cambio de parámetros.
---
7. Requerimientos no funcionales
7.1 Seguridad
El sistema debe implementar:
Autenticación segura.
Autorización por roles.
Contraseñas cifradas.
Protección contra inyección SQL.
Validación de entradas.
Control de sesiones.
Auditoría de cambios.
Acceso restringido por permisos.
7.2 Rendimiento
El sistema debe permitir:
Consultar horarios rápidamente.
Validar conflictos en tiempo real.
Cargar archivos de forma controlada.
Exportar reportes sin bloquear la aplicación.
Manejar múltiples usuarios concurrentes.
Objetivo inicial:
Hasta 50 usuarios concurrentes.
Validaciones de horario en menos de 2 segundos.
Exportación de reportes en menos de 30 segundos para volúmenes normales.
7.3 Escalabilidad
La arquitectura debe permitir crecimiento por módulos.
Debe poder soportar posteriormente:
Control de asistencia.
Integración con Sofia Plus, si el cliente lo autoriza.
Integración con correo institucional.
Notificaciones.
Reportes avanzados.
Dashboards.
Planeación pedagógica.
Semáforos académicos.
7.4 Mantenibilidad
El código debe organizarse de forma modular.
Se recomienda arquitectura por capas:
Presentación.
Aplicación.
Dominio.
Infraestructura.
Persistencia.
Las reglas de negocio deben quedar centralizadas y testeables, no dispersas en la interfaz.
7.5 Disponibilidad
El sistema debe estar desplegado en VPS usando Dokploy.
Debe incluir:
Contenedores Docker.
Base de datos PostgreSQL.
Backups automáticos.
Variables de entorno.
Logs centralizados.
Reinicio automático de servicios.
HTTPS mediante proxy/reverse proxy.
---
8. Arquitectura técnica propuesta
8.1 Stack recomendado
Frontend
React.
TypeScript.
Tailwind CSS.
TanStack Query.
React Hook Form.
Zod para validaciones.
FullCalendar o componente similar para visualización de horarios.
Backend
FastAPI.
Python.
SQLAlchemy o SQLModel.
Pydantic.
Alembic para migraciones.
JWT para autenticación.
Servicio de validación de reglas de negocio.
Base de datos
PostgreSQL.
Infraestructura
Docker.
Docker Compose.
Dokploy.
VPS Linux.
Nginx/Traefik según configuración de Dokploy.
Backups automáticos.
Observabilidad inicial
Logs de aplicación.
Logs de errores.
Registro de eventos críticos.
Healthcheck de backend.
Healthcheck de base de datos.
---
9. Estructura sugerida del repositorio
```text
sena-horarios/
├── apps/
│   ├── frontend/
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── backend/
│       ├── app/
│       │   ├── api/
│       │   ├── core/
│       │   ├── domain/
│       │   ├── services/
│       │   ├── repositories/
│       │   ├── models/
│       │   ├── schemas/
│       │   └── main.py
│       ├── alembic/
│       ├── tests/
│       ├── requirements.txt
│       └── Dockerfile
│
├── docs/
│   ├── SPECS.md
│   ├── TASKS.md
│   ├── ACCEPTANCE.md
│   ├── BUSINESS_RULES.md
│   └── ARCHITECTURE.md
│
├── docker-compose.yml
├── .env.example
├── README.md
└── .gitignore
```
---
10. Modelo de datos inicial
10.1 Tablas principales
```text
users
roles
user_roles

instructors
contract_types
training_programs
competencies
learning_results
groups
environments
time_blocks
time_subblocks
schedules
schedule_validations
exceptions
audit_logs
```
10.2 Tabla instructors
Campos sugeridos:
```text
id
document_type
document_number
first_name
last_name
email
phone
contract_type_id
area
specialty
weekly_base_hours
weekly_max_hours
is_active
created_at
updated_at
```
10.3 Tabla schedules
Campos sugeridos:
```text
id
instructor_id
group_id
training_program_id
competency_id
learning_result_id
environment_id
date
weekday
start_time
end_time
block_id
subblock_id
duration_hours
status
created_by
approved_by
approved_at
notes
created_at
updated_at
```
10.4 Tabla schedule_validations
Campos sugeridos:
```text
id
schedule_id
rule_code
severity
message
is_blocking
created_at
```
10.5 Tabla exceptions
Campos sugeridos:
```text
id
schedule_id
rule_code
requested_by
approved_by
status
justification
approval_notes
requested_at
approved_at
```
---
11. Motor de reglas de negocio
La aplicación debe implementar un servicio de reglas independiente del controlador HTTP.
Ejemplo conceptual:
```text
ScheduleValidationService
├── validate_instructor_overlap()
├── validate_group_overlap()
├── validate_environment_overlap()
├── validate_instructor_weekly_hours()
├── validate_environment_capacity()
├── validate_learning_result_program()
└── validate_entity_status()
```
Cada regla debe retornar:
```json
{
  "rule_code": "INSTRUCTOR_MAX_HOURS",
  "severity": "BLOCKING",
  "message": "El instructor de planta supera las 32 horas semanales permitidas.",
  "is_blocking": true
}
```
Severidades:
```text
INFO
WARNING
BLOCKING
REQUIRES_APPROVAL
```
---
12. API inicial
12.1 Autenticación
```http
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
```
12.2 Instructores
```http
GET    /api/v1/instructors
POST   /api/v1/instructors
GET    /api/v1/instructors/{id}
PUT    /api/v1/instructors/{id}
DELETE /api/v1/instructors/{id}
GET    /api/v1/instructors/{id}/weekly-load
```
12.3 Fichas
```http
GET    /api/v1/groups
POST   /api/v1/groups
GET    /api/v1/groups/{id}
PUT    /api/v1/groups/{id}
DELETE /api/v1/groups/{id}
GET    /api/v1/groups/{id}/schedule
```
12.4 Ambientes
```http
GET    /api/v1/environments
POST   /api/v1/environments
GET    /api/v1/environments/{id}
PUT    /api/v1/environments/{id}
DELETE /api/v1/environments/{id}
GET    /api/v1/environments/{id}/availability
```
12.5 Programación
```http
GET    /api/v1/schedules
POST   /api/v1/schedules
GET    /api/v1/schedules/{id}
PUT    /api/v1/schedules/{id}
DELETE /api/v1/schedules/{id}

POST   /api/v1/schedules/validate
POST   /api/v1/schedules/{id}/submit
POST   /api/v1/schedules/{id}/approve
POST   /api/v1/schedules/{id}/reject
POST   /api/v1/schedules/{id}/publish
```
12.6 Reportes
```http
GET /api/v1/reports/instructor-weekly
GET /api/v1/reports/group-weekly
GET /api/v1/reports/environment-usage
GET /api/v1/reports/instructor-load
GET /api/v1/reports/exceptions
```
12.7 Carga masiva
```http
POST /api/v1/import/instructors
POST /api/v1/import/groups
POST /api/v1/import/environments
POST /api/v1/import/learning-results
POST /api/v1/import/schedules
```
---
13. Despliegue con Dokploy
El despliegue debe realizarse en un VPS usando Dokploy.
13.1 Servicios requeridos
```text
frontend
backend
postgres
redis opcional
backup service opcional
```
13.2 Variables de entorno backend
```env
APP_ENV=production
APP_NAME=sena-horarios
SECRET_KEY=change_me
ACCESS_TOKEN_EXPIRE_MINUTES=60

DATABASE_URL=postgresql://user:password@postgres:5432/sena_horarios

CORS_ORIGINS=https://horarios.tudominio.com
LOG_LEVEL=INFO
```
13.3 Variables de entorno frontend
```env
VITE_API_URL=https://api-horarios.tudominio.com/api/v1
```
13.4 Docker Compose base
```yaml
services:
  postgres:
    image: postgres:16
    container_name: sena_horarios_postgres
    restart: always
    environment:
      POSTGRES_DB: sena_horarios
      POSTGRES_USER: sena_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - sena_network

  backend:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile
    container_name: sena_horarios_backend
    restart: always
    environment:
      DATABASE_URL: postgresql://sena_user:${POSTGRES_PASSWORD}@postgres:5432/sena_horarios
      SECRET_KEY: ${SECRET_KEY}
      APP_ENV: production
    depends_on:
      - postgres
    networks:
      - sena_network

  frontend:
    build:
      context: ./apps/frontend
      dockerfile: Dockerfile
    container_name: sena_horarios_frontend
    restart: always
    environment:
      VITE_API_URL: ${VITE_API_URL}
    depends_on:
      - backend
    networks:
      - sena_network

volumes:
  postgres_data:

networks:
  sena_network:
    driver: bridge
```
---
14. Uso de herramientas open source para construcción asistida
14.1 Rapid OS
Rapid OS se usará como herramienta de context engineering para mantener reglas, arquitectura, estándares y alcance del proyecto.
Uso previsto:
```bash
rapid init
rapid scope
rapid validate
rapid inspect-context
```
Archivos esperados:
```text
.rapid-os/
docs/SPECS.md
docs/TASKS.md
docs/ACCEPTANCE.md
docs/BUSINESS_RULES.md
```
14.2 Ponytail
Ponytail se usará como guía de eficiencia para evitar sobreingeniería y reducir código innecesario.
Uso previsto en el proyecto:
Evitar componentes frontend innecesarios.
Preferir HTML nativo cuando sea suficiente.
Reducir dependencias.
Evitar abstracciones prematuras.
Mantener formularios y vistas simples.
Evitar complejidad artificial en módulos CRUD.
14.3 CodeGraph
CodeGraph se usará para convertir el repositorio en un grafo semántico de conocimiento del código.
Uso previsto:
```bash
npx @colbymchenry/codegraph
codegraph init -i
codegraph serve --mcp
```
Beneficios esperados:
Menos lectura manual de archivos.
Mejor análisis de impacto antes de modificar código.
Navegación rápida entre servicios, modelos, endpoints y reglas.
Ayuda para refactorización controlada.
Menor consumo de tokens durante desarrollo asistido.
---
15. Flujo recomendado de construcción
Fase 1: Preparación del repositorio
```text
1. Crear repositorio Git.
2. Inicializar estructura apps/frontend y apps/backend.
3. Crear Docker Compose base.
4. Crear .env.example.
5. Crear documentación inicial.
6. Inicializar Rapid OS.
7. Inicializar CodeGraph.
8. Definir reglas de negocio en BUSINESS_RULES.md.
```
Fase 2: Backend base
```text
1. Crear proyecto FastAPI.
2. Configurar PostgreSQL.
3. Configurar SQLAlchemy/SQLModel.
4. Configurar Alembic.
5. Crear modelos principales.
6. Crear autenticación.
7. Crear roles y permisos.
8. Crear CRUD de datos maestros.
9. Crear motor de validaciones.
10. Crear pruebas unitarias de reglas.
```
Fase 3: Frontend base
```text
1. Crear proyecto React + TypeScript.
2. Configurar Tailwind.
3. Configurar rutas.
4. Crear layout principal.
5. Crear login.
6. Crear vistas CRUD.
7. Crear formularios con validación.
8. Crear vista de programación.
9. Crear vista de alertas.
10. Crear vistas de consulta.
```
Fase 4: Programación de horarios
```text
1. Crear entidad Schedule.
2. Crear formulario de programación.
3. Validar disponibilidad de instructor.
4. Validar disponibilidad de ficha.
5. Validar disponibilidad de ambiente.
6. Calcular carga horaria semanal.
7. Mostrar alertas.
8. Bloquear reglas críticas.
9. Guardar programación.
10. Enviar a aprobación.
```
Fase 5: Reportes y exportaciones
```text
1. Reporte por instructor.
2. Reporte por ficha.
3. Reporte por ambiente.
4. Reporte de carga horaria.
5. Reporte de alertas.
6. Exportación a Excel.
7. Exportación a PDF.
```
Fase 6: Despliegue
```text
1. Crear Dockerfile frontend.
2. Crear Dockerfile backend.
3. Ajustar docker-compose.yml.
4. Crear proyecto en Dokploy.
5. Configurar variables de entorno.
6. Configurar dominio.
7. Configurar HTTPS.
8. Ejecutar migraciones.
9. Crear usuario administrador.
10. Validar healthchecks.
```
---
16. Criterios de aceptación iniciales
16.1 Programación válida
Dado un instructor activo, una ficha activa, un ambiente disponible y un RAP válido, cuando el programador cree una asignación sin cruces, el sistema debe guardar la programación en estado válido.
16.2 Cruce de instructor
Dado un instructor ya programado en una fecha y hora, cuando se intente asignarlo a otra ficha en el mismo horario, el sistema debe bloquear la programación e indicar el conflicto.
16.3 Cruce de ambiente
Dado un ambiente físico ocupado, cuando se intente usar el mismo ambiente en el mismo horario, el sistema debe bloquear la programación.
16.4 Instructor de planta hasta 32 horas
Dado un instructor de planta con 30 horas programadas, cuando se agreguen 2 horas adicionales en otro bloque, el sistema debe permitir la programación y mostrar alerta informativa.
16.5 Instructor de planta con más de 32 horas
Dado un instructor de planta con 32 horas programadas, cuando se intente agregar una hora adicional, el sistema debe bloquear la programación.
16.6 Contratista con menos de 40 horas
Dado un instructor contratista con menos de 40 horas semanales, el sistema debe mostrar alerta de horas faltantes.
16.7 Capacidad de ambiente insuficiente
Dado un ambiente con capacidad menor al número de aprendices de la ficha, el sistema debe mostrar advertencia, pero permitir guardar la programación si no existe otra regla bloqueante.
16.8 RAP inválido
Dado un RAP que no pertenece al programa de la ficha, el sistema debe bloquear la programación.
---
17. Fuera de alcance para la primera versión
No se incluirá inicialmente:
Integración directa con Sofia Plus.
Control biométrico de asistencia.
Firma digital.
Nómina.
Liquidación contractual.
App móvil nativa.
Inteligencia artificial para generación automática completa de horarios.
Notificaciones automáticas por WhatsApp o correo.
Control detallado de ejecución real versus programación.
Semáforo pedagógico avanzado.
Planeación pedagógica completa.
Estos elementos pueden considerarse para fases posteriores.
---
18. Riesgos identificados
18.1 Reglas de negocio incompletas
Riesgo: algunas reglas pueden no estar completamente formalizadas.
Mitigación: mantener `BUSINESS_RULES.md` actualizado y validar cada regla con el cliente antes de implementarla.
18.2 Datos inconsistentes
Riesgo: archivos Excel con errores, duplicados o formatos distintos.
Mitigación: crear módulo de carga con validación fuerte y reporte de errores.
18.3 Cambios en lineamientos institucionales
Riesgo: reglas de horas, bloques o programación pueden cambiar.
Mitigación: parametrizar reglas críticas.
18.4 Sobrecarga funcional del MVP
Riesgo: querer incluir demasiadas funciones en la primera versión.
Mitigación: limitar MVP a datos maestros, programación, validación, aprobación y reportes básicos.
---
19. MVP recomendado
El MVP debe incluir únicamente:
Login y roles.
CRUD de instructores.
CRUD de fichas.
CRUD de ambientes.
CRUD de RAP básicos.
Programación de horarios.
Validación de cruces.
Validación de carga horaria.
Alertas y bloqueos.
Aprobación de excepciones.
Consulta por instructor, ficha y ambiente.
Exportación básica a Excel.
Despliegue en Dokploy.
---
20. Definición de terminado
Una funcionalidad se considera terminada cuando:
Tiene backend implementado.
Tiene frontend funcional.
Tiene validaciones.
Tiene pruebas mínimas.
Tiene control de errores.
Tiene permisos por rol.
Está documentada.
Funciona en entorno Docker.
Puede desplegarse en Dokploy.
Cumple los criterios de aceptación definidos.
