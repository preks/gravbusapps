# Remote Component Loader

This module provides functionality to dynamically load React components from CDN in both development and production environments.

## Files

- **`remoteComponentLoader.ts`** - Main loader implementation with `loadRemoteComponent` and `exposeRequiredDependencies`
- **`remoteComponentTypes.ts`** - TypeScript interfaces and types
- **`remoteComponentProxy.ts`** - Import proxy for handling dynamic imports and error boundaries

## Purpose

This loader enables components loaded from CDN (like `every-box`) to dynamically load OTHER components from CDN. This was previously not possible due to module resolution issues.

## Exported Functions

### `loadRemoteComponent(options)`

Loads a remote component from CDN and registers it on the window object.

```typescript
import { loadRemoteComponent } from '@/common/loaders/remote-component-loader/remoteComponentLoader'

await loadRemoteComponent({
  componentPath: '/fin/expenses/forms/approve-expense-plan',
  componentName: 'ApproveExpensePlan',
  version: '1.0.0',
  componentCdnBase: 'https://nwcdndevfiles.blob.core.windows.net/screens',
  timeout: 5000 // optional, default 5000ms
})
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `componentPath` | string | No* | Path to component relative to CDN base |
| `componentUrl` | string | No* | Direct URL to component |
| `componentCdnBase` | string | No | Base URL for CDN |
| `componentName` | string | Yes | Name to register component under |
| `version` | string | No | Version for versioned URLs |
| `exposedLibraries` | ExposedLibrary[] | No | Additional libraries to expose |
| `timeout` | number | No | Loading timeout in ms (default: 5000) |
| `cacheKey` | string | No | Custom cache key for component isolation (defaults to componentName) |

\*Either `componentPath` or `componentUrl` must be provided.

### Component Isolation with cacheKey

Use `cacheKey` when you need to load the same component multiple times with different data:

```typescript
// Without cacheKey - all instances share same window[componentName]
await loadRemoteComponent({
  componentPath: '/fin/expenses/forms/approve-expense-plan',
  componentName: 'ApproveExpensePlan'
})

// With cacheKey - each instance gets isolated registration
await loadRemoteComponent({
  componentPath: '/fin/expenses/forms/approve-expense-plan',
  componentName: 'ApproveExpensePlan',
  cacheKey: `ApproveExpensePlan-task-${taskId}` // Unique per task
})

// Access with cacheKey
const Component = (window as any)['ApproveExpensePlan-task-123']
```

### `exposeRequiredDependencies()`

Exposes all required libraries to the window object for remote component usage.

```typescript
import { exposeRequiredDependencies } from '@/common/loaders/remote-component-loader/remoteComponentLoader'

// Call once on mount before loading any remote components
exposeRequiredDependencies()
```

### `constructComponentUrl(path, baseUrl?, version?)`

Constructs a full CDN URL from a component path.

```typescript
import { constructComponentUrl } from '@/common/loaders/remote-component-loader/remoteComponentLoader'

