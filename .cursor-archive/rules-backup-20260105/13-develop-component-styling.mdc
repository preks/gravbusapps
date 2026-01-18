---
alwaysApply: true
---

# Core Rules

## Principle: Keep markup simple
- Prefer to use `@newwork/nw-design-system` components and their APIs (variants/props) directly unless structural extension is essential. 
- When extra styling is needed strictly **only** use Tailwind utilities (with `gba:` prefix). **Never** use inline styles or custom CSS.  
- Avoid unnecessary HTML wrappers or deep tag hierarchies (e.g. extra `<div>`/`<span>`).

---

## Component Library: @newwork/nw-design-system
- Only the `@newwork/nw-design-system` may be used; all styling should go through its component APIs (variants, props) whenever possible.
- Usage of other UI libraries (e.g. antd, gravity-ui-catalog) is **prohibited**.

---

# Styling Rules

## Prefix-first rule for Tailwind utilities
- Every Tailwind utility **MUST** start with `gba:`.
- That prefix must appear **before** any variant modifiers.

**Syntax**
gba:(variant:)*utility[-token]

**✅ Valid Examples**
`gba:flex`
`gba:space-y-4`
`gba:bg-background gba:text-foreground`
`gba:hover:bg-accent`
`gba:md:flex`
`gba:border-t`

**❌ Invalid Examples**
`flex`
`bg-primary text-primary-foreground`
`hover:gba:bg-accent`
`md:gba:flex`

---

## Prefer component API over utilities
- For styling that `nw-design-system` supports via variant or prop (color, size, state, layout), always prefer to use that API instead of applying Tailwind utilities.  
- Use utilities **only** for layout, spacing, positioning, and cases the component API cannot express.

**✅ Valid Examples**
// Use variant prop instead of custom styling
<Button variant="destructive" size="lg">Delete</Button>
<Badge variant="success">Active</Badge>
<Card variant="outlined" className="gba:p-4">
  <CardHeader variant="elevated">
    <CardTitle>Title</CardTitle>
  </CardHeader>
</Card>

**❌ Incorrect Pattern Examples**
// Don't override component styling with custom classes
<Button className="gba:bg-red-500 gba:text-white">Delete</Button>
<Badge className="gba:bg-green-500 gba:text-white">Active</Badge>
<Card className="gba:border gba:border-gray-300">Content</Card>

**Key Principles:**
- **Variant props handle styling**: Components like Button, Badge, Card have `variant` props that apply correct colors, borders, and styling
- **Size props handle dimensions**: Use `size` props (sm, md, lg) instead of custom padding/margin classes
- **State props handle interactions**: Use `disabled`, `loading` props instead of custom state styling
- **Only add utilities for layout**: Use Tailwind classes only for positioning, spacing, layout, and coloring that component props can't handle
- **Trust the design system**: The component variants are designed to be consistent and accessible

---

## Strictly use design tokens only (no raw values)
- Use design‑system tokens for color/appearance. **Do not** use Tailwind palette names (e.g., `text-red-500`) or arbitrary values (`[#...]`).
- **MANDATORY**: All colors **MUST** use design system tokens with gba: prefix
- Colors **MUST NOT** use hardcoded colors like `text-red-600`, `bg-[#fff]`, or inline styles
- Shadows **MUST NOT** be used at all as the components that are allowed to have shadows will come with them by default

**✅ Allowed Pattern Examples**
gba:bg-primary
gba:bg-primary gba:text-primary-foreground
gba:bg-destructive-secondary gba:text-destructive-secondary

**❌ Forbidden Pattern Examples**
text-red-500 bg-[#ff0000]
style={{ boxShadow: '...' }}

**General Form**
gba:[utility]-[token]
- gba: — required prefix
- [utility] — any Tailwind utility that accepts a color or effect value (Examples: bg, text...)
- [token] — semantic design system token

**Token Schemas**
- [base] *Background color* <div className= "gba:bg-primary"/>
- [base]-foreground *Text on base backgrounds* <div className= "gba:bg-primary gba:text-primary-foreground"/>
- [base]-secondary *Less prominent elements* <div className= "gba:bg-destructive-secondary gba:text-destructive-secondary"/>
- [base]-from [base]-to *Gradients* <div className="gba:gradient-to-r gba:ai-primary-from gba:ai-primary-to"/>
- [base]-ring *Content borders and focus rings*

Only the following color codes **MUST** be used:

**✅ Base Tokens** (nw-design-system components usually come with correct base tokens assigned already)
- primary primary-foreground *Primary Brand Colors*
- secondary secondary-foreground *Secondary Brand Colors*
- muted muted-foreground *Muted & Subtle Elements*
- accent accent-foreground *Accent & Hover State*
- card card-foreground *Card Components*
- popover popover-foreground *Popover Components*

**✅ Semantic Tokens**
- success, success-foreground, success-secondary, success-secondary-foreground *Successful operations, confirmations, and positive outcomes and completed states*
- destructive, destructive-foreground, destructive-secondary, destructive-secondary-foreground *Critical errors, destructive actions, danger warnings and failing states*
- warning, warning-foreground, warning-secondary, warning-secondary-foreground *Caution messages, important notices, and attention-required states*
- info, info-foreground, info-secondary, info-secondary-foreground *General information, tips, neutral system messages and pending states*
- offline, offline-foreground, offline-secondary, offline-secondary-foreground *Disconnected, unavailable, inactive, and draft states*

---

## Minimize additional utilities
Prefer `nw-design-system` component props/variants first. Use utilities only when props can’t express the requirement or at container/layout boundaries. When working with `@newwork/nw-design-system` components, do not override internals with utilities unless absolutely necessary.

---

# Quick checklist (pre‑commit)
[ ] All Tailwind utilities start with `gba:`.
[ ] Variants follow `gba:[modifier]:utility` (never `[modifier]:gba:utility`).
[ ] Layout classes from `layout.css` are **not** prefixed.
[ ] No hex colors, Tailwind palette names, or `[]` arbitrary values.
[ ] Extra utilities kept to a minimum; favor component props.

---

# Editor notes
- If you see `[modifier]:gba:`, change to `gba:[modifier]`.
- If you see unprefixed utilities add `gba:` and ensure they use correct design tokens.
- If you see other design libraries beside the nw-design-system (e.g. antd, or gravity-ui-catalog) suggest and encourage to replace those components with nw-design-system components.
- If you see complicated div wrappings and many tailwind utilities elaborate if those are really necessary and suggest a complexity reduction
- Keep examples minimal, avoid embedding component‑specific class stacks.