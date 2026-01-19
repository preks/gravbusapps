---
alwaysApply: true
---

# Repository Dependencies and Component Library Integration

## Dependency Overview

This project (`gravity-business-apps`) depends on several published packages that are developed in sibling repositories within the same workspace:

**✅ MIGRATION ENABLED**: `@newwork/nw-design-system` is installed in package.json - migration rules apply!

## ⚡ CRITICAL: MANDATORY MCP SERVER USAGE

**🚨 EVERY TIME `@newwork/nw-design-system` components are used, the AI Agent MUST ALWAYS use the MCP server!**

### Mandatory MCP Server Requirements:

- **Server**: `newwork-project-mcp` MUST be configured and active
- **When Required**: ANY time you work with `@newwork/nw-design-system` components
- **Tools Required**: `project-get-design-tokens`, `project-search-design-tokens`, `project-get-token-recommendations`
- **Purpose**: Ensures proper design token usage, prevents hardcoded values and Tailwind bypasses

### Automatic Detection Triggers:

The MCP server automatically detects and enforces design system compliance and makes sure that used components matches the design system implementation when you:

1. **Import from @newwork/nw-design-system**: Any component import triggers design token enforcement
2. **Mention component names**: LauncherLayout, Button, Card, Header, Layout, Page, Modal, Form, Input, Select
3. **Work with .tsx/.ts files**: All React component files in gravity-business-apps
4. **Use hardcoded values**: Detects and prevents #colors, hardcoded Tailwind colors, unprefixed classes, inline styles
5. **Reference design system**: Any mention of nw-design-system triggers token suggestions

### Expected AI Behavior with MCP:

```typescript
// ✅ CORRECT: AI agent with MCP server active
👤 "Add a Button component from nw-design-system"
🤖 Auto-detects: @newwork/nw-design-system usage
    Auto-triggers: project-get-design-tokens
    Auto-warns: "🎨 IMPORTANT: Use design tokens with gba: prefix!"
    Provides: className="gba:bg-primary gba:text-primary-foreground"

// ❌ INCORRECT: AI agent without MCP server
👤 "Add a Button component from nw-design-system"
🤖 Suggests: className="bg-blue-500 text-white px-4 py-2"
    Result: VIOLATES DESIGN SYSTEM - hardcoded Tailwind color classes
```

### Mandatory Anti-Pattern Prevention:

**The MCP server MUST prevent these violations:**

- ❌ Hardcoded colors: `#3b82f6`, `rgb(59,130,246)`, inline `style={{ backgroundColor: 'blue' }}`
- ❌ Hardcoded Tailwind color classes: `bg-blue-500`, `text-red-600`, `border-gray-400`
- ❌ Hardcoded spacing: `16px`, `24px`, inline `style={{ margin: '8px' }}`
- ❌ Unprefixed Tailwind classes: `p-4`, `m-6`, `flex`, `bg-primary` (missing `gba:` prefix)
- ❌ Hardcoded shadows: `box-shadow: 0 1px 3px rgba(0,0,0,0.12)`
- ❌ Arbitrary Tailwind values: `bg-[#fff]`, `text-[#000]`, `p-[16px]`

### Enforced Best Practices:

**The MCP server MUST enforce these patterns:**

- ✅ Design system tokens with gba: prefix: `gba:bg-primary`, `gba:text-primary-foreground`
- ✅ Semantic tokens: `gba:bg-success`, `gba:bg-destructive`, `gba:bg-warning`, `gba:bg-info`
- ✅ Combined tokens: `gba:bg-primary gba:text-primary-foreground`
- ✅ Variant modifiers: `gba:hover:bg-accent`, `gba:md:flex`, `gba:focus:ring-primary`
- ✅ Layout utilities: `gba:flex`, `gba:gap-4`, `gba:p-6`, `gba:rounded-lg`

**🔥 RULE ENFORCEMENT**: If the AI agent suggests hardcoded values, unprefixed Tailwind classes, or inline styles when working with design system components, the MCP server configuration is incorrect or inactive!

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

## Available Components and Exports

### nw-design-system exports (PRIMARY - Use These):

