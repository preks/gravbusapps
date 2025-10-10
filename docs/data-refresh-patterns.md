# Data Refresh Patterns Documentation

## Overview

This document describes the automatic data refresh patterns implemented across the NEWWORK Gravity Business Apps platform. These patterns ensure that table data and statistics are automatically updated when related business processes complete, providing users with real-time visibility of changes without manual refresh.

## Background

The NEWWORK platform uses process-driven workflows (Kogito processes) for business operations like creating investments, updating records, completing tasks, etc. When these processes complete, they dispatch events that components can listen to for automatic data refresh.

## Event System

### Event Types

The platform dispatches various event types when processes complete:

```typescript
const eventNames = [
  'com.newwork.process.taskCompletion',
  'com.newwork.process.completion',
  'com.newwork.process.continue',
  'com.newwork.process.processCompletion',
  'processCompletion',
  'taskCompletion',
  'taskCompleted',
  'processCompleted',
  'task-completion',
  'process-completion'
]
```

### Event Structure

Events follow this general structure:

```typescript
interface ProcessEvent {
  type: string
  detail: {
    resolution?: 'success' | 'error'
    response?: {
      detail?: {
        resolution?: 'success' | 'error'
      }
      investment?: any
      opportunity?: any
      // ... other entity types
    }
    payload?: any
  }
}
```

## Implementation Pattern

### Standard Pattern

All data-driven components should implement this pattern:

```typescript
import React, { useEffect, useCallback } from 'react'

const MyDataComponent = () => {
  const { data, isLoading, error, refetch } = useDataHook()
  // OR
  const loadData = useCallback(async () => {
    // data loading logic
  }, [dependencies])

  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('MyDataComponent: Process completion event received:', event.type)

        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          console.log('MyDataComponent: Process completed successfully, refreshing data')
          refetch() // or loadData()
          return
        }

        // Check for different event structures
        const response = event.detail?.response
        if (
          response?.detail?.resolution === 'success' ||
          response?.investment || // Adjust for relevant entity types
          response?.opportunity
        ) {
          console.log('MyDataComponent: Relevant data detected, refreshing list')
          refetch() // or loadData()
          return
        }

        // Check for continue events with payload
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          console.log('MyDataComponent: Continue event with payload detected, refreshing data')
          refetch() // or loadData()
        }
      } catch (err) {
        console.error('Error handling process completion in MyDataComponent:', err)
      }
    }

    // Listen to multiple possible event names
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion)
    })

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion)
      })
    }
  }, [refetch]) // or [loadData] for custom load functions

  // Component JSX...
}
```

## Implementation Examples

### Investment Management Components

The following components have been updated with automatic refresh logic:

#### Investment View Components

- `AllInvestmentsList.tsx` - Refreshes on any investment-related process completion
- `EquityInvestmentsList.tsx` - Refreshes specifically for equity investment events
- `RealEstateInvestmentsList.tsx` - Refreshes specifically for real estate investment events
- `LiquidFundInvestmentsList.tsx` - Refreshes specifically for liquid fund investment events
- `InvestmentStatistics.tsx` - Refreshes KPI statistics when investments change

#### Divestment View Components

- `PlannedExits.tsx` - Refreshes planned exit data
- `Sales.tsx` - Refreshes sales opportunity data
- `ExitOpportunities.tsx` - Refreshes exit opportunity data

### Specific Event Handling

Different components may need to handle specific entity types:

```typescript
// For Investment-related components
if (
  response?.investment ||
  response?.equityInvestment ||
  response?.realEstateInvestment ||
  response?.liquidFundInvestment
) {
  // Refresh investment data
}

// For Opportunity-related components
if (response?.opportunity || response?.investmentOpportunity) {
  // Refresh opportunity data
}

// For CRM components
if (response?.lead || response?.account || response?.contact) {
  // Refresh CRM data
}
```

## Component Types and Refresh Methods

### Table Components with Custom Load Functions

For components that use custom data loading functions:

```typescript
const loadData = useCallback(async () => {
  setIsLoading(true)
  try {
    const result = await fetchData(queryVariables)
    setData(result)
  } catch (err) {
    setError(err)
  } finally {
    setIsLoading(false)
  }
}, [dependencies])

// In event handler:
loadData() // Call the load function
```

