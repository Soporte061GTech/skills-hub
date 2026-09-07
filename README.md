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

### Método 1: Con Node.js / NPX (Interactivo con casillas de verificación)
En cualquier terminal (Windows, Linux o Mac):
```bash
npx github:aquivalootro/skills-hub
```
Te mostrará un menú interactivo en la terminal:
- **Navegar:** Flechas `[↑]` y `[↓]`
- **Marcar / Desmarcar:** Barra espaciadora `[Espacio]`
- **Marcar / Desmarcar Todo:** Tecla `[A]`
- **Confirmar:** Tecla `[Enter]`

---

### Método 2: Enlace directo de PowerShell (Para Windows sin Node.js)
Abre PowerShell y corre:
```powershell
irm https://raw.githubusercontent.com/aquivalootro/skills-hub/main/install.ps1 | iex
```

---

## 🔄 ¿Cómo Actualizar las Skills en Todos tus Agentes?

Cuando se publiquen cambios o mejoras en el repositorio, puedes actualizar de dos formas:

1. **Modo Automático (Actualiza todo en un solo clic):**
   ```bash
   npx github:aquivalootro/skills-hub update
   ```
   *(Actualiza automáticamente todas las skills en todos los agentes instalados sin pedir confirmaciones).*

2. **Modo Selectivo:**
   Vuelve a ejecutar `npx github:aquivalootro/skills-hub` y marca únicamente las skills y agentes que desees refrescar.


---

## 👤 Autor y Mantenimiento
- **Autor de la skill:** `iaav`
