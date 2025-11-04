# Compensation Benefits Flow Integration Guide

## Overview

The Benefits modals (`RequestBenefitModal` and `DeactivateBenefitModal`) have been refactored to use the **AppActionForm** component pattern, following codebase conventions. This guide explains how to complete the Kogito Flow Registry integration when the backend flows are ready.

---

## Current Implementation Status

### ✅ **Completed**

- [x] Modals wrapped in `AppActionForm` component
- [x] Validation extracted to `validateForm` functions
- [x] Process start logic in `onSubmit` handlers
- [x] Placeholder flow names defined in constants
- [x] Manual button triggers working

### 🚧 **Pending (When Backend Flows Are Ready)**

- [ ] Register flows in Kogito Flow Registry
- [ ] Update flow names in constants (if they change)
- [ ] Add flow context types to FlowRegistryTypes
- [ ] Replace manual button triggers with AppAction components
- [ ] Test end-to-end flow execution

---

## Flow Configuration

### Flow Constants

Located in: `constants/compensationFlows.ts`

```typescript
// Request Benefit Flow
export const REQUEST_BENEFIT_FLOW = 'requestEmployeeBenefit'

// Deactivate Benefit Flow
export const DEACTIVATE_BENEFIT_FLOW = 'deactivateEmployeeBenefit'

// Domain
export const COMPENSATION_FLOW_DOMAIN = 'human-resources'
```

### Current Payloads

#### **Request Benefit Payload**

```typescript
{
  employeeId: string
  benefitTypeRef: string // Catalog ID
  benefitProviderRef: string // Catalog ID
  yearlyAmount: number
  currencyRef: string // e.g., "Currency:v1:EUR"
  startDate: string // ISO date
  justification: string
  requestedBy: string // Employee ID
  requestDate: string // ISO date
  status: 'PENDING'
}
```

#### **Deactivate Benefit Payload**

```typescript
{
  employeeBenefitId: string
  employeeId: string
  benefitType: string
  deactivationReason: string
  effectiveEndDate: string // ISO date
  requestedBy: string // Employee ID
  requestDate: string // ISO date
}
```

---

## Step-by-Step Integration Guide

### **Step 1: Backend Flow Implementation**

Ensure the following Kogito flows are implemented in the backend:

1. **`requestEmployeeBenefit`** (Domain: `human-resources`)
   - Approval flow: Manager approval required
   - Outcome: Creates EmployeeBenefit record
   - Notifications: Employee, Manager

2. **`deactivateEmployeeBenefit`** (Domain: `human-resources`)
   - Approval flow: Conditional (based on benefit type/value)
   - Outcome: Updates EmployeeBenefit status to INACTIVE
   - Notifications: Employee, HR (if approval required)

---

### **Step 2: Register Flows in FlowRegistryTypes**

**File:** `src/common/types/constants/FlowRegistryTypes.ts`

Add new flow context names:

```typescript
export enum FlowContextName {
  // ... existing contexts

  // Compensation flows
  requestEmployeeBenefit = 'requestEmployeeBenefit',
  deactivateEmployeeBenefit = 'deactivateEmployeeBenefit'
}
```

---

### **Step 3: Update Flow Names (if needed)**

If the backend flow names differ from the placeholders, update:

**File:** `constants/compensationFlows.ts`

```typescript
// Update these if backend uses different names
export const REQUEST_BENEFIT_FLOW = 'actualBackendFlowName'
export const DEACTIVATE_BENEFIT_FLOW = 'actualBackendFlowName'
```

---

### **Step 4: Replace Manual Triggers with AppAction**

Currently, the modals are triggered by regular buttons. When flows are registered, replace the trigger buttons in `BenefitCatalogCard.tsx`:

#### **Current Implementation (Manual):**

```tsx
<Button onClick={() => onRequest(benefit.catalogId)}>{t('benefit-request-button')}</Button>
```

#### **Future Implementation (AppAction):**

