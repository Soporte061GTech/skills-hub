#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

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
    desc: '%USERPROFILE%\\.gemini\\config\\plugins\\skills-hub\\skills',
    getPath: () => path.join(USER_HOME, '.gemini', 'config', 'plugins', 'skills-hub', 'skills'),
    isDetected: () => fs.existsSync(path.join(USER_HOME, '.gemini'))
  },
  {
    id: 'claude',
    name: 'Claude (Claude Code / Desktop)',
    desc: '~/.claude/skills',
    getPath: () => path.join(USER_HOME, '.claude', 'skills'),
    isDetected: () => fs.existsSync(path.join(USER_HOME, '.claude'))
  },
  {
    id: 'codex',
    name: 'Codex / OpenAI Assistant',
    desc: '~/.codex/skills',
    getPath: () => path.join(USER_HOME, '.codex', 'skills'),
    isDetected: () => fs.existsSync(path.join(USER_HOME, '.codex'))
  },
  {
    id: 'opencode',
    name: 'OpenCode / Roo Code / Cursor',
    desc: '~/.opencode/skills',
    getPath: () => path.join(USER_HOME, '.opencode', 'skills'),
    isDetected: () => fs.existsSync(path.join(USER_HOME, '.opencode')) || fs.existsSync(path.join(USER_HOME, '.cursor')) || fs.existsSync(path.join(USER_HOME, '.roo'))
  },
  {
    id: 'kilocode',
    name: 'Kilo Code',
    desc: '~/.kilo/skills',
    getPath: () => path.join(USER_HOME, '.kilo', 'skills'),
    isDetected: () => fs.existsSync(path.join(USER_HOME, '.kilo')) || fs.existsSync(path.join(USER_HOME, '.config', 'kilo'))
  }
];

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const REGISTRY_FILE = path.join(__dirname, '..', 'skills-registry.json');

function getManagedSkillNames() {
  const names = new Set();
  if (fs.existsSync(SKILLS_DIR)) {
    fs.readdirSync(SKILLS_DIR).forEach(f => {
      if (fs.statSync(path.join(SKILLS_DIR, f)).isDirectory()) names.add(f);
    });
  }
  if (fs.existsSync(REGISTRY_FILE)) {
    try {
      const reg = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
      if (Array.isArray(reg.activeSkills)) reg.activeSkills.forEach(s => names.add(s));
      if (Array.isArray(reg.retiredSkills)) reg.retiredSkills.forEach(s => names.add(s));
    } catch (e) {}
  }
  return Array.from(names);
}

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

function findInstalledSkills(onlyManaged = false) {
  const managedNames = getManagedSkillNames();
  const installed = [];
  for (const agent of TARGET_AGENTS) {
    const agentSkillsPath = agent.getPath();
    if (fs.existsSync(agentSkillsPath)) {
      const entries = fs.readdirSync(agentSkillsPath);
      for (const entry of entries) {
        if (onlyManaged && !managedNames.includes(entry)) continue;
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

function promptSingleChoice(title, options) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) return resolve(0);
    let cursor = 0;
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    function render() {
      console.clear();
      console.log(colors.cyan + colors.bold + '========================================================' + colors.reset);
      console.log(colors.cyan + colors.bold + '       SKILLS-HUB: Desinstalar Skills                    ' + colors.reset);
      console.log(colors.cyan + colors.bold + '========================================================\n' + colors.reset);
      console.log(colors.white + colors.bold + title + colors.reset);
      console.log(colors.gray + '(Usa [arriba/abajo] para moverte, [Enter] para seleccionar)\n' + colors.reset);

      options.forEach((opt, idx) => {
        const isCursor = idx === cursor ? (colors.yellow + '> (o)' + colors.reset) : (colors.gray + '  ( )' + colors.reset);
        console.log(isCursor + ' ' + opt);
      });
    }

    render();

    function onKeypress(str, key) {
      if (key.ctrl && key.name === 'c') {
        process.stdin.setRawMode(false);
        process.exit();
      }
      if (key.name === 'up') {
        cursor = (cursor - 1 + options.length) % options.length;
        render();
      } else if (key.name === 'down') {
        cursor = (cursor + 1) % options.length;
        render();
      } else if (key.name === 'return') {
        process.stdin.removeListener('keypress', onKeypress);
        process.stdin.setRawMode(false);
        console.log('\n');
        resolve(cursor);
      }
    }
    process.stdin.on('keypress', onKeypress);
  });
}

