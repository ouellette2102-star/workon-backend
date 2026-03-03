# ============================================================
# WorkOn Backend - Smoke E2E Tests (F1..F6)
# Lead Engineer validation script - ASCII safe, no emojis
# Usage: .\scripts\smoke-e2e.ps1 [-ApiUrl <url>]
# ============================================================
param(
    [string]$ApiUrl = "https://workon-backend-production-8908.up.railway.app"
)

$ErrorActionPreference = "Continue"
$Global:Passed = 0
$Global:Failed = 0
$Global:Token = ""
$Global:RefreshToken = ""

function Pass { param($label)
    Write-Host "[PASS] $label" -ForegroundColor Green
    $Global:Passed++
}
function Fail { param($label, $detail = "")
    Write-Host "[FAIL] $label  $detail" -ForegroundColor Red
    $Global:Failed++
}
function Info { param($msg)
    Write-Host "[INFO] $msg" -ForegroundColor Cyan
}
function Section { param($title)
    Write-Host ""
    Write-Host "--- $title ---" -ForegroundColor Yellow
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Body = $null,
        [string]$Token = "",
        [switch]$Raw
    )
    $url = "$ApiUrl$Path"
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }

    try {
        $params = @{
            Uri             = $url
            Method          = $Method
            Headers         = $headers
            UseBasicParsing = $true
        }
        if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Depth 10) }

        $resp = Invoke-WebRequest @params -ErrorAction Stop
        if ($Raw) { return $resp }
        return @{ status = [int]$resp.StatusCode; body = ($resp.Content | ConvertFrom-Json) }
    }
    catch {
        $code = 0
        try { $code = [int]$_.Exception.Response.StatusCode } catch {}
        $raw_body = ""
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $raw_body = $reader.ReadToEnd()
        } catch {}
        return @{ status = $code; body = $raw_body; error = $_.Exception.Message }
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  WorkOn Backend Smoke E2E - F1..F6" -ForegroundColor Cyan
Write-Host "  Target: $ApiUrl" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ============================================================
# F6 - HEALTH / READY (first - validates API is reachable)
# ============================================================
Section "F6 - Health / Ready"

$r = Invoke-Api -Method GET -Path "/healthz"
if ($r.status -eq 200) { Pass "F6.1 GET /healthz" } else { Fail "F6.1 GET /healthz" "status=$($r.status)" }

$r = Invoke-Api -Method GET -Path "/readyz"
if ($r.status -eq 200) { Pass "F6.2 GET /readyz (DB connectivity)" } else { Fail "F6.2 GET /readyz" "status=$($r.status) $($r.error)" }

$r = Invoke-Api -Method GET -Path "/api/v1/health"
if ($r.status -eq 200) { Pass "F6.3 GET /api/v1/health" } else { Fail "F6.3 GET /api/v1/health" "status=$($r.status)" }

# ============================================================
# F1 - AUTH : register -> login -> protected -> refresh -> 401
# ============================================================
Section "F1 - AuthN / AuthZ"

$ts = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "smoke-$ts@workon.test"
$testPwd   = "SmokeTest123!"

# Register
$r = Invoke-Api -Method POST -Path "/api/v1/auth/register" -Body @{
    email = $testEmail; password = $testPwd
    firstName = "Smoke"; lastName = "Worker"; role = "worker"
}
if ($r.status -eq 201) {
    Pass "F1.1 POST /auth/register (201)"
    $Global:Token = $r.body.accessToken
    $Global:RefreshToken = $r.body.refreshToken
} else { Fail "F1.1 POST /auth/register" "status=$($r.status) body=$($r.body)" }

# Login
$r = Invoke-Api -Method POST -Path "/api/v1/auth/login" -Body @{ email = $testEmail; password = $testPwd }
if ($r.status -eq 200) {
    Pass "F1.2 POST /auth/login (200)"
    $Global:Token = $r.body.accessToken
    $Global:RefreshToken = $r.body.refreshToken
} else { Fail "F1.2 POST /auth/login" "status=$($r.status)" }

# Protected endpoint with token
$r = Invoke-Api -Method GET -Path "/api/v1/auth/me" -Token $Global:Token
if ($r.status -eq 200 -and $r.body.email -eq $testEmail) {
    Pass "F1.3 GET /auth/me with valid token (200, email matches)"
} else { Fail "F1.3 GET /auth/me" "status=$($r.status)" }

# 401 without token
$r = Invoke-Api -Method GET -Path "/api/v1/auth/me"
if ($r.status -eq 401) { Pass "F1.4 GET /auth/me without token -> 401" } else { Fail "F1.4 401 guard" "status=$($r.status)" }

