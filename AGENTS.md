# AGENTS.md - Schedule Stack

"Este proyecto tiene mcp CodeGraph inicializado"

## Uso obligatorio de skills y MCPs

- Para cualquier tarea de codigo, aplica por defecto las reglas del modo Ponytail y la skill de `ponytail`.
- Cuando el trabajo involucre backend o APIs, ten en cuenta la skill `fastapi`.
- Cuando el trabajo involucre interfaz de usuario, experiencia visual o diseño, ten en cuenta la skill `frontend-design`.
- Para refactorizaciones, limpieza o auditorias de complejidad, considera usar `ponytail-review` y `ponytail-audit`.
- Para tareas que involucren seguridad, privacidad, autenticacion, secretos, permisos o validaciones, ten en cuenta la skill `security-best-practices`.
- En cambios que afecten auth, permisos, manejo de secretos, entradas de usuario o datos sensibles, revisa seguridad antes de considerar el trabajo como terminado.
- Para exploracion de codigo, prioriza el MCP de CodeGraph antes de buscar manualmente.
- Para consultas o inspeccion de base de datos, usa el MCP de Postgres.
- Para depuracion de interfaces web, usa el MCP de Chrome DevTools.
- Para tareas que requieran assets o contenido visual asistido, usa el MCP de Stitch solo cuando sea necesario.

## Regla principal de exploracion

- Usa `codegraph_explore` como herramienta PRINCIPAL para cualquier tarea de exploracion de codigo.
- Si `codegraph_explore` no esta disponible, usa el CLI local `codegraph.cmd` antes de caer a busquedas manuales:
  - `codegraph.cmd status .`
  - `codegraph.cmd index .`
  - `codegraph.cmd query ...` o `codegraph.cmd context ...` cuando aplique.
- NO vuelvas a leer archivos para los cuales CodeGraph ya devolvio codigo fuente. Los fragmentos fuente son completos y autoritativos.
- Solo recurre a `rg`, glob o lectura directa para archivos listados bajo "Archivos relevantes adicionales", para Markdown no indexado por CodeGraph, o si CodeGraph no arrojo resultados.

## Fuente de verdad del proyecto

Lee y respeta primero:

1. `PROJECT_CONTEXT.md`
2. `docs/BUSINESS_RULES.md`
3. `docs/PRD.md`
4. `docs/SPECS.md`

No escribas codigo de dominio sin haber revisado PRD, reglas de negocio, specs tecnicos y criterios de aceptacion existentes.

## Jerarquia documental

Si existe conflicto entre documentos, aplica esta prioridad:

1. Reglas de negocio.
2. PRD.
3. Specs tecnicos.
4. Modelo de datos y API descritos en specs.
5. Criterios de aceptacion.
6. Documentacion auxiliar.

## Stack del proyecto

- Frontend: React, TypeScript, Tailwind CSS.
- Estado/datos frontend: TanStack Query.
- Formularios/validacion frontend: React Hook Form y Zod.
- Calendario: FullCalendar o componente equivalente.
- Backend: FastAPI, Python, Pydantic.
- Persistencia: PostgreSQL con SQLAlchemy o SQLModel.
- Migraciones: Alembic.
- Autenticacion: JWT.
- Infraestructura: Docker, Docker Compose, Dokploy en VPS.
- Proxy: Nginx o Traefik segun Dokploy.
- Documentacion: Markdown.
- Versionamiento: Git/GitHub.

## Arquitectura

- Tipo: frontend y backend desacoplados.
- Frontend: consumidor de API REST.
- Backend: proveedor FastAPI.
- Base de datos: PostgreSQL separada.
- El frontend nunca accede directamente a la base de datos.
- Los contratos TypeScript deben reflejar los DTO del backend.
- Las reglas de negocio deben estar centralizadas en servicios de validacion, no dispersas en la UI.

## Reglas criticas del dominio

- No generar ni guardar horarios sin validar disponibilidad de instructor.
- No generar ni guardar horarios sin validar disponibilidad de ambiente.
- No permitir solapamiento de eventos para un mismo instructor.
- No permitir solapamiento de eventos para una misma ficha.
- No permitir doble uso simultaneo de un ambiente fisico.
- No permitir que una ficha tenga eventos simultaneos incompatibles ni RAP duplicado en el mismo bloque.
- Instructor de planta: normalmente 30 horas semanales, maximo 32. Mas de 32 bloquea.
- Las 2 horas adicionales de planta deben ir identificadas en bloque diferente o como complementarias.
- Instructor contratista: carga esperada minima de 40 horas semanales. Menos de 40 alerta, no bloqueo.
- Contratista con mas de 40 horas genera alerta informativa, salvo configuracion contraria.
- Ambiente con capacidad inferior al numero de aprendices genera advertencia, no bloqueo.
- RAP invalido o no asociado al programa de la ficha bloquea.
- Entidades inactivas bloquean programacion.
- Las horas ejecutadas inicialmente son producto de la programacion registrada.
- Las excepciones deben ser aprobadas por coordinacion y dejar trazabilidad.

## Reglas de construccion

- MVP primero: funcionalidad validada > perfeccion.
- YAGNI: no agregues abstracciones, capas o dependencias que no hagan falta ahora.
- Usa libreria estandar, plataforma nativa o dependencia ya instalada antes de crear codigo propio.
- Pruebas minimas solo en logica critica: reglas de programacion, auth, permisos, integridad y validaciones.
- Comentarios solo para logica compleja.
- Tipos estrictos donde aporten; no bloquees avance por tipado ceremonial.
- Mantener diffs pequenos y acotados al pedido.

<!-- BEGIN PONYTAIL DEFAULT -->
# Ponytail Default Mode

Actua como un senior developer perezoso en el buen sentido: eficiente, no descuidado. Para cualquier tarea de codigo, aplica por defecto este orden:

1. Si no necesita existir, no lo construyas; dilo brevemente.
2. Si la standard library lo resuelve, usala.
3. Si la plataforma nativa lo resuelve, usala antes que una dependencia.
4. Si ya hay una dependencia instalada que lo resuelve, usala antes de crear otra abstraccion.
5. Si puede ser una linea clara y correcta, hazlo en una linea.
6. Solo entonces implementa el minimo codigo que funciona.

Evita abstracciones no pedidas, factories de una sola implementacion, capas especulativas, boilerplate y dependencias nuevas innecesarias. Prefiere borrar a agregar. Manten el diff pequeno.

No recortes: validacion en fronteras de confianza, seguridad, manejo de errores que evite perdida de datos, accesibilidad, tests minimos para logica no trivial, ni nada que el usuario pidio explicitamente.

Si el usuario dice "normal mode" o "stop ponytail", deja de aplicar Ponytail en esa conversacion.
<!-- END PONYTAIL DEFAULT -->
