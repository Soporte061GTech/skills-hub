#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Definición de directorios de agentes soportados
const USER_HOME = process.env.USERPROFILE || process.env.HOME || '';

const TARGET_AGENTS = {
  '1': {
    id: 'antigravity',
    name: 'Google Antigravity (AGY)',
    description: 'Instalación global en el directorio de skills de Antigravity',
    getPath: () => path.join(USER_HOME, '.gemini', 'antigravity', 'skills')
  },
  '2': {
    id: 'claude',
    name: 'Claude (Claude Code / Desktop)',
    description: 'Instalación en ~/.claude/skills o directorio del workspace',
    getPath: () => path.join(USER_HOME, '.claude', 'skills')
  },
  '3': {
    id: 'codex',
    name: 'Codex / OpenAI Assistant',
    description: 'Instalación en ~/.codex/skills o workspace',
    getPath: () => path.join(USER_HOME, '.codex', 'skills')
  },
  '4': {
    id: 'opencode',
    name: 'OpenCode / Roo Code / Cursor',
    description: 'Instalación en ~/.opencode/skills o .roo/skills',
    getPath: () => path.join(USER_HOME, '.opencode', 'skills')
  }
};

const SKILLS_DIR = path.join(__dirname, '..', 'skills');

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  files.forEach((file) => {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  });
}

function getAvailableSkills() {
  if (!fs.existsSync(SKILLS_DIR)) {
    return [];
  }
  return fs.readdirSync(SKILLS_DIR).filter((file) => {
    return fs.statSync(path.join(SKILLS_DIR, file)).isDirectory();
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log('\n========================================================');
  console.log('       SKILLS-HUB: Instalador Universal de Skills        ');
  console.log('========================================================\n');

  const skills = getAvailableSkills();
  if (skills.length === 0) {
    console.error('❌ Error: No se encontraron skills disponibles en el catálogo.');
    process.exit(1);
  }

  console.log('Skills disponibles en el catálogo:');
  skills.forEach((skill, index) => {
    console.log(  [] );
  });
  console.log(  [A] Todas las skills);

  const skillAnswer = (await prompt('\nSelecciona la skill a instalar [1]: ') || '1').trim().toUpperCase();
  let selectedSkills = [];

  if (skillAnswer === 'A') {
    selectedSkills = skills;
  } else {
    const skillIndex = parseInt(skillAnswer, 10) - 1;
    if (skillIndex >= 0 && skillIndex < skills.length) {
      selectedSkills = [skills[skillIndex]];
    } else {
      selectedSkills = [skills[0]]; // default dba-soporte
    }
  }

  console.log(\n✔ Seleccionado: \n);
  console.log('¿A qué agente(s) deseas instalar la skill?');
  Object.keys(TARGET_AGENTS).forEach((key) => {
    const ag = TARGET_AGENTS[key];
    console.log(  []  ());
  });
  console.log('  [A] Instalar en TODOS los agentes soportados');

  const agentAnswer = (await prompt('\nElige el/los agente(s) separados por comas (ej. 1,2) o [A]: ') || '1').trim().toUpperCase();
  let chosenAgentKeys = [];

  if (agentAnswer === 'A') {
    chosenAgentKeys = Object.keys(TARGET_AGENTS);
  } else {
    chosenAgentKeys = agentAnswer.split(',').map(k => k.trim()).filter(k => TARGET_AGENTS[k]);
    if (chosenAgentKeys.length === 0) {
      chosenAgentKeys = ['1']; // Default Antigravity
    }
  }

  console.log('\n--------------------------------------------------------');
  console.log('Ejecutando instalación...');
  console.log('--------------------------------------------------------\n');

  for (const agentKey of chosenAgentKeys) {
    const agent = TARGET_AGENTS[agentKey];
    const destinationRoot = agent.getPath();

    for (const skillName of selectedSkills) {
      const sourceSkillPath = path.join(SKILLS_DIR, skillName);
      const targetSkillPath = path.join(destinationRoot, skillName);

      try {
        copyFolderRecursiveSync(sourceSkillPath, targetSkillPath);
        console.log(✔ []  -> Instalado/Actualizado en: );
      } catch (err) {
        console.error(❌ Error al instalar en :, err.message);
      }
    }
  }

  console.log('\n========================================================');
  console.log('🎉 ¡Instalación completada con éxito!');
  console.log('El agente ya reconoce la skill de forma automática.');
  console.log('========================================================\n');

  rl.close();
}

main().catch((err) => {
  console.error('Error durante la instalación:', err);
  rl.close();
  process.exit(1);
});