# Refresh token rotation
if ($Global:RefreshToken) {
    $r = Invoke-Api -Method POST -Path "/api/v1/auth/refresh" -Body @{ refreshToken = $Global:RefreshToken }
    if ($r.status -eq 200 -and $r.body.accessToken) {
        Pass "F1.5 POST /auth/refresh -> new accessToken"
        $Global:Token = $r.body.accessToken
    } else { Fail "F1.5 POST /auth/refresh" "status=$($r.status)" }
}

# ============================================================
# Accept consent (required by ConsentGuard for F3/F4/F5)
# ============================================================
Section "Consent (prerequisite F3/F4/F5)"

$r = Invoke-Api -Method GET -Path "/api/v1/compliance/versions"
$termsVer   = $r.body.versions.TERMS
$privacyVer = $r.body.versions.PRIVACY
Info "Terms v$termsVer | Privacy v$privacyVer"

$r = Invoke-Api -Method POST -Path "/api/v1/compliance/accept" -Token $Global:Token -Body @{ documentType = "TERMS"; version = $termsVer }
if ($r.status -eq 200) { Pass "Consent TERMS accepted" } else { Fail "Consent TERMS" "status=$($r.status)" }

$r = Invoke-Api -Method POST -Path "/api/v1/compliance/accept" -Token $Global:Token -Body @{ documentType = "PRIVACY"; version = $privacyVer }
if ($r.status -eq 200) { Pass "Consent PRIVACY accepted" } else { Fail "Consent PRIVACY" "status=$($r.status)" }

# ============================================================
# F2 - WORKER BROWSE MISSIONS
# ============================================================
Section "F2 - Worker browse missions (missions-local)"

$r = Invoke-Api -Method GET -Path "/api/v1/missions-local/nearby?latitude=45.5017&longitude=-73.5673&radius=50" -Token $Global:Token
if ($r.status -eq 200) { Pass "F2.1 GET /missions-local/nearby (200)" } else { Fail "F2.1 GET /missions-local/nearby" "status=$($r.status) $($r.body)" }

$r = Invoke-Api -Method GET -Path "/api/v1/catalog/categories" -Token $Global:Token
if ($r.status -eq 200) { Pass "F2.2 GET /catalog/categories (200)" } else { Fail "F2.2 GET /catalog/categories" "status=$($r.status)" }

$r = Invoke-Api -Method GET -Path "/api/v1/missions-local/my-missions" -Token $Global:Token
if ($r.status -eq 200) { Pass "F2.3 GET /missions-local/my-missions (200)" } else { Fail "F2.3 GET /missions-local/my-missions" "status=$($r.status)" }

# ============================================================
# F3 - CREATE MISSION (employer role required)
# ============================================================
Section "F3 - Create mission (employer)"

# Create employer account
$tsE = Get-Date -Format "yyyyMMddHHmmss"
$employerEmail = "smoke-emp-$tsE@workon.test"
$re = Invoke-Api -Method POST -Path "/api/v1/auth/register" -Body @{
    email = $employerEmail; password = $testPwd
    firstName = "Smoke"; lastName = "Employer"; role = "employer"
}
$Global:EmployerToken = ""
if ($re.status -eq 201) {
    $Global:EmployerToken = $re.body.accessToken
    Pass "F3.0 Employer registered"
    # Accept consent for employer
    $rc = Invoke-Api -Method GET -Path "/api/v1/compliance/versions"
    Invoke-Api -Method POST -Path "/api/v1/compliance/accept" -Token $Global:EmployerToken -Body @{ documentType = "TERMS"; version = $rc.body.versions.TERMS } | Out-Null
    Invoke-Api -Method POST -Path "/api/v1/compliance/accept" -Token $Global:EmployerToken -Body @{ documentType = "PRIVACY"; version = $rc.body.versions.PRIVACY } | Out-Null
} else { Fail "F3.0 Employer register" "status=$($re.status)" }

# Get categories for mission creation
$cats = Invoke-Api -Method GET -Path "/api/v1/catalog/categories"
$categoryId = $null
if ($cats.status -eq 200 -and $cats.body.Count -gt 0) {
    $categoryId = $cats.body[0].id
    Info "Using category: $($cats.body[0].name) ($categoryId)"
}

