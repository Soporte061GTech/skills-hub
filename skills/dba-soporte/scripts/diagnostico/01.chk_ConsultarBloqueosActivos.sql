-- Script: 01.chk_ConsultarBloqueosActivos.sql
-- Proposito: Identificar sesiones bloqueadas y la sesion raiz (Head Blocker)
-- Seguridad: 100% Solo Lectura (DMVs inofensivas)

SET NOCOUNT ON;

SELECT 
    t1.resource_type AS [Tipo Recurso],
    t1.resource_database_id AS [DB ID],
    t1.resource_associated_entity_id AS [ID Entidad],
    t1.request_mode AS [Modo Bloqueo],
    t1.request_session_id AS [Sesion Bloqueada (Victima)],
    t2.blocking_session_id AS [Sesion Raiz (Culpable)],
    r.command AS [Comando Victima],
    r.status AS [Estado Victima],
    r.wait_time AS [Tiempo Espera (ms)],
    r.wait_type AS [Tipo Espera],
    DB_NAME(t1.resource_database_id) AS [Base de Datos]
FROM sys.dm_tran_locks AS t1
INNER JOIN sys.dm_os_waiting_tasks AS t2 
    ON t1.lock_owner_address = t2.resource_address
LEFT JOIN sys.dm_exec_requests AS r 
    ON t1.request_session_id = r.session_id
WHERE t1.request_status = 'WAIT';
