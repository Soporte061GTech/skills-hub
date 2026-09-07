CREATE PROCEDURE dbo.sp_ConsultarFragmentacionIndices
(
    @Tabla SYSNAME = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        OBJECT_NAME(IDX.OBJECT_ID) AS Tabla,
        IDX.name AS Indice,
        IDXPS.index_type_desc AS Tipo_Indice,
        CAST(IDXPS.avg_fragmentation_in_percent AS DECIMAL(10,2)) AS Porcentaje_Fragmentacion,
        CASE
            WHEN IDXPS.avg_fragmentation_in_percent < 10 THEN 'Sin acción'
            WHEN IDXPS.avg_fragmentation_in_percent BETWEEN 10 AND 30 THEN 'Reorganizar índice'
            ELSE 'Reconstruir índice'
        END AS Recomendacion
    FROM sys.dm_db_index_physical_stats
    (
        DB_ID(),
        NULL,
        NULL,
        NULL,
        'LIMITED'
    ) IDXPS
    INNER JOIN sys.indexes IDX
        ON IDX.object_id = IDXPS.object_id
        AND IDX.index_id = IDXPS.index_id
    WHERE IDX.name IS NOT NULL
      AND (@Tabla IS NULL OR OBJECT_NAME(IDX.OBJECT_ID) = @Tabla)
    ORDER BY Porcentaje_Fragmentacion DESC;
END;
GO