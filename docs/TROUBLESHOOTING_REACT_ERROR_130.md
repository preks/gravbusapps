# Troubleshooting React Error #130

## 🔍 Problem

When you publish a screen through AI Builder, it builds and uploads successfully, but when you open it in the NEWWORK platform, you see:

```
Error: Minified React error #130
```

## 🎯 What This Means

React error #130 means you're trying to **render an object** instead of a React component. This happens when:

1. ❌ Component is `undefined` (missing export)
2. ❌ Component is an object literal `{ something: ... }` instead of a function
3. ❌ Component returns an object instead of JSX

## 🏗️ Architecture: Why This is Hard to Debug

### Development vs Production

| Mode            | How It Works                                | Debugging                               |
| --------------- | ------------------------------------------- | --------------------------------------- |
| **Development** | Dynamic imports via `useDynamicScreen` hook | ✅ Virtual module loader with debugging |
| **Production**  | Pre-built bundle loaded from Azure          | ❌ No build-time validation (until now) |

```
Development Flow:
  User opens screen → Virtual loader imports → wrapWithUiCatalog → Render
  ✅ Logs show: "🔍 [wrapWithUiCatalog] Wrapping component: { componentType: 'function' }"

Production Flow:
  AI generates → FORGE builds → Upload to Azure → Platform loads → ERROR
  ❌ Build succeeds but runtime fails with Error #130
```

### Why Your Screen Published Successfully But Doesn't Work

The build process (`vite build`) **doesn't validate** that your default export is a valid React component:

1. ✅ Build succeeds if TypeScript is valid
2. ✅ Upload succeeds if files exist
3. ❌ Runtime fails if exports are wrong

## 🛠️ Solutions Added

### 1. **Production-Ready Debugging** (`wrapWithUiCatalog.tsx`)

**Now runs in BOTH development AND production:**

```typescript
export function wrapWithUiCatalog(Component) {
  // 🔍 Runs when screen loads (dev AND prod)
  console.log('🔍 [wrapWithUiCatalog] Wrapping component:', {
    componentType: typeof Component,
    isValidComponent: typeof Component === 'function',
    displayName: Component?.displayName || Component?.name,
    isProduction: import.meta.env.PROD
  })

  if (!Component) {
    console.error('❌ Component is undefined/null')
    console.error('🔧 Fix: export default YourComponent')
    throw new Error('Component is undefined or null - check default export')
  }
}
```

**What to check in browser console:**

```javascript
// ✅ Good - Component is a function
🔍 [wrapWithUiCatalog] Wrapping component: {
  componentType: 'function',
  displayName: 'TeamMembersReport'
}

// ❌ Bad - Component is undefined
❌ [wrapWithUiCatalog] Component is undefined/null
🔧 Fix: export default YourComponent

// ❌ Bad - Component is an object
🔍 [wrapWithUiCatalog] Wrapping component: {
  componentType: 'object'  // ← This causes error #130
}
```

### 2. **Error Boundary** (`ScreenErrorBoundary.tsx`)

Catches and displays errors beautifully instead of showing cryptic error #130:

- Shows full error message and stack trace
- Shows component tree where error occurred
- Provides debugging tips
- Links to console logs

### 3. **Pre-Publishing Validation** (`validate-screen-export.js`)

Run BEFORE publishing to catch issues:

```bash
node scripts/validate-screen-export.js src/business-apps/hr/reports/apps/team-members-report
```

**Checks:**

- ✅ `index.ts` exists and has default export
- ✅ Component file exists
- ✅ Component has `export default`
- ✅ Component is a function (not object)
- ❌ Detects anti-patterns

## 📋 Debugging Steps

### Step 1: Check Console When Screen Loads

After publishing, open the screen in NEWWORK platform and check browser console:

```javascript
// Filter by emoji
🔍   // All debug logs
❌   // Errors only

// Or filter by text
[wrapWithUiCatalog]  // Component wrapping logs
```

### Step 2: Analyze the Logs

**If you see:**

```javascript
❌ [wrapWithUiCatalog] Component is undefined/null
```

**Problem:** Missing default export
**Fix:** Add `export default YourComponent` to your component file

**If you see:**

```javascript
🔍 [wrapWithUiCatalog] Wrapping component: {
  componentType: 'object',
  keys: ['render', 'componentDidMount']
}
```

**Problem:** Exporting object instead of function
**Fix:** Export the component function directly:

```typescript
// ❌ Wrong
export default {
  render: () => <div>...</div>
}

// ✅ Correct
const MyComponent = () => <div>...</div>
export default MyComponent
```

