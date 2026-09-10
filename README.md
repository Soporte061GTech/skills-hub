# Central de Skills para Agentes de IA (Skills Hub)

Este repositorio contiene una coleccion de "Skills" (habilidades) empaquetadas para potenciar Agentes de Inteligencia Artificial (como Antigravity, Claude, etc.). 

Las skills dotan a los agentes de flujos de trabajo especificos, reglas de seguridad y conocimientos tecnicos avanzados sin necesidad de configuraciones manuales.

## 🚀 Instalacion Rapida

No necesitas descargar ni clonar este repositorio manualmente. Puedes instalar, actualizar o desinstalar las skills directamente en los entornos de tus agentes utilizando el instalador interactivo via `npx`.

Abre tu terminal y ejecuta:

```bash
npx github:MiOrganizacion/skills-hub
```

Se abrira un asistente interactivo que detectara tus agentes instalados y te permitira seleccionar que skills deseas agregar o remover.

---

## 🛠 Skills Disponibles

### 1. DBA Soporte (`dba-soporte` v1.3.0)
Transforma a tu agente en un **Asistente DBA Senior Interactivo** especializado en Microsoft SQL Server. 

Esta skill funciona como una **Maquina de Estados**, guiando al usuario a traves de un diagnostico seguro y libre de riesgos. Esta diseñada bajo una estricta politica de **Zero-Trust (Cero Acceso)**: el agente nunca se conectara a la base de datos ni pedira credenciales.

#### ¿Como usarla?

El agente es inteligente y se adaptara a la informacion que le des:

*   **Modo Triage (Diagnostico Guiado):** 
    Si no sabes que ocurre, simplemente dile al agente: *"El servidor esta lento"* o *"Tengo un problema de timeout"*. El agente tomara el control, te preguntara tu version de SQL Server y te entregara scripts inofensivos (lectura de catalogos) para que los ejecutes y le pegues los resultados, guiandote paso a paso hasta encontrar la causa raiz.
*   **Modo Quirurgico (Experto):** 
    Si ya tienes aislado el problema, pega directamente el Query problematico y el XML del Plan de Ejecucion. El agente saltara la fase de entrevistas e ira directo al analisis tecnico exhaustivo (Sargabilidad, Estimacion de filas, TempDB Spills, etc.).
*   **Generador de Reportes:**
    En cualquier momento de la sesion, puedes escribirle al agente: **`Genera el reporte de diagnostico`**. El agente compilara toda la evidencia, el analisis y la solucion en un documento formal en formato Markdown (`.md`), listo para ser adjuntado a tu ticket de soporte.

### 2. Demo Echo (`demo-echo`)
Skill de prueba ligera utilizada unicamente para validar que el proceso de instalacion y actualizacion mediante el comando `npx` funciona correctamente en tu equipo.

---

## 🔒 Politicas de Seguridad Integradas
Todas las skills de administracion (como `dba-soporte`) estan configuradas con limites duros:
- **Cero Modificaciones:** Nunca sugeriran ejecutar sentencias `UPDATE`, `INSERT`, `DELETE` o `DROP` de forma automatica para "arreglar" un problema.
- **Evidencia Local:** Todo el analisis se basa en la salida de texto (Planes XML, STATISTICS IO) que el usuario decide pegar en el chat.
