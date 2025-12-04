# Git-Based Hash Optimization for Screen Publishing

## Overview

This optimization system uses git-tracked hash files to skip unnecessary Vite builds when screens haven't changed between dev and prod environments, saving ~10 minutes per unchanged screen.

## Architecture

### Hash Files

- **`component-hashes.json`** - Dev state (updated by develop pipeline)
- **`component-hashes-prod.json`** - Prod state (updated by prod pipeline)

### Hash Format

```json
{
  "hr/core/apps/employee-directory": "abc123def456789...",
  "crm/common/apps/account-list": "xyz789abc123456..."
}
```

- **Key**: Screen path (e.g., `hr/core/apps/employee-directory`)
- **Value**: Full MD5 hash (32 chars) of all built artifacts (.js and .css files combined)

## How It Works

### Development Pipeline

**Smart Change Detection**:

1. **Direct changes**: Detects screens with .tsx file changes
2. **Dependency analysis**: Traces imports to find screens affected by:
   - **All shared code** (`src/*` except `src/business-apps/`)
   - `package.json` dependency updates (only screens using that package)
   - **Transitive dependencies**: Screens using shared code that uses updated packages
3. **Merge results**: Combines direct + dependency-affected screens
4. Builds and publishes only affected screens
5. Calculates artifact hashes
6. Updates `component-hashes.json`
7. Commits & pushes to `develop` branch

**Commit format**: `chore(ci): update component hashes [skip ci]`

**Dependency analysis examples**:

- `@newwork/nw-design-system` updated:
  - Direct: Screens importing nw-design-system
  - Transitive: Screens using ANY shared code that imports nw-design-system
- `src/common/hooks/useAuth.ts` changed → Only screens importing useAuth
- `src/components/Header.tsx` changed → Only screens using Header
- `src/hooks/useCustomHook.ts` changed → Only screens importing useCustomHook
- `src/business-apps/hr/core/hooks/useEmployee.ts` → Only HR screens importing it

**What counts as a screen** (must have `index.ts` file):

- `src/business-apps/**/apps/*/index.ts` - App screens
- `src/business-apps/**/forms/*/index.ts` - Form screens
- `src/business-apps/**/popups/*/index.ts` - Popup screens
- `src/business-apps/**/records/*/index.ts` - Record screens

**What counts as shared code** (everything else):

1. **Global shared**: `src/*` except `src/business-apps/`
2. **Module-level shared**: Anything in `src/business-apps/` that's NOT inside a screen folder
   - `src/business-apps/hr/core/hooks/` - No index.ts → Shared
   - `src/business-apps/hr/core/forms/components/` - No index.ts → Shared
   - `src/business-apps/crm/common/utils/` - No index.ts → Shared

### Production Pipeline (Simplified)

**Auto Mode** (no manual screen list):

1. Loads ALL screens from project
2. Compares dev vs prod hashes for ALL screens:
   - If match → **SKIP BUILD** (save 10+ minutes) ✨
   - If different → Build + Upload to prod
3. Updates `component-hashes-prod.json` for successful publishes
4. Commits & pushes to `main` branch (with rebase for concurrency)

**Manual Mode** (screen list file provided):

1. Uses only the specified screens from the file
2. **SKIPS hash comparison** - force deploys all specified screens
3. Updates `component-hashes-prod.json` for deployed screens
4. Useful for forcing specific deployments regardless of hash state

**Commit format**: `chore(ci): update component hashes to ${BUILD_NUMBER} [skip ci]`

## Benefits

### Performance

- **Skip builds**: ~10+ minutes saved per unchanged screen
- **No network calls**: Hash comparison is instant (just JSON parse)
- **Typical savings**: 50+ minutes per pipeline with 5 unchanged screens

### Simplicity

- **No Azure locking**: Git handles concurrency automatically
- **Version controlled**: Full history of deployments in git
- **Easy debugging**: `git diff` shows what changed

### Reliability

- **Concurrent pipelines**: Git rebase merges updates automatically
- **Manual override**: Force deploy when needed
- **Self-healing**: Empty prod hash file = all screens rebuild first time

## Files Modified

### New Files

- `scripts/utils/componentHashUtils.js` - Hash calculation utilities
- `scripts/update-dev-hashes.js` - Dev hash update script (after publishes)
- `scripts/analyze-dependencies.js` - Smart dependency analyzer
- `component-hashes-prod.json` - Prod hash file (empty initially)

### Modified Files

