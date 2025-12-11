# Template Manager Configuration Guide

## Overview

The Template Manager supports **two configuration methods** to maximize flexibility:

| Method                    | Use Case      | Configuration   | Required         |
| ------------------------- | ------------- | --------------- | ---------------- |
| **Environment Variables** | Localhost/DEV | `.env` file     | ✅ Yes (for dev) |
| **Catalog Entries**       | STAGING/PROD  | Catalog Manager | ⚠️ Optional      |

---

## 🚀 Method 1: Environment Variables (Localhost)

**Best for**: Local development, testing, personal instances

### Setup (30 seconds)

1. **Create/Edit `.env` file** in project root:

```env
# Template Manager - Localhost Configuration
VITE_FLOW_ENGINE_LOCAL_URL=http://localhost:3000
VITE_FLOW_ENGINE_LOCAL_API_KEY=your-dev-api-key
VITE_FLOW_ENGINE_LOCAL_ENABLED=true
```

2. **Restart dev server**

3. **Done!** Localhost appears as "Localhost 🖥️" in Template Manager

### Environment Variables

| Variable                         | Default                 | Description                |
| -------------------------------- | ----------------------- | -------------------------- |
| `VITE_FLOW_ENGINE_LOCAL_URL`     | `http://localhost:3000` | Your local flow engine URL |
| `VITE_FLOW_ENGINE_LOCAL_API_KEY` | `dev-api-key`           | API key for local instance |
| `VITE_FLOW_ENGINE_LOCAL_ENABLED` | `true`                  | Enable/disable localhost   |

### Benefits

- ✅ **Zero catalog setup** - Works immediately
- ✅ **Per-developer config** - Each dev has their own settings
- ✅ **Secure** - Keys in .env (gitignored)
- ✅ **Fast** - No catalog API calls needed
- ✅ **Flexible** - Easy to enable/disable

### Example Scenarios

**Scenario 1: Standard localhost**

```env
VITE_FLOW_ENGINE_LOCAL_URL=http://localhost:3000
VITE_FLOW_ENGINE_LOCAL_API_KEY=my-dev-key-123
```

**Scenario 2: Custom port**

```env
VITE_FLOW_ENGINE_LOCAL_URL=http://localhost:3001
VITE_FLOW_ENGINE_LOCAL_API_KEY=my-dev-key-123
```

**Scenario 3: Remote dev server**

```env
VITE_FLOW_ENGINE_LOCAL_URL=http://dev-server.local:3000
VITE_FLOW_ENGINE_LOCAL_API_KEY=remote-dev-key
```

**Scenario 4: Disable localhost (catalog only)**

```env
VITE_FLOW_ENGINE_LOCAL_ENABLED=false
```

---

## 📋 Method 2: Catalog Entries (External Instances)

**Best for**: Shared environments (STAGING, PROD), team-wide access

### Setup

1. **Open Catalog Manager**

2. **Create Catalog**:
   - Identifier: `FlowEngineInstances`
   - Version: `v1`

3. **Add Entries** (one per external instance):

#### Staging Entry

```json
{
  "id": "instance:flow:staging",
  "name": "Staging",
  "code": "STAGING",
  "metadata": {
    "baseUrl": "https://staging-flow.newwork.com",
    "apiKey": "staging-api-key-encrypted",
    "environment": "STAGING",
    "color": "#f59e0b",
    "icon": "🧪",
    "description": "Pre-production testing",
    "order": 2
  }
}
```

#### Production Entry

```json
{
  "id": "instance:flow:prod",
  "name": "Production",
  "code": "PROD",
  "metadata": {
    "baseUrl": "https://flow.newwork.com",
    "apiKey": "prod-api-key-encrypted",
    "environment": "PROD",
    "color": "#10b981",
    "icon": "🚀",
    "description": "Live production",
    "order": 3
  }
}
```

### Benefits

- ✅ **Centralized** - One config for all users
- ✅ **Secure** - Encrypted in catalog metadata
- ✅ **Auditable** - Changes tracked in catalog
- ✅ **Team-wide** - Everyone uses same instances
- ✅ **Production-ready** - Proper credential management

---

## 🎯 Recommended Setup

### For Development Teams

**Localhost (per developer)**:

