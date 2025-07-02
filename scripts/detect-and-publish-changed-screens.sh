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
  
  # Get the directory path (remove the filename)
  dir_path=$(dirname "$file")
  
  # Remove src/business-apps/ prefix from the directory path
  dir_path_no_prefix=${dir_path#src/business-apps/}
  
  # the build system already appends the component name for us
  publish_path="$dir_path_no_prefix"
  
  echo "Publishing: $publish_path"

  # Publish the screen
  yarn publish:screen -- "$publish_path"
done < changed-tsx.txt
