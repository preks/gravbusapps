# Publishing All Screens to Production

## Overview

The pipeline now supports publishing **ALL screens** in the repository to production in a single deployment. This feature is useful for:

- Initial production deployments
- Major releases that affect all screens
- Synchronizing the entire application to production
- Recovery scenarios where all screens need to be republished

## ⚠️ Important Warnings

- **This will publish EVERY screen** in `src/business-apps/` to production
- The process can take a significant amount of time (depends on number of screens)
- All screens will be rebuilt and uploaded to Azure Blob Storage
- All screen configurations will be synced to the Screen Management system
- Resource URLs will be synchronized from dev to prod (unless disabled)

## Usage

### Method 1: Bitbucket Pipeline (Recommended)

1. Go to your Bitbucket repository
2. Navigate to **Pipelines** → **Run pipeline**
3. Select **Custom** → `publish-manual-prod`
4. Set the pipeline variables:
   - `PUBLISH_ALL_SCREENS`: `true` ✅
   - `SCREENS_TO_PUBLISH`: _(leave empty)_
   - `SKIP_RESOURCE_URL_SYNC`: `true` or `false` (default: `true`)
5. Click **Run**

### Method 2: Local Execution (For Testing)

```bash
# Test locally (requires production environment variables)
npm run publish:prod:all
```

**Note:** Local execution requires all production environment variables to be set in your `.env` file:

- `AZURE_STORAGE_ACCOUNT_PROD`
- `AZURE_STORAGE_SAS_TOKEN_PROD`
- `AZURE_BLOB_CONTAINER_NAME_PROD`
- `BITBUCKET_BUILD_NUMBER`
- `SCREEN_MANAGEMENT_SERVICE_API_PROD`
- `NAVIGATION_SERVICE_API_PROD`
- `OAUTH_CLIENT_ID_PROD`
- `OAUTH_CLIENT_SECRET_PROD`
- `OAUTH_URL_PROD`
- `OAUTH_REALM_PROD`

## Pipeline Variables

### PUBLISH_ALL_SCREENS

| Option            | Description                                 |
| ----------------- | ------------------------------------------- |
| `true`            | Publishes all screens in the repository     |
| `false` (default) | Uses change detection or manual screen list |

When set to `true`, this variable takes precedence over `SCREENS_TO_PUBLISH` and change detection.

### SCREENS_TO_PUBLISH

This variable is **ignored** when `PUBLISH_ALL_SCREENS=true`.

### SKIP_RESOURCE_URL_SYNC

| Option           | Description                                                             |
| ---------------- | ----------------------------------------------------------------------- |
| `true` (default) | Skips resource URL creation/update in prod while still reading from dev |
| `false`          | Performs full resource URL synchronization from dev to prod             |

## What Happens During Publishing

### 1. Screen Discovery

- Scans `src/business-apps/**/apps/*/index.ts`
- Scans `src/business-apps/**/forms/*/index.ts`
- Scans `src/business-apps/**/popups/*/index.ts`
- Scans `src/business-apps/**/records/*/index.ts`
- Generates a list of all screen paths
- Filters out any missing/deleted screens

### 2. Comprehensive Screen Synchronization

For each screen:

- **Form Screens** (contains `/forms/`):
  - Skips resource URL sync (forms use direct screenKey)
  - Syncs screen configuration from dev to prod
  - Preserves namespace information
- **App Screens, Popups, and Records** (contains `/apps/`, `/popups/`, or `/records/`):
  - Searches for resource URL in dev
  - Syncs resource URL to prod with same ID (if `SKIP_RESOURCE_URL_SYNC=false`)
  - Syncs screen configuration from dev to prod
  - Preserves namespace information

### 3. Building and Azure Upload

For each screen:

- Builds the screen with Vite
- Generates versioned assets (index-{BUILD_NUMBER}.js)
- Uploads to Azure Blob Storage
- Handles CSS files (screen-specific and global)

### 4. Screen Management Registration

For each screen:

- Checks if screen exists in prod
- Creates new screen or updates existing
- Sets version to `{BITBUCKET_BUILD_NUMBER}`
- Handles LOWCODER screen migration (delete and recreate)

## Expected Output

### Console Output Example

