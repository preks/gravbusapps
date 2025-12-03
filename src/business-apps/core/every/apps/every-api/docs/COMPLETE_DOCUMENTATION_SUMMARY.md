# Every API - Complete Documentation Summary

## 📖 Overview

The **Every API** is a unified task management system that aggregates tasks from multiple sources (Custom Flow Engine and Kogito) into a single interface. It can be used both **programmatically** (recommended) and via **HTTP/REST** (for testing/external access).

---

## 🎯 Two Ways to Use

### ✅ Method 1: Programmatic Usage (RECOMMENDED)

Import and use directly in your code - no HTTP overhead, full TypeScript support.

```typescript
import { fetchAllUserTasks } from '@/business-apps/core/every/apps/every-api'

const result = await fetchAllUserTasks(userId, accessToken, {
  source: 'all',
  status: 'IN_PROGRESS',
  limit: 20
})
```

**Benefits:**

- ✅ No HTTP overhead
- ✅ Full TypeScript support
- ✅ Better performance
- ✅ Easier debugging
- ✅ Reusable across modules

### 🌐 Method 2: REST API / HTTP Access

Access via URL for testing or external integrations.

```
http://localhost:3001/?app=core/every/apps/every-api&userId=USER_ID
```

**Use Cases:**

- Browser testing
- External integrations
- Quick prototyping

---

## 🚀 Quick Start

### 1. Configuration

Set environment variables:

```bash
NEXT_PUBLIC_CFLOW_ENDPOINT=http://localhost:3000
NEXT_PUBLIC_FLOW_METRICS_ENDPOINT=https://newwork-dev.newwork.com
```

### 2. Programmatic Usage

```typescript
import { fetchAllUserTasks, UnifiedTask } from '@/business-apps/core/every/apps/every-api'

// Fetch all tasks
const result = await fetchAllUserTasks(userId, accessToken, {
  source: 'all',
  limit: 20
})

console.log('Tasks:', result.tasks)
console.log('Errors:', result.errors)
```

### 3. REST API Usage

Start dev server:

```bash
npm run dev
```

Access in browser:

```
http://localhost:3001/?app=core/every/apps/every-api&userId=c2c0b944-8f68-4599-810f-6faccecd1a68
```

---

## 📋 Available Functions (Programmatic)

### 1. `fetchAllUserTasks()`

Fetch all tasks with optional filtering.

```typescript
async function fetchAllUserTasks(
  userId: string,
  accessToken?: string,
  filters?: Partial<TaskFilters>
): Promise<{
  tasks: UnifiedTask[]
  errors: Array<{ source: TaskSource; message: string; details?: any }>
  warnings: string[]
}>
```

**Example:**

```typescript
const result = await fetchAllUserTasks('user-123', accessToken, {
  source: 'cflow', // 'cflow' | 'kogito' | 'all'
  status: 'IN_PROGRESS', // Filter by status
  priority: 1, // Filter by priority
  search: 'approval', // Search term
  limit: 50, // Max results
  claimableOnly: true // Only claimable tasks
})
```

### 2. `fetchTaskStatistics()`

Get aggregated statistics from all sources.

```typescript
async function fetchTaskStatistics(
  userId: string,
  accessToken?: string
): Promise<{
  statistics: TaskStatistics
  errors: Array<{ source: TaskSource; message: string; details?: any }>
  warnings: string[]
}>
```

**Example:**

```typescript
const result = await fetchTaskStatistics('user-123', accessToken)

console.log('Total:', result.statistics.total)
console.log('In Progress:', result.statistics.byStatus.inProgress)
console.log('Cflow:', result.statistics.bySource.cflow)
console.log('Kogito:', result.statistics.bySource.kogito)
```

### 3. `fetchTaskById()`

Get a single task by ID (searches both sources).

```typescript
async function fetchTaskById(taskId: string, userId: string, accessToken?: string): Promise<UnifiedTask | null>
```

**Example:**

```typescript
const task = await fetchTaskById('task-123', 'user-456', accessToken)

if (task) {
  console.log('Found:', task.title)
  console.log('Source:', task.source)
}
```

