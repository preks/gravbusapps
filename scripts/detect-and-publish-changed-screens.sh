#!/usr/bin/env bash
set -euo pipefail

# Check if manual screen list file is provided as argument
SCREEN_LIST_FILE="${1:-}"

if [[ -n "$SCREEN_LIST_FILE" && -f "$SCREEN_LIST_FILE" ]]; then
  echo "Using manually specified screens from: $SCREEN_LIST_FILE"
  SCREENS_FILE="$SCREEN_LIST_FILE"
else
  echo "Using smart change detection (direct + dependency analysis)"
  # Detect changed screens (includes smart dependency analysis)
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
declare -a SKIPPED_SCREENS=()
while IFS= read -r app_dir; do
  echo "Processing $app_dir …"
  
  # Remove src/business-apps/ prefix from the directory path if present
  # Note: app_dir is already a directory path, not a file path
  publish_path=${app_dir#src/business-apps/}
  
  # Check if the screen directory still exists (not removed)
  screen_index_file="src/business-apps/$publish_path/index.ts"
  if [[ ! -f "$screen_index_file" ]]; then
    echo "⚠️  Skipping removed screen: $publish_path ($screen_index_file not found)"
    SKIPPED_SCREENS+=("$publish_path")
    continue
  fi
  
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
echo "---"
echo "Publishing Summary:"

if [[ ${#SKIPPED_SCREENS[@]} -gt 0 ]]; then
  echo "Skipped removed screens (${#SKIPPED_SCREENS[@]}):"
  for screen in "${SKIPPED_SCREENS[@]}"; do
    echo " - $screen"
  done
fi

if [[ ${#FAILED_SCREENS[@]} -gt 0 ]]; then
  echo "Failed to publish (${#FAILED_SCREENS[@]}):"
  for screen in "${FAILED_SCREENS[@]}"; do
    echo " - $screen"
  done
  exit 1
else
  echo "All existing screens published successfully."
  
  # Update component hashes after successful publish
  echo ""
  echo "Updating component hashes..."
  node scripts/update-dev-hashes.js || echo "⚠️  Hash update failed (non-critical)"
fi
