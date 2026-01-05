---
alwaysApply: false
---
# REST API and Orgchart Endpoints Integration

## Base URL Configuration
- **Orgchart API Base URL**: `https://newwork-dev.newwork.com/orgchart/api/v1`
- **Authentication**: Bearer token via `context.accessToken`
- **Structure ID**: Use `context.additionalData?.structureId` or fallback to `'99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf'`

## Hook Pattern for Orgchart API Integration

### Standard Hook Structure
```typescript
import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';

const ORGCHART_BASE_URL = env('NEXT_PUBLIC_REST_ENDPOINT_ORGCHART')!;

export const useEntityData = (context: BusinessAppContextProps) => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const restClient = useRestClient(ORGCHART_BASE_URL);

  const fetchData = useCallback(async (): Promise<Entity[]> => {
    try {
      const structureId = context.additionalData?.structureId || '99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf';
      
      if (!structureId) {
        throw new Error('Structure ID is required');
      }

      const response = await restClient.get<EntityResponse[]>(
        '/endpoint',
        {
          params: { structureId },
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        }
      );

      return response.map(transformEntity);
    } catch (error) {
      console.error('Error fetching data:', error);
      throw new Error('Failed to fetch data from orgchart API');
    }
  }, [context.accessToken, context.additionalData?.structureId, restClient]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchData();
      setEntities(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchData]);

  const refetch = useCallback(() => {
    return loadData();
  }, [loadData]);

  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken, loadData]);

  return {
    entities,
    isLoading,
    error,
    refetch,
    // Add filter and search functions as needed
  };
};
```

## Available Orgchart Endpoints

### Site Locations
- **Endpoint**: `/site-locations?structureId={structureId}`
- **Method**: GET
- **Response Structure**:
  ```typescript
  interface SiteLocationResponse {
    id: string;
    structureId: string;
    name: string;
    addressLine?: {
      streetAddress: string;
    };
    postalCode?: string;
    locality?: string;
    region_ref?: string;
    country_ref?: string;
    code?: string;
    employees: Employee[];
    costCenters: CostCenter[];
  }
  ```

### Companies
- **Endpoint**: `/companies?structureId={structureId}`
- **Method**: GET
- **Hierarchical Structure**: Supports nested company structures with parent-child relationships

### Projects  
- **Endpoint**: `/projects?structureId={structureId}`
- **Method**: GET
- **Optional Parameters**: `valid_to` for date filtering

### Cost Centers
- **Endpoint**: `/cost-centers?structureId={structureId}`
- **Method**: GET
- **Response Structure**:
  ```typescript
  interface CostCenterResponse {
    id: string;
    structureId: string;
    code: string;
    name: string;
    description: string;
    siteLocationId?: string;
    siteLocationName?: string;
    organizationalUnits: {
      organizationalUnitId: string;
      organizationalUnitName: string;
    }[];
    employees: {
      employeeId: string;
      employeeFirstName: string;
      employeeLastName: string;
    }[];
    additionalProperties: Record<string, any>;
  }
  ```

### Organizational Units
- **Endpoint**: `/organizational-units?structureId={structureId}`
- **Method**: GET

## Authentication Requirements

### Headers
```typescript
headers: {
  Authorization: `Bearer ${context.accessToken}`
}
```

### Error Handling
- Always wrap API calls in try-catch blocks
- Provide meaningful error messages to users
- Log detailed errors to console for debugging
- Set proper loading and error states

## Data Transformation Pattern

### Transform Raw API Data
```typescript
const transformEntity = (apiData: ApiResponse): UiEntity => {
  return {
    id: apiData.id,
    name: apiData.name,
    // Transform other fields as needed for UI
    // Add computed properties (status, formatted dates, etc.)
  };
};
```

## Common Query Parameters
- `structureId`: Required for all endpoints (identifies the organizational structure)
- `limit`: For pagination (when supported)
- `offset`: For pagination (when supported)
- `search`: For text-based filtering (when supported)

## Best Practices

1. **Always check for `structureId`**: Every orgchart API call requires a valid structure ID
2. **Use proper TypeScript interfaces**: Define response types for all API endpoints
3. **Implement proper loading states**: Show spinners during data fetching
4. **Handle errors gracefully**: Show user-friendly error messages with retry options
5. **Cache appropriately**: Use useCallback and useMemo to prevent unnecessary re-renders
6. **Transform data for UI**: Convert API responses to UI-friendly formats
7. **Provide filter functions**: Add search, sorting, and filtering capabilities in hooks

