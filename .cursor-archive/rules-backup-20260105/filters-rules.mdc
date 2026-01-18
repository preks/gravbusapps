---
description: When user mentions filtered lists, or when user wants pre-filtered lists, or when pre-filtered lists are mentioned from query parameters that should filter the lists initially.
alwaysApply: false
---

# CRM Filter System Implementation Guidelines

## Overview
This document defines the comprehensive filter system for CRM list components (Accounts, Contacts, Leads, Opportunities). The system supports dynamic backend-fetched filters, pre-filtering from URL parameters, and real-time GraphQL data refetching.

## Core Architecture

### ⚠️ CRITICAL: Filter Initialization Pattern

**THE MOST IMPORTANT RULE**: Every filter hook MUST set `filtersInitialized = true` or the GraphQL queries will NEVER run.

#### Common Critical Bug Pattern (❌ BROKEN)
```typescript
export const useEntityFilters = (context: BusinessAppContextProps) => {
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  
  // ❌ BROKEN: filtersInitialized is never set to true
  // This prevents the initial GraphQL query from running!
  
  return { filtersInitialized /* always stays false */ };
};
```

#### Required Fix Pattern (✅ CORRECT)
```typescript
export const useEntityFilters = (context: BusinessAppContextProps) => {
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  
  // Backend data fetching
  const { options, isLoading: optionsLoading } = useGetFilterOptions(context);
  
  // ✅ REQUIRED: Initialize filters and set filtersInitialized = true
  useEffect(() => {
    if (!filtersInitialized && !optionsLoading) {
      const urlParams = new URLSearchParams(window.location.search);
      const preselectedFilters: string[] = [];
      
      // Process URL parameters if data is available
      if (options.length > 0) {
        // ... URL parameter processing
        if (preselectedFilters.length > 0) {
          setSelectedFilters(preselectedFilters);
        }
      }
      
      // ✅ CRITICAL: Always set to true once loading completes
      setFiltersInitialized(true);
    }
  }, [options, optionsLoading, filtersInitialized]);
  
  return { filtersInitialized /* now properly set to true */ };
};
```

#### Initialization Dependencies

**Single Data Source Pattern:**
```typescript
// Wait for one data source to complete loading
useEffect(() => {
  if (!filtersInitialized && !isDataLoading) {
    initializeFilters();
    setFiltersInitialized(true);
  }
}, [dataOptions, isDataLoading, filtersInitialized]);
```

**Multiple Data Sources Pattern:**
```typescript
// Wait for ALL data sources to complete loading
useEffect(() => {
  if (!filtersInitialized && !dataLoading1 && !dataLoading2 && !dataLoading3) {
    initializeFilters();
    setFiltersInitialized(true);
  }
}, [data1, data2, data3, dataLoading1, dataLoading2, dataLoading3, filtersInitialized]);
```

**Why This Matters:**
- List components wait for `filtersInitialized === true` before running GraphQL queries
- If never set to `true`, the initial data load never happens
- Users see empty tables with no loading indicators
- No network requests appear in browser dev tools

### Filter Hook Pattern
Each CRM list has a dedicated filter hook following the naming convention `use{Entity}Filters`:
- `useAccountFilters` - Account list filtering
- `useContactFilters` - Contact list filtering  
- `useLeadFilters` - Lead list filtering
- `useOpportunityFilters` - Opportunity list filtering

### Hook Structure
```typescript
export const useEntityFilters = (context: BusinessAppContextProps) => {
  // Core filter state
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  
  // Date range filters
  const [createdAfter, setCreatedAfter] = useState<string | undefined>();
  const [createdBefore, setCreatedBefore] = useState<string | undefined>();

  // Backend filter data fetching
  const { options, isLoading, error } = useGetFilterOptions(context);

  // URL parameter initialization
  useEffect(() => {
    if (!filtersInitialized && options.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      initializeFiltersFromUrl(urlParams, options);
      setFiltersInitialized(true);
    }
  }, [options, filtersInitialized]);

  return {
    search, setSearch, selectedFilters, filterGroups, filterLabelMap,
    addFilter, removeFilter, clearAllFilters, getFilters,
    createdAfter, createdBefore, handleDateRangeChange,
    filtersInitialized // CRITICAL: Must be returned
  };
};
```

