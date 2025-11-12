# Grant Employee Bonus Form - Implementation Plan

## Overview

This document outlines the comprehensive plan to implement the `grant-employee-bonus` form following the exact patterns from the working `change-personal-data` form.

## Reference Form Analysis: `change-personal-data`

### Key Patterns Identified:

1. **Context Provider Pattern**
   - Uses React Context for data management
   - Fetches employee data first, then catalogs in background
   - Provides `isLoading`, `error`, `refetch` states
   - Extracts `employeeId` from `additionalData` or `userInfo`

2. **AppActionForm Integration**
   - Wraps form content in `AppActionForm` component
   - Uses `processType="update"` for update operations
   - Event types: `submitEventType="pse_submit"`, `cancelEventType="pse_abort"`
   - Handles form submission and process event dispatching

3. **React Hook Form Setup**
   - Uses `useForm` with `defaultValues` and `mode: 'onChange'`
   - Normalizes default values to match Select option types (string IDs)
   - Tracks initial values for change detection
   - Implements `isSubmitDisabled` based on form validity and change detection

4. **Component Structure**
   - Main component wrapped in `LocalizationProvider`
   - Uses `FormHeader` with flow icon
   - Groups related fields into separate components
   - Uses `@newwork/nw-design-system` components exclusively

5. **Form Field Patterns**
   - Uses `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`
   - Select components use catalog entries with proper value normalization
   - Input components use proper placeholders and validation
   - All fields have `data-testid` attributes

6. **Data Submission**
   - `onSubmit` handler transforms form values to process payload
   - Payload includes `event` field matching `submitEventType`
   - Includes both new and old data for comparison (if needed)
   - Handles file uploads in `handlePreSubmit` if needed

## Implementation Checklist

### ✅ Phase 1: Context & Data Layer (COMPLETED - Needs Verification)

#### GrantEmployeeBonusContext.tsx

- [x] Context provider created
- [x] Employee ID extraction logic
- [x] GraphQL client setup
- [x] Data fetching with error handling
- [ ] **VERIFY**: Employee data query includes all needed fields
- [ ] **VERIFY**: Catalog queries match expected structure
- [ ] **VERIFY**: Error handling matches reference pattern

#### GrantEmployeeBonusQueries.ts

- [x] EMPLOYEE_DATA_QUERY exists
- [x] CATALOG_DATA_QUERY exists
- [ ] **VERIFY**: Employee query includes: `id`, `employeeId`, `firstName`, `lastName`, `displayName`
- [ ] **VERIFY**: Catalog queries for `bonusType` and `currency` are correct
- [ ] **VERIFY**: Catalog queries use proper locale filtering

#### types.ts

- [x] Form values interface defined
- [x] Context data interfaces defined
- [ ] **VERIFY**: `GrantEmployeeBonusFormValues` matches all form fields
- [ ] **VERIFY**: Catalog entry structure matches reference pattern
- [ ] **VERIFY**: Employee data response structure is correct

### 🔄 Phase 2: Main Form Component (IN PROGRESS)

#### GrantEmployeeBonus.tsx - Required Updates

1. **Import Structure**

   ```typescript
   - Add: useForm from react-hook-form
   - Add: AppActionForm from '@/components/app-action-form/AppActionForm'
   - Add: FormField, FormItem, etc. from @newwork/nw-design-system
   - Add: GrantEmployeeBonusProvider, useGrantEmployeeBonus
   - Add: formatDateToISO from windowUtils
   - Add: flowIconUrl from assets
   ```

2. **Component Wrapper Pattern**

   ```typescript
   export const GrantEmployeeBonus: React.FC<BusinessAppContextProps> = context => {
     const locale = useMemo(() => getCurrentActiveUserLocale(), [])
     return (
       <LocalizationProvider locale={locale as any}>
         <GrantEmployeeBonusProvider {...context}>
           <GrantEmployeeBonusContent {...context} />
         </GrantEmployeeBonusProvider>
       </LocalizationProvider>
     )
   }
   ```

3. **Form Setup**
   - [ ] Extract employee data from context
   - [ ] Extract catalog data (bonusType, currency)
   - [ ] Create `defaultValues` with proper normalization
   - [ ] Initialize `useForm` with defaultValues
   - [ ] Create normalized defaults for Select components
   - [ ] Implement change detection logic
   - [ ] Track initial values with `useRef`

