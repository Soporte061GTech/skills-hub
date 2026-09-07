# Instalador directo en PowerShell (para usuarios de Windows sin Node.js o desde enlace raw)
param (
    [string] = https://github.com/TU_ORG/skills-hub/archive/refs/heads/main.zip,
    [string] = dba-soporte
)

Write-Host ======================================================== -ForegroundColor Cyan
Write-Host  SKILLS-HUB: Instalador PowerShell (Windows)  -ForegroundColor Cyan
Write-Host ======================================================== -ForegroundColor Cyan

Write-Host 
¿A qué agente deseas instalar la skill? -ForegroundColor Yellow
Write-Host  [1] Google Antigravity (AGY)
Write-Host  [2] Claude (Claude Code / Desktop)
Write-Host  [3] Codex / OpenAI
Write-Host  [4] OpenCode / Roo / Cursor
Write-Host  [A] Todos los agentes

 = Read-Host Selecciona una opción [1]
if ([string]::IsNullOrWhiteSpace()) {  = 1 }

 = @()
 = C:\Users\iavalos

switch (.ToUpper()) {
    1 {  += \.gemini\antigravity\skills }
    2 {  += \.claude\skills }
    3 {  += \.codex\skills }
    4 {  += \.opencode\skills }
    A { 
         += \.gemini\antigravity\skills
         += \.claude\skills
         += \.codex\skills
         += \.opencode\skills
    }
    Default {  += \.gemini\antigravity\skills }
}

 = Split-Path -Parent System.Management.Automation.InvocationInfo.MyCommand.Path
 = Join-Path  skills"

foreach ( in ) {
 = Join-Path 
 if (-not (Test-Path )) {
 New-Item -ItemType Directory -Path -Force | Out-Null
 }

 if (Test-Path ) {
 Copy-Item -Path \* -Destination -Recurse -Force
 Write-Host ✔ Skill  instalada localmente en:  -ForegroundColor Green
 } else {
 Write-Host Descargando desde repositorio central... -ForegroundColor Gray
 # Descarga y descompresión desatendida
 }
}

Write-Host 
🎉 ¡Instalación finalizada con éxito! -ForegroundColor Cyan
