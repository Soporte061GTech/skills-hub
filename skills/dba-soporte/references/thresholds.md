# Umbrales de referencia — SQL Server 2019+

Estos umbrales están tomados directamente de los stored procedures de diagnóstico
en `scripts/diagnostico/`. Úsalos para asignar severidad (🔴 Alta / 🟡 Media / 🟢 Baja u OK)
a cada hallazgo. Si el usuario comparte un dato que no calza con ninguna categoría de
abajo, dilo explícitamente en vez de forzarlo a un umbral — no inventes un valor.

## Fragmentación de índices — `sp_ConsultarFragmentacionIndices`

| avg_fragmentation_in_percent | Severidad | Acción |
|---|---|---|
| < 10% | 🟢 OK | Sin acción |
| 10% – 30% | 🟡 Media | `ALTER INDEX ... REORGANIZE` |
| > 30% | 🔴 Alta | `ALTER INDEX ... REBUILD` (usar `WITH (ONLINE = ON)` si la edición lo soporta, para no bloquear la tabla) |

Nota: el SP usa modo `LIMITED` (rápido, aproximado). Si el usuario necesita precisión
en índices pequeños, sugiere `SAMPLED` o `DETAILED`, aclarando que es más costoso.

## Estadísticas desactualizadas — `sp_ConsultarEstadisticas`

| % de filas modificadas desde la última actualización | Severidad | Acción |
|---|---|---|
| < 10% | 🟢 OK | No requiere |
| 10% – 20% | 🟡 Media | Evaluar — depende de qué tan sensible es esa tabla a cardinalidad |
| > 20% | 🔴 Alta | `UPDATE STATISTICS ... WITH FULLSCAN` (o `WITH SAMPLE` en tablas muy grandes) |

Importante: actualiza solo las tablas que superen el umbral, no todas por igual —
un `FULLSCAN` sobre una tabla grande que no lo necesita desperdicia I/O y CPU.

## Bloqueos y sesiones suspendidas — `sp_MonitoreoSQL 'BLOQUEOS'` / `'SUSPENDIDAS'`

Basado en `wait_time` (ms) de la sesión bloqueada:

| wait_time | Severidad |
|---|---|
| ≥ 300,000 ms (5 min) | 🔴 Crítico |
| ≥ 60,000 ms (1 min) | 🟠 Alto |
| ≥ 10,000 ms (10 s) | 🟡 Medio |
| < 10,000 ms | 🟢 Normal |

Para `sp_MonitoreoSQL 'RESUMEN_BLOQUEOS'`, la cantidad de sesiones bloqueadas por una
misma sesión bloqueadora también escala la severidad: ≥10 = Crítico, ≥5 = Alto, ≥2 = Medio.

**Limitación conocida:** esto detecta bloqueos *activos en el momento de correr el
script*. No captura deadlocks ya resueltos — para eso se necesitaría leer la sesión de
Extended Events `system_health` (`xml_deadlock_report`), que hoy no está entre los
scripts disponibles. Si el usuario pregunta específicamente por deadlocks históricos,
acláraselo y ofrece ayudarlo a armar esa consulta si la necesita.

## Queries costosas por duración — `sp_MonitoreoSQL 'LENTAS'`

Tiempo promedio de ejecución (`total_elapsed_time / execution_count`):

| Tiempo promedio | Severidad |
|---|---|
| ≥ 15 s | 🔴 Crítico |
| ≥ 5 s | 🟠 Alto |
| ≥ 2 s | 🟡 Medio |
| < 2 s | 🟢 Normal |

## Queries costosas por CPU — `sp_MonitoreoSQL 'CPU'` y `'TOP_PROBLEMAS'`

CPU total acumulada (`total_worker_time`, convertida a segundos):

| CPU acumulada | Severidad |
|---|---|
| ≥ 300 s | 🔴 Crítico |
| ≥ 100 s | 🟠 Alto |
| ≥ 30 s | 🟡 Medio |
| < 30 s | 🟢 Normal |

Este umbral se unificó a segundos absolutos en ambas ramas del SP (antes la rama `CPU`
usaba % relativo del plan cache, lo que podía clasificar la misma consulta de forma
distinta según el modo consultado — ya corregido en el `.sql`). La columna
`PorcentajeCPU` se conserva como dato informativo adicional, pero no decide la severidad.

## Queries costosas por lecturas lógicas — `sp_MonitoreoSQL 'LECTURAS'` y `'TOP_PROBLEMAS'`

| Lecturas lógicas totales | Severidad |
|---|---|
| ≥ 100,000,000 | 🔴 Crítico |
| ≥ 10,000,000 | 🟠 Alto |
| ≥ 1,000,000 | 🟡 Medio |
| < 1,000,000 | 🟢 Normal |

## Estado general de la instancia — `sp_MonitoreoSQL 'RESUMEN'`

Combina bloqueos activos, sesiones suspendidas, mayor espera y conteo de consultas
lentas/CPU/lecturas en un solo `EstadoGeneral`: CRÍTICO / ALTO / MEDIO / NORMAL. Úsalo
como punto de entrada rápido cuando el usuario solo pega la salida de `'RESUMEN'` o
`'ALERTAS'` sin haber corrido las consultas detalladas — de ahí decides si hace falta
pedirle el detalle (`'LENTAS'`, `'BLOQUEOS'`, etc.).

## Limitaciones a tener en cuenta al interpretar cualquiera de estos datos

- `sys.dm_exec_query_stats` (usado por `LENTAS`, `CPU`, `LECTURAS`, `TOP_PROBLEMAS`) se
  reinicia cuando el plan sale del plan cache o el servicio se reinicia. Si el usuario
  reportó un reinicio reciente, los datos "históricos" solo cubren esa ventana corta —
  acláralo en el reporte para no sobre-interpretar un servidor recién reiniciado como
  "sano".
- Estos umbrales son puntos de partida razonables para una instancia genérica, no
  están calibrados contra el hardware específico del usuario. Si el usuario menciona
  que su servidor es notablemente más grande/pequeño de lo normal, dilo como matiz en
  el reporte en vez de aplicar el umbral a ciegas.
- Ninguno de estos scripts mide `Page Life Expectancy`, tipos de espera a nivel de
  instancia (`sys.dm_os_wait_stats`) ni presión de memoria/tempdb. Si el usuario
  pregunta por eso, acláralo como fuera del alcance actual de los scripts disponibles
  en vez de inventar un umbral.
