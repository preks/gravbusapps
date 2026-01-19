---
alwaysApply: true
---

# NEWWORK Gravity Business Apps - Core Guidelines

## Project Overview

This is a React TypeScript project for building business applications within the NEWWORK platform. Each component should extend `BusinessAppContextProps` and follow established patterns for data integration, UI components, and API communication.

## Core Principles

### Component Development

- Create all components as React components in `src/business-apps` folder
- Each component MUST extend props from `BusinessAppContextProps` interface
- Use access token from `BusinessAppContextProps` for all API requests
- Use user info/employee ID from `BusinessAppContextProps` interface
- Use `getCurrentActiveUserLocale()` from `src/common/utils/windowUtils.ts` for locale
- Use `getCurrentActiveStructureId()` from `src/common/utils/windowUtils.ts` for structure ID
- Use `getTranslationFromI18nKeyAndLabel()` from `src/common/utils/windowUtils.ts` for translations

### File Size Limits

- No single file should exceed 300 lines of code (excluding imports and blank lines)
- When approaching this limit, break out logic, UI, hooks, or utility functions into separate files
- Split by component, feature, or responsibility for clarity and reuse

## Naming Conventions

### Folders

- Use kebab-case: `src/business-apps/fin/expenses/personal-expenses`

### Files

- **PascalCase**: Apps, forms, components (`PersonalExpenses.tsx`, `EmployeeRecord.tsx`)
- **camelCase**: index.ts, hooks, utils, types, functions (`useEmployeeData.ts`)

## Folder Structure

```
src/business-apps/
└── <module>/                    # hr, fin, crm, mdm, etc.
    ├── <sub-module>/           # core, expenses, absences, etc.
    │   ├── apps/
    │   │   └── <app-name>/
    │   │       ├── AppName.tsx
    │   │       ├── index.ts
    │   │       ├── components/
    │   │       ├── hooks/
    │   │       ├── queries/
    │   │       ├── types/
    │   │       └── utils/
    │   ├── forms/
    │   │   └── <form-name>/
    │   │       ├── FormName.tsx
    │   │       ├── index.ts
    │   │       └── ...
    │   ├── components/         # Shared components
    │   ├── hooks/             # Shared hooks
    │   ├── queries/           # Shared GraphQL queries
    │   ├── types/             # Shared TypeScript types
    │   └── utils/             # Shared utilities
    └── index.ts               # Module exports
```

## Dependencies

### Required

- **react**: UI components
- **tailwind v4**: Utility classes styling
- **@newwork/nw-design-system**: React UI components with styles
- **@dnd-kit**: Drag and drop
- **zustand**: State management
- **react-dom**: DOM manipulation
- **typescript**: Type safety
- **dayjs**: Date/time logic (with weekday and localeData plugins)

### Restrictions

- Do not install additional UI themes, icons, or packages unless absolutely necessary
- Keep dependency list small and simple
- Reuse existing packages

## Code Quality Standards

### General

- Simplify code as much as possible
- Make changes minimal and focused
- Clear separation of responsibilities
- Reuse existing code, functions, components
- Remove unused code and imports
- Remove commented code
- Minimal `console.log` usage (avoid sensitive data)
- Minimal code comments (only for complex logic)

### Git

- Use Conventional Commits specification for commit messages

### TypeScript

- Use proper type definitions
- Avoid `any` types when possible
- Create interfaces for all data structures
- Export types from dedicated `types/` files

## Publishing

- **Frequency**: Daily basis
- **Apps**: `npm run publish:screen -- /<module>/<sub-module>/apps/<app-folder> [options]`
- **Forms**: `npm run publish:screen -- /<module>/<sub-module>/forms/<form-folder> [options]`
- **Options**:
  - `--resource` or `-r`: Resource URL mode - enables prompts for creating resource URLs (by default, direct publishing without prompts)

### Publishing Scripts

- all app and form publish scripts must support the no-interaction flag to suppress user interaction in build pipelines

### Processes with native screens

- When wanting to continue a Kogito process by completing the current task, use `dispatchProcessContinueEvent(event, payload)` from src\common\utils\processEventUtils.ts
- `dispatchProcessContinueEvent` assumes that there is a native screen rendered in the platform in a running Kogito process.
