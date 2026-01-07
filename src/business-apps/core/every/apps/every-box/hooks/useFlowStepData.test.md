# useFlowStepData Hook - Testing Guide

## Overview

This document provides examples and test scenarios for the `useFlowStepData` hook.

## Basic Usage Example

```typescript
import { useFlowStepData } from './useFlowStepData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const MyComponent: React.FC<BusinessAppContextProps> = (props) => {
  const task = {
    id: 'task-123',
    flowId: 'flow-abc-def',
    source: 'cflow',
    // ... other task properties
  }

  const {
    flowOverview,
    currentStep,
    currentStepData,
    isLoading,
    error,
    refetch
  } = useFlowStepData({
    flowId: task.flowId,
    accessToken: props.accessToken,
    enabled: true
  })

  if (isLoading) {
    return <div>Loading flow data...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div>
      <h1>Flow: {flowOverview?.name}</h1>
      <p>Progress: {flowOverview?.progress.percentage}%</p>
      <p>Current Step: {currentStep?.stepName}</p>

      <h2>Step Data:</h2>
      <pre>{JSON.stringify(currentStepData, null, 2)}</pre>

      <button onClick={refetch}>Refresh Data</button>
    </div>
  )
}
```

## Test Scenarios

### Scenario 1: Successful Data Fetch

**Setup**:

- Valid flowId: `b9df04ae-0978-47cc-9f63-c6cbffb279cf`
- Valid access token
- Flow has 3 steps, step 1 is active

**Expected API Calls**:

1. `GET /flow-engine/api/flows/b9df04ae-0978-47cc-9f63-c6cbffb279cf`
2. `GET /flow-engine/api/flows/b9df04ae-0978-47cc-9f63-c6cbffb279cf/steps/step_1/data`

**Expected Hook Return**:

```typescript
{
  flowOverview: {
    id: 'b9df04ae-0978-47cc-9f63-c6cbffb279cf',
    templateId: 'template-123',
    name: 'Employee Vacation Request',
    status: 'RUNNING',
    createdAt: '2025-01-15T10:00:00Z',
    progress: {
      completedSteps: 1,
      totalSteps: 3,
      percentage: 33
    },
    steps: [
      {
        stepNo: 'step_0',
        stepName: 'Request Submission',
        status: 'COMPLETED',
        data: null
      },
      {
        stepNo: 'step_1',
        stepName: 'Manager Approval',
        status: 'ACTIVE',
        data: null
      },
      {
        stepNo: 'step_2',
        stepName: 'HR Review',
        status: 'PENDING',
        data: null
      }
    ]
  },
  currentStep: {
    stepNo: 'step_1',
    stepName: 'Manager Approval',
    status: 'ACTIVE',
    data: null
  },
  currentStepData: {
    employeeId: '550e8400-e29b-41d4-a716-446655440000',
    employeeName: 'John Doe',
    requestType: 'vacation',
    startDate: '2025-02-01',
    endDate: '2025-02-10',
    totalDays: 10,
    reason: 'Family vacation',
    submittedAt: '2025-01-15T10:00:00Z'
  },
  isLoading: false,
  error: null
}
```

### Scenario 2: No Active Steps (All Completed)

**Setup**:

- All steps in the flow are COMPLETED

**Expected Behavior**:

- `currentStep` returns the **last step** (most recent completed step)
- Step data is still fetched for the last step

**Expected Hook Return**:

```typescript
{
  flowOverview: { /* ... */ },
  currentStep: {
    stepNo: 'step_2',
    stepName: 'HR Review',
    status: 'COMPLETED'
  },
  currentStepData: { /* data from step_2 */ },
  isLoading: false,
  error: null
}
```

### Scenario 3: Hook Disabled

**Setup**:

- `enabled: false` passed to hook

**Expected Behavior**:

- No API calls are made
- All values are null/default

**Expected Hook Return**:

```typescript
{
  flowOverview: null,
  currentStep: null,
  currentStepData: null,
  isLoading: false,
  error: null
}
```

### Scenario 4: Flow Not Found (404 Error)

**Setup**:

- Invalid flowId: `non-existent-flow-id`
- API returns 404 status

**Expected Hook Return**:

```typescript
{
  flowOverview: null,
  currentStep: null,
  currentStepData: null,
  isLoading: false,
  error: 'Failed to fetch flow overview: 404'
}
```

### Scenario 5: Step Data Not Found

**Setup**:

- Flow overview fetch succeeds
- Step data fetch fails (404 or empty response)

**Expected Hook Return**:

```typescript
{
  flowOverview: { /* valid flow overview */ },
  currentStep: { /* valid current step */ },
  currentStepData: null,
  isLoading: false,
  error: 'Failed to fetch step data: 404'
}
```

### Scenario 6: Network Timeout

**Setup**:

- API request takes longer than expected
- Network error or timeout occurs

**Expected Hook Return**:

```typescript
{
  flowOverview: null,
  currentStep: null,
  currentStepData: null,
  isLoading: false,
  error: 'Failed to load flow data'
}
```

### Scenario 7: Missing Access Token

