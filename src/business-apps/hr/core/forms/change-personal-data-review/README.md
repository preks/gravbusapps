# Change Personal Data Review V2

Modern form for reviewing personal data change requests from Kogito processes, using TaskDetailHeader and TaskDetailFooter for consistent HR form layout.

## Features

- ✅ Modern TaskDetailHeader with employee information display
- ✅ TaskDetailFooter with approval/rejection actions
- ✅ Side-by-side comparison of old vs new values
- ✅ Visual indicators for changed fields (badges)
- ✅ Support for completed tasks (showing approval details)
- ✅ Comment section with toggle for optional comments
- ✅ Consistent styling with other HR forms

## Structure

```
change-personal-data-review-v2/
├── ChangePersonalDataReviewV2.tsx    # Main component
├── hooks/
│   └── useChangeDataDetails.ts       # Employee data fetching
├── queries/
│   └── ChangeDataReviewQueries.ts    # GraphQL queries
├── index.ts                           # Barrel export
└── README.md                          # This file
```

## Usage

This form is designed to be triggered by Kogito processes:

```typescript
import { ChangePersonalDataReviewV2 } from '@/business-apps/hr/core/forms/change-personal-data-review-v2'

// In your component
<ChangePersonalDataReviewV2
  accessToken={accessToken}
  additionalData={additionalData}
  onClose={handleClose}
/>
```

## Expected Data Structure

The form expects the following data in `additionalData.psi_taskPayload`:

```typescript
{
  personalInformation: {
    id: string
    salutationRef?: string
    title?: string
    firstName: string
    lastName: string
    displayName?: string
    preferredName?: string
    birthName?: string
    birthDate?: string
    birthPlace?: string
    genderRef?: string
    nationalityRef?: string
    languageRef?: string
    maritalStatusRef?: string
    severelyDisabilityDegree?: string | number
    schoolQualificationRef?: string
    academicTitleRef?: string[]
    notes?: string
    // ... other fields
  },
  oldPersonalInformation: {
    // Same structure as personalInformation
    // Contains the original values before changes
  }
}
```

## Process Events

- **Approve**: Dispatches `pse_submit` with `approval: 'approved'`
- **Reject**: Dispatches `pse_submit` with `approval: 'rejected'` (requires comment)
- **Cancel**: Calls `onClose()` or dispatches `pse_pause`

## Field Comparison

The form automatically compares old and new values for all fields:

- **Unchanged fields**: Display current value in normal style
- **Changed fields**: Display both old (strikethrough + red badge) and new (bold + green badge)
- **Visual indicators**: Color-coded badges make it easy to spot changes

## Approval States

### In Progress

- Shows full form with all field comparisons
- Comment section with toggle
- Three action buttons: Cancel, Reject, Approve

### Completed

- Shows approval details section
- Displays approval status (Approved/Rejected)
- Shows approval date and comment if available
- No action buttons shown

## Testing

Test IDs are provided for automated testing:

- `change-personal-data-review-v2` - Main container
- `error-message` - Error alert
- `employee-error-message` - Employee fetch error
- `personal-data-changes-section` - Changes section
- `field-{field-name}` - Individual field changes
- `notes-section` - Notes section
- `approval-details-section` - Approval details
- `comment-section` - Comment input section
- `comment-toggle` - Comment toggle switch
- `approval-comment-input` - Comment textarea
- `action-footer` - Footer with actions
- `cancel-button`, `reject-button`, `approve-button` - Action buttons

## Design Patterns

This form follows the same patterns as other HR v2 forms:

- `FeedbackApprovalV2` - Similar approval workflow
- `ApproveEmployeeVacationV2` - TaskDetailHeader/Footer usage
- Modern design system components from `@newwork/nw-design-system`