## Department/Organizational Units Implementation

### API Endpoint
- **URL**: `/structures/{structureId}?nodeType=organization_unit&isPlanningMode=false`
- **Method**: GET
- **Purpose**: Fetch hierarchical organizational units (departments and teams)

### Response Structure
```json
{
  "structure": {
    "structureId": "99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf",
    "name": "NEWWORK",
    "description": "Structure description",
    "isActive": true,
    "structureType": "organizational",
    "version": 69
  },
  "nodes": [
    {
      "id": "49aa88c4-dd6a-49e0-9fa7-2510d279ee3b",
      "type": "organization_unit",
      "parentNode": "0cb6e56c-4135-429f-a380-60e39e82d77c",
      "data": {
        "numberOfAssignedJobPositions": 6,
        "numberOfAssignedEmployees": 6,
        "numberOfTotalJobPositions": 7,
        "numberOfChildUnits": 0,
        "organizationalUnitData": {
          "name": "AQA",
          "description": "",
          "organizationUnitId": "c63cd8e4-e2c8-462a-bf3b-70ab27912639",
          "type": "TEAM",
          "company": {
            "companyId": "62bee1ab-b494-4c7b-8d97-1b9fd1713f99",
            "companyName": "NEWWORK Software GmbH"
          },
          "costCenter": {
            "costCenterId": "28b7fbfd-1090-4fa5-b1a1-567437b49233",
            "costCenterName": "Global"
          }
        },
        "supervisor": {
          "supervisorId": "67226912-c722-4f5c-b8da-1d57b1f15efb",
          "firstName": "Manager1",
          "lastName": "AQA",
          "role": "Manager",
          "mainJobPosition": {
            "jobPositionId": "beb9d0c0-2e6a-4a1d-a36d-4e1dc3c7329f",
            "jobPositionName": "Test"
          }
        },
        "rank": 0,
        "numberOfOpenJobPositions": 1
      }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "parent-node-id",
      "target": "child-node-id",
      "relationshipType": "hierarchical",
      "edgeType": "organization_unit"
    }
  ]
}
```

### Implementation Notes
- Use `useDepartments` hook for data fetching and hierarchy management
- Display as tree structure with expand/collapse functionality
- Show statistics (employee count, sub-units, open positions)
- Include supervisor information when available
- Filter by department type (TEAM vs DEPARTMENT)
- Support search across name, description, code, and supervisor
- Handle hierarchical parent-child relationships using edges data

## Matrix Teams Implementation

### API Endpoint
- **URL**: `/matrix-units?structureId={structureId}`
- **Method**: GET
- **Purpose**: Fetch flat list of matrix teams (cross-functional teams)

### Response Structure
```json
[
  {
    "id": "d4762ab1-2585-4a6b-aca2-bd81ad82918f",
    "structureId": "99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf",
    "name": "Test Mihaela",
    "description": "",
    "createdAt": "2025-03-19T14:07:30.915Z",
    "rank": 7,
    "leader": {
      "id": "b03fc265-a6c4-42fa-983a-f3222c854dcf",
      "firstName": "Daniele",
      "lastName": "Viola",
      "pictureUrl": "{\"appName\":\"userProfile\",\"fileId\":\"...\",\"path\":\"/api/v1/tenant/downloads/...\"}",
      "role": "Manager",
      "jobPosition": {
        "jobPositionId": "2b944223-b832-4649-b26f-63339f0c27cd",
        "jobPositionName": "Application Engineer"
      },
      "matrixUnit": {
        "matrixUnitId": "fa022eb4-02bd-4be1-b22a-a148bcd3771a",
        "matrixUnitName": "Every Employee",
        "percentage": 0
      }
    }
  }
]
```

### Implementation Notes
- Use `useTeams` hook for data fetching and flat list management
- Display as table or card grid (not hierarchical like departments)
- Support both table and cards view modes
- Show team leader information with avatars and job positions
- Calculate team age from creation date ("2 months ago" format)
- Status determination: teams with leaders = Active, without = Inactive
- Parse JSON pictureUrl to extract image paths
- Support search across name, description, leader name, and job position
- Sort by rank, name, creation date, or leader name
- Filter by status (Active/Inactive) and leader presence
