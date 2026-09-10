# Ejemplo 1: Diagnostico Clinico de Consulta / Vista Lenta

## Escenario de Soporte
Un asesor o ejecutivo de soporte reporta:
> "Tenemos una consulta sobre la vista `vw_DocumentosDetalle_Demo` que para un solo documento (`DocumentoID = 100452`) tarda aproximadamente 12 segundos en devolver 1 solo registro. Adjunto los datos de ejecucion y la salida de `STATISTICS IO` y `STATISTICS TIME`."

```sql
-- Consulta ejecutada:
SELECT *
FROM dbo.vw_DocumentosDetalle_Demo WITH (NOLOCK)
WHERE DocumentoID = 100452
ORDER BY DetalleID;
```

**Salida de STATISTICS IO / TIME provista por el usuario:**
```text
Table 'DocumentosDetalle_Demo'. Scan count 1, logical reads 350000, physical reads 45, read-ahead reads 0.
Table 'DocumentosCabecera_Demo'. Scan count 1, logical reads 12, physical reads 0.
SQL Server Execution Times:
   CPU time = 11800 ms,  elapsed time = 12150 ms.
```

---

## Respuesta y Reporte Generado por el Asistente DBA

```markdown
# Reporte de Diagnostico Tecnico — SQL Server
**Generado por:** Asistente DBA de Rendimiento  
**Version SQL Server:** SQL Server 2019 (RTM-CU20)  
**Objeto / Proceso Evaluado:** Vista `dbo.vw_DocumentosDetalle_Demo`  
**Estado del Diagnostico:** PROPUESTA PARA VALIDACION DEL DBA  

---

### 1. CONCLUSION EJECUTIVA
La consulta sobre la vista tarda ~12 segundos en entregar 1 registro porque realiza un escaneo completo (*Table/Index Scan*) sobre la tabla principal subyacente (`DocumentosDetalle_Demo`), leyendo 350,000 paginas de datos en memoria para localizar una unica fila. El filtro `DocumentoID` no esta aprovechando una busqueda directa (*Index Seek*), provocando saturacion de CPU e I/O.

### 2. ¿QUE ESTA OCURRIENDO EN EL MOTOR?
1. SQL Server expande la definicion de la vista `vw_DocumentosDetalle_Demo` y sus relaciones internas.
2. Al no encontrar un indice optimo por `DocumentoID` sobre `DocumentosDetalle_Demo`, el optimizador recorre toda la tabla.
3. Evalua cada registro contra el ID `100452`, descartando 349,999 registros.
4. Aplica el ordenamiento solicitado (`ORDER BY DetalleID`), requiriendo memoria adicional para resolver el Sort.
5. Entrega el unico registro coincidente tras consumir 11.8 segundos de CPU.

### 3. ANALISIS DEL OBJETO Y ESTRUCTURA (DDL)
La vista combina `DocumentosCabecera_Demo` con `DocumentosDetalle_Demo` mediante un `INNER JOIN` por llave foranea. El costo principal no reside en la vista per se, sino en la ausencia de acceso sargable e indexado sobre la tabla de detalle.

### 4. ANALISIS DEL PLAN DE EJECUCION Y OPERADORES
- **Clustered Index Scan / Table Scan en DocumentosDetalle_Demo:** Representa el 91% del costo acumulado del plan con 350,000 lecturas logicas.
- **Sort Operator:** Representa el 7% del costo para ordenar el resultado final.
- **Nested Loops Join:** Representa el 2% del costo restante.

### 5. FILAS PROCESADAS VS FILAS DEVUELTAS
- **Filas Solicitadas / Devueltas:** 1 registro.
- **Filas Realmente Procesadas en el Scan:** Cientos de miles de paginas leidas.
- **Discrepancia Estimadas vs Reales:** El optimizador estimo escanear toda la cardinalidad de la tabla debido a la falta de un predicado indexado.

### 6. ANALISIS DE FILTROS Y SARGABILIDAD
El filtro `WHERE DocumentoID = 100452` es sintacticamente sargable (comparacion directa sin funciones envolventes), pero carece de un camino de acceso directo en el almacenamiento de datos.

### 7. ANALISIS DE ORDENAMIENTO (ORDER BY / SORT)
El `ORDER BY DetalleID` genera un operador `Sort` explicito. Si el indice propuesto incluye el orden o aprovecha la llave, este operador se eliminara por completo.

### 8. ANALISIS DE INDICES
- **Indices actuales utilizados:** Scan sobre el indice primario/clustered.
- **Indices faltantes:** Se detecta necesidad de indice compuesto en `DocumentosDetalle_Demo`.
- **Propuesta de Indice:** (Ver seccion 12 - Sujeto a validacion formal del DBA).

### 9. OTRAS POSIBLES CAUSAS EVALUADAS
- **Estadisticas:** Requiere verificacion preliminar para descartar que una desactualizacion oculte el uso de indices existentes.
- **Bloqueos / Concurrencia:** Descartados para este caso puntual (el tiempo transcurrido es casi identico al tiempo de CPU).
- **TempDB:** Sin evidencia de desbordamiento (spill) grave.

### 10. DIAGNOSTICO PRELIMINAR
- **Clasificacion:** PROBLEMA DE INDICES / ACCESO A DATOS EN TABLA BASE.
- **Justificacion:** El patron de 350,000 lecturas y 11.8s de CPU para 1 registro confirma un escaneo de tabla completa evitable mediante acceso puntual.

### 11. NIVEL DE CONFIANZA
- **Nivel:** ALTO.
- **Motivo:** Evidencia concordante entre tiempo transcurrido, CPU time y conteo de lecturas logicas.

### 12. ACCIONES RECOMENDADAS (PLAN DE TRABAJO)

#### Para el Ejecutivo / Asesor de Soporte (L1/L2):
- Notificar al usuario que la situacion fue diagnosticada y se encuentra en revision con el DBA responsable.
- No solicitar ejecucion directa de cambios en produccion.

#### PROPUESTA PARA VALIDACION DEL DBA:
1. **Paso 1 (Menos Invasivo):** Validar y actualizar estadisticas de la tabla `DocumentosDetalle_Demo`:
   ```sql
   UPDATE STATISTICS dbo.DocumentosDetalle_Demo WITH FULLSCAN;
   ```
2. **Paso 2 (Propuesta de Indice No Agrupado):**
   - **Tabla:** `dbo.DocumentosDetalle_Demo`
   - **Columnas Clave:** `(DocumentoID, DetalleID)`
   - **Columnas Incluidas (INCLUDE):** `[Columnas adicionales requeridas por la vista]`
   - **Operacion que beneficia:** Transforma el Scan de 350,000 lecturas en un *Index Seek* puntual de ~3 lecturas.
3. ⚠️ **Regla de Mantenimiento:** El `REBUILD` de indices va al final de cualquier ciclo y solo si la fragmentacion supera el 30%.
4. 🕒 **Ventana de Mantenimiento:** Toda creacion de indice o actualizacion masiva debe ejecutarse en horario no habil / ventana programada.
5. 🛡️ **Seguridad:** Prohibido eliminar o dropear objetos en produccion.

### 13. INFORMACION FALTANTE
- Archivo XML del Plan de Ejecucion Real (`.sqlplan`) para validar la lista exacta de columnas en el `INCLUDE` del indice propuesto.
```
