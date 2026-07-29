#!/usr/bin/env bash
# =============================================================================
# FlyHigh AWS — Populate Secrets Manager (Staging + Production)
# =============================================================================
# Interactive script that prompts for every secret value needed by the FlyHigh
# app and writes them to AWS Secrets Manager under the standard secret paths.
#
# Secrets are stored as plain key-value JSON objects in Secrets Manager.
# Each environment gets its own secret:
#   FlyHigh/staging/db
#   FlyHigh/staging/jwt
#   FlyHigh/staging/api-keys
#   FlyHigh/production/db
#   FlyHigh/production/jwt
#   FlyHigh/production/api-keys
#
# Prerequisites:
#   - AWS CLI installed and on PATH
#   - Active AWS credentials with secretsmanager:* permissions
#
# Usage:
#   ./populate-secrets.sh
#   AWS_REGION=eu-west-1 ./populate-secrets.sh
# =============================================================================

set -euo pipefail

# ---- Configurable via environment -------------------------------------------
AWS_REGION="${AWS_REGION:-us-east-1}"

# ---- Colors -----------------------------------------------------------------
readonly RESET='\033[0m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'

# ---- Helpers ----------------------------------------------------------------
section()  { printf "\n${BOLD}${CYAN}==> %s${RESET}\n\n" "$1"; }
info()     { printf "    ${DIM}%s${RESET}\n" "$1"; }
ok()       { printf "  ${GREEN}OK${RESET}  %s\n" "$1"; }
warn()     { printf "  ${YELLOW}WARN${RESET} %s\n" "$1"; }
fail()     { printf "  ${RED}FAIL${RESET} %s\n" "$1"; }
abort()    { printf "\n${RED}${BOLD}FATAL:${RESET} %s\n" "$1"; exit 1; }

die() {
    abort "$1"
}

# Prompt the user for a value with validation
# Usage: prompt_value <varname> <label> [--required] [--sensitive] [--default <val>] [--hint <hint>]
prompt_value() {
    local varname="$1"
    local label="$2"
    shift 2

    local required=false
    local sensitive=false
    local default=""
    local hint=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --required)  required=true; shift ;;
            --sensitive) sensitive=true; shift ;;
            --default)   default="$2"; shift 2 ;;
            --hint)      hint="$2"; shift 2 ;;
            *)           shift ;;
        esac
    done

    local prompt_text="${label}"
    [[ -n "$hint" ]]     && prompt_text="${prompt_text} ${DIM}(${hint})${RESET}"
    [[ -n "$default" ]]  && prompt_text="${prompt_text} ${DIM}[${default}]${RESET}"
    [[ "$required" == true ]] && prompt_text="${BOLD}${YELLOW}* ${RESET}${prompt_text}"

    while true; do
        printf "  ${prompt_text}: "
        if [[ "$sensitive" == true ]]; then
            read -rs input_val
            printf "\n"
            [[ -z "$input_val" && -n "$default" ]] && input_val="$default"
        else
            read -r input_val
            [[ -z "$input_val" && -n "$default" ]] && input_val="$default"
        fi

        if [[ "$required" == true && -z "$input_val" ]]; then
            printf "  ${RED}This field is required.${RESET}\n"
            continue
        fi

        break
    done

    # Assign to the caller's variable via indirect reference
    printf -v "$varname" '%s' "$input_val"
}

# Write a key-value JSON secret to AWS Secrets Manager
# Usage: put_secret <secret_name> <json_payload>
put_secret() {
    local secret_name="$1"
    local json_payload="$2"

    if aws secretsmanager describe-secret --secret-id "$secret_name" --region "$AWS_REGION" &>/dev/null; then
        info "Secret '${secret_name}' exists — updating value."
        aws secretsmanager put-secret-value \
            --secret-id "$secret_name" \
            --secret-string "$json_payload" \
            --region "$AWS_REGION" \
            --no-cli-pager &>/dev/null
        ok "Updated: ${secret_name}"
    else
        info "Creating secret '${secret_name}' ..."
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --secret-string "$json_payload" \
            --description "FlyHigh ${secret_name} — managed by populate-secrets.sh" \
            --region "$AWS_REGION" \
            --no-cli-pager &>/dev/null
        ok "Created: ${secret_name}"
    fi
}

