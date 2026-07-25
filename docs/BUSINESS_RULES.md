# Reglas de Negocio

## Aplicación de Programación de Horarios de Instructores — CGMLTI SENA Bogotá

## 1. Reglas generales de programación

### RN-001. Programación basada en fichas, instructores, ambientes y resultados de aprendizaje

El sistema debe permitir la creación de horarios a partir de la relación entre fichas de formación, instructores, ambientes de aprendizaje, resultados de aprendizaje, competencias, bloques horarios y subbloques definidos por la institución.

### RN-002. Conservación de bloques y subbloques institucionales

Los bloques y subbloques horarios definidos por el cliente no deben ser modificados por el sistema. La aplicación debe respetar la estructura horaria establecida para la programación académica.

### RN-003. Validación de cruces de horario

El sistema debe validar que un instructor, ficha o ambiente no sea programado en dos eventos académicos diferentes dentro del mismo bloque o subbloque horario.

### RN-004. Registro de horas programadas

Toda asignación realizada en el sistema debe generar automáticamente el cálculo de horas programadas por instructor, ficha, competencia, resultado de aprendizaje y ambiente.

### RN-005. Horas ejecutadas

Las horas ejecutadas serán calculadas a partir de la programación registrada en el aplicativo. El sistema debe permitir consultar y consolidar dichas horas como resultado de la planeación académica realizada.

---

## 2. Reglas para instructores de planta

### RN-006. Límite máximo de horas para instructores de planta

Los instructores de planta podrán ser programados hasta un máximo de treinta y dos horas semanales.

### RN-007. Distribución habitual de horas de planta

Aunque la programación frecuente para instructores de planta es de treinta horas semanales, el sistema debe permitir adicionar hasta dos horas más, siempre que estas se asignen en un bloque diferente y no generen cruces de horario.

### RN-008. Bloqueo por exceso de horas en planta

Si la programación de un instructor de planta supera las treinta y dos horas semanales, el sistema debe generar una alerta y bloquear la asignación.

### RN-009. Control visual de carga horaria de planta

El sistema debe mostrar de forma visible el total de horas asignadas al instructor de planta, indicando si se encuentra dentro del rango permitido o si está próximo a alcanzar el límite máximo.

---

## 3. Reglas para instructores contratistas

### RN-010. Carga mínima semanal para instructores contratistas

Los instructores contratistas deben tener una programación mínima de cuarenta horas semanales.

### RN-011. Alerta por carga inferior a la mínima

Si un instructor contratista tiene menos de cuarenta horas semanales programadas, el sistema debe generar una alerta indicando que existen horas pendientes por asignar.

### RN-012. Registro de horas adicionales para completar carga contractual

Cuando un instructor contratista no alcance las cuarenta horas semanales, el sistema debe permitir registrar las horas faltantes como horas adicionales, actividades complementarias o espacios pendientes de programación, según la clasificación definida por el cliente.

### RN-013. Programación superior a cuarenta horas

Si un instructor contratista supera las cuarenta horas semanales, el sistema debe generar una alerta informativa. Esta situación no debe bloquear la programación, pero debe quedar visible para revisión administrativa o de coordinación.

---

## 4. Reglas sobre fichas de formación

### RN-014. Una ficha no puede tener doble programación simultánea

Una ficha de formación no puede estar asignada a dos actividades académicas diferentes en el mismo bloque o subbloque horario.

### RN-015. Control por resultado de aprendizaje

El sistema debe validar que una ficha no tenga más de un evento académico asociado al mismo resultado de aprendizaje dentro del mismo bloque horario.

### RN-016. Asociación obligatoria con competencia y resultado de aprendizaje

Toda programación de una ficha debe estar asociada a una competencia y a uno o varios resultados de aprendizaje, de acuerdo con la planeación pedagógica definida.

### RN-017. Trazabilidad de programación por ficha

El sistema debe permitir consultar la programación de cada ficha por jornada, semana, competencia, resultado de aprendizaje, instructor y ambiente.

### RN-047. Registro obligatorio de trimestre académico en fichas de formación

Toda ficha debe registrar el trimestre académico como atributo propio (`groups.trimester`). El trimestre es obligatorio para crear o importar nuevas fichas, puede contener un trimestre individual (ej. TRIMESTRE I) o un rango (ej. TRIMESTRE I - II), y debe mostrarse cuando una ficha sea seleccionada, programada o consultada.

---

## 5. Reglas sobre ambientes de aprendizaje

### RN-018. Validación de disponibilidad del ambiente

Un ambiente de aprendizaje no puede ser asignado a más de una ficha o instructor en el mismo bloque o subbloque horario.

### RN-019. Validación de capacidad del ambiente

El sistema debe comparar la capacidad del ambiente con el número de aprendices de la ficha asignada.

### RN-020. Alerta por capacidad insuficiente

Si la capacidad del ambiente es inferior al número de aprendices de la ficha, el sistema debe generar una advertencia. Esta advertencia no debe bloquear la programación, pero debe quedar visible para revisión del coordinador o responsable de programación.

### RN-021. Consulta de ocupación de ambientes

El sistema debe permitir consultar la ocupación de ambientes por día, semana, jornada, ficha e instructor.

---

## 6. Reglas de alertas y validaciones

### RN-022. Alertas bloqueantes

El sistema debe bloquear la programación cuando se presenten situaciones críticas, tales como:

