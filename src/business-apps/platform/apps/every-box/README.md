# EveryBox - Unified Inbox & Outbox

A modern, professional inbox/outbox component that consolidates all user tasks and workflows in one place.

## Features

### Inbox
- **Multi-source Task Aggregation**:
  - Flow Engine tasks (ASSIGN mode only)
  - CRM Opportunities (owned by user)
  - CRM Leads (owned by user)
- **Real-time Updates**: Auto-refresh every 15 seconds
- **Search**: Full-text search across titles, descriptions, and flow names
- **Task Actions**: Complete, Reject, Reassign tasks directly
- **Priority Indicators**: Visual badges for overdue and due soon tasks
- **Dynamic Detail Views**: Different views for flow tasks, CRM tasks, and approvals

### Outbox
- **Initiated Workflows**: All workflows started by the user
- **Status Tracking**: Visual progress indicators for each flow
- **Flow Details**: Step-by-step progress with completion status
- **Search**: Filter flows by name or template

## Tech Stack

- **UI Components**: 100% `@newwork/nw-design-system`
- **Styling**: Tailwind CSS with `gba:` prefix
- **State Management**: React hooks
- **Data Fetching**: REST API (Flow Engine) + GraphQL (CRM)
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

The component is accessible via:
- **URL**: `/platform/every-box`
- **Development**: `?app=platform/apps/every-box`

## API Endpoints

### Flow Engine
- `GET /api/tasks/user/{userId}?includeAssigned=true&includeClaimable=false` - Inbox tasks
- `GET /api/flows/user/{userId}/initiated` - Outbox flows
- `POST /api/tasks/{taskId}/complete` - Complete task
- `POST /api/tasks/{taskId}/reject` - Reject task
- `POST /api/tasks/{taskId}/reassign` - Reassign task

### GraphQL (CRM)
- Opportunities query with owner filter
- Leads query with owner filter

## Architecture

```
every-box/
├── EveryBox.tsx              # Main component with tabs & polling
├── index.ts                  # Exports
├── README.md                 # This file
├── hooks/
│   ├── useInboxTasks.ts      # Fetch & combine inbox tasks
│   ├── useOutboxFlows.ts     # Fetch initiated workflows
│   └── useTaskActions.ts     # Task action handlers
├── components/
│   ├── InboxView.tsx         # Inbox tab
│   ├── OutboxView.tsx        # Outbox tab
│   ├── TaskCard.tsx          # Task card (memoized)
│   ├── FlowCard.tsx          # Flow card (memoized)
│   ├── TaskDetailDialog.tsx  # Task details modal
│   ├── FlowDetailDialog.tsx  # Flow details modal
│   ├── EmptyState.tsx        # Empty states
│   ├── LoadingSkeleton.tsx   # Loading states
│   └── ErrorBoundary.tsx     # Error handling
├── types/
│   └── index.ts              # TypeScript interfaces
└── utils/
    ├── taskFormatters.ts     # Date & status formatters
    └── taskGrouping.ts       # Grouping & filtering utils
```

## Data Models

### UnifiedTask
Represents tasks from all sources in a consistent format:
```typescript
interface UnifiedTask {
  id: string;
  source: 'flow-engine' | 'crm-opportunity' | 'crm-lead' | 'approval';
  type: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assignedAt: string;
  availableActions: string[];
  // ... more fields
}
```

### Flow
Represents initiated workflows:
```typescript
interface Flow {
  id: string;
  templateName: string;
  status: FlowStatus;
  initiatedBy: string;
  startedAt: string;
  currentStep: number;
  totalSteps: number;
  steps: FlowStep[];
  // ... more fields
}
```

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
- `every-box-container` - Main container
- `every-box-inbox-tab` - Inbox tab
- `every-box-outbox-tab` - Outbox tab
- `task-card-{id}` - Individual task cards
- `flow-card-{id}` - Individual flow cards
- `inbox-search-input` - Inbox search
- `outbox-search-input` - Outbox search

## Performance

- **Polling**: 15-second interval with cleanup on unmount
- **Memoization**: TaskCard and FlowCard use React.memo
- **Optimized Queries**: Parallel data fetching
- **Lazy Loading**: Dialogs rendered only when needed
- **Search Debouncing**: Implemented in component state

## Future Enhancements (Out of Scope)

- Advanced filtering sidebar
- Batch task operations
- Task templates
- Push notifications
- Email digests
- Mobile app integration
- IRM service request integration
- Analytics dashboard

