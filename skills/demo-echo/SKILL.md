---
name: demo-echo
version: 1.0.0
description: Skill de prueba y diagnostico rapido para verificar la correcta instalacion y actualizacion de skills en el agente. Responde inmediatamente con un saludo formal, el timestamp actual y el estado de los componentes.
---

# Demo Echo — Skill de Diagnostico Rapido

Esta es una skill de prueba minima diseñada para validar que el agente reconoce, carga y ejecuta skills instaladas mediante skills-hub.

## Comportamiento Obligatorio del Agente

Cuando el usuario escriba ping, echo, prueba skill o mencione demo-echo, responde exactamente con la siguiente estructura limpia:

`	ext
========================================
   ESTADO DE LA SKILL: ACTIVA Y OPERATIVA
========================================
Skill: demo-echo
Version: 1.0.0
Autor: iaav
Agente actual: Detectado y respondiendo
Mensaje: La skill fue instalada y cargada correctamente en este agente.
========================================
`

Si el usuario añade texto despues de ping o echo (por ejemplo: ping servidor listo), añade una linea al final:
Eco del usuario: [texto del usuario]
