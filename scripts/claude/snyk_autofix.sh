#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BOT_ID="dgfrsnw46xlhapcsd9mltc96fs5wv3"

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "ANTHROPIC_API_KEY is not set"
  exit 1
fi

if [ -z "${SNYK_BOT_TOKEN:-}" ]; then
  echo "SNYK_BOT_TOKEN is not set"
  exit 1
fi

if [ -z "${SNYK_TOKEN:-}" ]; then
  echo "SNYK_TOKEN is not set"
  exit 1
fi

SNYK_ORG="${SNYK_ORG:-newwork}"
export SNYK_ORG

apt-get update && apt-get install -y curl bash python3 jq
curl -fsSL https://claude.ai/install.sh | bash
export PATH="$HOME/.local/bin:$PATH"
command -v claude

cd "$REPO_ROOT"

npx -y snyk@latest code test --org="$SNYK_ORG" --json > snyk_code_before.json || true

python3 - <<'PY'
import json
import sys

with open("snyk_code_before.json", "r", encoding="utf-8") as f:
    data = json.load(f)

def count_issues(payload):
    if isinstance(payload, dict):
        if payload.get("ok") is True:
            return 0
        if isinstance(payload.get("runs"), list):
            total = 0
            for run in payload["runs"]:
                issues = run.get("issues") or []
                results = run.get("results") or []
                total += len(issues) + len(results)
            return total
        if isinstance(payload.get("vulnerabilities"), list):
            return len(payload["vulnerabilities"])
        if isinstance(payload.get("issues"), list):
            return len(payload["issues"])
        if isinstance(payload.get("results"), list):
            total = 0
            for result in payload["results"]:
                issues = result.get("issues") or result.get("vulnerabilities") or []
                total += len(issues)
            return total
    return 0

issue_count = count_issues(data)
with open("snyk_code_issue_count_before.txt", "w", encoding="utf-8") as f:
    f.write(str(issue_count))

def summarize(payload):
    if isinstance(payload.get("runs"), list):
        issues = []
        for run in payload["runs"]:
            issues.extend(run.get("issues") or [])
            issues.extend(run.get("results") or [])
    else:
        issues = payload.get("vulnerabilities") or payload.get("issues") or []
    lines = []
    for issue in issues:
        severity = issue.get("severity", issue.get("level", "unknown"))
        title = issue.get("title", "unknown") or issue.get("ruleId", "unknown")
        message = issue.get("message", "")
        if isinstance(message, dict):
            message = message.get("text", "")
        file_path = issue.get("path", "")
        if isinstance(file_path, list):
            file_path = " > ".join(str(p) for p in file_path)
        line = ""
        if not file_path:
            locations = issue.get("locations") or []
            if locations:
                location = locations[0]
                physical = location.get("physicalLocation") if isinstance(location, dict) else None
                artifact = physical.get("artifactLocation") if isinstance(physical, dict) else None
                file_path = artifact.get("uri") if isinstance(artifact, dict) else ""
                region = physical.get("region") if isinstance(physical, dict) else None
                if isinstance(region, dict) and region.get("startLine"):
                    line = f":{region.get('startLine')}"
        codeflow_summary = ""
        code_flows = issue.get("codeFlows") or []
        if code_flows:
            locations = []
            for flow in code_flows:
                for thread in flow.get("threadFlows") or []:
                    for loc in thread.get("locations") or []:
                        physical = loc.get("location", {}).get("physicalLocation", {})
                        artifact = physical.get("artifactLocation", {})
                        uri = artifact.get("uri", "")
                        region = physical.get("region", {})
                        start = region.get("startLine")
                        if uri:
                            locations.append(f"{uri}:{start}" if start else uri)
            if locations:
                head = locations[0]
                tail = locations[-1] if len(locations) > 1 else ""
                if tail and tail != head:
                    codeflow_summary = f" | flow: {head} -> {tail}"
                else:
                    codeflow_summary = f" | flow: {head}"
        lines.append(f"- {severity.upper()}: {title} - {message} [{file_path}{line}]{codeflow_summary}")
    return "\n".join(lines)

summary = summarize(data)
with open("snyk_code_summary.txt", "w", encoding="utf-8") as f:
    f.write(summary or "No issues found.")
PY

ISSUE_COUNT=$(cat snyk_code_issue_count_before.txt || echo "0")
echo "Snyk Code issues before: $ISSUE_COUNT"
echo "Snyk Code summary:"
cat snyk_code_summary.txt || true
if [ "$ISSUE_COUNT" = "0" ]; then
  echo "No Snyk Code issues found."
  exit 0
fi

WORKSPACE="new-work-team"
REPO_SLUG="gravity-business-apps"
DESTINATION_BRANCH="${DESTINATION_BRANCH:-develop}"

