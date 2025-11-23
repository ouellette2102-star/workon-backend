# 🔧 Script de Migration Manuelle pour Railway
# 
# Ce script permet d'appliquer les migrations Prisma directement sur Railway PostgreSQL
# depuis votre machine locale.
#
# PRÉREQUIS:
# 1. Railway CLI installé: https://docs.railway.app/develop/cli
# 2. Authentifié: railway login
# 3. Projet lié: cd backend && railway link

Write-Host "`n🔍 DIAGNOSTIC RAILWAY - PRISMA MIGRATIONS" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Vérifier si Railway CLI est installé
Write-Host "1️⃣  Vérification Railway CLI..." -ForegroundColor Yellow
try {
    $railwayVersion = railway --version 2>&1
    Write-Host "   ✅ Railway CLI installé: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Railway CLI non installé!" -ForegroundColor Red
    Write-Host "   Installation: https://docs.railway.app/develop/cli" -ForegroundColor Yellow
    exit 1
}

# Vérifier si on est dans le bon dossier
Write-Host "`n2️⃣  Vérification du dossier..." -ForegroundColor Yellow
if (!(Test-Path "prisma/schema.prisma")) {
    Write-Host "   ❌ Pas dans le dossier backend!" -ForegroundColor Red
    Write-Host "   Exécutez: cd C:\Users\ouell\WorkOnApp\backend" -ForegroundColor Yellow
    exit 1
}
Write-Host "   ✅ Dossier backend correct" -ForegroundColor Green

# Vérifier si les migrations existent
Write-Host "`n3️⃣  Vérification des migrations..." -ForegroundColor Yellow
if (!(Test-Path "prisma/migrations")) {
    Write-Host "   ❌ Dossier migrations manquant!" -ForegroundColor Red
    exit 1
}
$migrations = Get-ChildItem "prisma/migrations" -Directory
Write-Host "   ✅ $($migrations.Count) migration(s) trouvée(s)" -ForegroundColor Green
$migrations | ForEach-Object {
    Write-Host "      - $($_.Name)" -ForegroundColor Gray
}

# Récupérer DATABASE_URL depuis Railway
Write-Host "`n4️⃣  Récupération de DATABASE_URL depuis Railway..." -ForegroundColor Yellow
try {
    $databaseUrl = railway variables get DATABASE_URL 2>&1
    if ($LASTEXITCODE -ne 0 -or !$databaseUrl) {
        Write-Host "   ❌ Impossible de récupérer DATABASE_URL!" -ForegroundColor Red
        Write-Host "   Assurez-vous d'avoir lié le projet: railway link" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "   ✅ DATABASE_URL récupérée" -ForegroundColor Green
    Write-Host "   Connection: $($databaseUrl.Substring(0, 30))..." -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Erreur Railway CLI: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Appliquer les migrations via Railway
Write-Host "`n5️⃣  Application des migrations sur Railway PostgreSQL..." -ForegroundColor Yellow
Write-Host "   Commande: railway run npx prisma migrate deploy" -ForegroundColor Gray
Write-Host ""

try {
    # Exécuter la migration via Railway (connecte à la DB Railway)
    railway run npx prisma migrate deploy
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n   ✅ Migrations appliquées avec succès!" -ForegroundColor Green
    } else {
        Write-Host "`n   ❌ Échec de l'application des migrations (code $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n   ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Vérifier que les tables existent
Write-Host "`n6️⃣  Vérification de la création des tables..." -ForegroundColor Yellow
try {
    $checkQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='local_users'"
    $result = railway run -- psql `$DATABASE_URL -c "$checkQuery" 2>&1
    
    if ($result -match "local_users") {
        Write-Host "   ✅ Table 'local_users' créée avec succès!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Table 'local_users' non trouvée dans le résultat" -ForegroundColor Yellow
        Write-Host "   Résultat: $result" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  Impossible de vérifier (psql non disponible)" -ForegroundColor Yellow
}

# Test de l'inscription
Write-Host "`n7️⃣  Test de l'inscription sur Railway..." -ForegroundColor Yellow
$testEmail = "migration.test.$(Get-Random)@workon.app"
$testBody = @{
    email = $testEmail
    password = "Test123!WorkOn"
    firstName = "Migration"
    lastName = "Test"
    phone = "514"
    city = "MTL"
    role = "worker"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest `
        -Uri "https://workon-backend-production-8908.up.railway.app/api/v1/auth/register" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $testBody `
        -UseBasicParsing
    
    if ($response.StatusCode -eq 201) {
        Write-Host "   ✅ Inscription réussie (201)!" -ForegroundColor Green
        $result = $response.Content | ConvertFrom-Json
        Write-Host "   User créé: $($result.user.email)" -ForegroundColor Green
        Write-Host "   Token: $($result.accessToken.Substring(0, 30))..." -ForegroundColor Gray
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 500) {
        Write-Host "   ❌ Erreur 500 - Migrations non appliquées" -ForegroundColor Red
    } elseif ($statusCode -eq 409) {
        Write-Host "   ⚠️  409 Conflict - Email existe déjà (normal si test répété)" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ Erreur $statusCode" -ForegroundColor Red
    }
}

Write-Host "`n=========================================`n" -ForegroundColor Cyan
Write-Host "✅ SCRIPT TERMINÉ" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "   1. Si migrations OK → Redéployer Railway pour appliquer automatiquement" -ForegroundColor White
Write-Host "   2. Si erreur 500 persiste → Vérifier DATABASE_URL dans Railway Dashboard" -ForegroundColor White
Write-Host "   3. Pousser les modifications: git push origin main" -ForegroundColor White
Write-Host ""