### ⚠️ IMPLEMENTATION CHECKLIST

Every filter hook implementation MUST include these elements:

#### 1. State Declaration ✅
```typescript
const [filtersInitialized, setFiltersInitialized] = useState(false);
```

#### 2. Initialization useEffect ✅
```typescript
useEffect(() => {
  if (!filtersInitialized && /* all loading conditions met */) {
    // URL parameter processing
    // Filter pre-selection
    setFiltersInitialized(true); // ← CRITICAL LINE
  }
}, [/* all dependencies including filtersInitialized */]);
```

#### 3. Interface Export ✅
```typescript
export interface EntityFilters {
  // ... other properties
  filtersInitialized: boolean; // ← MUST be in interface
}
```

#### 4. Return Object ✅
```typescript
return {
  // ... other returns
  filtersInitialized, // ← MUST be returned
};
```

#### 5. List Component Integration ✅
```typescript
// In the list component
const { filtersInitialized } = useEntityFilters(context);

useEffect(() => {
  if (!initialLoadDone.current && context.accessToken && filtersInitialized) {
    initialLoadDone.current = true;
    loadPage(1, pageSize); // ← GraphQL query finally runs
  }
}, [context.accessToken, pageSize, filtersInitialized]);
```

### Real-World Examples

#### OpportunityFilters Implementation
```typescript
// Waits for pipeline stages AND pipeline catalogs to load
useEffect(() => {
  if (!filtersInitialized && !isPipelineStagesLoading && !isPipelinesLoading) {
    const urlParams = new URLSearchParams(window.location.search);
    // Process salesPipelineStage, salesPipeline, winningChance, etc.
    setFiltersInitialized(true);
  }
}, [pipelineStageOptions, pipelineOptions, isPipelineStagesLoading, isPipelinesLoading, filtersInitialized]);
```

#### ContactFilters Implementation  
```typescript
// Waits for job titles to load
useEffect(() => {
  if (!filtersInitialized && !isJobTitlesLoading) {
    const urlParams = new URLSearchParams(window.location.search);
    // Process jobTitle, contactType parameters
    setFiltersInitialized(true);
  }
}, [jobTitleOptions, isJobTitlesLoading, filtersInitialized]);
```

#### LeadFilters Implementation
```typescript
// Waits for ALL data sources to complete
useEffect(() => {
  if (!filtersInitialized && !leadStatusLoading && !leadRatingLoading && 
      !leadSourceLoading && !industryLoading && !companySizeLoading && !ownerLoading) {
    const urlParams = new URLSearchParams(window.location.search);
    // Process leadStatus, leadRating, leadSource, industry, companySize, leadOwner
    setFiltersInitialized(true);
  }
}, [leadStatusOptions, leadRatingOptions, leadSourceOptions, industryOptions, 
    companySizeOptions, leadOwners, leadStatusLoading, leadRatingLoading,
    leadSourceLoading, industryLoading, companySizeLoading, ownerLoading, filtersInitialized]);
```
```

## Backend Data Fetching Patterns

### Catalog API Integration
Use `useCatalogManagerClient()` for fetching catalog-based filters:

```typescript
// Example: Industry filter fetching
const client = useCatalogManagerClient(context.accessToken);

const fetchIndustryOptions = async () => {
  const response = await client.getCatalogEntriesList(
    { catalogIdentifier: "IndustryClass", version: "v1" },
    { limit: 100, returnTotalRecords: true }
  );
  return response.data.map(entry => ({
    id: entry.id,        // Full catalog ID: "IndustryClass:v1:B"
    label: entry.value,  // Display name: "Business Services"
    value: entry.value
  }));
};
```

### GraphQL API Integration
Use `useGraphQLClient()` for entity-based filters:

```typescript
// Example: Job title filter fetching
const graphqlClient = useGraphQLClient(context.accessToken);

