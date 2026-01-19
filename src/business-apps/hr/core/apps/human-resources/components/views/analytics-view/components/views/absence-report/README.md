# Absence Report Application

A comprehensive absence reporting tool for HR analytics that provides insights into employee absence patterns, vacation usage, and departmental absence trends.

## Features

### Overview Tab

- **Key Statistics Cards**: Display vacation days used percentage, sick days used percentage, total employees, and average days used
- **Monthly Vacation Usage Chart**: Line chart showing vacation day usage trends over time
- **Total Absence Days Chart**: Bar chart showing total absence days by month

### Charts Tab

- **Absence by Category**: Pie chart showing breakdown of absence types (Recreation, Sick Leave, Business Related, Personal)
- **Absence by Cost Center**: Stacked column chart showing absence breakdown by department and category

### Details Tab

- **Cost Center Table**: Detailed breakdown of absence days by cost center and category
- **Employee Table**: Individual employee absence summaries with usage percentages

## Data Sources

The application integrates with two main GraphQL entities:

- **EmployeeAbsence**: Individual absence records with dates, days, and descriptions
- **EmployeeAbsenceBalance**: Annual absence balances and allocations

## Key Components

### AbsenceReport.tsx

Main component that orchestrates the entire application with tabbed navigation

### useAbsenceDataIntegration.ts

Central data integration hook that:

- Fetches data from GraphQL endpoints
- Transforms raw data into usable formats
- Calculates statistics and metrics
- Provides loading and error states

### Components

- **AbsenceStatisticsDashboard**: Main dashboard with key charts
- **AbsenceChartsView**: Detailed chart analysis
- **AbsenceDetailsTable**: Tabular data views

### Utilities

- **absenceUtils.ts**: Data transformation and calculation functions
- **absenceTypes.ts**: TypeScript type definitions

## Usage

```typescript
import AbsenceReport from './AbsenceReport';

// Use within a business app context
<AbsenceReport {...businessAppContext} />
```

## Data Processing

The application automatically categorizes absences based on:

- Duration (short absences assumed to be sick leave)
- Description keywords (vacation, sick, business, personal)
- Annual totals from balance data

## Calculations

- **Vacation Usage %**: (Used vacation days / Annual vacation allocation) × 100
- **Sick Usage %**: (Used sick days / Annual sick allocation) × 100
- **Average Days Used**: Total absence days / Number of employees
- **Department Totals**: Aggregated across all absence categories

## Error Handling

- Loading states during data fetching
- Error display with retry functionality
- Graceful handling of missing or malformed data

## Performance

- Parallel data fetching for optimal loading times
- Efficient data transformation and aggregation
- Memoized chart configurations
