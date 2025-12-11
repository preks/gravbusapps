# FlowEngineInstances Catalog Setup

## 🎯 Zero Configuration!

The Template Manager **automatically detects your current platform** - no setup needed!

**Current Platform Instance**:

- ✅ Auto-detected from `NEXT_PUBLIC_BASE_URL + "/flow-engine"`
- ✅ Uses your access token automatically
- ✅ Shows as "Current (DEV/STAGING/PROD)" in UI
- ✅ **No .env variables needed!**
- ✅ **No catalog entry needed!**

---

## 📋 When Do You Need This Guide?

**You DON'T need catalog setup if:**

- ✅ You only want to work within your current environment
- ✅ You're testing the Template Manager
- ✅ You want to see templates in your current instance

**You DO need catalog setup if:**

- ⚠️ You want to compare templates across different environments
- ⚠️ You need to sync templates from DEV → STAGING → PROD
- ⚠️ You want to access remote flow-engine instances

---

## 📊 How It Works

### Instance Loading Order

```
Template Manager Starts
    ↓
1. Current Platform (AUTO)
   - URL: {NEXT_PUBLIC_BASE_URL}/flow-engine
   - Auth: Your access token
   - Order: 0 (always first)
    ↓
2. External Instances (FROM CATALOG)
   - URL: From catalog metadata.baseUrl
   - Auth: From catalog metadata.apiKey
   - Order: From catalog displayOrder
    ↓
Display All Instances (sorted by order)
```

### Example Result

```
Instance Dropdown:
├─ 💻 Current (DEV)    ← Auto (order: 0)
├─ 🧪 STAGING          ← Catalog (order: 1)
├─ 🚀 PROD             ← Catalog (order: 2)
└─ 🔧 GRV              ← Catalog (order: 3)
```

---

## 🏗️ Catalog Structure

### Catalog Properties

| Property               | Value                                |
| ---------------------- | ------------------------------------ |
| **Catalog Identifier** | `FlowEngineInstances`                |
| **Version**            | `v1`                                 |
| **Purpose**            | Store external flow-engine instances |
| **Access**             | Via GraphQL (not REST API)           |

### Entry Structure

Each catalog entry represents one external flow-engine instance:

| Field            | Location | Description                         | Example                          |
| ---------------- | -------- | ----------------------------------- | -------------------------------- |
| **id**           | Entry    | Unique identifier                   | `FlowEngineInstances:v1:STAGING` |
| **code**         | Entry    | Instance name (shown in UI)         | `STAGING`                        |
| **description**  | Entry    | Human-readable description          | `Pre-production environment`     |
| **displayOrder** | Entry    | Sort order (higher = lower in list) | `1`, `2`, `3`                    |
| **objectValue**  | Entry    | Metadata (see below)                | JSON object                      |

### objectValue Structure

The `objectValue` field contains connection details:

```json
{
  "baseUrl": "https://...",
  "apiKey": "...",
  "environment": "STAGING | PROD | ...",
  "color": "#hex",
  "icon": "emoji",
  "order": 1
}
```

| Field         | Type   | Description                | Example                            |
| ------------- | ------ | -------------------------- | ---------------------------------- |
| `baseUrl`     | string | Flow-engine API URL        | `https://staging-flow.newwork.com` |
| `apiKey`      | string | API key for authentication | `staging-api-key-12345`            |
| `environment` | string | Environment type           | `STAGING`, `PROD`                  |
| `color`       | string | Hex color for UI           | `#f59e0b` (orange)                 |
| `icon`        | string | Emoji icon                 | `🧪`, `🚀`                         |
| `order`       | number | Sort order (optional)      | `1`, `2`, `3`                      |

---

## 📝 Creating Catalog Entries

### Method 1: Catalog Manager UI (Recommended)

1. **Open Catalog Manager**
2. **Find Catalog**: Search for `FlowEngineInstances`
3. **Add Entry**:
   - Code: `STAGING`
   - Description: `Pre-production testing environment`
   - Display Order: `1`
   - Object Value: (see examples below)

### Method 2: GraphQL Mutation

```graphql
mutation CreateFlowEngineInstance {
  insert_CatalogEntry_one(
    object: {
      catalogId: "FlowEngineInstances:v1"
      code: "STAGING"
      description: "Pre-production testing environment"
      displayOrder: 1
      objectValue: {
        baseUrl: "https://staging-flow.newwork.com"
        apiKey: "your-staging-api-key"
        environment: "STAGING"
        color: "#f59e0b"
        icon: "🧪"
        order: 1
      }
    }
  ) {
    id
    code
  }
}
```

---

## 📋 Example Catalog Entries

### Entry 1: STAGING Environment

**Entry Fields**:

```
Code: STAGING
Description: Pre-production testing environment
Display Order: 1
```

**objectValue**:

```json
{
  "baseUrl": "https://staging-flow.newwork.com",
  "apiKey": "staging-api-key-abc123",
  "environment": "STAGING",
  "color": "#f59e0b",
  "icon": "🧪",
  "order": 1
}
```

**Visual Result**:

```
🧪 STAGING
   Pre-production testing environment
   [Orange badge]
```

---

### Entry 2: PROD Environment

**Entry Fields**:

```
Code: PROD
Description: Live production environment
Display Order: 2
```

**objectValue**:

```json
{
  "baseUrl": "https://flow.newwork.com",
  "apiKey": "prod-api-key-xyz789",
  "environment": "PROD",
  "color": "#10b981",
  "icon": "🚀",
  "order": 2
}
```

**Visual Result**:

```
🚀 PROD
   Live production environment
   [Green badge]
```

---

### Entry 3: Custom Environment (GRV)