const fetchJobTitles = async (search: string) => {
  const query = `
    query GetJobTitles($search: String, $limit: Int) {
      jobTitles(where: { name: { _ilike: $search } }, limit: $limit) {
        id
        name
      }
    }
  `;
  const result = await graphqlClient.request(query, { 
    search: `%${search}%`, 
    limit: 50 
  });
  return result.jobTitles;
};
```

### Employee/Owner Filter Pattern
For owner/employee filters, use GraphQL to fetch user data:

```typescript
const fetchOwners = async (search: string) => {
  const query = `
    query GetEmployees($search: String) {
      employees(where: { 
        _or: [
          { firstName: { _ilike: $search } },
          { lastName: { _ilike: $search } },
          { displayName: { _ilike: $search } }
        ]
      }) {
        id
        firstName
        lastName
        displayName
      }
    }
  `;
  return await graphqlClient.request(query, { search: `%${search}%` });
};
```

## Filter Group Configuration

### Standard Filter Groups
```typescript
const filterGroups: FilterGroup[] = [
  {
    id: 'dateRange',
    title: 'Created Date',
    customComponent: <DateRangeFilter />, // Special date range component
    hideSearch: true
  },
  {
    id: 'catalogFilter',
    title: 'Category',
    filters: catalogOptions.map(option => ({
      id: option.id,                                    // Use full catalog ID
      label: option.label,
      value: option.value,
      selected: selectedFilters.includes(option.id)
    })),
    backendSearch: getCatalogFilters // Optional searchable filters
  },
  {
    id: 'hardcodedFilter',
    title: 'Predefined Options',
    filters: [
      { id: 'option-1', label: 'Option 1', value: 'value1', selected: false },
      { id: 'option-2', label: 'Option 2', value: 'value2', selected: false }
    ]
    // No backendSearch for hardcoded options
  }
];
```

### Filter Label Mapping
```typescript
const filterLabelMap: Record<string, string> = useMemo(() => {
  const map: Record<string, string> = {};
  filterGroups.forEach(group => {
    group.filters.forEach(filter => {
      map[filter.id] = filter.label;
    });
  });
  return map;
}, [filterGroups]);
```

## Pre-Filter URL Parameter System

### Query Parameter Mapping
Each filter group maps to specific URL parameter names:

#### Account Filters
| URL Parameter | Filter Group | Value Format | Example |
|--------------|--------------|--------------|---------|
| `industry` | `industry` | Catalog ID | `IndustryClass:v1:B` |

#### Contact Filters  
| URL Parameter | Filter Group | Value Format | Example |
|--------------|--------------|--------------|---------|
| `jobTitle` | `jobTitle` | Job Title Name | `Software Engineer` |

#### Lead Filters
| URL Parameter | Filter Group | Value Format | Example |
|--------------|--------------|--------------|---------|
| `salesLeadStatus` | `leadStatuses` | Catalog ID | `SalesLeadStatus:v1:CONVERTED` |
| `salesLeadRating` | `leadRatings` | Catalog ID | `SalesLeadRating:v1:HOT` |
| `salesLeadSource` | `leadSources` | Catalog ID | `SalesLeadSource:v1:EVENTS` |
| `industry` | `industries` | Catalog ID | `IndustryClass:v1:B` |
| `companySize` | `companySizes` | Hardcoded ID | `startup`, `small`, `medium`, `large`, `enterprise` |
| `owner` | `owners` | Employee UUID | `4c816c6d-c5e6-4a41-9682-2c3d38073c9c` |

#### Opportunity Filters
| URL Parameter | Filter Group | Value Format | Example |
|--------------|--------------|--------------|---------|
| `salesPipelineStage` | `stage` | Catalog ID | `SalesPipelineStage:v1:NEW_OPPORTUNITY` |
| `salesPipeline` | `pipeline` | Catalog ID | `SalesPipeline:v1:STANDARD` |
| `winningChance` | `winningChance` | Hardcoded ID | `chance-high`, `chance-medium`, `chance-low`, `chance-very-low` |
| `estimatedAmount` | `estimatedAmount` | Hardcoded ID | `amount-large`, `amount-medium`, `amount-small`, `amount-micro` |
| `status` | `status` | Java Enum | `OPPORTUNITY_OPEN`, `OPPORTUNITY_WON`, `OPPORTUNITY_LOST`, `UNKNOWN_OPPORTUNITY_STATUS` |

### Filter Value Types

The CRM filter system supports five different types of filter values:

#### 1. Catalog Entry IDs
- **Format**: `CatalogName:version:value` (e.g., `IndustryClass:v1:B`)
- **Usage**: For dynamic catalog-based filters like industries, lead statuses, ratings
- **Backend**: Fetched via Catalog API using `useCatalogManagerClient()`
- **Matching**: Exact ID matching against catalog entry IDs

#### 2. Entity UUIDs
- **Format**: Standard UUID string (e.g., `4c816c6d-c5e6-4a41-9682-2c3d38073c9c`)
- **Usage**: For entity references like owner employees, accounts
- **Backend**: Fetched via GraphQL using `useGraphQLClient()`
- **Matching**: Exact UUID matching against entity IDs

#### 3. Hardcoded Values
- **Format**: Predefined string constants (e.g., `chance-high`, `startup`)
- **Usage**: For static, UI-defined filter options
- **Backend**: No backend fetching - defined in component
- **Matching**: Validation against predefined constant arrays

#### 4. Name/Title Strings
- **Format**: Exact string values (e.g., `Software Engineer`)
- **Usage**: For searchable text fields like job titles
- **Backend**: Fetched via GraphQL with search functionality
- **Matching**: String matching against name/title fields

#### 5. Java Enum Values
- **Format**: Backend enum constant names (e.g., `OPPORTUNITY_OPEN`)
- **Usage**: For backend-defined enumeration values
- **Backend**: No backend fetching - enum values are hardcoded
- **Matching**: Validation against known enum constant arrays
- **GraphQL**: Passed directly as enum values in where conditions

### URL Parameter Parsing Implementation
```typescript
const initializeFromUrl = useCallback((urlParams: URLSearchParams) => {
  const preselectedFilters: string[] = [];

  // Catalog-based filters (use exact ID matching)
  const catalogParams = urlParams.getAll('catalogParameterName');
  catalogParams.forEach(paramValue => {
    const matchingOption = catalogOptions.find(option => option.id === paramValue);
    if (matchingOption) {
      preselectedFilters.push(matchingOption.id);
    }
  });

  // Name-based filters (use name matching)
  const nameParams = urlParams.getAll('nameParameterName');
  nameParams.forEach(paramValue => {
    const matchingOption = nameOptions.find(option => option.name === paramValue);
    if (matchingOption) {
      preselectedFilters.push(`prefix-${matchingOption.id}`);
    }
  });

  // Hardcoded filters (validate against known values)
  const hardcodedParams = urlParams.getAll('hardcodedParameterName');
  hardcodedParams.forEach(paramValue => {
    if (VALID_HARDCODED_VALUES.includes(paramValue)) {
      preselectedFilters.push(paramValue);
    }
  });

  // Java enum filters (validate against known enum values)
  const javaEnumParams = urlParams.getAll('javaEnumParameterName');
  javaEnumParams.forEach(paramValue => {
    if (VALID_JAVA_ENUM_VALUES.includes(paramValue)) {
      preselectedFilters.push(paramValue);
    }
  });

  if (preselectedFilters.length > 0) {
    setSelectedFilters(preselectedFilters);
  }
}, [catalogOptions, nameOptions]);
```

## GraphQL Integration and Data Refetching

### List Data Hook Integration
List components use data hooks that automatically refetch when filters change:

```typescript
// useEntityListData pattern
export const useEntityListData = ({
  search,
  sortField,
  sortOrder,
  context,
  sourceApp,
  // Filter parameters from getFilters()
  filterField1,
  filterField2,
  createdAfter,
  createdBefore
}) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const buildWhereCondition = useCallback(() => {
    const where: any = { _and: [] };

    // Search conditions
    if (search?.trim()) {
      where._or = [
        { field1: { _ilike: `%${search.trim()}%` } },
        { field2: { _ilike: `%${search.trim()}%` } },
        { relatedEntity: { name: { _ilike: `%${search.trim()}%` } } }
      ];
    }

    // Filter conditions
    if (filterField1?.length > 0) {
      where._and.push({ filterField1: { _in: filterField1 } });
    }

    if (filterField2?.length > 0) {
      where._and.push({ filterField2: { _in: filterField2 } });
    }

    // Java enum filter conditions (direct enum value matching)
    if (statuses?.length > 0) {
      where._and.push({ status: { _in: statuses } });
    }

    // Date range conditions
    if (createdAfter) {
      where._and.push({ createdAt: { _gte: createdAfter } });
    }
    if (createdBefore) {
      where._and.push({ createdAt: { _lte: createdBefore } });
    }

    return where._and.length > 0 ? where : {};
  }, [search, filterField1, filterField2, createdAfter, createdBefore]);

  const loadPage = useCallback(async (page: number, pageSize: number) => {
    const offset = (page - 1) * pageSize;
    const whereCondition = buildWhereCondition();

    const query = `
      query GetEntities($where: EntityBoolExp, $limit: Int, $offset: Int, $orderBy: [EntityOrderBy!]) {
        entities(where: $where, limit: $limit, offset: $offset, order_by: $orderBy) {
          id
          name
          # ... other fields
        }
        entitiesAggregate(where: $where) {
          aggregate {
            count
          }
        }
      }
    `;

    const orderBy = sortField ? [{ [sortField]: sortOrder.toLowerCase() }] : [{ createdAt: 'desc' }];

    const result = await graphqlClient.request(query, {
      where: whereCondition,
      limit: pageSize,
      offset,
      orderBy
    });

    return {
      data: result.entities,
      total: result.entitiesAggregate.aggregate.count
    };
  }, [graphqlClient, buildWhereCondition, sortField, sortOrder]);

  return { loadPage, /* other methods */ };
};
```

### Automatic Refetching on Filter Changes
List components automatically refetch data when filters change:

```typescript
// In list component
const filters = getFilters(); // Get current filter values
const { entities, loadPage } = useEntityListData({
  ...filters,
  sortField,
  sortOrder,
  context,
  sourceApp
});

