#!/usr/bin/env bash
set -euo pipefail

# Determine target branch (for PRs this is auto-set, otherwise use develop)
TARGET_BRANCH="${BITBUCKET_PR_DESTINATION_BRANCH:-develop}"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# If we're not on a PR and we're running on the target branch itself
if [[ "$CURRENT_BRANCH" == "$TARGET_BRANCH" && -z "${BITBUCKET_PR_DESTINATION_BRANCH:-}" ]]; then
  echo "Running on $TARGET_BRANCH branch - using git log to detect recent changes"
  
  # Get all .tsx files changed in the last commit on this branch
  git log -1 --name-only --pretty="format:" | grep -E '^src/business-apps/.*\.tsx$' > changed-tsx.txt
  
  # If nothing found in last commit, look at the last 5 commits
  if [[ ! -s changed-tsx.txt ]]; then
    echo "No changes in last commit, checking last 5 commits..."
    git log -5 --name-only --pretty="format:" | grep -E '^src/business-apps/.*\.tsx$' > changed-tsx.txt
  fi
else
  echo "Running against target branch: $TARGET_BRANCH"
  
  # Fetch the base branch so we can diff against it
  git fetch origin "${TARGET_BRANCH}:${TARGET_BRANCH}" || echo "Warning: Failed to fetch $TARGET_BRANCH branch"
  
  # List only the .tsx files changed between TARGET_BRANCH and HEAD
  git diff --name-only "${TARGET_BRANCH}...HEAD" | grep -E '^src/business-apps/.*\.tsx$' > changed-tsx.txt || true
fi

# Handle the results
if [[ ! -s changed-tsx.txt ]]; then
  echo "No changed .tsx files found."
else
  echo "Changed .tsx files detected:"
  cat changed-tsx.txt
fi