```
🚀 Publishing ALL screens to PRODUCTION...
⚠️  WARNING: This will publish EVERY screen in the repository!

🔍 Discovering all screens in repository...
📋 Found 150 screens to publish:
────────────────────────────────────────────────────────────────────────────────
📱 Apps: 98
   - crm/common/apps/account-record
   - crm/common/apps/contact-record
   - crm/common/apps/lead-record
   - hr/core/apps/employee-record
   - fin/expenses/apps/personal-expenses
   ... (more screens)

📝 Forms: 29
   - crm/common/forms/account-form
   - crm/common/forms/contact-form
   - hr/core/forms/employee-form
   ... (more forms)

🪟 Popups: 15
   - crm/investments/popups/investment-popup
   - hr/core/popups/employee-select-popup
   ... (more popups)

📄 Records: 8
   - crm/common/records/opportunity-record
   - hr/core/records/employee-record
   ... (more records)
────────────────────────────────────────────────────────────────────────────────

✅ Verified 150 existing screens
📄 Screen list written to: all-screens.txt

🚀 Starting production publishing process...
────────────────────────────────────────────────────────────────────────────────

🔄 COMPREHENSIVE SCREEN SYNCHRONIZATION
... (synchronization logs)

🔨 INDIVIDUAL SCREEN BUILDING AND AZURE UPLOAD
... (build logs)

📊 PRODUCTION PUBLISHING SUMMARY
────────────────────────────────────────────────────────────────────────────────
🔢 Build number: 1234
🎯 Publish version: 1234
📈 Total screens processed: 150
✅ Successfully published: 150
❌ Failed: 0

🎉 Production publishing completed successfully!
✨ All 150 screen(s) were published without errors.
```

## Timing Estimates

| Number of Screens | Estimated Time |
| ----------------- | -------------- |
| 50 screens        | ~15-20 minutes |
| 100 screens       | ~30-40 minutes |
| 150 screens       | ~45-60 minutes |
| 200+ screens      | ~60+ minutes   |

**Note:** Times vary based on:

- Screen complexity and dependencies
- Build server performance
- Network speed to Azure
- API response times

## Use Cases

### 1. Initial Production Deployment

When deploying the application to production for the first time:

- Set `PUBLISH_ALL_SCREENS=true`
- Set `SKIP_RESOURCE_URL_SYNC=false` (to create all resource URLs)
- Run the pipeline

### 2. Major Release Deployment

When all screens have been updated and need redeployment:

- Set `PUBLISH_ALL_SCREENS=true`
- Set `SKIP_RESOURCE_URL_SYNC=true` (resource URLs already exist)
- Run the pipeline

### 3. Production Recovery

If production screens need to be restored from the latest code:

- Set `PUBLISH_ALL_SCREENS=true`
- Set `SKIP_RESOURCE_URL_SYNC=true`
- Run the pipeline

### 4. Environment Synchronization

To ensure production matches the current codebase exactly:

- Set `PUBLISH_ALL_SCREENS=true`
- Set `SKIP_RESOURCE_URL_SYNC=true`
- Run the pipeline

## Comparison with Other Publishing Methods

| Method                      | Screens Published    | When to Use                        |
| --------------------------- | -------------------- | ---------------------------------- |
| **Automatic** (main branch) | Only changed screens | Regular development workflow       |
| **Manual with list**        | Specific screens     | Publishing selected screens        |
| **Publish All** (new)       | All screens in repo  | Initial deployment, major releases |

## Troubleshooting

### Build Failures

If individual screens fail to build:

1. Check the pipeline logs for specific screen errors
2. The pipeline will continue with other screens
3. Failed screens will be listed in the summary
4. Fix the issues and re-run with `SCREENS_TO_PUBLISH` for failed screens only

### Resource URL Sync Issues

If resource URL synchronization fails:

- Enable detailed logging by checking pipeline output
- Verify dev resource URLs exist and are accessible
- Check OAuth credentials are correct
- Consider running with `SKIP_RESOURCE_URL_SYNC=true` as a workaround

### Screen Management Registration Failures

If screen registration fails:

- Check Screen Management service availability
- Verify OAuth credentials
- Look for namespace conflicts
- The pipeline handles LOWCODER screen migration automatically

### Pipeline Timeout

If the pipeline times out (exceeds Bitbucket's limit):

- Consider running in batches using `SCREENS_TO_PUBLISH`
- Split screens by module (e.g., publish CRM screens first, then HR screens)
- Contact DevOps to increase pipeline timeout limits

## Safety Measures

The publishing process includes several safety measures:

1. **Screen Verification**: Only publishes screens with existing `index.ts` files
2. **Failure Isolation**: A single screen failure doesn't stop the entire process
3. **Comprehensive Logging**: Detailed logs for debugging
4. **Summary Report**: Clear indication of success/failure count
5. **Exit Code**: Pipeline fails if any screens fail (for CI/CD integration)

## Related Documentation

- [Deployment to Production Rules](./deployment-to-prod-rules.md)
- [Production Deployment Comprehensive Sync](./production-deployment-comprehensive-sync.md)

## Questions?

If you encounter issues or have questions about publishing all screens to production, please contact the DevOps team or create an issue in the project repository.