async function handleUninstall() {
  const installedManaged = findInstalledSkills(true);
  if (installedManaged.length === 0) {
    console.log(colors.yellow + 'No se detectaron skills administradas por este paquete instaladas en ningun agente.\n' + colors.reset);
    process.exit(0);
  }

  const modeChoice = await promptSingleChoice('Elige el modo de desinstalacion:', [
    'Desinstalar por Skill completa (elimina de TODOS los agentes)',
    'Desinstalar seleccionando Agente especifico (agrupado por skill)'
  ]);

  if (modeChoice === 0) {
    // Modo 1: Por Skill completa
    const uniqueSkills = Array.from(new Set(installedManaged.map(i => i.skillName)));
    const skillItems = uniqueSkills.map(skillName => {
      const agentsFound = installedManaged.filter(i => i.skillName === skillName).map(i => i.agent.name).join(', ');
      return {
        skillName,
        label: skillName + colors.gray + ' [Presente en: ' + agentsFound + ']' + colors.reset
      };
    });

    const selected = await promptCheckboxList('Selecciona la(s) Skill(s) a eliminar de TODOS los agentes:', skillItems, []);
    if (selected.length === 0) {
      console.log(colors.gray + 'No se selecciono ninguna skill. Operacion cancelada.\n' + colors.reset);
      process.exit(0);
    }
    const skillsToRemove = selected.map(idx => skillItems[idx].skillName);

    console.log(colors.red + '--------------------------------------------------------' + colors.reset);
    console.log(colors.red + 'Eliminando skills de todos los agentes...' + colors.reset);
    console.log(colors.red + '--------------------------------------------------------\n' + colors.reset);

    for (const item of installedManaged) {
      if (skillsToRemove.includes(item.skillName)) {
        try {
          fs.rmSync(item.localPath, { recursive: true, force: true });
          console.log(colors.green + '[ELIMINADA] ' + colors.white + item.skillName + colors.gray + ' de ' + item.agent.name + colors.reset);
        } catch (e) {
          console.error(colors.red + '[ERROR] Al eliminar ' + item.skillName + ': ' + e.message + colors.reset);
        }
      }
    }
  } else {
    // Modo 2: Seleccionando por agente especifico, agrupado y ordenado por Skill
    installedManaged.sort((a, b) => a.skillName.localeCompare(b.skillName));
    const items = installedManaged.map(item => ({
      label: colors.cyan + item.skillName + colors.reset + ' -> ' + item.agent.name + colors.gray + ' (' + item.localPath + ')' + colors.reset,
      data: item
    }));

    const selectedIndices = await promptCheckboxList('Selecciona los agentes puntuales donde deseas eliminar la skill:', items, []);
    if (selectedIndices.length === 0) {
      console.log(colors.gray + 'No se selecciono ninguna opcion. Operacion cancelada.\n' + colors.reset);
      process.exit(0);
    }

    console.log(colors.red + '--------------------------------------------------------' + colors.reset);
    console.log(colors.red + 'Eliminando de agentes seleccionados...' + colors.reset);
    console.log(colors.red + '--------------------------------------------------------\n' + colors.reset);

    for (const idx of selectedIndices) {
      const target = items[idx].data;
      try {
        fs.rmSync(target.localPath, { recursive: true, force: true });
        console.log(colors.green + '[ELIMINADA] ' + colors.white + target.skillName + colors.gray + ' de ' + target.agent.name + colors.reset);
      } catch (e) {
        console.error(colors.red + '[ERROR] Al eliminar ' + target.skillName + ': ' + e.message + colors.reset);
      }
    }
  }

  console.log('\n' + colors.green + colors.bold + 'Proceso de desinstalacion finalizado.\n' + colors.reset);
  process.exit(0);
}

