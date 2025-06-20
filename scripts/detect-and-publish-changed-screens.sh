#!/bin/bash

# Get the list of files that were changed between the current branch and develop
export CHANGED_FILES=$(git diff --name-only origin/develop...${BITBUCKET_BRANCH} | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")

# Extract the unique app/form directories that were modified
if [ ! -z "$CHANGED_FILES" ]; then
  echo "Changed screens detected:"
              
  # For each changed file, extract components based on the project folder structure
  for FILE in $CHANGED_FILES; do
    # Extract path components based on project rules
    # Example: src/business-apps/hr/hr-core/apps/employee-directory/EmployeeDirectory.tsx
    MODULE=$(echo "$FILE" | awk -F'/' '{print $3}')
    SUB_MODULE=$(echo "$FILE" | awk -F'/' '{print $4}')
    TYPE=$(echo "$FILE" | awk -F'/' '{print $5}')
    APP_NAME=$(echo "$FILE" | awk -F'/' '{print $6}')
                
    echo "Publishing: $MODULE/$SUB_MODULE/$TYPE/$APP_NAME"
                
    # Construct the path according to project rules
    SCREEN_PATH="src/business-apps/$MODULE/$SUB_MODULE/$TYPE/$APP_NAME"
                
    # Publish the screen
    yarn publish:screen -- "$SCREEN_PATH"
  done
else
  echo "No screen changes detected. Skipping publish."
fi
