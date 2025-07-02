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
  echo "Publishing $file …"
  # your publish command here, e.g.:
  echo "Publishing: $file"
                
    # Publish the screen
    yarn publish:screen -- "$file" || {
      echo "Failed to publish $file, continuing with others"
    }
done < changed-tsx.txt
