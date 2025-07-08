#!/usr/bin/env bash
set -euo pipefail

# First, detect which .tsx files have changed
bash scripts/detect-changed-screens.sh

# If no changes, exit early
if [[ ! -s changed-tsx.txt ]]; then
  echo "Nothing to publish."
  exit 0
fi

# Loop through each changed app/form directory and publish it
while IFS= read -r app_dir; do
  echo "Processing $app_dir …"
  
  # Remove src/business-apps/ prefix from the directory path
  # Note: app_dir is already a directory path, not a file path
  publish_path=${app_dir#src/business-apps/}
  
  echo "Publishing: $publish_path"

  # Publish the screen
  yarn publish:screen -- "$publish_path"
done < changed-tsx.txt