// Automatically refetch when filters change
useEffect(() => {
  if (initialLoadDone.current && filtersInitialized) {
    setCurrentPage(1);
    loadPage(1, pageSize);
  }
}, [
  JSON.stringify(selectedFilters), 
  filterCreatedAfter, 
  filterCreatedBefore, 
  pageSize, 
  filtersInitialized
]);
```

## Component Integration Pattern

### List Component Structure
```typescript
export const EntityList: React.FC<EntityListProps> = (props) => {
  // Filter hook integration
  const entityFilters = useEntityFilters(props);
  const { filtersInitialized } = entityFilters;
  const appliedFilters = entityFilters.getFilters();

  // Data hook integration
  const entityListData = useEntityListData({
    ...appliedFilters,
    sortField,
    sortOrder,
    context: props,
    sourceApp
  });

  // Wait for filters to initialize before loading data
  useEffect(() => {
    if (!initialLoadDone.current && props.accessToken && filtersInitialized) {
      initialLoadDone.current = true;
      entityListData.loadPage(1, pageSize);
    }
  }, [props.accessToken, pageSize, filtersInitialized]);

  // Auto-refetch when filters change
  useEffect(() => {
    if (initialLoadDone.current && filtersInitialized) {
      setCurrentPage(1);
      entityListData.loadPage(1, pageSize);
    }
  }, [
    JSON.stringify(entityFilters.selectedFilters),
    entityFilters.createdAfter,
    entityFilters.createdBefore,
    pageSize,
    filtersInitialized
  ]);

  return (
    <DataContainer
      dataControllerProps={{
        search: entityFilters.search,
        setSearch: entityFilters.setSearch,
        filter: entityFilters.selectedFilters,
        setFilter: (filters: string[]) => {
          if (filters.length === 0) {
            entityFilters.clearAllFilters();
          } else {
            const removedFilters = entityFilters.selectedFilters.filter(f => !filters.includes(f));
            removedFilters.forEach(filterId => entityFilters.removeFilter(filterId));
          }
        },
        filterLabelMap: entityFilters.filterLabelMap,
        dateRange: {
          createdAfter: entityFilters.createdAfter,
          createdBefore: entityFilters.createdBefore,
          onClear: () => entityFilters.handleDateRangeChange(undefined, undefined)
        }
      }}
      dataFilterProps={{
        filterGroups: entityFilters.filterGroups,
        onFilterChange: (filterId: string, selected: boolean) => {
          selected ? entityFilters.addFilter(filterId) : entityFilters.removeFilter(filterId);
        }
      }}
      dataBody={<EntityTable {...props} data={entityListData.entities} />}
    />
  );
};
```

## Critical Implementation Requirements

### 1. Filter Initialization Sequence
- ✅ Backend filter options must be loaded first
- ✅ URL parameters parsed only after options are available
- ✅ `filtersInitialized` flag prevents premature data loading
- ✅ Data loading waits for `filtersInitialized === true`

### 2. URL Parameter ID Formats
- **Catalog entries**: Use full catalog ID format (`CatalogName:version:value`)
- **Entity UUIDs**: Use complete UUID string  
- **Hardcoded values**: Use exact predefined string values
- **Names/Titles**: Use exact string matching
- **Java enums**: Use exact backend enum constant names

### 3. GraphQL Query Requirements
- ✅ All filter parameters must map to GraphQL `where` conditions
- ✅ Search must include ALL displayed table fields
- ✅ Filters trigger complete data refetch, not client-side filtering
- ✅ Pagination, sorting, and filtering work together

### 4. Error Handling
- ✅ Invalid URL parameters are silently ignored
- ✅ Missing filter options don't break initialization
- ✅ Backend errors don't prevent basic functionality
- ✅ Fallback to empty filter state if initialization fails

## Testing and Validation

### URL Parameter Testing
Test with various URL combinations:
```
# Single filters
?industry=IndustryClass:v1:B
?salesLeadStatus=SalesLeadStatus:v1:CONVERTED
?owner=4c816c6d-c5e6-4a41-9682-2c3d38073c9c