- **Shadcn UI Components**: `Button`, `Card`, `Dialog`, `Form`, `Input`, `Label`, `Select`, `Table`, `Tabs`, etc.
- **Utilities**: `cn` (className utility), `debugLogger`
- **Styles**: Main CSS bundle via `@newwork/nw-design-system/style`
- **Tailwind Config**: Preset available at `@newwork/nw-design-system/tailwind.config.js`

### gravity-ui-catalog exports (LEGACY - Being Migrated):

- `UiCatalogProvider` - Context provider for the UI catalog (⚠️ Find nw-design-system alternative)
- Types: `Field`, `Calendar` types (⚠️ Migrate to nw-design-system or create custom types)
- `atoms/*` - Atomic UI components (✅ Replace with nw-design-system components)
- `organisms/*` - Complex UI components (⚠️ Rebuild using nw-design-system components)
- CSS styles via `@newwork/gravity-ui-catalog/dist/assets/style.css` (⚠️ Remove after migration)

## Development Guidelines

### Component Discovery and Implementation

**🚨 MANDATORY: Use newwork-project-mcp server** for ALL `@newwork/nw-design-system` component work:

- **REQUIRED**: Search for components by name or functionality
- **REQUIRED**: Inspect component source code and APIs
- **REQUIRED**: Get design tokens before any styling
- **REQUIRED**: Use token recommendations instead of hardcoded values
- **REQUIRED**: Enforce gba: prefix for all Tailwind utilities
- **REQUIRED**: Prevent hardcoded colors, unprefixed classes, and inline styles
- Find usage examples across the codebase
- Understand component props and interfaces

**⚠️ VIOLATION DETECTION**: If you see suggestions for `className="bg-blue-500"` (unprefixed), `bg-primary` (missing gba:), or `style={{ color: '#3b82f6' }}` when working with design system components, the MCP server is not being used correctly!

### Component Selection Hierarchy (Migration Strategy)

When adding or updating UI components, follow this hierarchy:

1. **Use nw-design-system ONLY** - Always prefer nw-design-system for ALL UI components
2. **Avoid gravity-ui-catalog** - ⚠️ **DO NOT** add new gravity-ui-catalog dependencies
3. **Migrate existing gravity-ui-catalog usage** - Replace with nw-design-system equivalents when modifying code
4. **Create custom components** - Only if nw-design-system doesn't have what you need, build using nw-design-system primitives

### Component Usage Patterns

#### ✅ NEW PATTERN (nw-design-system - Use This)

```typescript
// ALL components should use nw-design-system
import { Button, Card, Dialog, Form, Input } from '@newwork/nw-design-system';
import { cn } from '@newwork/nw-design-system'; // Utility for className merging

const MyForm: React.FC = () => {
  return (
    <Card className={cn("gba:p-6")}>
      <Form>
        <Input placeholder="Enter text..." />
        <Button variant="primary">Submit</Button>
      </Form>
    </Card>
  );
};
```

#### ⚠️ LEGACY PATTERN (gravity-ui-catalog - Migrate Away From This)

```typescript
// ❌ AVOID - Old pattern being phased out
import { SomeBusinessComponent, SomeType } from '@newwork/gravity-ui-catalog';

const MyBusinessComponent: React.FC<SomeType> = ({ ...props }) => {
  return <SomeBusinessComponent {...props} />;
};

// ✅ MIGRATE TO - Rebuild using nw-design-system
import { Card, Button } from '@newwork/nw-design-system';

const MyBusinessComponent: React.FC = ({ ...props }) => {
  return (
    <Card>
      <Button>Rebuilt with design system</Button>
    </Card>
  );
};
```

### Local Development with Unpublished Changes

#### For gravity-ui-catalog changes (LEGACY - Avoid if possible):

1. In `gravity-ui-catalog`: Run `npm run publish-local`
2. In `gravity-business-apps`: Run `npm install` to get the latest local version
3. **⚠️ Recommendation**: Instead of updating gravity-ui-catalog, migrate the affected components to nw-design-system

#### For nw-design-system changes (PRIMARY):

