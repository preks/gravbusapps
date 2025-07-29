---
trigger: always_on
---

# Component Structure and Standards

## CSS & Styling
- Prefix all Tailwind utility classes with `gba:` (e.g., `gba:px-4`, `gba:text-sm`)
- Add all CSS files via `src/index.css` to ensure they are bundled with `vite` in `dist/assets/main.css`

## Component Design System
- This design system provides basic styling and components based on shadcn and animate-ui for all business apps
- Always use components from the `@newwork/nw-design-system` package and do not create separate components which are not in the design system
- Always use the PageLayout from `@/components/layout` if a layout is required with header, widgets, content and in all other cases use the layouts from `@newwork/nw-design-system`
- If custom NEWWORK components are required, take them also from the design system package in `@newwork/nw-design-system`

## HTML Attributes
- Every HTML element must include a unique `data-testid` attribute for test automation

## Reusable Components
- Use tab components with unique `tabKey` values and sync them via URL query parameters

## File Size & Code Splitting
- No file may exceed **300 lines** (excluding imports and blank lines)
- Split by **responsibility**: break out logic, UI, hooks, or utilities into separate files