---

## 🌐 REST API Endpoints

### Base URL Pattern

```
http://localhost:3001/?app=core/every/apps/every-api&[parameters]
```

**Note:** Port 3001 is the gravity-business-apps dev server

### Available Parameters

| Parameter       | Type                                                   | Description                               |
| --------------- | ------------------------------------------------------ | ----------------------------------------- |
| `userId`        | `string`                                               | **Required** - User ID to fetch tasks for |
| `source`        | `cflow\|kogito\|all`                                   | Filter by source system (default: all)    |
| `status`        | `SCHEDULED\|IN_PROGRESS\|COMPLETED\|FAILED\|CANCELLED` | Filter by status                          |
| `search`        | `string`                                               | Search by title, ID, or flow ID           |
| `priority`      | `number`                                               | Filter by priority level                  |
| `limit`         | `number`                                               | Max results (1-100, default: 20)          |
| `offset`        | `number`                                               | Skip results for pagination               |
| `sortBy`        | `createdAt\|dueDate\|priority\|status\|title`          | Sort field                                |
| `sortOrder`     | `asc\|desc`                                            | Sort order                                |
| `claimableOnly` | `boolean`                                              | Only claimable tasks                      |
| `assignedOnly`  | `boolean`                                              | Only assigned tasks                       |
| `stats`         | `boolean`                                              | Get statistics instead of tasks           |
| `taskId`        | `string`                                               | Get single task by ID                     |

### REST API Examples

#### Get All Tasks

```
http://localhost:3001/?app=core/every/apps/every-api&userId=USER_ID
```

#### Get Only Cflow Tasks

```
http://localhost:3001/?app=core/every/apps/every-api&userId=USER_ID&source=cflow
```

#### Filter by Status

```
http://localhost:3001/?app=core/every/apps/every-api&userId=USER_ID&status=IN_PROGRESS
```

#### Search Tasks

```
http://localhost:3001/?app=core/every/apps/every-api&userId=USER_ID&search=approval
```

#### Get Statistics

```
http://localhost:3001/?app=core/every/apps/every-api&userId=USER_ID&stats=true
```

#### Get Single Task

```
http://localhost:3001/?app=core/every/apps/every-api&taskId=TASK_ID&userId=USER_ID
```

#### Combine Multiple Filters

```
http://localhost:3001/?app=core/every/apps/every-api&userId=USER_ID&source=cflow&status=IN_PROGRESS&priority=1&limit=10
```

---

## 📊 Response Formats

### Success Response (Tasks)

```json
{
  "status": "success",
  "count": 5,
  "tasks": [
    {
      "id": "task-123",
      "flowId": "flow-456",
      "title": "Approve Request",
      "status": "IN_PROGRESS",
      "source": "cflow",
      "priority": 1,
      "dueDate": "2025-11-01T00:00:00Z",
      "assignment": {
        "assignedTo": "user-789",
        "isUserOwner": true
      },
      "availableActions": {
        "canComplete": true,
        "canReassign": true
      }
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 5,
    "hasMore": false
  }
}
```

### Statistics Response

```json
{
  "status": "success",
  "statistics": {
    "total": 25,
    "byStatus": {
      "scheduled": 5,
      "inProgress": 10,
      "completed": 8,
      "failed": 1,
      "cancelled": 1
    },
    "bySource": {
      "cflow": 15,
      "kogito": 10
    },
    "byPriority": {
      "1": 5,
      "2": 10,
      "3": 10
    }
  }
}
```

### Partial Response (One source failed)

```json
{
  "status": "partial",
  "count": 3,
  "tasks": [...],
  "warnings": ["Partial results: Some task sources failed to respond"],
  "errors": [
    {
      "source": "kogito",
      "message": "Failed to fetch Kogito tasks",
      "details": "Connection timeout"
    }
  ]
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Failed to fetch user tasks",
  "details": "Connection refused"
}
```

---

## 🎯 Real-World Examples

### Example 1: React Component