# ---- Preflight checks -------------------------------------------------------
preflight() {
    section "Preflight checks"

    if ! command -v aws &>/dev/null; then
        die "AWS CLI not found on PATH. Install it: https://aws.amazon.com/cli/"
    fi
    ok "AWS CLI found."

    if ! command -v jq &>/dev/null; then
        die "jq is required. Install it: https://jqlang.github.io/jq/"
    fi
    ok "jq found."

    if ! aws sts get-caller-identity &>/dev/null; then
        die "AWS credentials not configured or expired. Run 'aws configure' or refresh your session."
    fi
    local identity
    identity=$(aws sts get-caller-identity --query 'Arn' --output text)
    ok "Authenticated as: ${identity}"
    info "Region: ${AWS_REGION}"
}

# ---- Banner -----------------------------------------------------------------
banner() {
    printf "${BOLD}${MAGENTA}"
    printf "╔══════════════════════════════════════════════════════════════╗\n"
    printf "║    FlyHigh AWS — Secrets Manager Population (Interactive)   ║\n"
    printf "╚══════════════════════════════════════════════════════════════╝"
    printf "${RESET}\n\n"

    printf "This script will prompt you for all secrets needed by the FlyHigh\n"
    printf "application across ${BOLD}staging${RESET} and ${BOLD}production${RESET} environments.\n\n"
    printf "${DIM}Tips:${RESET}\n"
    printf "  - Press ${BOLD}Enter${RESET} to accept a default value (shown in brackets).\n"
    printf "  - Sensitive fields (passwords, keys) have their input hidden.\n"
    printf "  - Required fields are marked with ${BOLD}${YELLOW}*${RESET} and cannot be blank.\n"
    printf "  - Press ${BOLD}Ctrl+C${RESET} at any time to abort (nothing is sent to AWS\n"
    printf "    until all values are collected).\n\n"
}

# ---- Collect all values first (no AWS writes until confirmed) ---------------
collect_secrets() {
    local env="$1"  # staging or production
    local tag="$2"  # visual tag, e.g. "STAGING" or "PRODUCTION"
    local color="$3"

    printf "\n${BOLD}${color}▌ ${tag} ENVIRONMENT${RESET}\n\n"

    # -- Database -------------------------------------------------------------
    section "${env^} — Database (RDS)"

    prompt_value DB_HOST_${env}     "Database host"         --required --hint "e.g. flyhigh-${env}.xyz.us-east-1.rds.amazonaws.com"
    prompt_value DB_PORT_${env}     "Database port"         --default "5432" --hint "5432 for PostgreSQL"
    prompt_value DB_NAME_${env}     "Database name"         --required --default "flyhigh_${env}"
    prompt_value DB_USER_${env}     "Database username"     --required --default "flyhigh_admin"
    prompt_value DB_PASSWORD_${env} "Database password"     --required --sensitive

    # -- JWT ------------------------------------------------------------------
    section "${env^} — JWT / Auth"

    prompt_value JWT_SECRET_${env}      "JWT signing secret"           --required --sensitive \
        --hint "at least 256-bit random string"
    prompt_value JWT_ISSUER_${env}      "JWT issuer"                   --default "flyhigh-${env}" \
        --hint "e.g. flyhigh-${env}"
    prompt_value JWT_EXPIRY_${env}      "JWT expiry duration"          --default "1h" \
        --hint "e.g. 15m, 1h, 24h"

    # -- API Keys -------------------------------------------------------------
    section "${env^} — External API Keys"

    prompt_value SENDGRID_API_KEY_${env}   "SendGrid API key"            --sensitive --hint "(optional)"
    prompt_value STRIPE_SECRET_KEY_${env}  "Stripe secret key"           --sensitive --hint "(optional)"
    prompt_value MAPS_API_KEY_${env}       "Google Maps API key"         --hint "(optional)"
    prompt_value OPENAI_API_KEY_${env}     "OpenAI API key"              --sensitive --hint "(optional)"
}

