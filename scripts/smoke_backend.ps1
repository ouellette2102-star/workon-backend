# ============================================
# WorkOn Backend Smoke Tests (Windows PowerShell)
# ============================================
# Usage: .\scripts\smoke_backend.ps1 [-ApiUrl <url>] [-Token <token>]
# Example: .\scripts\smoke_backend.ps1 -ApiUrl "http://localhost:8080"

param(
    [string]$ApiUrl = "http://localhost:8080",
    [string]$Token = "",
    [switch]$SkipAuth,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }

# Counters
$script:passed = 0
$script:failed = 0
$script:skipped = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [string]$Body = $null,
        [hashtable]$Headers = @{},
        [int[]]$ExpectedStatus = @(200),
        [switch]$RequiresAuth
    )

    if ($RequiresAuth -and [string]::IsNullOrEmpty($Token)) {
        Write-Warn "$Name - SKIPPED (no token)"
        $script:skipped++
        return $false
    }

    $fullUrl = "$ApiUrl$Url"
    
    try {
        $params = @{
            Uri = $fullUrl
            Method = $Method
            ContentType = "application/json"
            Headers = $Headers
        }

        if ($RequiresAuth) {
            $params.Headers["Authorization"] = "Bearer $Token"
        }

        if ($Body) {
            $params.Body = $Body
        }

        if ($Verbose) {
            Write-Info "Request: $Method $fullUrl"
        }

        $response = Invoke-WebRequest @params -UseBasicParsing -ErrorAction SilentlyContinue

        if ($ExpectedStatus -contains $response.StatusCode) {
            Write-Success "$Name - $($response.StatusCode)"
            $script:passed++
            return $true
        } else {
            Write-Fail "$Name - Expected $($ExpectedStatus -join '/'), got $($response.StatusCode)"
            $script:failed++
            return $false
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        if ($ExpectedStatus -contains $statusCode) {
            Write-Success "$Name - $statusCode (expected error)"
            $script:passed++
            return $true
        } else {
            Write-Fail "$Name - $($_.Exception.Message)"
            $script:failed++
            return $false
        }
    }
}

# ============================================
# SMOKE TESTS
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WorkOn Backend Smoke Tests" -ForegroundColor Cyan
Write-Host "  API: $ApiUrl" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- HEALTH CHECKS ---
Write-Host "--- Health Checks ---" -ForegroundColor Yellow

Test-Endpoint -Name "Liveness probe" -Method "GET" -Url "/healthz"
Test-Endpoint -Name "Readiness probe" -Method "GET" -Url "/readyz"
Test-Endpoint -Name "Health endpoint" -Method "GET" -Url "/api/v1/health"

# --- AUTH FLOW (if token available) ---
Write-Host ""
Write-Host "--- Auth Flow ---" -ForegroundColor Yellow

if (-not $SkipAuth) {
    # Test avec un user de test
    $testEmail = "smoke-test-$(Get-Date -Format 'yyyyMMddHHmmss')@test.local"
    $testPassword = "SmokeTest123!"
    
    # Register (Note: backend uses 'register' not 'signup')
    $registerBody = @{
        email = $testEmail
        password = $testPassword
        firstName = "Smoke"
        lastName = "Test"
        role = "worker"
    } | ConvertTo-Json
    
    try {
        $signupResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/auth/register" -Method POST -Body $registerBody -ContentType "application/json" -UseBasicParsing
        if ($signupResponse.StatusCode -eq 201 -or $signupResponse.StatusCode -eq 200) {
            Write-Success "Register - $($signupResponse.StatusCode)"
            $script:passed++
            
            $signupData = $signupResponse.Content | ConvertFrom-Json
            $Token = $signupData.accessToken
            $script:testUserId = $signupData.user.id
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        if ($statusCode -eq 409) {
            Write-Warn "Register - 409 (user exists, trying login)"
        } else {
            Write-Fail "Register - $($_.Exception.Message)"
            $script:failed++
        }
    }

    # Login
    $loginBody = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-WebRequest -Uri "$ApiUrl/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
        if ($loginResponse.StatusCode -eq 200) {
            Write-Success "Login - 200"
            $script:passed++
            
            $loginData = $loginResponse.Content | ConvertFrom-Json
            $Token = $loginData.accessToken
            $script:refreshToken = $loginData.refreshToken
        }
    }
    catch {
        Write-Fail "Login - $($_.Exception.Message)"
        $script:failed++
    }

    # Refresh token
    if ($script:refreshToken) {
        $refreshBody = @{
            refreshToken = $script:refreshToken
        } | ConvertTo-Json
        
        Test-Endpoint -Name "Refresh token" -Method "POST" -Url "/api/v1/auth/refresh" -Body $refreshBody
    }
}

# --- PROFILE ---
Write-Host ""
Write-Host "--- Profile ---" -ForegroundColor Yellow

Test-Endpoint -Name "Get profile" -Method "GET" -Url "/api/v1/profile" -RequiresAuth

# --- ACCOUNT MANAGEMENT ---
Write-Host ""
Write-Host "--- Account Management ---" -ForegroundColor Yellow

# Change email (request OTP)
$changeEmailBody = @{
    newEmail = "new-email-$(Get-Date -Format 'yyyyMMddHHmmss')@test.local"
} | ConvertTo-Json

Test-Endpoint -Name "Change email (request OTP)" -Method "POST" -Url "/api/v1/auth/change-email" -Body $changeEmailBody -RequiresAuth -ExpectedStatus @(200, 429)

# Verify email OTP (will fail without real OTP, but endpoint should exist)
$verifyOtpBody = @{
    newEmail = "test@test.local"
    code = "123456"
} | ConvertTo-Json

Test-Endpoint -Name "Verify email OTP (endpoint exists)" -Method "POST" -Url "/api/v1/auth/verify-email-otp" -Body $verifyOtpBody -RequiresAuth -ExpectedStatus @(200, 400)

# Delete account (without confirm - should fail with 400)
$deleteBody = @{
    confirm = "WRONG"
} | ConvertTo-Json

Test-Endpoint -Name "Delete account (CONFIRM_REQUIRED)" -Method "DELETE" -Url "/api/v1/auth/account" -Body $deleteBody -RequiresAuth -ExpectedStatus @(400)

# --- CONTRACT CHECK ---
Write-Host ""
Write-Host "--- Contract Check (Swagger) ---" -ForegroundColor Yellow

Test-Endpoint -Name "Swagger docs" -Method "GET" -Url "/api/docs" -ExpectedStatus @(200, 301, 302)

# --- SUMMARY ---
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SMOKE TEST RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Passed:  $script:passed" -ForegroundColor Green
Write-Host "Failed:  $script:failed" -ForegroundColor Red
Write-Host "Skipped: $script:skipped" -ForegroundColor Yellow
Write-Host ""

if ($script:failed -gt 0) {
    Write-Fail "SMOKE TESTS FAILED"
    exit 1
} else {
    Write-Success "ALL SMOKE TESTS PASSED"
    exit 0
}