```typescript
import React, { useState, useEffect } from 'react'
import { fetchAllUserTasks, UnifiedTask } from '@/business-apps/core/every/apps/every-api'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export const MyTaskList: React.FC<BusinessAppContextProps> = ({ userInfo, accessToken }) => {
  const [tasks, setTasks] = useState<UnifiedTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTasks() {
      const result = await fetchAllUserTasks(userInfo.id, accessToken, {
        source: 'all',
        limit: 20
      })
      setTasks(result.tasks)
      setLoading(false)
    }
    loadTasks()
  }, [userInfo.id])

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {tasks.map(task => (
        <div key={task.id}>
          <h3>{task.title}</h3>
          <p>Source: {task.source}</p>
          <p>Status: {task.status}</p>
        </div>
      ))}
    </div>
  )
}
```

### Example 2: Custom Hook

```typescript
import { useState, useEffect } from 'react'
import { fetchAllUserTasks, UnifiedTask, TaskFilters } from '@/business-apps/core/every/apps/every-api'

export function useEveryTasks(userId: string, accessToken: string, filters?: Partial<TaskFilters>) {
  const [tasks, setTasks] = useState<UnifiedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const result = await fetchAllUserTasks(userId, accessToken, filters)
        setTasks(result.tasks)

        if (result.errors.length > 0 && result.tasks.length === 0) {
          setError('Failed to fetch tasks')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId, accessToken, JSON.stringify(filters)])

  return { tasks, loading, error }
}

// Usage
const { tasks, loading, error } = useEveryTasks(userId, accessToken, {
  source: 'cflow',
  status: 'IN_PROGRESS'
})
```

### Example 3: Service Class

```typescript
import { fetchAllUserTasks, fetchTaskById, UnifiedTask, TaskFilters } from '@/business-apps/core/every/apps/every-api'

export class TaskService {
  constructor(
    private userId: string,
    private accessToken: string
  ) {}

  async getMyTasks(filters?: Partial<TaskFilters>): Promise<UnifiedTask[]> {
    const result = await fetchAllUserTasks(this.userId, this.accessToken, filters)
    return result.tasks
  }

  async getHighPriorityTasks(): Promise<UnifiedTask[]> {
    const result = await fetchAllUserTasks(this.userId, this.accessToken, {
      priority: 1,
      status: 'IN_PROGRESS'
    })
    return result.tasks
  }

  async getClaimableTasks(): Promise<UnifiedTask[]> {
    const result = await fetchAllUserTasks(this.userId, this.accessToken, {
      claimableOnly: true
    })
    return result.tasks
  }

  async getTask(taskId: string): Promise<UnifiedTask | null> {
    return await fetchTaskById(taskId, this.userId, this.accessToken)
  }
}

// Usage
const taskService = new TaskService(userId, accessToken)
const myTasks = await taskService.getMyTasks()
const urgentTasks = await taskService.getHighPriorityTasks()
```

---

## 🔧 TypeScript Types

All types are exported:

```typescript
import {
  UnifiedTask,
  TaskStatistics,
  TaskFilters,
  TaskSource,
  TaskStatus,
  TaskAssignment,
  TaskAvailableActions
} from '@/business-apps/core/every/apps/every-api'
```

### UnifiedTask Interface

```typescript
interface UnifiedTask {
  // Identity
  id: string
  flowId?: string
  name?: string
  title?: string

  // Status
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  priority?: number

  // Timing
  dueDate?: string
  scheduledAt?: string
  createdAt?: string
  completedAt?: string

  // Assignment
  assignment?: {
    assignedTo?: string
    isUserOwner?: boolean
    currentStatus?: string
    targets?: {
      users?: string[]
      groups?: string[]
    }
  }

  // Actions
  availableActions?: {
    canClaim?: boolean
    canComplete?: boolean
    canReassign?: boolean
    canReject?: boolean
    canUnclaim?: boolean
  }

  // Source
  source: 'cflow' | 'kogito'
  sourceMetadata?: any
}
```

---

## 🏗️ Architecture

### Data Flow (Programmatic)

