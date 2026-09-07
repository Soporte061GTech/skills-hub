#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const USER_HOME = process.env.USERPROFILE || process.env.HOME || '';

const TARGET_AGENTS = [
  {
    id: 'antigravity',
    name: 'Google Antigravity (AGY)',
    desc: '%USERPROFILE%\.gemini\antigravity\skills',
    getPath: () => path.join(USER_HOME, '.gemini', 'antigravity', 'skills')
  },
  {
    id: 'claude',
    name: 'Claude (Claude Code / Desktop)',
    desc: '~/.claude/skills',
    getPath: () => path.join(USER_HOME, '.claude', 'skills')
  },
  {
    id: 'codex',
    name: 'Codex / OpenAI Assistant',
    desc: '~/.codex/skills',
    getPath: () => path.join(USER_HOME, '.codex', 'skills')
  },
  {
    id: 'opencode',
    name: 'OpenCode / Roo Code / Cursor',
    desc: '~/.opencode/skills',
    getPath: () => path.join(USER_HOME, '.opencode', 'skills')
  }
];

const SKILLS_DIR = path.join(__dirname, '..', 'skills');

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

function getAvailableSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR).filter(file => fs.statSync(path.join(SKILLS_DIR, file)).isDirectory());
}

function promptCheckboxList(title, items) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      return resolve(items.map((_, i) => i));
    }

    let cursor = 0;
    const checked = new Array(items.length).fill(true);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    function render() {
      console.clear();
      console.log('========================================================');
      console.log('       SKILLS-HUB: Instalador Universal de Skills        ');
      console.log('========================================================\n');
      console.log(title);
      console.log('(Usa [arriba/abajo] para moverte, [Espacio] para marcar, [A] para todos, [Enter] para continuar)\n');

      items.forEach((item, index) => {
        const isCursor = index === cursor ? '>' : ' ';
        const box = checked[index] ? '[*]' : '[ ]';
        const label = typeof item === 'string' ? item : (item.name + ' (' + item.desc + ')');
        console.log(isCursor + ' ' + box + ' ' + label);
      });
    }

    render();

    function onKeypress(str, key) {
      if (key.ctrl && key.name === 'c') {
        process.stdin.setRawMode(false);
        process.exit();
      }
      if (key.name === 'up') {
        cursor = (cursor - 1 + items.length) % items.length;
        render();
      } else if (key.name === 'down') {
        cursor = (cursor + 1) % items.length;
        render();
      } else if (key.name === 'space') {
        checked[cursor] = !checked[cursor];
        render();
      } else if (str && str.toUpperCase() === 'A') {
        const allChecked = checked.every(Boolean);
        checked.fill(!allChecked);
        render();
      } else if (key.name === 'return') {
        process.stdin.removeListener('keypress', onKeypress);
        process.stdin.setRawMode(false);
        console.log('\n');
        const selected = [];
        checked.forEach((isChecked, i) => { if (isChecked) selected.push(i); });
        resolve(selected);
      }
    }
    process.stdin.on('keypress', onKeypress);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isUpdate = args.includes('update') || args.includes('--update') || args.includes('-u');
  const isAll = isUpdate || args.includes('--all') || args.includes('-a');

  const skills = getAvailableSkills();
  if (skills.length === 0) {
    console.error('Error: No se encontraron skills en el directorio /skills.');
    process.exit(1);
  }

  let selectedSkills = [];
  let selectedAgents = [];

  if (isAll) {
    console.log('\nActualizando todas las skills en todos los agentes configurados...\n');
    selectedSkills = skills;
    selectedAgents = TARGET_AGENTS;
  } else {
    const skillIndices = await promptCheckboxList('1. Selecciona las Skills a instalar:', skills);
    if (skillIndices.length === 0) {
      console.log('No se selecciono ninguna skill. Operacion cancelada.');
      process.exit(0);
    }
    selectedSkills = skillIndices.map(i => skills[i]);

    const agentIndices = await promptCheckboxList('2. Selecciona los Agentes destino:', TARGET_AGENTS);
    if (agentIndices.length === 0) {
      console.log('No se selecciono ningun agente. Operacion cancelada.');
      process.exit(0);
    }
    selectedAgents = agentIndices.map(i => TARGET_AGENTS[i]);
  }

  console.log('--------------------------------------------------------');
  console.log((isUpdate ? 'Actualizando' : 'Instalando') + ' skills...');
  console.log('--------------------------------------------------------\n');

  for (const agent of selectedAgents) {
    const destinationRoot = agent.getPath();
    for (const skillName of selectedSkills) {
      const sourceSkillPath = path.join(SKILLS_DIR, skillName);
      const targetSkillPath = path.join(destinationRoot, skillName);
      try {
        copyFolderRecursiveSync(sourceSkillPath, targetSkillPath);
        console.log('[OK] [' + agent.name + '] ' + skillName + ' -> ' + targetSkillPath);
      } catch (err) {
        console.error('[ERROR] Al copiar en ' + agent.name + ':', err.message);
      }
    }
  }

  console.log('\n========================================================');
  console.log('Proceso completado exitosamente.');
  console.log('Las skills estan listas para su uso en los agentes seleccionados.');
  console.log('========================================================\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Error durante la ejecucion:', err);
  process.exit(1);
});