**Setup**:

- `accessToken` is empty or undefined

**Expected Behavior**:

- Hook should not make API calls
- Should remain in idle state

**Expected Hook Return**:

```typescript
{
  flowOverview: null,
  currentStep: null,
  currentStepData: null,
  isLoading: false,
  error: null
}
```

### Scenario 8: Refetch Functionality

**Setup**:

1. Initial data fetch completes successfully
2. User clicks "Refresh" button
3. `refetch()` function is called

**Expected Behavior**:

- `isLoading` becomes `true`
- Fresh API calls are made
- Updated data is returned
- `isLoading` becomes `false`

**Code Example**:

```typescript
const Component = () => {
  const { currentStepData, isLoading, refetch } = useFlowStepData({
    flowId: 'flow-123',
    accessToken: 'token',
    enabled: true
  })

  const handleRefresh = async () => {
    await refetch() // Manually trigger data refresh
    console.log('Data refreshed!')
  }

  return (
    <div>
      <pre>{JSON.stringify(currentStepData, null, 2)}</pre>
      <button onClick={handleRefresh} disabled={isLoading}>
        {isLoading ? 'Refreshing...' : 'Refresh Data'}
      </button>
    </div>
  )
}
```

## Integration with Task Components

### Example: Custom Form Component

```typescript
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFlowStepData } from '../hooks/useFlowStepData'

interface VacationApprovalFormProps extends BusinessAppContextProps {
  // Form will receive flowId via additionalData
}

const VacationApprovalForm: React.FC<VacationApprovalFormProps> = (props) => {
  // Extract flowId from additionalData or task metadata
  const flowId = props.additionalData?.psi_processMetadata?.flowId

  // Use hook to fetch flow step data
  const { currentStepData, isLoading, error } = useFlowStepData({
    flowId,
    accessToken: props.accessToken,
    enabled: !!flowId
  })

  if (isLoading) {
    return <Spinner />
  }

  if (error) {
    return <Alert variant="destructive">{error}</Alert>
  }

  // Use step data to populate form
  return (
    <Form>
      <FormField label="Employee">
        <Input value={currentStepData?.employeeName} readOnly />
      </FormField>

      <FormField label="Start Date">
        <DatePicker value={currentStepData?.startDate} />
      </FormField>

      <FormField label="End Date">
        <DatePicker value={currentStepData?.endDate} />
      </FormField>

      <FormField label="Total Days">
        <Input value={currentStepData?.totalDays} readOnly />
      </FormField>

      <FormField label="Reason">
        <Textarea value={currentStepData?.reason} readOnly />
      </FormField>

      <Button type="submit">Approve Request</Button>
    </Form>
  )
}
```

## Manual Testing Steps

1. **Open EveryBox Application**
   - Navigate to: `http://localhost:3000/?app=EveryBox2`
   - Log in with valid credentials

2. **Open a CFlow Task**
   - Click on any task in the inbox
   - Verify task has a `flowId` (check task object in console)

3. **Check Network Requests**
   - Open Browser DevTools → Network tab
   - Look for these requests:
     - `GET /flow-engine/api/flows/{flowId}`
     - `GET /flow-engine/api/flows/{flowId}/steps/{stepNo}/data`
   - Verify both return status 200

4. **Verify UI Display**
   - In task detail view, scroll down
   - Find "Flow Step Data" section
   - Click to expand
   - Verify all fields are displayed with proper formatting

5. **Test Error Handling**
   - Modify flowId to invalid value (in code temporarily)
   - Verify error message is displayed
   - Restore valid flowId

6. **Test Refetch**
   - Add a "Refresh" button (temporary)
   - Click button
   - Verify loading state shows
   - Verify data reloads

## Console Debugging

Add these console logs for debugging:

```typescript
const { flowOverview, currentStep, currentStepData, isLoading, error } = useFlowStepData({
  flowId: task?.flowId,
  accessToken,
  enabled: true
})

// Debug output
console.log('🔍 Flow Step Data Debug:')
console.log('  - flowId:', task?.flowId)
console.log('  - isLoading:', isLoading)
console.log('  - error:', error)
console.log('  - flowOverview:', flowOverview)
console.log('  - currentStep:', currentStep)
console.log('  - currentStepData:', currentStepData)
```

## Common Issues and Solutions

### Issue 1: "Failed to fetch flow overview: 404"

**Cause**: Invalid flowId or flow doesn't exist  
**Solution**: Verify flowId is correct, check if flow was deleted

### Issue 2: "Failed to fetch step data: 404"

**Cause**: stepNo doesn't exist in flow  
**Solution**: Check flow overview response, verify steps array

### Issue 3: currentStepData is null but no error

**Cause**: Step data endpoint returned empty response  
**Solution**: Check if step actually has data, some steps might be data-less

### Issue 4: Hook never calls API

**Cause**: `enabled: false` or missing required parameters  
**Solution**: Verify `enabled` is true and all required params are provided

### Issue 5: Infinite loading state

**Cause**: API request never completes or network issue  
**Solution**: Check network tab, verify API endpoint is accessible