1. In `nw-design-system`: Run `npm run publish:tarball` or `npm run publish:tarball:auto`
2. In `gravity-business-apps`: Run `npm install @newwork/nw-design-system@latest`
3. **Note**: This is the main development dependency - prioritize these updates

### Version Management

#### nw-design-system (PRIMARY):

- Current version: `^0.0.1-50` (check package.json for latest)
- Update with: `npm install @newwork/nw-design-system@latest`
- **Note**: This package is auto-installed via postinstall script
- **Priority**: Keep this updated and use for all new development

#### gravity-ui-catalog (LEGACY - Being Removed):

- Current version: `7.10.4` (FROZEN - do not update)
- **Migration Status**: ⚠️ **DO NOT UPDATE** - Focus on migrating away from this dependency
- **Target**: Remove this dependency entirely once migration is complete

### Tailwind CSS Integration

When using nw-design-system, ensure your `tailwind.config.js` extends the design system preset:

```javascript
module.exports = {
  presets: [require('@newwork/nw-design-system/tailwind.config.js')],
  content: ['./src/**/*.{js,ts,jsx,tsx}', 'node_modules/@newwork/nw-design-system/dist/**/*.{js,mjs}']
}
```

## Cross-Repository Source Code Access

### MCP Server Access (🚨 MANDATORY - NOT OPTIONAL!)

**🔥 CRITICAL REQUIREMENT: Use the newwork-project-mcp server for ALL `@newwork/nw-design-system` work**:

- **Purpose**: Provides direct access to nw-design-system component source code AND enforces design token usage
- **MANDATORY Usage**: AI agent MUST use MCP tools whenever working with design system components
- **Required Tools**:
  - `project-get-design-tokens` - Get available design tokens (MANDATORY before styling)
  - `project-search-design-tokens` - Search for specific tokens (MANDATORY for color/spacing queries)
  - `project-get-token-recommendations` - Get proper token usage (MANDATORY to prevent anti-patterns)
  - `project-search-by-import` - Find component sources
  - `project-get-source` - Inspect component implementations
- **Automatic Enforcement**:
  - Detects hardcoded values and prevents them
  - Detects Tailwind utility classes and prevents them
  - Auto-suggests proper design tokens
  - Provides anti-pattern warnings
- **Benefits**:
  - No need for local repository access
  - Always up-to-date component information
  - Integrated search and discovery capabilities
  - Component usage mapping across projects
  - **DESIGN SYSTEM COMPLIANCE ENFORCEMENT**

### Source Code Locations

#### nw-design-system source (PRIMARY):

- **Repository**: `../nw-design-system/` (relative to this repository)
- **MCP Server**: Use newwork-project-mcp tools for component inspection
- **Main exports**: `../nw-design-system/src/index.ts`
- **Shadcn Components**: `../nw-design-system/src/shadcn/components/ui/`
- **Utilities**: `../nw-design-system/src/lib/`
- **Styles**: `../nw-design-system/src/styles/`
- **Tailwind Config**: `../nw-design-system/tailwind.config.js`
- **Documentation**: `../nw-design-system/README.md`

#### gravity-ui-catalog source (LEGACY):

- **Repository**: `../gravity-ui-catalog/` (relative to this repository)
- **Main exports**: `../gravity-ui-catalog/src/main.ts`
- **Components**: `../gravity-ui-catalog/src/atoms/` and `../gravity-ui-catalog/src/organisms/`
- **Types**: `../gravity-ui-catalog/src/types/`
- **Documentation**: `../gravity-ui-catalog/README.md`

### When Source Code Access is Needed

#### For Design System Components (nw-design-system) - 🚨 MCP Server MANDATORY:

**🔥 REQUIRED - NO ALTERNATIVES**: Use newwork-project-mcp server tools to:

1. **MANDATORY**: Get design tokens before any styling (`project-get-design-tokens`)
2. **MANDATORY**: Get token recommendations (`project-get-token-recommendations`)
3. **MANDATORY**: Enforce gba: prefix and prevent hardcoded values
4. Inspect component implementations and APIs (`project-get-source`)
5. Find component usage patterns across projects (`project-search-by-import`)
6. Understand component props and interfaces
7. Discover available exports and utilities (`project-get-design-system-exports`)

