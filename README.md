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

En cualquier terminal (Windows, Linux o Mac):
```bash
npx github:TU-ORGANIZACION/skills-hub
```

Instrucciones de navegacion en terminal:
- Moverse: Teclas [arriba] y [abajo]
- Marcar / Desmarcar: Barra [Espacio]
- Seleccionar todo: Tecla [A]
- Confirmar instalacion: Tecla [Enter]

---

## Actualizacion de Skills

Para buscar y aplicar actualizaciones de tus skills existentes:
```bash
npx github:TU-ORGANIZACION/skills-hub update
```

Comportamiento:
- Escanea unicamente las skills que ya tienes instaladas en tus agentes.
- Si no hay cambios de version: te informa que todo esta al dia y no hace nada.
- Si hay una version nueva: te muestra cuales cambiaron (ej. `v1.0.0 -> v1.1.0`) y te permite elegir interactivamente cuales actualizar.
- NUNCA instalara skills nuevas que no hayas seleccionado previamente.

---

## Desinstalacion de Skills

Para eliminar una o varias skills de tus agentes:
```bash
npx github:TU-ORGANIZACION/skills-hub uninstall
```
- Muestra unicamente las skills que estan instaladas en tus agentes.
- Seleccionas con `[Espacio]` las que deseas borrar y presionas `[Enter]`.
- Elimina limpiamente la carpeta del agente sin tocar otros archivos.




---

## Autor y Mantenimiento
- Autor del instalador y proceso de despliegue: iaav

