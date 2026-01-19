---
description: Whenever the Agent has to create or use Chart components. Whenever charts or visualizations or used.
alwaysApply: false
---
# Chart Components Guidelines

## Overview

All charts in this application MUST use the Chart components from `@newwork/nw-design-system` which internally use the `recharts` library. Do NOT use recharts directly or create custom chart implementations.

## Core Chart Components

### Required Imports

```typescript
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system';

// Import specific recharts components as needed
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
```

### ChartContainer

The `ChartContainer` is the wrapper for all charts and MUST be used for every chart implementation.

**Required Props:**
- `config`: Chart configuration object defining data keys, labels, and colors
- `className`: For sizing (e.g., `"gba:h-[300px]"`)

**Example:**
```typescript
const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "#3B82F6",
  },
  profit: {
    label: "Profit", 
    color: "#10B981",
  },
};

<ChartContainer config={chartConfig} className="gba:h-[400px]">
  {/* Chart content */}
</ChartContainer>
```

## Chart Configuration

### chartConfig Object Structure

```typescript
type ChartConfig = {
  [key: string]: {
    label: string;
    color: string;
    icon?: React.ComponentType; // Optional
  };
};
```

### Dynamic Configuration Example

```typescript
const chartConfig = React.useMemo(() => {
  const config: Record<string, { label: string; color: string }> = {};
  data.forEach(item => {
    config[item.key] = {
      label: item.displayName,
      color: item.color
    };
  });
  return config;
}, [data]);
```

## Common Chart Patterns

### Pie Chart with Donut Style

```typescript
<ChartContainer config={chartConfig} className="gba:h-[300px]">
  <PieChart>
    <ChartTooltip
      cursor={false}
      content={<ChartTooltipContent hideLabel />}
    />
    <Pie
      data={chartData}
      dataKey="value"
      nameKey="name"
      innerRadius="60%"
      outerRadius="80%"
      strokeWidth={2}
    >
      {chartData.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={entry.fill} />
      ))}
    </Pie>
  </PieChart>
</ChartContainer>
```

### Line Chart

```typescript
<ChartContainer config={chartConfig} className="gba:h-[300px]">
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis 
      dataKey="month" 
      tickLine={false}
      axisLine={false}
      tickMargin={8}
    />
    <YAxis 
      tickLine={false}
      axisLine={false}
      tickMargin={8}
    />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Line 
      type="monotone" 
      dataKey="value" 
      stroke="var(--nw-color-value)" 
      strokeWidth={3}
      dot={{ r: 4 }}
      activeDot={{ r: 6 }}
    />
  </LineChart>
</ChartContainer>
```

### Bar Chart

```typescript
<ChartContainer config={chartConfig} className="gba:h-[300px]">
  <BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="category" />
    <YAxis />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar 
      dataKey="value" 
      fill="var(--nw-color-value)" 
      radius={[4, 4, 0, 0]}
    />
  </BarChart>
</ChartContainer>
```

## Progress Bars

For progress indicators, use the `Progress` component instead of custom implementations:

```typescript
import { Progress } from '@newwork/nw-design-system';

<Progress 
  value={Math.min((actualValue / maxValue) * 100, 100)} 
  className="gba:h-3" 
/>
```

## Data Structure Requirements

### Standard Data Format

Charts expect data in specific formats:

**Pie Chart Data:**
```typescript
const pieData = [
  { name: 'Category A', value: 400, fill: '#0088FE' },
  { name: 'Category B', value: 300, fill: '#00C49F' },
  { name: 'Category C', value: 300, fill: '#FFBB28' }
];
```

**Line/Bar Chart Data:**
```typescript
const lineData = [
  { month: 'Jan', value: 400, target: 350 },
  { month: 'Feb', value: 300, target: 400 },
  { month: 'Mar', value: 200, target: 300 }
];
```

## Styling and Theming

### CSS Variables

