#!/bin/bash
# ============================================
# WorkOn Backend Smoke Tests (Bash/Linux/CI)
# ============================================
# Usage: ./scripts/smoke_backend.sh [API_URL] [TOKEN]
# Example: ./scripts/smoke_backend.sh "http://localhost:8080"

set -e

API_URL="${1:-http://localhost:8080}"
TOKEN="${2:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Functions
success() { echo -e "${GREEN}✅ $1${NC}"; ((PASSED++)); }
fail() { echo -e "${RED}❌ $1${NC}"; ((FAILED++)); }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
skip() { echo -e "${YELLOW}⏭️  $1 - SKIPPED${NC}"; ((SKIPPED++)); }

# Test endpoint function
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local body="$4"
    local expected_status="$5"
    local requires_auth="$6"

    if [[ "$requires_auth" == "true" && -z "$TOKEN" ]]; then
        skip "$name (no token)"
        return 0
    fi

    local full_url="${API_URL}${url}"
    local curl_opts="-s -o /dev/null -w %{http_code}"
    
    if [[ "$requires_auth" == "true" ]]; then
        curl_opts="$curl_opts -H 'Authorization: Bearer $TOKEN'"
    fi

    if [[ -n "$body" ]]; then
        curl_opts="$curl_opts -H 'Content-Type: application/json' -d '$body'"
    fi

    local status_code
    status_code=$(eval "curl $curl_opts -X $method '$full_url'" 2>/dev/null || echo "000")

    # Check if status is in expected list (comma-separated)
    IFS=',' read -ra EXPECTED <<< "$expected_status"
    local matched=false
    for exp in "${EXPECTED[@]}"; do
        if [[ "$status_code" == "$exp" ]]; then
            matched=true
            break
        fi
    done

    if [[ "$matched" == "true" ]]; then
        success "$name - $status_code"
        return 0
    else
        fail "$name - Expected $expected_status, got $status_code"
        return 1
    fi
}

# ============================================
# SMOKE TESTS
# ============================================

echo ""
echo -e "${CYAN}========================================"
echo "  WorkOn Backend Smoke Tests"
echo "  API: $API_URL"
echo "========================================${NC}"
echo ""

# --- HEALTH CHECKS ---
echo -e "${YELLOW}--- Health Checks ---${NC}"

test_endpoint "Liveness probe" "GET" "/healthz" "" "200" "false"
test_endpoint "Readiness probe" "GET" "/readyz" "" "200" "false"
test_endpoint "Health endpoint" "GET" "/api/v1/health" "" "200" "false"

# --- AUTH FLOW ---
echo ""
echo -e "${YELLOW}--- Auth Flow ---${NC}"

# Generate unique test email
TEST_EMAIL="smoke-test-$(date +%s)@test.local"
TEST_PASSWORD="SmokeTest123!"

# Register (Note: backend uses 'register' not 'signup')
REGISTER_BODY="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Smoke Test\",\"role\":\"WORKER\"}"
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "$REGISTER_BODY" 2>/dev/null || echo '{"error":"connection failed"}')

if echo "$SIGNUP_RESPONSE" | grep -q "accessToken"; then
    success "Register - 200"
    TOKEN=$(echo "$SIGNUP_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
else
    SIGNUP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "$REGISTER_BODY" 2>/dev/null || echo "000")
    
    if [[ "$SIGNUP_STATUS" == "409" ]]; then
        warn "Register - 409 (user exists, trying login)"
    else
        fail "Register - $SIGNUP_STATUS"
    fi
fi

# Login
LOGIN_BODY="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_BODY" 2>/dev/null || echo '{"error":"connection failed"}')

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    success "Login - 200"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
else
    fail "Login - failed"
fi

# Refresh token
if [[ -n "$REFRESH_TOKEN" ]]; then
    REFRESH_BODY="{\"refreshToken\":\"$REFRESH_TOKEN\"}"
    test_endpoint "Refresh token" "POST" "/api/v1/auth/refresh" "$REFRESH_BODY" "200" "false"
fi

# --- PROFILE ---
echo ""
echo -e "${YELLOW}--- Profile ---${NC}"

test_endpoint "Get profile" "GET" "/api/v1/profile" "" "200" "true"

# --- ACCOUNT MANAGEMENT ---
echo ""
echo -e "${YELLOW}--- Account Management ---${NC}"

# Change email
CHANGE_EMAIL_BODY="{\"newEmail\":\"new-$(date +%s)@test.local\"}"
test_endpoint "Change email (request OTP)" "POST" "/api/v1/auth/change-email" "$CHANGE_EMAIL_BODY" "200,429" "true"

# Verify email OTP (endpoint existence check)
VERIFY_OTP_BODY="{\"newEmail\":\"test@test.local\",\"code\":\"123456\"}"
test_endpoint "Verify email OTP (endpoint exists)" "POST" "/api/v1/auth/verify-email-otp" "$VERIFY_OTP_BODY" "200,400" "true"

# Delete account (should fail without proper confirm)
DELETE_BODY="{\"confirm\":\"WRONG\"}"
test_endpoint "Delete account (CONFIRM_REQUIRED)" "DELETE" "/api/v1/auth/account" "$DELETE_BODY" "400" "true"

# --- CONTRACT CHECK ---
echo ""
echo -e "${YELLOW}--- Contract Check (Swagger) ---${NC}"

test_endpoint "Swagger docs" "GET" "/api/docs" "" "200,301,302" "false"

# --- SUMMARY ---
echo ""
echo -e "${CYAN}========================================"
echo "  SMOKE TEST RESULTS"
echo "========================================${NC}"
echo ""
echo -e "${GREEN}Passed:  $PASSED${NC}"
echo -e "${RED}Failed:  $FAILED${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED${NC}"
echo ""

if [[ $FAILED -gt 0 ]]; then
    fail "SMOKE TESTS FAILED"
    exit 1
else
    success "ALL SMOKE TESTS PASSED"
    exit 0
fi

