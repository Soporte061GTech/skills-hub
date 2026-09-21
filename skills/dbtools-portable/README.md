# dbtools — paquete portable (OpenCode, Kilo Code, Claude Code, Gemini CLI, Codex CLI, Cursor, etc.)

Este paquete contiene el agente **dbtools** (SQL Server Standard/Enterprise) en formatos portables. El preset original vive en el harness DSH (`~/.dsh/.agent-presets/dbtools`); lo que aquí se distribuye son sus partes reutilizables:

| Pieza | Formato | Portable |
|---|---|---|
| `skills/` (5 skills) | **Agent Skills** (`SKILL.md` con frontmatter `name`/`description`) | ✅ copiar y pegar |
| `agents/` (1 orquestador + 5 subagentes) | Markdown con frontmatter (`mode`, `description`, `permission`) | ✅ copiar según la tool |
| `orchestrator-prompt.md` | Prompt reutilizable (para `AGENTS.md`/rules) | ✅ copiar y pegar |

## Instalador automático (recomendado)

`install.js` copia las skills y los agentes a las 5 tools de una vez (Node.js, sin dependencias):

```bash
node install.js                        # todo, global (usuario)
node install.js opencode kilocode      # solo esas dos
node install.js codex                  # solo Codex CLI
node install.js --project .            # todo, dentro del proyecto actual
node install.js --dry-run              # previsualizar sin escribir
node install.js --no-overwrite         # no sobrescribir archivos existentes
```

| Flag | Efecto |
|---|---|
| `--global` (por defecto) | instala en la carpeta del usuario (`~/.config/opencode`, `~/.kilo`, `~/.claude`, `~/.gemini`, y para Codex `~/.agents/skills` + `~/.codex/AGENTS.md`) |
| `--project <dir>` | instala dentro de un proyecto (`.opencode/`, `.kilo/`, `.claude/`, `.gemini/`, y para Codex `.agents/` + `AGENTS.md`) |
| `--dry-run` | muestra qué haría sin escribir nada |
| `--no-overwrite` | no pisa archivos existentes |

Detalles: el instalador escribe la persona orquestadora como `CLAUDE.md` (Claude Code), `GEMINI.md` (Gemini CLI, solo proyecto) y `AGENTS.md` (Codex CLI), y genera los agentes de **Claude Code con frontmatter propio** (`name`/`description`/`tools` en modo solo lectura, sin `Write`/`Edit`). Para OpenCode y Kilo Code usa los `agents/*.md` compartidos (frontmatter `mode`). Para **Codex CLI** instala las skills en el estándar abierto `.agents/skills/` (su ubicación nativa, compartida con cualquier tool compatible).

---

## Estructura

```
dbtools-portable/
├── README.md                     # instrucciones de instalación
├── install.js                    # instalador automático (Node.js, sin dependencias)
├── orchestrator-prompt.md        # persona orquestadora (reutilizable como regla/instrucción)
├── skills/                       # 5 skills en formato Agent Skills
│   ├── sql-server-developer/SKILL.md
│   ├── sql-server-administrator/SKILL.md
│   ├── sql-server-tuning/SKILL.md
│   ├── sql-server-audit-security/SKILL.md
│   └── sql-server-data-analyst/SKILL.md
└── agents/                       # 1 agente principal + 5 subagentes
    ├── dbtools.md
    ├── sql-server-developer.md
    ├── sql-server-administrator.md
    ├── sql-server-tuning.md
    ├── sql-server-audit-security.md
    └── sql-server-data-analyst.md
```

---

## 1) OpenCode

Las skills y los agentes se descubren desde el proyecto o de forma global.

