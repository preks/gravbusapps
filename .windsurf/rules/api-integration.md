---
alwaysApply: true
---

# API Integration Patterns

## GraphQL API Integration

- **Client**: Use `useGraphQLClient()` from `src/common/network/graphql/useGraphQLClient.ts`
- **Query Structure**: Create query files in `queries/` directory with pattern `EntityQueries.ts`
- **Hook Pattern**: Create data hooks in `hooks/` directory with pattern `useEntityData.ts`

### GraphQL Query File Pattern:

```typescript
// queries/EntityQueries.ts
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface EntityQueryVariables {
  id?: string
  offset?: number
  limit?: number
  search?: string
}

export const GET_ENTITY_DATA = (variables: EntityQueryVariables): string => {
  // GraphQL query string construction
}

export const useGetEntityData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchEntityData = async (variables: EntityQueryVariables = {}) => {
    const query = GET_ENTITY_DATA(variables)
    try {
      const result = await graphqlClient.request<EntityDataResponse>(query)
      return result
    } catch (error) {
      console.error('Error fetching entity data:', error)
      throw error
    }
  }

  return { fetchEntityData }
}
```

## Catalog API Integration

- **Client**: Use `useCatalogManagerClient()` from `src/common/network/catalogs/useCatalogManagerClient.ts`
- **Pattern**: Create catalog hooks in `hooks/` directory with pattern `useEntityCatalog.ts`

### Catalog Hook Pattern:

```typescript
// hooks/useEntityCatalog.ts
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export const ENTITY_CATALOG = 'EntityCatalog'
export const ENTITY_VERSION = 'v1'

export const useEntityCatalog = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchEntityCatalog = async (params?: { limit?: number; offset?: number; search?: string }) => {
    const response = await catalogClient.getCatalogEntriesList(
      {
        catalogIdentifier: ENTITY_CATALOG,
        version: ENTITY_VERSION
      },
      {
        limit: params?.limit || 100,
        offset: params?.offset || 0,
        returnTotalRecords: true,
        includeChildCatalogEntries: true,
        ...(params?.search && { searchCriteria: params.search })
      }
    )
    return response
  }

  return { fetchEntityCatalog }
}
```

## Data Integration Hook Pattern

- **Purpose**: Combine multiple data sources (GraphQL + Catalog) into a single hook
- **Pattern**: Create integration hooks with pattern `useEntityDataIntegration.ts`
- **Features**: Parallel data fetching, data transformation, enhanced interfaces, loading/error states

### Integration Hook Template:

```typescript
// hooks/useEntityDataIntegration.ts
import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface EnhancedEntity {
  // Enhanced interface with computed fields
  id: string
  name: string
  displayName: string
  // ... other fields
}

export const useEntityDataIntegration = (context: BusinessAppContextProps) => {
  const [entities, setEntities] = useState<EnhancedEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch data from multiple sources in parallel
      const [graphqlData, catalogData] = await Promise.all([fetchGraphQLData(), fetchCatalogData()])

      // Transform and combine data
      const enhancedEntities = transformData(graphqlData, catalogData)
      setEntities(enhancedEntities)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken])

  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken, loadData])

  return {
    entities,
    isLoading,
    error,
    refetch: loadData
  }
}
```

## Data Transformation Patterns

### Currency Handling

- **Issue**: APIs return currency in format `Currency:v1:EUR`
- **Solution**: Extract actual currency code for `Intl.NumberFormat`

```typescript
const extractCurrencyCode = (currencyId: string): string => {
  return currencyId.split(':').pop() || 'EUR'
}
```

### Data Enhancement

- **Pattern**: Transform raw API data into enhanced interfaces with computed fields
- **Purpose**: Add display names, colors, categories, and other UI-specific properties

## Common Issues and Solutions

1. **Currency Formatting**: Extract currency codes from API format (`Currency:v1:EUR` → `EUR`)
2. **URL Path Errors**: Use proper client methods instead of manual URL construction
3. **Authentication Issues**: Always validate access tokens exist before API calls
4. **CORS Errors**: Usually caused by Keycloak authentication redirects

## Error Handling Patterns

### API Errors

- Always wrap API calls in try-catch blocks
- Provide meaningful error messages to users
- Log errors for debugging (without sensitive data)
- Implement retry mechanisms where appropriate
