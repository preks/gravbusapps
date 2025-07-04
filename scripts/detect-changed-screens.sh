#!/usr/bin/env bash
set -euo pipefail

# Function to extract app directory paths from .tsx files
extract_app_paths() {
  local input_file="$1"
  local output_file="$2"
  
  # Process each .tsx file path and extract the app directory path
  while IFS= read -r file_path; do
    # Extract app directory path using sed
    # Pattern: src/business-apps/.../apps/[app-name]
    app_path=$(echo "$file_path" | sed -n 's|\(src/business-apps/.*/apps/[^/]*\).*|\1|p')
    
    if [[ -n "$app_path" ]]; then
      echo "$app_path"
    fi
  done < "$input_file" | sort -u > "$output_file"
}

# Determine target branch (for PRs this is auto-set, otherwise use develop)
TARGET_BRANCH="${BITBUCKET_PR_DESTINATION_BRANCH:-develop}"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Create temporary file for raw tsx files
temp_tsx_file=$(mktemp)
trap 'rm -f "$temp_tsx_file"' EXIT

# If we're not on a PR and we're running on the target branch itself
if [[ "$CURRENT_BRANCH" == "$TARGET_BRANCH" && -z "${BITBUCKET_PR_DESTINATION_BRANCH:-}" ]]; then
  echo "Running on $TARGET_BRANCH branch - using git log to detect recent changes"
  
  # Get all .tsx files changed in the last commit on this branch
  git log -1 --name-only --pretty="format:" | grep -E '^src/business-apps/.*\.tsx$' > "$temp_tsx_file"
  
  # If nothing found in last commit, look at the last 5 commits
  if [[ ! -s "$temp_tsx_file" ]]; then
    echo "No changes in last commit, checking last 5 commits..."
    git log -5 --name-only --pretty="format:" | grep -E '^src/business-apps/.*\.tsx$' > "$temp_tsx_file"
  fi
else
  echo "Running against target branch: $TARGET_BRANCH"
  
  # Fetch the base branch so we can diff against it
  git fetch origin "${TARGET_BRANCH}:${TARGET_BRANCH}" || echo "Warning: Failed to fetch $TARGET_BRANCH branch"
  
  # List only the .tsx files changed between TARGET_BRANCH and HEAD
  git diff --name-only "${TARGET_BRANCH}...HEAD" | grep -E '^src/business-apps/.*\.tsx$' > "$temp_tsx_file" || true
fi

# Extract app directory paths from the changed .tsx files
extract_app_paths "$temp_tsx_file" "changed-tsx.txt"

# Handle the results
if [[ ! -s changed-tsx.txt ]]; then
  echo "No changed .tsx files found."
else
  echo "Changed app directories detected:"
  cat changed-tsx.txt
fi
