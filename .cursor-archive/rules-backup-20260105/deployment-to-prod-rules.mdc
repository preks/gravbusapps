---
description: When the user wants to change the deployment process from DEV to PROD, or when the user mentions the deployment process from DEV to PROD.
alwaysApply: false
---

# Production Deployment Rules and Guidelines

## Overview

This document contains critical rules and guidelines for deploying business app screens to production environments. These rules ensure consistent, reliable, and secure deployments.

## 🚀 **Deployment Architecture Rules**

### 1. **Comprehensive Synchronization Pattern**
- **ALWAYS** use the centralized screen synchronization system before individual publishing
- **NEVER** skip the centralized sync step in production deployments
- **ALWAYS** preserve IDs between dev and prod environments
- **BULK GET ONLY**: Use single API call with pagination to fetch all NATIVE_SCREEN screens
- **INDIVIDUAL PROCESSING**: Process each screen separately for precise control and fault isolation

### 2. **Form Screen vs App Screen Handling**
- **DETECT** screen type using `isFormScreen()` (checks for `/forms/` in componentPath)
- **FORM SCREENS**: 
  - **SKIP** resource URL synchronization entirely
  - **PRESERVE** exact `screenKey` from dev environment (never derive from paths)
  - **MAINTAIN** `builderType: "NATIVE_SCREEN"` from dev
  - **PROCESS INDIVIDUALLY** - one API call per form screen for precise control
  - **UPDATE** only the `version` field with build number
- **APP SCREENS**:
  - **PERFORM** individual resource URL synchronization per screen
  - **CONVERT** screen keys to platform URLs for resource lookup
  - **PROCESS INDIVIDUALLY** - one API call per app screen for fault isolation
  - **SYNC** both resource URLs and screen configurations separately

### 3. **Individual Processing Rules**
- **FORM SCREENS**: Process each form screen in separate API call for isolation
- **APP SCREENS**: Process each app screen in separate API call for granular control
- **BOTH**: Maintain version field consistency with build numbers
- **FAILURE ISOLATION**: One screen failure must not affect others
- **DETAILED LOGGING**: Log progress and results per individual screen

### 4. **Bulk vs Individual Operations**
- **✅ BULK ALLOWED**: Initial GET requests with pagination (`while (hasMore)` loop)
- **❌ NO BULK UPDATES**: Never batch multiple screen updates in single API call
- **✅ INDIVIDUAL UPDATES**: Always process each screen separately for reliability
- **✅ PAGINATION**: Use 100-screen batches for initial data fetching only

### 5. **Fast-Forward Merge Support**
- **ALWAYS** ensure `detect-changed-screens.sh` properly handles fast-forward merges
- **USE** time-based detection (24 hours) for production branch deployments
- **IMPLEMENT** multiple fallback strategies for reliable change detection

### 6. **Environment Separation**
- **ALWAYS** use separate OAuth credentials for dev and prod
- **NEVER** mix dev and prod API endpoints
- **ALWAYS** validate environment-specific configuration

## 📋 **Screen Management Rules**

### 1. **Screen Filtering and Processing**
```javascript
// ✅ CORRECT: Filter screens by componentPath matching
const matchingScreens = devScreens.filter(screen => {
  const componentPath = screen.screenComponents.formDefinition.componentPath.replace(/^\//, '');
  return changedScreens.some(changedScreen => {
    return componentPath === changedScreen || componentPath.endsWith(`/${changedScreen}`);
  });
});
```

### 2. **Screen Key to URL Conversion**
- **PATTERN**: `url_path1~path2~path3` → `/platform/path1/path2/path3`
- **ALWAYS** validate screen key format before conversion
- **HANDLE** malformed keys gracefully

### 3. **Version Management**
- **ALWAYS** use Bitbucket build number as version
- **UPDATE** both `formDefinition.version` and `release` fields
- **MAINTAIN** version consistency across environments

## 🔗 **Resource URL Synchronization Rules**

### 1. **ID Preservation**
```javascript
// ✅ CRITICAL: Use same ID from dev environment
const payload = {
  id: devResourceUrl.id, // NEVER generate new ID
  code: devResourceUrl.code,
  name: devResourceUrl.name,
  url: devResourceUrl.url,
  // ... other properties
};
```

### 2. **Duplicate Prevention**
- **ALWAYS** check if resource URL exists before creating
- **USE** `getResourceUrlByPath()` for existence validation
- **HANDLE** conflicts gracefully with appropriate logging

### 3. **Search Strategy**
- **IMPLEMENT** progressive search (full path → without apps/forms → component name)
- **FALLBACK** to multiple search strategies
- **LOG** detailed search progress for debugging

## 🏗️ **API Integration Rules**

