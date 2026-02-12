# ============================================
# SCRIPT DE TEST - WorkOn API Endpoints
# Exécute: .\test-api-endpoints.ps1
# ============================================

$baseUrl = "https://workon-backend-production-8908.up.railway.app"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  TEST DES ENDPOINTS WORKON API" -ForegroundColor Cyan
Write-Host "  Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# TEST 1: Health Check
# ============================================
Write-Host "[1/10] Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/healthz" -Method GET -TimeoutSec 10
    Write-Host "  ✅ /healthz OK" -ForegroundColor Green
} catch {
    Write-Host "  ❌ /healthz ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# TEST 2: Compliance Versions (public)
# ============================================
Write-Host "[2/10] Compliance Versions (public)..." -ForegroundColor Yellow
try {
    $versions = Invoke-RestMethod -Uri "$baseUrl/api/v1/compliance/versions" -Method GET -TimeoutSec 10
    Write-Host "  ✅ /compliance/versions OK - Terms: $($versions.versions.TERMS), Privacy: $($versions.versions.PRIVACY)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ /compliance/versions ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# TEST 3: Metrics Regions (public)
# ============================================
Write-Host "[3/10] Metrics Regions (public)..." -ForegroundColor Yellow
try {
    $regions = Invoke-RestMethod -Uri "$baseUrl/api/v1/metrics/regions" -Method GET -TimeoutSec 10
    Write-Host "  ✅ /metrics/regions OK - $($regions.Count) régions" -ForegroundColor Green
} catch {
    Write-Host "  ❌ /metrics/regions ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# TEST 4: Metrics Ratio (public)
# ============================================
Write-Host "[4/10] Metrics Ratio (public)..." -ForegroundColor Yellow
try {
    $ratio = Invoke-RestMethod -Uri "$baseUrl/api/v1/metrics/ratio" -Method GET -TimeoutSec 10
    Write-Host "  ✅ /metrics/ratio OK - Workers: $($ratio.workers), Employers: $($ratio.employers)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ /metrics/ratio ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# TEST 5: Register (doit retourner 400 sans body)
# ============================================
Write-Host "[5/10] Auth Register (validation)..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/register" -Method POST -ContentType "application/json" -Body "{}" -TimeoutSec 10
    Write-Host "  ⚠️ /auth/register a accepté un body vide (inattendu)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "  ✅ /auth/register OK - Validation active (400 Bad Request)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ /auth/register Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# ============================================
# TEST 6: Login (doit retourner 401 sans creds)
# ============================================
Write-Host "[6/10] Auth Login (validation)..." -ForegroundColor Yellow
try {
    $body = @{ email = "test@test.com"; password = "wrongpassword" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 10
    Write-Host "  ⚠️ /auth/login a accepté des credentials invalides" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  ✅ /auth/login OK - Auth active (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ /auth/login Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# ============================================
# TEST 7: Protected endpoint sans token
# ============================================
Write-Host "[7/10] Missions (protected, no token)..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/api/v1/missions-local/my-missions" -Method GET -TimeoutSec 10
    Write-Host "  ❌ /missions-local/my-missions a répondu sans token (DANGER!)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  ✅ /missions-local/my-missions OK - Protection active (401)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# ============================================
# TEST 8: Notifications sans token
# ============================================
Write-Host "[8/10] Notifications (protected, no token)..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/api/v1/notifications" -Method GET -TimeoutSec 10
    Write-Host "  ❌ /notifications a répondu sans token (DANGER!)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  ✅ /notifications OK - Protection active (401)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# ============================================
# TEST 9: Swagger docs
# ============================================
Write-Host "[9/10] Swagger Documentation..." -ForegroundColor Yellow
try {
    $swagger = Invoke-WebRequest -Uri "$baseUrl/api/docs" -Method GET -TimeoutSec 10
    if ($swagger.StatusCode -eq 200) {
        Write-Host "  ✅ /api/docs OK - Swagger accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠️ /api/docs Status: $($_.Exception.Response.StatusCode) (peut être désactivé en prod)" -ForegroundColor Yellow
}

# ============================================
# TEST 10: Readiness
# ============================================
Write-Host "[10/10] Readiness Check..." -ForegroundColor Yellow
try {
    $ready = Invoke-RestMethod -Uri "$baseUrl/readyz" -Method GET -TimeoutSec 10
    Write-Host "  ✅ /readyz OK - Backend prêt" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ /readyz Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
}

# ============================================
# RÉSUMÉ
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ DES TESTS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si tous les tests sont verts:" -ForegroundColor White
Write-Host "  → Le backend est 100% fonctionnel" -ForegroundColor Green
Write-Host "  → Le problème est dans FlutterFlow" -ForegroundColor Yellow
Write-Host ""
Write-Host "Prochaine étape:" -ForegroundColor White
Write-Host "  1. Ouvre FlutterFlow" -ForegroundColor White
Write-Host "  2. Va dans API Calls" -ForegroundColor White
Write-Host "  3. Suis le guide: API_CALLS_COPYPASTE.md" -ForegroundColor White
Write-Host ""
