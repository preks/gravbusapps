#!/usr/bin/env bash
set -euo pipefail

# Determine target branch (for PRs this is auto-set, otherwise use develop)
TARGET_BRANCH="${BITBUCKET_PR_DESTINATION_BRANCH:-develop}"

# Fetch the base branch so we can diff against it
git fetch origin "${TARGET_BRANCH}:${TARGET_BRANCH}"

# List only the .tsx files changed between TARGET_BRANCH and HEAD
git diff --name-only "${TARGET_BRANCH}...HEAD" \
  | grep -E '^src/business-apps/.*\.tsx$' \
  > changed-tsx.txt

if [[ ! -s changed-tsx.txt ]]; then
  echo "No changed .tsx files found."
else
  echo "Changed .tsx files detected:"
  cat changed-tsx.txt
fi