### 1. **Pagination Requirements**
```javascript
// ✅ REQUIRED: Implement proper pagination for bulk GET operations
async function getAllNativeScreens() {
  let allScreens = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    // Fetch batch - THIS IS THE ONLY BULK OPERATION
    // Individual processing happens after data collection
    // Check if more data available
    // Update offset
  }
}
```

### 2. **Individual Processing Pattern**
```javascript
// ✅ REQUIRED: Process each screen individually
for (const screen of matchingScreens) {
  try {
    // Individual API call per screen for fault isolation
    const result = await syncScreenFromDevToProd(screen, ...);
    console.log(`✅ Screen synced: ${screen.screenKey}`);
  } catch (error) {
    console.error(`❌ Screen failed: ${screen.screenKey} - ${error.message}`);
    // Continue with next screen - don't fail entire batch
  }
}
```

### 3. **Error Handling**
- **ALWAYS** implement graceful degradation per screen
- **CONTINUE** processing remaining screens on individual failures
- **LOG** detailed error information per screen for debugging
- **PROVIDE** per-screen fallback mechanisms

### 4. **Authentication**
- **USE** OAuth 2.0 client credentials flow
- **CACHE** tokens with proper expiration handling
- **SEPARATE** credentials for each environment

## 📊 **Logging and Monitoring Rules**

### 1. **Progress Reporting**
```javascript
// ✅ REQUIRED: Detailed step-by-step logging
console.log("🔄 Step 1: Fetching all NATIVE_SCREEN screens...");
console.log(`   Found ${screens.length} screens in this batch`);
console.log("✅ Step 1 completed successfully");
```

### 2. **Summary Reporting**
- **ALWAYS** provide comprehensive summary at the end
- **INCLUDE** counts for processed screens, synced resources, synced screens
- **REPORT** both comprehensive sync and individual publishing results

### 3. **Error Logging**
- **NEVER** log sensitive data (tokens, credentials)
- **INCLUDE** error context and operation being performed
- **PROVIDE** actionable error messages

## 🔒 **Security Rules**

### 1. **Credential Management**
- **NEVER** hardcode credentials in scripts
- **USE** environment variables for all configuration
- **SEPARATE** dev and prod credentials completely

### 2. **Data Protection**
- **VALIDATE** all input data before processing
- **SANITIZE** log output to remove sensitive information
- **USE** HTTPS for all API communications

### 3. **Access Control**
- **LIMIT** API permissions to minimum required
- **USE** service accounts, never user accounts
- **AUDIT** API access regularly

## 🛠️ **Development Guidelines**

### 1. **Function Design**
```javascript
// ✅ FOLLOW: Clear function signatures with proper documentation
/**
 * Sync resource URL from dev to prod with same ID
 * @param {Object} devResourceUrl - The resource URL object from dev
 * @param {string} prodNavigationApi - Production navigation API endpoint
 * @param {Object} prodOauthConfig - Production OAuth configuration
 * @returns {Promise<Object>} Result object with success status
 */
async function syncResourceUrlWithSameId(devResourceUrl, prodApi, prodConfig) {
  // Implementation
}
```

### 2. **Error Handling Pattern**
```javascript
// ✅ STANDARD: Consistent error handling approach
try {
  const result = await operationFunction();
  return { success: true, operation: 'completed', data: result };
} catch (error) {
  console.error(`❌ Operation failed: ${error.message}`);
  return { success: false, operation: 'error', error: error.message };
}
```

### 3. **Configuration Management**
```javascript
// ✅ REQUIRED: Environment-specific configuration
const devOauthConfig = {}; // Uses default env vars
const prodOauthConfig = {
  clientId: OAUTH_CLIENT_ID_PROD,
  clientSecret: OAUTH_CLIENT_SECRET_PROD,
  oauthUrl: OAUTH_URL_PROD,
  realm: OAUTH_REALM_PROD
};
```

## 🧪 **Testing and Validation Rules**

### 1. **Pre-Deployment Validation**
- **VERIFY** all environment variables are set
- **TEST** API connectivity before starting sync
- **VALIDATE** OAuth credentials work correctly

### 2. **Change Detection Testing**
- **TEST** both merge commits and fast-forward merges
- **VERIFY** time-based detection works correctly
- **VALIDATE** fallback strategies function properly

### 3. **Deployment Verification**
- **CONFIRM** screens are accessible in production
- **VERIFY** resource URLs resolve correctly
- **CHECK** version numbers are updated properly

## 📁 **File Organization Rules**

### 1. **Script Structure**
```
scripts/
├── publish-prod-screens.js      # Main production publishing script
├── api-client.js               # API integration functions
├── detect-changed-screens.sh   # Change detection logic
└── detect-and-publish-changed-screens.sh  # Development publishing
```

### 2. **Function Placement**
- **API functions**: `api-client.js`
- **Deployment logic**: `publish-prod-screens.js`
- **Utilities**: Appropriate utility files
- **Configuration**: Environment variables only

