#!/usr/bin/env bash
# =============================================================================
# FlyHigh AWS — GitHub OIDC Provider & IAM Role Setup
# =============================================================================
# Creates the GitHub Actions OIDC identity provider in AWS and the
# github-actions-cdk IAM role with AdministratorAccess (scoped for CDK
# deployments).  Safe to re-run — idempotent on the OIDC provider and
# trust-policy update.
#
# Prerequisites:
#   - AWS CLI installed and on PATH
#   - An active AWS profile / credentials with IAM admin permissions
#   - The FlyHigh GitHub org + repo names are known (defaults below)
#
# Usage:
#   ./setup-oidc.sh
#   GITHUB_ORG=my-org GITHUB_REPO=my-repo ./setup-oidc.sh
# =============================================================================

set -euo pipefail

# ---- Configurable via environment -------------------------------------------
GITHUB_ORG="${GITHUB_ORG:-akshay-flyhigh}"
GITHUB_REPO="${GITHUB_REPO:-flyhigh}"
ROLE_NAME="${ROLE_NAME:-github-actions-cdk}"
AWS_REGION="${AWS_REGION:-us-east-1}"
OIDC_THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"

# ---- Colors -----------------------------------------------------------------
readonly RESET='\033[0m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'

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

# Spinner for long-running AWS API calls
spinner() {
    local pid=$1
    local delay=0.15
    local spinstr='|/-\'
    while kill -0 "$pid" 2>/dev/null; do
        local temp=${spinstr#?}
        printf "  [%c]  working..." "${spinstr:0:1}"
        sleep "$delay"
        printf "\r"
        spinstr=${temp}${spinstr%"$temp"}
    done
    printf "            \r"
}

# ---- Preflight checks -------------------------------------------------------
preflight() {
    section "Preflight checks"

    if ! command -v aws &>/dev/null; then
        die "AWS CLI not found on PATH. Install it: https://aws.amazon.com/cli/"
    fi
    ok "AWS CLI found: $(aws --version)"

    if ! aws sts get-caller-identity &>/dev/null; then
        die "AWS credentials not configured or expired. Run 'aws configure' or refresh your session."
    fi
    local identity
    identity=$(aws sts get-caller-identity --query 'Arn' --output text)
    ok "Authenticated as: ${identity}"

    # Check we're in the right region
    local current_region
    current_region=$(aws configure get region 2>/dev/null || echo "$AWS_REGION")
    info "Target region: ${AWS_REGION}   (CLI default: ${current_region})"
}

# ---- OIDC Provider ----------------------------------------------------------
setup_oidc_provider() {
    section "GitHub OIDC Identity Provider"

    local provider_arn="arn:aws:iam::$(aws sts get-caller-identity --query 'Account' --output text):oidc-provider/token.actions.githubusercontent.com"

    if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$provider_arn" &>/dev/null; then
        ok "OIDC provider already exists."
        info "ARN: ${provider_arn}"
        return 0
    fi

    info "Creating OIDC provider for token.actions.githubusercontent.com ..."

    # The provider URL and audience list
    local url="https://token.actions.githubusercontent.com"
    local client_id_list="sts.amazonaws.com"

    if aws iam create-open-id-connect-provider \
        --url "$url" \
        --client-id-list "$client_id_list" \
        --thumbprint-list "$OIDC_THUMBPRINT" \
        --no-cli-pager &>/dev/null; then
        ok "OIDC provider created successfully."
        info "ARN: ${provider_arn}"
    else
        die "Failed to create OIDC provider."
    fi
}

# ---- IAM Role ---------------------------------------------------------------
setup_iam_role() {
    section "IAM Role: ${ROLE_NAME}"

    local account_id
    account_id=$(aws sts get-caller-identity --query 'Account' --output text)

    # Trust policy: allow GitHub Actions from the specified repo/branch to assume
    local trust_policy
    trust_policy=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${account_id}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${GITHUB_ORG}/${GITHUB_REPO}:*"
        },
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF
)

    if aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
        ok "Role '${ROLE_NAME}' already exists — updating trust policy."

        aws iam update-assume-role-policy \
            --role-name "$ROLE_NAME" \
            --policy-document "$trust_policy" \
            --no-cli-pager &>/dev/null

        ok "Trust policy updated."
    else
        info "Creating role '${ROLE_NAME}' ..."

        aws iam create-role \
            --role-name "$ROLE_NAME" \
            --assume-role-policy-document "$trust_policy" \
            --description "GitHub Actions CDK deployment role for ${GITHUB_ORG}/${GITHUB_REPO}" \
            --max-session-duration 14400 \
            --no-cli-pager &>/dev/null

        ok "Role created."
    fi
}

# ---- Attach Policies --------------------------------------------------------
attach_policies() {
    section "Attaching managed policies to ${ROLE_NAME}"

    local policies=(
        "arn:aws:iam::aws:policy/AdministratorAccess"
    )

    local attached
    attached=$(aws iam list-attached-role-policies \
        --role-name "$ROLE_NAME" \
        --query 'AttachedPolicies[*].PolicyArn' \
        --output text 2>/dev/null || echo "")

    for policy_arn in "${policies[@]}"; do
        local short_name
        short_name=$(basename "$policy_arn")

        if echo "$attached" | grep -qF "$policy_arn"; then
            ok "Already attached: ${short_name}"
        else
            info "Attaching ${short_name} ..."
            aws iam attach-role-policy \
                --role-name "$ROLE_NAME" \
                --policy-arn "$policy_arn" \
                --no-cli-pager &>/dev/null
            ok "Attached: ${short_name}"
        fi
    done
}

# ---- Summary ----------------------------------------------------------------
print_summary() {
    section "Setup Complete"

    local account_id
    account_id=$(aws sts get-caller-identity --query 'Account' --output text)
    local role_arn="arn:aws:iam::${account_id}:role/${ROLE_NAME}"

    printf "${BOLD}GitHub Actions OIDC configuration${RESET}\n\n"
    printf "  ${DIM}OIDC Provider:${RESET}  token.actions.githubusercontent.com\n"
    printf "  ${DIM}IAM Role:${RESET}       ${role_arn}\n"
    printf "  ${DIM}GitHub Scope:${RESET}   repo:${GITHUB_ORG}/${GITHUB_REPO}:*\n"
    printf "  ${DIM}Policies:${RESET}      AdministratorAccess\n"
    printf "\n${BOLD}Next step:${RESET} configure your GitHub Actions workflow:\n"
    printf "\n"
    printf "  jobs:\n"
    printf "    deploy:\n"
    printf "      permissions:\n"
    printf "        id-token: write   # required for OIDC\n"
    printf "        contents: read\n"
    printf "      steps:\n"
    printf "        - uses: aws-actions/configure-aws-credentials@v4\n"
    printf "          with:\n"
    printf "            role-to-assume: ${role_arn}\n"
    printf "            aws-region: ${AWS_REGION}\n"
    printf "\n"
}

# ---- Main -------------------------------------------------------------------
main() {
    printf "${BOLD}${BLUE}"
    printf "╔══════════════════════════════════════════════════════════════╗\n"
    printf "║       FlyHigh AWS — GitHub OIDC Provider & IAM Setup        ║\n"
    printf "╚══════════════════════════════════════════════════════════════╝"
    printf "${RESET}\n"

    preflight
    setup_oidc_provider
    setup_iam_role
    attach_policies
    print_summary

    printf "${GREEN}${BOLD}All done!${RESET} GitHub Actions can now assume ${ROLE_NAME} via OIDC.\n\n"
}

main "$@"
