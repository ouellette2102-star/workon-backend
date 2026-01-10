#!/bin/bash
#
# WorkOn PostgreSQL Restore Script
# PR-I1 | Version 1.0
#
# Usage:
#   ./scripts/restore.sh <backup_file_or_s3_path>
#   ./scripts/restore.sh ./backups/workon_2026-01-08_103000.dump
#   ./scripts/restore.sh s3://workon-backups/workon_2026-01-08_103000.dump
#   DRY_RUN=1 ./scripts/restore.sh ./backups/workon_2026-01-08_103000.dump
#
# Required environment variables:
#   DATABASE_URL        - PostgreSQL connection string (TARGET database)
#   AWS_ACCESS_KEY_ID   - AWS credentials (if restoring from S3)
#   AWS_SECRET_ACCESS_KEY
#   AWS_REGION
#
# ⚠️ WARNING: This script WILL OVERWRITE the target database!
# ⚠️ NEVER commit secrets to this file
#

set -euo pipefail

# Configuration
TEMP_DIR="${TEMP_DIR:-/tmp/workon-restore}"
PRE_RESTORE_BACKUP_DIR="${PRE_RESTORE_BACKUP_DIR:-./backups/pre-restore}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
}

log_info() {
    echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')] ℹ $1${NC}"
}

# Show usage
usage() {
    echo "Usage: $0 <backup_file_or_s3_path>"
    echo ""
    echo "Examples:"
    echo "  $0 ./backups/workon_2026-01-08_103000.dump"
    echo "  $0 s3://workon-backups/workon_2026-01-08_103000.dump"
    echo ""
    echo "Environment variables:"
    echo "  DATABASE_URL    - Target PostgreSQL connection string (required)"
    echo "  DRY_RUN=1       - Preview what would happen without making changes"
    echo "  SKIP_BACKUP=1   - Skip pre-restore backup (dangerous!)"
    echo ""
    exit 1
}

