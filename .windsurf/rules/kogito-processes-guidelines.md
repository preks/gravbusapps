---
description: When user wants to start process/flow, or when user wants to continue a process/flow, or when user wants data to automatically refresh after a flow/process is complete.
alwaysApply: false
---

# Kogito Process Integration Guidelines

This guide explains how to work with Kogito processes in the NEWWORK platform, including starting processes and continuing tasks through native screens.

## Starting Processes

### Overview

Learn how to start Kogito processes that use either Lowcoder or native screen forms.

### Step 1: Import the Utility Function

Import the `startProcess` function in your React component:

```typescript
import { startProcess } from '@/common/utils/start-process'
```

### Step 2: Call the startProcess Function

Use the function with an object containing all required parameters:

```typescript
const handleStartProcess = async () => {
  try {
    await startProcess({
      domain: 'employee',
      processName: 'changeAddress',
      payload: { employeeId: '1234' },
      builderType: 'NATIVE_SCREEN'
    })
  } catch (error) {
    console.error('Failed to start process:', error)
    // Handle error appropriately in your UI
  }
}
```

### Builder Types

The `builderType` parameter determines how your process forms will render:

- **`LOWCODER`**: Uses Lowcoder screens (default)
- **`NATIVE_SCREEN`**: Uses native screens built with React components

### Native Screen Rendering Flow

When using `NATIVE_SCREEN` builder type:

1. A modal opens on the platform
2. If a landing screen exists (`frm_<processName>`), it's rendered without starting a process
3. If no landing screen exists, the process starts, gets the first task, and renders the appropriate native screen

### Native Screen Naming Convention

- **Landing screen**: `frm_<processName>` (e.g., `frm_changeAddress`)
- **Task screens**: `frm_<processName><TaskName>` (e.g., `frm_changeAddressVerifyAddress`)
  - TaskName should be in PascalCase with first letter capitalized

## Continuing Tasks in Processes

### Overview

Learn how to complete tasks in a running Kogito process from your native screen forms.

### Step 1: Import the Utility Function

Import the `dispatchProcessContinueEvent` function in your React component:

```typescript
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
```

### Step 2: Create Event Handler for Form Submission

Create a function that prepares your data and signals task completion:

```typescript
const handleSubmit = async (values: any) => {
  try {
    // Prepare your payload according to process requirements
    const payload = {
      approved: true,
      comments: values.comments
      // Add other required fields based on your process definition
    }

    // Continue the process with the appropriate event
    dispatchProcessContinueEvent('APPROVE_EXPENSE', payload)
  } catch (error) {
    console.error('Failed to continue process:', error)
    // Handle error appropriately in your UI
  }
}
```

### Step 3: Connect Handler to Form Component

Use the handler in your form component with proper form validation:

```typescript
import { Form, Input, Button } from '@newwork/nw-design-system';

const ProcessForm: React.FC = () => {
  const [form] = Form.useForm();

  return (
    <Form
      form={form}
      onFinish={handleSubmit}
      layout="vertical"
      data-testid="process-form"
    >
      <Form.Item
        name="comments"
        label="Comments"
        rules={[{ required: true, message: 'Please provide comments' }]}
      >
        <Input.TextArea
          rows={4}
          data-testid="comments-input"
          placeholder="Enter your comments..."
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          data-testid="submit-button"
        >
          Approve Expense
        </Button>
      </Form.Item>
    </Form>
  );
};
```

## Common Event Names and Payloads

### Expense Request Process

```typescript
// Event name
'pse_submit'

// Payload structure
{
  expenseId: string
  items: Array<{
    amount: number
    description: string
    category: string
    receiptUrl?: string
  }>
  totalAmount: number
  currency: string
  submissionDate: string
}
```

### Approval Process

```typescript
// Event names
'pse_approve' | 'pse_reject'

// Payload structure
{
  id: string;
  decision: 'approved' | 'rejected';
  comments?: string;
  reviewDate: string;
  reviewerId: string;
}
```

### Employee Data Change Process

```typescript
// Event name
'emp_update_personal_data'

// Payload structure
{
  employeeId: string;
  changes: {
    personalInfo?: {
      firstName?: string;
      lastName?: string;
      email?: string;
    };
    address?: {
      street: string;
      city: string;
      zipCode: string;
      country: string;
    };
  };
  effectiveDate: string;
}
```

## Best Practices

### Error Handling

Always wrap process-related calls in try-catch blocks:

```typescript
const handleProcessAction = async () => {
  try {
    dispatchProcessContinueEvent(eventName, payload)
  } catch (error) {
    console.error('Process action failed:', error)
    // Show user-friendly error message
    notification.error({
      message: 'Process Error',
      description: 'Failed to complete action. Please try again.'
    })
  }
}
```

### Payload Validation

Validate your payload before dispatching:

```typescript
const isValidPayload = (payload: any): boolean => {
  // Add your validation logic
  return payload && payload.id && typeof payload.id === 'string'
}

const handleSubmit = (values: any) => {
  const payload = { ...values, id: processId }

  if (!isValidPayload(payload)) {
    console.error('Invalid payload structure')
    return
  }

  dispatchProcessContinueEvent(eventName, payload)
}
```

