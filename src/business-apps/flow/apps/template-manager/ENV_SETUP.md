# Environment Variable Setup

## ⚠️ DEPRECATED - No Longer Needed

**This document is deprecated.** The Template Manager now uses `NEXT_PUBLIC_BASE_URL + "/flow-engine"` automatically.

**No environment variables needed!** See `PLATFORM_INTEGRATION.md` for current setup.

---

## ~~Quick Start~~ (Deprecated)

Add these variables to your project's `.env` file (in the project root):

```env
# Template Manager - Localhost Flow Engine Configuration

# Primary Localhost
VITE_FLOW_ENGINE_LOCAL_URL=http://localhost:3000
VITE_FLOW_ENGINE_LOCAL_API_KEY=dev-api-key
VITE_FLOW_ENGINE_LOCAL_ENABLED=true

# Secondary Localhost (optional - for testing when catalog unavailable)
VITE_FLOW_ENGINE_LOCAL2_URL=http://localhost:3001
VITE_FLOW_ENGINE_LOCAL2_API_KEY=dev-api-key-2
VITE_FLOW_ENGINE_LOCAL2_ENABLED=true
```

**Note**: The second localhost instance is useful when:

- You don't have catalog access yet (401 errors)
- You want to test locally without external instances
- You're running multiple custom-flow-engine instances for testing

## Variable Reference

### Primary Localhost

#### VITE_FLOW_ENGINE_LOCAL_URL

- **Type**: `string`
- **Default**: `http://localhost:3000`
- **Description**: Base URL of your local custom-flow-engine instance
- **Example**: `http://localhost:3000` or `http://127.0.0.1:3000`

#### VITE_FLOW_ENGINE_LOCAL_API_KEY

- **Type**: `string`
- **Default**: `dev-api-key`
- **Description**: API key for authenticating with your local instance
- **Security**: This is for development only. Never commit real API keys to git.
- **How to get**: Generate from your local custom-flow-engine admin panel

#### VITE_FLOW_ENGINE_LOCAL_ENABLED

- **Type**: `boolean` (as string)
- **Default**: `true`
- **Description**: Enable or disable the localhost instance
- **Values**:
  - `true` - Localhost instance appears in Template Manager
  - `false` - Localhost instance is hidden (catalog only)
- **Use case**: Set to `false` when you only want to work with remote instances

### Secondary Localhost (Optional)

#### VITE_FLOW_ENGINE_LOCAL2_URL

- **Type**: `string`
- **Default**: `http://localhost:3001`
- **Description**: Base URL of your second local custom-flow-engine instance
- **Use case**: Testing comparison between two local instances

#### VITE_FLOW_ENGINE_LOCAL2_API_KEY

- **Type**: `string`
- **Default**: `dev-api-key-2`
- **Description**: API key for second local instance
- **Use case**: Can be same as primary if both instances accept it

#### VITE_FLOW_ENGINE_LOCAL2_ENABLED

- **Type**: `boolean` (as string)
- **Default**: `true`
- **Description**: Enable or disable the second localhost instance
- **Use case**: Enable when you need 2 instances but don't have catalog access

## How It Works

1. **Auto-Detection**: When the Template Manager loads, it automatically reads these environment variables
2. **Localhost Instance**: Creates a "Localhost" instance with purple icon (🖥️)
3. **Merge with Catalog**: Combines localhost with any catalog entries (STAGING, PROD)
4. **No Catalog Required**: You can use the Template Manager with just localhost, no catalog setup needed!

## Benefits

- ✅ **Zero Configuration**: Works immediately with sensible defaults
- ✅ **No Catalog Setup**: No need to create catalog entries for development
- ✅ **Secure**: API keys stay in .env (gitignored)
- ✅ **Flexible**: Easy to enable/disable localhost
- ✅ **Developer-Friendly**: Each developer can use their own local instance

## Multi-Developer Setup

Each developer can have their own localhost configuration:

**Developer A**:

```env
VITE_FLOW_ENGINE_LOCAL_URL=http://localhost:3000
VITE_FLOW_ENGINE_LOCAL_API_KEY=alice-dev-key
```

**Developer B**:

```env
VITE_FLOW_ENGINE_LOCAL_URL=http://localhost:3001
VITE_FLOW_ENGINE_LOCAL_API_KEY=bob-dev-key
```

## Troubleshooting

### Localhost doesn't appear

- ✅ Check `.env` file exists in project root
- ✅ Verify variable names match exactly (case-sensitive)
- ✅ Restart dev server after changing .env
- ✅ Check `VITE_FLOW_ENGINE_LOCAL_ENABLED` is not `false`

### Connection fails

- ✅ Verify custom-flow-engine is running on the URL
- ✅ Check API key is correct
- ✅ Test URL in browser: `http://localhost:3000/api`
- ✅ Check CORS settings if needed

### Can't see templates

- ✅ Verify API key has template read permissions
- ✅ Check custom-flow-engine logs for authentication errors
- ✅ Test API directly: `curl http://localhost:3000/api/templates -H "Authorization: Bearer YOUR_KEY"`

## Production Deployment

**Important**: These environment variables are only for localhost/DEV.

For STAGING and PROD instances:

- ❌ Do NOT use environment variables
- ✅ Use the FlowEngineInstances catalog
- ✅ Store API keys encrypted in catalog metadata

This separation ensures production credentials never appear in code or environment files.

## Example .env File

```env
# =============================================================================
# Template Manager Configuration
# =============================================================================

# Localhost Flow Engine
VITE_FLOW_ENGINE_LOCAL_URL=http://localhost:3000
VITE_FLOW_ENGINE_LOCAL_API_KEY=my-local-dev-api-key-abc123
VITE_FLOW_ENGINE_LOCAL_ENABLED=true

# =============================================================================
# Other Application Configuration
# =============================================================================

# Add your other env variables below...
```

## Next Steps

1. ✅ Add variables to `.env`
2. ✅ Restart dev server
3. ✅ Open Template Manager
4. ✅ See "Localhost" instance in dropdown
5. ✅ Start comparing and syncing templates!

For external instances (STAGING/PROD), see `CATALOG_SETUP.md`.
