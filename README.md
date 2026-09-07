# SKILLS-HUB — Catálogo e Instalador de Skills para Agentes de IA

Catálogo centralizado de skills especializadas para agentes de Inteligencia Artificial (**Google Antigravity**, **Claude**, **Codex / OpenAI**, **OpenCode / Roo Code / Cursor**).

Diseñado para que cualquier usuario de soporte o desarrollo pueda instalar o actualizar skills en su agente con **un solo comando**, sin riesgo de alterar configuraciones locales ni rutas complejas.

---

## 🚀 Catálogo de Skills Disponibles

| Skill | Directorio | Descripción |
| :--- | :--- | :--- |
| **dba-soporte** | skills/dba-soporte/ | Diagnóstico de rendimiento, bloqueos, wait stats, planes de ejecución y triage de SQL Server 2019+. Modo cero acceso directo. |
| **demo-echo** | skills/demo-echo/ | Skill de prueba y verificación rápida. Permite comprobar en segundos que el agente carga correctamente las skills. |


---

## Instalacion Rapida

### Metodo 1: Con Node.js / NPX
En cualquier terminal (Windows, Linux o Mac):
```bash
npx github:aquivalootro/skills-hub
```
Instrucciones de navegacion en terminal:
- Moverse: Teclas [arriba] y [abajo]
- Marcar / Desmarcar: Barra [Espacio]
- Seleccionar todo: Tecla [A]
- Confirmar instalacion: Tecla [Enter]

---

### Metodo 2: Enlace directo de PowerShell (Windows sin Node.js)
Abre PowerShell y ejecuta:
```powershell
irm https://raw.githubusercontent.com/aquivalootro/skills-hub/main/install.ps1 | iex
```

---

## Actualizacion de Skills

Cuando se publiquen cambios en el repositorio, ejecuta:

1. Modo Automatico (Actualiza todo en un comando):
   ```bash
   npx github:aquivalootro/skills-hub update
   ```

2. Modo Selectivo:
   Vuelve a ejecutar `npx github:aquivalootro/skills-hub` y selecciona que skills o agentes actualizar.



---

## Autor y Mantenimiento
- Autor de la skill: iaav
