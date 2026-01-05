---
description: Integration of dataset and timeseries queries
alwaysApply: false
---
# Dataset & Timeseries Query Integration

## Overview
When implementing dataset or timeseries queries, use the NEWWORK dataset addon API patterns for consistent data fetching and query execution.

## Query Types

### DatasetQuery (Tabular Data)
Used for pie charts, bar charts, and table displays.
**Required columns:** `category` (String), `value` (Number)

```typescript
// Query definition pattern
const DATASET_QUERY = `
  SELECT 
    job_position_id as category, 
    count(1) as value 
  FROM employee_position 
  WHERE organizational_unit_id = :value 
  GROUP BY category
`;
```

### TimeseriesQuery (Time-based Data)
Used for line charts, area charts, and temporal analysis.
**Required columns:** `date_category` (Date/Timestamp), `category` (String), `value` (Number)

```typescript
// Timeseries query pattern
const TIMESERIES_QUERY = `
  SELECT 
    DATE_TRUNC('year', e.hire_date) as date_category,
    p.job_title as category,
    count(1) as value
  FROM employee_position ep
  JOIN employee e ON ep.employee_id = e.id
  JOIN job_position p ON ep.job_position_id = p.id
  WHERE ep.organizational_unit_id = :value
  GROUP BY date_category, category
  ORDER BY date_category ASC
`;
```

## Frontend Integration Patterns

### Query Execution Client Usage
```typescript
import { useQueryExecutionClient, QueryType, QueryExecutionParams } from '@/common/network/dataset';

export const useDatasetQueries = (context: BusinessAppContextProps, service: Services) => {
  const queryClient = useQueryExecutionClient(context.accessToken, service);

  const executeDatasetQuery = useCallback(async (
    queryName: string,
    parameters: QueryExecutionParams = {}
  ) => {
    try {
      const result = await queryClient.executeDatasetQuery(queryName, parameters);
      return result;
    } catch (error) {
      console.error('Error executing dataset query:', error);
      throw error;
    }
  }, [queryClient]);

  const executeTimeseriesQuery = useCallback(async (
    queryName: string,
    parameters: QueryExecutionParams = {}
  ) => {
    try {
      const result = await queryClient.executeTimeseriesQuery(queryName, parameters);
      return result;
    } catch (error) {
      console.error('Error executing timeseries query:', error);
      throw error;
    }
  }, [queryClient]);

  return { executeDatasetQuery, executeTimeseriesQuery };
};
```

### Query Management Client Usage
```typescript
import { useQueryManagementClient, QueryDefinition, QueryType } from '@/common/network/dataset';

export const useQueryManagement = (context: BusinessAppContextProps, service: Services) => {
  const managementClient = useQueryManagementClient(context.accessToken, service);

  const createQueryDefinition = useCallback(async (
    queryData: Omit<QueryDefinition, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      return await managementClient.createQueryDefinition(queryData);
    } catch (error) {
      console.error('Error creating query definition:', error);
      throw error;
    }
  }, [managementClient]);

  const listQueries = useCallback(async (queryType: QueryType) => {
    try {
      const response = await managementClient.listQueryDefinitionsPaged({
        queryType,
        page: 0,
        size: 100
      });
      return response.data;
    } catch (error) {
      console.error('Error listing queries:', error);
      throw error;
    }
  }, [managementClient]);

  return { createQueryDefinition, listQueries };
};
```

## Parameter Handling

### Standard Parameter Types
```typescript
interface QueryParameterExample {
  // String parameters
  categoryFilter: string;
  
  // Number parameters  
  limit: number;
  
  // Date parameters (ISO format: yyyy-MM-dd)
  startDate: string;
  
  // DateTime parameters (ISO format: yyyy-MM-ddTHH:mm:ss)
  endDate: string;
  
  // Boolean parameters
  includeDeleted: boolean;
  
  // List parameters (JSON array format: ["value1", "value2"])
  statusList: string;
}

// Parameter usage in queries
const executeWithParameters = async () => {
  const parameters: QueryExecutionParams = {
    startDate: '2024-01-01',
    endDate: '2024-12-31T23:59:59',
    statusList: '["ACTIVE", "PENDING"]',
    limit: 100
  };
  
  const result = await queryClient.executeDatasetQuery('queryName', parameters);
};
```

