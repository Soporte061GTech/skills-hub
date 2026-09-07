#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Codigos ANSI para colores en terminal (compatibles con Windows 10/11 y Linux/Mac)
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  white: '\x1b[37m'
};

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

function getSkillVersion(skillPath) {
  const skillFile = path.join(skillPath, 'SKILL.md');
  if (!fs.existsSync(skillFile)) return null;
  try {
    const content = fs.readFileSync(skillFile, 'utf8');
    const match = content.match(/version:\s*([0-9.]+)/i);
    return match ? match[1].trim() : '1.0.0';
  } catch (e) {
    return null;
  }
}

function findInstalledSkills() {
  const installed = [];
  for (const agent of TARGET_AGENTS) {
    const agentSkillsPath = agent.getPath();
    if (fs.existsSync(agentSkillsPath)) {
      const entries = fs.readdirSync(agentSkillsPath);
      for (const entry of entries) {
        const fullPath = path.join(agentSkillsPath, entry);
        if (fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'SKILL.md'))) {
          installed.push({
            agent,
            skillName: entry,
            localPath: fullPath,
            version: getSkillVersion(fullPath)
          });
        }
      }
    }
  }
  return installed;
}

function isSkillInstalledAnywhere(skillName) {
  for (const agent of TARGET_AGENTS) {
    const candidate = path.join(agent.getPath(), skillName);
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'SKILL.md'))) {
      return true;
    }
  }
  return false;
}