- `scripts/detect-changed-screens.sh` - Added smart dependency analysis
- `scripts/detect-and-publish-changed-screens.sh` - Uses smart detection
- `scripts/publish-prod-screens.js` - Added pre-build hash comparison and prod hash update

## Manual Publish Detection

Manual publish mode is auto-detected via:

- `process.env.BITBUCKET_STEP_TRIGGERER_UUID` (present in manual pipelines)
- `--force` command line flag

When detected:

- Hash comparison is skipped
- All requested screens are force-built
- Prod hashes are still updated after publish

## Concurrent Pipeline Safety

Multiple pipelines can publish simultaneously:

1. All pipelines build/upload in parallel
2. At the end, each pipeline tries to update hash file
3. Git `pull --rebase` merges concurrent updates
4. Retry logic (3 attempts) handles push conflicts
5. Both pipelines' updates are preserved

## Edge Cases

### Dependency Changes

**Problem**: Git detection misses shared component/package changes affecting multiple screens

**Solution - Smart Dependency Analysis**:

- **Direct imports**: Finds screens that directly import the changed dependency
- **Transitive imports**: Finds screens using src/common/ or src/components/ that use the dependency
- Builds and publishes ONLY affected screens (not all 200+)
- Updates hashes for affected screens
- ⚡ **Fast**: Only rebuilds what's actually affected
- 🎯 **Precise**: Catches both direct AND indirect dependencies

**Solution - Production Pipeline**:

- Automatic fallback to checking ALL screens when git detects 0 changes
- Manual trigger: Use `--hash-only` flag or `SKIP_GIT_DETECTION=true`

**Examples automatically caught**:

- `@newwork/nw-design-system` package updates
- Changes to `src/common/*` shared utilities/components
- Changes to shared hooks, types, or services

### Missing Hash Files

- Dev hash missing → Treats as "changed", will build
- Prod hash missing → Starts with empty `{}`, populates on first publish
- Both missing → First dev publish populates dev, prod follows

### Failed Builds

- Only updates hashes for successfully published screens
- Failed screens won't update hash → will retry next pipeline

### Git Conflicts

- Rare (only if exact same screen published concurrently)
- Git rebase auto-merges (different keys)
- Fallback: Uses our version if conflict

## Testing

Run these tests to verify the system:

1. **Dev hash updates**: Deploy screen to dev, verify hash in `component-hashes.json`
2. **Pre-build skip**: Merge to main, verify unchanged screen build is skipped
3. **Changed detection**: Modify screen, verify it rebuilds on prod
4. **Manual override**: Run `publish-manual-prod`, verify all screens build
5. **Concurrent pipelines**: Run two prod pipelines, verify both updates preserved

## Manual Hash Calculation

To bootstrap or reset hash files without deploying, use the `calculate-hashes` pipeline:

### Pipeline Variables

| Variable         | Default | Description                                    |
| ---------------- | ------- | ---------------------------------------------- |
| `HASH_ENV`       | `dev`   | Target environment: `dev` or `prod`            |
| `SCREENS`        | (empty) | Comma-separated list of screens (empty = all)  |
| `COMMIT_CHANGES` | `false` | Whether to commit and push changes             |
| `DRY_RUN`        | `true`  | Whether to do a dry run without making changes |

### Use Cases

**Bootstrap prod hashes (first time setup)**:

```
HASH_ENV=prod
COMMIT_CHANGES=true
```

**Recalculate specific screens**:

```
HASH_ENV=dev
SCREENS=hr/core/apps/employee-directory,crm/common/apps/lead-list
COMMIT_CHANGES=true
```

**Dry run / preview**:
Run locally with `--dry-run`:

```bash
node scripts/calculate-hashes.js --env=prod --dry-run
```

### Local Usage

```bash
# Calculate all prod hashes locally (no commit)
node scripts/calculate-hashes.js --env=prod

# Calculate specific screens
node scripts/calculate-hashes.js --env=dev --screens=hr/core/apps/employee-directory

# Calculate and commit
node scripts/calculate-hashes.js --env=prod --commit
```

## Troubleshooting

### Hash mismatch even though screen unchanged

- Check if dependencies changed (triggers rebuild)
- Verify Vite build is deterministic
- Compare actual file contents between dev and prod

### Git push failures

- Usually resolves automatically with retry logic
- Check for network issues or git permissions
- Verify branch protection rules allow CI commits

### Hash file not updating

- Check pipeline logs for git configuration errors
- Verify CI has write access to repository
- Look for `[skip ci]` in commit messages
