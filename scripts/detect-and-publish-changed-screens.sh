#!/usr/bin/env bash
set -euo pipefail

# Check if manual screen list file is provided as argument
SCREEN_LIST_FILE="${1:-}"

if [[ -n "$SCREEN_LIST_FILE" && -f "$SCREEN_LIST_FILE" ]]; then
  echo "Using manually specified screens from: $SCREEN_LIST_FILE"
  SCREENS_FILE="$SCREEN_LIST_FILE"
else
  echo "Using change detection to find screens to publish"
  # First, detect which .tsx files have changed
  bash scripts/detect-changed-screens.sh
  SCREENS_FILE="changed-tsx.txt"
fi

# If no screens to publish, exit early
if [[ ! -s "$SCREENS_FILE" ]]; then
  echo "Nothing to publish."
  exit 0
fi

echo "Screens to publish:"
cat "$SCREENS_FILE"
echo "---"

# Loop through each app/form directory and publish it
declare -a FAILED_SCREENS=()
while IFS= read -r app_dir; do
  echo "Processing $app_dir …"
  
  # Remove src/business-apps/ prefix from the directory path if present
  # Note: app_dir is already a directory path, not a file path
  publish_path=${app_dir#src/business-apps/}
  
  echo "Publishing: $publish_path"

  # Publish the screen (with no-interaction flag for pipeline usage)
  if ! yarn publish:screen -- "$publish_path" --no-interaction; then
    echo "Publish failed for: $publish_path"
    FAILED_SCREENS+=("$publish_path")
    # Continue with next iteration without exiting the script
    continue
  fi
done < "$SCREENS_FILE"

# Summarize results and set exit code accordingly
if [[ ${#FAILED_SCREENS[@]} -gt 0 ]]; then
  echo "---"
  echo "The following screens failed to publish:"
  for screen in "${FAILED_SCREENS[@]}"; do
    echo " - $screen"
  done
  exit 1
else
  echo "All screens published successfully."
fi
