# PRD — Aplicación para Programación de Horarios de Instructores

## Centro de Gestión de Mercados, Logística y Tecnologías de la Información — SENA Bogotá

---

## 1. Resumen del producto

La aplicación tiene como propósito permitir la **planeación, creación, validación, ajuste y consulta de horarios de instructores, fichas de formación, ambientes y resultados de aprendizaje**, de acuerdo con las reglas operativas del CGMLTI SENA Bogotá.

El sistema debe facilitar la construcción de horarios evitando cruces, validando la carga horaria de los instructores, alertando inconsistencias y generando una programación organizada, consultable y exportable.

La solución busca reemplazar o complementar los procesos manuales actuales de programación, reduciendo errores, duplicidades y reprocesos administrativos.

---

## 2. Objetivo general

Desarrollar una aplicación web que permita gestionar la programación semanal de instructores y fichas de formación, aplicando reglas de negocio institucionales para controlar disponibilidad, carga horaria, asignación de ambientes, bloques formativos, RAP, competencias y restricciones operativas del centro.

---

## 3. Objetivos específicos

1. Permitir el cargue y administración de instructores.
2. Permitir el cargue y administración de fichas de formación.
3. Permitir la gestión de competencias, resultados de aprendizaje, temáticas o actividades formativas.
4. Permitir la asignación de horarios por bloques y subbloques.
5. Validar cruces entre instructor, ficha, ambiente y franja horaria.
6. Controlar la carga horaria semanal según el tipo de vinculación del instructor.
7. Generar alertas cuando una programación incumpla o esté cercana a incumplir una regla.
8. Permitir excepciones controladas, aprobadas por coordinación.
9. Permitir consultar, filtrar y exportar la programación.
10. Generar trazabilidad sobre cambios, ajustes y aprobaciones.

---

## 4. Usuarios del sistema

### 4.1 Administrador del sistema

Usuario encargado de configurar parámetros generales, usuarios, roles, catálogos y reglas base del sistema.

### 4.2 Coordinador académico

Usuario con permisos para revisar la programación, aprobar excepciones, validar cargas horarias y hacer seguimiento general.

### 4.3 Programador de horarios

Usuario encargado de crear y ajustar los horarios de instructores, fichas, ambientes y bloques de formación.

### 4.4 Instructor

Usuario que puede consultar su horario asignado, sus ambientes, fichas, competencias o actividades programadas.

### 4.5 Usuario de consulta

Usuario con permisos limitados para visualizar horarios, reportes o información consolidada sin modificar datos.

---

## 5. Alcance funcional

La aplicación deberá permitir:

- Registrar instructores.
- Clasificar instructores por tipo de vinculación.
- Registrar fichas de formación.
- Registrar programas de formación.
- Registrar competencias.
- Registrar resultados de aprendizaje.
- Registrar ambientes.
- Registrar jornadas.
- Registrar bloques y subbloques de programación.
- Crear horarios semanales.
- Asignar instructor a ficha, RAP, ambiente y franja horaria.
- Validar disponibilidad del instructor.
- Validar disponibilidad del ambiente.
- Validar simultaneidad de ficha.
- Validar carga horaria semanal.
- Generar alertas por incumplimientos o riesgos.
- Permitir aprobación de excepciones.
- Exportar horarios.
- Consultar horarios por instructor, ficha, ambiente, programa, jornada o semana.
- Registrar historial de cambios.

---

## 6. Fuera de alcance inicial

Para la primera versión no se contempla:

- Nómina.
- Liquidación de pagos.
- Gestión contractual completa.
- Integración directa con SOFIA Plus.
- Control biométrico de asistencia.
- Generación automática completa sin intervención humana.
- Inteligencia artificial para optimización automática de horarios.
- Aplicación móvil nativa.
- Firma digital de horarios.
- Reportes financieros.

Estos elementos podrán evaluarse como fases posteriores.

---

## 7. Entidades principales del sistema

### 7.1 Instructor

Datos mínimos requeridos:

- Nombre completo.
- Número de documento.
- Correo institucional.
- Teléfono.
- Tipo de vinculación.
- Especialidad o área de conocimiento.
- Competencias que puede orientar.
- Disponibilidad horaria.
- Estado activo/inactivo.

### 7.2 Tipo de vinculación

Ejemplos:

- Instructor de planta.
- Instructor contratista.
- Otro tipo definido por el centro.

Cada tipo de vinculación puede tener reglas de carga horaria diferentes.

### 7.3 Ficha de formación

Datos mínimos:

