# EveryBox 2 Documentation

## Overview

EveryBox 2 is a unified inbox application that displays tasks from multiple sources (CFlow and Kogito) with support for flow step data integration.

## Documentation Structure

### Main Guides

1. **[FLOW_STEP_DATA_INTEGRATION.md](./FLOW_STEP_DATA_INTEGRATION.md)**
   - Complete guide for flow step data integration
   - Architecture overview
   - API endpoints and response formats
   - Usage examples for custom forms
   - Implementation details

2. **[FLOW_STEP_DATA_DEBUGGING.md](./FLOW_STEP_DATA_DEBUGGING.md)**
   - Debugging guide for flow step data
   - Expected console output
   - Network request verification
   - Common issues and solutions
   - Manual API testing

3. **[useFlowStepData.test.md](../hooks/useFlowStepData.test.md)**
   - Testing guide for the hook
   - Test scenarios
   - Usage examples
   - Integration patterns

## Quick Start

### For Users

1. **Open EveryBox**: Navigate to `?app=EveryBox2`
2. **View Tasks**: See all your assigned tasks in the inbox
3. **Open Task Details**: Click on any task to view details
4. **Flow Step Data**: For CFlow tasks, scroll down to see "Flow Step Data" section

### For Developers

#### Using Flow Step Data in Custom Forms

```typescript
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const MyForm: React.FC<BusinessAppContextProps> = (props) => {
  // Flow step data is automatically available
  const flowStepData = props.additionalData?.psi_flowStepData
  const flowOverview = props.additionalData?.psi_flowOverview
  const currentStep = props.additionalData?.psi_currentStep

  // Use the data
  return (
    <Form>
      <Input value={flowStepData?.employeeId} />
      {/* ... */}
    </Form>
  )
}
```

## Key Features

### Flow Step Data Integration ✅

- **Automatic Data Fetching**: Data is fetched automatically when a CFlow task is opened
- **Multiple Endpoints**: Uses both flow overview and step data endpoints
- **Smart Step Detection**: Automatically finds the current active step
- **Error Handling**: Graceful handling of missing data or API errors
- **Loading States**: Proper loading indicators during data fetch
- **Debugging Support**: Extensive console logging for troubleshooting

### Supported Task Sources

1. **CFlow Tasks**
   - Custom flow-engine tasks
   - Blink (quick-task) support
   - Flow step data integration ✅
   - Universal task detail view

2. **Kogito Tasks**
   - Process-based tasks
   - Native screen support
   - Lowcoder screen support
   - Process continuation support

## API Endpoints Used

### 1. Task List Endpoints

```
GET /flow-engine/api/tasks/user/{userId}          # Active tasks
GET /flow-engine/api/tasks/user/{userId}/completed # Completed tasks
```

### 2. Flow Data Endpoints (NEW ✅)

```
GET /flow-engine/api/flows/{flowId}                      # Flow overview
GET /flow-engine/api/flows/{flowId}/steps/{stepNo}/data  # Step data
```

## Project Structure

```
every-box/
├── docs/
│   ├── README.md                              # This file
│   ├── FLOW_STEP_DATA_INTEGRATION.md          # Integration guide
│   └── FLOW_STEP_DATA_DEBUGGING.md            # Debugging guide
├── hooks/
│   ├── useFlowStepData.ts                     # Flow data hook ✅ NEW
│   ├── useFlowStepData.test.md                # Hook testing guide
│   ├── useInboxTasks.ts                       # Inbox tasks hook
│   ├── useCompletedTasks.ts                   # Completed tasks hook
│   └── useOutboxFlows.ts                      # Outbox flows hook
├── components/
│   ├── InboxView.tsx                          # Main inbox view
│   ├── TaskDetailDialog.tsx                   # Task details (integrated ✅)
│   └── task-details/
│       └── UniversalCflowTaskDetails.tsx      # Universal view (integrated ✅)
└── types/
    └── index.ts                               # Type definitions
```

## Development Workflow

### Testing Flow Step Data Integration

1. **Start Application**:

   ```bash
   npm run dev
   ```

2. **Open EveryBox**:

   ```
   http://localhost:3000/?app=EveryBox2
   ```

