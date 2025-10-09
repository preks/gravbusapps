---
description: When working with GraphQL and GraphQL queries
alwaysApply: false
---

# GraphQL Integration Pattern

## Client and Query Implementation

- **ALWAYS** use Graphql MCP (NEWWORK MCP) tool to make sure the graphql queries are corect.
- Use `useGraphQLClient()` from `src/common/network/graphql/useGraphQLClient.ts`
- Always use `context.accessToken` for authentication
- Wrap API calls in try-catch blocks with proper error handling

## GraphQL Query Conventions

- Use PascalCase for entities
- Use camelCase for fields and relationships
- Use `orderBy` instead of `order_by` for sorting
- Use screaming SNAKE_CASE for sorting directions like `ASC`, `DESC`, `ASC_NULLS_FIRST`etc.
- Use a prefix `_` and camelCase for filter operators like `_eq`, `_isNull`, `like` etc.

### Example:

```graphql
query GetEntities($limit: Int, $offset: Int) {
  Entity(limit: $limit, offset: $offset, orderBy: { name: ASC, createdAt: DESC }) {
    id
    name
    createdAt
  }
}
```

## Query Generation

- Create query files in `queries/` directory with pattern `EntityQueries.ts`
- ALWAYS STRICTLY use newwork-mcp to test a query before implementing. If a parameter is required for a query ask the user to provide an example
- When you need a structureId use "99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf"

## Query File Structure

```typescript
export interface EntityQueryVariables {
  id?: string
  offset?: number
  limit?: number
  search?: string
}

export const useGetEntityData = (context: BusinessAppContextProps) => {
  const graphQLClient = useGraphQLClient(context.accessToken)

  const fetchEntityData = async (variables: EntityQueryVariables = {}) => {
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
