#!/usr/bin/env node
'use strict';
/*
 * dbtools — instalador portable
 * Copia las skills y los agentes del paquete dbtools a las tools de IA:
 *   OpenCode, Kilo Code, Claude Code, Gemini CLI y Codex CLI.
 *
 * Uso:
 *   node install.js [target...] [opciones]
 *
 * targets:  opencode | kilocode | claude | gemini | codex | all   (por defecto: all)
 * opciones:
 *   --global            instalar a nivel de usuario (por defecto)
 *   --project <dir>     instalar dentro de un proyecto
 *   --dry-run           solo previsualizar, sin escribir
 *   --no-overwrite      no sobrescribir archivos existentes
 *   --help, -h          esta ayuda
 *
 * Ejemplos:
 *   node install.js                       # todo, global
 *   node install.js opencode kilocode    # solo esas dos
 *   node install.js --project .           # todo, en el proyecto actual
 *   node install.js --dry-run             # previsualizar
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const BUNDLE_DIR = __dirname;
const SKILLS_SRC = path.join(BUNDLE_DIR, 'skills');
const AGENTS_SRC = path.join(BUNDLE_DIR, 'agents');
const PERSONA_SRC = path.join(BUNDLE_DIR, 'orchestrator-prompt.md');
const HOME = os.homedir();

const KNOWN_TARGETS = ['opencode', 'kilocode', 'claude', 'gemini', 'codex'];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function usage() {
  console.log(`dbtools — instalador portable de skills y agentes SQL Server

Uso:
  node install.js [target...] [opciones]

targets:  opencode | kilocode | claude | gemini | codex | all   (por defecto: all)

opciones:
  --global            instalar a nivel de usuario (por defecto)
  --project <dir>     instalar dentro de un proyecto
  --dry-run           solo previsualizar, sin escribir
  --no-overwrite      no sobrescribir archivos existentes
  --help, -h          esta ayuda
`);
}

function parseArgs(argv) {
  const opts = { targets: [], scope: 'global', projectDir: null, dryRun: false, overwrite: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === 'all') opts.targets = KNOWN_TARGETS.slice();
    else if (KNOWN_TARGETS.includes(a)) { if (!opts.targets.includes(a)) opts.targets.push(a); }
    else if (a === '--global') opts.scope = 'global';
    else if (a === '--project') { opts.scope = 'project'; opts.projectDir = path.resolve(argv[++i] || '.'); }
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--no-overwrite') opts.overwrite = false;
    else if (a === '--help' || a === '-h') { usage(); process.exit(0); }
    else { console.error('Argumento desconocido: ' + a); usage(); process.exit(2); }
  }
  if (opts.targets.length === 0) opts.targets = KNOWN_TARGETS.slice();
  return opts;
}

// ---------------------------------------------------------------------------
// Utilidades de copia
// ---------------------------------------------------------------------------
function ensureDir(dir) {
  if (!opts.dryRun) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dst, overwrite) {
  if (!overwrite && fs.existsSync(dst)) return 'skip';
  if (opts.dryRun) return 'write';
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  return 'write';
}

function copyDirRecursive(src, dst, overwrite) {
  const results = [];
  if (!fs.existsSync(src)) return results;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) results.push(...copyDirRecursive(s, d, overwrite));
    else results.push([s, d, copyFile(s, d, overwrite)]);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Frontmatter (para generar agentes Claude Code con formato propio)
// ---------------------------------------------------------------------------
function splitFrontmatter(text) {
  if (!text.startsWith('---')) return { frontmatter: '', body: text.trim() };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { frontmatter: '', body: text.trim() };
  return { frontmatter: text.slice(4, end).trim(), body: text.slice(end + 4).trim() };
}

function frontmatterField(fm, key) {
  const m = fm.match(new RegExp('^' + key + ':\\s*(.*)$', 'm'));
  return m ? m[1].trim() : '';
}

// ---------------------------------------------------------------------------
// Definición de las tools
// ---------------------------------------------------------------------------
const TOOLS = {
  opencode: {
    label: 'OpenCode',
    skillsDir() {
      return opts.scope === 'project'
        ? path.join(opts.projectDir, '.opencode', 'skills')
        : path.join(HOME, '.config', 'opencode', 'skills');
    },
    agentsDir() {
      return opts.scope === 'project'
        ? path.join(opts.projectDir, '.opencode', 'agents')
        : path.join(HOME, '.config', 'opencode', 'agents');
    },
    hasAgents: true,
    claudeFormat: false,
    contextFile: null,
    reloadNote: 'Reinicia la sesión para recargar skills y agentes.',
  },
  kilocode: {
    label: 'Kilo Code',
    skillsDir() {
      return opts.scope === 'project'
        ? path.join(opts.projectDir, '.kilo', 'skills')
        : path.join(HOME, '.kilo', 'skills');
    },
    agentsDir() {
      return opts.scope === 'project'
        ? path.join(opts.projectDir, '.kilo', 'agents')
        : path.join(HOME, '.config', 'kilo', 'agent');
    },
    hasAgents: true,
    claudeFormat: false,
    contextFile: null,
    reloadNote: 'Usa /reload o inicia una sesión nueva.',
  },
  claude: {
    label: 'Claude Code',
    skillsDir() {
      return opts.scope === 'project'
        ? path.join(opts.projectDir, '.claude', 'skills')
        : path.join(HOME, '.claude', 'skills');
    },
    agentsDir() {
      return opts.scope === 'project'
        ? path.join(opts.projectDir, '.claude', 'agents')
        : path.join(HOME, '.claude', 'agents');
    },
    hasAgents: true,
    claudeFormat: true,
    // El "agente principal" de Claude es la memoria CLAUDE.md
    contextFile() {
      return opts.scope === 'project'
        ? path.join(opts.projectDir, 'CLAUDE.md')
        : path.join(HOME, '.claude', 'CLAUDE.md');
    },
    reloadNote: 'Reinicia Claude Code para recargar skills, agentes y CLAUDE.md.',
  },
  gemini: {
    label: 'Gemini CLI',
    skillsDir() {
      return opts.scope === 'project'
        ? path.join(opts.projectDir, '.gemini', 'skills')
        : path.join(HOME, '.gemini', 'skills');
    },
    agentsDir: null,
    hasAgents: false,
    claudeFormat: false,
    // Gemini no tiene subagentes nativos: la persona va en GEMINI.md (solo proyecto)
    contextFile() {
      return opts.scope === 'project' ? path.join(opts.projectDir, 'GEMINI.md') : null;
    },
    reloadNote: 'Verifica con /skills list y /memory reload.',
  },
  codex: {
    label: 'Codex CLI',
    // Codex usa el estándar abierto .agents/skills como ubicación nativa de skills
    // (también lo leen OpenCode/Gemini/Kilo en modo compatibilidad).
    skillsDir() {
      return opts.scope === 'project'
        ? path.join(opts.projectDir, '.agents', 'skills')
        : path.join(HOME, '.agents', 'skills');
    },
    agentsDir: null,
    hasAgents: false,
    claudeFormat: false,
    // Sin subagentes nativos: la persona va en AGENTS.md (auto-detectada por Codex).
    contextFile() {
      return opts.scope === 'project'
        ? path.join(opts.projectDir, 'AGENTS.md')
        : path.join(HOME, '.codex', 'AGENTS.md');
    },
    reloadNote: 'Codex auto-detecta AGENTS.md; skills en .agents/skills.',
  },
};

// ---------------------------------------------------------------------------
// Instalación
// ---------------------------------------------------------------------------
function personaContent() {
  if (!fs.existsSync(PERSONA_SRC)) return '';
  return fs.readFileSync(PERSONA_SRC, 'utf8');
}

function claudeAgentContent(name, content) {
  const { frontmatter, body } = splitFrontmatter(content);
  const description = frontmatterField(frontmatter, 'description');
  // Solo lectura en Claude Code: sin Write/Edit, con lectura + Bash (sqlcmd).
  const tools = 'Read, Grep, Glob, Bash, WebFetch, WebSearch';
  return `---\nname: ${name}\ndescription: ${description}\ntools: ${tools}\n---\n\n${body}\n`;
}

function installSkills(tool) {
  const dst = tool.skillsDir();
  if (!fs.existsSync(SKILLS_SRC)) {
    console.log(`  [aviso] no existe ${SKILLS_SRC}`);
    return 0;
  }
  const results = copyDirRecursive(SKILLS_SRC, dst, opts.overwrite);
  console.log(`  skills -> ${dst}  (${results.length} archivos)`);
  return results.length;
}

function installAgents(tool) {
  if (!tool.hasAgents) return 0;
  const dst = tool.agentsDir();
  if (!fs.existsSync(AGENTS_SRC)) {
    console.log(`  [aviso] no existe ${AGENTS_SRC}`);
    return 0;
  }
  let count = 0;
  for (const f of fs.readdirSync(AGENTS_SRC)) {
    if (!f.endsWith('.md')) continue;
    const src = path.join(AGENTS_SRC, f);
    const out = path.join(dst, f);
    if (tool.claudeFormat) {
      // Escribir con frontmatter Claude (name/description/tools)
      if (!opts.overwrite && fs.existsSync(out)) continue;
      if (!opts.dryRun) {
        fs.mkdirSync(dst, { recursive: true });
        const name = f.replace(/\.md$/, '');
        fs.writeFileSync(out, claudeAgentContent(name, fs.readFileSync(src, 'utf8')));
      }
    } else {
      copyFile(src, out, opts.overwrite);
    }
    count++;
  }
  console.log(`  agents -> ${dst}  (${count} agentes)`);
  return count;
}

function installContext(tool) {
  if (typeof tool.contextFile !== 'function') return 0;
  const file = tool.contextFile();
  if (!file) return 0;
  const content = personaContent();
  if (!content) return 0;
  const block = `<!-- dbtools (instalado por dbtools-portable/install.js) -->\n\n${content}\n`;
  if (!opts.overwrite && fs.existsSync(file)) { console.log(`  contexto -> ${file}  (omitido, ya existe)`); return 0; }
  if (opts.dryRun) { console.log(`  contexto -> ${file}`); return 1; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, block);
  console.log(`  contexto -> ${file}`);
  return 1;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
const opts = parseArgs(process.argv.slice(2));

console.log(`\ndbtools — instalador portable`);
console.log(`Alcance: ${opts.scope === 'project' ? `proyecto (${opts.projectDir})` : 'global (usuario ' + HOME + ')'}`);
console.log(`Modo:    ${opts.dryRun ? 'SIMULACIÓN (--dry-run)' : 'real'}`);
console.log(`Targets: ${opts.targets.map((t) => TOOLS[t].label).join(', ')}`);
console.log('');

for (const id of opts.targets) {
  const tool = TOOLS[id];
  console.log(`== ${tool.label} ==`);
  installSkills(tool);
  installAgents(tool);
  installContext(tool);
  console.log(`  (recarga: ${tool.reloadNote})`);
  console.log('');
}

console.log('Listo. Regla inquebrantable: solo lectura (SELECT + catálogo + DMVs).');
console.log('Usa cuentas de solo lectura (db_datareader/SELECT, ApplicationIntent=ReadOnly).\n');