$missionId = $null
if ($Global:EmployerToken -and $categoryId) {
    $missionBody = @{
        title = "Smoke test mission $(Get-Date -Format 'HHmmss')"
        description = "Smoke test mission description"
        categoryId = $categoryId
        city = "Montreal"
        latitude = 45.5017
        longitude = -73.5673
        scheduledAt = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ssZ")
        estimatedHours = 2
        hourlyRate = 20
    }
    $rm = Invoke-Api -Method POST -Path "/api/v1/missions-local" -Token $Global:EmployerToken -Body $missionBody
    if ($rm.status -eq 201) {
        $missionId = $rm.body.id
        Pass "F3.1 POST /missions-local (201) id=$missionId"
    } else { Fail "F3.1 POST /missions-local" "status=$($rm.status) body=$($rm.body | ConvertTo-Json -Compress)" }
} else { Fail "F3.1 POST /missions-local" "no employer token or no categoryId" }

# Read back the created mission
if ($missionId) {
    $rg = Invoke-Api -Method GET -Path "/api/v1/missions-local/$missionId" -Token $Global:EmployerToken
    if ($rg.status -eq 200) { Pass "F3.2 GET /missions-local/:id (200)" } else { Fail "F3.2 GET /missions-local/:id" "status=$($rg.status)" }
}

# ============================================================
# F4 - STRIPE CONNECT (connect state check)
# ============================================================
Section "F4 - Stripe Connect (payout account state)"

$r = Invoke-Api -Method GET -Path "/api/v1/payments/stripe/connect/status" -Token $Global:Token
if ($r.status -eq 200) {
    Pass "F4.1 GET /payments/stripe/connect/status (200) connected=$($r.body.connected)"
    Info "Stripe connect state: $($r.body | ConvertTo-Json -Compress)"
} elseif ($r.status -eq 404) {
    Pass "F4.1 GET /payments/stripe/connect/status (404 = not connected, endpoint exists)"
} else { Fail "F4.1 GET /payments/stripe/connect/status" "status=$($r.status) $($r.error)" }

# ============================================================
# F5 - COMPLETE MISSION -> REVIEW
# ============================================================
Section "F5 - Mission completion + review"

if ($missionId -and $Global:Token) {
    # Worker accepts the mission
    $ra = Invoke-Api -Method POST -Path "/api/v1/missions-local/$missionId/accept" -Token $Global:Token
    if ($ra.status -eq 200 -or $ra.status -eq 201) { Pass "F5.1 POST /missions-local/:id/accept" } else { Fail "F5.1 accept" "status=$($ra.status) $($ra.body | ConvertTo-Json -Compress)" }
}

# Reviews endpoint accessible
$r = Invoke-Api -Method GET -Path "/api/v1/reviews" -Token $Global:Token
if ($r.status -eq 200) { Pass "F5.2 GET /reviews (200)" } else { Fail "F5.2 GET /reviews" "status=$($r.status)" }

# Earnings accessible for worker
$r = Invoke-Api -Method GET -Path "/api/v1/earnings/summary" -Token $Global:Token
if ($r.status -eq 200) { Pass "F5.3 GET /earnings/summary (200)" } else { Fail "F5.3 GET /earnings/summary" "status=$($r.status)" }

# ============================================================
# BONUS - METRICS (public)
# ============================================================
Section "BONUS - Metrics (public endpoints)"

$r = Invoke-Api -Method GET -Path "/api/v1/metrics/home-stats"
if ($r.status -eq 200) {
    Pass "BONUS.1 GET /metrics/home-stats (200)"
    Info "home-stats: $($r.body | ConvertTo-Json -Compress)"
} else { Fail "BONUS.1 GET /metrics/home-stats" "status=$($r.status)" }

$r = Invoke-Api -Method GET -Path "/api/v1/metrics/ratio"
if ($r.status -eq 200) { Pass "BONUS.2 GET /metrics/ratio (200)" } else { Fail "BONUS.2 GET /metrics/ratio" "status=$($r.status)" }

$r = Invoke-Api -Method GET -Path "/api/v1/metrics/regions"
if ($r.status -eq 200) { Pass "BONUS.3 GET /metrics/regions (200)" } else { Fail "BONUS.3 GET /metrics/regions" "status=$($r.status)" }

# ============================================================
# SUMMARY
# ============================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  RESULTS: Passed=$($Global:Passed)  Failed=$($Global:Failed)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

if ($Global:Failed -gt 0) {
    Write-Host "SMOKE E2E: FAIL" -ForegroundColor Red
    exit 1
} else {
    Write-Host "SMOKE E2E: PASS" -ForegroundColor Green
    exit 0
}
