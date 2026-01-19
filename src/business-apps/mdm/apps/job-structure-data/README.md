# Job Structure Data App

This app manages job structure master data including job families, job level groups, job functions, and job profiles for HR operations.

## Overview

The Job Structure Data app provides comprehensive functionality to:

- Manage job families as high-level categorizations of related roles
- Define job levels with expandable hierarchical career progression paths
- Manage job functions with categories and levels
- Create and maintain job profiles with skills and status tracking
- Support organizational hierarchy and career progression planning

## Components

### JobStructureData

Main component that provides the overall layout and tab navigation for job structure management.

### JobFamiliesTab

Manages job families including:

- CRUD operations for job families
- High-level categorization (Technology, Business, Creative, Operations, Finance)
- Status management (Active/Inactive)
- Search and filtering capabilities

### JobLevelsTab

Manages job levels with expandable functionality including:

- CRUD operations for job level groups
- Expandable rows showing individual job levels
- Group categorization (Technical, Leadership, Executive)
- Career progression visualization
- Individual job level details (salary grade, experience requirements)

### JobFunctionsTab

Manages job functions including:

- CRUD operations for job functions
- Function categorization (Technology, Product, Operations, Business)
- Level assignment (1-5 scale)
- Search and filtering capabilities

### JobProfilesTab

Manages job profiles including:

- Profile creation and maintenance
- Skills tagging and management
- Status tracking (Active, Inactive, Draft)
- Function and level associations

## Features

### Job Family Management

- **High-Level Categories**: Technology, Business, Creative, Operations, Finance
- **Code Management**: Unique codes for each family
- **Status Tracking**: Active/Inactive status management
- **Description Support**: Detailed descriptions for clarity

### Job Level Management

- **Expandable Groups**: Click to expand and view individual job levels
- **Career Progression**: Clear visualization of advancement paths
- **Group Categories**: Technical, Leadership, Executive tracks
- **Level Details**: Each group contains multiple job levels with specific requirements

### Job Function Management

- **Function Categories**: Technology, Product, Operations, Business
- **Level System**: 1-5 scale for function complexity
- **Code Management**: Unique codes for each function
- **Description Support**: Detailed descriptions for clarity

### Job Profile Management

- **Skills Tagging**: Dynamic skill assignment and tracking
- **Status Management**: Active, Inactive, Draft status tracking
- **Function/Level Mapping**: Direct association with functions and levels
- **Profile Descriptions**: Comprehensive role descriptions

## Data Structure

### JobFamily

```typescript
interface JobFamily {
  id: string
  name: string
  code: string
  description?: string
  category: string
  isActive: boolean
}
```

### JobLevelGroup

```typescript
interface JobLevelGroup {
  id: string
  name: string
  code: string
  description?: string
  category: string
  isActive: boolean
  jobLevels: JobLevel[]
  expanded?: boolean
}
```

### JobLevel

```typescript
interface JobLevel {
  id: string
  name: string
  code: string
  level: number
  description?: string
  salaryGrade: number
  experienceYears: number
}
```

### JobFunction

```typescript
interface JobFunction {
  id: string
  name: string
  code: string
  description?: string
  level: number
  category: string
}
```

### JobProfile

```typescript
interface JobProfile {
  id: string
  name: string
  code: string
  function: string
  level: string
  description?: string
  skills: string[]
  status: 'Active' | 'Inactive' | 'Draft'
}
```

## Navigation

The app supports both URL query parameters and hash-based navigation:

### URL Query Parameters

- `/hr/master-data/job-structure-data?tab=job-families`
- `/hr/master-data/job-structure-data?tab=job-levels`
- `/hr/master-data/job-structure-data?tab=job-functions`
- `/hr/master-data/job-structure-data?tab=job-profiles`

### Hash Navigation (Fallback)

- `#job-families`
- `#job-levels`
- `#job-functions`
- `#job-profiles`

## Integration

### HR Settings Integration

The app is integrated into HR Settings as a dedicated card:

- **Icon**: Organization Chart (RiOrganizationChart)
- **Title**: Job Structure Data
- **Description**: Manage job families, levels, functions, and profiles
- **Navigation**: Direct links to each tab

### Mock Data

The app includes comprehensive mock data for demonstration:

- 8 sample job families across different categories
- 3 sample job level groups with expandable job levels (9 total levels)
- 5 sample job functions across different categories
- 5 sample job profiles with skills and status

## Styling

The app uses inline styles to ensure consistent rendering:

- Gradient backgrounds for visual appeal
- Card-based layouts for data organization
- Responsive grid systems for forms
- Color-coded status indicators

## Search and Filtering

Each tab includes comprehensive search functionality:

- **Job Families**: Search by name, code, description, category
- **Job Levels**: Search by name, code, description, category
- **Job Functions**: Search by name, code, description, category
- **Job Profiles**: Search by name, code, function, level, description

## Form Validation

Comprehensive form validation for data integrity:

- Required field validation
- Format validation for codes
- Range validation for levels and grades
- Skills validation for profiles

## Error Handling

Robust error handling throughout the application:

- Try-catch blocks for all operations
- User-friendly error messages
- Console logging for debugging
- Graceful fallbacks for failed operations

## Future Enhancements

Potential areas for future development:

- Integration with real HR systems
- Advanced reporting and analytics
- Bulk import/export functionality
- Role-based access control
- Audit trail tracking
- Integration with performance management systems
