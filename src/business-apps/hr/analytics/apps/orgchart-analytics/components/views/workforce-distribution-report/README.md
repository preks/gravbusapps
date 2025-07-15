# Workforce Distribution Report

A comprehensive React TypeScript application for analyzing and visualizing workforce distribution across multiple dimensions including geography, organizational structure, demographics, and employment patterns.

## Overview

The Workforce Distribution Report provides deep insights into how employees are distributed across:
- **Geographic dimensions**: Countries, regions, and site locations
- **Organizational structure**: Departments, job levels, companies, and cost centers
- **Demographics**: Gender, age groups, and tenure
- **Employment patterns**: Employment types and hiring trends

## Features

### 📊 Interactive Visualizations
- **Pie Charts**: Clear percentage-based distribution views
- **Bar Charts**: Comparative analysis with horizontal and vertical layouts
- **Statistics Dashboard**: Key metrics and performance indicators
- **Real-time Data**: Live data integration with GraphQL APIs

### 🎯 Multi-Dimensional Analysis
- **Geographic Distribution**: Country, region, and site-based analysis
- **Organizational Insights**: Department and job level distributions
- **Demographic Analytics**: Age, gender, and tenure breakdowns
- **Employment Analytics**: Type and hiring trend analysis

### 📈 Key Metrics
- Total employee count and distribution percentages
- Gender diversity index calculation
- Average age and tenure statistics
- Geographic spread indicators
- Organizational complexity metrics

## Technical Architecture

### File Structure
```
workforce-distribution-report/
├── components/
│   ├── DistributionPieChart.tsx      # Pie chart visualization
│   ├── DistributionBarChart.tsx      # Bar chart visualization
│   └── WorkforceStatisticsDashboard.tsx # Statistics overview
├── hooks/
│   └── useWorkforceDataIntegration.ts # Data integration logic
├── queries/
│   └── WorkforceQueries.ts           # GraphQL queries
├── types/
│   └── workforceTypes.ts             # TypeScript interfaces
├── utils/
│   └── workforceUtils.ts             # Data processing functions
├── WorkforceDistributionReport.tsx   # Main component
├── index.ts                          # Exports
└── README.md                         # Documentation
```

### Data Flow
1. **GraphQL Query**: Fetch employee data with organizational relationships
2. **Data Processing**: Transform raw data into distribution segments
3. **Statistics Calculation**: Generate key metrics and insights
4. **Visualization**: Render charts and dashboards
5. **User Interaction**: Toggle between chart types and tabs

### GraphQL Schema Integration
Utilizes the following entities:
- `Employee`: Core employee information
- `OrganizationalUnit`: Organizational structure
- `SiteLocation`: Geographic locations
- `CostCenter`: Cost center assignments
- `JobPosition`: Job roles and levels
- `Company`: Company affiliations

## Components

### WorkforceDistributionReport (Main Component)
The primary component that orchestrates the entire report interface.

**Props**:
- Extends `BusinessAppContextProps` for authentication and context

**Features**:
- Tabbed interface for different distribution views
- Chart type toggle (pie/bar charts)
- Loading states and error handling
- Data refresh functionality

### DistributionPieChart
Renders pie charts for distribution data with interactive tooltips.

**Props**:
```typescript
interface DistributionPieChartProps {
  data: DistributionSegment[];
  title: string;
  height?: number;
  dataTestId?: string;
}
```

### DistributionBarChart
Renders horizontal and vertical bar charts with color coding.

**Props**:
```typescript
interface DistributionBarChartProps {
  data: DistributionSegment[];
  title: string;
  height?: number;
  dataTestId?: string;
  layout?: 'horizontal' | 'vertical';
}
```

### WorkforceStatisticsDashboard
Displays key workforce metrics in an organized dashboard layout.

**Props**:
```typescript
interface WorkforceStatisticsDashboardProps {
  statistics: WorkforceStatistics;
  dataTestId?: string;
}
```

## Data Processing

### Distribution Calculation
The application processes raw employee data to generate distribution segments:

```typescript
interface DistributionSegment {
  name: string;
  count: number;
  percentage: number;
  color: string;
  subSegments?: DistributionSegment[];
}
```

### Statistics Generation
Calculates comprehensive workforce statistics:
- Employee counts and percentages
- Average age and tenure
- Gender diversity index
- Geographic and organizational spread

### Color Coding
Uses a consistent color palette across all visualizations for better user experience and data comprehension.

## API Integration

### GraphQL Queries
The application uses optimized GraphQL queries to fetch:
- Employee personal information
- Organizational unit relationships
- Site location assignments
- Cost center affiliations
- Job position details

### Authentication
Integrates with the NEWWORK authentication system using:
- Access tokens from `BusinessAppContextProps`
- Automatic token refresh handling
- Error management for authentication failures

## Usage Examples

### Basic Implementation
```typescript
import WorkforceDistributionReport from './workforce-distribution-report';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const MyApp: React.FC<BusinessAppContextProps> = (context) => {
  return <WorkforceDistributionReport {...context} />;
};
```

### Custom Chart Integration
```typescript
import { DistributionPieChart } from './workforce-distribution-report';

const CustomChart: React.FC = () => {
  return (
    <DistributionPieChart
      data={distributionData}
      title="Custom Distribution"
      height={400}
    />
  );
};
```

## Performance Considerations

### Data Optimization
- Efficient GraphQL queries with selective field fetching
- Client-side data caching and memoization
- Lazy loading of chart components

### Rendering Optimization
- React.memo for component optimization
- useCallback for function stability
- Responsive design for various screen sizes

## Accessibility

### WCAG Compliance
- Color contrast ratios meet accessibility standards
- Keyboard navigation support
- Screen reader compatibility
- Alternative text for visual elements

### Testing
- Comprehensive data-testid attributes
- Unit test coverage for utility functions
- Integration tests for data flow
- Accessibility testing compliance

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile and tablet
- Progressive enhancement for older browsers

## Development

### Prerequisites
- React 18+
- TypeScript 4.5+
- Ant Design 5+
- Recharts 2+
- dayjs for date handling

### Local Development
1. Ensure all dependencies are installed
2. Configure GraphQL endpoint
3. Set up authentication tokens
4. Run the development server

### Publishing
Use the publishing script to deploy the component:
```bash
npm run publish:screen -- /hr/reports/apps/workforce-distribution-report
```

## Future Enhancements

### Planned Features
- Export functionality (PDF, CSV, Excel)
- Advanced filtering and search capabilities
- Drill-down analytics for detailed views
- Comparative analysis across time periods
- Custom dashboard configuration

### Performance Improvements
- Virtual scrolling for large datasets
- Progressive data loading
- Enhanced caching strategies
- Optimized chart rendering

## Support

For technical support or feature requests, please contact the NEWWORK development team.

## License

This component is part of the NEWWORK Gravity Business Apps platform and follows the company's licensing terms. 