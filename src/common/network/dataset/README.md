# Dataset API Clients

This module provides TypeScript clients for interacting with the Dataset Addon service REST API.

## Overview

The module consists of two main clients:

- **QueryExecutionClient**: For executing dataset and timeseries queries
- **QueryManagementClient**: For managing query definitions (admin operations)

## Environment Configuration

Make sure to set the following environment variable:

```
NEXT_PUBLIC_DATASET_ADDON_API=https://your-dataset-service-url.com
```

## Usage

### Query Execution

```typescript
import { useQueryExecutionClient } from '@/common/network/dataset';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const MyComponent: React.FC<BusinessAppContextProps> = (context) => {
  const queryClient = useQueryExecutionClient(context.accessToken);

  // Get all available dataset queries
  const getQueries = async () => {
    const queries = await queryClient.getDatasetQueries();
    console.log('Available queries:', queries);
  };

  // Execute a dataset query
  const executeQuery = async () => {
    const result = await queryClient.executeDatasetQuery('salaryByYear', {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      aggregate: 'avg'
    });
    console.log('Query result:', result);
  };

  // Execute a timeseries query
  const executeTimeseriesQuery = async () => {
    const result = await queryClient.executeTimeseriesQuery('employeeGrowth', {
      dategroup: 'Month',
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    console.log('Timeseries result:', result);
  };

  return (
    <div>
      <button onClick={getQueries}>Get Queries</button>
      <button onClick={executeQuery}>Execute Dataset Query</button>
      <button onClick={executeTimeseriesQuery}>Execute Timeseries Query</button>
    </div>
  );
};
```

### Query Management (Admin Only)

```typescript
import { useQueryManagementClient, QueryType, QueryStatus, ParameterType } from '@/common/network/dataset';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const AdminComponent: React.FC<BusinessAppContextProps> = (context) => {
  const managementClient = useQueryManagementClient(context.accessToken);

  // Create a new query definition
  const createQuery = async () => {
    const queryDefinition = {
      name: 'newSalaryReport',
      description: 'New salary analysis report',
      query: 'SELECT department, AVG(salary) as avg_salary FROM employees WHERE hire_date >= :startDate GROUP BY department',
      queryType: QueryType.DATASET,
      status: QueryStatus.DRAFT,
      parameters: [
        {
          name: 'startDate',
          type: ParameterType.DATE,
          description: 'Start date for analysis',
          defaultValue: '2024-01-01',
          required: true,
          allowedValues: null
        }
      ],
      additionalColumns: [
        {
          name: 'avg_salary',
          type: 'NUMBER'
        }
      ]
    };

    const created = await managementClient.createQueryDefinition(queryDefinition);
    console.log('Created query:', created);
  };

  // List all query definitions
  const listQueries = async () => {
    const queries = await managementClient.listQueryDefinitions({
      queryType: QueryType.DATASET,
      status: QueryStatus.ACTIVE
    });
    console.log('Active dataset queries:', queries);
  };

  // Update query status
  const activateQuery = async (queryId: string) => {
    const updated = await managementClient.updateQueryStatus(queryId, QueryStatus.ACTIVE);
    console.log('Activated query:', updated);
  };

  return (
    <div>
      <button onClick={createQuery}>Create Query</button>
      <button onClick={listQueries}>List Queries</button>
      <button onClick={() => activateQuery('some-query-id')}>Activate Query</button>
    </div>
  );
};
```

## API Reference

### QueryExecutionClient

#### Methods

- `getDatasetQueries()`: Get all available dataset queries
- `executeDatasetQuery(queryName, parameters)`: Execute a dataset query
- `getTimeseriesQueries()`: Get all available timeseries queries
- `executeTimeseriesQuery(queryName, parameters)`: Execute a timeseries query
- `executeQuery(queryName, queryType, parameters)`: Execute any query by type
- `getAllQueries()`: Get all available queries (dataset + timeseries)

### QueryManagementClient

#### Methods

- `createQueryDefinition(queryDefinition)`: Create a new query definition
- `updateQueryDefinition(id, queryDefinition)`: Update an existing query definition
- `updateQueryStatus(id, status)`: Update query status (ACTIVE/DRAFT)
- `deleteQueryDefinition(id)`: Delete a query definition
- `getQueryDefinition(id)`: Get a query definition by ID
- `listQueryDefinitions(params)`: List query definitions with filters
- `listQueryDefinitionsPaged(params)`: List query definitions with pagination

## Types

### Query Types

- `QueryType.DATASET`: For dataset queries
- `QueryType.TIMESERIES`: For timeseries queries

### Query Status

- `QueryStatus.ACTIVE`: Active queries (can be executed)
- `QueryStatus.DRAFT`: Draft queries (cannot be executed)

### Parameter Types

- `ParameterType.STRING`: Text value
- `ParameterType.NUMBER`: Numeric value
- `ParameterType.DATE`: Date (YYYY-MM-DD)
- `ParameterType.DATE_TIME`: Date with time
- `ParameterType.BOOLEAN`: True/false value
- `ParameterType.CONTROL`: Selection from allowed values
- `ParameterType.LIST_STRING`: List of strings

## SQL Parameter Syntax

The query string supports two types of parameter syntax:

1. **Named parameters** (`:paramName`): Replaced with bound values at execution time
2. **Template variables** (`${paramName}`): Direct text replacement before SQL parsing

Template variables are useful for dynamic SQL components like column names or functions.

## Error Handling

All client methods can throw errors. Make sure to wrap API calls in try-catch blocks:

```typescript
try {
  const result = await queryClient.executeDatasetQuery('myQuery', params)
  // Handle success
} catch (error) {
  console.error('Query execution failed:', error)
  // Handle error
}
```

## Permissions

Query management endpoints require admin permissions via the authorization system. Specific permissions required:

- `create`: For creating new query definitions
- `read`: For viewing query definitions
- `update`: For updating query definitions and changing status
- `delete`: For deleting query definitions

These permissions are granted to the default masterdata admin role per service called `<domain>-admin`, e.g., `employee-time-admin`.
