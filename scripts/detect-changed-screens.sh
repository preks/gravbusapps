#!/bin/bash
set -e

# Output more information for debugging
echo "Current branch: ${BITBUCKET_BRANCH}"
echo "PR destination: ${BITBUCKET_PR_DESTINATION_BRANCH:-none}"
echo "Pipeline type: ${BITBUCKET_PIPELINE_TYPE:-unknown}"

# Setup for Bitbucket Pipelines
git config --global --add safe.directory /opt/atlassian/pipelines/agent/build 2>/dev/null || true

# Make sure we have the develop branch
git fetch origin develop

# For custom pipeline runs, we need a more reliable approach
if [[ "${BITBUCKET_PIPELINE_TYPE}" == "CUSTOM" ]]; then
  echo "Running as custom pipeline - checking with multiple methods"
  
  # Method 1: Direct diff against develop
  echo "Trying direct diff against develop..."
  export CHANGED_FILES=$(git diff --name-only origin/develop HEAD 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
  
  # Method 2: Range diff - all commits not in develop
  if [ -z "$CHANGED_FILES" ]; then
    echo "Trying range diff against develop..."
    export CHANGED_FILES=$(git diff --name-only origin/develop..HEAD 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
  fi
  
  # Method 3: Check the last 10 commits
  if [ -z "$CHANGED_FILES" ]; then
    echo "Trying last 10 commits..."
    export CHANGED_FILES=$(git log -10 --name-only --pretty="format:" 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
  fi

  # For manual dry run, always show at least one component
  if [ -z "$CHANGED_FILES" ]; then
    echo "No changes detected with any method. Showing most recently modified component:"
    export CHANGED_FILES=$(find src/business-apps -name "*.tsx" | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" | sort -r | head -n 1)
  fi

# For pull requests to develop
elif [[ "$BITBUCKET_PR_DESTINATION_BRANCH" == "develop" || -n "$BITBUCKET_PR_ID" ]]; then
  echo "Checking files changed in PR to develop..."
  export CHANGED_FILES=$(git diff --name-only origin/develop HEAD 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
  
  # If no changes found, try fallback method
  if [ -z "$CHANGED_FILES" ]; then
    echo "No changes found with direct diff, trying range diff..."
    export CHANGED_FILES=$(git diff --name-only origin/develop..HEAD 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
  fi

# For regular branch builds, try multiple methods
else
  echo "Checking files changed in this branch..."
  export CHANGED_FILES=$(git diff --name-only origin/develop..HEAD 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
  
  # Fallback to most recent commit if nothing found
  if [ -z "$CHANGED_FILES" ]; then
    echo "No changes found with diff, checking latest commit..."
    export CHANGED_FILES=$(git log -1 --name-only --pretty="format:" 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
  fi
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