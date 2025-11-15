# AppAction Component Examples

Comprehensive example app demonstrating all features, variants, and configuration options of the new unified `AppAction` component.

## What's Included

This example app covers:

### 1. **Pre-configured Variants**

- `table-row` - For action buttons in table rows (lazy loading, shows dropdown menu, no auto-execute)
- `list-item` - For action buttons in lists (lazy loading, shows dropdown menu, no auto-execute)
- `header` - For action buttons in page headers (ActionButton component)
- `create-primary` / `create-secondary` - Create actions with auto-execute
- `update-primary` - Update action with auto-execute (default size button)
- `update-secondary` - Update action as icon button (no auto-execute)
- `delete-primary` - Delete action as default size button (no auto-execute)
- `delete-secondary` - Delete action as icon button (no auto-execute)

### 2. **New Contexts API**

- Single context with single data object
- Single context with multiple data objects
- Multiple contexts with their respective data
- Complex scenarios: multiple contexts with multiple data each

### 3. **Custom Modes (Full Control)**

- `trigger` mode - Wraps any element to execute first action on click
- `action-button` mode - Uses ActionButton component with dropdown menu
- `button` mode - Normal button that executes first action or shows menu

### 4. **Behavior Options**

- `lazyLoad` - Defers loading until user interaction
- `autoExecute` - Automatically executes single actions
- `emptyState` - Controls behavior when no actions available (disable/hide/enable)

### 5. **Static Flow Data**

- Custom static actions without API calls
- Combined static + context-based actions

### 6. **Different Context Types**

- **CRM**: Lead, Account, Contact, Opportunity
- **HR**: Employee, Job Position, Asset
- **Investment**: Investment Lead, Investment Account, Investment Entity, Equity Investment

### 7. **Legacy API**

- Demonstrates backward compatibility with old `contextsArray` + `externalContextData` API

## Usage

The example app can be accessed via the platform's app registry once published.

### Key Takeaways

#### Old API (Still Supported)

```typescript
<AppAction
  variant="table-row"
  contextsArray={[FlowContextName.customerLeadEntity]}
  externalContextData={{ leadId: 'lead-1' }}
  accessToken={accessToken}
/>
```

#### New API (Recommended)

```typescript
<AppAction
  variant="table-row"
  contexts={[
    {
      context: FlowContextName.customerLeadEntity,
      contextData: [{ leadId: 'lead-1' }]
    }
  ]}
  accessToken={accessToken}
/>
```

#### Multiple Data for Same Context

```typescript
<AppAction
  variant="update-primary"
  contexts={[
    {
      context: FlowContextName.customerLeadEntity,
      contextData: [
        { leadId: 'lead-1' },
        { leadId: 'lead-2' }
      ]
    }
  ]}
  accessToken={accessToken}
>
  Update Multiple Leads
</AppAction>
```

## File Structure

```
app-action-example/
├── AppActionExample.tsx    # Main component with all examples
├── index.ts                # Exports
├── i18n/
│   ├── en-US.ftl          # English translations
│   ├── de-DE.ftl          # German translations
│   ├── ro-RO.ftl          # Romanian translations
│   └── index.ts           # i18n exports
└── README.md              # This file
```

## Publishing

To publish this example to development:

```bash
npm run publish:screen -- /common/examples/apps/app-action-example
```

## Related Components

- `AppAction` (new) - Unified action component (`src/components/app-action/AppAction.new.tsx`)
- `AppActionButton` (legacy) - Will be refactored to use `AppAction`
- `AppActionMenu` (legacy) - Will be refactored to use `AppAction`
- Original `AppAction` (legacy) - Will be refactored to use new `AppAction`

## Notes

- All examples use real context names from `FlowContextName` enum
- **Uses real data from GraphQL API**: Leads, Accounts, Contacts, Opportunities, Employees, Job Positions, and Investments
- Access token is required for context-based actions
- The example app shows both successful cases and edge cases (empty states, lazy loading, etc.)
- Interactive feedback shows which actions were triggered
- **Real entity IDs**: All examples use actual database IDs, so flows can be started and tested with real data
