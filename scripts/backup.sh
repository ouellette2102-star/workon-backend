#!/bin/bash
#
# WorkOn PostgreSQL Backup Script
# PR-I1 | Version 1.0
#
# Usage:
#   ./scripts/backup.sh
#   DRY_RUN=1 ./scripts/backup.sh
#
# Required environment variables:
#   DATABASE_URL        - PostgreSQL connection string
#   BACKUP_S3_BUCKET    - S3 bucket name (optional, skip S3 upload if not set)
#   AWS_ACCESS_KEY_ID   - AWS credentials (required if S3)
#   AWS_SECRET_ACCESS_KEY
#   AWS_REGION
#
# ⚠️ NEVER commit secrets to this file
#

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILENAME="workon_${TIMESTAMP}.dump"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Validate required environment variables
validate_env() {
    log "Validating environment..."
    
    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_error "DATABASE_URL is not set"
        echo "Set DATABASE_URL environment variable before running this script."
        echo "Example: DATABASE_URL=postgresql://user:pass@host:5432/db ./scripts/backup.sh"
        exit 1
    fi
    
    # Validate DATABASE_URL format (basic check)
    if [[ ! "$DATABASE_URL" =~ ^postgres(ql)?:// ]]; then
        log_error "DATABASE_URL does not look like a valid PostgreSQL connection string"
        exit 1
    fi
    
    # Check pg_dump availability
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump not found. Install PostgreSQL client tools."
        exit 1
    fi
    
    log_success "Environment validated"
}

# Create backup directory if needed
prepare_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Perform the database dump
dump_database() {
    log "Dumping database..."
    
    if [[ "${DRY_RUN:-}" == "1" ]]; then
        log_warning "DRY_RUN: Would execute pg_dump to $BACKUP_PATH"
        return 0
    fi
    
    # pg_dump with custom format (compressed)
    # --no-owner: don't output commands to set ownership
    # --no-privileges: don't output GRANT/REVOKE
    # -Fc: custom format (compressed)
    pg_dump "$DATABASE_URL" \
        --no-owner \
        --no-privileges \
        -Fc \
        -f "$BACKUP_PATH"
    
    if [[ ! -f "$BACKUP_PATH" ]]; then
        log_error "Backup file was not created"
        exit 1
    fi
    
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    log_success "Backup created: $BACKUP_PATH ($BACKUP_SIZE)"
}

# Upload to S3 (optional)
upload_to_s3() {
    if [[ -z "${BACKUP_S3_BUCKET:-}" ]]; then
        log_warning "BACKUP_S3_BUCKET not set, skipping S3 upload"
        return 0
    fi
    
    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI not found, skipping S3 upload"
        return 0
    fi
    
    local s3_path="s3://${BACKUP_S3_BUCKET}/${BACKUP_FILENAME}"
    
    log "Uploading to $s3_path..."
    
    if [[ "${DRY_RUN:-}" == "1" ]]; then
        log_warning "DRY_RUN: Would upload to $s3_path"
        return 0
    fi
    
    aws s3 cp "$BACKUP_PATH" "$s3_path" \
        --storage-class STANDARD_IA \
        --only-show-errors
    
    log_success "Uploaded to S3: $s3_path"
}

# Clean up old local backups
cleanup_local() {
    log "Cleaning up local backups older than ${RETENTION_DAYS} days..."
    
    if [[ "${DRY_RUN:-}" == "1" ]]; then
        log_warning "DRY_RUN: Would delete old backups"
        find "$BACKUP_DIR" -name "workon_*.dump" -mtime +${RETENTION_DAYS} -print
        return 0
    fi
    
    local deleted_count=0
    while IFS= read -r -d '' file; do
        rm -f "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "workon_*.dump" -mtime +${RETENTION_DAYS} -print0 2>/dev/null || true)
    
    if [[ $deleted_count -gt 0 ]]; then
        log_success "Deleted $deleted_count old backup(s)"
    else
        log "No old backups to delete"
    fi
}

# Clean up old S3 backups
cleanup_s3() {
    if [[ -z "${BACKUP_S3_BUCKET:-}" ]]; then
        return 0
    fi
    
    if ! command -v aws &> /dev/null; then
        return 0
    fi
    
    log "Cleaning up S3 backups older than ${RETENTION_DAYS} days..."
    
    if [[ "${DRY_RUN:-}" == "1" ]]; then
        log_warning "DRY_RUN: Would delete old S3 backups"
        return 0
    fi
    
    # Calculate cutoff date
    local cutoff_date
    if [[ "$(uname)" == "Darwin" ]]; then
        cutoff_date=$(date -v-${RETENTION_DAYS}d +%Y-%m-%d)
    else
        cutoff_date=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d)
    fi
    
    # List and delete old backups
    aws s3 ls "s3://${BACKUP_S3_BUCKET}/" | while read -r line; do
        local file_date=$(echo "$line" | awk '{print $1}')
        local filename=$(echo "$line" | awk '{print $4}')
        
        if [[ "$file_date" < "$cutoff_date" && "$filename" == workon_*.dump ]]; then
            aws s3 rm "s3://${BACKUP_S3_BUCKET}/${filename}" --only-show-errors
            log "Deleted old S3 backup: $filename"
        fi
    done
    
    log_success "S3 cleanup complete"
}

# Main
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════╗"
    echo "║       WorkOn PostgreSQL Backup Script             ║"
    echo "╚═══════════════════════════════════════════════════╝"
    echo ""
    
    if [[ "${DRY_RUN:-}" == "1" ]]; then
        log_warning "DRY_RUN MODE - No changes will be made"
        echo ""
    fi
    
    validate_env
    prepare_backup_dir
    dump_database
    upload_to_s3
    cleanup_local
    cleanup_s3
    
    echo ""
    log_success "Backup completed successfully: $BACKUP_FILENAME"
    echo ""
}

main "$@"

