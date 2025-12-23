# Employee Comparison Feature - Sales Activity 360°

## Overview

This document describes the Employee Comparison feature added to the Sales Activity 360° application based on CEO feedback.

## CEO Feedback (Original)

> Sales Mitarbeiter Aktivitäten vergleichen: in der Übersicht sehe ich alle Aktivitäten und kann auch entsprechend filtern bzw. einen Mitarbeiter dediziert anschauen, aber ich konnte keine Übersicht sehen, wo die Mitarbeiter verglichen werden. Group by wäre ideal oder eine Liste aggregiert auf die Mitarbeiter.

**Translation**: "Compare Sales Employee Activities: in the overview I see all activities and can also filter accordingly or look at an employee specifically, but I couldn't see an overview where the employees are compared. Group by would be ideal or a list aggregated on the employees."

## Solution Implemented

Added a new "Employee Comparison" tab to the Sales Activity 360° application that provides:

### Features

1. **Employee Activity Aggregation**: Shows all employees with their activity statistics
2. **Side-by-Side Comparison**: Compare multiple employees in a single view
3. **Multiple Time Periods**:
   - Total Activities (all time)
   - This Week
   - This Month
   - Last 30 Days
4. **Trend Analysis**: 30-day trend showing percentage change from previous period
5. **Summary Statistics**:
   - Total active employees
   - Total activities across all employees
   - Average activities per employee
   - Number of employees trending up
6. **Sortable Columns**: Sort by any metric to find top performers
7. **Employee Details**: Shows avatar, name, position, and department

## Technical Implementation

### New Files Created

1. **Hook**: `components/tabs/hooks/useEmployeeComparisonData.ts`
   - Fetches employee activity data from GraphQL
   - Aggregates activities by employee
   - Calculates trends and statistics
   - Supports filtering by entity (account, contact, lead, opportunity)

2. **Columns**: `components/tabs/employeeComparisonColumns.tsx`
   - Defines table columns for comparison view
   - Includes employee info, activity counts, and trends
   - Uses design system components (Avatar, Badge)

3. **Component**: `components/tabs/Activity360ComparisonTab.tsx`
   - Main comparison view component
   - Displays summary statistics cards
   - Renders sortable/paginated table
   - Handles loading and error states

### Modified Files

1. **types/index.ts**: Added 'comparison' to ActivityTabType
2. **components/activity-view/ActivityView.tsx**:
   - Added new tab to subViews configuration
   - Imported Activity360ComparisonTab component
   - Added PiUsersThree icon for tab

## User Experience

### Navigation

- From Sales Activity 360° main view, select "All Activities" or any filter
- Click on the "Employee Comparison" tab (second tab, between List and Calendar)
- View aggregated employee statistics

### UI Components

- **Summary Cards**: 4 KPI cards showing team-wide statistics
- **Comparison Table**: Sortable table with employee details and metrics
- **Trend Indicators**: Visual badges showing positive/negative/neutral trends
- **Pagination**: Default 20 employees per page, customizable

### Sorting

Users can sort by:

- Employee name
- Department
- Total activities (default, descending)
- This week activities
- This month activities
- Last 30 days activities
- 30-day trend
- Last activity date

## Data Source

- **GraphQL API**: SalesActivity entity
- **Aggregation**: Client-side aggregation of activity counts per employee
- **Date Ranges**: Calculated using dayjs with proper timezone handling
- **Filtering**: Supports entity-based filtering (when viewing activities for specific account, contact, etc.)

## Performance Considerations

- Single GraphQL query fetches all necessary data
- Client-side aggregation for flexibility
- Pagination for large employee lists
- Efficient sorting without re-fetching data

## Design System Compliance

- Uses `@newwork/nw-design-system` components exclusively
- Follows `gba:` prefix convention for Tailwind utilities
- Uses semantic color tokens (success, destructive, etc.)
- Includes proper data-testid attributes for testing
- Responsive design with proper spacing

## Future Enhancements (Potential)

- Export to CSV/Excel functionality
- Date range selector for custom periods
- Activity type breakdown per employee
- Team/department grouping
- Performance goals comparison
- Historical trend charts

## Testing

- All components include data-testid attributes
- Component structure follows project standards
- TypeScript types properly defined
- Error handling with retry functionality
- Loading states with proper spinners
- Empty state with helpful messaging

## Accessibility

- Proper semantic HTML structure
- Avatar fallbacks with initials
- Tooltips for truncated text
- Keyboard navigation support (via DataTable)
- Screen reader friendly labels

## Standards Followed

✅ File naming conventions (kebab-case for files, PascalCase for components)
✅ Component size limits (<300 lines per file)
✅ Proper TypeScript typing
✅ Design system component usage
✅ Data-testid implementation
✅ Proper error handling
✅ Loading states
✅ Empty states
✅ Responsive design
✅ No inline styles
✅ No hardcoded colors
✅ Uses gba: prefix for utilities
