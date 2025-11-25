# Quick Task Shared Component

A reusable form component for creating quick tasks with configurable assignee selection, file upload, and flexible layouts.

## Overview

The Quick Task component provides a complete solution for creating quick tasks that can be assigned to employees or custom assignees. It's designed to be flexible and reusable across different modules within the application.

## Components

### QuickTaskForm

The main reusable form component with full configuration support.

```typescript
import { QuickTaskForm } from '@/business-apps/flow/common/components/blink'

<QuickTaskForm
  accessToken={accessToken}
  onSubmit={handleSubmit}
  config={{
    assigneeSelector: { mode: 'employee-search' },
    enableFileUpload: true,
    enableDueDate: true,
    layout: 'standard'
  }}
/>
```

### QuickTaskModal

Pre-built modal wrapper for quick integration.

```typescript
import { QuickTaskModal } from '@/business-apps/flow/common/components/blink'

<QuickTaskModal
  open={isOpen}
  onOpenChange={setIsOpen}
  accessToken={accessToken}
  onSubmit={handleSubmit}
  title="Create Quick Task"
  config={{
    assigneeSelector: { mode: 'employee-search' },
    layout: 'compact'
  }}
/>
```

## Configuration Options

### QuickTaskFormConfig

```typescript
interface QuickTaskFormConfig {
  // Assignee Configuration
  assigneeSelector?: {
    mode: 'employee-search' | 'custom'
    customComponent?: React.ComponentType<AssigneeSelectorProps>
    searchFunction?: (query: string) => Promise<AssigneeOption[]>
    required?: boolean
  }

  // Layout Configuration
  layout?: 'compact' | 'standard' | 'full-width'

  // Feature Toggles
  enableFileUpload?: boolean
  enableDueDate?: boolean
  maxFiles?: number
  maxFileSize?: number // in MB
  allowedFileTypes?: string[]

  // Styling
  className?: string

  // Labels & Placeholders (i18n support)
  labels?: {
    title?: string
    titlePlaceholder?: string
    message?: string
    messagePlaceholder?: string
    assignee?: string
    assigneePlaceholder?: string
    assigneeSearchPlaceholder?: string
    assigneeEmptyText?: string
    assigneeHint?: string
    dueDate?: string
    dueDatePlaceholder?: string
    attachments?: string
    submitButton?: string
    cancelButton?: string
  }
}
```

## Usage Examples

### Example 1: Basic Form with Employee Search

```typescript
import { QuickTaskForm } from '@/business-apps/flow/common/components/blink'

function MyComponent() {
  const handleSubmit = async (data: QuickTaskFormData) => {
    // Handle submission
    console.log('Task data:', data)
  }

  return (
    <QuickTaskForm
      accessToken={accessToken}
      onSubmit={handleSubmit}
      config={{
        assigneeSelector: { mode: 'employee-search' },
        layout: 'standard'
      }}
    />
  )
}
```

### Example 2: Modal with Custom Assignee Selector

```typescript
import { QuickTaskModal } from '@/business-apps/flow/common/components/blink'
import { MyTeamSelector } from './MyTeamSelector'

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = async (data: QuickTaskFormData) => {
    // Handle submission
    await createTask(data)
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Create Task</Button>

      <QuickTaskModal
        open={isOpen}
        onOpenChange={setIsOpen}
        accessToken={accessToken}
        onSubmit={handleSubmit}
        config={{
          assigneeSelector: {
            mode: 'custom',
            customComponent: MyTeamSelector
          },
          enableFileUpload: false,
          layout: 'compact'
        }}
      />
    </>
  )
}
```

### Example 3: Compact Form without File Upload

```typescript
import { QuickTaskForm } from '@/business-apps/flow/common/components/blink'

function QuickTaskWidget() {
  return (
    <QuickTaskForm
      accessToken={accessToken}
      onSubmit={handleSubmit}
      config={{
        layout: 'compact',
        enableFileUpload: false,
        enableDueDate: false,
        assigneeSelector: {
          mode: 'employee-search',
          required: true
        },
        labels: {
          title: 'Quick Note',
          submitButton: 'Send'
        }
      }}
    />
  )
}
```

### Example 4: Using the Hook Directly

```typescript
import { useQuickTaskForm } from '@/business-apps/flow/common/components/blink'

function CustomQuickTaskForm() {
  const {
    form,
    handleSubmit,
    isSubmitting,
    employeeOptions,
    employeesLoading,
    handleEmployeeSearch
  } = useQuickTaskForm({
    accessToken,
    onSubmit: myCustomSubmit,
    config: {
      layout: 'compact',
      assigneeSelector: { mode: 'employee-search' }
    }
  })

  // Use form state and methods for custom implementation
  return (
    <div>
      {/* Custom form UI using form state */}
    </div>
  )
}
```

### Example 5: Custom Assignee Component