### Form Integration with BusinessAppContextProps

Always extend `BusinessAppContextProps` for process forms:

```typescript
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface ProcessFormProps extends BusinessAppContextProps {
  processId?: string
  taskId?: string
}

const ProcessForm: React.FC<ProcessFormProps> = ({ accessToken, userInfo, processId, taskId }) => {
  // Use accessToken and userInfo from context
  // Include processId and taskId in payload if available
}
```

## Important Notes

### Security Considerations

- **Never include sensitive information** in the payload as it may be logged in the system
- **Validate all user inputs** before including them in the payload
- **Use access tokens** from `BusinessAppContextProps` for authentication

### Process Assumptions

- The `dispatchProcessContinueEvent` function assumes that your native screen is rendered within a running Kogito process
- Event names must **exactly match** what the process definition expects
- Payload structure must align with the process variable definitions

### Troubleshooting Checklist

- ✅ Event name exactly matches the process expectation
- ✅ Native screen is correctly named following the convention
- ✅ Payload contains all required fields as defined in the process
- ✅ Process is actually running and expecting the event
- ✅ User has necessary permissions to execute the process action

### Development Tips

- Use browser developer tools to inspect process state and events
- Test with both valid and invalid payloads to ensure error handling works
- Verify process definitions in the Kogito console match your implementation
- Use meaningful data-testid attributes for automated testing of process flows

## Data Refresh After Process Completion

### Overview

When Kogito processes complete, the platform automatically dispatches a custom event to notify components that data might need refreshing. This is essential for maintaining data consistency in lists and components that display process-dependent data.

### Platform Event Dispatch

The platform dispatches this event when a process completes:

```typescript
window.dispatchEvent(
  new CustomEvent('com.newwork.process.processCompletion', {
    detail: { resolution: 'success' }
  })
)
```

### Listening for Process Completion

All lists and components with data dependent on flows/processes should intercept this event to refresh their data. You can either implement the event listener directly or use the provided custom hook (recommended):

#### Direct Implementation (if custom logic is needed):

```typescript
import { useEffect } from 'react';

const DataList: React.FC = () => {
  const { entities, refetch } = useEntityDataIntegration(context);

  useEffect(() => {
    const handleProcessCompletion = (event: Event) => {
      const customEvent = event as CustomEvent<{ resolution: 'success' | 'failure' }>;
      const resolution = customEvent.detail.resolution;

      if (resolution === 'success') {
        // Refresh data when process completes successfully
        refetch();
      }
    };

    // Add event listener
    window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion);
    };
  }, [refetch]);

  return (
    // Your component JSX
  );
};
```

#### Using the Custom Hook (recommended):

```typescript
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion';

const DataList: React.FC = () => {
  const { entities, refetch } = useEntityDataIntegration(context);

  useProcessCompletion({
    onSuccess: () => refetch()
  });

  return (
    // Your component JSX
  );
};
```

### Custom Hook for Process Completion

For reusability across components, use the provided custom hook from `@/common/hooks/useProcessCompletion`:

```typescript
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
```

The hook implementation is available at `src/common/hooks/useProcessCompletion.ts` and provides a clean interface for listening to process completion events.

### Using the Custom Hook

Use the custom hook in your data-dependent components:

```typescript
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion';

const ExpenseList: React.FC<ExpenseListProps> = (context) => {
  const { expenses, isLoading, error, refetch } = useExpenseDataIntegration(context);

  // Listen for process completion and refresh data
  useProcessCompletion({
    onSuccess: () => {
      console.log('Process completed successfully, refreshing expense data');
      refetch();
    },
    onFailure: () => {
      console.log('Process failed, consider showing user notification');
      // Optionally handle failure case
    }
  });

  return (
    <div data-testid="expense-list">
      {/* Your component content */}
    </div>
  );
};
```

### Components That Should Listen for Process Completion

- **Data Lists**: Any list showing entities that can be created/modified through processes
- **Dashboard Components**: Statistics and summary components
- **Table Components**: DataTable components with process-dependent data
- **Detail Views**: Components showing entity details that might change through processes

### Common Scenarios

- **Expense Lists**: Refresh when new expenses are submitted or approved
- **Employee Records**: Refresh when employee data change processes complete
- **Approval Workflows**: Refresh pending items when approval processes finish
- **Document Management**: Refresh file lists when document upload processes complete

### Event Resolution Types

The event detail contains a `resolution` property with these values:

- **`'success'`**: Process completed successfully - refresh data
- **`'failure'`**: Process failed - optionally handle error state

### Best Practices for Process Completion Handling

- Always clean up event listeners in the useEffect cleanup function
- Use the custom hook pattern for consistency across components
- Log process completion events for debugging (without sensitive data)
- Consider showing user feedback when data refreshes after process completion
- Test that data refreshes work correctly in both success and failure scenarios
