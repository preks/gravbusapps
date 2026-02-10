# Backend Fixes Required for Sandpack Preview

## Current Status

The frontend Sandpack integration is **mostly complete** but blocked by backend issues:

✅ **Fixed on Frontend:**

- CORS issues resolved (using local node_modules for private packages)
- `import.meta` compatibility handled
- Missing critical dependencies added as workaround (`antd`, `react`, `react-dom`)

❌ **Backend Issues Blocking Preview:**

### 1. Private Package Bundle Format is Incorrect

**Problem:**
The `@newwork/nw-design-system` bundle contains ESM imports to relative file paths that don't exist:

```javascript
// Current bundle format (WRONG):
import { Accordion as t, AccordionContent as a } from './components/accordion/Accordion.js'
import { Alert as m } from './components/alert/Alert.js'
// ... more imports to ./components/* files that don't exist in the bundle
```

**Error in Sandpack:**

```
DependencyNotFoundError: Could not find dependency: '@newwork/nw-design-system'
relative to '/node_modules/@newwork/nw-design-system/index.js'
```

**Required Fix:**
Bundle `@newwork/nw-design-system` as a **single self-contained file** with one of these formats:

#### Option A: UMD Format (Recommended)

```javascript
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? factory(exports)
    : typeof define === 'function' && define.amd
    ? define(['exports'], factory)
    : (global = global || self, factory(global.NwDesignSystem = {}));
}(this, function (exports) {
  'use strict';

  // All component code inlined here
  var Accordion = /*...*/;
  var Alert = /*...*/;

  exports.Accordion = Accordion;
  exports.Alert = Alert;
  // ...
}));
```

#### Option B: IIFE Format

```javascript
var NwDesignSystem = (function () {
  // All component code inlined here
  var Accordion = /*...*/;
  var Alert = /*...*/;

  return {
    Accordion: Accordion,
    Alert: Alert,
    // ...
  };
})();
```

**Vite Configuration Required:**

```javascript
// In your Vite config for private package bundling
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'NwDesignSystem',
      formats: ['umd'], // UMD format
      fileName: () => 'index.js'
    },
    rollupOptions: {
      // Inline ALL dependencies - no external references
      external: [],
      output: {
        // No code splitting - single file
        inlineDynamicImports: true,
        // Globals for React (if needed)
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
})
```

### 2. Missing Dependencies in package.json

**Problem:**
The `package.json` provided by backend is missing critical public dependencies like `antd`, `react`, `react-dom`.

**Current dependencies in backend response:**

```json
{
  "dependencies": {
    "@dnd-kit/core": "...",
    "@dnd-kit/sortable": "...",
    "@phosphor-icons/react": "...",
    "@radix-ui/react-accordion": "..."
    // ... only design system components, missing antd, react, etc.
  }
}
```

**Required Fix:**
Include ALL dependencies that are imported in the source code:

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "antd": "^5.0.0",
    "@dnd-kit/core": "...",
    "@dnd-kit/sortable": "..."
    // ... all other dependencies
  }
}
```

**Note:** The frontend currently has a workaround that auto-adds `antd`, `react`, and `react-dom`, but the backend should provide the complete dependency list.

## API Response Structure (Current)

```typescript
interface PreviewData {
  sourceFiles: Record<string, string> // All repository files
  privateDependencies: Record<
    string,
    {
      version: string
      bundle: string // ❌ Currently ESM with relative imports
    }
  >
}
```

## Testing the Fix

After fixing the bundle format, test with:

```bash
# Check the bundle content
curl http://your-backend/previews?repoId=xxx&sessionId=yyy | jq '.privateDependencies."@newwork/nw-design-system".bundle' | head -n 20
```

The output should:

- ✅ Start with `(function` (UMD) or `var` (IIFE)
- ✅ NOT contain `import ` or `from "`
- ✅ NOT contain relative paths like `./components/`
- ✅ Be completely self-contained

## Frontend Workarounds (Temporary)

The frontend currently implements these workarounds:

1. ✅ Replaces all `import.meta` usages with compatible alternatives
2. ✅ Removes private dependencies from `package.json`
3. ✅ Provides private dependencies as local `node_modules`
4. ✅ Auto-adds missing `antd`, `react`, `react-dom` to dependencies

These workarounds will remain until backend fixes are deployed.

## Priority

**HIGH** - Without correct bundle format, the preview cannot work at all.

## Questions?

Contact the frontend team for clarification or testing support.
