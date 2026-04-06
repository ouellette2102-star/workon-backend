# Test Routes Auth sur Railway

$BASE_URL = "https://workon-backend-production-8908.up.railway.app"
$headers = @{ "Content-Type" = "application/json" }

Write-Host "`nTest des Routes Auth - Railway Backend" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$BASE_URL/healthz" -Method GET -UseBasicParsing
Write-Host "OK Health Check: $($response.StatusCode)" -ForegroundColor Green

# Test 2: POST /api/v1/auth/register
Write-Host "`n2. Testing POST /api/v1/auth/register..." -ForegroundColor Yellow
$registerBody = @{
    email = "test.railway.$(Get-Date -Format yyyyMMddHHmmss)@workon.app"
    password = "Test123!WorkOn"
    firstName = "Test"
    lastName = "Railway"
    role = "WORKER"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/v1/auth/register" -Method POST -Headers $headers -Body $registerBody -UseBasicParsing
    Write-Host "OK Register: $($response.StatusCode)" -ForegroundColor Green
    $result = $response.Content | ConvertFrom-Json
    $accessToken = $result.accessToken
    Write-Host "Token received: $($accessToken.Substring(0, 30))..."
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: POST /api/v1/auth/login
Write-Host "`n3. Testing POST /api/v1/auth/login..." -ForegroundColor Yellow
$loginBody = @{
    email = $result.user.email
    password = "Test123!WorkOn"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "$BASE_URL/api/v1/auth/login" -Method POST -Headers $headers -Body $loginBody -UseBasicParsing
Write-Host "OK Login: $($response.StatusCode)" -ForegroundColor Green

# Test 4: GET /api/v1/auth/me
Write-Host "`n4. Testing GET /api/v1/auth/me (with Bearer token)..." -ForegroundColor Yellow
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $accessToken"
}

$response = Invoke-WebRequest -Uri "$BASE_URL/api/v1/auth/me" -Method GET -Headers $authHeaders -UseBasicParsing
Write-Host "OK Get Me: $($response.StatusCode)" -ForegroundColor Green
$meResult = $response.Content | ConvertFrom-Json
Write-Host "User: $($meResult.firstName) $($meResult.lastName) ($($meResult.role))"

Write-Host "`nALL TESTS PASSED!" -ForegroundColor Green
