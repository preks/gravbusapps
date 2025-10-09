---
alwaysApply: true
---

# Data Integration Hook Pattern

When combining multiple data sources (GraphQL + Catalog APIs):

- Pattern: `useEntityDataIntegration.ts` in hooks directory
- Use parallel data fetching with `Promise.all`
- Create enhanced interfaces with computed fields
- Provide loading/error states with refetch functionality

@src/business-apps/mdm/apps/compensation-data/hooks/useCompensationDataIntegration.ts

## Integration Hook Structure

```typescript
export const useEntityDataIntegration = (context: BusinessAppContextProps) => {
  const [entities, setEntities] = useState<EnhancedEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch from multiple sources in parallel
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

  return {
    entities,
    isLoading,
    error,
    refetch: loadData
  }
}
```

## Enhanced Interface Pattern

Create computed fields for better UI experience:

```typescript
export interface EnhancedEntity {
  id: string
  name: string
  // Computed fields
  displayName: string
  color: string // for UI styling
  category: string // for grouping
}
```