- Número de ficha.
- Trimestre académico.
- Programa de formación.
- Jornada.
- Número de aprendices.
- Estado.
- Fecha de inicio.
- Fecha de finalización.
- Competencias asociadas.
- Resultados de aprendizaje asociados.

### 7.4 Programa de formación

Datos mínimos:

- Nombre del programa.
- Código del programa.
- Nivel de formación.
- Duración.
- Competencias asociadas.

### 7.5 Competencia

Datos mínimos:

- Código de competencia.
- Nombre de competencia.
- Programa asociado.
- Resultados de aprendizaje relacionados.

### 7.6 Resultado de Aprendizaje — RAP

Datos mínimos:

- Código o identificador del RAP.
- Descripción del RAP.
- Competencia asociada.
- Horas requeridas.
- Estado de ejecución.

### 7.7 Ambiente

Datos mínimos:

- Nombre o código del ambiente.
- Sede.
- Capacidad máxima.
- Tipo de ambiente.
- Recursos disponibles.
- Estado activo/inactivo.

### 7.8 Horario

Datos mínimos:

- Instructor.
- Ficha.
- Programa.
- Competencia.
- RAP.
- Ambiente.
- Día.
- Hora inicial.
- Hora final.
- Bloque.
- Subbloque.
- Jornada.
- Estado de programación.
- Observaciones.
- Usuario que creó o modificó el registro.

---

## 8. Reglas de negocio

### RN-01. Carga horaria de instructores de planta

Los instructores de planta tendrán una programación base frecuente de hasta **30 horas semanales**.

El sistema deberá permitir programar hasta **32 horas semanales como máximo**, siempre que las horas adicionales se registren en un bloque separado o claramente identificable.

Si se intenta superar las **32 horas semanales**, el sistema debe bloquear la programación y mostrar una alerta.

### RN-02. Carga horaria de instructores contratistas

Los instructores contratistas deben tener una carga mínima esperada de **40 horas semanales**.

Si la programación queda por debajo de 40 horas, el sistema debe generar una alerta indicando las horas faltantes.

El sistema debe permitir adicionar las horas restantes como horas adicionales o pendientes de completar.

Si la programación supera las 40 horas, el sistema debe generar una alerta, pero no necesariamente bloquear la programación. La decisión final podrá quedar sujeta a revisión de coordinación.

### RN-03. Bloques y subbloques

La programación se debe realizar mediante bloques y subbloques de tiempo previamente definidos.

Las horas de los bloques y subbloques no deben modificarse arbitrariamente durante la programación.

Cualquier ajuste estructural a bloques o subbloques deberá realizarse desde una configuración administrativa.

### RN-04. Cruce de instructor

Un instructor no puede estar programado en dos actividades diferentes en la misma fecha y franja horaria.

Si existe cruce, el sistema debe bloquear la asignación.

### RN-05. Cruce de ambiente

Un ambiente no puede estar asignado a dos fichas o actividades diferentes en la misma fecha y franja horaria.

Si existe cruce, el sistema debe bloquear la asignación.

### RN-06. Simultaneidad por ficha

Una ficha no puede tener dos eventos formativos simultáneos asociados al mismo bloque horario.

La ficha solo debe tener una programación activa por franja de tiempo, salvo que exista una excepción previamente aprobada.

### RN-07. Programación por RAP

La programación debe permitir asociar cada bloque horario a un Resultado de Aprendizaje específico.

El sistema debe controlar que la ficha no tenga duplicidad simultánea de RAP en el mismo bloque.

### RN-08. Capacidad del ambiente

Si la cantidad de aprendices de una ficha supera la capacidad del ambiente asignado, el sistema debe generar una advertencia.

Esta advertencia no debe bloquear la programación de forma automática, pero debe quedar visible para revisión del programador o coordinador.

### RN-09. Horas ejecutadas

Las horas ejecutadas deben derivarse de la programación registrada en el sistema.

El sistema debe permitir consultar las horas programadas y ejecutadas por instructor, ficha, RAP, competencia y periodo.

### RN-10. Excepciones

Las excepciones a reglas de programación deben ser autorizadas por un coordinador.

Toda excepción debe registrar:

- Regla afectada.
- Justificación.
- Usuario solicitante.
- Usuario aprobador.
- Fecha de aprobación.
- Observaciones.

### RN-11. Estado de programación

Cada registro de horario debe manejar estados como:

- Borrador.
- Programado.
- En revisión.
- Aprobado.
- Rechazado.
- Cancelado.
- Modificado.

### RN-12. Trazabilidad

Toda modificación de horario debe quedar registrada en una bitácora.

