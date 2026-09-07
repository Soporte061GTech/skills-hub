# SKILLS-HUB — Catálogo e Instalador de Skills para Agentes de IA

Catálogo centralizado de skills especializadas para agentes de Inteligencia Artificial (**Google Antigravity**, **Claude**, **Codex / OpenAI**, **OpenCode / Roo Code / Cursor**).

Diseñado para que cualquier usuario de soporte o desarrollo pueda instalar o actualizar skills en su agente con **un solo comando**, sin riesgo de alterar configuraciones locales ni rutas complejas.

---

## 🚀 Catálogo de Skills Disponibles

| Skill | Directorio | Descripción |
| :--- | :--- | :--- |
| **dba-soporte** | skills/dba-soporte/ | Diagnóstico de rendimiento, bloqueos, wait stats, planes de ejecución y triage de SQL Server 2019+. Modo cero acceso directo. |
| *(futura)* | skills/... | Diseñado para albergar N skills adicionales del equipo. |

---

## 📦 Instalación Rápida (Elige tu método preferido)

### Método 1: Con Node.js / NPX (Recomendado, interactivo con selector de agente)
En cualquier terminal (Windows, Linux o Mac):
`ash
npx https://github.com/TU_ORG_O_USUARIO/skills-hub install
`
El instalador te preguntará interactivamente:
1. Qué skill deseas instalar (dba-soporte o Todas).
2. A qué agente(s) deseas instalarla (**Antigravity**, **Claude**, **Codex**, **OpenCode** o **Todos**).

---

### Método 2: Enlace directo de PowerShell (Para usuarios de Windows sin Node.js)
Abre PowerShell y corre:
`powershell
irm https://raw.githubusercontent.com/TU_ORG_O_USUARIO/skills-hub/main/install.ps1 | iex
`

---

### Método 3: Instalación Local en desarrollo
Si clonaste este repositorio en tu máquina:
`ash
cd skills-hub
node bin/cli.js
`

---

## 🔄 ¿Cómo Actualizar las Skills?
Cuando se suban mejoras al repositorio en GitHub (nuevos scripts o umbrales), el usuario solo debe volver a ejecutar el comando de instalación:
`ash
npx https://github.com/TU_ORG_O_USUARIO/skills-hub install
`
El instalador sobreescribe limpiamente los archivos de la skill seleccionada sin tocar nada más de la máquina.

---

## 👤 Autor y Mantenimiento
- **Autor de la skill:** `iaav`