```
Component/Service
    ↓
fetchAllUserTasks()
    ↓
UnifiedTaskService
    ├→ CflowClient → custom-flow-engine API
    └→ KogitoClient → FlowMetricsClient → Kogito API
    ↓
Adapters (normalize to UnifiedTask)
    ↓
Filter & Sort
    ↓
Return { tasks, errors, warnings }
```

### Data Flow (HTTP/REST)

```
Browser Request
    ↓
EveryApiScreen component
    ↓
Parse URL parameters
    ↓
fetchAllUserTasks()
    ↓
[same as above]
    ↓
Render JSON in browser
```

### Source Systems

1. **Custom Flow Engine (cflow)**
   - Endpoint: `NEXT_PUBLIC_CFLOW_ENDPOINT`
   - API: `/api/tasks/user/{userId}`
   - Status: Already normalized
   - Minimal adaptation needed

2. **Kogito**
   - Endpoint: `NEXT_PUBLIC_FLOW_METRICS_ENDPOINT`
   - Uses: `FlowMetricsClient`
   - API: `/flow-executions/tasks`
   - Status: Needs mapping (Open→SCHEDULED, InProgress→IN_PROGRESS, etc.)
   - Field mapping required

---

## 💡 Best Practices

### 1. Handle Partial Results

```typescript
const result = await fetchAllUserTasks(userId, accessToken)

if (result.errors.length > 0) {
  // Some sources failed, but we still have partial data
  console.warn('Partial results:', result.warnings)
  result.errors.forEach(err => {
    console.error(`${err.source} failed:`, err.message)
  })
}

// Still use the tasks we got
setTasks(result.tasks)
```

### 2. Use Filters to Reduce Load

```typescript
// Instead of fetching all and filtering client-side
const result = await fetchAllUserTasks(userId, accessToken, {
  source: 'cflow', // Only fetch from one source
  status: 'IN_PROGRESS', // Only active tasks
  limit: 20 // Limit results
})
```

### 3. Error Handling

```typescript
try {
  const result = await fetchAllUserTasks(userId, accessToken)

  if (result.errors.length > 0 && result.tasks.length === 0) {
    // All sources failed
    throw new Error('Failed to fetch tasks from all sources')
  }

  return result.tasks
} catch (error) {
  console.error('Task fetch failed:', error)
  return []
}
```

---

## 🐛 Troubleshooting

### No tasks showing?

- Check that `userId` parameter is correct
- Verify environment variables are set
- Check browser console for errors
- Try `source=cflow` to test cflow only

### Slow response?

- Use `source=cflow` or `source=kogito` to query one system at a time
- Reduce `limit` parameter
- Add more specific filters

### Getting errors?

- Check browser console (F12) for detailed error messages
- Verify both cflow and Kogito endpoints are accessible
- Try with `source=cflow` to isolate the issue

### Kogito tasks showing 0?

- Verify `NEXT_PUBLIC_FLOW_METRICS_ENDPOINT` is set
- Check access token is valid
- Ensure FlowMetricsClient is configured correctly

### "In Progress" KPI showing 0?

- This was a known issue with the cflow stats API
- Fixed by calculating stats from actual task data
- Ensure you're using the latest version

---

## 📚 Documentation

All documentation for the Every API is now consolidated in this single file (`COMPLETE_DOCUMENTATION_SUMMARY.md`), which includes:

- ✅ Complete API documentation
- ✅ Programmatic usage guide with examples
- ✅ HTTP/REST API access guide
- ✅ Quick start guide
- ✅ Real-world code examples
- ✅ Integration patterns
- ✅ Best practices
- ✅ Troubleshooting guide
- ✅ System architecture
- ✅ TypeScript types reference

---

## 🎉 Summary

The Every API provides two ways to access unified tasks:

1. **Programmatic (Recommended)**: Import functions directly - fast, type-safe, easy to debug
2. **REST API**: Access via URL - good for testing and external integrations

Both methods provide:

- ✅ Unified task interface from multiple sources
- ✅ Comprehensive filtering and sorting
- ✅ Graceful error handling with partial results
- ✅ Full TypeScript support
- ✅ Detailed statistics and KPIs

**Choose programmatic usage for production code, REST API for testing and external access.**
