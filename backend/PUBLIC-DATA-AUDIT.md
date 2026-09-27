# Revisión de visibilidad y relaciones — 2026-09-25 UTC

## Causa y corrección aplicada

Los importadores anteriores asignaban IDs `creature.*`, `region.*` y
`sighting.source-*`. Sanity trata los puntos como separadores de rutas y excluye
estos documentos del acceso anónimo, incluso en un dataset público.
Referencia: https://www.sanity.io/docs/content-lake/ids

Se migraron 75 documentos en una transacción: 29 criaturas, 17 regiones y 29
sightings. Los IDs nuevos son UUID; la identidad del importador queda en
`importSourceId`. Se reescribieron las referencias, conservando el contenido y
las imágenes. La transacción fue `FEAYqiLxg7DwRFaW54Lloa`.

La copia previa de documentos e IDs está en el directorio local ignorado por Git
`backend/.local-backups/`, archivo
`public-document-ids-2026-09-25T04-15-47-209Z.json`.
Los documentos nuevos tienen nuevas fechas de sistema e historial; la copia
conserva los valores previos. No se publica ni se incorpora el respaldo al repositorio.

| Entidad | Acceso público antes | Acceso público después | Autenticado después |
| --- | ---: | ---: | ---: |
| Criaturas | 15 | 44 | 44 |
| Regiones | 25 | 42 | 42 |
| Sightings | 28 | 57 | 57 |

## Comprobaciones realizadas

- Las consultas exactas de `CreatureArchive.tsx`, sin token, devuelven 44 criaturas
  y 57 sightings; todos los sightings resuelven su criatura y su región.
- No hay referencias entre documentos rotas, incluyendo `corroboratedBy`.
- Las 29 criaturas importadas tienen un sighting asociado cada una.
- La comparación recursiva con el respaldo no detectó diferencias de contenido,
  exceptuando IDs, referencias, metadatos de importación y fechas/revisión del sistema.
- Ambos importadores se ejecutaron nuevamente sin crear registros adicionales.
- Una nueva ejecución de la migración en modo lectura no encontró documentos pendientes.
- La URL pública del bestiario responde HTTP 200. La comprobación del frontend se
  hizo mediante sus consultas/API, sin inspección visual de un navegador.

La página carga Sanity desde el navegador; la corrección de contenido está activa
sin otro despliegue de Vercel. Una pestaña abierta necesita recargarse para volver
a consultar las criaturas. Los cambios de importadores y esquemas están en el
repositorio local; esta intervención no desplegó una nueva versión del Studio.

## Pendientes de calidad de datos

- Bigfoot / Sasquatch no tiene imagen asociada ni archivo con `bigfoot` o
  `sasquatch` en su nombre en `backend/images` al momento de la revisión.
- Siete criaturas no tienen `regions[]`: Dama Blanca / White Lady, Íncubo y
  Súcubo, Espíritu Inteligente / Interactivo, Ánima Sola, El Cuco / El Coco,
  Shadow People (Gente de Sombra) / Hat Man y Doppelgänger. Sus sightings sí
  tienen región. La región de una recopilación bibliográfica no equivale
  automáticamente al origen folclórico de una criatura.
- Puerto Rico tiene `centroid.lat: 1815`, fuera del rango válido. No se sustituyó
  por una coordenada supuesta durante esta reparación.
- Los 29 registros nuevos incluyen 13 de folclore, 6 de prensa, 4 testimoniales,
  4 historias de casos y 2 textos históricos. No son 29 avistamientos
  presenciales verificados. El frontend del bestiario no muestra todavía los
  campos `accountType`, `dateBasis`, `locationPrecision` y fuentes, aunque
  existen en estos documentos.

## Reutilización

Desde `backend`, con `.env` configurado:

```powershell
node scripts/migrate-public-document-ids.mjs
# Sólo si se detectan documentos pendientes y se desea aplicar:
node scripts/migrate-public-document-ids.mjs --apply
```

Los importadores corregidos buscan por `importSourceId`, resuelven los IDs
actuales de sus referencias y dejan que Sanity genere los IDs de documentos
nuevos. El script de migración guarda respaldo antes de escribir y protege las
revisiones de los documentos afectados dentro de la transacción.