function promptCheckboxList(title, items, defaultCheckedIndices = null) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      return resolve(defaultCheckedIndices || items.map((_, i) => i));
    }

    let cursor = 0;
    const checked = new Array(items.length).fill(false);
    if (defaultCheckedIndices) {
      defaultCheckedIndices.forEach(i => { if (i >= 0 && i < checked.length) checked[i] = true; });
    } else {
      checked.fill(true);
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    function render() {
      console.clear();
      console.log(colors.cyan + colors.bold + '========================================================' + colors.reset);
      console.log(colors.cyan + colors.bold + '       SKILLS-HUB: Gestor de Skills para Agentes         ' + colors.reset);
      console.log(colors.cyan + colors.bold + '========================================================\n' + colors.reset);
      console.log(colors.white + colors.bold + title + colors.reset);
      console.log(colors.gray + '(Usa [arriba/abajo] para moverte, [Espacio] para marcar, [A] para todos, [Enter] para continuar)\n' + colors.reset);

      items.forEach((item, index) => {
        const isCursor = index === cursor ? (colors.yellow + '>' + colors.reset) : ' ';
        const box = checked[index] ? (colors.green + '[*]' + colors.reset) : (colors.gray + '[ ]' + colors.reset);
        let label = '';
        if (typeof item === 'string') {
          label = item;
        } else if (item.label) {
          label = item.label;
        } else {
          label = item.name + ' (' + item.desc + ')';
        }
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

async function handleUpdate() {
  console.clear();
  console.log(colors.cyan + colors.bold + '========================================================' + colors.reset);
  console.log(colors.cyan + colors.bold + '       SKILLS-HUB: Busqueda de Actualizaciones           ' + colors.reset);
  console.log(colors.cyan + colors.bold + '========================================================\n' + colors.reset);

  const installedList = findInstalledSkills();
  if (installedList.length === 0) {
    console.log(colors.yellow + 'No se detectaron skills instaladas actualmente en el equipo.' + colors.reset);
    console.log(colors.gray + 'Ejecuta sin argumentos para instalar una nueva skill: npx github:aquivalootro/skills-hub\n' + colors.reset);
    process.exit(0);
  }

  const availableSkills = getAvailableSkills();
  const updatable = [];

  for (const item of installedList) {
    if (!availableSkills.includes(item.skillName)) continue;
    const repoPath = path.join(SKILLS_DIR, item.skillName);
    const repoVersion = getSkillVersion(repoPath);
    const hasUpdate = repoVersion && item.version && repoVersion !== item.version;
    updatable.push({
      ...item,
      repoVersion,
      repoPath,
      hasUpdate
    });
  }

  const itemsWithChanges = updatable.filter(u => u.hasUpdate);

  if (itemsWithChanges.length === 0) {
    console.log(colors.green + colors.bold + '[OK] Todas las skills instaladas estan al dia en su ultima version.' + colors.reset);
    updatable.forEach(u => {
      console.log(colors.gray + '  - ' + u.skillName + ' (v' + (u.version || '1.0.0') + ') en ' + u.agent.name + colors.reset);
    });
    console.log('\n');
    process.exit(0);
  }

  console.log(colors.yellow + 'Se detectaron actualizaciones disponibles:\n' + colors.reset);
  const selectionList = itemsWithChanges.map(u => ({
    label: u.skillName + ' (' + u.agent.name + ') v' + u.version + ' -> ' + colors.green + 'v' + u.repoVersion + colors.reset,
    data: u
  }));

  const selectedIndices = await promptCheckboxList('Selecciona las skills que deseas actualizar:', selectionList);
  if (selectedIndices.length === 0) {
    console.log(colors.gray + 'No se selecciono ninguna actualizacion. Proceso terminado.\n' + colors.reset);
    process.exit(0);
  }

  console.log(colors.cyan + '--------------------------------------------------------' + colors.reset);
  console.log(colors.cyan + 'Aplicando actualizaciones...' + colors.reset);
  console.log(colors.cyan + '--------------------------------------------------------\n' + colors.reset);

  for (const idx of selectedIndices) {
    const target = selectionList[idx].data;
    try {
      copyFolderRecursiveSync(target.repoPath, target.localPath);
      console.log(colors.green + '[OK] ' + colors.white + target.skillName + colors.gray + ' actualizada a v' + target.repoVersion + ' en ' + target.agent.name + colors.reset);
    } catch (e) {
      console.error(colors.red + '[ERROR] Al actualizar ' + target.skillName + ': ' + e.message + colors.reset);
    }
  }

  console.log('\n' + colors.green + colors.bold + 'Actualizacion finalizada con exito.\n' + colors.reset);
  process.exit(0);
}

async function handleInstall() {
  const skills = getAvailableSkills();
  if (skills.length === 0) {
    console.error(colors.red + 'Error: No se encontraron skills en el directorio /skills.' + colors.reset);
    process.exit(1);
  }

  // Identificar el estado de instalacion de cada skill para mostrarlo en pantalla
  const skillListItems = skills.map(skillName => {
    const installed = isSkillInstalledAnywhere(skillName);
    const version = getSkillVersion(path.join(SKILLS_DIR, skillName)) || '1.0.0';
    return {
      name: skillName,
      installed,
      label: skillName + ' (v' + version + ') ' + (installed ? (colors.cyan + '[Ya instalada]' + colors.reset) : (colors.yellow + '[Nueva]' + colors.reset))
    };
  });

  // Por defecto marcar solo las NUEVAS (no instaladas)
  const defaultChecked = [];
  skillListItems.forEach((item, index) => {
    if (!item.installed) defaultChecked.push(index);
  });
  if (defaultChecked.length === 0) {
    // Si todas ya estan instaladas, dejarlas seleccionables
    defaultChecked.push(0);
  }

  const skillIndices = await promptCheckboxList('1. Selecciona las Skills que deseas instalar:', skillListItems, defaultChecked);
  if (skillIndices.length === 0) {
    console.log(colors.yellow + 'No se selecciono ninguna skill. Operacion cancelada.\n' + colors.reset);
    process.exit(0);
  }
  const selectedSkills = skillIndices.map(i => skillListItems[i].name);

  const agentIndices = await promptCheckboxList('2. Selecciona los Agentes destino:', TARGET_AGENTS);
  if (agentIndices.length === 0) {
    console.log(colors.yellow + 'No se selecciono ningun agente. Operacion cancelada.\n' + colors.reset);
    process.exit(0);
  }
  const selectedAgents = agentIndices.map(i => TARGET_AGENTS[i]);

  console.log(colors.cyan + '--------------------------------------------------------' + colors.reset);
  console.log(colors.cyan + 'Instalando skills seleccionadas...' + colors.reset);
  console.log(colors.cyan + '--------------------------------------------------------\n' + colors.reset);

  for (const agent of selectedAgents) {
    const destinationRoot = agent.getPath();
    for (const skillName of selectedSkills) {
      const sourceSkillPath = path.join(SKILLS_DIR, skillName);
      const targetSkillPath = path.join(destinationRoot, skillName);
      try {
        copyFolderRecursiveSync(sourceSkillPath, targetSkillPath);
        console.log(colors.green + '[OK] [' + agent.name + '] ' + colors.white + skillName + colors.gray + ' -> ' + targetSkillPath + colors.reset);
      } catch (err) {
        console.error(colors.red + '[ERROR] Al copiar en ' + agent.name + ': ' + err.message + colors.reset);
      }
    }
  }

  console.log('\n' + colors.cyan + colors.bold + '========================================================' + colors.reset);
  console.log(colors.green + colors.bold + 'Proceso completado exitosamente.' + colors.reset);
  console.log(colors.gray + 'Las skills estan listas para su uso en los agentes seleccionados.' + colors.reset);
  console.log(colors.cyan + colors.bold + '========================================================\n' + colors.reset);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);
  const isUpdate = args.includes('update') || args.includes('--update') || args.includes('-u');

  if (isUpdate) {
    await handleUpdate();
  } else {
    await handleInstall();
  }
}

main().catch(err => {
  console.error(colors.red + 'Error durante la ejecucion: ' + err.message + colors.reset);
  process.exit(1);
});