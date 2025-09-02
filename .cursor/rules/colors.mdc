---
alwaysApply: true
---

# 🎨 Color and Design Token Usage Guidelines

## ⚡ CRITICAL: MANDATORY MCP SERVER USAGE

**🚨 EVERY TIME you need to add colors, spacing, shadows, or any styling, the AI Agent MUST ALWAYS use the MCP server!**

### Mandatory MCP Server Requirements:
- **Server**: `newwork-project-mcp` MUST be configured and active
- **Required Tools**: 
  - `project-get-design-tokens` - Get available CSS tokens (MANDATORY before any styling)
  - `project-search-design-tokens` - Search for specific color/spacing tokens
  - `project-get-token-recommendations` - Get proper token usage recommendations
- **Purpose**: Ensures proper design token usage, prevents ALL hardcoded values and Tailwind bypasses

---

## 🚫 CRITICAL: FORBIDDEN ANTI-PATTERNS

**ABSOLUTE RULE: AI Agents must NEVER use ANY hardcoded styling values.**

### ❌ FORBIDDEN - Hardcoded Colors:
```tsx
// ❌ NEVER use hex codes
style={{ color: '#FF0000', backgroundColor: '#3b82f6' }}
style={{ borderColor: 'rgb(59, 130, 246)' }}

// ❌ NEVER use color names
style={{ color: 'red', backgroundColor: 'blue' }}

// ❌ NEVER use HSL values
style={{ color: 'hsl(220, 91%, 54%)' }}
```

### ❌ FORBIDDEN - Tailwind Color Classes (INCLUDING gba: PREFIXED):
```tsx
// ❌ NEVER use Tailwind color utility classes - INCLUDING gba: prefixed ones
className="text-red-500 bg-blue-400 border-gray-300"
className="gba:text-gray-700 gba:bg-blue-500 gba:border-red-400"  // STILL FORBIDDEN!
className="hover:gba:bg-green-500 focus:gba:text-blue-600"
className="from-purple-400 to-pink-400"
className="hover:bg-green-500 focus:text-blue-600"
```

**⚠️ CRITICAL**: Adding `gba:` prefix does NOT make Tailwind color classes acceptable!

### ❌ FORBIDDEN - Hardcoded Spacing/Sizing:
```tsx
// ❌ NEVER use hardcoded spacing
style={{ padding: '16px', margin: '24px', gap: '8px' }}

// ❌ NEVER use Tailwind spacing classes
className="p-4 m-6 gap-2 px-8 py-3 mt-5 mb-7"
className="gba:p-4 gba:m-6 gba:gap-2 gba:px-8 gba:py-3"  // STILL FORBIDDEN!
```

### ❌ FORBIDDEN - Hardcoded Shadows/Effects:
```tsx
// ❌ NEVER use hardcoded shadows
style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}

// ❌ NEVER use Tailwind shadow classes  
className="shadow-lg shadow-xl drop-shadow-md"
className="gba:shadow-lg gba:shadow-xl gba:drop-shadow-md"  // STILL FORBIDDEN!
```

---

## ✅ MANDATORY: USE DESIGN SYSTEM CSS TOKENS

**ALL styling MUST use CSS custom properties from `@newwork/nw-design-system`:**

### ✅ CORRECT - Design Token Colors:
```tsx
// ✅ ALWAYS use design token variables
style={{ 
  color: 'var(--nw-color-primary-500)',
  backgroundColor: 'var(--nw-color-surface-primary)',
  borderColor: 'var(--nw-color-border-default)'
}}

// ✅ Common color tokens
style={{
  // Primary colors
  backgroundColor: 'var(--nw-color-primary-500)',
  borderColor: 'var(--nw-color-primary-600)',
  
  // Surface colors
  backgroundColor: 'var(--nw-color-surface-primary)',
  backgroundColor: 'var(--nw-color-surface-secondary)',
  
  // Text colors
  color: 'var(--nw-color-on-primary)',
  color: 'var(--nw-color-text-primary)',
  color: 'var(--nw-color-text-secondary)',
  color: 'var(--nw-muted-foreground)',
  
  // Status colors
  backgroundColor: 'var(--nw-color-success-500)',
  backgroundColor: 'var(--nw-color-danger-500)',
  backgroundColor: 'var(--nw-color-warning-500)',
}}
```

### ✅ CORRECT - Design Token Spacing:
```tsx
// ✅ ALWAYS use spacing tokens
style={{
  padding: 'var(--nw-spacing-md)',      // Instead of padding: '16px'
  margin: 'var(--nw-spacing-lg)',       // Instead of margin: '24px'  
  gap: 'var(--nw-spacing-sm)',          // Instead of gap: '8px'
  paddingLeft: 'var(--nw-spacing-xl)',  // Instead of paddingLeft: '32px'
}}

// ✅ Common spacing tokens
style={{
  padding: 'var(--nw-spacing-xs)',  // 4px
  padding: 'var(--nw-spacing-sm)',  // 8px  
  padding: 'var(--nw-spacing-md)',  // 16px
  padding: 'var(--nw-spacing-lg)',  // 24px
  padding: 'var(--nw-spacing-xl)',  // 32px
}}
```

### ✅ CORRECT - Design Token Effects:
```tsx
// ✅ ALWAYS use shadow tokens
style={{
  boxShadow: 'var(--nw-shadow-sm)',     // Small shadows
  boxShadow: 'var(--nw-shadow-md)',     // Medium shadows
  boxShadow: 'var(--nw-shadow-lg)',     // Large shadows
  borderRadius: 'var(--nw-border-radius-md)',
  borderWidth: 'var(--nw-border-width-thin)',
}}
```

---

## ✅ ALTERNATIVE: Design System Component Variants

