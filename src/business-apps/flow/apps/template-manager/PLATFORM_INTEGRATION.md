# Template Manager - Platform Integration

## Overview

The Template Manager automatically integrates with the current platform environment using `NEXT_PUBLIC_BASE_URL + "/flow-engine"`. This means **no environment variables needed** - it just works!

---

## 🎯 How It Works

### Automatic Instance Detection

The Template Manager automatically creates a "Current" instance based on your platform URL:

```typescript
// Automatically detects from NEXT_PUBLIC_BASE_URL
const baseUrl = env('NEXT_PUBLIC_BASE_URL') // e.g., "https://newwork-dev.newwork.com"
const flowEngineUrl = baseUrl + '/flow-engine' // "https://newwork-dev.newwork.com/flow-engine"
```

### Environment Detection

The instance name and icon are automatically determined from the URL:

| Platform URL              | Instance Name     | Environment | Icon | Color  |
| ------------------------- | ----------------- | ----------- | ---- | ------ |
| `newwork-dev.newwork.com` | Current (DEV)     | DEV         | 💻   | Blue   |
| `demo.newwork.com`        | Current (STAGING) | STAGING     | 🧪   | Orange |
| `newwork.newwork.cloud`   | Current (PROD)    | PROD        | 🚀   | Green  |
| Other                     | Current           | DEV         | 🌐   | Purple |

---

## 🔐 Authentication

### Current Platform Instance

The Template Manager uses your **current user's access token** to connect to the flow-engine:

```typescript
// No API key needed for current platform
const currentInstance = {
  baseUrl: baseUrl + '/flow-engine',
  apiKey: '', // Empty - will use user's accessToken
  ...
};

// When making API calls
const apiKey = instance.apiKey || accessToken; // Falls back to user's token
```

**Benefits**:

- ✅ No API keys to configure
- ✅ Uses your existing authentication
- ✅ Respects your permissions
- ✅ Works immediately

### External Instances (from Catalog)

External instances (STAGING, PROD) use API keys from the catalog:

```typescript
// From catalog metadata
const externalInstance = {
  baseUrl: 'https://staging-flow.newwork.com',
  apiKey: 'staging-api-key-from-catalog', // Explicit API key
  ...
};
```

---

## 📊 Instance Priority

Instances are loaded in this order:

1. **Current Platform** (order: 0) - From `NEXT_PUBLIC_BASE_URL`
2. **Catalog Instances** (order: 1+) - From `FlowEngineInstances` catalog

### Example Result

```
┌─────────────────────────────────┐
│ 💻 Current (DEV)                │  ← Auto-detected from platform
│     https://newwork-dev.../flow-engine
├─────────────────────────────────┤
│ 🧪 STAGING                      │  ← From catalog
│     https://demo.../flow-engine
├─────────────────────────────────┤
│ 🚀 PROD                         │  ← From catalog
│     https://newwork.cloud/...
└─────────────────────────────────┘
```

---

## 🔄 Comparison Scenarios

### Scenario 1: Current vs. Catalog Instance

**Use Case**: Compare your current environment with STAGING

```
Source: Current (DEV) → Uses your access token
Target: STAGING       → Uses catalog API key
```

**Perfect for**:

- Testing changes before promoting to STAGING
- Verifying template differences
- Syncing from DEV to STAGING

### Scenario 2: Catalog vs. Catalog

**Use Case**: Compare STAGING with PROD

```
Source: STAGING → Uses catalog API key
Target: PROD    → Uses catalog API key
```

**Perfect for**:

- Promoting templates to production
- Auditing differences between environments
- Syncing STAGING → PROD

### Scenario 3: Current vs. Current (Different Tabs)

**Use Case**: Open Template Manager in two different environments

```
Tab 1: newwork-dev.newwork.com
  → Current (DEV) instance

Tab 2: demo.newwork.com
  → Current (STAGING) instance
```

**Perfect for**:

- Side-by-side comparison
- Cross-environment verification

---

## 🛠️ Configuration

### Zero Configuration Required! ✅

The Template Manager works out-of-the-box with **no environment variables** needed:

- ✅ No `.env` file required
- ✅ No VITE variables to configure
- ✅ No manual URL setup
- ✅ Just launch and use!

### Optional: Add External Instances

To compare with other environments, add them to the `FlowEngineInstances` catalog:

1. **Open Catalog Manager**
2. **Find**: `FlowEngineInstances` (v1)
3. **Add entries** for STAGING, PROD, etc.

See `CATALOG_SETUP.md` for details.

---

## 🔍 How to Verify

### Check Current Instance

After loading Template Manager, check the browser console:

```
useFlowInstances: Current platform instance: Current (DEV)
Total X flow engine instances available
```

### Verify URL

The current instance should show:

```
Name: Current (DEV)
URL: https://newwork-dev.newwork.com/flow-engine
```

### Test Connection

The health indicator should show:

- ✅ Green dot = Connected
- ❌ Red dot = Connection failed

---

## 🐛 Troubleshooting

### Issue: "Current platform instance: not available"

**Cause**: `NEXT_PUBLIC_BASE_URL` is not set

**Solution**: This should never happen in production. If it does:

1. Check platform configuration
2. Verify environment variables are loaded
3. Contact platform support

### Issue: 401 Unauthorized on Current Instance

**Cause**: Your access token is invalid or expired

**Solution**:

1. Refresh the page
2. Log out and log back in
3. Check token expiration

### Issue: Can't connect to flow-engine

**Cause**: Flow-engine might not be running at `/flow-engine` path

**Solution**:

1. Verify flow-engine is deployed
2. Check URL: `{BASE_URL}/flow-engine/api`
3. Verify CORS settings

---

## 📝 API Endpoints

The Template Manager calls these endpoints on the flow-engine:

### Template Operations

```
GET  {baseUrl}/api/templates          - List all templates
GET  {baseUrl}/api/templates/{id}     - Get specific template
POST {baseUrl}/api/templates          - Create/update template
```

### Health Check (Optional)

```
GET  {baseUrl}/api                    - Check instance health (base API endpoint)
```

### Active Workflows (Optional)

```
GET  {baseUrl}/api/workflows/count?templateId={id}&status=RUNNING
```

---

## 🎯 Benefits of Platform Integration

### For Developers

- ✅ **Zero Setup** - Works immediately
- ✅ **No Config** - No .env files needed
- ✅ **Auto-Detection** - Knows current environment
- ✅ **Secure** - Uses your authentication

### For Operations

- ✅ **Consistent** - Same setup everywhere
- ✅ **Maintainable** - No env vars to manage
- ✅ **Auditable** - Uses user permissions
- ✅ **Scalable** - Works across all environments

### For Security

- ✅ **No Hardcoded Keys** - Uses user tokens
- ✅ **Permission-Based** - Respects user access
- ✅ **Token Rotation** - Automatic with user sessions
- ✅ **Audit Trail** - All actions tied to user

---

## 🔄 Migration from VITE Variables

**Old Approach** (DEPRECATED):

```env
# ❌ No longer needed!
VITE_FLOW_ENGINE_LOCAL_URL=http://localhost:3000
VITE_FLOW_ENGINE_LOCAL_API_KEY=dev-key
```

**New Approach** (CURRENT):

```typescript
// ✅ Automatic!
const baseUrl = env('NEXT_PUBLIC_BASE_URL')
const flowEngineUrl = baseUrl + '/flow-engine'
```

**What Changed**:

- Removed VITE environment variables
- Uses platform's `NEXT_PUBLIC_BASE_URL`
- Automatic environment detection
- Uses user's access token

**Benefits**:

- No configuration needed
- Works in all environments
- More secure (no hardcoded keys)
- Easier maintenance

---

## 📚 Related Documentation

- `README.md` - Overview and features
- `CATALOG_SETUP.md` - External instance configuration
- `TROUBLESHOOTING.md` - Common issues and solutions
- `VERIFICATION.md` - Quality assurance

---

## 💡 Quick Reference

**Current Instance**:

- URL: `{NEXT_PUBLIC_BASE_URL}/flow-engine`
- Auth: User's access token
- Config: Automatic (no setup needed)

**External Instances**:

- URL: From catalog `objectValue.baseUrl`
- Auth: From catalog `objectValue.apiKey`
- Config: Manual (via Catalog Manager)

**Minimum Setup**:

- Current platform: ✅ Works automatically
- External instances: ⚠️ Requires catalog entries

---

_Last Updated: December 2025_
_Version: 2.0.0 (Platform Integration)_