**Skills** — copia `skills/` a cualquiera de estas rutas:
- Proyecto: `.opencode/skills/` (o `.claude/skills/`, `.agents/skills/`)
- Global: `~/.config/opencode/skills/` (Windows: `%USERPROFILE%\.config\opencode\skills\`)

**Agentes** — copia los `.md` de `agents/` a:
- Proyecto: `.opencode/agents/`
- Global: `~/.config/opencode/agents/`

```bash
# ejemplo (proyecto)
cp -r skills/*           .opencode/skills/
cp    agents/*.md        .opencode/agents/
```

Con esto:
- `dbtools` aparece como **primary agent** (cámbialo con Tab o con el selector).
- Los 5 subagentes se invocan automáticamente (por su `description`) o con `@sql-server-developer`, etc.
- Las skills se cargan con la herramienta `skill` cuando su `description` coincide.

Referencia: [OpenCode — Agents](https://opencode.ai/docs/agents/) · [OpenCode — Agent Skills](https://opencode.ai/docs/skills/)

---

## 2) Kilo Code

**Skills** — copia `skills/` a:
- Proyecto: `.kilo/skills/`
- Global: `~/.kilo/skills/` (Windows: `%USERPROFILE%\.kilo\skills\`)
- Compatibilidad: `.claude/skills/` o `.agents/skills/` también se leen.

**Agentes (modes)** — copia los `.md` de `agents/` a:
- Proyecto: `.kilo/agents/` (o `.kilo/agent/`, legacy `.kilocode/agents/`)
- Global: `~/.config/kilo/agent/`

```bash
# ejemplo (proyecto)
cp -r skills/*    .kilo/skills/
cp    agents/*.md .kilo/agents/
```

`dbtools` queda como agente `primary`; los 5 subagentes quedan como `mode: subagent` (se invocan con la herramienta `task`/delegación). Usa `/reload` o inicia sesión nueva para recargar.

Referencia: [Kilo Code — Custom Modes](https://kilo.ai/docs/customize/custom-modes) · [Kilo Code — Skills](https://kilo.ai/docs/customize/skills)

---

## 3) Otros programas

- **Claude Code**: skills → `.claude/skills/` (global `~/.claude/skills/`); subagentes → `.claude/agents/*.md`.
- **Codex CLI**: skills → `.agents/skills/` (global `~/.agents/skills/`); persona → `AGENTS.md` (global `~/.codex/AGENTS.md`). Codex no tiene subagentes nativos; el agente actúa como orquestador y carga la skill del rol.
- **Cursor**: skills → `.cursor/skills/`; reglas → `.cursor/rules/` (pega el contenido de `orchestrator-prompt.md`); agentes → `.cursor/agents/`.
- **Cualquier tool con Agent Skills** (agentskills.io): las 5 `skills/` funcionan directamente.

Si la tool solo soporta **instrucciones/rules** (sin subagentes), pega `orchestrator-prompt.md` como `AGENTS.md` (OpenCode) o `.kilo/rules/dbtools.md` + `instructions` en `kilo.jsonc`, y el modelo "actuará" como el subagente elegido usando las skills.

---

## Conexión a SQL Server (solo lectura)

Estas tools conectan a la BD de dos formas:

1. **Shell (`sqlcmd`/`Invoke-Sqlcmd`)** — el agente ejecuta consultas de solo lectura:
   - `sqlcmd -S SRV\INSTANCIA,1433 -E -d Base -Q "SELECT @@VERSION;"`
   - `sqlcmd -S SRV,1433 -U usuario -P "***" -d Base -K ReadOnly -Q "SELECT ..."`
   - `Invoke-Sqlcmd -ServerInstance "SRV\INSTANCIA" -Database "Base" -Query "SELECT ..." -TrustServerCertificate`
2. **MCP de SQL Server** — configura un servidor MCP (p. ej. `mssql-mcp-server` o similar) en `opencode.json` / `kilo.jsonc` apuntando a una conexión de solo lectura.

**Regla inquebrantable (ya incluida en persona + skills + subagentes):** ningún agente crea/modifica/elimina objetos, elementos o datos. Solo `SELECT`, catálogo (`sys.*`) y DMVs (`sys.dm_*`). Los cambios se entregan como script para que el usuario los ejecute.

**Nota de seguridad:** la garantía técnica de solo lectura depende de las credenciales. Usa una cuenta con `db_datareader`/`SELECT` (o una réplica de solo lectura) y `ApplicationIntent=ReadOnly`. En OpenCode/Kilo puedes reforzar con `permission: { edit: deny }` (ya puesto en los subagentes) y opcionalmente `bash: ask`.