La bitácora debe incluir:

- Usuario que realizó el cambio.
- Fecha y hora.
- Campo modificado.
- Valor anterior.
- Valor nuevo.
- Motivo del cambio, cuando aplique.

### RN-13. Validación de disponibilidad

El sistema debe validar la disponibilidad del instructor antes de permitir la asignación.

La disponibilidad puede depender de:

- Jornada.
- Día de la semana.
- Tipo de vinculación.
- Restricciones personales o institucionales.
- Horarios previamente asignados.

### RN-14. Consulta por diferentes criterios

El sistema debe permitir consultar la programación por:

- Instructor.
- Ficha.
- Ambiente.
- Programa.
- Competencia.
- RAP.
- Jornada.
- Semana.
- Mes.
- Estado.

### RN-15. Exportación

El sistema debe permitir exportar la programación en formatos de uso operativo, como Excel o PDF.

---

## 9. Requerimientos funcionales

### RF-01. Gestión de instructores

El sistema debe permitir crear, editar, consultar, activar e inactivar instructores.

### RF-02. Gestión de fichas

El sistema debe permitir crear, editar, consultar, importar, visualizar el trimestre, activar e inactivar fichas de formación.

### RF-03. Gestión de programas

El sistema debe permitir administrar programas de formación y asociarlos con competencias y RAP.

### RF-04. Gestión de competencias y RAP

El sistema debe permitir registrar competencias y resultados de aprendizaje, relacionándolos con programas y fichas.

### RF-05. Gestión de ambientes

El sistema debe permitir administrar ambientes, capacidad, sede, tipo de ambiente y disponibilidad.

### RF-06. Gestión de disponibilidad

El sistema debe permitir registrar disponibilidad de instructores y ambientes.

### RF-07. Creación de horarios

El sistema debe permitir crear horarios seleccionando:

- Semana o periodo.
- Día.
- Bloque horario.
- Instructor.
- Ficha.
- Ambiente.
- Competencia.
- RAP.
- Jornada.

### RF-08. Validaciones automáticas

Al crear o modificar una programación, el sistema debe validar automáticamente:

- Cruce de instructor.
- Cruce de ambiente.
- Cruce de ficha.
- Carga horaria del instructor.
- Capacidad del ambiente.
- Asociación válida entre ficha, programa, competencia y RAP.

### RF-09. Alertas

El sistema debe mostrar alertas cuando:

- Un instructor de planta se acerque o supere las horas permitidas.
- Un contratista tenga menos de 40 horas.
- Un contratista supere las 40 horas.
- El ambiente no tenga capacidad suficiente.
- Exista un posible conflicto de programación.
- Falten datos obligatorios para completar la programación.

### RF-10. Bloqueo de reglas críticas

El sistema debe bloquear acciones cuando:

- Se supere el máximo permitido para instructor de planta.
- Exista cruce de instructor.
- Exista cruce de ambiente.
- Exista cruce de ficha no autorizado.
- Se intente guardar una programación incompleta.

### RF-11. Aprobación de excepciones

El sistema debe permitir que un programador solicite una excepción y que un coordinador la apruebe o rechace.

### RF-12. Consulta de horarios

El sistema debe permitir consultar horarios mediante filtros dinámicos.

### RF-13. Exportación de horarios

El sistema debe permitir exportar los horarios filtrados en Excel y PDF.

### RF-14. Historial de cambios

El sistema debe registrar cambios relevantes en la programación.

### RF-15. Gestión de usuarios y roles

El sistema debe permitir crear usuarios y asignar roles con permisos diferenciados.

---

## 10. Requerimientos no funcionales

### RNF-01. Aplicación web

La solución debe ser una aplicación web accesible desde navegador.

### RNF-02. Seguridad

El sistema debe contar con autenticación de usuarios y control de permisos por rol.

### RNF-03. Trazabilidad

Toda acción crítica debe quedar registrada en logs o bitácora funcional.

### RNF-04. Escalabilidad

La arquitectura debe permitir crecer en número de instructores, fichas, ambientes y periodos académicos.

### RNF-05. Disponibilidad

La aplicación debe estar disponible para los usuarios administrativos durante los horarios definidos por el centro.

### RNF-06. Usabilidad

La interfaz debe ser clara, con filtros, vistas tipo calendario o tabla, alertas visibles y formularios comprensibles.

### RNF-07. Exportabilidad

Los reportes y horarios deben poder descargarse para uso administrativo.

### RNF-08. Despliegue

La aplicación será desplegada usando **Dokploy** sobre un servidor VPS.

