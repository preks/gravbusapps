#!/bin/bash
set -e

echo "====== Screen Change Detector (DRY RUN) ======"
echo "Running on branch: ${BITBUCKET_BRANCH}"

# Set up Bitbucket Pipelines environment
echo "Setting up environment..."
git config --global --add safe.directory /opt/atlassian/pipelines/agent/build 2>/dev/null || true

# To handle different merge commit scenarios, we'll use a more flexible approach

# 1. Find changed files using git
find_changed_files() {
  # Try different git methods until we find one that works
  
  # First try: most common case - difference between current HEAD and develop
  echo "Attempt 1: Comparing with origin/develop..."
  git fetch -q origin develop 2>/dev/null || true
  FILES=$(git diff --name-only origin/develop HEAD 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
  
  if [ ! -z "$FILES" ]; then
    echo "Found changes via method 1"
    return 0
  fi
  
  # Second try: fallback to log method (works in many CI environments)
  echo "Attempt 2: Using git log method..."
  FILES=$(git log -1 --name-only --pretty="format:" 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
  
  if [ ! -z "$FILES" ]; then
    echo "Found changes via method 2"
    return 0
  fi

  return 0
}

# Run the function to find changed files
export CHANGED_FILES=$(find_changed_files)

echo "Detected files:"
echo "$CHANGED_FILES"

# Extract the unique app/form directories that were modified
if [ ! -z "$CHANGED_FILES" ]; then
  echo "Changed screens detected (DRY RUN - not publishing):"

  # For each changed file, extract components based on the project folder structure
  for FILE in $CHANGED_FILES; do
    # Extract path components based on project rules
    # Example: src/business-apps/hr/hr-core/apps/employee-directory/EmployeeDirectory.tsx
    MODULE=$(echo "$FILE" | awk -F'/' '{print $3}')
    SUB_MODULE=$(echo "$FILE" | awk -F'/' '{print $4}')
    TYPE=$(echo "$FILE" | awk -F'/' '{print $5}')
    APP_NAME=$(echo "$FILE" | awk -F'/' '{print $6}')
                
    echo "Would publish: $MODULE/$SUB_MODULE/$TYPE/$APP_NAME"
    echo "Path: src/business-apps/$MODULE/$SUB_MODULE/$TYPE/$APP_NAME"
  done
else
  echo "No screen changes detected."
fi