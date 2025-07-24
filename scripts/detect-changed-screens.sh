#!/usr/bin/env bash
set -euo pipefail

# Function to extract app and form directory paths from .tsx files
extract_app_paths() {
  local input_file="$1"
  local output_file="$2"
  
  # Clear the output file
  > "$output_file"
  
  # Check if input file exists and has content
  if [[ ! -f "$input_file" ]] || [[ ! -s "$input_file" ]]; then
    echo "No .tsx files to process"
    return 0
  fi
  
  # Process each .tsx file path and extract the app or form directory path
  while IFS= read -r file_path || [[ -n "$file_path" ]]; do
    # Skip empty lines
    [[ -z "$file_path" ]] && continue
    
    # Extract app directory path using sed
    # Pattern: src/business-apps/.../apps/[app-name]
    app_path=$(echo "$file_path" | sed -n 's|\(src/business-apps/.*/apps/[^/]*\).*|\1|p')
    
    # Extract form directory path using sed
    # Pattern: src/business-apps/.../forms/[form-name]
    form_path=$(echo "$file_path" | sed -n 's|\(src/business-apps/.*/forms/[^/]*\).*|\1|p')
    
    if [[ -n "$app_path" ]]; then
      echo "$app_path"
    fi

    if [[ -n "$form_path" ]]; then
      echo "$form_path"
    fi
  done < "$input_file" | sort -u > "$output_file"
}

# Function to detect the default branch
detect_default_branch() {
  # Try to get the default branch from origin/HEAD
  local default_branch
  default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "")
  
  if [[ -n "$default_branch" ]]; then
    echo "$default_branch"
    return 0
  fi
  
  # If origin/HEAD is not set, try to detect from remote
  default_branch=$(git ls-remote --symref origin HEAD 2>/dev/null | awk '/^ref:/ {sub("refs/heads/", "", $2); print $2}' || echo "")
  
  if [[ -n "$default_branch" ]]; then
    echo "$default_branch"
    return 0
  fi
  
  # Fallback: check for common default branch names
  for branch in main master develop; do
    if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
      echo "$branch"
      return 0
    fi
  done
  
  # Ultimate fallback
  echo "develop"
}

# Determine target branch (for PRs this is auto-set, otherwise detect default)
if [[ -n "${BITBUCKET_PR_DESTINATION_BRANCH:-}" ]]; then
  TARGET_BRANCH="$BITBUCKET_PR_DESTINATION_BRANCH"
else
  # Special handling: if we're on main/master, treat it as the target branch (same as develop)
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
    TARGET_BRANCH="$CURRENT_BRANCH"
    echo "Running on production branch: $CURRENT_BRANCH (treating as target branch)"
  else
    TARGET_BRANCH=$(detect_default_branch)
    echo "Detected default branch: $TARGET_BRANCH"
  fi
fi

# Create temporary file for raw tsx files
temp_tsx_file=$(mktemp)
trap 'rm -f "$temp_tsx_file"' EXIT

# If we're not on a PR and we're running on the target branch itself
if [[ "$CURRENT_BRANCH" == "$TARGET_BRANCH" && -z "${BITBUCKET_PR_DESTINATION_BRANCH:-}" ]]; then
  echo "Running on $TARGET_BRANCH branch - detecting changes from recent commits"
  echo "Current HEAD commit: $(git rev-parse HEAD)"
  echo "Last commit message: $(git log -1 --pretty=format:'%s')"
  
  # Check if HEAD is a merge commit (has more than one parent)
  parent_count=$(git rev-list --parents -n 1 HEAD | awk '{print NF-1}')
  echo "Number of parents: $parent_count"
  
  if [[ "$parent_count" -gt 1 ]]; then
    echo "Detected merge commit - using merge-specific commands"
    
    # For merge commits, use git show with -m flag to show files from merge
    echo "Trying git show -m to get files from merge commit..."
    git show -m --pretty="format:" --name-only HEAD | grep -E '^src/business-apps/.*\.tsx$' > "$temp_tsx_file" || true
    echo "Files found with git show -m: $(wc -l < "$temp_tsx_file")"
    
    # If that doesn't work, try git diff against first parent
    if [[ ! -s "$temp_tsx_file" ]]; then
      echo "Trying git diff against first parent..."
      git diff --name-only HEAD~1 HEAD | grep -E '^src/business-apps/.*\.tsx$' > "$temp_tsx_file" || true
      echo "Files found with git diff: $(wc -l < "$temp_tsx_file")"
    fi
    
    # If still nothing, try getting files from the merged branch
    if [[ ! -s "$temp_tsx_file" ]]; then
      echo "Trying to get files from merged branch..."
      # Get the merge base and compare with second parent
      FIRST_PARENT=$(git rev-parse HEAD~1)
      SECOND_PARENT=$(git rev-list --parents -n 1 HEAD | awk '{print $3}')
      if [[ -n "$SECOND_PARENT" ]]; then
        echo "Comparing merge base with second parent: $SECOND_PARENT"
        git diff --name-only "$FIRST_PARENT".."$SECOND_PARENT" | grep -E '^src/business-apps/.*\.tsx$' > "$temp_tsx_file" || true
        echo "Files found from merged branch: $(wc -l < "$temp_tsx_file")"
      fi
    fi
  else
    echo "Regular commit - using standard commands"
    
    # Try git show first
    echo "Trying git show to get changed files..."
    git show --pretty="format:" --name-only HEAD | grep -E '^src/business-apps/.*\.tsx$' > "$temp_tsx_file" || true
    echo "Files found with git show: $(wc -l < "$temp_tsx_file")"
    
    # If git show doesn't work, try git log
    if [[ ! -s "$temp_tsx_file" ]]; then
      echo "Trying git log to get changed files..."
      git log -1 --name-only --pretty="format:" HEAD | grep -E '^src/business-apps/.*\.tsx$' > "$temp_tsx_file" || true
      echo "Files found with git log: $(wc -l < "$temp_tsx_file")"
    fi
  fi
  
  # If still nothing found, look at the last 5 commits
  if [[ ! -s "$temp_tsx_file" ]]; then
    echo "No changes in last commit, checking last 5 commits..."
    git log -5 --name-only --pretty="format:" | grep -E '^src/business-apps/.*\.tsx$' > "$temp_tsx_file" || true
    echo "Files found in last 5 commits: $(wc -l < "$temp_tsx_file")"
  fi
else
  echo "Running against target branch: $TARGET_BRANCH"
  
  # Fetch the base branch so we can diff against it
  git fetch origin "${TARGET_BRANCH}:${TARGET_BRANCH}" || echo "Warning: Failed to fetch $TARGET_BRANCH branch"
  
  # List only the .tsx files changed between TARGET_BRANCH and HEAD
  git diff --name-only "${TARGET_BRANCH}...HEAD" | grep -E '^src/business-apps/.*\.tsx$' > "$temp_tsx_file" || true
fi

# Extract app and form directory paths from the changed .tsx files
echo "Raw .tsx files found:"
cat "$temp_tsx_file" || echo "No files in temp file"

extract_app_paths "$temp_tsx_file" "changed-tsx.txt"

# Handle the results
if [[ ! -s changed-tsx.txt ]]; then
  echo "No changed .tsx files found."
else
  echo "Changed app/form directories detected:"
  cat changed-tsx.txt
fi
