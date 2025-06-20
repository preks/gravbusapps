#!/bin/bash
# Exit on error
set -e

echo "====== Screen Publisher ======"
echo "Running on branch: ${BITBUCKET_BRANCH}"

# Set up Bitbucket Pipelines environment
echo "Setting up environment..."
mkdir -p ~/.ssh
touch ~/.ssh/known_hosts

# To handle different merge commit scenarios, we'll use a more flexible approach

# 1. Find changed files using git
find_changed_files() {
  # Try different git methods until we find one that works
  
  # First try: most common case - difference between current HEAD and develop
  echo "Attempt 1: Comparing with origin/develop..."
  git fetch -q origin develop || true
  FILES=$(git diff --name-only origin/develop HEAD 2>/dev/null | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
  
  if [ ! -z "$FILES" ]; then
    echo "Found changes via method 1"
    echo "$FILES"
    return 0
  fi
  
  # Second try: fallback to log method (works in many CI environments)
  echo "Attempt 2: Using git log method..."
  FILES=$(git log -1 --name-only --pretty="format:" | grep -E "^src/business-apps/.+/.+/(apps|forms)/.+/.+\.tsx$" || echo "")
  
  if [ ! -z "$FILES" ]; then
    echo "Found changes via method 2"
    echo "$FILES"
    return 0
  fi

  return 0
}

# Run the function to find changed files
CHANGED_FILES=$(find_changed_files)

# Check if we found any files
if [ -z "$CHANGED_FILES" ]; then
  echo "No screen changes detected. Skipping publish."
  exit 0
fi

echo "Changed screens detected:"
echo "$CHANGED_FILES"

# Process each changed file
for FILE in $CHANGED_FILES; do
  # Extract path components based on project rules
  # Example: src/business-apps/hr/hr-core/apps/employee-directory/EmployeeDirectory.tsx
  MODULE=$(echo "$FILE" | awk -F'/' '{print $3}')
  SUB_MODULE=$(echo "$FILE" | awk -F'/' '{print $4}')
  TYPE=$(echo "$FILE" | awk -F'/' '{print $5}')
  APP_NAME=$(echo "$FILE" | awk -F'/' '{print $6}')
  
  # Construct path for publishing
  PUBLISH_PATH="$MODULE/$SUB_MODULE/$TYPE/$APP_NAME"
  
  echo "=========================="
  echo "Publishing: $PUBLISH_PATH"
  echo "=========================="
  
  # Run the publish command
  yarn publish:screen -- "$PUBLISH_PATH" || {
    echo "Warning: Failed to publish $PUBLISH_PATH, continuing with others"
  }
  
  echo "Done processing $FILE"
done

echo "Publish process completed"