### 3. **Documentation**
- **MAINTAIN** inline documentation for complex functions
- **UPDATE** documentation when changing functionality
- **PROVIDE** examples for common use cases

## 🚨 **Critical Failure Rules**

### 1. **Non-Blocking Failures**
- Resource URL sync failures (continue with screen sync)
- Individual screen publishing failures (continue with next screen)
- Non-critical API errors

### 2. **Blocking Failures**
- Authentication failures
- Critical environment variable missing
- Complete API service unavailability

### 3. **Recovery Procedures**
- **LOG** detailed failure information
- **CONTINUE** with fallback methods where possible
- **REPORT** failures in final summary
- **EXIT** with appropriate error codes for CI/CD

## 📈 **Performance Rules**

### 1. **Batch Processing**
- **USE** 100 items per batch for pagination
- **AVOID** sequential processing where parallel is possible
- **IMPLEMENT** reasonable timeouts

### 2. **API Efficiency**
- **CACHE** authentication tokens
- **REUSE** HTTP connections where possible
- **MINIMIZE** redundant API calls

### 3. **Resource Management**
- **CLEAN UP** temporary files and resources
- **MONITOR** memory usage for large datasets
- **LIMIT** concurrent operations to prevent overload

## 🔄 **Deployment Pipeline Integration**

### 1. **Bitbucket Pipeline Rules**
- **USE** build number as version identifier
- **SUPPORT** manual screen specification via environment variables
- **HANDLE** both automatic and manual deployments

### 2. **Environment Variables**
```bash
# ✅ REQUIRED: Production environment variables
SCREEN_MANAGEMENT_SERVICE_API_PROD
NAVIGATION_SERVICE_API_PROD
OAUTH_CLIENT_ID_PROD
OAUTH_CLIENT_SECRET_PROD
OAUTH_URL_PROD
OAUTH_REALM_PROD

# ✅ OPTIONAL: Control flags
SKIP_RESOURCE_URL_SYNC=true
FORCE_PUBLISH_SCREENS=""
```

### 3. **Exit Codes**
- **0**: Success
- **1**: Failure (stops pipeline)
- **LOG** clear messages for all exit conditions

## 🎯 **Quality Assurance Rules**

### 1. **Code Review Requirements**
- **REVIEW** all changes to deployment scripts
- **TEST** on dev environment before production
- **VALIDATE** backward compatibility

### 2. **Documentation Updates**
- **UPDATE** this rules file when adding new functionality
- **MAINTAIN** API documentation
- **PROVIDE** troubleshooting guides

### 3. **Monitoring**
- **TRACK** deployment success rates
- **MONITOR** performance metrics
- **ALERT** on critical failures

## 🔧 **Troubleshooting Guidelines**

### Form Screen Issues
1. **Form not syncing**: Verify `componentPath` contains `/forms/`
2. **Screen key mismatch**: Check dev environment for exact screenKey value
3. **Version not updating**: Confirm build number is correctly passed to sync function
4. **Form categorization**: Verify `isFormScreen()` detection is working correctly

### App Screen Issues  
1. **Resource URL not found**: Check platform URL conversion from screenKey
2. **ID mismatch**: Verify resource URL sync preserves same ID from dev
3. **Navigation broken**: Confirm resource URL was properly synced to navigation service
4. **Screen key conversion**: Validate `url_path1~path2~path3` → `/platform/path1/path2/path3` logic

### API Performance Issues
1. **Single API call**: Ensure screen management requests are made only once per deployment
2. **Pagination efficiency**: Verify 100-item batches for large screen datasets  
3. **Parallel processing**: Consider processing form and app screens in parallel
4. **Network timeouts**: Check for API response time issues in pipeline logs

## 📞 **Emergency Procedures**

### Deployment Failure Recovery
1. **Check** pipeline logs for form vs app screen categorization errors
2. **Verify** environment variables and OAuth credentials for both environments
3. **Test** screen management API endpoints manually
4. **Use** manual override with `FORCE_PUBLISH_SCREENS` environment variable
5. **Escalate** to platform team if API services are unavailable

### Data Consistency Issues
1. **Form screenKey preservation**: Ensure form screenKeys match exactly between dev and prod
2. **Resource URL IDs**: Verify app screen resource URLs have same UUIDs in both environments
3. **Version synchronization**: Check that build numbers are consistently applied across all screens
4. **Builder type consistency**: Confirm `builderType: "NATIVE_SCREEN"` is maintained for both forms and apps

### Performance Issues
1. **Monitor** API response times during screen fetching
2. **Check** batch sizes and pagination efficiency  
3. **Verify** network connectivity to dev and prod services
4. **Scale** resources if processing large numbers of screens

---

*These rules must be followed for all production deployments. Violations may result in deployment failures or data inconsistencies.*