### RNF-09. Mantenibilidad

El sistema debe organizarse en módulos claros para facilitar ajustes futuros en reglas de negocio, entidades y reportes.

### RNF-10. Auditoría

Las acciones sobre horarios, excepciones y cambios críticos deben poder auditarse posteriormente.

---

## 11. Módulos del sistema

### 11.1 Módulo de autenticación

Permite ingreso seguro al sistema mediante usuario y contraseña.

### 11.2 Módulo de usuarios y roles

Permite administrar usuarios y permisos.

### 11.3 Módulo de instructores

Permite gestionar la información de instructores y su disponibilidad.

### 11.4 Módulo de fichas

Permite gestionar fichas de formación, programas, jornadas y número de aprendices.

### 11.5 Módulo académico

Permite gestionar programas, competencias y RAP.

### 11.6 Módulo de ambientes

Permite gestionar ambientes, capacidades, sedes y disponibilidad.

### 11.7 Módulo de programación

Permite crear, modificar, validar y aprobar horarios.

### 11.8 Módulo de alertas

Permite visualizar advertencias, errores y reglas incumplidas.

### 11.9 Módulo de excepciones

Permite solicitar, revisar, aprobar o rechazar excepciones.

### 11.10 Módulo de reportes

Permite consultar y exportar información de horarios.

### 11.11 Módulo de auditoría

Permite revisar cambios realizados en el sistema.

---

## 12. Flujo principal de programación

1. El usuario inicia sesión.
2. Selecciona el periodo o semana a programar.
3. Selecciona la ficha de formación.
4. Selecciona el RAP o actividad formativa.
5. Selecciona el instructor.
6. Selecciona el ambiente.
7. Selecciona día y bloque horario.
8. El sistema ejecuta validaciones automáticas.
9. Si no existen errores, permite guardar la programación.
10. Si existen advertencias, permite guardar o solicitar revisión según la regla.
11. Si existen errores bloqueantes, impide guardar.
12. El horario queda en estado borrador, programado o en revisión.
13. El coordinador puede revisar y aprobar cuando aplique.
14. El horario queda disponible para consulta y exportación.

---

## 13. Criterios de aceptación generales

### CA-01

El sistema debe impedir que un instructor esté programado en dos actividades simultáneas.

### CA-02

El sistema debe impedir que un ambiente sea usado por dos fichas simultáneamente.

### CA-03

El sistema debe alertar cuando una ficha tenga un posible cruce de programación.

### CA-04

El sistema debe permitir programar instructores de planta hasta 32 horas semanales como máximo.

### CA-05

El sistema debe alertar cuando un instructor contratista tenga menos de 40 horas semanales.

### CA-06

El sistema debe permitir visualizar la carga horaria semanal acumulada por instructor.

### CA-07

El sistema debe mostrar advertencia cuando la capacidad del ambiente sea inferior al número de aprendices de la ficha.

### CA-08

El sistema debe permitir exportar horarios por instructor, ficha y ambiente.

### CA-09

El sistema debe registrar en bitácora los cambios realizados sobre horarios.

### CA-10

El sistema debe permitir que coordinación apruebe o rechace excepciones.

---

## 14. Reportes requeridos

El sistema deberá permitir generar reportes de:

- Horario por instructor.
- Horario por ficha.
- Horario por ambiente.
- Carga horaria semanal por instructor.
- Horas por RAP.
- Horas por competencia.
- Ambientes ocupados.
- Ambientes disponibles.
- Instructores con carga incompleta.
- Instructores con sobrecarga.
- Excepciones aprobadas.
- Cambios realizados en la programación.

---

## 15. Datos iniciales requeridos para implementación

Para iniciar la configuración del sistema se requiere contar con:

1. Listado de instructores.
2. Tipo de vinculación de cada instructor.
3. Disponibilidad horaria de instructores.
4. Listado de fichas activas.
5. Programas de formación asociados a cada ficha.
6. Competencias por programa.
7. RAP por competencia.
8. Horas requeridas por RAP.
9. Listado de ambientes.
10. Capacidad de cada ambiente.
11. Jornadas manejadas por el centro.
12. Definición oficial de bloques y subbloques.
13. Reglas específicas de aprobación por coordinación.
14. Formatos actuales de horario.
15. Reportes que actualmente utiliza el centro.

---

## 16. Riesgos identificados

### Riesgo 1: Reglas incompletas o cambiantes

Las reglas de programación pueden variar según coordinación, programa o periodo.

**Mitigación:** permitir parametrización de reglas y manejo de excepciones.

### Riesgo 2: Datos iniciales inconsistentes

