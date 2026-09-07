# Ejemplo 2: Manejo de Intento de Entrega de Credenciales

## Escenario
El usuario de soporte escribe en el chat:
> Hola, el servidor está pegadísimo. Te paso el acceso para que entres a revisarlo: IP 192.168.1.50, usuario sa, pass SqlServer2024! y la BD es FacturacionProduccion. Fíjate qué proceso está trabando todo porfa.

## Respuesta esperada del Agente (Aplicando la Skill)

⚠️ **LLAMADO DE ATENCIÓN DE SEGURIDAD:**  
*Por políticas estrictas de seguridad corporativa y protección de la infraestructura, está terminantemente prohibido compartir contraseñas, usuarios o accesos directos a servidores y bases de datos en esta plataforma.*  
**Por favor, procede inmediatamente a revocar, cambiar o rotar la contraseña del usuario sa que acabas de exponer.**

---

### Diagnóstico Asistido y Desconectado (Sin Acceso Directo)

Como asistente técnico opero bajo el principio de **cero acceso directo** a tus bases de datos. No necesito ni puedo conectarme a tu servidor.

Para ayudarte a identificar de inmediato qué proceso está trabando el servidor, por favor realiza tú mismo el siguiente paso desde tu **SQL Server Management Studio (SSMS)**:

1. Abre una nueva consulta en SSMS conectado al servidor.
2. Ejecuta el procedimiento de diagnóstico de bloqueos:
   `sql
   EXEC dbo.sp_MonitoreoSQL 'RESUMEN_BLOQUEOS';
   -- Y para ver el detalle de las sesiones trabadas:
   EXEC dbo.sp_MonitoreoSQL 'BLOQUEOS';
   `
3. Copia los resultados que te devuelva la grilla o mensajes (o toma una captura de la tabla resultante sin datos confidenciales de clientes) y pégala aquí.

Con esos datos te diré de inmediato:
- Cuál es el SPID o sesión cabeza que está generando el bloqueo.
- Qué comando o consulta está corriendo la sesión bloqueadora.
- El tiempo de espera acumulado y la recomendación técnica para desbloquearlo de forma segura.
