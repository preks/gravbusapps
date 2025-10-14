# Investment Report Portal - Platform Actions Configuration

## Overview

The Investment Report Portal is designed to work with platform-managed app actions rather than embedded modals. This document explains how to configure the platform actions to integrate with the portal.

## Required Platform Actions

### 1. Investment Report Form (Upload Mode)

- **Action Name**: `investment-report-form`
- **Mode**: `upload`
- **Purpose**: Allows users to upload new investment report files
- **Trigger**: "Upload Report" button in the portal header

### 2. Investment Report Form (Create Mode)

- **Action Name**: `investment-report-form`
- **Mode**: `create`
- **Purpose**: Allows users to create new investment reports manually
- **Trigger**: "Create Report" button in the portal header

### 3. Investment Report Form (Edit Mode)

- **Action Name**: `investment-report-form`
- **Mode**: `edit`
- **Purpose**: Allows users to edit existing investment reports
- **Parameters**: `reportId` - The ID of the report to edit
- **Trigger**: Edit button in the report list

## Platform Action Configuration

### Action Definition

```typescript
// Platform action configuration
{
  name: 'investment-report-form',
  component: 'InvestmentReportForm',
  modes: ['upload', 'create', 'edit'],
  parameters: {
    mode: 'string',
    reportId: 'string (optional, for edit mode)'
  }
}
```

### Integration Points

The portal uses placeholder platform action triggers that should be replaced with actual platform integration:

```typescript
// Current placeholder implementation
if (typeof window !== 'undefined' && (window as any).platformActions) {
  ;(window as any).platformActions.openForm('investment-report-form', {
    mode: 'edit',
    reportId
  })
}

// Should be replaced with actual platform action API
// Example: platform.dispatchAction('openForm', { name: 'investment-report-form', params: {...} })
```

## Form Component Location

The `InvestmentReportForm` component is located at:

```
src/business-apps/crm/investments/forms/investment-report-form/InvestmentReportForm.tsx
```

## Benefits of This Architecture

1. **Separation of Concerns**: Portal focuses on display and navigation, forms handle data entry
2. **Platform Management**: Platform controls when and how forms are displayed
3. **Reusability**: Forms can be triggered from multiple locations (portal, menus, other screens)
4. **Consistency**: All forms follow the same platform-managed pattern
5. **Maintainability**: Changes to form behavior don't require portal modifications

## Implementation Notes

- The portal no longer imports or renders forms directly
- All form interactions are handled through platform actions
- Button click handlers dispatch platform events instead of opening modals
- The platform is responsible for managing form state and lifecycle
- Forms receive their parameters through platform action context

## Future Enhancements

- Add platform action validation and error handling
- Implement form result callbacks for data refresh
- Add support for form pre-population based on context
- Integrate with platform navigation and breadcrumb systems
