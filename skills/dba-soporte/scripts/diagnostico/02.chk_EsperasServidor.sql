-- Script: 02.chk_EsperasServidor.sql
-- Proposito: Identificar los cuellos de botella globales del servidor desde el ultimo reinicio (Wait Stats)
-- Seguridad: 100% Solo Lectura

SET NOCOUNT ON;

WITH Waits AS
(
    SELECT 
        wait_type, 
        wait_time_ms / 1000.0 AS WaitS,
        (wait_time_ms - signal_wait_time_ms) / 1000.0 AS ResourceS,
        signal_wait_time_ms / 1000.0 AS SignalS,
        waiting_tasks_count AS WaitCount,
        100.0 * wait_time_ms / SUM (wait_time_ms) OVER() AS Percentage,
        ROW_NUMBER() OVER(ORDER BY wait_time_ms DESC) AS RowNum
    FROM sys.dm_os_wait_stats
    WHERE wait_type NOT IN (
        'CLR_SEMAPHORE', 'LAZYWRITER_SLEEP', 'RESOURCE_QUEUE', 'SLEEP_TASK',
        'SLEEP_SYSTEMTASK', 'SQLTRACE_BUFFER_FLUSH', 'WAITFOR', 'LOGMGR_QUEUE',
        'CHECKPOINT_QUEUE', 'REQUEST_FOR_DEADLOCK_SEARCH', 'XE_TIMER_EVENT',
        'BROKER_TO_FLUSH', 'BROKER_TASK_STOP', 'CLR_MANUAL_EVENT',
        'CLR_AUTO_EVENT', 'DISPATCHER_QUEUE_SEMAPHORE', 'FT_IFTS_SCHEDULER_IDLE_WAIT',
        'XE_DISPATCHER_WAIT', 'XE_DISPATCHER_JOIN', 'BROKER_EVENTHANDLER',
        'TRACEWRITE', 'FT_IFTSHC_MUTEX', 'SQLTRACE_INCREMENTAL_FLUSH_SLEEP',
        'BROKER_RECEIVE_WAITFOR', 'ONDEMAND_TASK_QUEUE', 'DBMIRROR_EVENTS_QUEUE',
        'DBMIRRORING_CMD', 'BROKER_TRANSMITTER', 'SQLTRACE_WAIT_ENTRIES',
        'SLEEP_BPOOL_FLUSH', 'SQLTRACE_LOCK'
    )
)
SELECT 
    W1.wait_type AS [Tipo de Espera],
    CAST (W1.WaitS AS DECIMAL(16, 2)) AS [Espera Total (Segundos)],
    CAST (W1.ResourceS AS DECIMAL(16, 2)) AS [Espera Recurso (Segundos)],
    CAST (W1.SignalS AS DECIMAL(16, 2)) AS [Espera CPU (Segundos)],
    W1.WaitCount AS [Conteo de Esperas],
    CAST (W1.Percentage AS DECIMAL(5, 2)) AS [Porcentaje (%)]
FROM Waits AS W1
WHERE W1.Percentage > 1.0 -- Mostrar solo las que representen mas del 1%
ORDER BY W1.Percentage DESC;