**Entry Fields**:

```
Code: GRV
Description: Gravity staging tenant
Display Order: 3
```

**objectValue**:

```json
{
  "baseUrl": "https://grv-flow.newwork.com",
  "apiKey": "grv-api-key-def456",
  "environment": "STAGING",
  "color": "#8b5cf6",
  "icon": "🔧",
  "order": 3
}
```

**Visual Result**:

```
🔧 GRV
   Gravity staging tenant
   [Purple badge]
```

---

## 🎨 Color Reference

Recommended colors for different environments:

| Environment   | Color  | Hex       | Visual |
| ------------- | ------ | --------- | ------ |
| Current (DEV) | Blue   | `#3b82f6` | 💻     |
| STAGING       | Orange | `#f59e0b` | 🧪     |
| PROD          | Green  | `#10b981` | 🚀     |
| Custom        | Purple | `#8b5cf6` | 🔧     |
| Generic       | Grey   | `#666666` | 🌐     |

---

## 🔐 API Key Security

### Generating API Keys

1. **Access the target flow-engine instance**
2. **Generate API key** with template read/write permissions
3. **Copy the key** - you won't see it again!
4. **Store in catalog** `objectValue.apiKey`

### Security Best Practices

- ✅ Use separate API keys for each environment
- ✅ Store keys in catalog (encrypted at rest)
- ✅ Rotate keys regularly
- ✅ Use minimum required permissions
- ✅ Never commit keys to git
- ❌ Don't share keys between environments
- ❌ Don't use production keys in development

### Key Permissions Required

Each API key needs:

- ✅ `template:read` - Fetch template lists
- ✅ `template:write` - Create/update templates
- ✅ `workflow:read` - Check active workflows (optional)

---

## ✅ Verification Checklist

### After Creating Catalog Entries

1. **Refresh Template Manager** (Ctrl+Shift+R)
2. **Check Console** for:
   ```
   Loaded X instances from catalog via GraphQL
   Total Y flow engine instances available
   ```
3. **Verify Instance Dropdown** shows:
   - Current platform (first)
   - All catalog instances (sorted by displayOrder)
4. **Check Instance Health**:
   - Green badge = connection successful
   - Red badge = connection failed

### Troubleshooting

**If instances don't appear**:

1. Check console for GraphQL errors
2. Verify catalog identifier: `FlowEngineInstances`
3. Verify catalog version: `v1`
4. Check `isDeleted: false` on entries
5. Ensure your token hasn't expired (refresh page)

**If health checks fail**:

1. Verify `baseUrl` is correct
2. Test URL manually: `{baseUrl}/api`
3. Check `apiKey` is valid
4. Verify network connectivity
5. Check CORS settings on target instance

---

## 📊 Configuration Summary

| Component                 | Configuration      | Required                    |
| ------------------------- | ------------------ | --------------------------- |
| **Current Platform**      | ✅ Auto-detected   | **No setup needed!**        |
| **External Instances**    | ⚠️ Catalog entries | Optional (for multi-env)    |
| **Environment Variables** | ❌ Not used        | **None needed!**            |
| **API Keys**              | 🔐 In catalog      | Only for external instances |

---

## 🚀 Quick Start Guide

### Scenario 1: Single Environment (No Catalog Needed)

**Goal**: Compare templates within your current environment

**Setup**: None! Just launch Template Manager

**Result**: One instance available (current platform)

**Note**: You need 2+ instances to compare

---

### Scenario 2: Multi-Environment (Catalog Required)

**Goal**: Compare/sync templates across DEV → STAGING → PROD

**Setup**:

1. Open Catalog Manager
2. Create `FlowEngineInstances` catalog (v1)
3. Add entry for STAGING (see example above)
4. Add entry for PROD (see example above)
5. Refresh Template Manager

**Result**: 3+ instances available

- Current (DEV) - Auto
- STAGING - Catalog
- PROD - Catalog

**Ready**: Start comparing! 🎉

---

## 📚 Additional Resources

- **Platform Integration**: See `PLATFORM_INTEGRATION.md`
- **Troubleshooting**: See `TROUBLESHOOTING.md`
- **GraphQL Details**: See `GRAPHQL_MIGRATION.md`
- **Architecture**: See `FINAL_ARCHITECTURE.md`

---

## ❓ FAQ

### Do I need a .env file?

**No!** The Template Manager works without any .env configuration.

### Do I need a catalog entry for localhost?

**No!** The current platform is auto-detected.

### Do I need a catalog entry for my current environment?

**No!** Whether you're on DEV, STAGING, or PROD, the Template Manager automatically detects it.

### When do I need catalog entries?

Only when you want to **access external instances** (other environments or remote servers).

### Can I use the Template Manager without any catalog?

**Yes!** You'll see one instance (your current platform). To compare templates, you need 2+ instances, which means adding catalog entries.

### Where are the VITE environment variables?

They were removed! The new architecture doesn't need them. Everything is automatic.

### How do I add a second localhost for testing?

You don't need to. The Template Manager is designed for comparing different environments, not multiple local instances. Use the catalog to add your STAGING/PROD instances.

---

## 🎯 Summary

**Current Platform (Your Environment)**:

- ✅ Automatically detected
- ✅ No configuration needed
- ✅ Uses your access token
- ✅ Always available

**External Instances (Other Environments)**:

- ⚠️ Require catalog entries
- ⚠️ Need API keys in metadata
- ✅ Centrally managed
- ✅ Optional (only for multi-env workflows)

**No .env variables needed. No manual configuration. Just works!** ✨

---

_Last Updated: December 9, 2025_
_Architecture: Platform Auto-Detection + GraphQL Catalog_
