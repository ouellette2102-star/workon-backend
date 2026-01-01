#!/bin/bash
# ============================================
# WorkOn Backend Smoke Tests (Bash/Linux/CI)
# ============================================
#
# USAGE:
#   ./scripts/smoke_backend.sh [API_URL]
#   ./scripts/smoke_backend.sh "http://localhost:8080"
#
# EXIT CODES:
#   0 = All critical tests passed
#   1 = Critical test failed
#
# ============================================

set -u  # Exit on undefined variables

API_URL="${1:-http://localhost:8080}"

# ============================================
# CONFIGURATION
# ============================================

# Deterministic test user with timestamp for uniqueness
RUN_ID="${GITHUB_RUN_ID:-$(date +%s)}"
TEST_EMAIL="qa-smoke-${RUN_ID}@ci.workon.test"
TEST_PASSWORD="SmokeTest2024!SecureP@ss"
TEST_FIRST_NAME="QA"
TEST_LAST_NAME="Smoke"

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
# COUNTERS & STATE
# ============================================

PASSED=0
FAILED=0
SKIPPED=0
TOKEN=""
HTTP_CODE=""
BODY=""

# ============================================
# HELPER FUNCTIONS
# ============================================

log() { echo "[$(date '+%H:%M:%S')] $1"; }
success() { log "${GREEN}✅ PASS: $1${NC}"; ((PASSED++)) || true; }
fail() { log "${RED}❌ FAIL: $1${NC}"; ((FAILED++)) || true; }
warn() { log "${YELLOW}⚠️  WARN: $1${NC}"; }
info() { log "${CYAN}ℹ️  $1${NC}"; }
skip() { log "${YELLOW}⏭️  SKIP: $1${NC}"; ((SKIPPED++)) || true; }

# ============================================
# HTTP REQUEST FUNCTION
# ============================================
# Sets global vars: HTTP_CODE, BODY

do_request() {
    local method="$1"
    local url="$2"
    local data="${3:-}"
    local auth="${4:-}"
    
    local args=(-s -w "\n%{http_code}" --max-time 30)
    args+=(-X "$method")
    
    [[ -n "$auth" ]] && args+=(-H "Authorization: Bearer $auth")
    [[ -n "$data" ]] && args+=(-H "Content-Type: application/json" -d "$data")
    
    local response
    response=$(curl "${args[@]}" "$url" 2>/dev/null) || response=$'\n000'
    
    HTTP_CODE=$(echo "$response" | tail -n1)
    BODY=$(echo "$response" | sed '$d' | tr -d '\n\r')
}

# ============================================
# TOKEN EXTRACTION (robust, handles any JSON format)
# ============================================

extract_token() {
    local json="$1"
    # Remove whitespace and extract accessToken value
    echo "$json" | sed 's/.*"accessToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' | head -1
}

# ============================================
# TEST A SINGLE ENDPOINT
# ============================================