3. **Open Browser DevTools**:
   - Console tab: Check for `[useFlowStepData]` logs
   - Network tab: Verify API calls to `/flows/{flowId}` and `/flows/{flowId}/steps/{stepNo}/data`

4. **Open a CFlow Task**:
   - Click on any task in the inbox
   - Scroll to "Flow Step Data" section
   - Expand to see all fields

5. **Verify Data**:
   - Check console logs for data structure
   - Verify network requests completed successfully
   - Confirm data is displayed in UI

### Adding New Form Components

1. **Create Form Component**:

   ```typescript
   // src/business-apps/platform/apps/my-module/forms/my-form/MyForm.tsx
   import { BusinessAppContextProps } from '@/common/BusinessAppContext'

   const MyForm: React.FC<BusinessAppContextProps> = props => {
     const flowStepData = props.additionalData?.psi_flowStepData
     // Use flow step data...
   }
   ```

2. **Access Flow Data**:
   - `psi_flowStepData`: Form data object
   - `psi_flowOverview`: Full flow overview
   - `psi_currentStep`: Current step info

3. **Handle Loading/Error**:
   - Data might be `undefined` while loading
   - Always check if data exists before using

## Troubleshooting

### Common Issues

1. **No network requests visible**:
   - Check if task is CFlow (`task.source === 'cflow'`)
   - Verify task has `flowId`
   - See [FLOW_STEP_DATA_DEBUGGING.md](./FLOW_STEP_DATA_DEBUGGING.md)

2. **Step data is empty**:
   - Normal for steps without completed tasks
   - Check if step has been completed
   - Verify form had fields

3. **404 errors**:
   - Flow might have been deleted
   - Check flowId is correct
   - Verify flow-engine API is accessible

### Debug Steps

1. **Check Console Logs**:

   ```
   [useFlowStepData] Starting data load for flowId: ...
   [useFlowStepData] Fetching flow overview...
   [useFlowStepData] Flow overview received: ...
   [useFlowStepData] Fetching step data for: ...
   [useFlowStepData] ✅ Flow data load complete
   ```

2. **Check Network Tab**:
   - `GET /flows/{flowId}` → 200 OK
   - `GET /flows/{flowId}/steps/{stepNo}/data` → 200 OK

3. **Verify Data Structure**:
   - Use React DevTools to inspect props
   - Check `additionalData.psi_flowStepData`

## Best Practices

### When Building Forms

1. **Always check for data**:

   ```typescript
   const flowStepData = props.additionalData?.psi_flowStepData
   if (!flowStepData) {
     return <Loading />
   }
   ```

2. **Provide fallbacks**:

   ```typescript
   const employeeId = flowStepData?.employeeId || ''
   ```

3. **Use TypeScript interfaces**:

   ```typescript
   interface MyFlowData {
     employeeId: string
     startDate: string
     // ...
   }

   const data = flowStepData as MyFlowData | undefined
   ```

### When Debugging

1. **Enable detailed logging**: Logs are already built-in
2. **Use browser DevTools**: Network and Console tabs
3. **Check API responses**: Verify data structure
4. **Test with manual curl**: Validate API accessibility

## Performance Considerations

- **Conditional Fetching**: Hook only runs for CFlow tasks with flowId
- **Single Request Flow**: Sequential API calls (overview → step data)
- **State Management**: Data cached in React state during task dialog lifetime
- **Manual Refetch**: Available via `refetch()` function

## Future Enhancements

- [ ] Cache flow data across task opens (global state)
- [ ] Prefetch step data for all inbox tasks
- [ ] Add pagination for flows with many steps
- [ ] Add step navigation UI (previous/next)
- [ ] Add flow progress visualization
- [ ] Real-time flow updates via WebSockets

## Related Documentation

- [Flow Engine API Documentation](../../../../custom-flow-engine/README.md)
- [Task Service Architecture](../../../../custom-flow-engine/docs/TASK_SERVICE_ARCHITECTURE.md)
- [BusinessAppContext Documentation](../../../../common/BusinessAppContext.tsx)

## Support

For issues or questions:

1. Check [FLOW_STEP_DATA_DEBUGGING.md](./FLOW_STEP_DATA_DEBUGGING.md)
2. Review console logs
3. Verify network requests
4. Contact platform team

---

**Last Updated**: 2025-01-19  
**Version**: 2.0.0  
**Status**: ✅ Production Ready