async function handleUpdate() {
  console.clear();
  console.log(colors.cyan + colors.bold + '========================================================' + colors.reset);
  console.log(colors.cyan + colors.bold + '       SKILLS-HUB: Busqueda de Actualizaciones           ' + colors.reset);
  console.log(colors.cyan + colors.bold + '========================================================\n' + colors.reset);

  const installedList = findInstalledSkills(true);
  if (installedList.length === 0) {
    console.log(colors.yellow + 'No se detectaron skills de este catalogo instaladas en el equipo.' + colors.reset);
    console.log(colors.gray + 'Ejecuta sin argumentos para instalar: npx github:TU-ORGANIZACION/skills-hub\n' + colors.reset);
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
    console.log(colors.green + colors.bold + '[OK] Todas las skills administradas estan al dia en su ultima version.' + colors.reset);
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

  const skillListItems = skills.map(skillName => {
    const installed = isSkillInstalledAnywhere(skillName);
    const version = getSkillVersion(path.join(SKILLS_DIR, skillName)) || '1.0.0';
    return {
      name: skillName,
      installed,
      label: skillName + ' (v' + version + ') ' + (installed ? (colors.cyan + '[Ya instalada]' + colors.reset) : (colors.yellow + '[Nueva]' + colors.reset))
    };
  });

  const defaultChecked = [];
  skillListItems.forEach((item, index) => {
    if (!item.installed) defaultChecked.push(index);
  });
  if (defaultChecked.length === 0) {
    defaultChecked.push(0);
  }

  const skillIndices = await promptCheckboxList('1. Selecciona las Skills que deseas instalar:', skillListItems, defaultChecked);
  if (skillIndices.length === 0) {
    console.log(colors.yellow + 'No se selecciono ninguna skill. Operacion cancelada.\n' + colors.reset);
    process.exit(0);
  }
  const selectedSkills = skillIndices.map(i => skillListItems[i].name);

  const agentItems = TARGET_AGENTS.map(agent => {
    const detected = agent.isDetected();
    return {
      agent,
      detected,
      label: agent.name + ' ' + (detected ? (colors.green + '[Detectado en equipo]' + colors.reset) : (colors.gray + '[No detectado]' + colors.reset)) + colors.gray + ' (' + agent.desc + ')' + colors.reset
    };
  });

  const defaultCheckedAgents = [];
  agentItems.forEach((item, index) => {
    if (item.detected) defaultCheckedAgents.push(index);
  });
  if (defaultCheckedAgents.length === 0) {
    defaultCheckedAgents.push(0);
  }

  const agentIndices = await promptCheckboxList('2. Selecciona los Agentes destino:', agentItems, defaultCheckedAgents);
  if (agentIndices.length === 0) {
    console.log(colors.yellow + 'No se selecciono ningun agente. Operacion cancelada.\n' + colors.reset);
    process.exit(0);
  }
  const selectedAgents = agentIndices.map(i => agentItems[i].agent);

  console.log(colors.cyan + '--------------------------------------------------------' + colors.reset);
  console.log(colors.cyan + 'Instalando skills seleccionadas...' + colors.reset);
  console.log(colors.cyan + '--------------------------------------------------------\n' + colors.reset);

  for (const agent of selectedAgents) {
    const destinationRoot = agent.getPath();
    if (agent.id === 'antigravity') {
      const pluginDir = path.dirname(destinationRoot);
      const pluginJsonPath = path.join(pluginDir, 'plugin.json');
      if (!fs.existsSync(pluginJsonPath)) {
        fs.mkdirSync(pluginDir, { recursive: true });
        fs.writeFileSync(pluginJsonPath, JSON.stringify({
          name: 'skills-hub',
          version: '1.0.0',
          description: 'Catalogo corporativo de skills para agentes de IA'
        }, null, 2) + '\n', 'utf8');
      }
    }
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
  const isUninstall = args.includes('uninstall') || args.includes('remove') || args.includes('rm');

  if (isUninstall) {
    await handleUninstall();
  } else if (isUpdate) {
    await handleUpdate();
  } else {
    await handleInstall();
  }
}

main().catch(err => {
  console.error(colors.red + 'Error durante la ejecucion: ' + err.message + colors.reset);
  process.exit(1);
});