### Components with Hook-based Data Fetching

For components using data hooks with refetch functions:

```typescript
const { data, isLoading, error, refetch } = useDataHook(context)

// In event handler:
refetch() // Call the refetch function
```

### Statistics Components

For KPI/statistics components:

```typescript
const { metrics, isLoading, error, refetch } = useMetricsHook(context)

// In event handler:
refetch() // Refresh the metrics
```

## Event Timing and Best Practices

### When Events Are Dispatched

Events are typically dispatched by:

1. **AppActionForm** components when forms are successfully submitted
2. **Process completion** when Kogito workflows finish
3. **Task completion** when individual process tasks complete

### Best Practices

1. **Always include error handling** in event listeners
2. **Log events for debugging** but avoid logging sensitive data
3. **Use appropriate dependencies** in useEffect dependency arrays
4. **Clean up event listeners** in the useEffect return function
5. **Be specific about entity types** that should trigger refreshes
6. **Test refresh behavior** after implementing

### Performance Considerations

- Event listeners are lightweight and only trigger when relevant events occur
- Avoid refreshing unrelated data to minimize unnecessary API calls
- Use component-specific logging to debug refresh behavior
- Consider debouncing if multiple rapid events are possible

## Testing the Implementation

### Manual Testing

1. Open a table/list component in the browser
2. Create or update a related entity using an AppActionForm
3. Observe the console logs for event handling
4. Verify that the table refreshes automatically
5. Check that the new/updated data appears without manual refresh

### Debug Logging

The implementation includes detailed console logging:

```
ComponentName: Process completion event received: com.newwork.process.continue
ComponentName: Process completed successfully, refreshing data
```

Use browser dev tools to monitor these logs and verify event handling.

## Integration with AppActionForm

The refresh pattern works seamlessly with AppActionForm components because:

1. AppActionForm dispatches `com.newwork.process.continue` events on successful submission
2. Table components listen for these events and refresh their data
3. The refresh happens automatically without user intervention

Example flow:

1. User clicks AppActionButton → Opens form
2. User submits form → AppActionForm processes submission
3. On success → AppActionForm dispatches process event
4. Table components → Receive event and refresh data
5. User sees → Updated data immediately

## Migration Guide

### For New Components

When creating new table or list components:

1. Implement the standard event listener pattern shown above
2. Adjust entity type checks for your specific data
3. Use appropriate refresh method (refetch vs loadData)
4. Add component-specific logging for debugging

### For Existing Components

To add refresh capability to existing components:

1. Identify the data refresh method (refetch function or loadData)
2. Add the useEffect with event listeners
3. Import useEffect if not already imported
4. Test the refresh behavior
5. Update any related documentation

## Common Issues and Solutions

### Events Not Being Received

- Check that event listeners are properly registered
- Verify the component is mounted when events are dispatched
- Check browser console for any JavaScript errors
- Ensure the event names match what AppActionForm dispatches

### Unnecessary Refreshes

- Make event handling more specific to relevant entity types
- Check the event response structure for entity-specific data
- Consider component scope (don't refresh unrelated data)

### Performance Issues

- Ensure proper cleanup in useEffect return function
- Avoid refreshing heavy data unless necessary
- Use appropriate dependencies in useEffect arrays
- Consider debouncing for rapid successive events

## Future Enhancements

### Planned Improvements

1. **Event Filtering** - More granular event filtering by entity type/ID
2. **Optimistic Updates** - Update UI immediately, then sync with server
3. **Delta Updates** - Only update changed records instead of full refresh
4. **Error Recovery** - Automatic retry mechanisms for failed refreshes

### Extensibility

The pattern is designed to be easily extended for:

- New entity types
- Different event structures
- Custom refresh strategies
- Cross-component communication

## Conclusion

The automatic data refresh pattern provides a seamless user experience by ensuring that displayed data stays current with business process completions. By following the standardized implementation pattern, developers can easily add this capability to new components and maintain consistency across the platform.

For questions or issues with implementation, refer to existing working examples in the investment management components or consult the development team.
