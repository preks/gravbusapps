#!/usr/bin/env bash
set -euo pipefail

# First, detect which .tsx files have changed
bash scripts/detect-changed-screens.sh

# If no changes, exit early
if [[ ! -s changed-tsx.txt ]]; then
  echo "Nothing to publish."
  exit 0
fi

# Loop through each changed .tsx file and publish it
while IFS= read -r file; do
  echo "Processing $file …"
  
  # Remove src/business-apps/ prefix if it exists
  publish_path=${file#src/business-apps/}
  
  echo "Publishing: $publish_path"

  # Publish the screen
  yarn publish:screen -- "$publish_path" || {
    echo "Failed to publish $publish_path, continuing with others"
  }
done < changed-tsx.txt
