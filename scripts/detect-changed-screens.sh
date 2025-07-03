#!/usr/bin/env bash
set -euo pipefail

# Determine target branch (for PRs this is auto-set, otherwise use develop)
TARGET_BRANCH="${BITBUCKET_PR_DESTINATION_BRANCH:-develop}"

# Get the current branch - prefer Bitbucket environment variables over git commands
CURRENT_BRANCH="${BITBUCKET_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
echo "Detected current branch: $CURRENT_BRANCH"
echo "Target branch: $TARGET_BRANCH"

# Different detection strategy based on whether we're on the target branch or not
if [ "$CURRENT_BRANCH" == "$TARGET_BRANCH" ] || [ "$CURRENT_BRANCH" == "HEAD" -a "$BITBUCKET_BRANCH" == "$TARGET_BRANCH" ]; then
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
  
  # Safely update our knowledge of remote branches without modifying local branches
  git fetch origin
  
  # Use origin/$TARGET_BRANCH for comparison instead of trying to update local branches
  echo "Finding changes between origin/$TARGET_BRANCH and HEAD"
  
  # Find merge base between current HEAD and the target branch on origin
  MERGE_BASE=$(git merge-base HEAD origin/$TARGET_BRANCH 2>/dev/null || echo "HEAD~10")
  echo "Using merge-base: $MERGE_BASE"
  
  # Compare current HEAD with the merge base
  git diff --name-only "$MERGE_BASE..HEAD" \
    | grep -E '^src/business-apps/.*\.tsx$' \
    > changed-tsx.txt
fi

if [[ ! -s changed-tsx.txt ]]; then
  echo "No changed .tsx files found."
else
  echo "Changed .tsx files detected:"
  cat changed-tsx.txt
fi