**When available, prefer semantic component variants over manual styling:**

```tsx
// ✅ PREFERRED: Use semantic component variants
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="danger">Delete</Button>

<Alert variant="success" message="Success message" />
<Alert variant="error" message="Error message" />
<Alert variant="warning" message="Warning message" />

<Badge status="success">Active</Badge>
<Badge status="error">Error</Badge>

<Card variant="elevated">Content with shadow</Card>
```

---

## 👩‍💻 DEVELOPER WORKFLOW (MANDATORY)

### Before Making ANY Color/Styling Changes:

1. **STOP**: Do NOT proceed without MCP tools
2. **FETCH**: Use `project-get-design-tokens` 
3. **SEARCH**: Use `project-search-design-tokens` for specific needs
4. **IMPLEMENT**: Use only `var(--nw-token)` format
5. **VERIFY**: No `gba:text-*`, `gba:bg-*`, `gba:border-*` classes
6. **TEST**: Ensure styling works across themes

### 🚫 If MCP Server Unavailable:
- **DO NOT PROCEED** with color/styling work
- **WAIT** until MCP server is configured
- **NO EXCEPTIONS** - this is not optional tooling

### ✅ Pre-Change Checklist (MANDATORY):
- [ ] ✅ Used `project-get-design-tokens` before adding ANY color/styling
- [ ] ✅ Used `project-search-design-tokens` for specific needs  
- [ ] ✅ Used `project-get-token-recommendations` for context
- [ ] ✅ Verified NO Tailwind classes (including `gba:text-*`, `gba:bg-*`, etc.)
- [ ] ✅ All styling uses `var(--nw-token)` format

---

## 🔧 MANDATORY MCP WORKFLOW

**REQUIRED PROCESS: Before adding ANY styling, the AI agent MUST:**

1. **Get Design Tokens**: Use `project-get-design-tokens` to see available tokens
2. **Search Specific Tokens**: Use `project-search-design-tokens` for specific color/spacing needs
3. **Get Recommendations**: Use `project-get-token-recommendations` for styling context
4. **Apply Proper Tokens**: Use CSS custom properties instead of hardcoded values

### Example MCP Workflow:
```tsx
// 👤 USER: "I need to add a blue button with padding"

// 🤖 AI AGENT PROCESS:
// 1. Uses: project-get-design-tokens("colors") 
// 2. Uses: project-get-token-recommendations("blue button styling")
// 3. Provides: Proper implementation

// ✅ RESULT:
<button style={{
  backgroundColor: 'var(--nw-color-primary-500)',
  color: 'var(--nw-color-on-primary)',
  padding: 'var(--nw-spacing-md)',
  borderRadius: 'var(--nw-border-radius-md)',
  border: 'var(--nw-border-width-thin) solid var(--nw-color-primary-600)'
}}>
  Click me
</button>
```

---

## 🛡️ MANDATORY MCP SERVER ENFORCEMENT

**🔥 ZERO TOLERANCE POLICY**: If MCP server tools are not used before styling work, the change is INVALID.

### 🚨 CODE REVIEW REJECTION CRITERIA:
- Any `gba:text-{color}` classes → REJECT
- Any `gba:bg-{color}` classes → REJECT  
- Any `gba:border-{color}` classes → REJECT
- Any `gba:shadow-{size}` classes → REJECT
- Any hardcoded color values → REJECT
- Missing MCP tool usage evidence → REJECT

---

## 🚨 VIOLATION DETECTION

**If you see ANY of these suggestions, the MCP server is NOT working correctly:**

### Red Flags (MCP Server Not Active):
- Suggestions for `className="bg-blue-500"`
- Suggestions for `className="gba:text-gray-700"`
- Suggestions for `style={{ color: '#3b82f6' }}`
- Suggestions for `padding: '16px'`
- Suggestions for `className="text-red-600 p-4 shadow-lg"`
- Missing design token warnings when working with colors/spacing

### Expected Behavior (MCP Server Active):
- Auto-detection: "🎨 IMPORTANT: Use design tokens for styling!"
- Token suggestions: `var(--nw-color-primary-500)`, `var(--nw-spacing-md)`
- Anti-pattern warnings: "❌ DON'T use bg-blue-500"
- Proper recommendations: CSS custom properties only

---

## 🎯 LAYOUT & NON-COLOR UTILITIES

**Limited exceptions for layout-only utilities (NO COLORS/SPACING):**

```tsx
// ✅ ACCEPTABLE: Pure layout utilities (no colors/spacing)
className="flex items-center justify-between"
className="grid grid-cols-2 auto-rows-auto"
className="absolute top-0 left-0 w-full h-full"
className="hidden md:block lg:flex"
className="overflow-hidden text-ellipsis whitespace-nowrap"

// ❌ FORBIDDEN: Any utilities with colors/spacing
className="p-4 m-2 bg-blue-500 text-white shadow-lg" // NO!
className="gba:p-4 gba:m-2 gba:bg-blue-500 gba:text-white gba:shadow-lg" // NO!
```

---

## 🛡️ ENFORCEMENT RULES

1. **MCP Server MANDATORY**: Must be active for ALL color/styling work
2. **CSS Tokens ONLY**: All colors, spacing, shadows must use `var(--nw-token)`
3. **NO Hardcoded Values**: Zero tolerance for hex codes, px values, Tailwind classes
4. **NO gba: Color Classes**: `gba:text-*`, `gba:bg-*`, `gba:border-*` are forbidden
5. **Component Variants PREFERRED**: Use semantic variants when available
6. **Layout Utilities ACCEPTABLE**: Only pure layout classes, no styling utilities

**🔥 REMEMBER: The `@newwork/nw-design-system` CSS tokens handle all styling - let them do their job through the MCP server!**
