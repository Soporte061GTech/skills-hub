-- Script: 02.chk_IndicesFaltantes.sql
-- Proposito: Consultar que indices SQL Server considera que faltan para optimizar consultas recientes.
-- Seguridad: 100% Solo Lectura

SET NOCOUNT ON;

SELECT TOP 20
    DB_NAME(mid.database_id) AS [Base de Datos],
    OBJECT_NAME(mid.object_id, mid.database_id) AS [Tabla],
    migs.avg_total_user_cost * (migs.avg_user_impact / 100.0) * (migs.user_seeks + migs.user_scans) AS [Impacto Estimado],
    migs.user_seeks AS [Busquedas del Usuario],
    migs.user_scans AS [Escaneos del Usuario],
    mid.equality_columns AS [Columnas de Igualdad],
    mid.inequality_columns AS [Columnas de Desigualdad],
    mid.included_columns AS [Columnas Incluidas],
    'CREATE INDEX IX_' + OBJECT_NAME(mid.object_id, mid.database_id) + '_Missing ON ' + mid.statement + 
    ' (' + ISNULL(mid.equality_columns, '') + 
    CASE WHEN mid.equality_columns IS NOT NULL AND mid.inequality_columns IS NOT NULL THEN ',' ELSE '' END + 
    ISNULL(mid.inequality_columns, '') + ')' + 
    ISNULL(' INCLUDE (' + mid.included_columns + ')', '') AS [Script DDL Sugerido]
FROM sys.dm_db_missing_index_group_stats AS migs
INNER JOIN sys.dm_db_missing_index_groups AS mig 
    ON migs.group_handle = mig.index_group_handle
INNER JOIN sys.dm_db_missing_index_details AS mid 
    ON mig.index_handle = mid.index_handle
WHERE mid.database_id = DB_ID() -- Filtrar por la BD actual
ORDER BY [Impacto Estimado] DESC;