slugify() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g; s/-+/-/g'
}

BUILD_SUFFIX="${BITBUCKET_BUILD_NUMBER:-$(date -u +%Y%m%d-%H%M%S)}"
BRANCH_BASE="snyk-fix-${BUILD_SUFFIX}"
CLAUDE_BRANCH="feature/NO-TICKET_$(slugify "$BRANCH_BASE")"
COMMIT_MSG="chore NO-TICKET: snyk dependency fixes"

git checkout -B "$CLAUDE_BRANCH"

PROMPT=$(cat <<'EOF'
You are fixing dependency vulnerabilities detected by Snyk.

Requirements:
- Only change application code needed to fix the Snyk Code issues listed below.
- Avoid dependency updates unless strictly required for a code fix.
- Keep changes minimal and focused on the issues listed below.
- Do not run shell commands; the pipeline will re-run Snyk Code tests after your changes.

Snyk Code summary:
EOF
)

PROMPT="${PROMPT}
$(cat snyk_code_summary.txt)
"

timeout 300s claude -c -p "$PROMPT" \
  --allowedTools "Read,Edit" \
  --output-format text \
  --max-budget-usd 2.00 \
  --max-turns 30 || true

npx -y snyk@latest code test --org="$SNYK_ORG" --json > snyk_code_after.json || true

python3 - <<'PY'
import json

with open("snyk_code_before.json", "r", encoding="utf-8") as f:
    before = json.load(f)
with open("snyk_code_after.json", "r", encoding="utf-8") as f:
    after = json.load(f)

def count_issues(payload):
    if isinstance(payload, dict):
        if payload.get("ok") is True:
            return 0
        if isinstance(payload.get("runs"), list):
            total = 0
            for run in payload["runs"]:
                issues = run.get("issues") or []
                results = run.get("results") or []
                total += len(issues) + len(results)
            return total
        if isinstance(payload.get("vulnerabilities"), list):
            return len(payload["vulnerabilities"])
        if isinstance(payload.get("issues"), list):
            return len(payload["issues"])
        if isinstance(payload.get("results"), list):
            total = 0
            for result in payload["results"]:
                issues = result.get("issues") or result.get("vulnerabilities") or []
                total += len(issues)
            return total
    return 0

before_count = count_issues(before)
after_count = count_issues(after)

with open("snyk_code_issue_count_after.txt", "w", encoding="utf-8") as f:
    f.write(str(after_count))

reduced = int(after_count) < int(before_count)
with open("snyk_code_reduced.txt", "w", encoding="utf-8") as f:
    f.write("true" if reduced else "false")
PY

REDUCED=$(cat snyk_code_reduced.txt || echo "false")
AFTER_COUNT=$(cat snyk_code_issue_count_after.txt || echo "0")

echo "Snyk Code issues after: $AFTER_COUNT"
echo "Snyk Code reduced: $REDUCED"

if git diff --quiet; then
  echo "No changes to commit."
  exit 0
fi

if [ "$REDUCED" != "true" ]; then
  echo "Snyk Code issue count did not decrease; skipping PR."
  exit 0
fi

rm -f \
  snyk_code_after.json \
  snyk_code_before.json \
  snyk_code_issue_count_after.txt \
  snyk_code_issue_count_before.txt \
  snyk_code_reduced.txt \
  snyk_code_summary.txt

git add -A
git config user.email "${BOT_ID}@bots.bitbucket.org"
git config user.name "snyk-code-bot"
git commit -m "$COMMIT_MSG"

git remote set-url origin "https://x-token-auth:${SNYK_BOT_TOKEN}@bitbucket.org/${WORKSPACE}/${REPO_SLUG}.git"
git push -u origin "HEAD:${CLAUDE_BRANCH}"

PR_TITLE="[Snyk] Weekly code fixes"
PR_BODY="Automated code fixes based on weekly Snyk Code scan."
PR_PAYLOAD=$(cat <<EOF
{
  "title": "${PR_TITLE}",
  "source": { "branch": { "name": "${CLAUDE_BRANCH}" } },
  "destination": { "branch": { "name": "${DESTINATION_BRANCH}" } },
  "description": "${PR_BODY}"
}
EOF
)

STATUS=$(curl -s -o pr_response.json -w "%{http_code}" \
  --request POST \
  --url "https://api.bitbucket.org/2.0/repositories/${WORKSPACE}/${REPO_SLUG}/pullrequests" \
  --header "Authorization: Bearer ${SNYK_BOT_TOKEN}" \
  --header "Content-Type: application/json" \
  --data "${PR_PAYLOAD}")

if [ "$STATUS" -ge 200 ] && [ "$STATUS" -lt 300 ]; then
  echo "PR created."
else
  echo "PR creation failed (status ${STATUS})."
  cat pr_response.json
  exit 1
fi
