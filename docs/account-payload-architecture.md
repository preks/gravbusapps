# Account Payload Architecture

## Overview

The account payload system has been refactored to use existing entity types and field constants directly, eliminating redundant interfaces and aligning with the GraphQL query system.

## Architecture Components

### 1. Base Payload Builder

**Location**: `/src/common/data/relations/payloads/accountPayloads.ts`

The base builder provides core payload generation logic that works across all modules:

```typescript
export const buildAccountPayload = (
  account: Partial<Account>,
  accountFields: Record<string, string> = AccountFields,
  options: { isUpdate?: boolean } = {}
) => {
  // Maps semantic fields to GraphQL names using accountFields
  // Handles empty value exclusion
  // Manages complex arrays (addresses, communicationChannels)
  // Includes ID/version for updates
}
```

**Key Features**:

- Accepts `Partial<Account>` for flexibility
- Uses field constants for module-specific naming
- No `sourceApp` parameter (obsolete)
- Exports `toStringOrUndefined` helper

### 2. CRM Payload Builder

**Location**: `/src/common/data/customer/payloads/customerAccountPayloads.ts`

```typescript
export const buildCustomerAccountPayload = (
  account: Partial<CustomerAccount> & Record<string, any>,
  options: { isUpdate?: boolean } = {}
) => {
  // 1. Call base builder with CustomerAccountFields
  const basePayload = buildAccountPayload(account, CustomerAccountFields, options)

  // 2. Add CRM-specific fields
  // - email, phone, businessKey
  // - salesCampaign, tags, additionalProperties

  return { customerAccount: basePayload }
}
```

### 3. IRM Payload Builder

**Location**: `/src/common/data/investment/payloads/investmentAccountPayloads.ts`

```typescript
export const buildInvestmentAccountPayload = (
  account: Partial<InvestmentAccount> & Record<string, any>,
  options: { isUpdate?: boolean } = {}
) => {
  // 1. Call base builder with InvestmentAccountFields
  const basePayload = buildAccountPayload(account, InvestmentAccountFields, options)

  // 2. Add IRM-specific fields
  // - email, phone, businessKey
  // - mission, geographicPresence, specialty
  // - parentAccount, accountContacts

  return { investmentAccount: basePayload }
}
```

## Field Mapping System

### How Field Constants Work

The field constants handle module-specific naming differences:

#### Base Constants

```typescript
// /common/data/relations/types/accountTypes.ts
export const AccountFields = {
  industryClassRef: 'industryClassRef', // IRM name
  companySizeRef: 'companySizeRef', // IRM name
  accountAnnualRevenueBandRef: 'accountAnnualRevenueBandRef' // IRM name
  // ... other fields
} as const
```

#### CRM Constants (Override Base)

```typescript
// /common/data/customer/types/customerAccountTypes.ts
export const CustomerAccountFields = {
  ...AccountFields,
  // Override with CRM-specific GraphQL names
  industryClassRef: 'industryRef', // CRM uses industryRef
  companySizeRef: 'numberOfEmployeesRef', // CRM uses numberOfEmployeesRef
  accountAnnualRevenueBandRef: 'annualRevenueRef', // CRM uses annualRevenueRef
  picture: 'pictureUrl', // CRM uses pictureUrl
  pictureThumbnail: 'pictureThumbnailUrl' // CRM uses pictureThumbnailUrl
} as const
```

#### IRM Constants (Use Base)

```typescript
// /common/data/investment/types/investmentAccountTypes.ts
export const InvestmentAccountFields = {
  ...AccountFields,
  // Override navigation property names only
  accountContacts: 'investmentAccountContact',
  activities: 'investmentActivity'
  // ... IRM keeps base catalog field names (industryClassRef, etc.)
} as const
```

### Example: Industry Field Mapping

**Semantic Field**: `industryClassRef` (used in interfaces)

**Mapping**:

- **CRM**: `CustomerAccountFields.industryClassRef` → `"industryRef"` (GraphQL)
- **IRM**: `InvestmentAccountFields.industryClassRef` → `"industryClassRef"` (GraphQL)

**Result**:

```typescript
// CRM Form submission
buildCustomerAccountPayload({
  industryClassRef: 'Industry:v1:TECH'
})
// Payload: { industryRef: 'Industry:v1:TECH' }

// IRM Form submission
buildInvestmentAccountPayload({
  industryClassRef: 'Industry:v1:TECH'
})
// Payload: { industryClassRef: 'Industry:v1:TECH' }
```

## Form Integration

### How Forms Use Payload Builders

Forms can pass their data structures directly to payload builders:

```typescript
// CRM Account Form
const handleSubmit = async () => {
  // 1. Build complex arrays
  const communicationChannels = buildCommunicationChannels(formValues)
  const addresses = buildAddresses(formValues)

  // 2. Call payload builder
  const { customerAccount } = buildCustomerAccountPayload(
    {
      ...formValues, // Spread form data
      communicationChannels, // Add computed arrays
      addresses
    },
    { isUpdate: !!formValues.id }
  )

  // 3. Add form-specific associations
  const payload = {
    account: {
      ...customerAccount,
      accountContacts: buildAccountContacts(formValues.contactIds)
    },
    changeMode: formValues.id ? 'UPDATE' : 'INSERT'
  }

  // 4. Submit
  dispatchProcessContinueEvent('pse_submit', payload)
}
```