**⚠️ NO FALLBACK ALLOWED**: Direct file system access is NOT permitted for design system components because it bypasses design token enforcement. The MCP server MUST be used to ensure:

- No hardcoded colors (like `#3b82f6`, `rgb(59,130,246)`)
- No unprefixed Tailwind classes (like `bg-blue-500`, `p-4`, `shadow-lg`)
- No missing gba: prefix (must use `gba:bg-primary`, not `bg-primary`)
- Proper design token usage with gba: prefix (like `gba:bg-primary`, `gba:text-primary-foreground`)
- Design system compliance enforcement

**🚨 RULE**: If MCP server is unavailable, DO NOT proceed with design system component work until it's configured!

#### For Business Components (gravity-ui-catalog) - LEGACY:

1. `../gravity-ui-catalog/src/atoms/` - For basic UI components
2. `../gravity-ui-catalog/src/organisms/` - For complex composite components
3. `../gravity-ui-catalog/src/types/` - For TypeScript definitions

### Context Limitations and Solutions

**Note**: When Cursor IDE is opened only in the `gravity-business-apps` folder:

- The AI agent may have limited access to source code from both repositories
- **🚨 MANDATORY SOLUTION**: Use newwork-project-mcp server tools to access nw-design-system components with design token enforcement
- **FALLBACK SOLUTION**: Open Cursor at the workspace root (`/c/Work`) for full cross-repository context (but still MUST use MCP for design tokens)

**⚠️ CRITICAL**: Regardless of IDE context, the MCP server is MANDATORY for all `@newwork/nw-design-system` component work to ensure design system compliance!

## Migration Strategy from gravity-ui-catalog to nw-design-system

### Phase 1: Setup and New Development (CURRENT)

1. ✅ **Install nw-design-system**: Already installed and configured
2. ✅ **Use for all new components**: All new UI components MUST use nw-design-system
3. ⚠️ **Freeze gravity-ui-catalog**: No new gravity-ui-catalog components should be added

### Phase 2: Active Migration (IN PROGRESS)

1. **Component Mapping**: Create equivalents for commonly used gravity-ui-catalog components

   ```typescript
   // Migration examples:
   // gravity-ui-catalog Button → nw-design-system Button
   // gravity-ui-catalog Card → nw-design-system Card
   // gravity-ui-catalog Form → nw-design-system Form
   ```

2. **File-by-file Migration**: When editing existing files:
   - Replace gravity-ui-catalog imports with nw-design-system equivalents
   - Update component props and styling to match nw-design-system API
   - Test thoroughly after each component replacement

3. **Priority Migration Order**:
   - **High Priority**: Basic UI components (Button, Input, Card, Dialog)
   - **Medium Priority**: Forms and data display components
   - **Low Priority**: Complex organisms (rebuild using nw-design-system primitives)

### Phase 3: Cleanup and Optimization (FUTURE)

1. **Remove gravity-ui-catalog dependency**: Once all components are migrated
2. **Update build configurations**: Remove gravity-ui-catalog CSS imports
3. **Bundle optimization**: Reduce bundle size without gravity-ui-catalog

### Migration Guidelines

#### When Modifying Existing Code:

1. **Always check**: If the file uses gravity-ui-catalog components
2. **Migrate as you go**: Replace with nw-design-system equivalents
3. **Test thoroughly**: Ensure visual and functional parity
4. **Document changes**: Note any API differences in PR descriptions

#### Common Migration Patterns:

```typescript
// BEFORE (gravity-ui-catalog):
import { UiButton } from '@newwork/gravity-ui-catalog';
<UiButton size="large" variant="primary" onClick={handleClick}>
  Click me
</UiButton>

// AFTER (nw-design-system):
import { Button } from '@newwork/nw-design-system';
<Button size="lg" variant="default" onClick={handleClick}>
  Click me
</Button>
```

#### Complex Component Migration:

