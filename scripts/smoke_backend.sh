#!/bin/bash
# ============================================
# WorkOn Backend Smoke Tests (Bash/Linux/CI)
# ============================================
#
# USAGE:
#   ./scripts/smoke_backend.sh [API_URL]
#   ./scripts/smoke_backend.sh "http://localhost:8080"
#
# DESCRIPTION:
#   Minimal smoke tests for CI pipeline.
#   - Health checks (public)
#   - Auth flow (register/login)
#   - One protected endpoint (auth/me)
#
# EXIT CODES:
#   0 = All critical tests passed
#   1 = Critical test failed
#
# ============================================

# Exit on undefined variables only (not on errors - we handle those)
set -u

API_URL="${1:-http://localhost:8080}"

# ============================================
# CONFIGURATION
# ============================================

# Deterministic test user for CI (always the same)
TEST_EMAIL="qa-smoke-test@workon.app"
TEST_PASSWORD="SmokeTestQA2024!"
TEST_NAME="QA Smoke Test"

# ============================================
# COLORS (disabled if not a TTY)
# ============================================

if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    CYAN='\033[0;36m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    CYAN=''
    NC=''
fi

# ============================================
# COUNTERS
# ============================================

PASSED=0
FAILED=0
SKIPPED=0
TOKEN=""

# ============================================
# HELPER FUNCTIONS
# ============================================

success() { 
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++)) || true
}

fail() { 
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++)) || true
}

warn() { 
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() { 
    echo -e "${CYAN}ℹ️  $1${NC}"
}

skip() { 
    echo -e "${YELLOW}⏭️  $1 - SKIPPED${NC}"
    ((SKIPPED++)) || true
}

# ============================================
# TEST ENDPOINT FUNCTION
# ============================================
# Arguments:
#   $1 = Test name
#   $2 = HTTP method
#   $3 = URL path
#   $4 = Request body (empty string if none)
#   $5 = Expected status codes (comma-separated)
#   $6 = "true" if requires auth, "false" otherwise

test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local body="$4"
    local expected_status="$5"
    local requires_auth="${6:-false}"

    # Skip if auth required but no token
    if [[ "$requires_auth" == "true" && -z "$TOKEN" ]]; then
        skip "$name (no token available)"
        return 0
    fi

    local full_url="${API_URL}${url}"
    local status_code

    # Build curl command
    if [[ "$requires_auth" == "true" ]]; then
        if [[ -n "$body" ]]; then
            status_code=$(curl -s -o /dev/null -w "%{http_code}" \
                -X "$method" \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d "$body" \
                "$full_url" 2>/dev/null) || status_code="000"
        else
            status_code=$(curl -s -o /dev/null -w "%{http_code}" \
                -X "$method" \
                -H "Authorization: Bearer $TOKEN" \
                "$full_url" 2>/dev/null) || status_code="000"
        fi
    else
        if [[ -n "$body" ]]; then
            status_code=$(curl -s -o /dev/null -w "%{http_code}" \
                -X "$method" \
                -H "Content-Type: application/json" \
                -d "$body" \
                "$full_url" 2>/dev/null) || status_code="000"
        else
            status_code=$(curl -s -o /dev/null -w "%{http_code}" \
                -X "$method" \
                "$full_url" 2>/dev/null) || status_code="000"
        fi
    fi

    # Check if status matches any expected value
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
# MAIN: SMOKE TESTS
# ============================================

echo ""
echo -e "${CYAN}========================================"
echo "  WorkOn Backend Smoke Tests (CI)"
echo "  API: $API_URL"
echo "  User: $TEST_EMAIL"
echo "========================================${NC}"
echo ""

# ============================================
# STEP 1: HEALTH CHECKS (Public, no auth)
# ============================================

echo -e "${YELLOW}--- Step 1: Health Checks ---${NC}"

test_endpoint "Liveness probe (/healthz)" "GET" "/healthz" "" "200" "false"
test_endpoint "Readiness probe (/readyz)" "GET" "/readyz" "" "200" "false"

# If health checks fail, the server is down - abort early
if [[ $FAILED -gt 0 ]]; then
    echo ""
    fail "CRITICAL: Health checks failed - server may be down"
    exit 1
fi

# ============================================
# STEP 2: AUTHENTICATION (Get JWT Token)
# ============================================

echo ""
echo -e "${YELLOW}--- Step 2: Authentication ---${NC}"

# Step 2a: Try to register the test user (may already exist)
info "Attempting to register test user..."

REGISTER_BODY=$(cat <<EOF
{
    "email": "$TEST_EMAIL",
    "password": "$TEST_PASSWORD",
    "name": "$TEST_NAME",
    "role": "WORKER"
}
EOF
)

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "$REGISTER_BODY" 2>/dev/null) || REGISTER_RESPONSE='{"error":"connection"}'