### Step 3: Validate Exports Before Publishing

```bash
# Validate your screen structure
node scripts/validate-screen-export.js src/business-apps/<module>/<path-to-screen>

# If validation passes, publish
npm run publish:screen -- /<module>/<path-to-screen>
```

## ✅ Correct Export Pattern

### Component File (e.g., `TeamMembersReport.tsx`)

```typescript
import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PageLayout, DataDisplay, DataTable } from '@newwork/nw-design-system';

const TeamMembersReport: React.FC<BusinessAppContextProps> = (context) => {
  // Component logic...

  return (
    <PageLayout
      headerIcon={<Icon />}
      headerLabel="Team Members"
      contentContainer={
        <DataDisplay>
          <DataTable data={data} columns={columns} />
        </DataDisplay>
      }
    />
  );
};

// ✅ Default export
export default TeamMembersReport;
```

### Index File (`index.ts`)

```typescript
// ✅ Both exports (convention)
export { default as TeamMembersReport } from './TeamMembersReport'
export { default } from './TeamMembersReport'
```

## 🚫 Common Anti-Patterns

### 1. Exporting Object Instead of Function

```typescript
// ❌ WRONG - Will cause Error #130
export default {
  TeamMembersReport: () => <div>...</div>
}

// ✅ CORRECT
const TeamMembersReport = () => <div>...</div>
export default TeamMembersReport
```

### 2. Missing Return Statement

```typescript
// ❌ WRONG - Component returns undefined
const TeamMembersReport = () => {
  <div>...</div>  // Missing 'return'!
}

// ✅ CORRECT
const TeamMembersReport = () => {
  return <div>...</div>
}
```

### 3. Returning Object Instead of JSX

```typescript
// ❌ WRONG - Returns object, not JSX
const TeamMembersReport = () => {
  return { data: <div>...</div> }
}

// ✅ CORRECT
const TeamMembersReport = () => {
  return <div>...</div>
}
```

### 4. Missing Default Export

```typescript
// ❌ WRONG - Only named export
export const TeamMembersReport = () => <div>...</div>

// ✅ CORRECT - Add default export
const TeamMembersReport = () => <div>...</div>
export default TeamMembersReport
```

## 🔄 Complete Workflow

### Before Publishing

```bash
# 1. Validate exports
node scripts/validate-screen-export.js src/business-apps/hr/reports/apps/team-members-report

# Expected output:
✅ Found index.ts
✅ Has default export
✅ Has named export: TeamMembersReport
✅ Found component file: TeamMembersReport.tsx
✅ Component has default export
✅ Component appears to be a valid React component
✅ All validation checks passed!
```

### After Publishing

```bash
# 1. Open screen in NEWWORK platform
# 2. Open browser DevTools Console (F12)
# 3. Filter by: 🔍 or [wrapWithUiCatalog]

# Expected output (success):
🔍 [wrapWithUiCatalog] Wrapping component: {
  componentType: 'function',
  isValidComponent: true,
  displayName: 'TeamMembersReport',
  isProduction: true
}
🎬 [wrapWithUiCatalog] Rendering wrapped component: TeamMembersReport

# If you see error:
❌ [wrapWithUiCatalog] Component is undefined/null
🔧 Fix: export default YourComponent
```

## 🎯 Quick Fixes

| Symptom                       | Fix                                          |
| ----------------------------- | -------------------------------------------- |
| `Component is undefined`      | Add `export default YourComponent`           |
| `componentType: 'object'`     | Export function, not object                  |
| `Component returns undefined` | Add `return <JSX>` statement                 |
| Missing named export          | Add `export { default as Name }` to index.ts |

## 📞 Getting Help

When reporting issues, provide:

1. **Screen path** - e.g., `/hr/reports/team-members-report`
2. **Console logs** - Filter by 🔍 and ❌
3. **Validation output** - From `validate-screen-export.js`
4. **Component code** - Share the main component file and `index.ts`

This information helps quickly identify whether it's:

- Export structure issue (most common)
- Build process issue
- Component definition issue
- Import path issue

## 🎓 Understanding the Error

**React Error #130 Full Message:**

> Objects are not valid as a React child (found: object with keys {...}). If you meant to render a collection of children, use an array instead.

**What it actually means in this context:**

You're passing an **object** to React's render function instead of a **component function**. React expects:

```typescript
// ✅ Function (valid React component)
const Component = () => <div>Hello</div>

// ❌ Object (causes Error #130)
const NotAComponent = { render: () => <div>Hello</div> }
```

When you do `<Component />`, React calls the function. When you do `<NotAComponent />`, React tries to render the object itself, which fails.
