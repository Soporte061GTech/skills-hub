---
name: dbtools-portable
version: 1.0.0
description: Suite completa de herramientas y subagentes especializados en Microsoft SQL Server (Standard/Enterprise). Incluye roles para desarrollador (T-SQL), administrador (DBA), optimizacion de rendimiento (tuning), auditoria/seguridad y analista de datos (BI), operando bajo estricta politica de solo lectura.
---

# dbtools — Suite de Agentes y Skills para SQL Server

Paquete integral con capacidades avanzadas de administracion, desarrollo, tuning, seguridad y analitica para Microsoft SQL Server (Standard/Enterprise).

## Componentes Incluidos
- sql-server-developer (T-SQL, SPs, vistas, esquemas)
- sql-server-administrator (Instancias, AG, backups, jobs)
- sql-server-tuning (Consultas lentas, indices, planes de ejecucion)
- sql-server-audit-security (Permisos, cifrado, hardening)
- sql-server-data-analyst (BI, analitica avanzada, window functions)
- Persona orquestadora (orchestrator-prompt.md)
- Instalador multi-agente (install.js)

## Regla de Oro
Solo lectura estricta en entornos de base de datos.
