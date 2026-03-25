#!/usr/bin/env bash
set -euo pipefail

PHASE_DIVIDER="================================================================================"

log_phase() {
  echo ""
  echo "$PHASE_DIVIDER"
  echo "$1"
  echo "$PHASE_DIVIDER"
}

# Function to extract directory paths from .tsx files
extract_app_paths() {
  local input_file="$1"
  local output_file="$2"

  node scripts/map-files-to-screens.js "$input_file" "$output_file"
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
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [[ -n "${BITBUCKET_PR_DESTINATION_BRANCH:-}" ]]; then
  TARGET_BRANCH="$BITBUCKET_PR_DESTINATION_BRANCH"
else
  # Special handling: if we're on main/master, treat it as the target branch (same as develop)
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

# Extract directory paths from the changed .tsx files
echo "Changed files found:"
cat "$temp_tsx_file" || echo "No files in temp file"

extract_app_paths "$temp_tsx_file" "changed-tsx.txt"

# Report direct screen changes
if [[ -s changed-tsx.txt ]]; then
  echo ""
  echo "Direct screen changes detected:"
  cat changed-tsx.txt
  direct_count=$(wc -l < changed-tsx.txt)
  echo "   Total: $direct_count screen(s)"
else
  echo ""
  echo "INFO: No direct screen changes detected"
  touch changed-tsx.txt
fi

log_phase "SMART DEPENDENCY ANALYSIS"
echo "Running smart dependency analysis..."

# Get ALL changed files for dependency analysis
temp_all_changes=$(mktemp)

if [[ "$CURRENT_BRANCH" == "$TARGET_BRANCH" && -z "${BITBUCKET_PR_DESTINATION_BRANCH:-}" ]]; then
  git show --pretty="format:" --name-only HEAD > "$temp_all_changes" || true
else
  git diff --name-only "${TARGET_BRANCH}...HEAD" > "$temp_all_changes" || true
fi

# Build cache of screen directories (folders with index.ts)
build_screen_dirs_cache() {
  node scripts/list-screen-dirs.js
}

# Cache screen directories
SCREEN_DIRS_CACHE=$(build_screen_dirs_cache)

# Function to check if a file is screen-specific
is_screen_specific() {
  local file="$1"

  # Check if this file is inside any known screen directory
  while IFS= read -r screen_dir; do
    if [[ "$file" == "$screen_dir"/* || "$file" == "$screen_dir" ]]; then
      return 0  # true - is screen specific
    fi
  done <<< "$SCREEN_DIRS_CACHE"

  # File is not inside any screen directory
  return 1
}

# Check if there are dependency-related changes:
# - Package files (package.json, etc.)
# - Global shared code (src/* except business-apps)
# - Module-level shared code (business-apps/**/hooks/, components/, etc. - NOT in screens itself)
has_package_changes=$(grep -qE '^(package\.json)' "$temp_all_changes" 2>/dev/null && echo "yes" || echo "no")
# Dev-only files that live in src/ but are never imported by published screens.
# Excluding them prevents a full rebuild being triggered when only these files change.
DEV_ONLY_GLOBAL_FILES='src/BusinessAppIDE.tsx'
has_global_shared=$(grep -E '^src/' "$temp_all_changes" 2>/dev/null | grep -vE '^src/business-apps/' | grep -vF "$DEV_ONLY_GLOBAL_FILES" | grep -q . && echo "yes" || echo "no")

# Check for module-level shared code (in business-apps but NOT in screens)
module_shared_changes=""
while IFS= read -r line; do
  if [[ "$line" == src/business-apps/* ]] && ! is_screen_specific "$line"; then
    module_shared_changes="${module_shared_changes}${line}"$'\n'
  fi
done < "$temp_all_changes"
has_module_shared=$([[ -n "$module_shared_changes" ]] && echo "yes" || echo "no")

if [[ "$has_package_changes" == "yes" || "$has_global_shared" == "yes" || "$has_module_shared" == "yes" ]]; then
  echo ""
  echo "Shared code / dependency changes found:"
  
  # Show package changes
  if [[ "$has_package_changes" == "yes" ]]; then
    echo "   Package files:"
    grep -E '^(package\.json)' "$temp_all_changes" | while read -r line; do
      echo "      - $line"
    done
  fi
  
  # Show global shared src/ changes (anything NOT in business-apps)
  if [[ "$has_global_shared" == "yes" ]]; then
    global_shared=$(grep -E '^src/' "$temp_all_changes" | grep -vE '^src/business-apps/' || true)
    global_count=$(echo "$global_shared" | wc -l | tr -d ' ')
    echo "   Global shared code:"
    while IFS= read -r line; do
      [[ -n "$line" ]] && echo "      - $line"
    done <<< "$global_shared" || true
    if [[ "$global_count" -gt 10 ]]; then
      echo "      ... and $((global_count - 10)) more"
    fi
  fi
  
  # Show module-level shared changes
  if [[ "$has_module_shared" == "yes" ]]; then
    module_count=$(echo "$module_shared_changes" | wc -l | tr -d ' ')
    echo "   Module-level shared code:"
    while IFS= read -r line; do
      [[ -n "$line" ]] && echo "      - $line"
    done <<< "$module_shared_changes" || true
    if [[ "$module_count" -gt 10 ]]; then
      echo "      ... and $((module_count - 10)) more"
    fi
  fi
  
  # Run the smart dependency analyzer
  echo ""
  echo "Analyzing which screens are affected by these changes..."
  
  if node scripts/analyze-dependencies.js "$temp_all_changes"; then
    # Check if dependency analyzer found affected screens
    if [[ -f dependency-affected-screens.txt && -s dependency-affected-screens.txt ]]; then
      dep_affected_count=$(wc -l < dependency-affected-screens.txt)
      echo ""
      echo "Dependency analysis found $dep_affected_count affected screen(s)"
      
      # Merge with direct changes (deduplicate)
      echo ""
      echo "Merging direct and dependency-affected screens..."
      
      # Convert dependency-affected-screens.txt format to match changed-tsx.txt
      # dependency-affected-screens.txt has: src/business-apps/hr/core/apps/employee-directory
      # We need to merge and deduplicate
      cat dependency-affected-screens.txt >> changed-tsx.txt
      
      # Sort and deduplicate
      sort -u changed-tsx.txt -o changed-tsx.txt
      
      final_count=$(wc -l < changed-tsx.txt)
      echo "Final screen list: $final_count unique screen(s)"
      
      # Clean up
      rm -f dependency-affected-screens.txt
    else
      echo ""
      echo "INFO: No additional screens affected by dependency changes"
    fi
  else
    echo ""
    echo "WARNING: Dependency analysis failed - continuing with direct changes only"
  fi
else
  echo "INFO: No dependency-related changes (src/common/, src/components/, package.json)"
fi

rm -f "$temp_all_changes"

# Final report
log_phase "FINAL CHANGE DETECTION RESULTS"
if [[ -s changed-tsx.txt ]]; then
  total=$(wc -l < changed-tsx.txt)
  echo "Total screens to publish: $total"
else
  echo "INFO: No screens to publish"
fi
