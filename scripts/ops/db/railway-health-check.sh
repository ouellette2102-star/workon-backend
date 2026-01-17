#!/bin/bash
# =============================================================================
# Railway DB Health Check Script
# =============================================================================
# Usage: ./scripts/ops/db/railway-health-check.sh
# Requires: DATABASE_URL environment variable
# Impact: READ-ONLY — no modifications to database
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Railway DB Health Check (Read-Only)                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# -----------------------------------------------------------------------------
# Check prerequisites
# -----------------------------------------------------------------------------

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL is not set${NC}"
    echo ""
    echo "Set it via:"
    echo "  export DATABASE_URL=\"postgresql://user:pass@host:port/db\""
    echo ""
    echo "Or get it from Railway Dashboard → PostgreSQL → Connect"
    exit 1
fi

echo -e "${GREEN}✓ DATABASE_URL is set${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 1: Prisma migrate status
# -----------------------------------------------------------------------------

echo -e "${BLUE}━━━ Step 1: Prisma Migration Status ━━━${NC}"
echo ""

if command -v npx &> /dev/null; then
    npx prisma migrate status 2>&1 || true
else
    echo -e "${YELLOW}⚠ npx not found, skipping Prisma check${NC}"
fi

echo ""

# -----------------------------------------------------------------------------
# Step 2: List tables in database
# -----------------------------------------------------------------------------

echo -e "${BLUE}━━━ Step 2: Tables in Database ━━━${NC}"
echo ""

if command -v psql &> /dev/null; then
    psql "$DATABASE_URL" -c "\dt" 2>&1 || echo -e "${RED}❌ Failed to connect to database${NC}"
else
    echo -e "${YELLOW}⚠ psql not found. Install PostgreSQL client or use Railway Dashboard.${NC}"
fi

echo ""

# -----------------------------------------------------------------------------
# Step 3: Check critical tables
# -----------------------------------------------------------------------------

echo -e "${BLUE}━━━ Step 3: Critical Tables Check ━━━${NC}"
echo ""

CRITICAL_TABLES=(
    "_prisma_migrations"
    "local_users"
    "local_missions"
    "users"
    "missions"
    "invoices"
    "stripe_events"
    "email_otp"
    "mission_events"
    "mission_photos"
    "local_offers"
)

if command -v psql &> /dev/null; then
    for table in "${CRITICAL_TABLES[@]}"; do
        EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null | tr -d '[:space:]')
        if [ "$EXISTS" = "t" ]; then
            echo -e "  ${GREEN}✓${NC} $table"
        else
            echo -e "  ${RED}✗${NC} $table ${YELLOW}(MISSING)${NC}"
        fi
    done
else
    echo -e "${YELLOW}⚠ psql not available, cannot check tables${NC}"
fi

echo ""

# -----------------------------------------------------------------------------
# Step 4: Row counts (sanity check)
# -----------------------------------------------------------------------------

echo -e "${BLUE}━━━ Step 4: Row Counts (Top 10) ━━━${NC}"
echo ""

if command -v psql &> /dev/null; then
    psql "$DATABASE_URL" -c "SELECT relname AS table, n_live_tup AS rows FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;" 2>&1 || true
fi

echo ""

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

echo -e "${BLUE}━━━ Summary ━━━${NC}"
echo ""
echo "Review the output above to determine:"
echo "  1. Are all migrations applied?"
echo "  2. Are all expected tables present?"
echo "  3. Do row counts look reasonable?"
echo ""
echo -e "${YELLOW}⚠ This script is READ-ONLY. No changes were made.${NC}"
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Health Check Complete                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