```typescript
import { AssigneeSelectorProps } from '@/business-apps/flow/common/components/blink'

// Create a custom assignee selector
const TeamMemberSelector: React.FC<AssigneeSelectorProps> = ({
  value,
  onValueChange,
  disabled,
  placeholder,
  loading
}) => {
  // Your custom implementation
  return (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} disabled={disabled || loading}>
      <option value="">{placeholder}</option>
      {/* Your team members */}
    </select>
  )
}

// Use it in QuickTaskForm
<QuickTaskForm
  accessToken={accessToken}
  onSubmit={handleSubmit}
  config={{
    assigneeSelector: {
      mode: 'custom',
      customComponent: TeamMemberSelector
    }
  }}
/>
```

## Hooks

### useQuickTaskForm

Custom hook for managing Blink form state and logic.

```typescript
import { useQuickTaskForm } from '@/business-apps/flow/common/components/blink'

const {
  form, // React Hook Form instance
  handleSubmit, // Submit handler
  isSubmitting, // Submission state
  employeeOptions, // Employee options (if using employee-search)
  employeesLoading, // Loading state for employees
  handleEmployeeSearch // Search handler
} = useQuickTaskForm({
  accessToken,
  onSubmit: async data => {
    /* ... */
  },
  config: {
    /* ... */
  }
})
```

### useEmployeeSearch

Hook for searching employees by name.

```typescript
import { useEmployeeSearch } from '@/business-apps/flow/common/components/blink'

const {
  employees, // Array of Employee objects
  loading, // Loading state
  error, // Error state
  searchEmployees // Search function
} = useEmployeeSearch(accessToken)
```

### useQuickTaskFileUpload

Hook for uploading files to the file service.

```typescript
import { useQuickTaskFileUpload } from '@/business-apps/flow/common/components/blink'

const {
  uploadFiles, // Upload function
  isUploading, // Upload state
  uploadProgress, // Progress info
  error, // Error state
  clearError // Clear error function
} = useQuickTaskFileUpload({
  accessToken,
  onSuccess: results => {
    /* ... */
  },
  onError: error => {
    /* ... */
  }
})
```

## Services

### QuickTaskFlowService

Service for generating Blink workflow templates.

```typescript
import { QuickTaskFlowService } from '@/business-apps/flow/common/components/blink'

// Generate flow template
const template = QuickTaskFlowService.generateFlowTemplate({
  title: 'Task Title',
  message: 'Task Description',
  uploadResults: [], // File upload results
  assignments: {
    /* ... */
  },
  dueDate: '2024-12-31',
  priority: 'medium'
})

// Create execution payload
const payload = QuickTaskFlowService.createWorkflowExecutionPayload(template, initiatorId)
```

## Layout Options

### Compact

- Maximum width: 28rem (448px)
- Best for sidebars or small panels

### Standard (Default)

- Maximum width: 42rem (672px)
- Best for main content areas

### Full-width

- No maximum width constraint
- Fills available space

## File Upload

When `enableFileUpload` is true:

- Users can attach multiple files
- Configurable max files (default: 5)
- Configurable max file size (default: 10MB)
- Configurable allowed file types
- Files are uploaded to the file service

## Internationalization (i18n)

All labels and placeholders support i18n through the `labels` configuration:

```typescript
<QuickTaskForm
  config={{
    labels: {
      title: t('task.title'),
      titlePlaceholder: t('task.title.placeholder'),
      message: t('task.description'),
      submitButton: t('task.create')
    }
  }}
/>
```

## Type Definitions

```typescript
interface QuickTaskFormData {
  title: string
  message: string
  documents: QuickTaskUploadFile[]
  assignedUserId: string
  dueDate: string
}

interface AssigneeOption {
  value: string
  label: string
}

interface Employee {
  id: string
  userId: string
  firstName: string
  lastName: string
  fullName: string
  email?: string
  personnelCode?: string
}
```

## Best Practices

1. **Always provide accessToken**: Required for employee search and file upload
2. **Handle submission errors**: Wrap your onSubmit handler in try-catch
3. **Use appropriate layout**: Choose layout based on available space
4. **Customize labels**: Provide context-specific labels for better UX
5. **Validate assignee**: Check that assignedUserId is valid before processing

## Migration from Old Blink

If you're migrating from the old Blink solution:

```typescript
// Old approach
import { QuickTaskFormFields } from '@/business-apps/flow/solutions/quick-task/components/QuickTaskFormFields'

// New approach
import { QuickTaskForm } from '@/business-apps/flow/common/components/blink'

// The new QuickTaskForm handles all the logic internally
<QuickTaskForm
  accessToken={accessToken}
  onSubmit={handleSubmit}
  config={{
    assigneeSelector: { mode: 'employee-search' },
    enableFileUpload: true,
    enableDueDate: true
  }}
/>
```

## Support

For questions or issues, please contact the Flow team or create an issue in the repository.
