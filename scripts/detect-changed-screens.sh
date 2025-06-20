#!/bin/bash
set -e

# Output more information for debugging
echo "Current branch: ${BITBUCKET_BRANCH}"
echo "Target branch: origin/develop"

# Make sure we have the develop branch
git fetch origin develop

# Get the list of files that were changed between the current branch and develop
# Use git diff-tree to get a reliable list of changes
echo "Detecting changed files..."
export CHANGED_FILES=$(git diff --name-only origin/develop HEAD | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")

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