4. **AppActionForm Integration**
   - [ ] Wrap form content in `AppActionForm`
   - [ ] Set `processType="update"` (or "create" if new bonus)
   - [ ] Set `submitEventType="pse_submit"`
   - [ ] Set `cancelEventType="pse_abort"`
   - [ ] Implement `onSubmit` handler with payload structure
   - [ ] Set `isSubmitDisabled` based on form validity and changes
   - [ ] Add proper `data-testid` attributes

5. **Form Layout**
   - [ ] Add `FormHeader` with title and flow icon
   - [ ] Create form field groups component
   - [ ] Use proper spacing and layout classes
   - [ ] Ensure responsive design

### 📝 Phase 3: Form Field Components (TODO)

#### Create: components/BonusDetailsGroup.tsx

**Required Fields:**

1. **employeeBonusTypeRef** (Select)
   - Catalog: `bonusType` from EmployeeBonusType catalog
   - Required: Yes
   - Placeholder: "Please Select"
   - data-testid: `grant-employee-bonus-type-select`

2. **amount** (Input - Number)
   - Type: number
   - Required: Yes
   - Validation: Must be > 0
   - Placeholder: "Please Enter"
   - data-testid: `grant-employee-bonus-amount-input`

3. **currencyRef** (Select)
   - Catalog: `currency` from Currency catalog
   - Required: Yes
   - Placeholder: "Please Select"
   - data-testid: `grant-employee-bonus-currency-select`

4. **paymentDate** (DateInput)
   - Type: date
   - Required: Yes
   - Validation: Must be valid date, not in past (if applicable)
   - Placeholder: "Please Select"
   - data-testid: `grant-employee-bonus-payment-date-input`

5. **fiscalYear** (Input - Number)
   - Type: number
   - Required: Yes
   - Validation: Must be valid year (e.g., 2024, 2025)
   - Placeholder: "Please Enter"
   - data-testid: `grant-employee-bonus-fiscal-year-input`

6. **description** (Input - Text)
   - Type: string
   - Required: No (optional)
   - Placeholder: "Please Enter"
   - data-testid: `grant-employee-bonus-description-input`

7. **notes** (Textarea - if available, otherwise Input)
   - Type: string
   - Required: No (optional)
   - Placeholder: "Please Enter"
   - data-testid: `grant-employee-bonus-notes-input`

**Component Structure:**

```typescript
interface BonusDetailsGroupProps {
  control: Control<GrantEmployeeBonusFormValues>
  catalogs: {
    bonusType?: CatalogEntry[]
    currency?: CatalogEntry[]
  }
}

const BonusDetailsGroup: React.FC<BonusDetailsGroupProps> = ({ control, catalogs }) => {
  // Component implementation following NamesGroup pattern
}
```

### 🔧 Phase 4: Form Logic & Validation (TODO)

1. **Default Values Normalization**

   ```typescript
   const normalizedDefaults: GrantEmployeeBonusFormValues = useMemo(() => {
     const toIdString = (val: any) => (val === null || val === undefined || val === '' ? null : String(val))
     const findId = (list: CatalogEntry[] | undefined, current: any) => {
       // Match reference pattern from change-personal-data
     }

     return {
       employeeBonusTypeRef: findId(catalogs.bonusType, defaultValues.employeeBonusTypeRef),
       currencyRef: findId(catalogs.currency, defaultValues.currencyRef)
       // ... other fields
     }
   }, [defaultValues, catalogs])
   ```

2. **Change Detection**

   ```typescript
   const normalizeForCompare = (v: GrantEmployeeBonusFormValues) => ({
     employeeBonusTypeRef: v.employeeBonusTypeRef || null,
     amount: v.amount || null
     // ... normalize all fields
   })

   const watchedValues = form.watch()
   const isUnchangedNow = useMemo(() => {
     return (
       JSON.stringify(normalizeForCompare(watchedValues)) === JSON.stringify(normalizeForCompare(initialRef.current))
     )
   }, [watchedValues])
   ```

3. **Form Validation Rules**
   - Required fields: `employeeBonusTypeRef`, `amount`, `currencyRef`, `paymentDate`, `fiscalYear`
   - Amount validation: Must be > 0, numeric
   - Fiscal year validation: Must be valid year (4 digits, reasonable range)
   - Date validation: Must be valid date format

### 📤 Phase 5: Submission Handler (TODO)

