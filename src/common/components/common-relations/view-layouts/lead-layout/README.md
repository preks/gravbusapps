# LeadLayout - Context-Agnostic Lead View Component

A configurable, context-agnostic layout component for displaying Lead data in both customer relations (CRM) and investment relations (IRM) contexts.

## Features

- **Context-Agnostic**: Works with both Customer Leads and Investment Leads
- **DataDisplay Integration**: Built on top of `@newwork/nw-design-system` DataDisplay component
- **Configurable**: Uses a config-based approach for maximum flexibility
- **Shared Config**: Provides base column and filter configurations that can be extended by consumers
- **Filter Support**: Dynamic filter options loaded from catalogs and GraphQL
- **Search & Sort**: Full search and sorting capabilities
- **Process Integration**: Handles process completion events for data refresh
- **Row Actions**: Configurable row actions via AppActionMenu

## Architecture

```
lead-layout/
├── LeadLayout.tsx          # Main layout component with DataDisplay
├── LeadListLayout.tsx      # DataTable wrapper for list view
├── LeadLayoutHelpers.tsx   # Helper components (DefaultLeadRowActions)
├── config/
│   ├── leadColumns.tsx     # Shared column definitions
│   ├── leadFilters.ts      # Shared filter configuration
│   └── index.ts
├── utils/
│   └── queryHelpers.ts     # Query building utilities
└── index.ts
```

## Usage

### Customer Relations (CRM) Example

```typescript
// customer-relations/views/lead-view/LeadView.tsx
import { useMemo } from 'react'
import { LeadLayout, type LeadViewConfig } from '@/common/components/common-relations/view-layouts/lead-layout'
import { useCustomerLeads } from '@/common/data/customer/hooks/useCustomerLeads'
import { createLeadColumns, createLeadSortableColumns } from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { leadFilterConfig } from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { useCustomerLeadFilters } from './hooks/useCustomerLeadFilters'

export const LeadView: React.FC<BusinessAppContextProps> = context => {
  const { fetchCustomerLeads } = useCustomerLeads(context)

  const config: LeadViewConfig<CustomerLead, CustomerLeadQueryVariables> = useMemo(
    () => ({
      contextType: 'customer',

      fetchLeads: async (variables) => {
        return await fetchCustomerLeads(variables)
      },

      filterDataHook: useCustomerLeadFilters,

      createColumns: createLeadColumns,
      createSortableColumns: createLeadSortableColumns,

      mapColumnToGraphQLField: (columnId) => {
        const mapping = {
          firstName: 'firstName',
          email: 'email',
          leadStatus: 'leadStatusRef',
          // ... other mappings
        }
        return mapping[columnId] || columnId
      },

      baseFilterConfig: leadFilterConfig,

      buildQueryVariables: (params) => {
        // Build query variables from params
        const vars: CustomerLeadQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        // Apply filters
        applyBasicFilters(vars, params.selectedFilters)
        applyDateFilter(vars, params.selectedFilters)

        return vars
      },

      flowContexts: {
        entityContext: FlowContextName.customerLeadEntity,
        createContext: FlowContextName.customerLeadCreate
      },

      buildRecordUrl: (id) => `/platform/crm/lead-record?leadId=${id}`,

      renderStatistics: ({ onRefresh }) => (
        <LeadStatistics context={context} onRefresh={onRefresh} />
      )
    }),
    [context, fetchCustomerLeads]
  )

  return <LeadLayout context={context} config={config} dataTestId="customer-lead-view" />
}
```

### Investment Relations (IRM) Example

```typescript
// investment-relations/views/lead-view/LeadView.tsx
import { useMemo } from 'react'
import { LeadLayout, type LeadViewConfig } from '@/common/components/common-relations/view-layouts/lead-layout'
import { useInvestmentLeads } from '@/common/data/investment/hooks/useInvestmentLeads'

export const LeadView: React.FC<BusinessAppContextProps> = context => {
  const { fetchInvestmentLeads } = useInvestmentLeads(context)

  const config: LeadViewConfig<InvestmentLead, InvestmentLeadQueryVariables> = useMemo(
    () => ({
      contextType: 'investment',

      fetchLeads: async (variables) => {
        return await fetchInvestmentLeads(variables)
      },

      filterDataHook: useInvestmentLeadFilters,

      createColumns: createLeadColumns,
      createSortableColumns: createLeadSortableColumns,

      // ... similar to customer-relations but with investment-specific logic
    }),
    [context, fetchInvestmentLeads]
  )

  return <LeadLayout context={context} config={config} dataTestId="investment-lead-view" />
}
```

