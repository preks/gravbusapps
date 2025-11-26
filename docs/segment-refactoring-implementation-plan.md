# Form Segments & Layouts Refactoring Implementation Plan

## Overview

This document tracks the refactoring of form segments from nested structure to flat structure with separate layouts.

## Goal

- **Flat Segments**: All segments at same level, no Main/Sub hierarchy
- **Form Layouts**: Separate layout components that compose segments
- **Replace**: ContactList/AccountList with Select components
- **customFields**: Every segment accepts customFields prop
- **customSegments**: Every layout accepts customSegments array

## Progress Tracking

### Phase 1: Create Flat Segment Structure ✅ STARTED

#### 1.1 Account Segments

- [x] `account-information-segment/` - Created with ContactSelect integration
  - [x] AccountInformationSegment.tsx
  - [x] \_i18n/ (en-US, de-DE, ro-RO)
  - [x] index.ts
- [ ] `account-details-segment/` - Rename from FinancialInfoSegment
  - [ ] AccountDetailsSegment.tsx (was FinancialInfoSegment)
  - [ ] \_i18n/
  - [ ] index.ts

#### 1.2 Contact Segments

- [ ] `contact-information-segment/` - Move with AccountSelect integration
  - [ ] ContactInformationSegment.tsx (replace AccountList with AccountSelect)
  - [ ] \_i18n/
  - [ ] index.ts
- [ ] `contact-details-segment/` - Rename from PersonalInformationSegment
  - [ ] ContactDetailsSegment.tsx (was PersonalInformationSegment from contact-segment)
  - [ ] \_i18n/
  - [ ] index.ts

#### 1.3 Opportunity Segments

- [ ] `opportunity-information-segment/` - Move
  - [ ] OpportunityInformationSegment.tsx (already uses AccountSelect/ContactSelect)
  - [ ] \_i18n/
  - [ ] index.ts
- [ ] `opportunity-details-segment/` - Rename from AmountDateSegment
  - [ ] OpportunityDetailsSegment.tsx (was AmountDateSegment)
  - [ ] \_i18n/
  - [ ] index.ts
- [ ] `opportunity-pipeline-segment/` - Rename from PipelineStageSegment
  - [ ] OpportunityPipelineSegment.tsx (was PipelineStageSegment)
  - [ ] \_i18n/
  - [ ] index.ts

#### 1.4 Lead Segments

- [ ] `lead-information-segment/` - Move
  - [ ] LeadInformationSegment.tsx
  - [ ] \_i18n/
  - [ ] index.ts
- [ ] `lead-company-segment/` - Rename from CompanyInformationSegment
  - [ ] LeadCompanySegment.tsx (was CompanyInformationSegment)
  - [ ] \_i18n/
  - [ ] index.ts
- [ ] `lead-person-segment/` - Rename from PersonalInformationSegment (lead)
  - [ ] LeadPersonSegment.tsx (was PersonalInformationSegment from lead-segment)
  - [ ] \_i18n/
  - [ ] index.ts

#### 1.5 Shared Segments

- [ ] `address-segment/` - Move from account-segment
  - [ ] AddressSegment.tsx
  - [ ] \_i18n/
  - [ ] index.ts
- [ ] `communication-segment/` - Move from account-segment
  - [ ] CommunicationSegment.tsx
  - [ ] \_i18n/
  - [ ] index.ts

#### 1.6 Lead Convert Segment

- [ ] `lead-convert-segment/` - Keep, but simplify (choices only)
  - [ ] LeadConvertSegment.tsx (only the choices step)
  - [ ] \_i18n/
  - [ ] index.ts
  - [ ] utils/ (move initialValuesUtils, validationUtils)

### Phase 2: Add customFields to ALL Segments

- [ ] account-information-segment
- [ ] account-details-segment
- [ ] contact-information-segment
- [ ] contact-details-segment
- [ ] opportunity-information-segment
- [ ] opportunity-details-segment
- [ ] opportunity-pipeline-segment
- [ ] lead-information-segment
- [ ] lead-company-segment
- [ ] lead-person-segment
- [ ] address-segment
- [ ] communication-segment

