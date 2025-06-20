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

# For custom pipeline runs, we want to be very specific
if [[ "${BITBUCKET_PIPELINE_TYPE}" == "CUSTOM" ]]; then
  echo "Running as custom pipeline - checking for specific changes only"
  # Only look at differences compared to develop
  export CHANGED_FILES=$(git diff --name-only origin/develop HEAD 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
  
  if [ -z "$CHANGED_FILES" ]; then
    echo "No screen changes detected compared to develop branch."
    echo "For manual dry runs, you need to have uncommitted changes or specify files."
    # Exit cleanly to avoid pipeline failure
    exit 0
  fi
# For pull requests to develop
elif [[ "$BITBUCKET_PR_DESTINATION_BRANCH" == "develop" || -n "$BITBUCKET_PR_ID" ]]; then
  echo "Checking files changed in PR to develop..."
  export CHANGED_FILES=$(git diff --name-only origin/develop HEAD 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
# For regular branch builds, only look at the latest commit
else
  echo "Checking files changed in latest commit only..."
  export CHANGED_FILES=$(git log -1 --name-only --pretty="format:" 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
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