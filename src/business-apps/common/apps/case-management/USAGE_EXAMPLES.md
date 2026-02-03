# Case Management - Usage Examples

This document provides practical examples of how to integrate the Case Management application into different modules of the platform.

## Example 1: HR Module Integration

Create a new app in the HR module:

**File: `src/business-apps/hr/core/apps/hr-cases/HRCases.tsx`**

```tsx
import React from 'react'
import { BusinessAppContextProps } from '../../../types'
import { CaseManagement } from '../../../common/apps/case-management'

export const HRCases: React.FC<BusinessAppContextProps> = context => {
  return (
    <CaseManagement
      appName="HR Cases"
      appDescription="Manage employee lifecycle and HR-related cases"
      appTag="AppCatalog:1:HR"
      entityTypes={['employee', 'organizationalUnit']}
      showAnalytics={true}
      defaultView="dashboard"
      {...context}
    />
  )
}

export default HRCases
```

**File: `src/business-apps/hr/core/apps/hr-cases/index.ts`**

```tsx
export { HRCases } from './HRCases'
export { default } from './HRCases'
```

## Example 2: Service Desk Integration

**File: `src/business-apps/ser/apps/service-cases/ServiceCases.tsx`**

```tsx
import React from 'react'
import { BusinessAppContextProps } from '../../../types'
import { CaseManagement } from '../../../common/apps/case-management'

export const ServiceCases: React.FC<BusinessAppContextProps> = context => {
  return (
    <CaseManagement
      appName="Service Cases"
      appDescription="IT and business service request cases"
      appTag="AppCatalog:1:SVC"
      allowDelete={false}
      showAnalytics={true}
      {...context}
    />
  )
}

export default ServiceCases
```

## Example 3: Finance Module Integration

**File: `src/business-apps/fin/expenses/apps/expense-cases/ExpenseCases.tsx`**

```tsx
import React from 'react'
import { BusinessAppContextProps } from '../../../../types'
import { CaseManagement } from '../../../../common/apps/case-management'

export const ExpenseCases: React.FC<BusinessAppContextProps> = context => {
  return (
    <CaseManagement
      appName="Expense Cases"
      appDescription="Expense approval and audit cases"
      appTag="AppCatalog:1:FIN_EXPENSE"
      entityTypes={['user', 'organizationalUnit']}
      defaultView="list"
      showAnalytics={true}
      {...context}
    />
  )
}

export default ExpenseCases
```

## Example 4: CRM Module Integration

**File: `src/business-apps/crm/core/apps/crm-cases/CRMCases.tsx`**

```tsx
import React from 'react'
import { BusinessAppContextProps } from '../../../types'
import { CaseManagement } from '../../../common/apps/case-management'

export const CRMCases: React.FC<BusinessAppContextProps> = context => {
  return (
    <CaseManagement
      appName="CRM Cases"
      appDescription="Customer and sales opportunity cases"
      appTag="AppCatalog:1:CRM"
      entityTypes={['user', 'organizationalUnit']}
      showAnalytics={true}
      {...context}
    />
  )
}

export default CRMCases
```

## Example 5: Platform Admin (All Cases)

**File: `src/business-apps/platform/apps/all-cases/AllCases.tsx`**

```tsx
import React from 'react'
import { BusinessAppContextProps } from '../../../types'
import { CaseManagement } from '../../../common/apps/case-management'

export const AllCases: React.FC<BusinessAppContextProps> = context => {
  return (
    <CaseManagement
      appName="All Cases"
      appDescription="Organization-wide case management and oversight"
      appTag="*" // Special: show all cases regardless of tag
      entityTypes={['user', 'employee', 'organizationalUnit']}
      showAnalytics={true}
      allowDelete={true} // Admin can delete
      {...context}
    />
  )
}

export default AllCases
```

## Example 6: Custom Configuration

**Advanced configuration with custom columns and statuses:**

```tsx
import React from 'react'
import { BusinessAppContextProps } from '../../../types'
import { CaseManagement, CaseColumnConfig, StatusOption } from '../../../common/apps/case-management'

const customColumns: CaseColumnConfig[] = [
  { key: 'caseId', label: 'ID', visible: true, sortable: true },
  { key: 'title', label: 'Case Title', visible: true, sortable: true },
  { key: 'status', label: 'Status', visible: true, sortable: true },
  { key: 'priority', label: 'Priority', visible: true, sortable: true },
  { key: 'flowsCount', label: 'Flows', visible: true, sortable: false }
]

const customStatuses: StatusOption[] = [
  { value: 'open', label: 'New', color: 'blue' },
  { value: 'in_progress', label: 'Active', color: 'green' },
  { value: 'blocked', label: 'On Hold', color: 'red' },
  { value: 'completed', label: 'Resolved', color: 'gray' },
  { value: 'cancelled', label: 'Closed', color: 'gray' }
]

export const CustomCaseManagement: React.FC<BusinessAppContextProps> = context => {
  return (
    <CaseManagement
      appName="Custom Cases"
      appDescription="Customized case management"
      appTag="AppCatalog:1:CUSTOM"
      columns={customColumns}
      statusOptions={customStatuses}
      {...context}
    />
  )
}
```

## Example 7: Read-Only Mode

**For reporting or auditing purposes:**

```tsx
<CaseManagement
  appName="Case Reports"
  appDescription="Read-only case reporting and analytics"
  appTag="AppCatalog:1:REPORTS"
  allowCreate={false}
  allowEdit={false}
  allowDelete={false}
  defaultView="list"
  showAnalytics={true}
  {...context}
/>
```

## Testing the Application

### 1. Local Development

```bash
# Start custom-flow-engine backend
cd c:\NEWWORK\Repositories\custom-flow-engine
npm run start:dev

# Start gravity-business-apps frontend
cd c:\NEWWORK\Repositories\gravity-business-apps
npm run dev
```

### 2. Create a Test Case via API

```bash
curl -X POST http://localhost:3000/api/cases \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "initiator": "user123",
    "title": "Test Case",
    "tags": ["AppCatalog:1:HR"]
  }'
```

### 3. Access the Application

Navigate to the module where you integrated the Case Management app:

- HR: `/hr?view=cases` (or wherever you mount it)
- Service Desk: `/services?view=cases`
- Platform: `/platform/cases`

## Troubleshooting

### Cases Not Showing

1. Check that `appTag` matches the tags on your cases
2. Verify the backend API is running
3. Check browser console for API errors
4. Verify access token is valid

### Flow Addition Fails

1. Check that template ID exists in the backend
2. Verify template has the matching app tag
3. Check backend logs for validation errors

### Analytics Not Loading

1. Backend analytics endpoint may not be implemented yet
2. Check console for warnings
3. Fallback to mock data is provided

## Best Practices

1. **Always provide a unique `appTag`** for each module to ensure proper isolation
2. **Use descriptive `appName` and `appDescription`** for better UX
3. **Set appropriate feature flags** based on module requirements
4. **Customize entity types** based on what makes sense for your module
5. **Test with real backend** before deploying to production

## Migration Guide

If you have existing case management code, follow these steps:

1. Replace custom case list components with `CaseManagement`
2. Update props to match `CaseManagementProps` interface
3. Remove duplicate API client code
4. Update tag filtering to use `appTag` prop
5. Test thoroughly before removing old code

## Support

For questions or issues:

- Check the [main README](./README.md)
- Review the [Custom Flow Engine docs](../../../../custom-flow-engine/README.md)
- Check [nw-design-system documentation](../../../../nw-design-system/README.md)
