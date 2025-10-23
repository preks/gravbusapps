# Screen Debugging Guide

**Comprehensive debugging tools for troubleshooting screen loading and rendering issues in production**

---

## Overview

This guide covers the debugging features added to help identify and fix issues when screens fail to load or render in the NEWWORK platform, particularly React error #130 (invalid render object).

## Common Issue: React Error #130

**Error Message:**

```
Error: Minified React error #130
```

**What it means:**
You're trying to render an object instead of a React component. This usually happens when:

1. Component is `undefined` (import/export mismatch)
2. Component is an object literal instead of a function
3. Component returns an object instead of JSX

---

## Debugging Tools Added

### 1. Enhanced Console Logging

All screen loading and rendering now includes detailed console logs with emoji markers for easy filtering:

#### 🔍 Module Import Logs

When a screen is loaded, you'll see:

```javascript
🔍 [Dynamic Screen Loader] Module loaded for /hr/reports/team-members: {
  hasDefault: true,
  defaultType: "function",
  defaultValue: [Function],
  moduleKeys: ["default", "TeamMembersReport"],
  isFunction: true,
  isObject: false,
  displayName: "TeamMembersReport"
}
```

**What to check:**

- `hasDefault: true` ✅ (if false, missing default export)
- `defaultType: "function"` ✅ (if "object", component is defined wrong)
- `isFunction: true` ✅ (should be true for valid components)

#### 🎬 Component Wrapping Logs

```javascript
🔍 [wrapWithUiCatalog] Wrapping component: {
  componentType: "function",
  isValidComponent: true,
  displayName: "TeamMembersReport"
}

🎬 [wrapWithUiCatalog] Rendering wrapped component: TeamMembersReport
```

**What to check:**

- `componentType: "function"` ✅ (not "object" or "undefined")
- `isValidComponent: true` ✅

#### ❌ Error Logs

If something goes wrong:

```javascript
❌ [Dynamic Screen Loader] Invalid component type for /hr/reports/team-members: object
Component value: { render: [Function] }
```

This tells you exactly what was imported and why it's invalid.

### 2. Error Boundary Component

All screens are now automatically wrapped with `ScreenErrorBoundary` that:

- Catches React rendering errors
- Displays detailed error information
- Shows component stack traces
- Provides debugging tips

**What you'll see in the UI when an error occurs:**

```
⚠️ Screen Rendering Error

Screen: TeamMembersReport
Error: Objects are not valid as a React child

🔍 Error Details (Click to expand)
[Full error stack trace]

📋 Component Stack (Click to expand)
[Component hierarchy where error occurred]

💡 Debugging Tips:
• Check browser console for detailed logs with 🔍 emoji markers
• Look for "[wrapWithUiCatalog]" logs to see component wrapping
• Look for "[Dynamic Screen Loader]" logs to see import details
• Error #130 usually means rendering an object instead of JSX
• Check that your component has a valid default export
```

### 3. Pre-Publishing Validation Script

**Run before publishing to catch issues early:**

```bash
node scripts/validate-screen-export.js src/business-apps/hr/reports/apps/team-members-report
```

**What it checks:**

- ✅ Directory exists
- ✅ `index.ts` exists
- ✅ Has default export
- ✅ Component file exists
- ✅ Component has default export
- ✅ Component is a function (not object)
- ❌ Detects common anti-patterns

**Example output:**

```
🔍 Validating screen exports: src/business-apps/hr/reports/apps/team-members-report
✅ Found index.ts
✅ Has default export
✅ Has named export: TeamMembersReport
✅ Found component file: TeamMembersReport.tsx
✅ Component has default export
✅ Component appears to be a valid React component
✅ All validation checks passed!
```

---

## Debugging Workflow

### Step 1: Validate Before Publishing

```bash
# Validate your screen
node scripts/validate-screen-export.js src/business-apps/<module>/<app-path>

# If validation passes, publish
npm run publish:screen -- /<module>/<app-path>
```

### Step 2: Test in Platform

1. Open the screen in NEWWORK platform
2. Open browser DevTools Console
3. Filter by emoji or keywords:
   - 🔍 or "[Dynamic Screen Loader]" - Module import logs
   - 🎬 or "[wrapWithUiCatalog]" - Component wrapping logs
   - ❌ - Error logs

### Step 3: Analyze Console Output

#### ✅ Successful Load Pattern:

```javascript
[Dynamic Screen Loader] Loading screen: /hr/reports/team-members from ./src/...
🔍 [Dynamic Screen Loader] Module loaded for /hr/reports/team-members: {
  hasDefault: true,
  defaultType: "function",
  isFunction: true,
  displayName: "TeamMembersReport"
}
🔍 [wrapWithUiCatalog] Wrapping component: { componentType: "function" }
🎬 [wrapWithUiCatalog] Rendering wrapped component: TeamMembersReport
```

