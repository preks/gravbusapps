#!/bin/bash
set -e

# Output more information for debugging
echo "Current branch: ${BITBUCKET_BRANCH}"
echo "PR destination: ${BITBUCKET_PR_DESTINATION_BRANCH:-none}"
echo "Target branch: origin/develop"

# Setup for Bitbucket Pipelines
git config --global --add safe.directory /opt/atlassian/pipelines/agent/build 2>/dev/null || true

# Make sure we have the develop branch
git fetch origin develop

# Try different methods to find changed files
echo "Detecting changed files..."

# For custom runs or PR checks, we want to compare with develop
if [[ "$BITBUCKET_PR_DESTINATION_BRANCH" == "develop" || -n "$BITBUCKET_PR_ID" ]]; then
  echo "Checking files changed in PR to develop..."
  export CHANGED_FILES=$(git diff --name-only origin/develop HEAD 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
else
  # For branch builds, look at the latest commit
  echo "Checking files changed in latest commit..."
  export CHANGED_FILES=$(git log -50 --name-only --pretty="format:" 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
fi

# If running a custom pipeline manually, we need to be more selective
# Let's check if it's a custom pipeline run
if [[ -z "$CHANGED_FILES" && -n "$BITBUCKET_PIPELINE_UUID" && -z "$BITBUCKET_PR_ID" ]]; then
  echo "Manual run detected, checking changes against develop..."
  # First try comparing with develop
  export CHANGED_FILES=$(git diff --name-only origin/develop HEAD 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
  
  # If still nothing, prompt for more specific action rather than showing everything
  if [ -z "$CHANGED_FILES" ]; then
    echo "No changes detected against develop branch."
    echo "For manual runs, please commit your changes first or specify files to publish."
    # Exiting with 0 to avoid pipeline failure, but not proceeding with all files
    exit 0
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