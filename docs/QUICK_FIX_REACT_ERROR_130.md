# Quick Fix: React Error #130 in Published Screens

## The Problem

Screen publishes successfully but shows **React Error #130** when loaded in NEWWORK platform.

## The Solution (3 Steps)

### 1️⃣ Before Publishing - Validate

```bash
node scripts/validate-screen-export.js src/business-apps/hr/reports/apps/team-members-report
```

**Look for:**

```
✅ Component has default export
✅ Component appears to be a valid React component
```

### 2️⃣ After Publishing - Check Console

1. Open screen in NEWWORK platform
2. Press F12 (DevTools)
3. Look for these logs:

**✅ Success:**

```javascript
🔍 [wrapWithUiCatalog] Wrapping component: {
  componentType: 'function',
  displayName: 'YourScreen'
}
```

**❌ Problem:**

```javascript
❌ [wrapWithUiCatalog] Component is undefined/null
🔧 Fix: export default YourComponent
```

### 3️⃣ Fix Your Exports

**Component File:**

```typescript
const YourScreen = () => {
  return <div>...</div>  // ← Must return JSX
}

export default YourScreen  // ← Must have this
```

**Index File:**

```typescript
export { default as YourScreen } from './YourScreen'
export { default } from './YourScreen'
```

## Common Mistakes

| Mistake                         | Fix                                |
| ------------------------------- | ---------------------------------- |
| No `export default`             | Add `export default ComponentName` |
| Export object `{ render: ... }` | Export function directly           |
| Missing `return` statement      | Add `return <JSX>`                 |
| Only named export               | Add default export too             |

## Full Documentation

- **Complete Guide:** `docs/TROUBLESHOOTING_REACT_ERROR_130.md`
- **Technical Details:** `docs/DEBUGGING_SOLUTION_SUMMARY.md`
- **Tool Reference:** `docs/screen-debugging-guide.md`

## Quick Test

```bash
# 1. Validate
node scripts/validate-screen-export.js src/business-apps/<path>

# 2. Publish
npm run publish:screen -- /<path>

# 3. Open in platform & check console (F12)
#    Filter by: 🔍 or [wrapWithUiCatalog]
```

That's it! 🎉
