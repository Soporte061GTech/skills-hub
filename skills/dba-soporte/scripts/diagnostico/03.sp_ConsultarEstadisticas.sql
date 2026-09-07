CREATE OR ALTER PROCEDURE dbo.sp_ConsultarEstadisticas
(
    @Tabla SYSNAME = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        Esquema             = SCHEMA_NAME(t.schema_id),
        Tabla               = t.name,
        Estadistica         = s.name,
        FechaActualizacion  = sp.last_updated,
        Filas               = sp.rows,
        FilasMuestreadas    = sp.rows_sampled,
        Modificaciones      = sp.modification_counter,
        PorcentajeCambio =
            CAST(
                CASE
                    WHEN sp.rows > 0
                    THEN (sp.modification_counter * 100.0) / sp.rows
                    ELSE 0
                END
            AS DECIMAL(18,2)),
        Recomendacion =
            CASE
                WHEN sp.rows = 0 THEN 'SIN DATOS'
                WHEN ((sp.modification_counter * 100.0) / sp.rows) > 20
                    THEN 'ACTUALIZAR'
                WHEN ((sp.modification_counter * 100.0) / sp.rows) BETWEEN 10 AND 20
                    THEN 'EVALUAR'
                ELSE 'NO REQUIERE'
            END
    FROM sys.tables t
        INNER JOIN sys.stats s
            ON t.object_id = s.object_id
        CROSS APPLY sys.dm_db_stats_properties
        (
            s.object_id,
            s.stats_id
        ) sp
    WHERE
        @Tabla IS NULL
        OR t.name = @Tabla
    ORDER BY
        PorcentajeCambio DESC,
        Tabla,
        Estadistica;
END
GO