Pattern:

```typescript
interface SegmentProps {
  // ... existing props
  customFields?: React.ReactNode
}

// In component render:
{
  /* Custom fields slot */
}
{
  customFields
}
```

### Phase 3: Create Form Layouts

#### 3.1 Account Layout

- [ ] `form-layouts/account-layout/`
  - [ ] AccountLayout.tsx
  - [ ] index.ts
  - [ ] types.ts

Props:

```typescript
interface AccountLayoutProps {
  // Segment props
  businessAppContext?: BusinessAppContextProps
  ownerEmployee?: any
  // ...all segment props

  // Customization
  customFieldsInformation?: React.ReactNode
  customFieldsDetails?: React.ReactNode
  customFieldsCommunication?: React.ReactNode
  customFieldsAddress?: React.ReactNode
  customSegments?: Array<{
    id: string
    title: string
    content: React.ReactNode
  }>
}
```

#### 3.2 Contact Layout

- [ ] `form-layouts/contact-layout/`
  - [ ] ContactLayout.tsx
  - [ ] index.ts
  - [ ] types.ts

#### 3.3 Opportunity Layout

- [ ] `form-layouts/opportunity-layout/`
  - [ ] OpportunityLayout.tsx
  - [ ] index.ts
  - [ ] types.ts

#### 3.4 Lead Layout

- [ ] `form-layouts/lead-layout/`
  - [ ] LeadLayout.tsx
  - [ ] index.ts
  - [ ] types.ts

#### 3.5 Lead Convert Layout

- [ ] `form-layouts/lead-convert-layout/`
  - [ ] LeadConvertLayout.tsx
  - [ ] steps/ (move from lead-convert-segment/segments)
    - [ ] LeadConvertAccountStep.tsx
    - [ ] LeadConvertContactStep.tsx
    - [ ] LeadConvertOpportunityStep.tsx
  - [ ] utils/ (move from lead-convert-segment/utils)
  - [ ] index.ts
  - [ ] types.ts

### Phase 4: Update Forms to Use New Layouts

#### 4.1 CRM Forms

- [ ] src/business-apps/crm/core/forms/account-form/AccountFormComponent.tsx
- [ ] src/business-apps/crm/core/forms/contact-form/ContactFormComponent.tsx
- [ ] src/business-apps/crm/core/forms/opportunity-form/OpportunityFormComponent.tsx
- [ ] src/business-apps/crm/core/forms/lead-form/LeadFormComponent.tsx
- [ ] src/business-apps/crm/core/forms/convert-lead-form/LeadConvertForm.tsx

#### 4.2 IRM Forms

- [ ] src/business-apps/irm/core/forms/account-form/AccountFormComponent.tsx
- [ ] src/business-apps/irm/core/forms/contact-form/ContactFormComponent.tsx
- [ ] src/business-apps/irm/core/forms/opportunity-form/OpportunityFormComponent.tsx
- [ ] src/business-apps/irm/core/forms/lead-form/LeadFormComponent.tsx
- [ ] src/business-apps/irm/core/forms/convert-lead-form/LeadConvertForm.tsx

### Phase 5: Delete Old Segment Wrappers

- [ ] Delete `src/common/components/common-relations/form-segments/account-segment/`
- [ ] Delete `src/common/components/common-relations/form-segments/contact-segment/`
- [ ] Delete `src/common/components/common-relations/form-segments/opportunity-segment/`
- [ ] Delete `src/common/components/common-relations/form-segments/lead-segment/`

### Phase 6: Update All Imports

- [ ] Search for old import paths and replace with new ones
- [ ] Run linter and fix errors
- [ ] Test all forms (CRM & IRM)

## Key Implementation Notes

### ContactList & AccountList Replacement

**OLD Pattern (ContactList)**:

```typescript
<ContactList
  value={accountContacts}
  onChange={onContactsChange}
  contacts={contacts}
  contactsLoading={contactsLoading}
  contactsError={contactsError}
  searchContacts={searchContacts}
  accountContacts={accountContacts}
  onNewContact={onNewContact}
/>
```

