---
alwaysApply: true
---
# Statistics Component Guidelines for AI Agents

## Overview
When creating statistics components in this project, ALWAYS use the WidgetGroup component for consistency, maintainability, and better UX. WidgetGroup now uses the modern SectionKpiCards component from @newwork/nw-design-system under the hood.

## Required Pattern

### 1. Import Structure
```typescript
import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { 
  // Ant Design icons for prefixes (automatically mapped to supported icons)
  UserOutlined,
  MailOutlined,
  CalendarOutlined,
  DollarOutlined,
  // etc.
} from '@ant-design/icons';
```

### 2. Props Interface
```typescript
interface ComponentStatisticsProps {
  statistics: StatisticsDataType;
  isLoading?: boolean;        // Optional with default false
  error?: Error | null;       // Optional with default null
  onRetry?: () => void;       // Optional
}
```

### 3. Component Structure
```typescript
const ComponentStatistics: React.FC<ComponentStatisticsProps> = ({
  statistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Custom formatting functions if needed
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      // ... other options
    }).format(amount);
  };

  // Transform stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'unique-key',
      title: 'Display Title',
      value: statistics.someValue,
      prefix: <SomeIcon />,
      color: '#1890ff',              // Use meaningful colors
      span: { xs: 24, sm: 12, lg: 6 }, // Note: span is ignored in new design system
      description: 'Helpful description',
      // Optional props:
      suffix: '%',                   // For percentages
      precision: 2,                  // For decimals
      valueIsString: true,           // For pre-formatted values
      onClick: handleClick           // Note: onClick not supported in new design system
    },
    // ... more widgets
  ];

  return (
    <div data-testid="component-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No statistics available."
        data-testid="component-statistics"
      />
    </div>
  );
};
```

## Key Requirements

### Widget Configuration
- **key**: Unique identifier (kebab-case)
- **title**: Clear, descriptive title
- **value**: The actual statistic value
- **prefix**: Icon from @ant-design/icons (automatically mapped to supported icons)
- **color**: Use consistent color scheme:
  - Blue (#1890ff, #1677ff): Recent/new items
  - Green (#52c41a, #3f8600): Active/success metrics
  - Orange (#fa8c16, #faad14): Warnings/attention needed
  - Purple (#722ed1, #eb2f96): Special metrics/this year
  - Red (#ff4d4f): Errors/negative metrics

### Icon Mapping
The following Ant Design icons are automatically mapped to supported icons:
- `UserOutlined`, `ContactsOutlined`, `TeamOutlined` → 'users'
- `MailOutlined`, `FileTextOutlined`, `DollarOutlined` → 'mail'
- `PhoneOutlined` → 'phone'
- `CalendarOutlined`, `ClockCircleOutlined` → 'calendar'
- Other icons → fallback to 'users' or 'mail'

### Layout Notes
- **span**: The span property is maintained for backward compatibility but ignored in the new design system
- The new design system uses CSS Grid with responsive columns automatically
- Default layout is 1 column on mobile, 2 on tablet, 4 on desktop

### Data Formatting
- **Currency**: Use `valueIsString: true` with pre-formatted values
- **Percentages**: Use `suffix: '%'`
- **Decimals**: Use `precision: number`
- **Large numbers**: Consider `notation: 'compact'` in formatters

### Descriptions
- Always provide helpful descriptions
- Use present tense
- Be specific: "Past 2 weeks", "Currently active", "Action required"

## Migration Notes

### What Changed
- ✅ WidgetGroup now uses SectionKpiCards from @newwork/nw-design-system
- ✅ Icon mapping handles Ant Design icons automatically
- ✅ Modern loading, error, and empty states
- ⚠️ `span` property is ignored (responsive layout handled automatically)
- ⚠️ `onClick` property is not supported in new design system
- ⚠️ Some icons may fallback to generic alternatives

### What Stayed the Same
- ✅ WidgetItem interface unchanged
- ✅ WidgetGroup props unchanged
- ✅ All existing statistics components work without modification
- ✅ Same data formatting patterns

## Don't Use
- ❌ SectionKpiCards directly (use WidgetGroup instead)
- ❌ Ant Design Card/Row/Col/Statistic directly
- ❌ Custom card layouts
- ❌ Inconsistent color schemes
- ❌ Missing descriptions
- ❌ Hard-coded responsive breakpoints

## Best Practices
- ✅ Use WidgetGroup for ALL statistics components
- ✅ Provide meaningful icons and colors
- ✅ Include helpful descriptions
- ✅ Handle loading/error states through WidgetGroup
- ✅ Use consistent naming conventions
- ✅ Pre-format complex values (currency, percentages)
- ✅ Test responsive behavior across screen sizes
- ✅ Use supported Ant Design icons for better mapping

## Example Files to Reference
- `src/business-apps/crm/common/components/lead-list/components/LeadStatistics.tsx`
- `src/business-apps/fin/expenses/apps/personal-expenses/components/tabs/expense-items-tab/ExpenseItemStatistics.tsx`
- `src/components/widget-group/WidgetGroup.tsx` (for WidgetItem interface)

This pattern ensures consistency, better UX, and easier maintenance across all statistics components while leveraging the modern design system. 