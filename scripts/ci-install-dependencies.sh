#!/usr/bin/env bash
set -euo pipefail

echo "${NEWWORK_NMP_CREDENTIALS}" | base64 -d > ~/.npmrc

apt-get update && apt-get install gettext -y

npm ci

# Pre-install native deps; optionalDependency resolution on Linux CI can skip these.
npm install \
  @rollup/rollup-linux-x64-gnu@4.59.0 \
  lightningcss-linux-x64-gnu@1.31.1 \
  @tailwindcss/oxide-linux-x64-gnu@4.2.1 \
  --ignore-scripts=true || true
