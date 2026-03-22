#!/usr/bin/env pwsh
# ============================================================
# WorkOn — Script de démarrage LOCAL (PowerShell)
# ============================================================
# Usage : .\start-local.ps1
# ============================================================

Write-Host ""
Write-Host "WorkOn — Local Development Startup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier Docker
Write-Host "[1/4] Vérification Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "      Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "      ERREUR: Docker n'est pas installé ou démarré." -ForegroundColor Red
    exit 1
}

# 2. Démarrer PostgreSQL
Write-Host "[2/4] Démarrage PostgreSQL..." -ForegroundColor Yellow
docker compose up -d postgres 2>&1 | Out-Null
Start-Sleep -Seconds 3

$status = docker inspect --format='{{.State.Health.Status}}' workon-postgres 2>&1
$retries = 0
while ($status -ne "healthy" -and $retries -lt 10) {
    Write-Host "      En attente de PostgreSQL... ($retries/10)" -ForegroundColor DarkYellow
    Start-Sleep -Seconds 2
    $status = docker inspect --format='{{.State.Health.Status}}' workon-postgres 2>&1
    $retries++
}

if ($status -eq "healthy") {
    Write-Host "      PostgreSQL: OK (healthy) sur port 5432" -ForegroundColor Green
} else {
    Write-Host "      AVERTISSEMENT: PostgreSQL pas encore healthy ($status)" -ForegroundColor Yellow
}

# 3. Appliquer les migrations Prisma
Write-Host "[3/4] Migrations Prisma..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://workon:workon_password@localhost:5432/workon?schema=public"
$result = npx prisma migrate deploy 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "      Migrations: OK" -ForegroundColor Green
} else {
    Write-Host "      AVERTISSEMENT: Erreur migrations (peut être déjà appliquées)" -ForegroundColor Yellow
}

# 4. Démarrer le backend NestJS
Write-Host "[4/4] Démarrage Backend NestJS..." -ForegroundColor Yellow
Write-Host ""
Write-Host "      API:     http://localhost:3000/api/v1" -ForegroundColor Cyan
Write-Host "      Health:  http://localhost:3000/health" -ForegroundColor Cyan
Write-Host "      Swagger: http://localhost:3000/api/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Flutter dev command:" -ForegroundColor Magenta
Write-Host "  flutter run --dart-define=APP_ENV=dev" -ForegroundColor White
Write-Host ""
Write-Host "  Pour un appareil physique, ajoutez votre IP locale:" -ForegroundColor Magenta
Write-Host "  flutter run --dart-define=APP_ENV=dev --dart-define=LOCAL_IP=192.168.x.x" -ForegroundColor White
Write-Host ""
Write-Host "Ctrl+C pour arrêter le backend." -ForegroundColor DarkGray
Write-Host ""

# Variables d'environnement pour le backend
$env:NODE_ENV         = "development"
$env:PORT             = "3000"
$env:JWT_SECRET       = "workon-local-jwt-secret-dev-min-32-chars-ok"
$env:JWT_EXPIRES_IN   = "7d"
$env:JWT_REFRESH_SECRET    = "workon-local-refresh-secret-dev-min-32-chars-ok"
$env:JWT_REFRESH_EXPIRES_IN = "30d"
$env:ENABLE_SWAGGER_PROD   = "true"
$env:CORS_ORIGIN           = "*"
$env:LOG_LEVEL             = "debug"
$env:BCRYPT_ROUNDS         = "10"
$env:THROTTLE_TTL          = "60"
$env:THROTTLE_LIMIT        = "200"

# Lancer via dist (plus rapide) ou via ts (hot-reload)
$useHotReload = $args -contains "--watch"
if ($useHotReload) {
    Write-Host "Mode: Hot-reload (npm run start:dev)" -ForegroundColor DarkCyan
    npm run start:dev
} else {
    Write-Host "Mode: Production dist (node dist/main.js)" -ForegroundColor DarkCyan
    node dist/main.js
}
