# Supported Screen Types for Publishing

## Overview

The publishing system supports four types of screens for deployment to both dev and production environments. Each screen type has specific characteristics and is treated differently during the publishing process.

## Screen Types

### 1. 📱 Apps

**Path Pattern:** `src/business-apps/**/apps/*/index.ts`

**Description:** Main application screens that provide core functionality.

**Examples:**

```
crm/common/apps/account-record
crm/common/apps/contact-record
crm/common/apps/lead-record
hr/core/apps/employee-record
fin/expenses/apps/personal-expenses
mdm/apps/compensation-data
platform/apps/notification-center
```

**Publishing Behavior:**

- ✅ Full resource URL synchronization
- ✅ Screen Management registration
- ✅ Namespace preservation from dev to prod
- ✅ Version management with build numbers

**Use Cases:**

- Detail screens (e.g., employee details, account details)
- Overview screens (e.g., dashboard, summary views)
- Management screens (e.g., settings, admin panels)
- Workflow screens (e.g., approval processes)

---

### 2. 📝 Forms

**Path Pattern:** `src/business-apps/**/forms/*/index.ts`

**Description:** Form screens used in business processes and workflows, typically invoked by Kogito processes.

**Examples:**

```
crm/common/forms/account-form
crm/common/forms/contact-form
hr/core/forms/employee-form
hr/absences/forms/absence-request-form
fin/expenses/forms/expense-form
```

**Publishing Behavior:**

- ⏩ **Skips resource URL sync** (forms use direct screenKey)
- ✅ Screen Management registration
- ✅ Namespace preservation from dev to prod
- ✅ Version management with build numbers
- 🎯 Preserves exact screenKey from dev (e.g., `frm_expense`)

**Use Cases:**

- Process forms (e.g., absence request, expense submission)
- Data entry forms (e.g., create new contact)
- Workflow task forms (e.g., approval forms)
- Landing screen forms

**Special Handling:**
Forms are treated differently because they are typically accessed directly via process tasks and don't require resource URL navigation patterns.

---

### 3. 🪟 Popups

**Path Pattern:** `src/business-apps/**/popups/*/index.ts`

**Description:** Modal/popup screens that display content in overlays or dialogs.

**Examples:**

```
crm/investments/popups/investment-popup
crm/investments/popups/investment-detail-popup
hr/core/popups/employee-select-popup
platform/popups/notification-popup
```

**Publishing Behavior:**

- ✅ Full resource URL synchronization (treated like apps)
- ✅ Screen Management registration
- ✅ Namespace preservation from dev to prod
- ✅ Version management with build numbers

**Use Cases:**

- Selection popups (e.g., employee picker, account selector)
- Detail popups (e.g., quick view, preview)
- Action popups (e.g., confirmation dialogs, input dialogs)
- Information popups (e.g., help, tooltips with rich content)

---

### 4. 📄 Records

**Path Pattern:** `src/business-apps/**/records/*/index.ts`

**Description:** Record detail screens that display comprehensive information about a single entity.

**Examples:**

```
crm/common/records/opportunity-record
crm/common/records/account-record-detail
hr/core/records/employee-record-detail
fin/records/budget-record
```

**Publishing Behavior:**

- ✅ Full resource URL synchronization (treated like apps)
- ✅ Screen Management registration
- ✅ Namespace preservation from dev to prod
- ✅ Version management with build numbers

**Use Cases:**

- Entity detail views (e.g., full employee profile)
- Record management screens (e.g., edit opportunity)
- Comprehensive data displays (e.g., budget details with history)
- Master detail patterns

---

## Publishing Treatment Summary

| Screen Type | Resource URL Sync             | Screen Management | Namespace Sync | Version Control |
| ----------- | ----------------------------- | ----------------- | -------------- | --------------- |
| **Apps**    | ✅ Yes                        | ✅ Yes            | ✅ Yes         | ✅ Yes          |
| **Forms**   | ❌ No (uses direct screenKey) | ✅ Yes            | ✅ Yes         | ✅ Yes          |
| **Popups**  | ✅ Yes                        | ✅ Yes            | ✅ Yes         | ✅ Yes          |
| **Records** | ✅ Yes                        | ✅ Yes            | ✅ Yes         | ✅ Yes          |

## Screen Detection

### Automatic Discovery

The publishing scripts automatically discover all screens by scanning for `index.ts` files:

