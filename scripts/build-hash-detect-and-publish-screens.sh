#!/usr/bin/env bash
set -u -o pipefail

PHASE_DIVIDER="================================================================================"

log_phase() {
  echo ""
  echo "$PHASE_DIVIDER"
  echo "$1"
  echo "$PHASE_DIVIDER"
}

BUILD_EXIT=0
PUBLISH_EXIT=0

log_phase "BUILD ALL SCREENS (BATCHED)"
node scripts/build-changed-screens.js
BUILD_EXIT=$?
if [[ "$BUILD_EXIT" -ne 0 ]]; then
  echo "Build reported failures (exit: $BUILD_EXIT). Continuing to publish successful build outputs."
else
  echo "Build completed successfully."
fi

log_phase "DETECT CHANGED SCREENS BY HASH"
echo "Fetching latest develop hashes baseline..."
git fetch origin develop || echo "WARNING: Failed to fetch origin/develop, detector will fallback to local hash file."
if ! node scripts/detect-changed-screens-by-hash.js; then
  echo "Hash-based detection failed."
  exit 1
fi

log_phase "PUBLISH CHANGED SCREENS"
bash scripts/detect-and-publish-changed-screens.sh changed-tsx.txt
PUBLISH_EXIT=$?
if [[ "$PUBLISH_EXIT" -ne 0 ]]; then
  echo "Publishing had failures (exit: $PUBLISH_EXIT)."
else
  echo "Publishing completed successfully."
fi

log_phase "FINAL RESULT"
echo "Build exit code: $BUILD_EXIT"
echo "Publish exit code: $PUBLISH_EXIT"

if [[ "$BUILD_EXIT" -ne 0 || "$PUBLISH_EXIT" -ne 0 ]]; then
  echo "Pipeline result: FAILED (build and/or publish failures detected)."
  exit 1
fi

echo "Pipeline result: SUCCESS."
