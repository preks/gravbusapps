#!/usr/bin/env node

/**
 * This script adds custom git hooks (post-checkout, post-merge) to the
 * @newwork/git-hooks directory after npm install.
 *
 * These hooks are not included in the @newwork/git-hooks package by default,
 * so we need to add them manually and restore them after each npm install.
 */

import { writeFileSync, chmodSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = join(__dirname, '..')
const hooksDir = join(repoRoot, 'node_modules/@newwork/git-hooks/hooks')

// Hook content - using #!/bin/sh for better Windows Git Bash compatibility
const postCheckoutContent = `#!/bin/sh
# post-checkout hook: runs after git checkout or git pull
# Arguments: $1 = ref of previous HEAD, $2 = ref of new HEAD, $3 = flag (1 = branch checkout, 0 = file checkout)

# Only run on branch checkouts, not file checkouts
if [ "$3" = "1" ]; then
  echo "Updating @newwork/cursor-rules..."
  npm install @newwork/cursor-rules@latest --silent
fi
`

const postMergeContent = `#!/bin/sh
# post-merge hook: runs after git merge or git pull (when merge happens)

echo "Updating @newwork/cursor-rules..."
npm install @newwork/cursor-rules@latest --silent
`

const hooks = {
  'post-checkout': postCheckoutContent,
  'post-merge': postMergeContent
}

try {
  // Check if the hooks directory exists
  if (!existsSync(hooksDir)) {
    console.log('[setup-custom-git-hooks] @newwork/git-hooks not installed yet, skipping...')
    process.exit(0)
  }

  // Create each hook
  for (const [hookName, hookContent] of Object.entries(hooks)) {
    const hookPath = join(hooksDir, hookName)
    writeFileSync(hookPath, hookContent, { mode: 0o755 })
    try {
      chmodSync(hookPath, 0o755)
    } catch {
      // chmod might fail on Windows, but the mode in writeFileSync should work
    }
    console.log(`[setup-custom-git-hooks] Created ${hookName} hook`)
  }

  console.log('[setup-custom-git-hooks] Custom git hooks installed successfully')
} catch (error) {
  console.error('[setup-custom-git-hooks] Failed to install custom hooks:', error.message)
  // Don't fail the installation
  process.exit(0)
}
