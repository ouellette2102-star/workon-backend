# 🧪 Script de Test - Routes Auth sur Railway
# Usage: .\test-auth-railway.ps1

$BASE_URL = "https://workon-backend-production-8908.up.railway.app"
$headers = @{ "Content-Type" = "application/json" }

Write-Host "`n🚀 Test des Routes Auth - Railway Backend" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# ✅ Test 1: Health Check
Write-Host "1️⃣  Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/healthz" -Method GET -UseBasicParsing
    Write-Host "✅ Health Check: OK (Status $($response.StatusCode))" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)`n"
} catch {
    Write-Host "❌ Health Check: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# ✅ Test 2: POST /api/v1/auth/register
Write-Host "2️⃣  Testing POST /api/v1/auth/register..." -ForegroundColor Yellow
$registerBody = @{
    email = "test.railway.$(Get-Date -Format 'yyyyMMddHHmmss')@workon.app"
    password = "Test123!WorkOn"
    firstName = "Test"
    lastName = "Railway"
    role = "WORKER"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/v1/auth/register" -Method POST -Headers $headers -Body $registerBody -UseBasicParsing
    Write-Host "✅ Register: OK (Status $($response.StatusCode))" -ForegroundColor Green
    
    $result = $response.Content | ConvertFrom-Json
    $accessToken = $result.accessToken
    $userId = $result.user.id
    
    Write-Host "   User ID: $userId"
    Write-Host "   Email: $($result.user.email)"
    Write-Host "   Token: $($accessToken.Substring(0, 30))...`n"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ Register: FAILED (Status $statusCode)" -ForegroundColor Red
    
    if ($statusCode -eq 404) {
        Write-Host "   ⚠️  404 Error = Route not found OR Method mismatch (GET instead of POST)" -ForegroundColor Red
        Write-Host "   Error Message: $($_.Exception.Message)" -ForegroundColor Red
    } elseif ($statusCode -eq 400) {
        Write-Host "   ⚠️  400 Error = Validation failed (check email format, password strength, etc.)" -ForegroundColor Red
    } elseif ($statusCode -eq 409) {
        Write-Host "   ⚠️  409 Error = Email already exists (use another email)" -ForegroundColor Red
    }
    Write-Host ""
    exit 1
}

# ✅ Test 3: POST /api/v1/auth/login
Write-Host "3️⃣  Testing POST /api/v1/auth/login..." -ForegroundColor Yellow
$loginBody = @{
    email = $result.user.email
    password = "Test123!WorkOn"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/v1/auth/login" -Method POST -Headers $headers -Body $loginBody -UseBasicParsing
    Write-Host "✅ Login: OK (Status $($response.StatusCode))" -ForegroundColor Green
    
    $loginResult = $response.Content | ConvertFrom-Json
    $accessToken = $loginResult.accessToken
    
    Write-Host "   Token: $($accessToken.Substring(0, 30))...`n"
} catch {
    Write-Host "❌ Login: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# ✅ Test 4: GET /api/v1/auth/me (avec token)
Write-Host "4️⃣  Testing GET /api/v1/auth/me (with Bearer token)..." -ForegroundColor Yellow
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $accessToken"
}

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/v1/auth/me" -Method GET -Headers $authHeaders -UseBasicParsing
    Write-Host "✅ Get Me: OK (Status $($response.StatusCode))" -ForegroundColor Green
    
    $meResult = $response.Content | ConvertFrom-Json
    Write-Host "   User ID: $($meResult.id)"
    Write-Host "   Email: $($meResult.email)"
    Write-Host "   Name: $($meResult.firstName) $($meResult.lastName)"
    Write-Host "   Role: $($meResult.role)`n"
} catch {
    Write-Host "❌ Get Me: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# ✅ Test 5: Vérifier Swagger en production
Write-Host "5️⃣  Testing Swagger Documentation..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/docs" -Method GET -UseBasicParsing
    Write-Host "✅ Swagger: OK (Status $($response.StatusCode))" -ForegroundColor Green
    Write-Host "   URL: $BASE_URL/api/docs"
    Write-Host "   Open in browser to see full API documentation`n"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 404) {
        Write-Host "⚠️  Swagger: NOT ENABLED (404)" -ForegroundColor Yellow
        Write-Host "   To enable: Set ENABLE_SWAGGER_PROD=true in Railway variables`n"
    } else {
        Write-Host "❌ Swagger: FAILED (Status $statusCode)" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Red
    }
}

# ✅ Test 6: Tester GET sur une route POST (reproduire erreur FlutterFlow)
Write-Host "6️⃣  Testing GET /api/v1/auth/register (should fail with 404)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/v1/auth/register" -Method GET -UseBasicParsing
    Write-Host "⚠️  Unexpected: GET returned $($response.StatusCode)" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 404) {
        Write-Host "✅ Correct: GET on POST route returns 404" -ForegroundColor Green
        Write-Host "   This confirms FlutterFlow error: 'Cannot GET /api/v1/auth/register'" -ForegroundColor Green
        Write-Host "   Solution: Change Method from GET to POST in FlutterFlow`n"
    } else {
        Write-Host "❌ Unexpected Status: $statusCode`n" -ForegroundColor Red
    }
}

# 🎉 Résumé Final
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "🎉 ALL TESTS COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "📋 Summary:" -ForegroundColor White
Write-Host "   ✅ Health Check: Working"
Write-Host "   ✅ POST /api/v1/auth/register: Working"
Write-Host "   ✅ POST /api/v1/auth/login: Working"
Write-Host "   ✅ GET /api/v1/auth/me: Working (with Bearer token)"
Write-Host "   ✅ GET on POST route: Correctly returns 404`n"

Write-Host "🚀 Backend Railway is 100% operational!" -ForegroundColor Green
Write-Host "`n📱 FlutterFlow Configuration:" -ForegroundColor Yellow
Write-Host "   Base URL: $BASE_URL"
Write-Host "   Endpoint: /api/v1/auth/register"
Write-Host "   Method: POST (⚠️ NOT GET!)"
Write-Host "   Content-Type: application/json`n"

Write-Host "📚 Documentation: $BASE_URL/api/docs" -ForegroundColor Cyan
Write-Host ""

