---
trigger: always_on
---

# Component Structure and Standards

## CSS & Styling
- Prefix all Tailwind utility classes with `gba:` (e.g., `gba:px-4`, `gba:text-sm`)
- Add all CSS files via `src/index.css` to ensure they are bundled with `vite` in `dist/assets/main.css`

## HTML Attributes
- Every HTML element must include a unique `data-testid` attribute for test automation

## Reusable Components
- Use tab components with unique `tabKey` values and sync them via URL query parameters

## File Size & Code Splitting
- No file may exceed **300 lines** (excluding imports and blank lines)
- Split by **responsibility**: break out logic, UI, hooks, or utilities into separate files