### Default Context Parameters
Always available in queries without explicit definition:
- `:userId` - Current user ID
- `:userLocale` - User locale (e.g., 'en-US', 'de-DE')

## SQL Query Best Practices

### Required Column Naming
```sql
-- Dataset queries MUST return these columns
SELECT 
  column_name as category,  -- String grouping column
  COUNT(*) as value         -- Numeric value column
FROM table_name;

-- Timeseries queries MUST return these columns  
SELECT 
  DATE_TRUNC('month', date_column) as date_category, -- Date/timestamp
  grouping_column as category,                       -- String category
  SUM(amount) as value                              -- Numeric value
FROM table_name;
```

### Parameterized Queries
```sql
-- Use :paramName for parameters
SELECT 
  category_column as category,
  COUNT(*) as value
FROM table_name 
WHERE status IN (:statusList)
  AND created_date >= :startDate
  AND created_date <= :endDate
  AND user_id = :userId
GROUP BY category_column;
```

### Control Parameters (Template Variables)
```sql
-- Use ${controlParam} for template substitution
SELECT 
  ${categoryColumn} as category,
  ${aggregateFunction}(amount) as value
FROM table_name 
WHERE department = :department
GROUP BY ${categoryColumn};
```

## Error Handling Patterns

### Client-side Error Handling
```typescript
const executeQuerySafely = async (queryName: string, parameters: QueryExecutionParams) => {
  try {
    setIsLoading(true);
    setError(null);
    
    const result = await queryClient.executeDatasetQuery(queryName, parameters);
    setData(result);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Query execution failed';
    setError(errorMessage);
    console.error(`Query '${queryName}' failed:`, error);
    
  } finally {
    setIsLoading(false);
  }
};
```

## Response Data Structures

### Dataset Response Format
```typescript
interface DatasetResponse {
  data: Array<{
    category: string;
    value: number;
    [additionalColumn: string]: any; // Additional columns if defined
  }>;
  categories: string[]; // Unique category values
}
```

### Timeseries Response Format
```typescript
interface TimeseriesResponse {
  data: Array<{
    date_category: string; // ISO date string
    category: string;
    value: number;
    [additionalColumn: string]: any; // Additional columns if defined
  }>;
  categories: string[]; // Unique category values
}
```

## Service Integration

### Services Enum Usage
```typescript
import { Services } from '@/common/types/enums/Services';

// Query endpoints are service-specific
const datasetClient = new QueryExecutionClient(Services.EMPLOYEE);
const expenseClient = new QueryExecutionClient(Services.EMPLOYEE_EXPENSE);
```

### URL Construction Pattern
```
// Query execution endpoints:
POST /processes/{service}/api/v1/queries/dataset/{queryName}?parameters=param1=value1;param2=value2
POST /processes/{service}/api/v1/queries/timeseries/{queryName}?parameters=param1=value1;param2=value2

// Query management endpoints:
GET /processes/{service}/api/v1/query-definitions/paged?queryType=DATASET&page=0&size=20
POST /processes/{service}/api/v1/query-definitions
```

## Component Integration Example

### Complete Query Execution Hook
```typescript
export const useQueryExecution = (context: BusinessAppContextProps, service: Services) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const queryClient = useQueryExecutionClient(context.accessToken, service);
  
  const executeQuery = useCallback(async (
    queryName: string,
    queryType: QueryType,
    parameters: QueryExecutionParams = {}
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = queryType === QueryType.DATASET
        ? await queryClient.executeDatasetQuery(queryName, parameters)
        : await queryClient.executeTimeseriesQuery(queryName, parameters);
        
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query execution failed');
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);
  
  return { executeQuery, isLoading, data, error };
};
```