**NEW Pattern (ContactSelect)**:

```typescript
<FormField
  control={form.control}
  name="contacts"
  render={({ field, fieldState }) => (
    <FormItem>
      <FormLabel>{t('contacts-label')}</FormLabel>
      <FormControl>
        <ContactSelect
          value={field.value || []}
          onChange={field.onChange}
          contacts={contacts}
          contactsLoading={contactsLoading}
          contactsError={contactsError}
          searchContacts={searchContacts}
          multiple={true}
          dataTestId="contacts-select"
          error={fieldState.error?.message || null}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**OLD Pattern (AccountList)**:

```typescript
<AccountList
  value={accountIds}
  onChange={onAccountsChange}
  accounts={accounts}
  accountsLoading={accountsLoading}
  accountsError={accountsError}
  searchAccounts={searchAccounts}
/>
```

**NEW Pattern (AccountSelect)**:

```typescript
<FormField
  control={form.control}
  name="accounts"
  render={({ field, fieldState }) => (
    <FormItem>
      <FormLabel>{t('accounts-label')}</FormLabel>
      <FormControl>
        <AccountSelect
          value={field.value || []}
          onChange={field.onChange}
          accounts={accounts}
          accountsLoading={accountsLoading}
          accountsError={accountsError}
          searchAccounts={searchAccounts}
          multiple={true}
          dataTestId="accounts-select"
          error={fieldState.error?.message || null}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Layout Pattern

Every layout follows this structure:

```typescript
import { Accordion } from '@newwork/nw-design-system'
import { AccountInformationSegment } from '../form-segments/account-information-segment'
import { AccountDetailsSegment } from '../form-segments/account-details-segment'
import { CommunicationSegment } from '../form-segments/communication-segment'
import { AddressSegment } from '../form-segments/address-segment'

interface AccountLayoutProps {
  // All segment props
  businessAppContext?: BusinessAppContextProps
  // ...

  // Customization slots
  customFieldsInformation?: React.ReactNode
  customFieldsDetails?: React.ReactNode
  customFieldsCommunication?: React.ReactNode
  customFieldsAddress?: React.ReactNode
  customSegments?: Array<{
    id: string
    title: string
    content: React.ReactNode
  }>
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  // destructure all props
  customFieldsInformation,
  customFieldsDetails,
  customFieldsCommunication,
  customFieldsAddress,
  customSegments = []
}) => {
  const [accordionValue, setAccordionValue] = useState<string | string[]>([])

  const accordionItems = useMemo(() => {
    const baseItems = [
      {
        id: 'communication',
        title: 'Communication',
        content: <CommunicationSegment customFields={customFieldsCommunication} />
      },
      {
        id: 'address',
        title: 'Address',
        content: <AddressSegment customFields={customFieldsAddress} />
      },
      {
        id: 'details',
        title: 'Details',
        content: <AccountDetailsSegment customFields={customFieldsDetails} />
      }
    ]

    return [...baseItems, ...customSegments]
  }, [customFieldsDetails, customFieldsCommunication, customFieldsAddress, customSegments])

  return (
    <div data-testid="account-layout">
      <AccountInformationSegment
        businessAppContext={businessAppContext}
        customFields={customFieldsInformation}
        // ... other props
      />

      <Accordion
        className="gba:w-full gba:[&>div[data-slot=accordion-item]]:bg-transparent ..."
        value={accordionValue}
        onValueChange={setAccordionValue}
        items={accordionItems}
      />
    </div>
  )
}
```

## Next Steps

Continue implementation in this order:

1. Complete all segment creation with customFields prop
2. Create all form layouts
3. Update CRM forms
4. Update IRM forms
5. Delete old wrappers
6. Update imports and test

## Files Created So Far

- ✅ `account-information-segment/AccountInformationSegment.tsx`
- ✅ `account-information-segment/_i18n/` (en-US, de-DE, ro-RO)
- ✅ `account-information-segment/index.ts`

## Current Status

**Phase 1.1 in progress** - Creating flat segment structure
**Next**: Complete remaining segments with customFields support