## Configuration Interface

### LeadViewConfig

```typescript
interface LeadViewConfig<TLead extends { id: string }, TQueryVariables> {
  // Context type
  contextType: 'customer' | 'investment'

  // Data fetching
  fetchLeads: (variables: TQueryVariables) => Promise<{
    leads?: TLead[]
    total?: number
  }>

  // Filter data hook
  filterDataHook: (context: BusinessAppContextProps) => {
    owners: Array<{ id: string; label: string }>
    statuses: Array<{ id: string; label: string }>
    ratings: Array<{ id: string; label: string }>
    sources: Array<{ id: string; label: string }>
    countries?: Array<{ id: string; label: string }>
    regions?: Array<{ id: string; label: string }>
    cities?: Array<{ id: string; label: string }>
  }

  // Column configuration
  createColumns: () => ColumnDef<TLead>[]
  createSortableColumns: () => Array<{ id: string; label: string }>
  mapColumnToGraphQLField: (columnId: string) => string

  // Filter configuration
  baseFilterConfig: FilterConfiguration

  // Query builder
  buildQueryVariables: (params: {
    pagination: { pageIndex: number; pageSize: number }
    searchTerm: string
    selectedFilters: Record<string, any>
    sorting: Array<{ id: string; desc: boolean }>
    mapColumnToGraphQLField: (columnId: string) => string
  }) => TQueryVariables

  // Flow contexts
  flowContexts: {
    entityContext: FlowContextName
    createContext: FlowContextName
    createContextData?: Record<string, any>
  }

  // URL builders
  buildRecordUrl?: (id: string) => string

  // Statistics rendering
  renderStatistics: (props: { context: BusinessAppContextProps; onRefresh: () => void }) => React.ReactNode

  // Process completion events
  processCompletionEvents?: string[]

  // Custom row actions (optional)
  renderRowActions?: (row: { original: TLead }, accessToken: string) => React.ReactNode
}
```

## Shared Configurations

### Columns

The shared `createLeadColumns` function provides base columns that work with both customer and investment leads:

- **Lead**: Combined name/company with sensitive flag
- **Contact Info**: Email and phone
- **Address**: Formatted address
- **Status**: Badge with dynamic variant
- **Rating**: Badge
- **Source**: Text display
- **Owner**: Avatar with employee link
- **Created**: Formatted date

### Filters

The shared `leadFilterConfig` provides base filters:

- **Lead Status**: Multi-select from catalog
- **Lead Rating**: Multi-select from catalog
- **Lead Source**: Multi-select from catalog
- **Owner**: Multi-select from employee data
- **Geography**: Country, Region, City filters
- **Date Range**: Created after/before
- **Sensitivity**: Sensitive/Non-sensitive filter

## Query Helpers

### applyBasicFilters

Applies standard filter fields to query variables:

- leadStatusIds
- leadRatingIds
- leadSourceIds
- ownerEmployeeIds
- countryIds, regionIds, cities
- sensitive

### applyDateFilter

Applies date range filters:

- createdAfter
- createdBefore

## Customization

### Extending Columns

```typescript
// Consumer can extend or override columns
const customColumns = () => [
  ...createLeadColumns<CustomerLead>(),
  {
    id: 'customField',
    header: 'Custom',
    cell: ({ row }) => <CustomCell data={row.original} />
  }
]
```

### Extending Filters

```typescript
// Consumer can add custom filters
const customFilterConfig: FilterConfiguration = {
  ...leadFilterConfig,
  groups: [
    ...leadFilterConfig.groups,
    {
      id: 'custom-group',
      label: 'Custom Filters',
      filters: [
        /* custom filters */
      ]
    }
  ]
}
```

## Best Practices

1. **Keep shared config minimal**: Only include fields that exist in both customer and investment leads
2. **Use type-safe interfaces**: Define proper TypeScript interfaces for your lead types
3. **Handle optional fields**: Use optional chaining and default values
4. **Process completion**: Include relevant event names in `processCompletionEvents`
5. **Error handling**: Provide meaningful error messages in fetch functions
6. **Statistics**: Keep statistics independent from table data for better UX

## Related Components

- `OpportunityLayout`: Similar pattern for opportunity views
- `AccountLayout`: Similar pattern for account views
- `ContactLayout`: Similar pattern for contact views
- `TaskLayout`: Similar pattern for task views
