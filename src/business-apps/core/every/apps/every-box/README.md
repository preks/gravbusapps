# EveryBox - Unified Task & Flow Management

A modern, professional inbox/outbox component that consolidates all user tasks and workflows in one place. Built with `@newwork/nw-design-system` and optimized for performance.

## Features

### Inbox

- **Multi-source Task Aggregation**: Flow Engine tasks (cFlow) and Kogito process tasks
- **Real-time Updates**: Auto-refresh with configurable polling interval
- **Search**: Full-text search across titles, descriptions, and flow names
- **Task Actions**: Complete, Reject, Reassign tasks with comment support
- **Priority Indicators**: Visual badges for overdue and due soon tasks
- **Dynamic Detail Views**: Automatic form rendering based on task type

### Outbox

- **Initiated Workflows**: All workflows started by the user
- **Status Tracking**: Visual progress indicators for each flow
- **Flow Details**: Step-by-step progress with completion status
- **Blink Grouping**: Multi-assignee workflow support

### Completed

- **Task History**: View completed tasks with full details
- **Read-only Forms**: Review submitted form data

## Tech Stack

- **UI Components**: 100% `@newwork/nw-design-system`
- **Styling**: Tailwind CSS with `gba:` prefix
- **State Management**: React hooks
- **Data Fetching**: REST API (Flow Engine) + GraphQL
- **Performance**: React.memo, optimized re-renders
- **Error Handling**: ErrorBoundary for graceful failures
- **Loading States**: Skeleton loaders

## Usage

```typescript
import { EveryBox } from '@/business-apps/platform/apps/every-box';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const MyComponent: React.FC<BusinessAppContextProps> = (context) => {
  return <EveryBox {...context} />;
};
```

## Navigation

- **URL**: `/platform/every-box`
- **Development**: `?app=platform/apps/every-box`

## Architecture

```
every-box/
├── EveryBox.tsx                    # Main component with tabs & polling
├── index.ts                        # Exports
├── README.md                       # This file
│
├── components/
│   ├── InboxView.tsx               # Inbox tab with task list
│   ├── OutboxView.tsx              # Outbox tab with initiated flows
│   ├── CompletedView.tsx           # Completed tasks view
│   ├── TaskCard.tsx                # Task card (memoized)
│   ├── FlowCard.tsx                # Flow card (memoized)
│   ├── TaskDetailDialog.tsx        # Task details modal with dynamic forms
│   ├── TaskDetailHeader.tsx        # Shared task header component
│   ├── TaskDetailFooter.tsx        # Shared task footer with auto-actions
│   ├── TaskFormLayout.tsx          # Layout wrapper for task forms
│   ├── FlowDetailDialog.tsx        # Flow details modal
│   ├── UniversalCflowTaskDetails.tsx # Universal cFlow task renderer
│   ├── RemoteScreenLoader.tsx      # Native screen loader for NATIVE_SCREEN tasks
│   ├── LowcoderScreenLoader.tsx    # Lowcoder screen loader
│   ├── TeamAbsenceCalendar.tsx     # Team absence calendar component
│   ├── EmptyState.tsx              # Empty states
│   ├── LoadingSkeleton.tsx         # Loading states
│   └── ErrorBoundary.tsx           # Error handling
│
├── hooks/
│   ├── useInboxTasks.ts            # Fetch & combine inbox tasks
│   ├── useOutboxFlows.ts           # Fetch initiated workflows
│   ├── useCompletedTasks.ts        # Fetch completed tasks
│   ├── useFlowStepData.ts          # Fetch flow step data for completed tasks
│   ├── useKogitoProcess.ts         # Kogito process operations
│   ├── useScreenManagementApi.ts   # Screen management API client
│   ├── useEmployeeAvatar.ts        # Single employee avatar fetching
│   ├── useEmployeeAvatarsBatch.ts  # Batch employee avatar fetching
│   ├── useEmployeeData.ts          # Employee data fetching
│   └── useTeamAbsences.ts          # Team absences data
│
├── types/
│   └── index.ts                    # TypeScript interfaces (UnifiedTask, Flow, etc.)
│
├── utils/
│   ├── taskFormatters.ts           # Date & status formatters
│   ├── taskGrouping.ts             # Grouping & filtering utils
│   ├── avatarUtils.ts              # Avatar utilities (base64, initials)
│   └── moduleIcons.tsx             # Module icon mappings
│
└── docs/
    ├── README.md                   # Additional documentation
    └── TASK_FOOTER_AUTO_ACTIONS.md # Task footer auto-actions guide
```