- Cruce de horario de un instructor.
- Cruce de horario de una ficha.
- Cruce de horario de un ambiente.
- Exceso de treinta y dos horas semanales en instructores de planta.
- Programación duplicada de una ficha en el mismo bloque o subbloque.

### RN-023. Alertas informativas

El sistema debe permitir continuar la programación, pero generar una advertencia visible, en casos como:

- Instructor contratista con menos de cuarenta horas semanales.
- Instructor contratista con más de cuarenta horas semanales.
- Ambiente con capacidad inferior al número de aprendices.
- Horas pendientes por completar.
- Inconsistencias menores en la planeación.

### RN-024. Visualización de alertas

Las alertas deben presentarse de forma clara al usuario, indicando la causa, el elemento afectado y la posible acción correctiva.

---

## 7. Reglas de excepciones

### RN-025. Aprobación de excepciones

Las excepciones a las reglas de programación deben ser aprobadas por el coordinador o usuario autorizado.

### RN-026. Registro de justificación

Toda excepción aprobada debe registrar una justificación, el usuario que la aprueba, la fecha y la hora de aprobación.

### RN-027. Trazabilidad de excepciones

El sistema debe conservar el historial de excepciones para auditoría, seguimiento y revisión posterior.

---

## 8. Reglas de roles y permisos

### RN-028. Rol administrador

El administrador podrá gestionar usuarios, parámetros generales, catálogos maestros, reglas de validación y configuración del sistema.

### RN-029. Rol coordinador

El coordinador podrá crear, revisar, ajustar y aprobar la programación de horarios, así como gestionar excepciones y validar alertas.

### RN-030. Rol programador académico

El programador académico podrá registrar horarios, consultar disponibilidad de instructores, fichas y ambientes, y atender las alertas generadas por el sistema.

### RN-031. Rol consulta

El usuario con rol de consulta podrá visualizar horarios, reportes y consolidado de horas, sin modificar la información registrada.

---

## 9. Reglas de reportes y consultas

### RN-032. Reporte por instructor

El sistema debe permitir generar reportes de programación por instructor, incluyendo horas semanales, fichas asignadas, competencias, resultados de aprendizaje, ambientes y alertas asociadas.

### RN-033. Reporte por ficha

El sistema debe permitir consultar el horario consolidado de cada ficha, discriminado por semana, jornada, competencia, resultado de aprendizaje, instructor y ambiente.

### RN-034. Reporte por ambiente

El sistema debe permitir consultar la ocupación de ambientes, identificando disponibilidad, cruces, capacidad y fichas asignadas.

### RN-035. Reporte de alertas

El sistema debe permitir generar un reporte de alertas bloqueantes, alertas informativas y excepciones aprobadas.

### RN-036. Exportación de información

El sistema debe permitir exportar los horarios y reportes en formatos definidos por el cliente, tales como Excel o PDF.

---

## 10. Reglas de auditoría y trazabilidad

### RN-037. Registro de cambios

Toda modificación realizada sobre una programación debe quedar registrada con usuario, fecha, hora, cambio realizado y valor anterior.

### RN-038. Historial de programación

El sistema debe conservar el historial de versiones o modificaciones de los horarios, permitiendo identificar ajustes realizados durante el proceso de planeación.

### RN-039. Trazabilidad por usuario

El sistema debe permitir identificar qué usuario creó, modificó, aprobó o eliminó una programación.

---

## 11. Reglas de parametrización

### RN-040. Parámetros configurables

El sistema debe permitir configurar parámetros institucionales como:

- Tipos de instructor.
- Jornadas.
- Bloques y subbloques.
- Ambientes.
- Programas de formación.
- Fichas.
- Competencias.
- Resultados de aprendizaje.
- Límites de horas por tipo de instructor.
- Tipos de alerta.
- Roles y permisos.

### RN-041. Reglas ajustables por administración

Las reglas operativas que puedan cambiar por lineamientos institucionales deberán ser parametrizables por un usuario administrador, evitando modificaciones directas en el código fuente.

---

## 12. Reglas de integridad de datos

### RN-042. Datos obligatorios para programar

Para crear una programación, el sistema debe exigir como mínimo:

- Instructor.
- Tipo de contrato del instructor.
- Ficha.
- Programa de formación.
- Competencia.
- Resultado de aprendizaje.
- Ambiente.
- Día.
- Bloque o subbloque horario.
- Número de horas.

### RN-043. No duplicidad de registros maestros

El sistema debe evitar la duplicidad de instructores, fichas, ambientes, competencias y resultados de aprendizaje.

### RN-044. Validación de datos antes de guardar

Antes de guardar una programación, el sistema debe ejecutar las validaciones de negocio correspondientes y mostrar las alertas o bloqueos aplicables.

---

## 13. Regla de prioridad del sistema

### RN-045. Prioridad de validaciones

El sistema debe priorizar las validaciones bloqueantes sobre las informativas. Ninguna programación debe guardarse si incumple una regla bloqueante, salvo que exista un flujo formal de excepción aprobado por el coordinador.

---

## 14. Regla de consistencia institucional

### RN-046. Alineación con la planeación académica

Toda programación registrada en el sistema debe estar alineada con la planeación pedagógica, los resultados de aprendizaje, las competencias del programa de formación y los lineamientos institucionales definidos por el SENA.