const url = constructComponentUrl(
  '/fin/expenses/forms/approve-expense-plan',
  'https://nwcdndevfiles.blob.core.windows.net/screens',
  '1.0.0'
)
// Returns: https://nwcdndevfiles.blob.core.windows.net/screens/fin/expenses/forms/approve-expense-plan/index-1.0.0.js?t=...
```

### `injectImportProxy()`

Injects proxy for React createElement and module.exports handling. Called automatically by `loadRemoteComponent`.

```typescript
import { injectImportProxy } from '@/common/loaders/remote-component-loader/remoteComponentProxy'
```

## Exposed Libraries

The following libraries are automatically exposed to remote components via `window.require`:

| Library                            | Window Property                       |
| ---------------------------------- | ------------------------------------- |
| `react`                            | `window.React`                        |
| `react-dom`                        | `window.ReactDOM`                     |
| `react/jsx-runtime`                | `window.ReactJSXRuntime`              |
| `react/jsx-dev-runtime`            | `window.ReactJSXDevRuntime`           |
| `antd`                             | `window.antd`                         |
| `@ant-design/icons`                | `window.antDesignIcons`               |
| `@dnd-kit/core`                    | `window.DNDKitCore`                   |
| `@dnd-kit/utilities`               | `window.DNDKitUtilities`              |
| `@dnd-kit/sortable`                | `window.DNDKitSortable`               |
| `zustand`                          | `window.zustand`                      |
| `clsx`                             | `window.clsx`                         |
| `tailwind-merge`                   | `window.tailwindMerge`                |
| `react-icons`                      | `window.reactIcons`                   |
| `react-icons/pi`                   | `window.reactIconsPi`                 |
| `react-i18next`                    | `window.reactI18Next`                 |
| `@newwork/gravity-ui-catalog`      | `window.GravityUICatalog`             |
| `@remixicon/react`                 | `window.remixIconReact`               |
| `class-variance-authority`         | `window.classVarianceAuthority`       |
| `lucide-react`                     | `window.lucideReact`                  |
| `@/common/utils/processEventUtils` | `window.dispatchProcessContinueEvent` |

## TypeScript Types

```typescript
import {
  RemoteComponentLoaderOptions,
  RemoteComponentProps,
  RemoteWindowExtensions,
  ExposedLibrary,
  UserInfoProps
} from '@/common/loaders/remote-component-loader/remoteComponentTypes'
```

## Usage Example

```typescript
import { loadRemoteComponent, exposeRequiredDependencies } from '@/common/loaders/remote-component-loader/remoteComponentLoader'

// 1. Expose dependencies once on mount
useEffect(() => {
  exposeRequiredDependencies()
}, [])

// 2. Load component from CDN
useEffect(() => {
  const loadComponent = async () => {
    await loadRemoteComponent({
      componentPath: '/fin/expenses/forms/approve-expense-plan',
      componentName: 'ApproveExpensePlan',
      version: '1.0.0',
      componentCdnBase: 'https://nwcdndevfiles.blob.core.windows.net/screens'
    })

    // 3. Get loaded component from window
    const LoadedComponent = (window as any)['ApproveExpensePlan']
    setComponent(() => LoadedComponent)
  }

  loadComponent()
}, [componentPath])

// 4. Render the component
return <LoadedComponent {...props} />
```

## How It Works

### 1. Dependency Exposure

`exposeRequiredDependencies()` makes all required libraries available on the `window` object.

### 2. Import Proxy

`injectImportProxy()` sets up:

- A custom `window.require` function to resolve dependencies
- A `module.exports` handler to capture component exports
- A safe `React.createElement` proxy that shows errors for missing components

### 3. Component Loading

1. Cleans up any existing scripts for the component
2. Creates and loads a `<script>` tag with the component URL
3. Captures exports via `module.exports` handler
4. Registers component on `window[componentName]`
5. Resolves when component is registered (or rejects on timeout/error)

## Error Handling

- **Missing components**: The React proxy shows a visible error boundary
- **Load failures**: Promise rejects with descriptive error
- **Timeout**: Configurable timeout (default 5000ms) with clear error message
- **Unhandled requires**: Logs warning and returns empty object

## Related Files

- **`every-box/components/RemoteScreenLoader.tsx`** - Main consumer of this loader
- **`every-box/components/TaskDetailDialog.tsx`** - Orchestrates screen loading

## Source

This loader was migrated from `gravity-platform/src/loaders/remote-component-loader/` to enable CDN-to-CDN component loading in business apps.

## Important Notes

1. **Dependency Exposure Must Come First**: Always call `exposeRequiredDependencies()` before loading any components
2. **Component Names**: Must match exactly between `componentName` parameter and what's exported
3. **CDN Base URL**: Can be configured for dev/prod environments
4. **Publishing**: Components must be published to CDN with `npm run publish:screen` to be loadable

## Testing

To test locally:

```bash
npm run dev
# Visit http://localhost:3001/?app=platform/apps/every-box
# Click on any task to load a native screen
```

To test in production:

```bash
npm run build:prod
npm run publish:screen platform/apps/every-box
# Visit https://newwork-dev.newwork.com/platform/apps/every-box
```
