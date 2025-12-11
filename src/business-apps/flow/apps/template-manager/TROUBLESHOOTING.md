# Template Manager - Troubleshooting Guide

## Common Issues and Solutions

---

## 🔴 Issue: "At least 2 instances are required for comparison"

### Symptoms

- Only 1 instance shows (Localhost)
- Console error: `401 Unauthorized`
- Error message: "Catalog not found or empty, using localhost only"

### Root Cause

The catalog API is returning 401 Unauthorized, preventing external instances from loading.

### Solutions

#### 1. **Check Access Token** ✅

The Template Manager needs a valid access token to fetch catalog data.

**Check in browser console**:

```javascript
// You should see these logs:
useFlowInstances: Starting fetch with accessToken: present
```

If you see `accessToken: missing`, the problem is that the BusinessAppContext isn't providing the token.

#### 2. **Verify Catalog Permissions** ✅

You need permission to access the `FlowEngineInstances` catalog.

**Test catalog access**:

```graphql
query TestCatalogAccess {
  Catalog(where: { identifier: { _eq: "FlowEngineInstances" } }) {
    id
    identifier
    name
  }
}
```

If this query fails with 401, you don't have catalog access permissions.

**Fix**: Contact your admin to grant you catalog read permissions.

#### 3. **Current Platform Instance** ✅

The Template Manager automatically detects your current platform.

**Automatic Detection**:

- URL: `{NEXT_PUBLIC_BASE_URL}/flow-engine`
- Auth: Your access token
- No configuration needed!

This gives you at least one instance (the current platform).

#### 4. **Check Catalog Exists** ✅

The catalog might not exist yet.

**Verify catalog exists**:

- Open Catalog Manager
- Search for `FlowEngineInstances`
- Version: `v1`

If it doesn't exist, create it following `CATALOG_SETUP.md`.

#### 5. **Inspect Network Request** ✅

Check the actual API call in browser DevTools:

1. Open DevTools → Network tab
2. Filter by `FlowEngineInstances`
3. Look for the request to `/catalogs/FlowEngineInstances/v1/entries`
4. Check:
   - Request headers (Authorization header present?)
   - Response status (401? 404? 500?)
   - Response body (error message)

---

## 🟡 Issue: "Current platform instance doesn't appear"

### Symptoms

- No "Current (DEV/STAGING/PROD)" instance in dropdown
- Only catalog instances showing

### Solutions

#### 1. **Check NEXT_PUBLIC_BASE_URL**

The Template Manager uses `NEXT_PUBLIC_BASE_URL` to detect the current platform.

**Verify in console**:

```javascript
console.log(window['nw-envs']?.NEXT_PUBLIC_BASE_URL)
// Should show: https://newwork-dev.newwork.com or similar
```

#### 2. **Verify Flow-Engine Path**

The current instance uses: `{BASE_URL}/flow-engine`

**Test the URL**:

```
https://newwork-dev.newwork.com/flow-engine/api
```

Should return 200 OK.

#### 3. **Check Console Logs**

Look for:

```
useFlowInstances: Current platform instance: Current (DEV)
```

If you see "not available", the BASE_URL detection failed.

---

## 🟡 Issue: "Catalog instances don't appear"

### Symptoms

- Only localhost shows
- No 401 error
- Catalog response is empty

### Solutions

#### 1. **Check Catalog Has Entries**

Query the catalog to verify it has entries:

```graphql
query GetCatalogEntries {
  CatalogEntry(where: { catalog: { identifier: { _eq: "FlowEngineInstances" } }, isDeleted: { _eq: false } }) {
    id
    code
    objectValue
  }
}
```

If no results, add entries following `CATALOG_SETUP.md`.

#### 2. **Verify Entry Structure**

Each entry needs these fields in `objectValue`:

```json
{
  "baseUrl": "https://...",
  "apiKey": "...",
  "environment": "STAGING",
  "color": "#...",
  "icon": "🧪"
}
```

Missing any of these? The instance won't load properly.

#### 3. **Check for `isDeleted=true`**

Entries might be soft-deleted.

```graphql
query CheckDeletedEntries {
  CatalogEntry(where: { catalog: { identifier: { _eq: "FlowEngineInstances" } }, isDeleted: { _eq: true } }) {
    id
    code
  }
}
```

If found, restore them or create new ones.

---

## 🔴 Issue: "Failed to load instances: ..."

### Symptoms

- Red error card appears
- Specific error message shown

### Solutions

#### **Error: "No access token available"**

**Cause**: BusinessAppContext not providing accessToken

**Fix**:

1. Check you're logged in to the platform
2. Verify Template Manager is launched within platform (not standalone)
3. Check browser console for authentication errors

#### **Error: "REST request failed: 401"**

**Cause**: Invalid or expired access token

**Fix**:

1. Refresh the page
2. Log out and log back in
3. Check token expiration in JWT decoder
4. Contact admin for catalog permissions

#### **Error: "REST request failed: 404"**

**Cause**: Catalog doesn't exist