```javascript
// Pattern matching used in publish scripts
const appIndexFiles = await glob('src/business-apps/**/apps/*/index.ts', { nodir: true })
const formIndexFiles = await glob('src/business-apps/**/forms/*/index.ts', { nodir: true })
const popupIndexFiles = await glob('src/business-apps/**/popups/*/index.ts', { nodir: true })
const recordIndexFiles = await glob('src/business-apps/**/records/*/index.ts', { nodir: true })
```

### Publishing All Screens

When using `PUBLISH_ALL_SCREENS=true`:

- All four screen types are automatically discovered
- Screens are categorized and counted by type
- Each type is listed separately in the console output
- All types are published in a single pipeline run

### Publishing Specific Screens

When using `SCREENS_TO_PUBLISH`:

```bash
# Can include any mix of screen types
SCREENS_TO_PUBLISH="crm/common/apps/lead-record,hr/core/forms/employee-form,crm/investments/popups/investment-popup"
```

## File Structure Requirements

Each screen must have the following structure:

```
src/business-apps/
├── <module>/           # e.g., crm, hr, fin, mdm, platform
│   ├── <sub-module>/  # e.g., common, core, expenses
│   │   ├── apps/
│   │   │   └── <screen-name>/
│   │   │       ├── index.ts           # Required: Main entry point
│   │   │       ├── <ScreenName>.tsx   # Main component
│   │   │       ├── components/        # Optional: Sub-components
│   │   │       ├── hooks/            # Optional: Custom hooks
│   │   │       ├── types/            # Optional: Type definitions
│   │   │       └── utils/            # Optional: Utilities
│   │   ├── forms/
│   │   │   └── <form-name>/
│   │   │       └── index.ts           # Required
│   │   ├── popups/
│   │   │   └── <popup-name>/
│   │   │       └── index.ts           # Required
│   │   └── records/
│   │       └── <record-name>/
│   │           └── index.ts           # Required
```

## Which Screen Type Should I Use?

### Use **Apps** when:

- Building a main navigation destination
- Creating a primary feature screen
- Building a management/admin interface
- Creating a dashboard or overview

### Use **Forms** when:

- Integrating with Kogito processes
- Creating data entry screens for workflows
- Building task completion screens
- Creating landing screens for process start

### Use **Popups** when:

- Creating modal dialogs
- Building overlay content
- Making selection interfaces
- Creating quick-view/preview screens

### Use **Records** when:

- Building comprehensive entity detail views
- Creating master-detail patterns
- Building record management interfaces
- Showing complete entity information

## Examples by Module

### CRM

```
crm/
├── common/
│   ├── apps/
│   │   ├── lead-record/
│   │   ├── account-record/
│   │   └── contact-record/
│   ├── forms/
│   │   ├── lead-form/
│   │   └── contact-form/
│   └── popups/
│       └── account-selector/
└── investments/
    ├── apps/
    │   └── investment-overview/
    └── popups/
        └── investment-popup/
```

### HR

```
hr/
├── core/
│   ├── apps/
│   │   └── employee-record/
│   ├── forms/
│   │   └── employee-form/
│   └── popups/
│       └── employee-select/
└── absences/
    ├── apps/
    │   └── absence-overview/
    └── forms/
        └── absence-request-form/
```

### Finance

```
fin/
└── expenses/
    ├── apps/
    │   └── personal-expenses/
    └── forms/
        └── expense-form/
```

## Publishing Commands

### Publish Single Screen (Any Type)

```bash
# App
npm run publish:screen -- /crm/common/apps/lead-record

# Form
npm run publish:screen -- /hr/core/forms/employee-form

# Popup
npm run publish:screen -- /crm/investments/popups/investment-popup

# Record
npm run publish:screen -- /crm/common/records/opportunity-record
```

### Publish All Screens (All Types)

```bash
# DEV
npm run publish:all:screens

# PROD (via pipeline)
# Set PUBLISH_ALL_SCREENS=true in Bitbucket pipeline
```

## Related Documentation

- [Publishing All Screens to Production](./publish-all-screens-to-prod.md)
- [Production Deployment Comprehensive Sync](./production-deployment-comprehensive-sync.md)
- [Deployment to Production Rules](./deployment-to-prod-rules.md)

## Questions?

If you have questions about which screen type to use or how to structure your screens, please consult the development team or create an issue in the project repository.
