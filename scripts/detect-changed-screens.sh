#!/usr/bin/env bash
set -euo pipefail

# Determine target branch (for PRs this is auto-set, otherwise use develop)
TARGET_BRANCH="${BITBUCKET_PR_DESTINATION_BRANCH:-develop}"

# Get the current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Different detection strategy based on whether we're on the target branch or not
if [ "$CURRENT_BRANCH" == "$TARGET_BRANCH" ]; then
  echo "Current branch is the target branch ($TARGET_BRANCH). Using recent commits strategy."
  
  # When on develop branch, look at the last commit's changes
  git diff-tree --no-commit-id --name-only -r HEAD \
    | grep -E '^src/business-apps/.*\.tsx$' \
    > changed-tsx.txt
  
  # If no changes found in the last commit, check the last 5 commits
  if [[ ! -s changed-tsx.txt ]]; then
    echo "No changes found in the last commit. Checking last 5 commits..."
    git diff-tree --no-commit-id --name-only -r HEAD~5..HEAD \
      | grep -E '^src/business-apps/.*\.tsx$' \
      > changed-tsx.txt
  fi
else
  echo "Comparing changes between $CURRENT_BRANCH and $TARGET_BRANCH."
  
  # Try to fetch the base branch so we can diff against it
  git fetch origin "${TARGET_BRANCH}:${TARGET_BRANCH}" || {
    echo "Warning: Could not fetch $TARGET_BRANCH. Using fallback method."
    # Fallback: find common ancestor and use that for diff
    MERGE_BASE=$(git merge-base HEAD origin/$TARGET_BRANCH 2>/dev/null || git merge-base HEAD $TARGET_BRANCH 2>/dev/null || echo "HEAD~10")
    git diff --name-only "${MERGE_BASE}...HEAD" \
      | grep -E '^src/business-apps/.*\.tsx$' \
      > changed-tsx.txt
    # Exit the block after fallback
    true
  } && {
    # Normal case - fetch worked, do the diff
    git diff --name-only "${TARGET_BRANCH}...HEAD" \
      | grep -E '^src/business-apps/.*\.tsx$' \
      > changed-tsx.txt
  }
fi

if [[ ! -s changed-tsx.txt ]]; then
  echo "No changed .tsx files found."
else
  echo "Changed .tsx files detected:"
  cat changed-tsx.txt
fi