**Fix**: Create the `FlowEngineInstances` catalog (see `CATALOG_SETUP.md`)

#### **Error: "REST request failed: 500"**

**Cause**: Server error in catalog API

**Fix**:

1. Check catalog API status
2. Try again in a few minutes
3. Contact platform support

---

## 🟢 Issue: "Connection to instance fails"

### Symptoms

- Instance appears in dropdown
- Health indicator shows "Unhealthy" or red dot
- Can't compare templates

### Solutions

#### 1. **Verify Instance URL**

**Check baseUrl is correct**:

```graphql
query CheckInstanceURL {
  CatalogEntry(where: { id: { _eq: "FlowEngineInstances:v1:STAGING" } }) {
    objectValue
  }
}
```

**Test in browser**: Open `{baseUrl}/api`

- Should return 200 OK
- If 404/500, the custom-flow-engine instance is down or URL is wrong

#### 2. **Check API Key**

**Verify API key works**:

```bash
curl {baseUrl}/api/templates \
  -H "Authorization: Bearer {apiKey}"
```

Should return template list, not 401.

#### 3. **Check CORS**

If browser console shows CORS error:

1. custom-flow-engine needs to allow your domain
2. Check `Access-Control-Allow-Origin` header
3. Contact backend team to whitelist your domain

#### 4. **Network Access**

If on VPN:

1. Verify VPN allows access to instance URL
2. Check firewall rules
3. Try from different network

---

## 🔍 Debugging Tools

### Browser Console Logs

Enable detailed logging by checking console for these messages:

```
useFlowInstances: Starting fetch with accessToken: present
useFlowInstances: Localhost instance: enabled
useFlowInstances: Fetching from catalog...
Catalog response: {...}
Loaded X instances from catalog: [...]
Total X flow engine instances available
```

### Check Instance Configuration

```javascript
// In browser console:
// 1. Check localhost
console.log(import.meta.env.VITE_FLOW_ENGINE_LOCAL_URL)

// 2. After page loads, check loaded instances
// Open React DevTools → Components → ComparisonDashboard
// Look at "instances" prop
```

### GraphQL Queries

Test catalog access directly:

```graphql
# 1. Check catalog exists
query CheckCatalog {
  Catalog(where: { identifier: { _eq: "FlowEngineInstances" } }) {
    id
    name
  }
}

# 2. Check entries exist
query CheckEntries {
  CatalogEntry(where: { catalog: { identifier: { _eq: "FlowEngineInstances" } }, isDeleted: { _eq: false } }) {
    id
    code
    objectValue
  }
}
```

---

## 📋 Checklist: Complete Setup

### Localhost Configuration

- [ ] `.env` file exists in project root
- [ ] `VITE_FLOW_ENGINE_LOCAL_URL` set
- [ ] `VITE_FLOW_ENGINE_LOCAL_API_KEY` set
- [ ] `VITE_FLOW_ENGINE_LOCAL_ENABLED=true`
- [ ] Dev server restarted after .env changes
- [ ] Variables accessible in browser console

### Catalog Configuration

- [ ] `FlowEngineInstances` catalog exists
- [ ] Catalog version is `v1`
- [ ] At least 1 entry exists (2+ recommended)
- [ ] Each entry has valid `objectValue` with required fields
- [ ] Entries are not deleted (`isDeleted=false`)
- [ ] You have permission to read the catalog

### Access & Permissions

- [ ] You're logged in to the platform
- [ ] Access token is present (check console logs)
- [ ] You have catalog read permissions
- [ ] Network allows access to all instance URLs
- [ ] API keys for instances are valid

### Instance Connectivity

- [ ] Each instance URL is accessible
- [ ] Health endpoints return 200
- [ ] API keys authenticate successfully
- [ ] CORS allows your domain
- [ ] No firewall blocking connections

---

## 🆘 Still Having Issues?

### Collect Debug Information

1. **Browser Console Logs** - Copy all Template Manager logs
2. **Network Tab** - Export failed requests as HAR
3. **Catalog Query** - Run queries above and save results
4. **Environment** - Check which env variables are set
5. **Browser** - Which browser/version?

### Get Help

1. **Check Documentation**:
   - `README.md` - Overview and setup
   - `ENV_SETUP.md` - Environment variable guide
   - `CATALOG_SETUP.md` - Catalog configuration
   - `CONFIGURATION_GUIDE.md` - Complete config reference

2. **Contact Support**:
   - Include debug information above
   - Describe what you're trying to do
   - Share error messages and console logs
   - Mention which troubleshooting steps you tried

---

## 💡 Quick Fixes

### Just Want To Test?

**The Template Manager works automatically!**

**What you get**:

- ✅ Current platform instance (auto-detected)
- ✅ Uses your access token
- ✅ No .env configuration needed

**To add more instances**:

1. Open Catalog Manager
2. Add entries to `FlowEngineInstances` catalog
3. Each entry needs proper `objectValue` structure
4. Refresh Template Manager

**Note**: No environment variables needed!

---

**Last Updated**: December 2025
**Version**: 1.0.0