# Multiple filters of same type
?industry=IndustryClass:v1:B&industry=IndustryClass:v1:C

# Mixed filter types
?salesLeadStatus=SalesLeadStatus:v1:CONVERTED&industry=IndustryClass:v1:B&companySize=startup

# Java enum filters
?status=OPPORTUNITY_OPEN&status=OPPORTUNITY_WON

# Invalid parameters (should be ignored)
?invalidFilter=someValue&salesLeadStatus=InvalidValue&status=INVALID_STATUS
```

### Data Integration Validation
- ✅ Filter changes trigger GraphQL queries
- ✅ Search combines with filters properly
- ✅ Sorting works with filtered data
- ✅ Pagination resets on filter changes
- ✅ URL parameters correctly pre-select filters
- ✅ Filter removal updates data immediately

## Examples by Entity

### Account List Example
```typescript
// URL: ?industry=IndustryClass:v1:B&industry=IndustryClass:v1:C
// Result: Pre-selects "Business Services" and "Manufacturing" industries
// GraphQL: { industry: { _in: ["Business Services", "Manufacturing"] } }
```

### Lead List Example  
```typescript
// URL: ?salesLeadStatus=SalesLeadStatus:v1:CONVERTED&owner=123e4567-e89b-12d3-a456-426614174000
// Result: Pre-selects "Converted" status and specific owner
// GraphQL: { 
//   _and: [
//     { leadStatus: { value: { _in: ["CONVERTED"] } } },
//     { ownerEmployee: { id: { _eq: "123e4567-e89b-12d3-a456-426614174000" } } }
//   ]
// }
```

### Opportunity List Example
```typescript
// URL: ?winningChance=chance-high&estimatedAmount=amount-large&status=OPPORTUNITY_OPEN
// Result: Pre-selects high winning chance (75-100%), large deals (>$100K), and open status
// GraphQL: {
//   _and: [
//     { winningChance: { _gte: 75, _lte: 100 } },
//     { estimatedAmount: { _gt: 100000 } },
//     { status: { _in: ["OPPORTUNITY_OPEN"] } }
//   ]
// }
```

### Java Enum Filter Example
```typescript
// URL: ?status=OPPORTUNITY_OPEN&status=OPPORTUNITY_WON
// Result: Pre-selects both "Open" and "Won" statuses
// GraphQL: { status: { _in: ["OPPORTUNITY_OPEN", "OPPORTUNITY_WON"] } }
```

## Performance Considerations

### 1. Debounced Search
- ✅ Use `DebouncedInput` for search fields (500ms delay)
- ✅ Backend search hooks should debounce API calls

### 2. Caching Strategy
- ✅ Filter options cached per session
- ✅ GraphQL results cached with appropriate invalidation
- ✅ URL parameter parsing only on component mount

### 3. Efficient Updates
- ✅ Use `JSON.stringify()` for array dependencies in useEffect
- ✅ Memoize filter groups and label maps
- ✅ Avoid unnecessary re-renders with proper dependency arrays

This comprehensive filter system ensures consistent, performant, and user-friendly filtering across all CRM entities while supporting both interactive filtering and URL-based pre-filtering.
