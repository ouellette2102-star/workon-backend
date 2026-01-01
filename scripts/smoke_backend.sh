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
#   - Readiness check (ensures DB is up)
#   - Health checks (public)
#   - Auth flow (register/login)
#   - One protected endpoint (auth/me)
#
# EXIT CODES:
#   0 = All critical tests passed
#   1 = Critical test failed
#
# CI COMPATIBILITY:
#   - No color codes in non-TTY environment
#   - Deterministic test user (always same email)
#   - Clear error messages for debugging
#
# ============================================

set -u  # Exit on undefined variables

API_URL="${1:-http://localhost:8080}"

# ============================================
# CONFIGURATION
# ============================================

# Deterministic test user for CI (always the same)
# Using a unique timestamp suffix to avoid conflicts between runs
TIMESTAMP=$(date +%s)
TEST_EMAIL="qa-smoke-${TIMESTAMP}@ci.workon.local"
TEST_PASSWORD="SmokeTestQA2024!Secure"
TEST_NAME="QA Smoke Test"

# ============================================
# COLORS (disabled in CI / non-TTY)
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

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

success() { 
    log "${GREEN}✅ PASS: $1${NC}"
    ((PASSED++)) || true
}

fail() { 
    log "${RED}❌ FAIL: $1${NC}"
    ((FAILED++)) || true
}

warn() { 
    log "${YELLOW}⚠️  WARN: $1${NC}"
}

info() { 
    log "${CYAN}ℹ️  INFO: $1${NC}"
}

skip() { 
    log "${YELLOW}⏭️  SKIP: $1${NC}"
    ((SKIPPED++)) || true
}

# ============================================
# HTTP REQUEST HELPER
# ============================================
# Returns: HTTP_CODE in $HTTP_CODE, BODY in $BODY

http_request() {
    local method="$1"
    local url="$2"
    local body="${3:-}"
    local auth_header="${4:-}"
    
    local curl_args=(-s -w "\n%{http_code}" -X "$method")
    
    if [[ -n "$auth_header" ]]; then
        curl_args+=(-H "Authorization: Bearer $auth_header")
    fi
    
    if [[ -n "$body" ]]; then
        curl_args+=(-H "Content-Type: application/json" -d "$body")
    fi
    
    curl_args+=("$url")
    
    local response
    response=$(curl "${curl_args[@]}" 2>/dev/null) || response=$'\n000'
    
    HTTP_CODE=$(echo "$response" | tail -n1)
    BODY=$(echo "$response" | sed '$d')
}

# ============================================
# TEST ENDPOINT FUNCTION
# ============================================

test_endpoint() {
    local name="$1"
    local method="$2"
    local path="$3"
    local body="$4"
    local expected_codes="$5"
    local requires_auth="${6:-false}"
    
    # Skip if auth required but no token
    if [[ "$requires_auth" == "true" && -z "$TOKEN" ]]; then
        skip "$name (no token available)"
        return 0
    fi
    
    local full_url="${API_URL}${path}"
    local auth=""
    
    if [[ "$requires_auth" == "true" ]]; then
        auth="$TOKEN"
    fi
    
    http_request "$method" "$full_url" "$body" "$auth"
    
    # Check if status matches any expected value
    IFS=',' read -ra EXPECTED <<< "$expected_codes"
    local matched=false
    for exp in "${EXPECTED[@]}"; do
        if [[ "$HTTP_CODE" == "$exp" ]]; then
            matched=true
            break
        fi
    done
    
    if [[ "$matched" == "true" ]]; then
        success "$name (HTTP $HTTP_CODE)"
        return 0
    else
        fail "$name - Expected [$expected_codes], got $HTTP_CODE"
        if [[ -n "$BODY" ]]; then
            echo "    Response: ${BODY:0:200}"
        fi
        return 1
    fi
}

# ============================================
# MAIN: SMOKE TESTS
# ============================================

echo ""
echo "========================================"
echo "  WorkOn Backend Smoke Tests (CI)"
echo "========================================"
echo "  API:  $API_URL"
echo "  User: $TEST_EMAIL"
echo "  Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# ============================================
# STEP 0: WAIT FOR READINESS (with retries)
# ============================================

info "Step 0: Checking server readiness..."

MAX_WAIT_RETRIES=10
WAIT_INTERVAL=2

for i in $(seq 1 $MAX_WAIT_RETRIES); do
    http_request "GET" "${API_URL}/readyz" "" ""
    
    if [[ "$HTTP_CODE" == "200" ]]; then
        success "Server is ready"
        break
    fi
    
    if [[ $i -lt $MAX_WAIT_RETRIES ]]; then
        info "Waiting for readiness... attempt $i/$MAX_WAIT_RETRIES (HTTP $HTTP_CODE)"
        sleep $WAIT_INTERVAL
    else
        fail "Server not ready after $MAX_WAIT_RETRIES attempts (HTTP $HTTP_CODE)"
        echo "Response: $BODY"
        exit 1
    fi
