---
name: design-system-compliance-checker
description: Check and enforce NEWWORK design-system compliance for screens and page components. Use when reviewing page UI consistency, validating Tailwind token usage, checking icon/component imports, or when the user asks if a screen is design-system compliant.
---

# Design System Compliance Checker

Use this skill to audit and fix UI pages against the project design-system rules.

## Scope

Apply to:

- Full screens (for example, Manager Workboard and sub-views)
- Feature folders and related components
- Any UI changes where consistency and DS compliance are required

Do not use for:

- Backend-only changes
- Pure data/model refactors with no UI impact

## Required Rule Sources

Always align checks with these project rules:

- `.cursor/rules/react/02-design-system.mdc`
- `.cursor/rules/react/01-component-architecture.mdc`
- `.cursor/rules/typescript/04-code-quality.mdc`
- `.cursor/rules/base/02-security.mdc`

When form interactions are involved, also check:

- `.cursor/rules/react/03-forms.mdc`
- `.cursor/rules/react/04-testing.mdc`

## Compliance Checklist

For each touched page/component, verify:

1. **Design system components**
   - UI components come from `@newwork/nw-design-system` where applicable.
   - Avoid introducing prohibited UI libraries.

2. **Tailwind prefix and tokens**
   - All utility classes use `gba:`.
   - No inline styles for visual styling.
   - No hardcoded hex/rgb colors.
   - No arbitrary class values unless explicitly approved.
   - Prefer design tokens (for example `gba:bg-primary`, `gba:text-muted-foreground`).

3. **Icons**
   - Use Phosphor family only:
     - preferred: `@newwork/icons`
     - allowed: `@phosphor-icons/react`
   - Do not add new `lucide-react` usage in touched UI files.

4. **Component architecture**
   - Keep component responsibilities focused.
   - Avoid large mixed-responsibility files; suggest split near 300 LOC.
   - For app components, preserve expected context integration patterns.

5. **Interaction consistency**
   - Similar UI elements use consistent interaction patterns.
   - Labels/buttons/titles use consistent naming across entry points.
   - Disabled states and empty states are explicit and understandable.

6. **Testability and accessibility**
   - Interactive controls have stable `data-testid` where project patterns expect them.
   - Buttons/controls have clear affordance and readable labels.

## Workflow

Follow this sequence:

1. **Map the screen surface**
   - Identify main screen and sub-screens/components.
   - Identify action panels, dialogs, and table/list action buttons.

2. **Run a compliance audit**
   - Check imports, class usage, icons, and styling patterns.
   - Check wording consistency across related screens.
   - Note each violation with file path and quick rationale.

3. **Apply focused fixes**
   - Fix high-impact inconsistencies first (layout, actions, labels, disabled behavior).
   - Migrate prohibited icons/imports in touched files.
   - Keep changes minimal and aligned with existing patterns.

4. **Validate**
   - Run lints on changed files.
   - Re-check for new DS violations in modified code.
   - If publishing is requested, publish the target screen and report result.

## Layout Safety Rule

- Do not alter the current page layout structure unless the user explicitly requests a layout change.
- Prefer visual-token and component-level fixes that preserve the existing information architecture.
- If a compliance fix would require a structural layout change, stop and ask for explicit approval first.

## Reporting Format

When asked for review only:

- List findings by severity: Critical, Major, Minor.
- Include file paths and exact non-compliant pattern.
- Add suggested fix for each finding.

When changes were applied:

- Summarize what was fixed.
- List remaining known gaps (if any).
- Include validation status (lint/publish/test outcome).

## Common Fix Patterns

### Icons

- Replace:
  - `import { ... } from 'lucide-react'`
- With:
  - `import { ... } from '@phosphor-icons/react'`
  - or `@newwork/icons` when available.

### Styling

- Replace non-prefixed classes:
  - `flex`, `bg-*`, `text-*`
- With prefixed classes:
  - `gba:flex`, `gba:bg-*`, `gba:text-*`

### Inline styles

- Replace style objects used for simple spacing/colors/typography with DS utility classes.

### Inconsistent labeling

- Harmonize button and page naming when they represent the same destination.
