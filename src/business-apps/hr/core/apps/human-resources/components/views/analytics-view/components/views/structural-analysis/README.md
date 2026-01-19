# Structural Analysis Reports

A comprehensive React application for analyzing organizational structure, management effectiveness, and reporting efficiency within the NEWWORK Gravity Business Apps platform.

## Overview

The Structural Analysis Reports application provides detailed insights into organizational health through multiple analytical perspectives:

- **Span of Control Analysis**: Evaluates management efficiency and optimal team sizes
- **Organizational Depth Analysis**: Visualizes hierarchy levels and structural complexity
- **Reporting Chain Analysis**: Identifies bottlenecks and communication inefficiencies
- **Structural Health Dashboard**: Provides an overall assessment of organizational effectiveness

## Features

### 📊 Multi-Tab Interface

- **Overview Tab**: High-level structural health metrics and key insights
- **Span of Control Tab**: Detailed manager workload analysis with recommendations
- **Depth Analysis Tab**: Sunburst visualization of organizational hierarchy
- **Reporting Chains Tab**: Chain length analysis and bottleneck identification

### 🎯 Key Metrics

- Structural Health Score (0-100%)
- Average Span of Control
- Hierarchy Depth Analysis
- Reporting Chain Efficiency
- Manager Utilization Rates

### 📈 Visualizations

- **SunburstChart**: Interactive hierarchical depth visualization using Recharts
- **Bar Charts**: Span of control distribution and chain length analysis
- **Progress Indicators**: Manager performance against optimal ranges
- **Heat Maps**: Color-coded status indicators for quick identification

### 🔍 Analysis Features

- Optimal span of control recommendations (3-8 direct reports)
- Executive vs. frontline management range differentiation
- Bottleneck manager identification
- Efficiency scoring for organizational units
- Real-time data integration

## Technical Implementation

### Architecture

```
structural-analysis-reports/
├── components/
│   ├── SunburstVisualization.tsx    # Hierarchical depth visualization
│   ├── SpanOfControlChart.tsx       # Management effectiveness analysis
│   └── ReportingChainAnalysis.tsx   # Communication efficiency analysis
├── hooks/
│   └── useStructuralAnalysisDataIntegration.ts  # Data integration logic
├── queries/
│   └── StructuralAnalysisQueries.ts # GraphQL queries
├── types/
│   └── structuralTypes.ts           # TypeScript interfaces
├── utils/
│   └── structuralUtils.ts           # Data processing functions
├── StructuralAnalysisReport.tsx    # Main component
├── index.ts                         # Exports
└── README.md                        # Documentation
```

### Data Sources

- **OrganizationalUnitRelationship**: Hierarchy structure
- **Employee**: Staff and management data
- **SiteLocation**: Geographic distribution
- **EmployeeSiteLocation**: Location assignments

### Key Dependencies

- **React**: UI framework
- **Ant Design**: Component library
- **Recharts**: Chart visualizations
- **TypeScript**: Type safety
- **GraphQL**: Data fetching

## Usage

### Basic Implementation

```typescript
import { StructuralAnalysisReport } from '@/business-apps/hr/reports/apps/structural-analysis-reports';

const MyComponent = (props: BusinessAppContextProps) => {
  return (
    <StructuralAnalysisReport
      {...props}
      prefixDataTestId="MyStructuralAnalysis"
    />
  );
};
```

### Custom Integration

```typescript
import {
  useStructuralAnalysisDataIntegration,
  SpanOfControlChart,
  SunburstVisualization
} from '@/business-apps/hr/reports/apps/structural-analysis-reports';

const CustomAnalysis = (props: BusinessAppContextProps) => {
  const { data, isLoading, error } = useStructuralAnalysisDataIntegration(props);

  if (isLoading) return <Spin />;
  if (error) return <Alert message={error} type="error" />;

  return (
    <div>
      <SpanOfControlChart
        data={data.spanOfControlData}
        summary={data.spanOfControlSummary}
      />
      <SunburstVisualization data={data.sunburstData} />
    </div>
  );
};
```

## Analysis Algorithms

### Span of Control Evaluation

- **Optimal Range**: 3-8 direct reports (general management)
- **Executive Range**: 2-6 direct reports (senior leadership)
- **Frontline Range**: 5-12 direct reports (operational management)
- **Status Classification**: Under-utilized, Optimal, Over-burdened

### Organizational Efficiency Scoring

```typescript
const calculateEfficiencyScore = (depth: number, employeeCount: number): number => {
  const depthPenalty = Math.max(0, depth - 3) * 10
  const baseScore = 100
  const employeeBonus = Math.min(20, employeeCount * 2)

  return Math.max(0, Math.min(100, baseScore - depthPenalty + employeeBonus))
}
```

### Structural Health Calculation

- **Span Efficiency**: Percentage of managers with optimal spans
- **Depth Efficiency**: Penalty for excessive hierarchy levels
- **Chain Efficiency**: Penalty for long reporting chains
- **Overall Score**: Weighted average of all efficiency factors

## Recommendations Engine

### Span of Control Recommendations

- **Under-utilized**: Suggest role consolidation or responsibility expansion
- **Over-burdened**: Recommend adding management layers or redistributing reports
- **Optimal**: Maintain current structure

### Structural Optimization

- **Deep Hierarchies**: Suggest flattening organizational structure
- **Long Reporting Chains**: Recommend intermediate management layers
- **Bottleneck Managers**: Identify redistribution opportunities

## Performance Considerations

### Data Processing

- Parallel GraphQL queries for optimal loading
- Efficient tree traversal algorithms (BFS for level calculation)
- Memoized calculations with `useCallback` hooks
- Optimized re-rendering with proper dependency management

### Memory Management

- Lazy loading of detailed analysis data
- Efficient data structures for tree operations
- Minimal re-calculations on tab switching

## Testing

### Test Data Requirements

- Organizational structure with multiple hierarchy levels
- Employee-manager relationships
- Geographic distribution data
- Position assignments

### Key Test Scenarios

- Loading states and error handling
- Data integration across multiple sources
- Chart responsiveness and interactivity
- Tab navigation and state management

## Publishing

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run publish:screen -- /hr/reports/apps/structural-analysis-reports
```

### Fast Publish (Skip Prompts)

```bash
npm run publish:screen -- /hr/reports/apps/structural-analysis-reports --fast
```

## Business Value

### For HR Teams

- Identify organizational inefficiencies
- Support restructuring decisions with data
- Monitor management effectiveness
- Plan organizational growth strategies

### For Management

- Optimize team structures
- Reduce management bottlenecks
- Improve communication flows
- Enhance decision-making speed

### For Executives

- Strategic organizational planning
- Merger and acquisition analysis
- Cost optimization opportunities
- Leadership development insights

## Future Enhancements

### Planned Features

- Historical trend analysis
- Benchmarking against industry standards
- Predictive modeling for organizational changes
- Integration with performance management systems

### Advanced Analytics

- Machine learning recommendations
- Scenario modeling capabilities
- Custom efficiency metrics
- Export functionality for external analysis

## Support

For technical support or feature requests, please contact the NEWWORK development team or refer to the platform documentation.

## Version History

- **v1.0.0**: Initial release with core structural analysis features
- **v1.1.0**: Added SunburstChart visualization for depth analysis
- **v1.2.0**: Enhanced span of control recommendations engine
- **v1.3.0**: Integrated reporting chain bottleneck analysis
