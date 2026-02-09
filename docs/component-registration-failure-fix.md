# Component Registration Failure Fix

## Issue Summary

When publishing a screen from the AI Builder, the build and upload succeed, but the screen appears white with console errors:

```
Component not registered via standard exports pattern, checking fallbacks...
Failed to find a suitable component to register
Component 'absence-report' registration failed: Component not found
```

## Root Cause

The component files don't have the correct export pattern required by the platform's remote component loader. The loader expects **both** a default export and a named export in a specific format.

## The Correct Export Pattern

### Component File (e.g., `AbsenceReport.tsx`)

At the **end of the file**, after the component definition, add **both exports**:

```typescript
// At the END of AbsenceReport.tsx
export default AbsenceReport // Default export FIRST
export { AbsenceReport } // Named export SECOND
```

### Index File (`index.ts`)

The index file must have **exactly 2 lines**, in this order:

```typescript
// index.ts - Exactly 2 lines
export { AbsenceReport } from './AbsenceReport' // Line 1: Named export
export { default } from './AbsenceReport' // Line 2: Default export
```

## Why Both Exports Are Required

1. **Default export**: The platform wrapper uses `import Component from './index'` to load the component
2. **Named export**: The component registration system uses the named export to validate the component type
3. **Missing either**: Causes "Component not registered" error → white screen

## Common Mistakes to Avoid

❌ **WRONG - Missing named export:**

```typescript
// index.ts
export { default } from './AbsenceReport' // Missing named export!
```

❌ **WRONG - Missing default export:**

```typescript
// index.ts
export { AbsenceReport } from './AbsenceReport' // Missing default export!
```

❌ **WRONG - Using 'as' syntax:**

```typescript
// index.ts
export { default as AbsenceReport } from './AbsenceReport' // Wrong syntax!
```

❌ **WRONG - Component file missing exports:**

```typescript
// AbsenceReport.tsx
const AbsenceReport: React.FC = () => { ... }
// Missing: export default AbsenceReport;
// Missing: export { AbsenceReport };
```

## How to Fix the Current Screen

Since the `absence-report` files were created in the AI Builder session and aren't in your local workspace, you have two options:

### Option 1: Rebuild in AI Builder (Recommended)

1. Go back to the AI Builder
2. Ask it to rebuild the absence report screen
3. The AI Builder now has updated instructions that enforce the correct export pattern
4. **Before publishing**, verify the exports match the pattern above
5. Publish the screen

### Option 2: Manual Fix (If you have the files)

If you saved the files locally:

1. Open `AbsenceReport.tsx`
2. Make sure the last two lines are:
   ```typescript
   export default AbsenceReport
   export { AbsenceReport }
   ```
3. Open `index.ts`
4. Replace the content with exactly these 2 lines:
   ```typescript
   export { AbsenceReport } from './AbsenceReport'
   export { default } from './AbsenceReport'
   ```
5. Publish again

## Verification Checklist

Before publishing any screen, verify:

- [ ] Component file ends with both exports (default first, then named)
- [ ] index.ts has exactly 2 export lines
- [ ] Component name matches in both files
- [ ] No other exports in index.ts

## What Changed in the AI Builder

I've updated the AI Builder's system prompt to:

1. **Make the export pattern more prominent** - It's now the first critical section
2. **Add explicit validation checklist** - Before publishing, the AI must verify exports
3. **Show the exact error symptoms** - So the AI knows what to look for
4. **Enforce two-line pattern** - No more ambiguity about single-line vs two-line exports
5. **Add mandatory validation** - The AI can't skip this step

## Testing the Fix

After rebuilding/fixing the screen:

1. Publish the screen
2. Open it in the platform
3. Check the browser console
4. You should see: `Loading remote component 'absence-report' from: ...`
5. Then: `Component 'absence-report' successfully registered`
6. The screen should render with no errors

## Example of a Working Screen

For reference, the `team-members-report` screen has the correct pattern:

**TeamMembersReport.tsx** (end of file):

```typescript
export default TeamMembersReport
export { TeamMembersReport }
```

**index.ts**:

```typescript
export { TeamMembersReport } from './TeamMembersReport'
export { default } from './TeamMembersReport'
```

## Summary

✅ **What was wrong:** Missing or incorrectly formatted component exports  
✅ **What was fixed:** AI Builder system prompt updated with mandatory validation  
✅ **What to do now:** Rebuild the screen in AI Builder or manually fix the exports  
✅ **How to prevent:** The AI Builder will now validate exports before publishing

The build succeeds because the TypeScript and Vite builds don't care about the export format - they just need valid TypeScript. But the **platform's runtime component loader** has specific requirements for how components are exported, and that's where the failure occurs.
