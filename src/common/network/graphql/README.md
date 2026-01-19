# Simple GraphQL Helpers

Simple utilities for common GraphQL patterns without over-engineering.

## Files

- `queryHelpers.ts` - Where condition builders and common patterns
- `commonFragments.ts` - Reusable GraphQL fragments (AUDIT_FIELDS, STRUCTURE_FIELD, CATALOG_ENTRY)
- `commonTypes.ts` - Basic TypeScript interfaces

## Quick Usage

### 1. Build Where Conditions

```typescript
import { buildWhere, buildSearchWhere, QUERY_PRESETS } from '@/common/network/graphql/queryHelpers'
import { BaseQueryVariables, QueryOptions } from '@/common/network/graphql/commonTypes'

// Simple where condition with search
const variables: BaseQueryVariables = { search: 'john', limit: 20 }
const options: QueryOptions = QUERY_PRESETS.ACTIVE_ONLY
const baseWhere = buildWhere(variables, options)

// Add entity-specific search (done in entity-specific files)
if (variables.search) {
  const searchWhere = buildSearchWhere(variables.search, ['firstName', 'lastName', 'code'])
  Object.assign(baseWhere, searchWhere)
}

// Result: { isDeleted: {_eq: false}, structureId: {_eq: "abc"}, _or: [...search fields] }
```

### 2. Use Common Fragments

```typescript
import {
  AUDIT_FIELDS,
  STRUCTURE_FIELD,
  buildStandardQuery,
  buildQueryPattern
} from '@/common/network/graphql/commonFragments'

// Auto-generates query with pagination and aggregation
const employeeFields = `
  id
  firstName
  lastName
  ${AUDIT_FIELDS}
`
const query = buildStandardQuery('Employee', employeeFields, true)

// Or build custom query with standard pattern
const { params, args } = buildQueryPattern('Employee')
const customQuery = `
  query GetEmployees(${params}) {
    Employee(${args}) {
      id
      firstName
      lastName
      ${AUDIT_FIELDS}
    }
  }
`
```

### 3. Standard Query Pattern

```typescript
import { buildQueryVariables } from '@/common/network/graphql/queryHelpers'
import { BaseQueryVariables, QueryOptions } from '@/common/network/graphql/commonTypes'

const queryVars: BaseQueryVariables = {
  search: 'john',
  offset: 0,
  limit: 50
}

const options: QueryOptions = {
  includeDeleted: false,
  useCurrentStructure: true
}

const variables = buildQueryVariables(queryVars, options)

// Use with any GraphQL client
const result = await graphqlClient.request(query, variables)
```

## Common Fragments

### Audit Fields (Complete Lifecycle Tracking)

```typescript
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'

// AUDIT_FIELDS includes everything you need for entity lifecycle:
// - Creation: createdAt, createdBy
// - Updates: updatedAt, updatedBy
// - State: isDeleted, recordState
// - Validity: activeFrom, activeTo
// - Versioning: version

// Use in any entity query
const query = `
  query GetEmployees {
    Employee {
      id
      firstName
      lastName
      ${AUDIT_FIELDS}
    }
  }
`
```

## Common Patterns

### Basic Entity Queries

```typescript
import { BaseQueryVariables, QueryOptions } from '@/common/network/graphql/commonTypes'

const variables: BaseQueryVariables = { search: 'test', limit: 50 }

// Active records in current structure
const where1 = buildWhere(variables, QUERY_PRESETS.ACTIVE_ONLY)

// All records (including deleted)
const where2 = buildWhere(variables, QUERY_PRESETS.ALL_RECORDS)

// Master data (no structure dependency)
const where3 = buildWhere(variables, QUERY_PRESETS.MASTER_DATA)
```

### Entity-Specific Implementations

```typescript
// Create entity-specific helpers in their own modules:
// src/common/data/employee/helpers/employeeQueryHelpers.ts
// src/common/data/investment/helpers/investmentQueryHelpers.ts
```

### Custom Filtering

```typescript
// Add custom conditions
const where = buildWhere(
  {
    ...variables,
    where: { customField: { _eq: 'value' } }
  },
  options
)
```

## Benefits

- ✅ **Simple**: 3 files instead of complex folder structure
- ✅ **Flexible**: Mix and match helpers as needed
- ✅ **Reusable**: Common patterns work across all entities
- ✅ **Complete**: AUDIT_FIELDS includes full lifecycle tracking
- ✅ **Consolidated**: One fragment for all audit needs
- ✅ **Clear**: Straightforward function names and usage