```env
# Each developer's .env
VITE_FLOW_ENGINE_LOCAL_URL=http://localhost:3000
VITE_FLOW_ENGINE_LOCAL_API_KEY=<personal-dev-key>
```

**Shared Environments (catalog)**:

- ✅ STAGING entry in catalog
- ✅ PROD entry in catalog

### For Solo Developers

**Minimal setup** (localhost only):

```env
# .env
VITE_FLOW_ENGINE_LOCAL_URL=http://localhost:3000
VITE_FLOW_ENGINE_LOCAL_API_KEY=dev-key
```

No catalog needed until you need external instances!

---

## 🔄 How They Work Together

The Template Manager **merges** both configuration sources:

```
Template Manager Instances
│
├─ Localhost (from .env)          ← Order: 0
│  └─ 🖥️ Localhost (Purple)
│
└─ External (from catalog)        ← Order: 1, 2, 3...
   ├─ 🧪 Staging (Orange)
   └─ 🚀 Production (Green)
```

**Loading Order**:

1. Read `.env` variables → Create localhost instance
2. Fetch catalog entries → Add external instances
3. Sort by `order` field → Display in dropdown

**Fallback Behavior**:

- If catalog doesn't exist → Only localhost shown
- If localhost disabled → Only catalog instances shown
- If both empty → Error message displayed

---

## 🔧 Configuration Comparison

| Feature         | Environment Variables | Catalog Entries    |
| --------------- | --------------------- | ------------------ |
| **Setup Time**  | 30 seconds            | 5 minutes          |
| **Scope**       | Per developer         | Team-wide          |
| **Security**    | .env (gitignored)     | Encrypted metadata |
| **Updates**     | Edit .env, restart    | Update catalog     |
| **Use Case**    | Localhost/DEV         | STAGING/PROD       |
| **Required**    | Yes (for dev)         | Optional           |
| **Credentials** | Local only            | Shared (encrypted) |

---

## 📝 Configuration Checklist

### Minimum Setup (Localhost Only)

- [ ] Add 3 env variables to `.env`
- [ ] Restart dev server
- [ ] Verify localhost appears in dropdown
- [ ] Test connection (health indicator)

### Full Setup (Localhost + External)

- [ ] Configure localhost (above)
- [ ] Create FlowEngineInstances catalog
- [ ] Add STAGING entry
- [ ] Add PROD entry (optional)
- [ ] Verify all instances appear
- [ ] Test connections for all

---

## 🐛 Troubleshooting

### Localhost doesn't appear

1. Check `.env` file exists in project root
2. Verify variable names match exactly
3. Restart dev server
4. Check `VITE_FLOW_ENGINE_LOCAL_ENABLED` is not `false`

### Catalog instances don't appear

1. Verify catalog exists: `FlowEngineInstances` v1
2. Check catalog entries have all required metadata
3. Verify API key in metadata
4. Check network access to instance URLs

### Connection fails

1. Verify instance is running
2. Test URL in browser: `{baseUrl}/api`
3. Check API key is correct
4. Verify CORS settings if needed

---

## 🔐 Security Best Practices

### Development

- ✅ Use `.env` for localhost API keys
- ✅ Add `.env` to `.gitignore`
- ✅ Use weak keys for local dev (not production keys!)
- ✅ Rotate keys regularly

### Production

- ✅ Store keys encrypted in catalog metadata
- ✅ Use environment-specific keys
- ✅ Implement key rotation policy
- ✅ Audit sync operations
- ❌ Never commit production keys to git
- ❌ Never use production keys in .env

---

## 📚 Related Documentation

- `ENV_SETUP.md` - Detailed environment variable guide
- `CATALOG_SETUP.md` - Detailed catalog configuration guide
- `README.md` - Application overview and features
- `VERIFICATION.md` - Code quality and testing

---

## 💡 Quick Reference

**Start with localhost only**:

```bash
# Add to .env
echo "VITE_FLOW_ENGINE_LOCAL_URL=http://localhost:3000" >> .env
echo "VITE_FLOW_ENGINE_LOCAL_API_KEY=dev-key" >> .env
echo "VITE_FLOW_ENGINE_LOCAL_ENABLED=true" >> .env

# Restart
npm run dev
```

**Add external instances later** when needed via Catalog Manager.

---

_This hybrid approach gives you the best of both worlds: fast local development and secure production configuration!_