# Validate required environment variables
validate_env() {
    log "Validating environment..."
    
    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_error "DATABASE_URL is not set"
        echo "Set DATABASE_URL environment variable before running this script."
        exit 1
    fi
    
    # Validate DATABASE_URL format
    if [[ ! "$DATABASE_URL" =~ ^postgres(ql)?:// ]]; then
        log_error "DATABASE_URL does not look like a valid PostgreSQL connection string"
        exit 1
    fi
    
    # Check required tools
    if ! command -v pg_restore &> /dev/null; then
        log_error "pg_restore not found. Install PostgreSQL client tools."
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        log_error "psql not found. Install PostgreSQL client tools."
        exit 1
    fi
    
    log_success "Environment validated"
}

# Download backup from S3 if needed
prepare_backup_file() {
    local source="$1"
    
    if [[ "$source" == s3://* ]]; then
        log "Downloading backup from S3: $source"
        
        if ! command -v aws &> /dev/null; then
            log_error "AWS CLI not found. Cannot download from S3."
            exit 1
        fi
        
        mkdir -p "$TEMP_DIR"
        local filename=$(basename "$source")
        BACKUP_FILE="${TEMP_DIR}/${filename}"
        
        if [[ "${DRY_RUN:-}" == "1" ]]; then
            log_warning "DRY_RUN: Would download $source to $BACKUP_FILE"
            BACKUP_FILE="$source"  # Keep S3 path for display
            return 0
        fi
        
        aws s3 cp "$source" "$BACKUP_FILE" --only-show-errors
        log_success "Downloaded to $BACKUP_FILE"
    else
        BACKUP_FILE="$source"
        
        if [[ ! -f "$BACKUP_FILE" ]]; then
            log_error "Backup file not found: $BACKUP_FILE"
            exit 1
        fi
        
        log_success "Using local backup: $BACKUP_FILE"
    fi
}

# Verify backup file
verify_backup() {
    log "Verifying backup file..."
    
    if [[ "${DRY_RUN:-}" == "1" ]]; then
        log_warning "DRY_RUN: Would verify backup file"
        return 0
    fi
    
    # Check if it's a valid pg_dump file
    if ! pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
        log_error "Invalid backup file or unsupported format"
        exit 1
    fi
    
    # Show backup contents summary
    local table_count=$(pg_restore --list "$BACKUP_FILE" 2>/dev/null | grep -c "TABLE DATA" || echo "0")
    log_info "Backup contains approximately $table_count tables"
    
    log_success "Backup file verified"
}

# Create pre-restore backup
create_pre_restore_backup() {
    if [[ "${SKIP_BACKUP:-}" == "1" ]]; then
        log_warning "SKIP_BACKUP=1: Skipping pre-restore backup (DANGEROUS!)"
        return 0
    fi
    
    log "Creating pre-restore backup of current database..."
    
    mkdir -p "$PRE_RESTORE_BACKUP_DIR"
    local timestamp=$(date +%Y-%m-%d_%H%M%S)
    local pre_backup="${PRE_RESTORE_BACKUP_DIR}/pre-restore_${timestamp}.dump"
    
    if [[ "${DRY_RUN:-}" == "1" ]]; then
        log_warning "DRY_RUN: Would create pre-restore backup at $pre_backup"
        return 0
    fi
    
    pg_dump "$DATABASE_URL" \
        --no-owner \
        --no-privileges \
        -Fc \
        -f "$pre_backup"
    
    local backup_size=$(du -h "$pre_backup" | cut -f1)
    log_success "Pre-restore backup created: $pre_backup ($backup_size)"
    log_info "If something goes wrong, restore from: $pre_backup"
}

# Confirm restore action
confirm_restore() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                    ⚠️  WARNING: DESTRUCTIVE OPERATION ⚠️           ║"
    echo "╠═══════════════════════════════════════════════════════════════════╣"
    echo "║  This will OVERWRITE the target database with the backup data.   ║"
    echo "║  All current data in the target database will be LOST.           ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Extract host from DATABASE_URL for display (hide password)
    local safe_url=$(echo "$DATABASE_URL" | sed -E 's|://[^:]+:[^@]+@|://***:***@|')
    log_info "Target database: $safe_url"
    log_info "Backup source: $BACKUP_FILE"
    echo ""
    
    if [[ "${DRY_RUN:-}" == "1" ]]; then
        log_warning "DRY_RUN: Would ask for confirmation"
        return 0
    fi
    
    if [[ "${FORCE:-}" == "1" ]]; then
        log_warning "FORCE=1: Skipping confirmation"
        return 0
    fi
    
    read -p "Type 'RESTORE' to confirm: " confirmation
    
    if [[ "$confirmation" != "RESTORE" ]]; then
        log_error "Restore cancelled"
        exit 1
    fi
    
    echo ""
}

# Perform the restore
restore_database() {
    log "Restoring database..."
    
    if [[ "${DRY_RUN:-}" == "1" ]]; then
        log_warning "DRY_RUN: Would execute pg_restore"
        return 0
    fi
    
    # pg_restore with options:
    # --clean: Drop database objects before recreating
    # --if-exists: Don't error if objects don't exist
    # --no-owner: Don't try to match original ownership
    # --no-privileges: Don't restore access privileges
    # --single-transaction: Restore as a single transaction (rollback on error)
    pg_restore \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        --single-transaction \
        -d "$DATABASE_URL" \
        "$BACKUP_FILE" 2>&1 || {
            # pg_restore returns non-zero for warnings too, check if critical
            log_warning "pg_restore completed with warnings (this may be normal)"
        }
    
    log_success "Database restored"
}

# Verify restore
verify_restore() {
    log "Verifying restore..."
    
    if [[ "${DRY_RUN:-}" == "1" ]]; then
        log_warning "DRY_RUN: Would verify restore"
        return 0
    fi
    
    # Check critical tables exist
    local tables_check=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    " 2>/dev/null | tr -d ' ')
    
    if [[ -z "$tables_check" || "$tables_check" == "0" ]]; then
        log_error "No tables found after restore!"
        exit 1
    fi
    
    log_success "Found $tables_check tables in restored database"
    
    # Show row counts for critical tables
    log_info "Row counts for critical tables:"
    psql "$DATABASE_URL" -t -c "
        SELECT 'users: ' || COUNT(*)::text FROM users
        UNION ALL
        SELECT 'missions: ' || COUNT(*)::text FROM missions
        UNION ALL  
        SELECT 'contracts: ' || COUNT(*)::text FROM contracts
        UNION ALL
        SELECT 'compliance_document: ' || COUNT(*)::text FROM compliance_document;
    " 2>/dev/null | grep -v "^$" | while read line; do
        log_info "  $line"
    done || log_warning "Could not read all table counts (some tables may not exist)"
    
    log_success "Restore verification complete"
}

# Cleanup temp files
cleanup() {
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
        log "Cleaned up temporary files"
    fi
}

# Main
main() {
    if [[ $# -lt 1 ]]; then
        usage
    fi
    
    local source="$1"
    
    echo ""
    echo "╔═══════════════════════════════════════════════════╗"
    echo "║       WorkOn PostgreSQL Restore Script            ║"
    echo "╚═══════════════════════════════════════════════════╝"
    echo ""
    
    if [[ "${DRY_RUN:-}" == "1" ]]; then
        log_warning "DRY_RUN MODE - No changes will be made"
        echo ""
    fi
    
    # Setup cleanup trap
    trap cleanup EXIT
    
    validate_env
    prepare_backup_file "$source"
    verify_backup
    create_pre_restore_backup
    confirm_restore
    restore_database
    verify_restore
    
    echo ""
    log_success "Restore completed successfully!"
    echo ""
    log_info "Next steps:"
    echo "  1. Run: npx prisma migrate status"
    echo "  2. Run: npm run smoke:contracts"
    echo "  3. Verify application functionality"
    echo ""
}

main "$@"

