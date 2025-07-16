---
trigger: always_on
---

# Repository Dependencies and Component Library Integration

## Dependency Overview
This project (`gravity-business-apps`) depends on several published packages that are developed in sibling repositories within the same workspace:

**✅ MIGRATION ENABLED**: `@newwork/nw-design-system` is installed in package.json - migration rules apply!

### @newwork/gravity-ui-catalog (v7.10.4) - 🔄 MIGRATING AWAY
- **Source Repository**: `../gravity-ui-catalog/` (relative to workspace root)
- **Published Package**: `@newwork/gravity-ui-catalog` 
- **Purpose**: Legacy UI components, being replaced by nw-design-system
- **Import Pattern**: `import { ComponentName } from '@newwork/gravity-ui-catalog'`
- **Current Status**: ⚠️ **LEGACY** - Being phased out in favor of nw-design-system
- **Migration Target**: Components will be replaced with nw-design-system equivalents

### @newwork/nw-design-system (v0.0.1-50) - ✅ NEW PRIMARY UI LIBRARY
- **Source Repository**: `../nw-design-system/` (relative to workspace root)
- **Published Package**: `@newwork/nw-design-system`
- **Purpose**: Modern design system built with React, Tailwind CSS, and Shadcn UI components
- **Import Patterns**: 
  - Components: `import { Button, Card, Dialog } from '@newwork/nw-design-system'`
  - Styles: `import '@newwork/nw-design-system/style'`
  - Utils: `import { cn, debugLogger } from '@newwork/nw-design-system'`
- **Current Status**: 🚀 **PRIMARY** - New standard for all UI components

## Usage Patterns

### ✅ NEW PATTERN (Use This)
```typescript
import { Button, Card, Dialog, Form, Input } from '@newwork/nw-design-system';
import { cn } from '@newwork/nw-design-system';

const MyComponent: React.FC = () => (
  <Card className={cn("p-6", "shadow-lg")}>
    <Form>
      <Input placeholder="Enter text..." />
      <Button variant="primary">Submit</Button>
    </Form>
  </Card>
);
```

### ❌ LEGACY PATTERN (Migrate Away)
```typescript
// OLD - Don't use gravity-ui-catalog anymore
import { UiButton } from '@newwork/gravity-ui-catalog';

// NEW - Migrate to nw-design-system
import { Button } from '@newwork/nw-design-system';
```

## Local Development Workflow

### For nw-design-system changes:
1. In `nw-design-system`: Run `npm run publish:tarball`
2. In `gravity-business-apps`: Run `npm install @newwork/nw-design-system@latest`

### For gravity-ui-catalog (Avoid - Migrate Instead):
- **⚠️ Instead of updating gravity-ui-catalog, migrate to nw-design-system**

## Common Migration Examples

```typescript
// BEFORE (gravity-ui-catalog):
import { UiButton } from '@newwork/gravity-ui-catalog';
<UiButton size="large" variant="primary">Click</UiButton>

// AFTER (nw-design-system):
import { Button } from '@newwork/nw-design-system';
<Button size="lg" variant="default">Click</Button>
```

## Troubleshooting

### Component Issues:
- **Component not found**: Check `@newwork/nw-design-system` exports
- **Styling issues**: Ensure `tailwind.config.js` includes design system preset  
- **Import errors**: Always use `@newwork/nw-design-system`, never `@newwork/gravity-ui-catalog`

### Migration Priority:
1. **High**: Button, Input, Card, Dialog
2. **Medium**: Forms, data display
3. **Low**: Complex organisms (rebuild with primitives)