```tsx
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/constants/FlowRegistryTypes'

// For Request Benefit
<AppAction
  contextsArray={[FlowContextName.requestEmployeeBenefit]}
  externalContextData={{
    benefitId: benefit.catalogId,
    employeeId: employeeId
  }}
  prefixDataTestId="benefit-catalog-request"
  accessToken={accessToken}
  emptyStateBehavior="enable"
>
  <Button variant="default">
    {t('benefit-request-button')}
  </Button>
</AppAction>

// For Deactivate Benefit
<AppAction
  contextsArray={[FlowContextName.deactivateEmployeeBenefit]}
  externalContextData={{
    employeeBenefitId: benefit.employeeBenefitId,
    employeeId: employeeId
  }}
  prefixDataTestId="benefit-catalog-deactivate"
  accessToken={accessToken}
  emptyStateBehavior="enable"
>
  <Button variant="destructive">
    {t('benefit-deactivate-button')}
  </Button>
</AppAction>
```

---

### **Step 5: Test Flow Execution**

#### **Test Scenarios:**

**Request Benefit Flow:**

1. ✅ Employee can select benefit and provider
2. ✅ Form validation works correctly
3. ✅ Process starts successfully
4. ✅ Manager receives approval notification
5. ✅ Approval/rejection updates benefit status
6. ✅ Employee receives outcome notification

**Deactivate Benefit Flow:**

1. ✅ Employee can select deactivation reason
2. ✅ "Other" reason requires details
3. ✅ Form validation works correctly
4. ✅ Process starts successfully
5. ✅ Conditional approval triggers when needed
6. ✅ Benefit status updates to INACTIVE
7. ✅ Employee receives confirmation

---

## Architecture Benefits

### **Why AppActionForm?**

✅ **Consistency:** Matches codebase patterns (see `ChangeProfilePictureScreen.tsx`)  
✅ **Automatic Loading:** No manual `isSubmitting` state management  
✅ **Standardized Validation:** Clear separation via `validateForm` function  
✅ **Error Handling:** Automatic error display and recovery  
✅ **Process Events:** Proper integration with Kogito lifecycle  
✅ **Testing:** Standardized test IDs and structure

### **Why AppAction (Future)?**

✅ **Dynamic Actions:** Automatically shows/hides based on flow availability  
✅ **Context Awareness:** Uses employee/benefit context from registry  
✅ **Permissions:** Respects user permissions from backend  
✅ **Consistent UX:** Matches all other flow triggers in the platform

---

## Key Files to Update

When flows are ready, update these files:

| File                                              | Action                          | Priority |
| ------------------------------------------------- | ------------------------------- | -------- |
| `constants/compensationFlows.ts`                  | Update flow names if changed    | High     |
| `src/common/types/constants/FlowRegistryTypes.ts` | Add flow context enums          | High     |
| `BenefitCatalogCard.tsx`                          | Replace Button with AppAction   | Medium   |
| `BenefitsPerksSection.tsx`                        | Update modal trigger logic      | Medium   |
| Tests                                             | Add integration tests for flows | Low      |

---

## Troubleshooting

### **Issue: Process Not Starting**

- ✅ Check flow names match backend exactly
- ✅ Verify domain is correct (`human-resources`)
- ✅ Check payload structure matches backend expectations
- ✅ Verify `skipScreen: true` is set correctly

### **Issue: Validation Errors Not Showing**

- ✅ Ensure `validateForm` returns `string[]` or `null`
- ✅ Check translation keys exist in i18n files
- ✅ Verify `isFormValid` logic matches `validateForm`

### **Issue: Modal Not Closing After Submit**

- ✅ Check `onSuccess` callback is defined
- ✅ Verify `onClose()` is called in `handleSuccess`
- ✅ Ensure process completes successfully

---

## Questions?

Contact the development team or refer to:

- **AppActionForm:** `src/components/app-action-form/AppActionForm.tsx`
- **AppAction:** `src/components/app-action/AppAction.tsx`
- **Example:** `src/business-apps/hr/core/forms/change-profile-picture/ChangeProfilePictureScreen.tsx`

---

**Last Updated:** November 2025  
**Status:** 🚧 Ready for Flow Registry Integration
