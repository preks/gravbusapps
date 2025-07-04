---
trigger: always_on
---

# Folder Structure and Naming

## Folder Naming
- Use `kebab-case` for folders
- Modules live in: `src/business-apps/<module>/<sub-module>/apps/<app-name>` or `forms/<form-name>`

## File Naming
- `PascalCase` for components, apps, forms: `MyApp.tsx`, `MyForm.tsx`
- `camelCase` for index.ts, hooks, utils, types

## Index Files
- Each app/form folder must include:
  - `index.ts` with:
    - Named export of the main component
    - Default export of the main component