### Type Safety

Forms benefit from TypeScript type checking:

```typescript
// ✅ Type-safe: Uses Partial<CustomerAccount>
buildCustomerAccountPayload({
  name: 'ACME Corp',
  industryClassRef: 'Industry:v1:TECH',
  ownerEmployeeId: 'employee-uuid'
})

// ✅ Also accepts Record<string, any> for form-specific fields
buildCustomerAccountPayload({
  ...formValues,
  email: 'contact@acme.com', // Form-specific field
  salesCampaignId: 'campaign-uuid' // CRM-specific field
})
```

## Comparison: Old vs New Architecture

### Old Architecture (Removed)

```typescript
// ❌ Old: Redundant form interface
export interface BaseAccountFormData {
  accountName?: string // Semantic name
  industry?: string // Semantic name
  companySize?: string // Semantic name
  annualRevenue?: string // Semantic name
}

// ❌ Old: Manual field mapping constant
export const AccountFieldMapping = {
  crm: {
    industry: 'industryRef',
    companySize: 'numberOfEmployeesRef'
  },
  irm: {
    industry: 'industryClassRef',
    companySize: 'companySizeRef'
  }
}

// ❌ Old: Payload builder needed sourceApp parameter
export const buildCustomerAccountPayload = (
  formData: CustomerAccountFormData,
  options: { isUpdate?: boolean; sourceApp?: string } = {}
) => {
  const payload: any = { sourceApp: options.sourceApp || 'CRM' }
  // Manual field mapping logic...
}
```

### New Architecture (Current)

```typescript
// ✅ New: Use existing entity interfaces
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'

// ✅ New: Use existing field constants
import { CustomerAccountFields } from '@/common/data/customer/types/customerAccountTypes'

// ✅ New: Clean payload builder without sourceApp
export const buildCustomerAccountPayload = (
  account: Partial<CustomerAccount> & Record<string, any>,
  options: { isUpdate?: boolean } = {}
) => {
  // Delegate to base builder with field constants
  const basePayload = buildAccountPayload(account, CustomerAccountFields, options)

  // Add module-specific fields
  if (account.salesCampaignId !== undefined) {
    basePayload.salesCampaign = toStringOrUndefined(account.salesCampaignId)
  }

  return { customerAccount: basePayload }
}
```

## Benefits of New Architecture

### 1. Eliminates Redundancy

- **Before**: `BaseAccountFormData`, `CustomerAccountFormData`, `InvestmentAccountFormData`, `AccountFieldMapping`
- **After**: Use existing `CustomerAccount`, `InvestmentAccount`, `CustomerAccountFields`, `InvestmentAccountFields`

### 2. Aligns with Query System

- Payload builders now use the same types and field constants as GraphQL queries
- Single source of truth for field names
- Easier to maintain and refactor

### 3. Cleaner Code

- Removed `sourceApp` parameter (obsolete)
- No manual field mapping logic
- Field constants handle all naming differences

### 4. Better Type Safety

- Direct use of entity interfaces
- TypeScript can verify field names
- Partial types provide flexibility

### 5. Easier to Extend

- Add new fields to entity interfaces
- Update field constants if needed
- Module-specific builders automatically inherit base fields

## Migration Guide

### For Existing Forms

**No changes required!** Forms already using the payload builders will continue to work because:

1. Payload builders accept `Partial<>` types
2. Forms can spread their data: `{ ...formValues }`
3. `Record<string, any>` allows form-specific fields

### For New Forms

Use the payload builders directly:

```typescript
import { buildCustomerAccountPayload } from '@/common/data/customer/payloads'

const handleSubmit = async () => {
  const { customerAccount } = buildCustomerAccountPayload(
    {
      name: formValues.accountName,
      industryClassRef: formValues.industry,
      companySizeRef: formValues.companySize,
      ownerEmployeeId: formValues.owner,
      addresses: buildAddresses(formValues),
      communicationChannels: buildCommunicationChannels(formValues)
    },
    { isUpdate: !!formValues.id }
  )

  dispatchProcessContinueEvent('pse_submit', { customerAccount })
}
```

## Key Takeaways

1. **Use entity types directly** - No need for separate form interfaces
2. **Field constants handle naming** - Module-specific overrides work automatically
3. **Partial types provide flexibility** - Forms can pass whatever fields they have
4. **No sourceApp needed** - Module identity is implicit in the payload wrapper
5. **Consistent with queries** - Same types and constants throughout the system

## Files Changed

- ✅ `/src/common/data/relations/payloads/accountPayloads.ts` - Base builder
- ✅ `/src/common/data/customer/payloads/customerAccountPayloads.ts` - CRM builder
- ✅ `/src/common/data/investment/payloads/investmentAccountPayloads.ts` - IRM builder
- ⏳ Forms continue to work without changes (backward compatible)