# ---- Write a single environment's secrets -----------------------------------
write_environment_secrets() {
    local env="$1"

    section "Writing ${env} secrets to AWS Secrets Manager"

    # Build JSON payloads with jq — ensures safe escaping
    local db_json jwt_json apikeys_json

    # Database secret
    db_json=$(jq -n \
        --arg host     "$(eval echo \$DB_HOST_${env})" \
        --arg port     "$(eval echo \$DB_PORT_${env})" \
        --arg dbname   "$(eval echo \$DB_NAME_${env})" \
        --arg username "$(eval echo \$DB_USER_${env})" \
        --arg password "$(eval echo \$DB_PASSWORD_${env})" \
        '{host: $host, port: $port, dbname: $dbname, username: $username, password: $password}')

    put_secret "FlyHigh/${env}/db" "$db_json"

    # JWT secret
    jwt_json=$(jq -n \
        --arg secret "$(eval echo \$JWT_SECRET_${env})" \
        --arg issuer "$(eval echo \$JWT_ISSUER_${env})" \
        --arg expiry "$(eval echo \$JWT_EXPIRY_${env})" \
        '{secret: $secret, issuer: $issuer, expiry: $expiry}')

    put_secret "FlyHigh/${env}/jwt" "$jwt_json"

    # API Keys secret — only include non-empty values
    local sendgrid_key stripe_key maps_key openai_key
    sendgrid_key="$(eval echo \$SENDGRID_API_KEY_${env})"
    stripe_key="$(eval echo \$STRIPE_SECRET_KEY_${env})"
    maps_key="$(eval echo \$MAPS_API_KEY_${env})"
    openai_key="$(eval echo \$OPENAI_API_KEY_${env})"

    apikeys_json=$(jq -n \
        --arg sendgrid "${sendgrid_key}" \
        --arg stripe   "${stripe_key}" \
        --arg maps     "${maps_key}" \
        --arg openai   "${openai_key}" \
        '{sendgrid_api_key: $sendgrid,
          stripe_secret_key: $stripe,
          google_maps_api_key: $maps,
          openai_api_key: $openai} |
         with_entries(select(.value != ""))')

    if [[ "$apikeys_json" == "{}" ]]; then
        warn "No API keys provided for ${env} — skipping FlyHigh/${env}/api-keys."
    else
        put_secret "FlyHigh/${env}/api-keys" "$apikeys_json"
    fi

    ok "All ${env} secrets written."
}

# ---- Review & Confirm -------------------------------------------------------
confirm_before_write() {
    printf "\n${BOLD}${BLUE}══════════════════════════════════════════════════════════════${RESET}\n"
    printf "${BOLD}${BLUE}  Ready to write all secrets to AWS Secrets Manager${RESET}\n"
    printf "${BOLD}${BLUE}  Region: ${AWS_REGION}${RESET}\n"
    printf "${BOLD}${BLUE}══════════════════════════════════════════════════════════════${RESET}\n\n"

    printf "The following secrets will be ${BOLD}created or updated${RESET}:\n\n"

    for env in staging production; do
        printf "  ${CYAN}${BOLD}${env}${RESET}\n"
        printf "    FlyHigh/${env}/db\n"
        printf "    FlyHigh/${env}/jwt\n"
        printf "    FlyHigh/${env}/api-keys\n"
        printf "\n"
    done

    printf "${YELLOW}${BOLD}This will overwrite any existing values.${RESET}\n\n"

    local answer
    while true; do
        printf "Proceed? ${BOLD}[y/N]${RESET}: "
        read -r answer
        case "${answer,,}" in
            y|yes) return 0 ;;
            n|no|"") printf "\n${YELLOW}Aborted by user. No changes made.${RESET}\n"; exit 0 ;;
            *) printf "  Please answer 'y' or 'n'.\n" ;;
        esac
    done
}

# ---- Post-write summary -----------------------------------------------------
print_post_summary() {
    section "Summary"

    printf "${GREEN}${BOLD}Secrets written successfully.${RESET}\n\n"

    printf "To verify, run:\n"
    printf "  aws secretsmanager list-secrets --region ${AWS_REGION} --query 'SecretList[?starts_with(Name, \`FlyHigh/\`)].Name'\n\n"

    printf "Secret ARN format for CDK reference:\n"
    printf "  arn:aws:secretsmanager:${AWS_REGION}:<account-id>:secret:FlyHigh/${BOLD}<env>/<name>${RESET}-??????\n\n"
}

# ---- Main -------------------------------------------------------------------
main() {
    banner
    preflight

    # Collect all values before touching AWS
    collect_secrets "staging"     "STAGING"     "${BLUE}"
    collect_secrets "production"  "PRODUCTION"  "${MAGENTA}"

    # Confirm, then write
    confirm_before_write
    write_environment_secrets "staging"
    write_environment_secrets "production"

    print_post_summary

    printf "${GREEN}${BOLD}All done!${RESET} FlyHigh secrets are ready for CDK deployment.\n\n"
}

main "$@"
