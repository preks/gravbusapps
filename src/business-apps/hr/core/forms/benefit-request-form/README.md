# Benefit Request Form

## Overview

This form allows employees to request new benefits from the available benefits catalog.

## Component

**Main Component:** `BenefitRequestScreen.tsx`

## Purpose

- Request a new employee benefit
- Select benefit provider from available options
- Specify expected yearly value (optional)
- Set preferred start date
- Provide justification for the request

## Kogito Integration

**Status:** 🚧 Placeholder - Flow not yet implemented

- **Flow Name:** `requestEmployeeBenefit`
- **Domain:** `human-resources`
- **Approval:** Required (manager approval)

## Props

```typescript
interface BenefitRequestScreenProps extends BusinessAppContextProps {
  t: (key: string, params?: any) => string // Translation function
  isOpen: boolean // Controls form visibility
  onClose: () => void // Close callback
  benefit: BenefitCatalogItem // Benefit to request
  employeeId: string // Employee making request
  onSuccess?: () => void // Success callback
}
```

## Usage

```typescript
import BenefitRequestScreen from '@/business-apps/hr/core/forms/benefit-request-form'

<BenefitRequestScreen
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

1. **Benefit Type** (Read-only) - Shows selected benefit
2. **Provider** (Required) - Select from available providers
3. **Expected Yearly Value** (Optional) - Estimated benefit value
4. **Preferred Start Date** (Required) - When benefit should start
5. **Justification** (Required) - Reason for requesting benefit (min 20 chars)

## Validation

- Provider must be selected
- Start date must be in the future
- Justification must be between 20-500 characters

## Integration

- Uses `AppActionForm` component pattern
- Builds payload and returns it from `onSubmit`
- AppActionForm handles process events via `dispatchProcessContinueEvent`
- Validation via `validateForm()` function
- Automatic loading/error state management

## File Structure

```
benefit-request-form/
├── BenefitRequestScreen.tsx      ← Main component
├── index.ts                      ← Exports
└── README.md                     ← This file
```

## How It Works

Similar to `ChangeBankAccount.tsx`, this form:

1. Validates form data via `validateForm()`
2. Builds the payload in `onSubmit()` and returns it
3. `AppActionForm` dispatches process events (`pse_submit`, `pse_abort`)
4. Kogito process handles the payload when flows are registered

## Future Enhancement

When Kogito flows are registered in the Flow Registry, this form will be triggered via `AppAction` component instead of manual modal open.

## Related Files

- **Constants:** `../employee-record/components/tabs/compensation/constants/compensationFlows.ts`
- **Types:** `../employee-record/components/tabs/compensation/types/benefitCatalogTypes.ts`
- **Validation:** `../employee-record/components/tabs/compensation/constants/benefitFormValidation.ts`
