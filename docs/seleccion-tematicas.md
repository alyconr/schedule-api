# Seleccion de tematicas por RAP

La seccion **Seleccion de Tematicas** permite consultar y marcar tematicas asociadas a un Resultado de Aprendizaje
RAP. Esta relacion sale del importador de semaforos relacionales, que reconstruye el vinculo RAP / tematica usando el
mismo contexto, el mismo trimestre y el mismo color de fondo.

## Origen de datos

El flujo esperado es:

1. Importar el Excel normalizado RAP / Tematicas desde **Carga Masiva** con el tipo `semaforos_relacional`.
2. El backend crea o actualiza `learning_results`, `topics` y la tabla puente `learning_result_topics`.
3. Entrar a **Seleccion de Tematicas**.
4. Filtrar por tipo de oferta, trimestre y RAP.
5. Seleccionar una o varias tematicas y revisar el resumen de horas.

## Tipos de oferta

`oferta_abierta` corresponde a **Oferta abierta**.

`cadena` corresponde a **Oferta cerrada / cadena de formacion**.

Cuando el usuario filtra por `oferta_cerrada`, el sistema consulta relaciones guardadas como `oferta_cerrada` y como
`cadena`, porque los semaforos de oferta cerrada pueden venir con el contexto de cadena de formacion.

## Filtro por trimestre

El trimestre se almacena como numero (`1`, `2`, `3`, etc.) en `learning_result_topics.trimester_number`.
La pantalla muestra esos valores como **Trimestre 1**, **Trimestre 2**, etc.

## Revision manual

Una relacion con `needs_manual_review = true` se puede seleccionar, pero aparece marcada con **Revisar relacion**.
Esto indica que el importador detecto un bloque de color ambiguo, por ejemplo varios RAP y varias tematicas en el mismo
grupo.

La confianza se interpreta asi:

- `alta`: relacion directa importada sin ambiguedad relevante.
- `media`: relacion usable, pero conviene revisarla antes de programar.

## Endpoints

`GET /api/v1/topics/selection-options` devuelve tipos de oferta, trimestres y RAP disponibles para poblar filtros.

`GET /api/v1/topics/selection` devuelve las tematicas relacionadas y acepta:

- `program_scope`
- `trimester_number`
- `learning_result_id`
- `search`
