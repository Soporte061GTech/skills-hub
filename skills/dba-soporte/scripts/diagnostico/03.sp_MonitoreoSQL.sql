ALTER PROCEDURE dbo.sp_MonitoreoSQL
(
    @Tipo VARCHAR(30)
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TipoNormalizado VARCHAR(30) = UPPER(LTRIM(RTRIM(@Tipo)));

    ------------------------------------------------------
    -- 1. CONSULTAS SUSPENDIDAS
    ------------------------------------------------------
    IF @TipoNormalizado = 'SUSPENDIDAS'
    BEGIN

        SELECT
            r.session_id AS IdSesion,
            s.login_name AS Usuario,
            DB_NAME(r.database_id) AS BaseDatos,
            r.status AS Estado,
            r.command AS Comando,
            r.wait_type AS TipoEspera,
            r.wait_time AS TiempoEsperaMs,
            CAST(r.wait_time / 1000.0 AS DECIMAL(18,2)) AS TiempoEsperaSegundos,
            r.blocking_session_id AS SesionBloqueadora,
            r.cpu_time AS CpuMs,
            r.total_elapsed_time AS TiempoTotalMs,

            CASE
                WHEN r.wait_time >= 300000 THEN 'CRITICO'
                WHEN r.wait_time >= 60000 THEN 'ALTO'
                WHEN r.wait_time >= 10000 THEN 'MEDIO'
                ELSE 'NORMAL'
            END AS Severidad,

            CASE
                WHEN r.wait_type LIKE 'LCK%' THEN 'Bloqueo'
                WHEN r.wait_type LIKE 'PAGEIO%' THEN 'Lectura de Disco'
                WHEN r.wait_type LIKE 'CX%' THEN 'Paralelismo'
                WHEN r.wait_type = 'ASYNC_NETWORK_IO'
                    THEN 'Cliente no consume resultados'
                WHEN r.wait_type IS NULL THEN 'Ejecutando'
                ELSE 'Revisar con DBA'
            END AS Diagnostico,

            t.text AS ConsultaSQL

        FROM sys.dm_exec_requests r
        INNER JOIN sys.dm_exec_sessions s
            ON r.session_id = s.session_id
        OUTER APPLY sys.dm_exec_sql_text(r.sql_handle) t

        WHERE r.session_id > 50
          AND r.status = 'suspended'

        ORDER BY r.wait_time DESC;

        RETURN;
    END;


    ------------------------------------------------------
    -- 2. CONSULTAS HISTORICAMENTE MAS LENTAS
    ------------------------------------------------------
    IF @TipoNormalizado = 'LENTAS'
    BEGIN

        SELECT TOP 50

            ISNULL(DB_NAME(CONVERT(INT, pa.value)), 'DESCONOCIDA') AS BaseDatos,

            qs.execution_count AS VecesEjecutada,

            CAST(qs.total_elapsed_time / 1000000.0
                AS DECIMAL(18,2)) AS TiempoTotalHistoricoSeg,

            CAST(qs.max_elapsed_time / 1000000.0
                AS DECIMAL(18,2)) AS TiempoMaximoHistoricoSeg,

            CAST(
                (qs.total_elapsed_time * 1.0 /
                 NULLIF(qs.execution_count, 0))
                / 1000000.0
                AS DECIMAL(18,2)
            ) AS TiempoPromedioSeg,

            CAST(
                qs.total_worker_time * 1.0 /
                NULLIF(qs.execution_count, 0)
                / 1000000.0
                AS DECIMAL(18,2)
            ) AS CpuPromedioSeg,

            qs.total_logical_reads AS LecturasLogicas,

            CAST(
                qs.total_logical_reads * 1.0 /
                NULLIF(qs.execution_count, 0)
                AS DECIMAL(18,2)
            ) AS LecturasLogicasPromedio,

            qs.last_execution_time AS UltimaEjecucion,

            CASE
                WHEN
                    (qs.total_elapsed_time * 1.0 /
                     NULLIF(qs.execution_count, 0))
                    / 1000000.0 >= 15
                    THEN 'CRITICO'

                WHEN
                    (qs.total_elapsed_time * 1.0 /
                     NULLIF(qs.execution_count, 0))
                    / 1000000.0 >= 5
                    THEN 'ALTO'

                WHEN
                    (qs.total_elapsed_time * 1.0 /
                     NULLIF(qs.execution_count, 0))
                    / 1000000.0 >= 2
                    THEN 'MEDIO'

                ELSE 'NORMAL'
            END AS Severidad,

            CASE
                WHEN
                    (qs.total_elapsed_time * 1.0 /
                     NULLIF(qs.execution_count, 0))
                    / 1000000.0 >= 15
                    THEN 'Consulta extremadamente lenta'

                WHEN
                    (qs.total_elapsed_time * 1.0 /
                     NULLIF(qs.execution_count, 0))
                    / 1000000.0 >= 5
                    THEN 'Consulta lenta que requiere revision'

                WHEN
                    (qs.total_elapsed_time * 1.0 /
                     NULLIF(qs.execution_count, 0))
                    / 1000000.0 >= 2
                    THEN 'Consulta con tiempo elevado'

                ELSE 'Tiempo normal'
            END AS Diagnostico,

            st.text AS ConsultaSQL

        FROM sys.dm_exec_query_stats qs
        CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st

        OUTER APPLY
        (
            SELECT TOP 1 value
            FROM sys.dm_exec_plan_attributes(qs.plan_handle)
            WHERE attribute = 'dbid'
        ) pa

        WHERE qs.execution_count > 0

        ORDER BY
            (
                qs.total_elapsed_time * 1.0 /
                NULLIF(qs.execution_count, 0)
            ) DESC;

        RETURN;
    END;


    ------------------------------------------------------
    -- 3. CONSULTAS CON MAYOR CONSUMO DE CPU
    ------------------------------------------------------
    IF @TipoNormalizado = 'CPU'
    BEGIN

        SELECT TOP 50

            ISNULL(DB_NAME(CONVERT(INT, pa.value)), 'DESCONOCIDA') AS BaseDatos,

            qs.execution_count AS VecesEjecutada,

            CAST(qs.total_worker_time / 1000000.0
                AS DECIMAL(18,2)) AS CpuTotalSegundos,

            CAST(qs.max_worker_time / 1000000.0
                AS DECIMAL(18,2)) AS CpuMaximoSegundos,

            CAST(
                qs.total_worker_time * 1.0 /
                NULLIF(qs.execution_count, 0)
                / 1000000.0
                AS DECIMAL(18,2)
            ) AS CpuPromedioSegundos,

            CAST(
                qs.total_worker_time * 100.0 /
                NULLIF(SUM(qs.total_worker_time) OVER (), 0)
                AS DECIMAL(10,2)
            ) AS PorcentajeCPU,

            qs.total_logical_reads AS LecturasLogicas,

            CAST(
                qs.total_logical_reads * 1.0 /
                NULLIF(qs.execution_count, 0)
                AS DECIMAL(18,2)
            ) AS LecturasLogicasPromedio,

            qs.last_execution_time AS UltimaEjecucion,

            -- Umbral en segundos absolutos de CPU acumulada, consistente con
            -- el criterio usado en TOP_PROBLEMAS y ALERTAS (antes esta rama
            -- usaba % relativo del cache, lo que daba severidades distintas
            -- para la misma consulta según el modo consultado).
            CASE
                WHEN qs.total_worker_time / 1000000.0 >= 300 THEN 'CRITICO'
                WHEN qs.total_worker_time / 1000000.0 >= 100 THEN 'ALTO'
                WHEN qs.total_worker_time / 1000000.0 >= 30  THEN 'MEDIO'
                ELSE 'NORMAL'
            END AS Severidad,

            st.text AS ConsultaSQL

        FROM sys.dm_exec_query_stats qs
        CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st

        OUTER APPLY
        (
            SELECT TOP 1 value
            FROM sys.dm_exec_plan_attributes(qs.plan_handle)
            WHERE attribute = 'dbid'
        ) pa

        WHERE qs.execution_count > 0

        ORDER BY qs.total_worker_time DESC;

        RETURN;
    END;


    ------------------------------------------------------
    -- 4. CONSULTAS CON MAYOR CONSUMO DE LECTURAS
    ------------------------------------------------------
    IF @TipoNormalizado = 'LECTURAS'
    BEGIN

        SELECT TOP 50

            ISNULL(DB_NAME(CONVERT(INT, pa.value)), 'DESCONOCIDA') AS BaseDatos,

            qs.execution_count AS VecesEjecutada,

            qs.total_logical_reads AS LecturasLogicas,

            qs.total_physical_reads AS LecturasFisicas,

            CAST(
                qs.total_logical_reads * 1.0 /
                NULLIF(qs.execution_count, 0)
                AS DECIMAL(18,2)
            ) AS LecturasLogicasPromedio,

            CAST(
                qs.total_physical_reads * 1.0 /
                NULLIF(qs.execution_count, 0)
                AS DECIMAL(18,2)
            ) AS LecturasFisicasPromedio,

            qs.last_execution_time AS UltimaEjecucion,

            CASE
                WHEN qs.total_logical_reads >= 100000000
                    THEN 'CRITICO'

                WHEN qs.total_logical_reads >= 10000000
                    THEN 'ALTO'

                WHEN qs.total_logical_reads >= 1000000
                    THEN 'MEDIO'

                ELSE 'NORMAL'
            END AS Severidad,

            CASE
                WHEN qs.total_logical_reads >= 100000000
                    THEN 'Consumo extremadamente alto de lecturas'

                WHEN qs.total_logical_reads >= 10000000
                    THEN 'Consumo alto de lecturas'

                WHEN qs.total_logical_reads >= 1000000
                    THEN 'Consumo moderado de lecturas'

                ELSE 'Consumo normal'
            END AS Diagnostico,

            st.text AS ConsultaSQL

        FROM sys.dm_exec_query_stats qs
        CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st

        OUTER APPLY
        (
            SELECT TOP 1 value
            FROM sys.dm_exec_plan_attributes(qs.plan_handle)
            WHERE attribute = 'dbid'
        ) pa

        WHERE qs.execution_count > 0

        ORDER BY qs.total_logical_reads DESC;

        RETURN;
    END;


    ------------------------------------------------------
    -- 5. BLOQUEOS
    ------------------------------------------------------
    IF @TipoNormalizado = 'BLOQUEOS'
    BEGIN

        SELECT

            r.session_id AS SesionBloqueada,

            r.blocking_session_id AS SesionBloqueadora,

            DB_NAME(r.database_id) AS BaseDatos,

            s.login_name AS UsuarioBloqueado,

            r.status AS Estado,

            r.wait_type AS TipoEspera,

            r.wait_time AS TiempoEsperaMs,

            CAST(r.wait_time / 1000.0
                AS DECIMAL(18,2)) AS EsperaSegundos,

            CASE
                WHEN r.wait_time > 300000 THEN 'CRITICO'
                WHEN r.wait_time > 60000 THEN 'ALTO'
                WHEN r.wait_time > 10000 THEN 'MEDIO'
                ELSE 'NORMAL'
            END AS Severidad,

            bloqueo.command AS ComandoBloqueador,

            txtBloqueado.text AS ConsultaBloqueada,

            txtBloqueador.text AS ConsultaBloqueadora

        FROM sys.dm_exec_requests r

        INNER JOIN sys.dm_exec_sessions s
            ON r.session_id = s.session_id

        LEFT JOIN sys.dm_exec_requests bloqueo
            ON r.blocking_session_id = bloqueo.session_id

        OUTER APPLY sys.dm_exec_sql_text(r.sql_handle)
            txtBloqueado

        OUTER APPLY sys.dm_exec_sql_text(bloqueo.sql_handle)
            txtBloqueador

        WHERE r.blocking_session_id <> 0

        ORDER BY r.wait_time DESC;

        RETURN;
    END;


    ------------------------------------------------------
    -- 6. RESUMEN DE BLOQUEOS
    ------------------------------------------------------
    IF @TipoNormalizado = 'RESUMEN_BLOQUEOS'
    BEGIN

        SELECT

            r.blocking_session_id AS SesionBloqueadora,

            COUNT(*) AS SesionesBloqueadas,

            MAX(r.wait_time) AS MayorEsperaMs,

            CAST(
                MAX(r.wait_time) / 1000.0
                AS DECIMAL(18,2)
            ) AS MayorEsperaSegundos,

            CASE
                WHEN COUNT(*) >= 10 THEN 'CRITICO'
                WHEN COUNT(*) >= 5 THEN 'ALTO'
                WHEN COUNT(*) >= 2 THEN 'MEDIO'
                ELSE 'NORMAL'
            END AS Severidad

        FROM sys.dm_exec_requests r

        WHERE r.blocking_session_id <> 0

        GROUP BY r.blocking_session_id

        ORDER BY COUNT(*) DESC;

        RETURN;
    END;


    ------------------------------------------------------
    -- 7. RESUMEN GENERAL
    ------------------------------------------------------
    IF @TipoNormalizado = 'RESUMEN'
    BEGIN

        DECLARE @Bloqueos INT = 0;
        DECLARE @Suspendidas INT = 0;
        DECLARE @Ejecutando INT = 0;
        DECLARE @Conexiones INT = 0;
        DECLARE @MayorEsperaSeg INT = 0;
        DECLARE @BaseMasActiva VARCHAR(128);

        DECLARE @ConsultasLentas INT = 0;
        DECLARE @ConsultasCPU INT = 0;
        DECLARE @ConsultasLecturas INT = 0;

        SELECT
            @Bloqueos = COUNT(*)
        FROM sys.dm_exec_requests
        WHERE blocking_session_id <> 0;

        SELECT
            @Suspendidas = COUNT(*)
        FROM sys.dm_exec_requests
        WHERE status = 'suspended';

        SELECT
            @Ejecutando = COUNT(*)
        FROM sys.dm_exec_requests
        WHERE status IN ('running', 'runnable');

        SELECT
            @Conexiones = COUNT(*)
        FROM sys.dm_exec_sessions
        WHERE is_user_process = 1;

        SELECT
            @MayorEsperaSeg =
                ISNULL(MAX(wait_time) / 1000, 0)
        FROM sys.dm_exec_requests;

        SELECT TOP 1
            @BaseMasActiva = DB_NAME(database_id)
        FROM sys.dm_exec_requests
        WHERE database_id IS NOT NULL
        GROUP BY database_id
        ORDER BY COUNT(*) DESC;

        SELECT
            @ConsultasLentas = COUNT(*)
        FROM sys.dm_exec_query_stats
        WHERE execution_count > 0
          AND
            (
                total_elapsed_time * 1.0 /
                NULLIF(execution_count, 0)
            ) / 1000000.0 >= 5;

        SELECT
            @ConsultasCPU = COUNT(*)
        FROM sys.dm_exec_query_stats
        WHERE execution_count > 0
          AND total_worker_time >= 300000000;

        SELECT
            @ConsultasLecturas = COUNT(*)
        FROM sys.dm_exec_query_stats
        WHERE execution_count > 0
          AND total_logical_reads >= 10000000;

        SELECT

            GETDATE() AS FechaMonitoreo,

            @@SERVERNAME AS Servidor,

            @Conexiones AS UsuariosConectados,

            @Ejecutando AS ConsultasEjecutando,

            @Suspendidas AS SesionesSuspendidas,

            @Bloqueos AS BloqueosActivos,

            @MayorEsperaSeg AS MayorEsperaSegundos,

            ISNULL(@BaseMasActiva, 'SIN ACTIVIDAD')
                AS BaseMasActiva,

            @ConsultasLentas AS ConsultasLentas,

            @ConsultasCPU AS ConsultasAltoCPU,

            @ConsultasLecturas AS ConsultasAltoConsumoLecturas,

            CASE

                WHEN @Bloqueos > 10
                  OR @Suspendidas > 20
                  OR @MayorEsperaSeg > 300
                  OR @ConsultasLentas > 10
                    THEN 'CRITICO'

                WHEN @Bloqueos > 3
                  OR @Suspendidas > 5
                  OR @MayorEsperaSeg > 60
                  OR @ConsultasLentas > 5
                  OR @ConsultasCPU > 10
                  OR @ConsultasLecturas > 10
                    THEN 'ALTO'

                WHEN @Bloqueos > 0
                  OR @Suspendidas > 0
                  OR @MayorEsperaSeg > 10
                  OR @ConsultasLentas > 0
                  OR @ConsultasCPU > 0
                  OR @ConsultasLecturas > 0
                    THEN 'MEDIO'

                ELSE 'NORMAL'

            END AS EstadoGeneral;

        RETURN;
    END;


    ------------------------------------------------------
    -- 8. TOP PROBLEMAS
    --    Combina tiempo, CPU y lecturas
    ------------------------------------------------------
    IF @TipoNormalizado = 'TOP_PROBLEMAS'
    BEGIN

        ;WITH Problemas AS
        (
            --------------------------------------------------
            -- TIEMPO
            --------------------------------------------------
            SELECT TOP 20

                'CONSULTA_LENTA' AS TipoProblema,

                ISNULL(
                    DB_NAME(CONVERT(INT, pa.value)),
                    'DESCONOCIDA'
                ) AS BaseDatos,

                CAST(
                    qs.total_elapsed_time * 1.0 /
                    NULLIF(qs.execution_count, 0)
                    / 1000000.0
                    AS DECIMAL(18,2)
                ) AS Valor,

                qs.execution_count AS Ejecuciones,

                qs.total_logical_reads AS Lecturas,

                qs.total_worker_time AS CPU,

                st.text AS ConsultaSQL

            FROM sys.dm_exec_query_stats qs

            CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st

            OUTER APPLY
            (
                SELECT TOP 1 value
                FROM sys.dm_exec_plan_attributes(qs.plan_handle)
                WHERE attribute = 'dbid'
            ) pa

            WHERE qs.execution_count > 0

            ORDER BY
                (
                    qs.total_elapsed_time * 1.0 /
                    NULLIF(qs.execution_count, 0)
                ) DESC
        ),

        CPUProblemas AS
        (
            SELECT TOP 20

                'CPU' AS TipoProblema,

                ISNULL(
                    DB_NAME(CONVERT(INT, pa.value)),
                    'DESCONOCIDA'
                ) AS BaseDatos,

                CAST(
                    qs.total_worker_time / 1000000.0
                    AS DECIMAL(18,2)
                ) AS Valor,

                qs.execution_count AS Ejecuciones,

                qs.total_logical_reads AS Lecturas,

                qs.total_worker_time AS CPU,

                st.text AS ConsultaSQL

            FROM sys.dm_exec_query_stats qs

            CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st

            OUTER APPLY
            (
                SELECT TOP 1 value
                FROM sys.dm_exec_plan_attributes(qs.plan_handle)
                WHERE attribute = 'dbid'
            ) pa

            WHERE qs.execution_count > 0

            ORDER BY qs.total_worker_time DESC
        ),

        LecturasProblemas AS
        (
            SELECT TOP 20

                'LECTURAS' AS TipoProblema,

                ISNULL(
                    DB_NAME(CONVERT(INT, pa.value)),
                    'DESCONOCIDA'
                ) AS BaseDatos,

                CAST(
                    qs.total_logical_reads
                    AS DECIMAL(18,2)
                ) AS Valor,

                qs.execution_count AS Ejecuciones,

                qs.total_logical_reads AS Lecturas,

                qs.total_worker_time AS CPU,

                st.text AS ConsultaSQL

            FROM sys.dm_exec_query_stats qs

            CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st

            OUTER APPLY
            (
                SELECT TOP 1 value
                FROM sys.dm_exec_plan_attributes(qs.plan_handle)
                WHERE attribute = 'dbid'
            ) pa

            WHERE qs.execution_count > 0

            ORDER BY qs.total_logical_reads DESC
        ),

        Todos AS
        (
            SELECT * FROM Problemas
            UNION ALL
            SELECT * FROM CPUProblemas
            UNION ALL
            SELECT * FROM LecturasProblemas
        )

        SELECT TOP 30

            ROW_NUMBER() OVER
            (
                ORDER BY
                    CASE
                        WHEN TipoProblema = 'CONSULTA_LENTA'
                            THEN 1
                        WHEN TipoProblema = 'CPU'
                            THEN 2
                        WHEN TipoProblema = 'LECTURAS'
                            THEN 3
                    END,
                    Valor DESC
            ) AS Prioridad,

            TipoProblema,

            BaseDatos,

            CASE
                WHEN TipoProblema = 'CONSULTA_LENTA'
                     AND Valor >= 15
                    THEN 'CRITICO'

                WHEN TipoProblema = 'CONSULTA_LENTA'
                     AND Valor >= 5
                    THEN 'ALTO'

                WHEN TipoProblema = 'CONSULTA_LENTA'
                     AND Valor >= 2
                    THEN 'MEDIO'

                WHEN TipoProblema = 'CPU'
                     AND Valor >= 300
                    THEN 'CRITICO'

                WHEN TipoProblema = 'CPU'
                     AND Valor >= 100
                    THEN 'ALTO'

                WHEN TipoProblema = 'CPU'
                     AND Valor >= 30
                    THEN 'MEDIO'

                WHEN TipoProblema = 'LECTURAS'
                     AND Valor >= 100000000
                    THEN 'CRITICO'

                WHEN TipoProblema = 'LECTURAS'
                     AND Valor >= 10000000
                    THEN 'ALTO'

                WHEN TipoProblema = 'LECTURAS'
                     AND Valor >= 1000000
                    THEN 'MEDIO'

                ELSE 'NORMAL'
            END AS Severidad,

            Valor,

            Ejecuciones,

            Lecturas,

            CAST(CPU / 1000000.0
                AS DECIMAL(18,2)) AS CPUSegundos,

            ConsultaSQL

        FROM Todos

        ORDER BY
            CASE
                WHEN TipoProblema = 'CONSULTA_LENTA'
                     AND Valor >= 15 THEN 1
                WHEN TipoProblema = 'CPU'
                     AND Valor >= 300 THEN 1
                WHEN TipoProblema = 'LECTURAS'
                     AND Valor >= 100000000 THEN 1

                WHEN TipoProblema = 'CONSULTA_LENTA'
                     AND Valor >= 5 THEN 2
                WHEN TipoProblema = 'CPU'
                     AND Valor >= 100 THEN 2
                WHEN TipoProblema = 'LECTURAS'
                     AND Valor >= 10000000 THEN 2

                WHEN TipoProblema = 'CONSULTA_LENTA'
                     AND Valor >= 2 THEN 3
                WHEN TipoProblema = 'CPU'
                     AND Valor >= 30 THEN 3
                WHEN TipoProblema = 'LECTURAS'
                     AND Valor >= 1000000 THEN 3

                ELSE 4
            END,
            Valor DESC;

        RETURN;
    END;


------------------------------------------------------
-- 9. ALERTAS
------------------------------------------------------
IF @TipoNormalizado = 'ALERTAS'
BEGIN

    DECLARE @SuspendidasAlertas INT = 0;

    DECLARE @Alertas TABLE
    (
        Severidad VARCHAR(20),
        TipoAlerta VARCHAR(50),
        Descripcion VARCHAR(500)
    );


    --------------------------------------------------
    -- BLOQUEOS
    --------------------------------------------------
    INSERT INTO @Alertas
    SELECT

        CASE
            WHEN COUNT(*) >= 10 THEN 'CRITICO'
            WHEN COUNT(*) >= 5 THEN 'ALTO'
            ELSE 'MEDIO'
        END,

        'BLOQUEOS',

        CONCAT(
            'Sesion ',
            blocking_session_id,
            ' bloquea ',
            COUNT(*),
            ' proceso(s)'
        )

    FROM sys.dm_exec_requests

    WHERE blocking_session_id <> 0

    GROUP BY blocking_session_id;


    --------------------------------------------------
    -- SUSPENDIDAS
    --------------------------------------------------
    SELECT
        @SuspendidasAlertas = COUNT(*)
    FROM sys.dm_exec_requests
    WHERE status = 'suspended';


    IF @SuspendidasAlertas > 0
    BEGIN

        INSERT INTO @Alertas
        VALUES
        (
            CASE
                WHEN @SuspendidasAlertas >= 20
                    THEN 'CRITICO'
                WHEN @SuspendidasAlertas >= 5
                    THEN 'ALTO'
                ELSE 'MEDIO'
            END,

            'SUSPENDIDAS',

            CONCAT(
                @SuspendidasAlertas,
                ' sesion(es) actualmente suspendida(s)'
            )
        );

    END;


    --------------------------------------------------
    -- CONSULTAS LENTAS
    --------------------------------------------------
    INSERT INTO @Alertas
    SELECT

        CASE
            WHEN COUNT(*) >= 10 THEN 'CRITICO'
            WHEN COUNT(*) >= 5 THEN 'ALTO'
            ELSE 'MEDIO'
        END,

        'CONSULTAS_LENTAS',

        CONCAT(
            COUNT(*),
            ' consulta(s) con tiempo promedio >= 5 segundos'
        )

    FROM sys.dm_exec_query_stats

    WHERE execution_count > 0
      AND
        (
            total_elapsed_time * 1.0 /
            NULLIF(execution_count, 0)
        ) / 1000000.0 >= 5

    HAVING COUNT(*) > 0;


    --------------------------------------------------
    -- CPU
    --------------------------------------------------
    INSERT INTO @Alertas
    SELECT

        CASE
            WHEN COUNT(*) >= 20 THEN 'CRITICO'
            WHEN COUNT(*) >= 10 THEN 'ALTO'
            ELSE 'MEDIO'
        END,

        'CPU',

        CONCAT(
            COUNT(*),
            ' consulta(s) con consumo acumulado de CPU elevado'
        )

    FROM sys.dm_exec_query_stats

    WHERE execution_count > 0
      AND total_worker_time >= 300000000

    HAVING COUNT(*) > 0;


    --------------------------------------------------
    -- LECTURAS
    --------------------------------------------------
    INSERT INTO @Alertas
    SELECT

        CASE
            WHEN COUNT(*) >= 20 THEN 'CRITICO'
            WHEN COUNT(*) >= 10 THEN 'ALTO'
            ELSE 'MEDIO'
        END,

        'LECTURAS',

        CONCAT(
            COUNT(*),
            ' consulta(s) con mas de 10 millones de lecturas logicas'
        )

    FROM sys.dm_exec_query_stats

    WHERE execution_count > 0
      AND total_logical_reads >= 10000000

    HAVING COUNT(*) > 0;


    --------------------------------------------------
    -- RESULTADO
    --------------------------------------------------
    IF EXISTS
    (
        SELECT 1
        FROM @Alertas
    )
    BEGIN

        SELECT

            Severidad,

            TipoAlerta,

            Descripcion,

            CASE Severidad
                WHEN 'CRITICO' THEN 1
                WHEN 'ALTO' THEN 2
                WHEN 'MEDIO' THEN 3
                ELSE 4
            END AS Prioridad

        FROM @Alertas

        ORDER BY
            CASE Severidad
                WHEN 'CRITICO' THEN 1
                WHEN 'ALTO' THEN 2
                WHEN 'MEDIO' THEN 3
                ELSE 4
            END;

    END
    ELSE
    BEGIN

        SELECT
            'NORMAL' AS Severidad,
            'SIN_ALERTAS' AS TipoAlerta,
            'No se detectaron bloqueos, sesiones suspendidas ni consultas con consumo elevado.' AS Descripcion,
            4 AS Prioridad;

    END;

    RETURN;
END

    ------------------------------------------------------
    -- 10. OPCION NO VALIDA
    ------------------------------------------------------
    SELECT
        'Opciones validas:

SUSPENDIDAS
LENTAS
CPU
LECTURAS
BLOQUEOS
RESUMEN_BLOQUEOS
RESUMEN
TOP_PROBLEMAS
ALERTAS'
        AS Mensaje;

END;