Charts automatically use CSS variables for colors when using `var(--nw-color-{key})`:

```typescript
<Line 
  dataKey="revenue" 
  stroke="var(--nw-color-revenue)" 
/>
```

### Standard Colors

Use these standard colors for consistency:

```typescript
const STANDARD_COLORS = [
  '#1890FF', '#2FC25B', '#FACC14', '#223273', 
  '#8543E0', '#13C2C2', '#3436C7', '#F04864'
];
```

### Sizing Classes

Always use Tailwind classes with `gba:` prefix for chart containers:

- `gba:h-[200px]` - Small charts
- `gba:h-[300px]` - Standard charts  
- `gba:h-[400px]` - Large charts
- `gba:h-[500px]` - Extra large charts

## Card Integration

Charts should always be wrapped in Card components:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';

<Card>
  <CardHeader>
    <CardTitle>Chart Title</CardTitle>
  </CardHeader>
  <CardContent>
    <ChartContainer config={chartConfig} className="gba:h-[300px]">
      {/* Chart content */}
    </ChartContainer>
  </CardContent>
</Card>
```

## Best Practices

### 1. Always Use ChartContainer
- Never use recharts components directly without ChartContainer wrapper
- Always provide proper chartConfig object

### 2. Responsive Design
- Use responsive classes: `gba:h-[200px] md:gba:h-[300px]`
- Test charts on different screen sizes

### 3. Loading States
- Use `Spinner` component for loading states
- Provide proper loading indicators

### 4. Error Handling
- Use `Alert` component for error states
- Provide meaningful error messages

### 5. Accessibility
- Include proper labels in chartConfig
- Ensure sufficient color contrast
- Provide alternative data representation when needed

## Common Mistakes to Avoid

### ❌ Don't Do This

```typescript
// DON'T: Using recharts directly
import { PieChart } from 'recharts';

<ResponsiveContainer>
  <PieChart>
    {/* Direct recharts usage */}
  </PieChart>
</ResponsiveContainer>
```

```typescript
// DON'T: Missing chartConfig
<ChartContainer className="gba:h-[300px]">
  <PieChart data={data} />
</ChartContainer>
```

```typescript
// DON'T: Manual color assignment
<Bar dataKey="value" fill="#3B82F6" />
```

### ✅ Do This Instead

```typescript
// DO: Use ChartContainer with proper config
<ChartContainer config={chartConfig} className="gba:h-[300px]">
  <PieChart>
    <Pie data={data} dataKey="value" />
  </PieChart>
</ChartContainer>
```

```typescript
// DO: Use CSS variables for colors
<Bar dataKey="value" fill="var(--nw-color-value)" />
```

## Troubleshooting

### Chart Not Displaying
1. Check if `ChartContainer` is properly configured
2. Verify chartConfig matches data keys
3. Ensure proper data structure

### Colors Not Working
1. Verify chartConfig includes color properties
2. Use `var(--nw-color-{key})` format
3. Check data includes `fill` property for Pie charts

### Tooltips Not Showing
1. Ensure `ChartTooltip` is included
2. Use `ChartTooltipContent` component
3. Check data structure includes proper keys

### Performance Issues
1. Memoize chartConfig with `React.useMemo`
2. Memoize chart data
3. Avoid recreating objects in render

## Examples from Codebase

Refer to these migrated components for real-world examples:

- `AnalyticsCharts.tsx` - Pie and Line charts
- `OverviewTab.tsx` - Progress components

## Migration Notes

When migrating from antd charts or direct recharts usage:

1. Wrap existing recharts components in `ChartContainer`
2. Create proper `chartConfig` object
3. Replace custom tooltips with `ChartTooltip`/`ChartTooltipContent`
4. Update color references to use CSS variables
5. Replace manual progress bars with `Progress` component

---

**Remember:** Consistency is key. Always follow these patterns to ensure maintainable and accessible charts across the application. 