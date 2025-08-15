# Human Resources Application

## Overview
The Human Resources application provides a unified interface for managing employees and job positions within the organization. It follows the same pattern as other relation-based applications in the platform.

## Structure

```
src/business-apps/hr/core/apps/human-resources/
├── HumanResources.tsx          # Main application component
├── index.ts                    # Module exports
├── README.md                   # This documentation
└── components/
    └── views/
        ├── employee-view/      # Employee management view
        │   ├── EmployeeList.tsx
        │   ├── components/
        │   │   └── EmployeeTable.tsx
        │   └── index.ts
        └── job-position-view/  # Job position management view
            ├── JobPositionList.tsx
            ├── components/
            │   ├── JobPositionDetails.tsx
            │   ├── JobPositionTable.tsx
            │   └── VacancyStatusToggle.tsx
            ├── hooks/
            │   ├── useJobPositionFilters.ts
            │   ├── useJobPositionListData.ts
            │   └── [other hooks...]
            ├── queries/
            │   └── JobPositionQueries.ts
            └── index.ts
```

## Features

### Employee View
- Comprehensive employee listing with filtering capabilities
- Employee details panel with expandable information
- Search and filter functionality
- Add new employee functionality

### Job Position View
- Job position management with vacancy tracking
- Position details and requirements
- Filtering by department, job family, and other criteria
- Support for missing job profile identification

## Navigation
The application uses URL-based navigation with query parameters:
- `?view=employees` - Shows the employee management view
- `?view=positions` - Shows the job position management view

## Usage
```typescript
import { HumanResources } from '@/business-apps/hr/core/apps/human-resources';

// Use in your application
<HumanResources 
  accessToken={accessToken}
  userInfo={userInfo}
  additionalData={additionalData}
/>
```

## Dependencies
- Reuses existing HR core hooks and components
- Follows BusinessAppContextProps interface
- Uses @newwork/nw-design-system for UI components
- Integrates with existing GraphQL queries and data management