if echo "$REGISTER_RESPONSE" | grep -q '"accessToken"'; then
    success "Register - new user created"
    TOKEN=$(echo "$REGISTER_RESPONSE" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
elif echo "$REGISTER_RESPONSE" | grep -q -i "already\|exists\|duplicate\|409"; then
    info "User already exists - will login instead"
else
    # Check status code
    REGISTER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "$REGISTER_BODY" 2>/dev/null) || REGISTER_STATUS="000"
    
    if [[ "$REGISTER_STATUS" == "409" ]]; then
        info "User already exists (409) - will login"
    elif [[ "$REGISTER_STATUS" == "201" || "$REGISTER_STATUS" == "200" ]]; then
        success "Register - $REGISTER_STATUS"
    else
        warn "Register returned $REGISTER_STATUS - trying login anyway"
    fi
fi

# Step 2b: Login to get token (always try, even if register succeeded)
if [[ -z "$TOKEN" ]]; then
    info "Logging in to get access token..."
    
    LOGIN_BODY=$(cat <<EOF
{
    "email": "$TEST_EMAIL",
    "password": "$TEST_PASSWORD"
}
EOF
)

    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "$LOGIN_BODY" 2>/dev/null) || LOGIN_RESPONSE='{"error":"connection"}'

    if echo "$LOGIN_RESPONSE" | grep -q '"accessToken"'; then
        success "Login - token received"
        TOKEN=$(echo "$LOGIN_RESPONSE" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
    else
        LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/v1/auth/login" \
            -H "Content-Type: application/json" \
            -d "$LOGIN_BODY" 2>/dev/null) || LOGIN_STATUS="000"
        fail "Login - failed with status $LOGIN_STATUS"
    fi
fi

# Verify we have a token
if [[ -n "$TOKEN" ]]; then
    info "Token acquired (${#TOKEN} chars)"
else
    warn "No token acquired - protected endpoints will be skipped"
fi

# ============================================
# STEP 3: PROTECTED ENDPOINTS
# ============================================

echo ""
echo -e "${YELLOW}--- Step 3: Protected Endpoints ---${NC}"

# Test GET /api/v1/auth/me (current user info)
test_endpoint "Get current user (/auth/me)" "GET" "/api/v1/auth/me" "" "200" "true"

# Test GET /api/v1/profile (user profile)
test_endpoint "Get profile (/profile)" "GET" "/api/v1/profile" "" "200,404" "true"

# ============================================
# STEP 4: OPTIONAL ENDPOINTS (Don't fail on these)
# ============================================

echo ""
echo -e "${YELLOW}--- Step 4: Optional Checks ---${NC}"

# Swagger docs (may be disabled in prod)
SWAGGER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/docs" 2>/dev/null) || SWAGGER_STATUS="000"
if [[ "$SWAGGER_STATUS" == "200" || "$SWAGGER_STATUS" == "301" || "$SWAGGER_STATUS" == "302" ]]; then
    success "Swagger docs available - $SWAGGER_STATUS"
else
    skip "Swagger docs (disabled or $SWAGGER_STATUS)"
fi

# ============================================
# SUMMARY
# ============================================

echo ""
echo -e "${CYAN}========================================"
echo "  SMOKE TEST RESULTS"
echo "========================================${NC}"
echo ""
echo -e "${GREEN}Passed:  $PASSED${NC}"
echo -e "${RED}Failed:  $FAILED${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED${NC}"
echo ""

# ============================================
# EXIT CODE
# ============================================

if [[ $FAILED -gt 0 ]]; then
    echo -e "${RED}❌ SMOKE TESTS FAILED${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check if backend is running: curl $API_URL/healthz"
    echo "  2. Check logs: npm run start:dev"
    echo "  3. Verify DATABASE_URL is set correctly"
    exit 1
else
    echo -e "${GREEN}✅ ALL SMOKE TESTS PASSED${NC}"
    exit 0
fi
