# Employee Form

A React form component for creating and editing employee records with organizational unit and job position selection.

## Features

- **Personal Information**: First name, last name, email (all mandatory)
- **Employment Information**: Organizational unit and job position selection (both mandatory)
- **Smart Logic**:
  - Job position selection filters by organizational unit when one is selected
  - Auto-selects organizational unit when job position is selected without an org unit
  - Shows all vacant positions when no organizational unit is selected
- **Validation**: Email format validation and required field validation
- **Search & Pagination**: Both organizational units and job positions support search and infinite scroll

## Usage

```tsx
import { Employee } from '@/business-apps/hr/core/forms/employee';

// Create new employee
<Employee accessToken={accessToken} />

// Edit existing employee
<Employee
  accessToken={accessToken}
  initialValues={{
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    organizationalUnitId: 'org-123',
    jobPositionId: 'pos-456'
  }}
  isEdit={true}
/>
```

## Components

- `Employee`: Main wrapper component with context provider
- `EmployeeForm`: The actual form component
- `EmployeeProvider`: React context provider for state management
- `useEmployeeContext`: Hook to access form state and actions

## Hooks

- `useOrganizationalUnits`: Fetches organizational units with search and pagination
- `useJobPositions`: Fetches vacant job positions with organizational unit filtering

## Data Flow

1. Organizational units are loaded on form initialization
2. Job positions are loaded based on selected organizational unit (or all if none selected)
3. When organizational unit changes, job positions are filtered accordingly
4. When job position is selected without org unit, the org unit is auto-selected
5. Form validates all required fields before submission