#### onSubmit Payload Structure

```typescript
onSubmit={async (values: GrantEmployeeBonusFormValues) => {
  const payload = {
    event: 'pse_submit',
    employeeBonus: {
      employeeId: employee?.employeeId || employee?.id || '',
      employeeBonusTypeRef: values.employeeBonusTypeRef || '',
      amount: values.amount || 0,
      currencyRef: values.currencyRef || '',
      paymentDate: values.paymentDate ? formatDateToISO(new Date(values.paymentDate)) : '',
      fiscalYear: values.fiscalYear || new Date().getFullYear(),
      description: values.description || '',
      notes: values.notes || ''
    }
  }
  return payload
}}
```

**Key Points:**

- Payload must include `event` field matching `submitEventType`
- Date fields must be formatted using `formatDateToISO`
- Employee ID must be extracted from context data
- All fields should have fallback values

### 🎨 Phase 6: Styling & UX (TODO)

1. **Layout Classes**
   - Container: `gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-full gba:max-w-[800px]`
   - Form content: `gba:flex-1 gba:space-y-4`
   - Field groups: `gba:space-y-4`

2. **Data Test IDs**
   - Main container: `flw_grantEmployeeBonus_screenContentLayout`
   - Form content: `grant-employee-bonus-form-content`
   - Form wrapper: `grant-employee-bonus`
   - Each field: `grant-employee-bonus-{field-name}-{input|select|label}`

3. **Accessibility**
   - All form fields must have proper labels
   - Required fields marked with asterisk
   - Error messages displayed via `FormMessage`
   - Proper placeholder text

### ✅ Phase 7: Testing Checklist (TODO)

- [ ] Form loads with employee data
- [ ] Catalogs load correctly (bonusType, currency)
- [ ] Default values populate correctly
- [ ] Form validation works (required fields, number validation)
- [ ] Change detection disables submit when unchanged
- [ ] Submit button disabled when form invalid
- [ ] Cancel button dispatches `pse_abort` event
- [ ] Submit dispatches `pse_submit` event with correct payload
- [ ] Date formatting works correctly
- [ ] All data-testid attributes present
- [ ] Responsive design works on mobile/tablet
- [ ] Error states display correctly
- [ ] Loading states work correctly

## Critical Implementation Details

### Employee ID Extraction

```typescript
const employeeId: string | undefined = useMemo(() => {
  return (
    additionalData?.psi_taskPayload?.employeeId ||
    additionalData?.psi_taskPayload?.initialParameters?.employeeId ||
    additionalData?.employeeId ||
    userInfo?.employeeDetails?.employeeId
  )
}, [additionalData, userInfo])
```

### Catalog Value Display

```typescript
import { getCatalogValue } from '@/common/utils/windowUtils'

// In SelectItem:
{
  getCatalogValue(entry)
}
```

### Date Handling

```typescript
import { formatDateToISO } from '@/common/utils/windowUtils'

// For submission:
paymentDate: values.paymentDate ? formatDateToISO(new Date(values.paymentDate)) : ''
```

### Form Reset Pattern

```typescript
useEffect(() => {
  form.reset(normalizedDefaults)
}, [normalizedDefaults])
```

## Files to Create/Update

### Create:

- `components/BonusDetailsGroup.tsx` - Form field group component

### Update:

- `GrantEmployeeBonus.tsx` - Main form component (major update)
- `GrantEmployeeBonusContext.tsx` - Verify data fetching
- `GrantEmployeeBonusQueries.ts` - Verify queries
- `types.ts` - Verify type definitions
- `index.ts` - Verify exports

## Next Steps

1. **Immediate**: Review and verify existing context/queries/types
2. **Priority 1**: Update GrantEmployeeBonus.tsx with AppActionForm integration
3. **Priority 2**: Create BonusDetailsGroup.tsx component
4. **Priority 3**: Implement form validation and change detection
5. **Priority 4**: Implement submission handler
6. **Priority 5**: Add all data-testid attributes
7. **Priority 6**: Test all functionality

## Reference Files

- **Working Example**: `src/business-apps/hr/core/forms/change-personal-data/`
- **AppActionForm**: `src/components/app-action-form/AppActionForm.tsx`
- **FormHeader**: `src/business-apps/hr/core/forms/components/FormHeader.tsx`
- **Process Utils**: `src/common/utils/processEventUtils.ts`