## API Endpoints

### Flow Engine

**Base URL**: `https://newwork-dev.newwork.com/flow-engine`

| Endpoint                                  | Method | Description     |
| ----------------------------------------- | ------ | --------------- |
| `/api/tasks/user/{userId}`                | GET    | Inbox tasks     |
| `/api/tasks/user/{userId}/completed`      | GET    | Completed tasks |
| `/api/flows/user/{userId}/initiated`      | GET    | Outbox flows    |
| `/api/flows/{flowId}/steps/{stepNo}/data` | GET    | Flow step data  |
| `/api/tasks/{taskId}/complete`            | POST   | Complete task   |
| `/api/tasks/{taskId}/reject`              | POST   | Reject task     |

### Screen Management

**Base URL**: Environment configured

| Endpoint                    | Method | Description            |
| --------------------------- | ------ | ---------------------- |
| `/api/screen/v1/definition` | GET    | Get screen definitions |

## Data Models

### UnifiedTask

```typescript
interface UnifiedTask {
  id: string
  source: 'cflow' | 'kogito'
  type: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  assignedAt: string
  availableActions: TaskAvailableActions
  form?: any[] // Dynamic form fields
  // ... more fields
}
```

### Flow

```typescript
interface Flow {
  id: string
  templateName: string
  templateId: string
  status: FlowStatus
  initiatedBy: string
  startedAt: string
  currentStep: number
  totalSteps: number
  steps: FlowStep[]
  tags?: Record<string, any>
  blinkGroupId?: string
  // ... more fields
}
```

## Task Detail Rendering

Task details are rendered based on task type and configuration:

1. **cFlow Tasks** → `UniversalCflowTaskDetails` (universal form renderer)
2. **NATIVE_SCREEN** → `RemoteScreenLoader` (loads native React forms)
3. **LOWCODER** → `LowcoderScreenLoader` (loads Lowcoder screens)

## Styling Guidelines

- All classes use `gba:` prefix
- Design system tokens only (no hardcoded colors)
- Semantic colors:
  - `success` - Completed tasks
  - `destructive` - Overdue tasks, errors
  - `warning` - Due soon tasks
  - `info` - Informational
  - `primary` - Main actions

## Testing

All interactive elements have `data-testid` attributes:

| Element        | Test ID                                     |
| -------------- | ------------------------------------------- |
| Main container | `every-box-container`                       |
| Inbox tab      | `every-box-inbox-tab`                       |
| Outbox tab     | `every-box-outbox-tab`                      |
| Completed tab  | `every-box-completed-tab`                   |
| Task cards     | `task-card-{id}`                            |
| Flow cards     | `flow-card-{id}`                            |
| Search inputs  | `inbox-search-input`, `outbox-search-input` |

## Performance

- **Polling**: Configurable interval with cleanup on unmount
- **Memoization**: TaskCard and FlowCard use React.memo
- **Optimized Queries**: Parallel data fetching
- **Lazy Loading**: Dialogs rendered only when needed
- **Avatar Caching**: Object URLs for base64 images
- **Batch Operations**: Employee avatars fetched in batches

## Related Documentation

- [Task Footer Auto Actions](./docs/TASK_FOOTER_AUTO_ACTIONS.md)
- [Flow Step Data Integration](./docs/FLOW_STEP_DATA_INTEGRATION.md)
