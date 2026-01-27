# Tiles Dashboard Demo

A comprehensive demonstration of the TilesDashboard component from the `@newwork/nw-design-system`, showcasing various tile types in a CRM business context.

## Overview

This demo application demonstrates the versatility and functionality of the TilesDashboard component with CRM-focused sample data, including:

- **Text Tiles**: Rich text content with sales summaries and action items
- **KPI Tiles**: Key performance indicators with trends and metrics
- **Chart Tiles**: Various chart types (line, bar, pie) showing business analytics
- **Table Tiles**: Structured data displays for performance tracking

## Features

### Sample Data Includes:

- Sales performance metrics and KPIs
- Revenue trends and regional performance charts
- Team performance tables
- Pipeline health summaries
- Customer satisfaction scores
- Lead source analytics

### Tile Types Demonstrated:

1. **Text Tiles**: Sales summaries, pipeline health checks, action items
2. **KPI Tiles**: Revenue, win rates, customer satisfaction with trend indicators
3. **Chart Tiles**:
   - Line charts for time-based data
   - Bar charts for comparative data
   - Pie charts for distribution data
4. **Table Tiles**: Sales rep performance, regional breakdowns

### Interactive Features:

- Create new tiles using the modal form
- Edit existing tiles with pre-populated data
- Delete tiles with confirmation
- Filter tiles by type and group
- Search tiles by title and group
- Group organization for better data organization

## Technical Implementation

### Dependencies

- React 18+
- `@newwork/nw-design-system` (includes TilesDashboard component)
- `recharts` for chart rendering
- `lucide-react` for icons

### Component Structure

```typescript
import { TilesDashboard } from '@newwork/nw-design-system'

// The component handles:
// - Initial tile data loading
// - Tile CRUD operations
// - State management
// - Data persistence callbacks
```

### Data Format

Each tile follows a structured format defined in the design system:

```typescript
interface Tile {
  id: string
  title: string
  group?: string
  type: 'text' | 'kpi' | 'chart' | 'table'
  createdAt: Date
  updatedAt: Date
  // ... type-specific properties
}
```

## Usage in Business Applications

This demo shows how the TilesDashboard can be integrated into business applications for:

- Executive dashboards
- Sales performance monitoring
- Team collaboration and reporting
- Data visualization and analytics
- Custom business intelligence solutions

## Development Notes

The component is designed to be:

- **Responsive**: Works across different screen sizes
- **Accessible**: Following WCAG guidelines
- **Customizable**: Supports theming and styling
- **Extensible**: Easy to add new tile types
- **Integration-friendly**: Clean API for data persistence

## Future Enhancements

Potential improvements for production use:

- Real-time data integration
- Advanced chart configurations
- Export capabilities
- Collaborative editing
- Role-based permissions
- Template management