```typescript
// BEFORE: Complex gravity-ui-catalog organism
import { ComplexOrganism } from '@newwork/gravity-ui-catalog';

// AFTER: Rebuild using nw-design-system primitives
import { Card, Button, Input, Form } from '@newwork/nw-design-system';
import { cn } from '@newwork/nw-design-system';

const RebuiltComponent = () => (
  <Card className={cn("gba:p-4", "gba:border", "gba:rounded-lg")}>
    <Form>
      <Input placeholder="Enter value" />
      <Button type="submit">Submit</Button>
    </Form>
  </Card>
);
```

## Package Relationship and Architecture (Target State)

- **nw-design-system**: PRIMARY foundation layer providing all UI components and design tokens
- **gravity-ui-catalog**: LEGACY (being removed) - No longer used
- **gravity-business-apps**: Application layer using nw-design-system exclusively

The target architecture simplifies to a single UI dependency with clear design system principles.

## Troubleshooting Common Issues

### Migration-Related Issues:

1. **Component API differences**: When migrating from gravity-ui-catalog to nw-design-system, check component prop differences
2. **Styling inconsistencies**: Some visual differences are expected - update to match nw-design-system design language
3. **Missing component equivalents**: If no direct equivalent exists in nw-design-system, rebuild using primitives
4. **Import path confusion**: Always use `@newwork/nw-design-system` for new imports, never `@newwork/gravity-ui-catalog`

### nw-design-system Issues (PRIMARY):

1. **Component not found**: Use newwork-project-mcp server to search for available components and exports
2. **Component props differences**: Use MCP tools to inspect component interfaces and prop definitions
3. **Styling issues**: Ensure Tailwind CSS is configured with the design system preset
4. **Missing styles**: Import styles: `import '@newwork/nw-design-system/style'`
5. **Tailwind classes not working**: Verify your `tailwind.config.js` includes the design system preset and content paths
6. **Implementation questions**: Use MCP server to view component source code and usage patterns

### 🚨 MCP Server Issues (CRITICAL):

1. **AI suggests hardcoded colors/values**: MCP server is not configured or not being used - this is a VIOLATION
2. **AI suggests unprefixed Tailwind classes**: MCP server design token enforcement is not active - this is a VIOLATION
3. **AI suggests inline styles**: MCP server is not preventing inline styles - this is a VIOLATION
4. **No design token suggestions**: MCP server context detection is not working - check configuration
5. **MCP server not responding**: Verify `newwork-project-mcp` is configured in AI agent settings
6. **Design tokens not found**: Check MCP server paths to nw-design-system styling files
7. **Anti-pattern warnings missing**: MCP server tools are not being triggered automatically

### ⚠️ Violation Indicators:

**If you see ANY of these, the MCP server is not working correctly:**

- Suggestions for `className="bg-blue-500"` (hardcoded Tailwind color)
- Suggestions for `className="bg-primary"` (missing gba: prefix)
- Suggestions for `className="p-4 m-6"` (unprefixed utilities)
- Suggestions for `style={{ color: '#3b82f6' }}` (inline styles)
- Suggestions for `style={{ padding: '16px' }}` (hardcoded spacing)
- Missing design token warnings when working with design system components
- No automatic MCP tool usage when mentioning LauncherLayout, Button, etc.

### gravity-ui-catalog Issues (LEGACY - Migration Priority):

1. **Import errors**: ⚠️ Instead of fixing, migrate to nw-design-system equivalent
2. **Type errors**: ⚠️ Instead of updating versions, migrate to nw-design-system
3. **Styling issues**: ⚠️ Instead of fixing CSS imports, migrate component to nw-design-system
4. **Component bugs**: ⚠️ Don't fix gravity-ui-catalog bugs - migrate the component instead

### Version Conflicts:

1. **Conflicting versions**: Prioritize nw-design-system compatibility over gravity-ui-catalog
2. **Peer dependency issues**: Focus on React compatibility with nw-design-system
3. **Bundle size issues**: Remove gravity-ui-catalog usage to reduce bundle size

### Development Workflow:

1. **Local changes not reflecting**: Prioritize nw-design-system publish scripts over gravity-ui-catalog
2. **Cache issues**: Clear `node_modules` and reinstall, prioritize nw-design-system updates
3. **Migration testing**: Test thoroughly when replacing gravity-ui-catalog components with nw-design-system equivalents