Los archivos actuales pueden tener nombres duplicados, fichas incompletas o RAP mal relacionados.

**Mitigación:** incluir validaciones durante el cargue de información.

### Riesgo 3: Resistencia al cambio

Los usuarios pueden estar acostumbrados a hojas de cálculo.

**Mitigación:** diseñar una interfaz sencilla, con exportación a Excel y vistas similares a la operación actual.

### Riesgo 4: Excepciones frecuentes

Si muchas reglas requieren excepción, el sistema podría volverse difícil de operar.

**Mitigación:** clasificar reglas entre bloqueantes, advertencias y aprobaciones.

### Riesgo 5: Falta de integración con sistemas externos

Si la información oficial reside en otros sistemas, puede existir doble digitación.

**Mitigación:** permitir cargue inicial por Excel y preparar la arquitectura para futuras integraciones.

---

## 17. Supuestos

1. El centro entregará la información base en archivos estructurados.
2. Las reglas de carga horaria serán validadas por coordinación antes del desarrollo final.
3. La programación se realizará por semanas o periodos definidos.
4. Los bloques y subbloques serán definidos previamente.
5. Las excepciones serán aprobadas únicamente por usuarios autorizados.
6. El sistema no reemplaza inicialmente los sistemas institucionales oficiales.
7. La primera versión prioriza la programación, validación y consulta de horarios.

---

## 18. Preguntas pendientes de validación

1. ¿Cuál será el formato oficial de cargue inicial de instructores?
2. ¿Cuál será el formato oficial de cargue de fichas?
3. ¿Los RAP se deben cargar manualmente o desde un archivo maestro?
4. ¿La programación se realizará semanal, mensual o por periodo académico?
5. ¿Qué usuarios podrán aprobar excepciones?
6. ¿Qué reglas deben ser bloqueantes y cuáles solo informativas?
7. ¿Se requiere vista tipo calendario, tabla o ambas?
8. ¿El instructor podrá consultar únicamente su horario o también reportar novedades?
9. ¿Se requiere registrar novedades como cancelaciones, incapacidades o cambios de ambiente?
10. ¿Qué formato exacto debe tener la exportación final?
11. ¿Se requiere conservar histórico por trimestre, semestre o vigencia anual?
12. ¿El sistema debe manejar varias sedes?
13. ¿Existen ambientes virtuales o únicamente físicos?
14. ¿Cómo se manejarán las horas adicionales de instructores de planta?
15. ¿Qué datos deben considerarse obligatorios para aprobar una programación?

---

## 19. Criterio de éxito del producto

El producto será exitoso si permite crear y consultar la programación de horarios reduciendo cruces, inconsistencias y reprocesos, garantizando que las reglas principales de carga horaria, disponibilidad, ambientes, fichas y RAP sean validadas automáticamente antes de aprobar la programación.

---

## 20. Versión mínima viable — MVP

La primera versión debe incluir:

1. Inicio de sesión.
2. Gestión de instructores.
3. Gestión de fichas.
4. Gestión de ambientes.
5. Gestión de programas, competencias y RAP.
6. Creación manual de horarios.
7. Validación de cruces.
8. Validación de carga horaria.
9. Alertas.
10. Consulta por instructor, ficha y ambiente.
11. Exportación básica.
12. Bitácora de cambios.
13. Aprobación básica de excepciones por coordinación.

---

## 21. Fases sugeridas de implementación

### Fase 1 — Configuración base

- Usuarios y roles.
- Catálogos principales.
- Instructores.
- Fichas.
- Ambientes.
- Programas, competencias y RAP.

### Fase 2 — Programación de horarios

- Creación de horarios.
- Bloques y subbloques.
- Validaciones básicas.
- Alertas.

### Fase 3 — Reglas avanzadas

- Carga horaria por tipo de vinculación.
- Excepciones.
- Trazabilidad.
- Reportes.

### Fase 4 — Exportaciones y mejoras operativas

- Exportación a Excel/PDF.
- Vistas consolidadas.
- Filtros avanzados.
- Ajustes de usabilidad.

### Fase 5 — Integraciones futuras

- Integración con sistemas institucionales.
- Cargues masivos.
- Tableros analíticos.
- Automatización avanzada.

---

## 22. Conclusión

La aplicación debe funcionar como una herramienta centralizada para planear, validar y consultar horarios de instructores del CGMLTI SENA Bogotá. Su valor principal está en aplicar reglas de negocio de manera automática, evitar cruces, controlar cargas horarias y entregar información confiable para instructores, programadores y coordinación académica.
