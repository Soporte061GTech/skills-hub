# Ejemplo 1: Consulta Lenta (Procedimiento Demo)

## Escenario
El usuario de soporte reporta:
> Tenemos una consulta en la vista w_DetalleFacturacion que para un solo cliente tarda 14 segundos en devolver 1 registro. Comparto los datos y el STATISTICS IO.

`sql
-- Consulta ejecutada:
SELECT FacturaID, MontoTotal, FechaEmision 
FROM dbo.vw_DetalleFacturacion 
WHERE YEAR(FechaEmision) = 2024 AND ClienteID = 98412 
ORDER BY FechaEmision DESC;
`

**Salida de STATISTICS IO compartida:**
`	ext
Table 'Facturacion'. Scan count 1, logical reads 482000, physical reads 120, read-ahead reads 0.
Table 'Clientes'. Scan count 1, logical reads 15, physical reads 0.
SQL Server Execution Times:
   CPU time = 13800 ms,  elapsed time = 14120 ms.
`

## Respuesta esperada del Agente (Aplicando la Skill)

# Reporte de Diagnóstico — DBA de Soporte

## 1. Conclusión Ejecutiva
La consulta tarda ~14 segundos para devolver 1 registro debido a que realiza un escaneo completo de la tabla Facturacion (482,000 lecturas lógicas). La cláusula YEAR(FechaEmision) = 2024 impide que SQL Server utilice los índices existentes sobre la fecha (no sargable), forzando a evaluar cada registro de la tabla uno por uno.

## 2. ¿Qué está ocurriendo?
SQL Server recibe la consulta y, al encontrarse con la función YEAR() sobre la columna FechaEmision, no puede realizar una búsqueda puntual por rango de índice (*Index Seek*). Debe leer las 482,000 páginas de datos de la tabla Facturacion, calcular en memoria el año de cada fecha y filtrar por ClienteID. Además, realiza un ordenamiento en memoria/TempDB para resolver el ORDER BY FechaEmision DESC.

## 3. Análisis de Evidencia
- **Filas procesadas vs Filas devueltas:** Procesa cientos de miles de registros (482,000 lecturas lógicas) para entregar 1 sola fila.
- **Sargabilidad:** YEAR(FechaEmision) = 2024 destruye la capacidad de búsqueda directa.
- **Consumo de CPU:** 13.8 segundos de CPU dedicada a evaluar la función fila por fila.

## 4. Clasificación del Diagnóstico Preliminar
- **Categoría:** PROBLEMA DE CONSULTA (Predicado no sargable).
- **Nivel de Confianza:** ALTO (Evidencia directa de lecturas lógicas masivas y predicado no indexable).

## 5. Acciones Recomendadas y Propuestas

### Para el Ejecutivo / Soporte Nivel 1:
- Probar la consulta modificando el filtro de fechas para usar un rango sargable en lugar de la función YEAR().

### Para el DBA / Administrador (PROPUESTA PARA VALIDACIÓN DEL DBA):
- **Ajuste en la consulta:** Reescribir el predicado a:
  `sql
  SELECT FacturaID, MontoTotal, FechaEmision 
  FROM dbo.vw_DetalleFacturacion 
  WHERE FechaEmision >= '2024-01-01' AND FechaEmision < '2025-01-01'
    AND ClienteID = 98412 
  ORDER BY FechaEmision DESC;
  `
- **Índice sugerido (si no existe ya uno similar):**
  - **Tabla:** dbo.Facturacion
  - **Columnas Clave:** (ClienteID, FechaEmision DESC)
  - **Columnas Incluidas (INCLUDE):** (FacturaID, MontoTotal)
  - **Objetivo:** Permitir *Index Seek* compuesto y eliminar la operación de *Sort*.

## 6. Información Faltante
- Plan de ejecución real (.sqlplan) para verificar si existe ya un índice por ClienteID y confirmar si la vista contiene joins internos costosos.
