CREATE OR ALTER PROCEDURE dbo.sp_ConsultarDeadlocksRecientes
(
    @HorasAtras INT = 24
)
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------------
    -- Extrae los reportes de Deadlock del búfer de anillo de
    -- Extended Events (sesión predeterminada system_health)
    -- Procedimiento 100% de solo lectura y bajo impacto.
    ------------------------------------------------------------------
    DECLARE @TargetSessionXml XML;

    SELECT @TargetSessionXml = CAST(target_data AS XML)
    FROM sys.dm_xe_session_targets st
    INNER JOIN sys.dm_xe_sessions s 
        ON s.address = st.event_session_address
    WHERE s.name = 'system_health'
      AND st.target_name = 'ring_buffer';

    IF @TargetSessionXml IS NULL
    BEGIN
        SELECT 'No se encontró la sesión system_health o el target ring_buffer activo.' AS Mensaje;
        RETURN;
    END;

    SELECT 
        XEvent.value('@timestamp', 'DATETIME2') AS [FechaHoraUTC],
        XEvent.query('.') AS [DeadlockGraphXml]
    FROM @TargetSessionXml.nodes('//RingBufferTarget/event[@name=xml_deadlock_report]') AS TargetNodes(XEvent)
    WHERE XEvent.value('@timestamp', 'DATETIME2') >= DATEADD(HOUR, -@HorasAtras, SYSUTCDATETIME())
    ORDER BY [FechaHoraUTC] DESC;

    RETURN;
END;
GO
