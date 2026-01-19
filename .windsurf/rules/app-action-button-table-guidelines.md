---
alwaysApply: true
---

# AppActionButton Table Integration Guidelines (Concise)

## Core Rule

Every table component must include AppActionButton as the **FIRST column**.

## Required Imports & Props

```typescript
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface TableProps {
  accessToken: string // REQUIRED
  // ... other props
}
```

## Implementation Patterns

### DataTable (CRM: Account, Lead, Contact, Opportunity)

```typescript
const columns = [
  {
    title: '',
    key: 'actions',
    width: '60px',
    render: (_: any, record: RecordType) => (
      <div className="gba:flex gba:justify-start gba:gap-2">
        <AppActionButton
          data-testid={`${PREFIX}-update-${entity}-button-${record.id}`}
          variant="secondary"
          contextsArray={[FlowContextName.entityContext]}
          externalContextData={{ entityId: record.id }}
          prefixDataTestId={`${PREFIX}-update-${entity}`}
          accessToken={accessToken}
          emptyStateBehavior="disable"
          deferMainContextRequestsUntilClick
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    ),
  },
  // ... other columns
];
```

### Custom Table (Investment Tables)

```tsx
<TableHeader>
  <TableRow>
    <Header className="gba:w-[60px]">ACTIONS</Header>
    {/* ... other headers */}
  </TableRow>
</TableHeader>
<TableBody>
  {records.map((record) => (
    <TableRow key={record.id}>
      <TableCell className="gba:py-4 gba:px-6">
        <div className="gba:flex gba:justify-start gba:gap-2">
          <AppActionButton
            data-testid={`${entity}-update-${type}-button-${record.id}`}
            variant="secondary"
            contextsArray={[FlowContextName.entityContext]}
            externalContextData={{ entityId: record.id }}
            prefixDataTestId={`${entity}-update-${type}`}
            accessToken={accessToken}
            emptyStateBehavior="disable"
            deferMainContextRequestsUntilClick
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </TableCell>
      {/* ... other cells */}
    </TableRow>
  ))}
</TableBody>
```

## Standard Configuration

- **variant**: `"secondary"`
- **emptyStateBehavior**: `"disable"`
- **width**: `'60px'` (DataTable) or `gba:w-[60px]` (Custom)
- **onClick**: `(e) => e.stopPropagation()`
- **position**: First column (index 0)
- **alignment**: `gba:justify-start`

## Entity Context Mapping

```typescript
// CRM Entities
;[FlowContextName.customerLeadEntity][FlowContextName.customerAccountEntity][FlowContextName.customerAccountEntity][ // externalContextData: { leadId } // externalContextData: { accountId } // externalContextData: { contactId }
  FlowContextName.customerOpportunityEntity
][ // externalContextData: { opportunityId }
  // Investment Entities
  FlowContextName.equityInvestmentEntity
][FlowContextName.liquidFundInvestmentEntity][FlowContextName.privateEquityInvestmentEntity][ // externalContextData: { investmentId } // externalContextData: { investmentId } // externalContextData: { investmentId }
  FlowContextName.realEstateInvestmentEntity
] // externalContextData: { investmentId }
```

## ❌ Common Mistakes

- Wrong position (not first column)
- Missing `accessToken` prop
- Wrong alignment (`justify-end` instead of `justify-start`)
- Missing `stopPropagation()` in onClick
- Wrong entity context
- Incorrect width specification

## ✅ Implementation Checklist

- [ ] Import AppActionButton and FlowContextName
- [ ] Add accessToken to props interface
- [ ] Place as first column (index 0)
- [ ] Use correct entity context
- [ ] Set width to 60px
- [ ] Include stopPropagation onClick
- [ ] Update parent to pass accessToken