test_endpoint() {
    local name="$1"
    local method="$2"
    local path="$3"
    local data="$4"
    local expected="$5"
    local need_auth="${6:-false}"
    
    if [[ "$need_auth" == "true" && -z "$TOKEN" ]]; then
        skip "$name (no auth token)"
        return 0
    fi
    
    local auth=""
    [[ "$need_auth" == "true" ]] && auth="$TOKEN"
    
    do_request "$method" "${API_URL}${path}" "$data" "$auth"
    
    # Check if response matches expected codes
    local ok=false
    for code in ${expected//,/ }; do
        [[ "$HTTP_CODE" == "$code" ]] && ok=true && break
    done
    
    if $ok; then
        success "$name (HTTP $HTTP_CODE)"
        return 0
    else
        fail "$name - got HTTP $HTTP_CODE, expected $expected"
        [[ -n "$BODY" ]] && echo "       Response: ${BODY:0:300}"
        return 1
    fi
}

# ============================================
# MAIN
# ============================================

echo ""
echo "========================================"
echo "  WorkOn Backend Smoke Tests"
echo "========================================"
echo "  URL:   $API_URL"
echo "  Email: $TEST_EMAIL"
echo "  Time:  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# --------------------------------------------
# STEP 0: WAIT FOR SERVER READINESS
# --------------------------------------------

info "Step 0: Waiting for server readiness..."

READY=false
for i in {1..15}; do
    do_request "GET" "${API_URL}/readyz" "" ""
    if [[ "$HTTP_CODE" == "200" ]]; then
        READY=true
        success "Server ready"
        break
    fi
    info "  Attempt $i/15 - HTTP $HTTP_CODE"
    sleep 2
done

if ! $READY; then
    fail "Server not ready after 30s"
    echo "Last response: $BODY"
    exit 1
fi

# --------------------------------------------
# STEP 1: HEALTH CHECKS
# --------------------------------------------

echo ""
info "Step 1: Health Checks"

test_endpoint "Liveness (/healthz)" "GET" "/healthz" "" "200" "false"
test_endpoint "Readiness (/readyz)" "GET" "/readyz" "" "200" "false"

if [[ $FAILED -gt 0 ]]; then
    fail "Health checks failed - aborting"
    exit 1
fi

# --------------------------------------------
# STEP 2: AUTHENTICATION
# --------------------------------------------

echo ""
info "Step 2: Authentication"

# 2a: Register new user
info "Registering: $TEST_EMAIL"

REGISTER_JSON="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"firstName\":\"$TEST_FIRST_NAME\",\"lastName\":\"$TEST_LAST_NAME\",\"role\":\"worker\"}"

do_request "POST" "${API_URL}/api/v1/auth/register" "$REGISTER_JSON" ""

info "Register response: HTTP $HTTP_CODE"
info "Response body (first 200 chars): ${BODY:0:200}"

if [[ "$HTTP_CODE" == "201" || "$HTTP_CODE" == "200" ]]; then
    success "User registered (HTTP $HTTP_CODE)"
    TOKEN=$(extract_token "$BODY")
    if [[ -n "$TOKEN" && ${#TOKEN} -gt 20 ]]; then
        info "Token extracted: ${#TOKEN} chars"
    else
        warn "Token extraction may have failed, will try login"
        TOKEN=""
    fi
elif [[ "$HTTP_CODE" == "409" || "$HTTP_CODE" == "400" ]]; then
    info "User may exist (HTTP $HTTP_CODE) - will login"
else
    warn "Register returned HTTP $HTTP_CODE"
    echo "       Body: ${BODY:0:300}"
fi

# 2b: Login if no token yet
if [[ -z "$TOKEN" ]]; then
    info "Attempting login..."
    
    LOGIN_JSON="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
    
    do_request "POST" "${API_URL}/api/v1/auth/login" "$LOGIN_JSON" ""
    
    info "Login response: HTTP $HTTP_CODE"
    
    if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
        success "Login successful (HTTP $HTTP_CODE)"
        TOKEN=$(extract_token "$BODY")
        if [[ -n "$TOKEN" && ${#TOKEN} -gt 20 ]]; then
            info "Token extracted: ${#TOKEN} chars"
        else
            fail "Could not extract token from login response"
            echo "       Body: ${BODY:0:300}"
        fi
    else
        fail "Login failed (HTTP $HTTP_CODE)"
        echo "       Body: ${BODY:0:300}"
    fi
fi

# Final token check
if [[ -n "$TOKEN" ]]; then
    info "Auth complete - token: ${#TOKEN} chars"
else
    warn "No token acquired - protected tests will skip"
fi

# --------------------------------------------
# STEP 3: PROTECTED ENDPOINTS
# --------------------------------------------

echo ""
info "Step 3: Protected Endpoints"

test_endpoint "Current user (/auth/me)" "GET" "/api/v1/auth/me" "" "200" "true"
test_endpoint "User profile (/profile)" "GET" "/api/v1/profile" "" "200,404" "true"

# --------------------------------------------
# STEP 4: CLEANUP
# --------------------------------------------

echo ""
info "Step 4: Cleanup"

if [[ -n "$TOKEN" ]]; then
    do_request "DELETE" "${API_URL}/api/v1/auth/account" '{"confirm":"DELETE"}' "$TOKEN"
    if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "204" ]]; then
        success "Test account deleted"
    else
        warn "Cleanup returned HTTP $HTTP_CODE (non-critical)"
    fi
else
    skip "Cleanup (no token)"
fi

# --------------------------------------------
# STEP 5: OPTIONAL (non-critical)
# --------------------------------------------

echo ""
info "Step 5: Optional Checks"

do_request "GET" "${API_URL}/api/docs" "" ""
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "301" || "$HTTP_CODE" == "302" ]]; then
    success "Swagger docs (HTTP $HTTP_CODE)"
else
    skip "Swagger docs (HTTP $HTTP_CODE)"
fi

# ============================================
# SUMMARY
# ============================================

echo ""
echo "========================================"
echo "  RESULTS"
echo "========================================"
echo "  ${GREEN}Passed:  $PASSED${NC}"
echo "  ${RED}Failed:  $FAILED${NC}"
echo "  ${YELLOW}Skipped: $SKIPPED${NC}"
echo "========================================"
echo ""

if [[ $FAILED -gt 0 ]]; then
    echo "${RED}❌ SMOKE TESTS FAILED${NC}"
    exit 1
fi

echo "${GREEN}✅ ALL SMOKE TESTS PASSED${NC}"
exit 0
