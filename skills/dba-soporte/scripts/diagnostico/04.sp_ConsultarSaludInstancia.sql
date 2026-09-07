CREATE OR ALTER PROCEDURE dbo.sp_ConsultarSaludInstancia
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------------
    -- 1. TOP 10 TIPOS DE ESPERA ACUMULADOS (Wait Stats)
    -- Excluye esperas benignas o de background normales del motor
    ------------------------------------------------------------------
    SELECT TOP 10
        wait_type AS [TipoEspera],
        waiting_tasks_count AS [ConteoTareas],
        CAST(wait_time_ms / 1000.0 AS DECIMAL(18,2)) AS [TiempoEsperaSegundos],
        CAST((wait_time_ms - signal_wait_time_ms) / 1000.0 AS DECIMAL(18,2)) AS [EsperaRecursoSegundos],
        CAST(signal_wait_time_ms / 1000.0 AS DECIMAL(18,2)) AS [EsperaCpuSignalSegundos],
        CASE 
            WHEN wait_type LIKE 'PAGEIOLATCH%' THEN 'Presión de I/O en disco o lectura masiva de datos'
            WHEN wait_type LIKE 'LCK%' THEN 'Contención por bloqueos entre transacciones'
            WHEN wait_type LIKE 'CX%' THEN 'Espera por paralelismo (posible costo elevado de queries)'
            WHEN wait_type = 'ASYNC_NETWORK_IO' THEN 'La aplicación o cliente procesa lento los datos devueltos'
            WHEN wait_type LIKE 'WRITELOG%' THEN 'Latencia en disco del Transaction Log (escrituras)'
            WHEN wait_type = 'SOS_SCHEDULER_YIELD' THEN 'Presión de CPU / Scheduler saturado'
            ELSE 'Revisar con DBA'
        END AS [DiagnosticoOrientativo]
    FROM sys.dm_os_wait_stats
    WHERE wait_type NOT IN (
        'CLR_SEMAPHORE', 'LAZYWRITER_SLEEP', 'RESOURCE_QUEUE', 'SLEEP_TASK',
        'SLEEP_SYSTEMTASK', 'SQLTRACE_BUFFER_FLUSH', 'WAITFOR', 'LOGMGR_QUEUE',
        'CHECKPOINT_QUEUE', 'REQUEST_FOR_DEADLOCK_SEARCH', 'XE_TIMER_EVENT',
        'BROKER_TO_FLUSH', 'BROKER_TASK_STOP', 'CLR_MANUAL_EVENT',
        'CLR_AUTO_EVENT', 'DISPATCHER_QUEUE_SEMAPHORE', 'FT_IFTS_SCHEDULER_IDLE_WAIT',
        'XE_DISPATCHER_WAIT', 'XE_DISPATCHER_JOIN', 'SQLTRACE_INCREMENTAL_FLUSH_SLEEP',
        'ONDEMAND_TASK_QUEUE', 'BROKER_EVENTHANDLER', 'SLEEP_BPOOL_FLUSH',
        'DIRTY_PAGE_POLL', 'HADR_FILESTREAM_IOMGR_IOCOMPLETION', 'SP_SERVER_DIAGNOSTICS_SLEEP',
        'QDS_PERSIST_TASK_MAIN_LOOP_SLEEP', 'QDS_ASYNC_QUEUE'
    )
      AND wait_time_ms > 0
    ORDER BY wait_time_ms DESC;

    ------------------------------------------------------------------
    -- 2. SALUD DE MEMORIA: PAGE LIFE EXPECTANCY (PLE)
    -- Cuánto tiempo (segundos) permanece una página en memoria RAM
    ------------------------------------------------------------------
    SELECT 
        object_name AS [Objeto],
        counter_name AS [Metrica],
        cntr_value AS [ValorSegundos],
        CASE 
            WHEN cntr_value < 300 THEN 'CRITICO: Presión severa de memoria RAM (Buffer Pool rotando rápido)'
            WHEN cntr_value < 1000 THEN 'MEDIO: Presión moderada de memoria'
            ELSE 'OK: Memoria saludable'
        END AS [DiagnosticoMemoria]
    FROM sys.dm_os_performance_counters
    WHERE counter_name = 'Page life expectancy'
      AND (object_name LIKE '%Buffer Manager%' OR object_name LIKE '%Buffer Node%');

    ------------------------------------------------------------------
    -- 3. ESTADO DE ESPACIO DE ARCHIVOS DE DATOS Y LOGS
    ------------------------------------------------------------------
    SELECT 
        DB_NAME(database_id) AS [BaseDatos],
        file_id AS [IdArchivo],
        name AS [NombreLogico],
        type_desc AS [TipoArchivo],
        CAST((size * 8.0) / 1024.0 AS DECIMAL(18,2)) AS [TamanoActualMB],
        CASE 
            WHEN max_size = -1 THEN 'Ilimitado / Hasta llenar disco'
            WHEN max_size = 0 THEN 'Sin crecimiento'
            ELSE CAST((max_size * 8.0) / 1024.0 AS VARCHAR(20)) + ' MB'
        END AS [TamanoMaximo],
        growth AS [Crecimiento],
        is_percent_growth AS [EsPorcentaje]
    FROM sys.master_files
    WHERE database_id > 4; -- Excluye bases de datos del sistema

    RETURN;
END;
GO