done

# ============================================
# STEP 1: HEALTH CHECKS (Public, no auth)
# ============================================

echo ""
info "Step 1: Health Checks"

test_endpoint "Liveness probe (/healthz)" "GET" "/healthz" "" "200" "false"
test_endpoint "Readiness probe (/readyz)" "GET" "/readyz" "" "200" "false"

# If health checks fail after passing initial readiness, abort
if [[ $FAILED -gt 0 ]]; then
    fail "CRITICAL: Health checks failed - aborting"
    exit 1
fi

# ============================================
# STEP 2: AUTHENTICATION (Get JWT Token)
# ============================================

echo ""
info "Step 2: Authentication"

# Step 2a: Register a new test user
info "Registering test user: $TEST_EMAIL"

REGISTER_BODY=$(cat <<EOF
{
    "email": "$TEST_EMAIL",
    "password": "$TEST_PASSWORD",
    "name": "$TEST_NAME",
    "role": "WORKER"
}
EOF
)

http_request "POST" "${API_URL}/api/v1/auth/register" "$REGISTER_BODY" ""

if [[ "$HTTP_CODE" == "201" || "$HTTP_CODE" == "200" ]]; then
    success "User registered (HTTP $HTTP_CODE)"
    # Extract token from response
    TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
elif [[ "$HTTP_CODE" == "409" ]]; then
    info "User already exists (HTTP 409) - will login"
elif [[ "$HTTP_CODE" == "400" ]] && echo "$BODY" | grep -qi "already\|exists\|duplicate"; then
    info "User already exists - will login"
else
    warn "Register returned HTTP $HTTP_CODE - trying login anyway"
    if [[ -n "$BODY" ]]; then
        echo "    Response: ${BODY:0:200}"
    fi
fi

# Step 2b: Login if we don't have a token yet
if [[ -z "$TOKEN" ]]; then
    info "Logging in..."
    
    LOGIN_BODY=$(cat <<EOF
{
    "email": "$TEST_EMAIL",
    "password": "$TEST_PASSWORD"
}
EOF
)
    
    http_request "POST" "${API_URL}/api/v1/auth/login" "$LOGIN_BODY" ""
    
    if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
        success "Login successful (HTTP $HTTP_CODE)"
        TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    else
        fail "Login failed (HTTP $HTTP_CODE)"
        if [[ -n "$BODY" ]]; then
            echo "    Response: ${BODY:0:200}"
        fi
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
info "Step 3: Protected Endpoints"

# Test GET /api/v1/auth/me (current user info)
test_endpoint "Get current user (/auth/me)" "GET" "/api/v1/auth/me" "" "200" "true"

# Test GET /api/v1/profile (user profile) - may return 404 if no profile
test_endpoint "Get profile (/profile)" "GET" "/api/v1/profile" "" "200,404" "true"

# ============================================
# STEP 4: CLEANUP (Delete test user)
# ============================================

echo ""
info "Step 4: Cleanup"

if [[ -n "$TOKEN" ]]; then
    info "Deleting test account..."
    
    DELETE_BODY='{"confirm":"DELETE"}'
    
    http_request "DELETE" "${API_URL}/api/v1/auth/account" "$DELETE_BODY" "$TOKEN"
    
    if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "204" ]]; then
        success "Test account deleted"
    else
        warn "Could not delete test account (HTTP $HTTP_CODE) - non-critical"
    fi
else
    skip "Account cleanup (no token)"
fi

# ============================================
# STEP 5: OPTIONAL CHECKS (Don't fail on these)
# ============================================

echo ""
info "Step 5: Optional Checks"

# Swagger docs (may be disabled in prod)
http_request "GET" "${API_URL}/api/docs" "" ""
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "301" || "$HTTP_CODE" == "302" ]]; then
    success "Swagger docs available (HTTP $HTTP_CODE)"
else
    skip "Swagger docs (HTTP $HTTP_CODE)"
fi

# ============================================
# SUMMARY
# ============================================

echo ""
echo "========================================"
echo "  SMOKE TEST RESULTS"
echo "========================================"
echo ""
echo "${GREEN}Passed:  $PASSED${NC}"
echo "${RED}Failed:  $FAILED${NC}"
echo "${YELLOW}Skipped: $SKIPPED${NC}"
echo ""

# ============================================
# EXIT CODE
# ============================================

if [[ $FAILED -gt 0 ]]; then
    echo "${RED}❌ SMOKE TESTS FAILED${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check server logs for errors"
    echo "  2. Verify DATABASE_URL is correct"
    echo "  3. Check JWT_SECRET is set"
    echo "  4. Ensure migrations are applied"
    exit 1
else
    echo "${GREEN}✅ ALL SMOKE TESTS PASSED${NC}"
    exit 0
fi
