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
        ├── job-position-view/  # Job position management view
        │   ├── JobPositionList.tsx
        │   ├── components/
        │   │   ├── JobPositionDetails.tsx
        │   │   ├── JobPositionTable.tsx
        │   │   └── VacancyStatusToggle.tsx
        │   ├── hooks/
        │   │   ├── useJobPositionFilters.ts
        │   │   ├── useJobPositionListData.ts
        │   │   └── [other hooks...]
        │   ├── queries/
        │   │   └── JobPositionQueries.ts
        │   └── index.ts
        └── analytics-view/     # HR Analytics view
            ├── HrAnalyticsView.tsx
            ├── HrAnalytics.tsx  # Original standalone component
            ├── components/
            │   └── views/       # Analytics sub-views
            │       ├── dashboard/
            │       ├── demographics/
            │       ├── workforce/
            │       ├── compensation/
            │       ├── forecasting/
            │       └── structural-analysis/
            ├── hooks/           # Analytics-specific hooks
            ├── queries/         # Analytics GraphQL queries
            ├── utils/           # Analytics utilities
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

### Analytics View

- Comprehensive HR analytics dashboard with multiple specialized views:
  - **Dashboard**: Overview metrics and key performance indicators
  - **Demographics**: Employee demographic analysis and visualizations
  - **Workforce**: Workforce composition, trends, and insights
  - **Compensation**: Salary analysis, payroll insights, and compensation trends
  - **Forecasting**: Predictive analytics for workforce planning and budgeting
  - **Structural Analysis**: Organizational hierarchy analysis and reporting chain insights

## Navigation

The application uses URL-based navigation with query parameters:

- `?view=employees` - Shows the employee management view
- `?view=positions` - Shows the job position management view
- `?view=analytics` - Shows the HR analytics view

### Analytics Sub-Navigation

When in analytics view, additional sub-view parameters are supported:

- `?view=analytics&subView=dashboard` - Analytics dashboard
- `?view=analytics&subView=demographics` - Demographics analysis
- `?view=analytics&subView=workforce` - Workforce analytics
- `?view=analytics&subView=compensation` - Compensation analysis
- `?view=analytics&subView=forecasting` - Forecasting analytics
- `?view=analytics&subView=structural-analysis` - Structural analysis

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
