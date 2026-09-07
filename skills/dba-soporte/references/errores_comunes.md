# Triage Rápido de Errores Operativos Comunes en SQL Server

Guía de referencia rápida para que el agente interprete los errores y códigos más frecuentes reportados por el equipo de soporte técnico y sugiera pasos no destructivos inmediatos.

---

## 1. Error 1205: Deadlock victim (Víctima de interbloqueo)
- **Mensaje típico:** Transaction (Process ID X) was deadlocked on resources with another process and has been chosen as the deadlock victim. Rerun the transaction.
- **Causa raíz:** Dos o más procesos compiten por los mismos recursos en orden inverso y el motor sacrificó uno.
- **Acción inmediata para Soporte:**
  1. No intentar matar procesos al azar (el motor ya liberó el bloqueo al matar a la víctima).
  2. Pedir al usuario que ejecute el script de consulta de Deadlocks de system_health (scripts/diagnostico/04.sp_ConsultarDeadlocksRecientes.sql) y comparta el XML o texto resultante.
  3. Identificar qué objetos y sentencias estuvieron involucrados.
- **Validación del DBA:** Revisar orden de acceso a tablas, índices faltantes que alargan transacciones, o evaluar niveles de aislamiento (READ COMMITTED SNAPSHOT / RCSI).

---

## 2. Error 1222 / Timeout: Lock request time out period exceeded
- **Mensaje típico:** Lock request time out period exceeded.
- **Causa raíz:** La sesión esperó más tiempo del configurado (@@LOCK_TIMEOUT) porque otra sesión retiene un bloqueo exclusivo prolongado.
- **Acción inmediata para Soporte:**
  1. Ejecutar EXEC dbo.sp_MonitoreoSQL 'BLOQUEOS' o 'RESUMEN_BLOQUEOS' para identificar la sesión cabeza de bloqueo (locking_session_id).
  2. Identificar si la cabeza de bloqueo está en estado sleeping con transacción abierta (open_tran > 0) por una aplicación que no hizo COMMIT/ROLLBACK.
- **Regla de seguridad:** No recomendar ejecutar KILL sin antes verificar qué aplicación o usuario posee la sesión cabeza.

---

## 3. Error de Timeout en Aplicación (Execution Timeout Expired)
- **Mensaje típico:** Execution Timeout Expired. The timeout period elapsed prior to completion of the operation or the server is not responding.
- **Causa raíz:** Es un timeout del cliente/driver (habitualmente 30 segundos por defecto), NO de SQL Server.
- **Diagnóstico:**
  - ¿La consulta tardó por CPU/lecturas elevadas? -> Ver sp_MonitoreoSQL 'LENTAS'.
  - ¿La consulta estuvo encolada esperando un lock? -> Ver sp_MonitoreoSQL 'BLOQUEOS' y tipos de espera LCK_*.

---

## 4. Error 9002: The transaction log for database 'X' is full
- **Mensaje típico:** The transaction log for database 'X' is full due to 'LOG_BACKUP' / 'ACTIVE_TRANSACTION'.
- **Causa raíz:** El archivo .ldf se llenó y no puede auto-crecer (falta de espacio en disco o límite fijado) o no se puede truncar.
- **Acción para Soporte (NO DESTRUCTIVA):**
  1. **PROHIBIDO sugerir:** SHRINKDATABASE o SHRINKFILE a ciegas. Tampoco cambiar a modo SIMPLE sin autorización del DBA.
  2. Solicitar al usuario ejecutar:
     `sql
     SELECT name, log_reuse_wait_desc FROM sys.databases WHERE name = 'NombreBD';
     `
  3. Interpretar log_reuse_wait_desc:
     - LOG_BACKUP: Se requiere un respaldo de log transaccional (BACKUP LOG).
     - ACTIVE_TRANSACTION: Hay una transacción muy vieja abierta sin cerrar (DBCC OPENTRAN).
     - REPLICATION / AVAILABILITY_GROUP: Sincronización demorada.

---

## 5. Error 701 / 802: Insufficient system memory / Buffer pool
- **Mensaje típico:** There is insufficient system memory in resource pool 'default' to run this query.
- **Causa raíz:** Agotamiento de memoria disponible en el buffer pool para conceder el Memory Grant a la consulta.
- **Diagnóstico:** Consultas con grandes operaciones de SORT o HASH JOIN solicitando memoria excesiva o max server memory mal configurado.
