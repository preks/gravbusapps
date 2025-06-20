#!/bin/bash
set -e

# Enable debug mode to see commands being executed
set -x

# Output more information for debugging
echo "Current branch: ${BITBUCKET_BRANCH}"
echo "PR destination: ${BITBUCKET_PR_DESTINATION_BRANCH:-none}"
echo "Target branch: origin/develop"

# Setup for Bitbucket Pipelines
git config --global --add safe.directory /opt/atlassian/pipelines/agent/build 2>/dev/null || true

# Make sure we have the develop branch
git fetch origin develop

# Try multiple methods to find changed files
echo "Detecting changed files with multiple methods..."

# Method 1: Standard diff with origin/develop
echo "Trying method 1: git diff with origin/develop"
export CHANGED_FILES=$(git diff --name-only origin/develop HEAD 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")

# If no files found, try method 2
if [ -z "$CHANGED_FILES" ]; then
  echo "Method 1 found no changes, trying method 2..."
  export CHANGED_FILES=$(git log -1 --name-only --pretty="format:" 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
fi

# If still no files, try method 3
if [ -z "$CHANGED_FILES" ]; then
  echo "Method 2 found no changes, falling back to method 3..."
  export CHANGED_FILES=$(find src/business-apps -name "*.tsx" 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
fi

# Show what we found
echo "Files found:"
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
                
    echo "Would publish: /$MODULE/$SUB_MODULE/$TYPE/$APP_NAME"
  done
else
  echo "No screen changes detected."
fi