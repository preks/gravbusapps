# Benefit Deactivate Form

## Overview

This form allows employees to deactivate their active benefits.

## Component

**Main Component:** `BenefitDeactivateScreen.tsx`

## Purpose

- Deactivate an active employee benefit
- Select reason for deactivation
- Set effective end date
- Provide additional details if reason is "Other"

## Kogito Integration

**Status:** 🚧 Placeholder - Flow not yet implemented

- **Flow Name:** `deactivateEmployeeBenefit`
- **Domain:** `human-resources`
- **Approval:** Conditional (based on benefit type/value)

## Props

```typescript
interface BenefitDeactivateScreenProps extends BusinessAppContextProps {
  t: (key: string, params?: any) => string // Translation function
  isOpen: boolean // Controls form visibility
  onClose: () => void // Close callback
  benefit: BenefitCatalogItem // Active benefit to deactivate
  employeeId: string // Employee making request
  onSuccess?: () => void // Success callback
}
```

## Usage

```typescript
import BenefitDeactivateScreen from '@/business-apps/hr/core/forms/benefit-deactivate-form'

<BenefitDeactivateScreen
  t={t}
  isOpen={isOpen}
  onClose={handleClose}
  benefit={selectedBenefit}
  employeeId={employeeId}
  accessToken={accessToken}
  userInfo={userInfo}
  additionalData={additionalData}
  onSuccess={handleSuccess}
/>
```

## Form Fields

1. **Benefit Summary** - Shows current benefit details
2. **Effective End Date** (Required) - When benefit should end
3. **Reason for Deactivation** (Required) - Predefined reasons:
   - No longer needed
   - Found better alternative
   - Cost concerns
   - Relocating
   - Other (requires additional details)
4. **Additional Details** (Conditional) - Required if reason is "Other" (min 20 chars)

## Validation

- End date must be today or later
- Reason must be selected
- If reason is "Other", additional details must be between 20-500 characters

## Approval Logic

The backend determines if HR approval is required based on:

- Benefit type
- Benefit value
- Company policies

## Integration

- Uses `AppActionForm` component pattern
- Builds payload and returns it from `onSubmit`
- AppActionForm handles process events via `dispatchProcessContinueEvent`
- Validation via `validateForm()` function
- Automatic loading/error state management
- Destructive submit button variant (red)

## File Structure

```
benefit-deactivate-form/
├── BenefitDeactivateScreen.tsx   ← Main component
├── index.ts                      ← Exports
└── README.md                     ← This file
```

## How It Works

Similar to `ChangeBankAccount.tsx`, this form:

1. Validates form data via `validateForm()`
2. Builds the payload in `onSubmit()` and returns it
3. `AppActionForm` dispatches process events (`pse_submit`, `pse_abort`)
4. Kogito process handles the payload when flows are registered
5. Backend determines if HR approval is required

## Future Enhancement

When Kogito flows are registered in the Flow Registry, this form will be triggered via `AppAction` component instead of manual modal open.

## Related Files

- **Constants:** `../employee-record/components/tabs/compensation/constants/compensationFlows.ts`
- **Reasons:** `../employee-record/components/tabs/compensation/constants/benefitDeactivationReasons.ts`
- **Types:** `../employee-record/components/tabs/compensation/types/benefitCatalogTypes.ts`
- **Validation:** `../employee-record/components/tabs/compensation/constants/benefitFormValidation.ts`