#### ❌ Failed Load Pattern (Missing Default Export):

```javascript
[Dynamic Screen Loader] Loading screen: /hr/reports/team-members from ./src/...
🔍 [Dynamic Screen Loader] Module loaded for /hr/reports/team-members: {
  hasDefault: false,  // ❌ Problem!
  moduleKeys: ["TeamMembersReport"]  // Named export only
}
❌ [Dynamic Screen Loader] No default export found
Available exports: TeamMembersReport
```

**Fix:** Add `export default` to your component file.

#### ❌ Failed Load Pattern (Wrong Export Type):

```javascript
🔍 [Dynamic Screen Loader] Module loaded for /hr/reports/team-members: {
  hasDefault: true,
  defaultType: "object",  // ❌ Problem!
  isFunction: false,
  defaultValue: { render: [Function] }
}
❌ [Dynamic Screen Loader] Invalid component type: object
```

**Fix:** Export the function directly, not an object containing the function.

---

## Common Issues and Solutions

### Issue 1: Missing Default Export

**Symptoms:**

```javascript
❌ No default export found
Available exports: ComponentName
```

**Fix:**

```typescript
// ❌ Wrong
export const TeamMembersReport = () => { ... }

// ✅ Correct
const TeamMembersReport = () => { ... }
export default TeamMembersReport
```

### Issue 2: Exporting Object Instead of Component

**Symptoms:**

```javascript
❌ Invalid component type: object
Component value: { render: [Function] }
```

**Fix:**

```typescript
// ❌ Wrong
export default {
  TeamMembersReport: () => <div>...</div>
}

// ✅ Correct
const TeamMembersReport = () => <div>...</div>
export default TeamMembersReport
```

### Issue 3: Component Returns Object Instead of JSX

**Symptoms:**

- React error #130
- Error boundary shows "Objects are not valid as a React child"

**Fix:**

```typescript
// ❌ Wrong
const TeamMembersReport = () => {
  return { data: <div>...</div> }
}

// ✅ Correct
const TeamMembersReport = () => {
  return <div>...</div>
}
```

### Issue 4: Missing Return Statement

**Symptoms:**

- Component renders nothing
- Console shows undefined component

**Fix:**

```typescript
// ❌ Wrong
const TeamMembersReport = () => {
  <div>...</div>  // Missing return!
}

// ✅ Correct
const TeamMembersReport = () => {
  return <div>...</div>
}
```

### Issue 5: index.ts Export Mismatch

**Symptoms:**

```javascript
❌ No default export found
```

**Fix:**

```typescript
// Both patterns work, but pick one:

// Pattern 1 (Recommended - Project Convention):
export { default as TeamMembersReport } from './TeamMembersReport'
export { default } from './TeamMembersReport'

// Pattern 2 (Also works):
export { TeamMembersReport } from './TeamMembersReport'
export { default } from './TeamMembersReport'
```

---

## Browser Console Filtering

Use these filters to find relevant logs quickly:

| Filter                    | Shows               |
| ------------------------- | ------------------- |
| `🔍`                      | All debug logs      |
| `❌`                      | All errors          |
| `🎬`                      | Component rendering |
| `[Dynamic Screen Loader]` | Module imports      |
| `[wrapWithUiCatalog]`     | Component wrapping  |
| `[ScreenErrorBoundary]`   | Caught errors       |

---

## Best Practices

### ✅ Correct Component Pattern

```typescript
// ComponentName.tsx
import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PageLayout, DataDisplay, DataTable } from '@newwork/nw-design-system';

const ComponentName: React.FC<BusinessAppContextProps> = (context) => {
  return (
    <PageLayout
      headerIcon={<Icon />}
      headerLabel="My Screen"
      contentContainer={
        <DataDisplay>
          <DataTable data={data} columns={columns} />
        </DataDisplay>
      }
    />
  );
};

export default ComponentName;
```

```typescript
// index.ts
export { default as ComponentName } from './ComponentName'
export { default } from './ComponentName'
```

### ✅ Validation Checklist

Before publishing a screen, verify:

- [ ] Component is defined as a function or `React.FC`
- [ ] Component returns JSX (not an object)
- [ ] Component has `export default ComponentName`
- [ ] `index.ts` has both default and named exports
- [ ] Validation script passes
- [ ] Works in local development
- [ ] Browser console shows ✅ logs (no ❌ errors)

---

## Getting Help

When reporting issues, include:

1. **Screen path** - e.g., `/hr/reports/team-members-report`
2. **Console logs** - Filter by 🔍 and ❌ emojis
3. **Error boundary output** - Copy the full error message
4. **Validation output** - Run validation script and share results
5. **Component code** - Share the component file and `index.ts`

This information will help quickly identify and fix the issue.
