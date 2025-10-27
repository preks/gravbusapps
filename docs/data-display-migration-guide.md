# Data Display Migration Guide

**Comprehensive guide for migrating from traditional table patterns to the integrated DataDisplay + DataTable pattern**

---

## Table of Contents

1. [Overview](#overview)
2. [Component Architecture](#component-architecture)
3. [Traditional Pattern vs New Pattern](#traditional-pattern-vs-new-pattern)
4. [Step-by-Step Migration](#step-by-step-migration)
5. [Complete Feature Guide](#complete-feature-guide)
6. [Advanced Patterns](#advanced-patterns)
7. [Best Practices](#best-practices)

---

## Overview

The Data Display pattern combines four powerful components to create a complete data management interface:

- **DataDisplay**: Layout wrapper that orchestrates toolbar and content
- **DataToolbar**: Search, filters, sorting, column visibility, bulk actions
- **FilterSheet**: Comprehensive filter configuration UI
- **DataTable**: Feature-rich table with pagination, sorting, selection, actions

### Benefits of Migration

- **70% less boilerplate code** (300-500 lines → ~100 lines)
- **Consistent UI** across all data views
- **Built-in accessibility** (ARIA labels, keyboard navigation)
- **Type-safe** with full TypeScript support
- **Responsive** out of the box
- **Maintainable** - changes propagate automatically

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│ DataDisplay (Layout Orchestrator)                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ DataToolbar                                         │ │
│ │ ┌─────┬────────┬─────────┬──────┬──────────┬─────┐ │ │
│ │ │Tabs │ Search │ Filters │ Sort │ Columns  │ Add │ │ │
│ │ └─────┴────────┴─────────┴──────┴──────────┴─────┘ │ │
│ │ ┌───────────────────────────────────────────────┐   │ │
│ │ │ Active Filter Chips (clickable to edit)       │   │ │
│ │ └───────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ DataTable (children)                                │ │
│ │ ┌──────────────────────────────────────────────┐    │ │
│ │ │ ☑ Name    │ Email    │ Status  │ Actions   │    │ │
│ │ ├──────────────────────────────────────────────┤    │ │
│ │ │ ☐ John    │ john@... │ Active  │ ⋮         │    │ │
│ │ │ ☐ Jane    │ jane@... │ Active  │ ⋮         │    │ │
│ │ └──────────────────────────────────────────────┘    │ │
│ │ Pagination: ‹‹ ‹ 1 2 3 › ››                         │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────┐
│ FilterSheet (Modal) │
│ ┌─────────────────┐ │
│ │ ▼ Status        │ │
│ │   ☑ Active      │ │
│ │   ☐ Inactive    │ │
│ │                 │ │
│ │ ▼ Department    │ │
│ │   ☑ Engineering │ │
│ │   ☐ Sales       │ │
│ └─────────────────┘ │
│ [Clear] [Apply]     │
└─────────────────────┘
```

---

## Traditional Pattern vs New Pattern

### ❌ Traditional Pattern (What You Currently Have)

```tsx
// 300+ lines of boilerplate code
export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  loading,
  total,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  onPaginationChange,
  onSortingChange,
  selectedTaskId
}) => {
  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'ASC') onSortingChange(field, 'DESC')
      else if (sortOrder === 'DESC') onSortingChange('', '')
      else onSortingChange(field, 'ASC')
    } else {
      onSortingChange(field, 'ASC')
    }
  }

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null
    if (sortOrder === 'ASC') return <PiArrowUp />
    if (sortOrder === 'DESC') return <PiArrowDown />
    return null
  }

  return (
    <Card>
      <CardContent className="p-0">
        {loading && (
          <div className="flex justify-center p-4">
            <Spinner />
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-gray-50">
                <TableHead className="cursor-pointer select-none hover:bg-gray-100" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Task {renderSortIcon('name')}</div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('priority')}
                >
                  <div className="flex items-center">Priority {renderSortIcon('priority')}</div>
                </TableHead>
                {/* More manual headers... */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map(task => (
                <TableRow key={task.id}>
                  <TableCell>{task.name}</TableCell>
                  <TableCell>
                    <Badge variant={getTaskPriorityBadgeVariant(task.priority)}>{task.priority}</Badge>
                  </TableCell>
                  {/* More manual cells... */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Manual pagination UI - 50+ lines */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, total)} of ${total} tasks`}
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select value={pageSize} onChange={e => onPaginationChange(1, Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => onPaginationChange(1)} disabled={currentPage === 1}>
              ⟨⟨
            </Button>
            <Button onClick={() => onPaginationChange(currentPage - 1)} disabled={currentPage === 1}>
              ⟨
            </Button>
            <Button
              onClick={() => onPaginationChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(total / pageSize)}
            >
              ⟩
            </Button>
            <Button
              onClick={() => onPaginationChange(Math.ceil(total / pageSize))}
              disabled={currentPage >= Math.ceil(total / pageSize)}
            >
              ⟩⟩
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
```

**Problems:**

- Manual sorting logic
- Manual pagination UI
- No search integration
- No filter support
- No column management
- No bulk actions
- Duplicated across every view
- Hard to maintain

### ✅ New Pattern (What You Should Migrate To)

```tsx
// ~100 lines total
export const TaskManagement: React.FC<TaskManagementProps> = (props) => {
  const { accessToken, userInfo } = props;

  // Single hook manages ALL state for a section
  const [currentSection, setCurrentSection] = useState('my');
  const myTasks = useTaskData({ type: 'my', userInfo, accessToken });
  const teamTasks = useTaskData({ type: 'team', accessToken });

  // Get current section's data
  const current = currentSection === 'my' ? myTasks : teamTasks;

  return (
    <div>
      <TaskStatistics {...} />

      <DataDisplay
        // Section tabs
        titleSections={[
          { id: 'my', label: 'My Tasks' },
          { id: 'team', label: 'Team Tasks' }
        ]}
        currentSection={currentSection}
        onSectionChange={setCurrentSection}

        // Search
        searchValue={current.search}
        onSearchChange={current.setSearch}

        // Filters
        filters={current.filters}
        filterConfiguration={taskFilterConfig}
        onFilterChange={current.setFilters}

        // Sorting
        sorting={current.sorting}
        sortableColumns={taskSortableColumns}
        onSortingChange={current.setSorting}

        // Column visibility
        availableColumns={taskColumns.map(col => ({ id: col.id!, label: col.header as string }))}
        visibleColumns={current.visibleColumns}
        onVisibleColumnsChange={current.setVisibleColumns}

        // Selection & bulk actions
        selectedCount={current.selectedRows.length}
        bulkActions={[
          { id: 'export', label: 'Export', onClick: () => console.log('Export') },
          { id: 'delete', label: 'Delete', onClick: () => console.log('Delete') }
        ]}
        onClearSelection={() => current.setSelectedRows([])}
      >
        <DataTable
          data={current.data}
          columns={taskColumns.filter(col => current.visibleColumns.includes(col.id!))}
          loading={current.loading}
          totalCount={current.total}

          // Controlled states (managed by hook)
          sorting={current.sorting}
          onSortingChange={current.setSorting}
          pagination={current.pagination}
          onPaginationChange={current.setPagination}
          selectedRows={current.selectedRows}
          onSelectionChange={current.setSelectedRows}

          // Features
          enablePagination
          enableSorting
          enableSelection
          enableColumnPinning
          enableResizing

          // Row actions
          actions={[
            { label: 'Edit', onClick: (task) => handleEdit(task) },
            { label: 'Delete', onClick: (task) => handleDelete(task) }
          ]}
        />
      </DataDisplay>
    </div>
  );
};
```

**Benefits:**

- Automatic sorting UI
- Built-in pagination
- Integrated search
- Filter chips + FilterSheet
- Column visibility
- Bulk actions
- Type-safe
- Consistent UI

---

## Step-by-Step Migration

### Step 1: Create Data Hook

Create a reusable hook to manage all table state and data fetching:

```typescript
// hooks/useTaskData.ts
import { useState, useMemo } from 'react'
import type { SortingState } from '@tanstack/react-table'

interface UseTaskDataProps {
  type: 'my' | 'team'
  userInfo?: UserInfo
  accessToken: string
  sourceApp?: string
}

export function useTaskData({ type, userInfo, accessToken, sourceApp }: UseTaskDataProps) {
  // UI State
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [selectedRows, setSelectedRows] = useState<Task[]>([])
  const [visibleColumns, setVisibleColumns] = useState(['name', 'priority', 'status', 'dueDate'])

  // Build query from state
  const queryParams = useMemo(() => {
    const params: any = {
      search,
      ...filters,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      sortField: sorting[0]?.id || 'createdAt',
      sortOrder: sorting[0]?.desc ? 'DESC' : 'ASC',
      sourceApp
    }

    // Add type-specific filters
    if (type === 'my' && userInfo?.employeeDetails?.employeeId) {
      params.assignedEmployeeIds = [userInfo.employeeDetails.employeeId]
    }

    return params
  }, [search, filters, pagination, sorting, type, userInfo, sourceApp])

  // Fetch data using your existing hook
  const { tasks, total, loading, error } = useTaskListData({
    ...queryParams,
    accessToken
  })

  return {
    // Data
    data: tasks,
    total,
    loading,
    error,

    // UI State (for DataDisplay)
    search,
    setSearch,
    filters,
    setFilters,

    // Table State (for DataTable)
    pagination,
    setPagination,
    sorting,
    setSorting,
    selectedRows,
    setSelectedRows,
    visibleColumns,
    setVisibleColumns
  }
}
```

### Step 2: Define Column Configuration

Convert your table columns to TanStack Table format:

```typescript
// config/taskColumns.tsx
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@newwork/nw-design-system';
import type { Task } from '../types';

export const taskColumns: ColumnDef<Task>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Task',
    size: 250,
    cell: ({ row }) => (
      <div className="font-medium">{row.original.name}</div>
    )
  },
  {
    id: 'priority',
    accessorKey: 'priority',
    header: 'Priority',
    size: 120,
    cell: ({ row }) => (
      <Badge variant={getPriorityVariant(row.original.priority)}>
        {row.original.priority}
      </Badge>
    )
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    size: 120,
    cell: ({ row }) => (
      <Badge variant={getStatusVariant(row.original.status)}>
        {row.original.status}
      </Badge>
    )
  },
  {
    id: 'dueDate',
    accessorKey: 'dueDate',
    header: 'Due Date',
    size: 140,
    cell: ({ row }) => formatDate(row.original.dueDate)
  },
  {
    id: 'assignedTo',
    accessorKey: 'assignedTo',
    header: 'Assigned To',
    size: 180,
    cell: ({ row }) => (
      <OwnerDisplay
        ownerEmployee={row.original.assignedTo}
        entityId={row.original.id}
      />
    )
  }
];

export const taskSortableColumns = taskColumns.map(col => ({
  id: col.id!,
  label: col.header as string
}));
```

### Step 3: Define Filter Configuration

Create filter configuration for the FilterSheet:

```typescript
// config/taskFilters.ts
import type { FilterConfiguration } from '@newwork/nw-design-system'

export const taskFilterConfig: FilterConfiguration = {
  id: 'task-filters',
  name: 'Task Filters',
  groups: [
    {
      id: 'status-group',
      label: 'Status',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'status',
          field: 'status',
          label: 'Status',
          type: 'multi-select',
          config: {
            options: [
              { id: 'pending', label: 'Pending' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'completed', label: 'Completed' }
            ]
          }
        }
      ]
    },
    {
      id: 'priority-group',
      label: 'Priority',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'priority',
          field: 'priority',
          label: 'Priority',
          type: 'multi-select',
          config: {
            options: [
              { id: 'low', label: 'Low' },
              { id: 'medium', label: 'Medium' },
              { id: 'high', label: 'High' },
              { id: 'urgent', label: 'Urgent' }
            ]
          }
        }
      ]
    },
    {
      id: 'type-group',
      label: 'Task Type',
      collapsible: true,
      filters: [
        {
          id: 'type',
          field: 'type',
          label: 'Type',
          type: 'multi-select',
          config: {
            options: [
              { id: 'call', label: 'Call' },
              { id: 'email', label: 'Email' },
              { id: 'meeting', label: 'Meeting' },
              { id: 'todo', label: 'To-Do' }
            ]
          }
        }
      ]
    },
    {
      id: 'date-group',
      label: 'Date Range',
      collapsible: true,
      filters: [
        {
          id: 'createdAfter',
          field: 'createdAfter',
          label: 'Created After',
          type: 'date',
          config: {}
        },
        {
          id: 'createdBefore',
          field: 'createdBefore',
          label: 'Created Before',
          type: 'date',
          config: {}
        }
      ]
    }
  ]
}
```

### Step 4: Implement the View

Replace your old component with the new pattern:

```tsx
// components/TaskManagement.tsx
import React, { useState } from 'react'
import { DataDisplay, DataTable } from '@newwork/nw-design-system'
import { useTaskData } from './hooks/useTaskData'
import { taskColumns, taskSortableColumns } from './config/taskColumns'
import { taskFilterConfig } from './config/taskFilters'
import type { Task } from './types'

export const TaskManagement: React.FC<TaskManagementProps> = props => {
  const { accessToken, userInfo } = props

  // Section state
  const [currentSection, setCurrentSection] = useState('my')

  // Data hooks for each section
  const myTasks = useTaskData({
    type: 'my',
    userInfo,
    accessToken,
    sourceApp: 'IRM'
  })

  const teamTasks = useTaskData({
    type: 'team',
    accessToken,
    sourceApp: 'IRM'
  })

  // Get current section data
  const current = currentSection === 'my' ? myTasks : teamTasks

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-black mb-3">Tasks</h1>
        <p className="text-lg text-gray-500">Manage and track tasks</p>
      </div>

      {/* Statistics */}
      <div className="mb-6 pb-6 border-b">
        <TaskStatistics {...props} />
      </div>

      {/* Data Display */}
      <DataDisplay
        // Sections
        titleSections={[
          { id: 'my', label: 'My Tasks' },
          { id: 'team', label: 'Team Tasks' }
        ]}
        currentSection={currentSection}
        onSectionChange={setCurrentSection}
        // Search
        searchValue={current.search}
        searchPlaceholder="Search tasks..."
        onSearchChange={current.setSearch}
        // Filters
        filters={current.filters}
        filterConfiguration={taskFilterConfig}
        onFilterChange={current.setFilters}
        // Sorting
        sorting={current.sorting}
        sortableColumns={taskSortableColumns}
        onSortingChange={current.setSorting}
        // Column Visibility
        availableColumns={taskColumns.map(col => ({
          id: col.id!,
          label: col.header as string
        }))}
        visibleColumns={current.visibleColumns}
        onVisibleColumnsChange={current.setVisibleColumns}
        // Selection & Bulk Actions
        selectedCount={current.selectedRows.length}
        bulkActions={[
          {
            id: 'export',
            label: 'Export Selected',
            onClick: () => handleExport(current.selectedRows)
          },
          {
            id: 'assign',
            label: 'Bulk Assign',
            onClick: () => handleBulkAssign(current.selectedRows)
          },
          {
            id: 'delete',
            label: 'Delete Selected',
            onClick: () => handleBulkDelete(current.selectedRows)
          }
        ]}
        onClearSelection={() => current.setSelectedRows([])}
      >
        <DataTable<Task>
          // Data
          data={current.data}
          columns={taskColumns.filter(col => current.visibleColumns.includes(col.id!))}
          loading={current.loading}
          error={current.error?.message}
          totalCount={current.total}
          // Controlled State
          sorting={current.sorting}
          onSortingChange={current.setSorting}
          pagination={current.pagination}
          onPaginationChange={current.setPagination}
          selectedRows={current.selectedRows}
          onSelectionChange={current.setSelectedRows}
          // Features
          enablePagination
          enableSorting
          enableSelection
          enableColumnPinning
          enableResizing
          // UI
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage="No tasks found"
          // Row Actions
          actions={[
            {
              label: 'View Details',
              onClick: task => handleViewTask(task)
            },
            {
              label: 'Edit',
              onClick: task => handleEditTask(task)
            },
            {
              label: 'Complete',
              onClick: task => handleCompleteTask(task),
              disabled: task => task.status === 'completed'
            }
          ]}
          // Row Click
          onRowClick={task => handleViewTask(task)}
        />
      </DataDisplay>
    </div>
  )
}
```

### Step 5: Remove Old Code

Delete the old table component and all manual implementations:

```bash
# Remove old files
rm components/TaskTable.tsx
rm components/AccountList.tsx
# etc.
```

---

## Complete Feature Guide

### 1. Search

**DataDisplay automatically integrates search:**

```tsx
<DataDisplay
  searchValue={current.search}
  searchPlaceholder="Search tasks..."
  onSearchChange={current.setSearch}
>
```

**In your hook:**

```typescript
const [search, setSearch] = useState('');

// Include in query
const queryParams = useMemo(() => ({
  search,  // ← Sent to backend
  // ...
}), [search, ...]);
```

### 2. Filters

**Define filter configuration:**

```typescript
const filterConfig: FilterConfiguration = {
  id: 'filters',
  name: 'Filters',
  groups: [
    {
      id: 'status',
      label: 'Status',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'status',
          field: 'status',
          label: 'Status',
          type: 'multi-select',
          config: {
            options: [
              { id: 'active', label: 'Active' },
              { id: 'inactive', label: 'Inactive' }
            ]
          }
        }
      ]
    }
  ]
}
```

**Use in DataDisplay:**

```tsx
<DataDisplay
  filters={current.filters}
  filterConfiguration={filterConfig}
  onFilterChange={current.setFilters}
>
```

**Filter chips are automatic:**

- Click chip to edit that filter
- Click X to remove filter
- "Clear All" button appears when filters active

### 3. Sorting

**Define sortable columns:**

```typescript
const sortableColumns = [
  { id: 'name', label: 'Name' },
  { id: 'createdAt', label: 'Created Date' },
  { id: 'priority', label: 'Priority' }
]
```

**Use in DataDisplay:**

```tsx
<DataDisplay
  sorting={current.sorting}
  sortableColumns={sortableColumns}
  onSortingChange={current.setSorting}
>
```

**DataTable automatically:**

- Shows sort icons in headers
- Handles click-to-sort
- Supports multi-column sort (Shift+Click)

### 4. Pagination

**Controlled via DataTable:**

```tsx
<DataTable
  pagination={current.pagination}
  onPaginationChange={current.setPagination}
  totalCount={current.total}
  enablePagination
  rowsPerPageOptions={[10, 20, 50, 100]}
  showPageNumbers
  maxVisiblePages={7}
/>
```

**Automatic features:**

- Page size selector
- First/Previous/Next/Last buttons
- Page number buttons
- "Showing X-Y of Z" info

### 5. Column Visibility

**Define available columns:**

```tsx
<DataDisplay
  availableColumns={[
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'status', label: 'Status' }
  ]}
  visibleColumns={current.visibleColumns}
  onVisibleColumnsChange={current.setVisibleColumns}
>
```

**Filter columns in DataTable:**

```tsx
<DataTable columns={allColumns.filter(col => current.visibleColumns.includes(col.id!))} />
```

**Automatic UI:**

- Column visibility dropdown in toolbar
- Checkboxes for each column
- "Show All" / "Hide All" buttons

### 6. Selection & Bulk Actions

**Define bulk actions:**

```tsx
<DataDisplay
  selectedCount={current.selectedRows.length}
  bulkActions={[
    {
      id: 'export',
      label: 'Export',
      onClick: () => exportRows(current.selectedRows)
    },
    {
      id: 'delete',
      label: 'Delete',
      onClick: () => deleteRows(current.selectedRows)
    }
  ]}
  onClearSelection={() => current.setSelectedRows([])}
>
```

**Enable in DataTable:**

```tsx
<DataTable enableSelection selectedRows={current.selectedRows} onSelectionChange={current.setSelectedRows} />
```

**Automatic features:**

- Checkboxes in first column
- "Select All" checkbox in header
- Bulk action bar replaces title when rows selected
- "Clear Selection" button

### 7. Row Actions

The `actions` prop supports two approaches: **standard dropdown actions** (array) or **custom renderer** (function).

#### 7.1. Standard Actions (Dropdown Menu)

**Define row-specific actions with dropdown menu:**

```tsx
<DataTable
  actions={[
    {
      label: 'Edit',
      onClick: row => handleEdit(row)
    },
    {
      label: 'Delete',
      onClick: row => handleDelete(row),
      disabled: row => row.status === 'active'
    },
    {
      label: 'Archive',
      onClick: row => handleArchive(row)
    }
  ]}
/>
```

**Features:**

- Three-dot menu in last column
- Menu stays visible during horizontal scroll (pinned)
- Conditional disabled state
- Automatic keyboard navigation

**With notifications:**

```tsx
import { toast } from '@newwork/nw-design-system'
;<DataTable
  actions={[
    {
      label: 'View Details',
      onClick: employee => {
        toast.info('View Details', {
          description: `Viewing ${employee.name} - ${employee.position}`
        })
      }
    },
    {
      label: 'Edit',
      onClick: employee => {
        toast('Edit Employee', {
          description: `Editing ${employee.name} - ${employee.email}`
        })
      }
    },
    {
      label: 'Delete',
      onClick: employee => {
        toast.error('Delete Employee', {
          description: `Delete ${employee.name}? This action cannot be undone.`
        })
      },
      disabled: employee => employee.status === 'Active'
    }
  ]}
/>
```

#### 7.2. Custom Actions Renderer (Advanced)

**For complete control over the actions UI, pass a render function:**

```tsx
<DataTable
  actions={row => (
    <Button
      variant="outline"
      size="sm"
      onClick={e => {
        e.stopPropagation()
        handleCustomAction(row.original)
      }}
    >
      Quick Action
    </Button>
  )}
/>
```

**Type signature:**

```typescript
type ActionsConfig<TData> =
  | ComponentAction<TData>[] // Array of actions
  | ((row: { original: TData }) => React.ReactNode) // Custom renderer
```

#### 7.3. Custom Renderer Examples

**Single custom button:**

```tsx
<DataTable
  actions={row => (
    <Button
      variant="outline"
      size="sm"
      onClick={e => {
        e.stopPropagation()
        toast.success('Action Triggered', {
          description: `Processing ${row.original.name}`
        })
      }}
    >
      Process
    </Button>
  )}
/>
```

**Conditional rendering based on row data:**

```tsx
<DataTable
  actions={row => {
    const isActive = row.original.status === 'Active'
    return (
      <Button
        variant={isActive ? 'default' : 'secondary'}
        size="sm"
        onClick={e => {
          e.stopPropagation()
          if (isActive) {
            toast.warning('Deactivate', {
              description: `${row.original.name} will be marked as inactive`
            })
          } else {
            toast.success('Activate', {
              description: `${row.original.name} will be reactivated`
            })
          }
        }}
      >
        {isActive ? 'Deactivate' : 'Activate'}
      </Button>
    )
  }}
/>
```

**Multiple custom buttons:**

```tsx
<DataTable
  actions={row => (
    <div className="nw:flex nw:gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={e => {
          e.stopPropagation()
          handleView(row.original)
        }}
      >
        View
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={e => {
          e.stopPropagation()
          handleEdit(row.original)
        }}
      >
        Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={e => {
          e.stopPropagation()
          handleDelete(row.original)
        }}
      >
        Delete
      </Button>
    </div>
  )}
/>
```

**Icon-only actions:**

```tsx
import { Edit, Trash, Eye } from 'lucide-react'
;<DataTable
  actions={row => (
    <div className="nw:flex nw:gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={e => {
          e.stopPropagation()
          handleView(row.original)
        }}
      >
        <Eye className="nw:h-4 nw:w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={e => {
          e.stopPropagation()
          handleEdit(row.original)
        }}
      >
        <Edit className="nw:h-4 nw:w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={e => {
          e.stopPropagation()
          handleDelete(row.original)
        }}
        disabled={row.original.status === 'Active'}
      >
        <Trash className="nw:h-4 nw:w-4" />
      </Button>
    </div>
  )}
/>
```

#### 7.4. AppActionMenu Integration (Recommended)

**For flow-based actions, use AppActionMenu instead of basic actions:**

```tsx
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
;<DataTable
  actions={row => (
    <AppActionMenu
      data-testid={`task-actions-menu-${row.original.id}`}
      contextsArray={[FlowContextName.investmentTaskEntity]}
      externalContextData={{ taskId: row.original.id }}
      prefixDataTestId="task-actions"
      accessToken={accessToken}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick
      onClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded gba:border gba:border-gray-300 gba:bg-white gba:hover:bg-gray-50 gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500 gba:focus:ring-offset-2"
        aria-label="Task actions"
        data-testid={`task-actions-trigger-${row.original.id}`}
      >
        <svg className="gba:w-4 gba:h-4 gba:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>
    </AppActionMenu>
  )}
/>
```

**AppActionMenu Benefits:**

- Integrates with flow registry
- Supports deferred loading
- Handles context data automatically
- Provides consistent action UI
- Supports multiple action types

#### 7.5. When to Use Each Approach

**Use AppActionMenu when:**

- Actions come from flow registry
- You need flow integration
- You want deferred loading
- Actions are context-dependent

**Use Standard Actions (Array) when:**

- You have 2-6 simple actions per row
- Actions are static (not flow-based)
- You want consistent dropdown UI
- You need conditional disabled states

**Use Custom Renderer (Function) when:**

- You need custom button styling
- You want to show actions based on complex conditions
- You need multiple visible buttons (not in dropdown)
- You want icon-only actions
- You need complete control over the UI
- You're integrating with external UI components

#### 7.6. Best Practices

**✅ DO: Always stop propagation in custom renderers**

```tsx
onClick={(e) => {
  e.stopPropagation();  // Prevents row click handler
  handleAction();
}}
```

**✅ DO: Use toast notifications for user feedback**

```tsx
import { toast } from '@newwork/nw-design-system'

toast.success('Action completed', {
  description: 'Details about what happened'
})
```

**✅ DO: Keep custom renderers simple**

```tsx
// Good: Simple, readable
actions={(row) => (
  <Button onClick={(e) => { e.stopPropagation(); handle(row.original); }}>
    Action
  </Button>
)}

// Bad: Too complex, extract to component
actions={(row) => (
  <div>
    {/* 50 lines of complex logic */}
  </div>
)}
```

**❌ DON'T: Forget to handle row.original**

```tsx
// Bad: Accessing row directly
actions={(row) => <Button onClick={() => handle(row)}>Action</Button>}

// Good: Access row.original
actions={(row) => <Button onClick={() => handle(row.original)}>Action</Button>}
```

**✅ DO: Provide visual feedback for disabled states**

```tsx
<Button
  disabled={!canPerformAction(row.original)}
  title={canPerformAction(row.original) ? undefined : 'Action not available'}
>
  Action
</Button>
```

### 8. Section/Tab Support

**Define sections:**

```tsx
<DataDisplay
  titleSections={[
    { id: 'my', label: 'My Tasks' },
    { id: 'team', label: 'Team Tasks' },
    { id: 'all', label: 'All Tasks' }
  ]}
  currentSection={currentSection}
  onSectionChange={setCurrentSection}
>
```

**Each section has independent state:**

```typescript
const myTasks = useTaskData({ type: 'my' })
const teamTasks = useTaskData({ type: 'team' })
const allTasks = useTaskData({ type: 'all' })

const sections = {
  my: myTasks,
  team: teamTasks,
  all: allTasks
}

const current = sections[currentSection]
```

### 9. Loading & Error States

**Handled automatically:**

```tsx
<DataTable loading={current.loading} error={current.error?.message} emptyMessage="No data found" />
```

**Displays:**

- Skeleton loader during initial load
- Error message with retry button
- Empty state with custom message

### 10. Row Click

**Navigate on row click:**

```tsx
<DataTable
  onRowClick={row => {
    navigateTo(`/tasks/${row.id}`)
  }}
/>
```

### 11. View Switching

**Add view options:**

```tsx
<DataDisplay
  viewOptions={[
    { value: 'table', label: 'Table' },
    { value: 'cards', label: 'Cards' },
    { value: 'kanban', label: 'Kanban' }
  ]}
  currentView={currentView}
  onViewChange={setCurrentView}
>
  {currentView === 'table' ? (
    <DataTable {...} />
  ) : currentView === 'cards' ? (
    <CardGrid {...} />
  ) : (
    <KanbanBoard {...} />
  )}
</DataDisplay>
```

---

## Advanced Patterns

### Pattern 1: URL State Persistence

Persist filters, sorting, and pagination to URL:

```typescript
export function useTaskData(props: UseTaskDataProps) {
  // Read from URL on mount
  const urlParams = new URLSearchParams(window.location.search)
  const initialFilters = {
    status: urlParams.getAll('status'),
    priority: urlParams.getAll('priority')
  }

  const [filters, setFilters] = useState(initialFilters)
  const [pagination, setPagination] = useState({
    pageIndex: parseInt(urlParams.get('page') || '1') - 1,
    pageSize: parseInt(urlParams.get('pageSize') || '20')
  })

  // Sync to URL
  useEffect(() => {
    const params = new URLSearchParams()

    Object.entries(filters).forEach(([key, values]) => {
      if (Array.isArray(values)) {
        values.forEach(v => params.append(key, v))
      } else if (values) {
        params.set(key, values)
      }
    })

    if (pagination.pageIndex > 0) {
      params.set('page', String(pagination.pageIndex + 1))
    }

    if (pagination.pageSize !== 20) {
      params.set('pageSize', String(pagination.pageSize))
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [filters, pagination])

  // ... rest of hook
}
```

### Pattern 2: Saved Filter Presets

Allow users to save and load filter configurations:

```typescript
const [savedPresets, setSavedPresets] = useState([
  { id: 'high-priority', name: 'High Priority', filters: { priority: ['high', 'urgent'] } },
  { id: 'my-active', name: 'My Active Tasks', filters: { status: ['pending', 'in_progress'], assignedTo: 'me' } }
])

const loadPreset = (presetId: string) => {
  const preset = savedPresets.find(p => p.id === presetId)
  if (preset) {
    current.setFilters(preset.filters)
  }
}

const saveCurrentAsPreset = (name: string) => {
  const newPreset = {
    id: `preset-${Date.now()}`,
    name,
    filters: current.filters
  }
  setSavedPresets([...savedPresets, newPreset])
}
```

### Pattern 3: Real-time Updates

Automatically refresh data:

```typescript
export function useTaskData(props: UseTaskDataProps) {
  // ... existing state

  // Listen for process completion events
  useEffect(() => {
    const handleUpdate = () => {
      // Refresh without changing page/filters
      refetch()
    }

    window.addEventListener('task-updated', handleUpdate)
    return () => window.removeEventListener('task-updated', handleUpdate)
  }, [])

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // ... rest of hook
}
```

### Pattern 4: Export Functionality

Add export capabilities:

```tsx
const handleExport = (rows: Task[]) => {
  // CSV export
  const csv = convertToCSV(rows)
  downloadFile(csv, 'tasks.csv', 'text/csv')
}

const handleExportAll = async () => {
  // Export all data (not just current page)
  const allData = await fetchAllTasks(current.filters)
  const csv = convertToCSV(allData)
  downloadFile(csv, 'all-tasks.csv', 'text/csv')
}

;<DataDisplay
  bulkActions={[
    {
      id: 'export-selected',
      label: 'Export Selected',
      onClick: () => handleExport(current.selectedRows)
    },
    {
      id: 'export-all',
      label: 'Export All',
      onClick: handleExportAll
    }
  ]}
/>
```

### Pattern 5: Optimistic Updates

Update UI immediately, sync with server:

```typescript
const handleCompleteTask = async (task: Task) => {
  // Optimistic update
  const updatedTask = { ...task, status: 'completed' }
  current.setData(current.data.map(t => (t.id === task.id ? updatedTask : t)))

  try {
    // Sync with server
    await updateTask(task.id, { status: 'completed' })
  } catch (error) {
    // Revert on error
    current.setData(current.data.map(t => (t.id === task.id ? task : t)))
    showError('Failed to update task')
  }
}
```

---

## Best Practices

### 1. State Management

**✅ DO: Use a single hook per section**

```typescript
const myTasks = useTaskData({ type: 'my' })
const teamTasks = useTaskData({ type: 'team' })
```

**❌ DON'T: Manage state manually**

```typescript
const [search, setSearch] = useState('')
const [filters, setFilters] = useState({})
const [pagination, setPagination] = useState({})
const [sorting, setSorting] = useState([])
// etc... too much boilerplate
```

### 2. Column Definitions

**✅ DO: Define columns once, reuse everywhere**

```typescript
// config/taskColumns.tsx
export const taskColumns: ColumnDef<Task>[] = [...];

// Use in multiple places
<DataTable columns={taskColumns} />
```

**❌ DON'T: Define columns inline**

```typescript
<DataTable columns={[
  { id: 'name', accessorKey: 'name', header: 'Name' },
  // ... inline definition
]} />
```

### 3. Filter Configuration

**✅ DO: Create reusable filter configs**

```typescript
// config/taskFilters.ts
export const taskFilterConfig: FilterConfiguration = {...};
```

**❌ DON'T: Hardcode filters in component**

### 4. Performance

**✅ DO: Memoize expensive computations**

```typescript
const queryParams = useMemo(
  () => ({
    search,
    ...filters
    // ...
  }),
  [search, filters]
)
```

**✅ DO: Filter columns before rendering**

```typescript
columns={taskColumns.filter(col =>
  visibleColumns.includes(col.id!)
)}
```

**❌ DON'T: Recreate columns on every render**

### 5. Type Safety

**✅ DO: Use strict typing**

```typescript
const taskColumns: ColumnDef<Task>[] = [...];
const myTasks = useTaskData<Task>({ ... });
```

**✅ DO: Type your hooks**

```typescript
export function useTaskData(props: UseTaskDataProps): UseTaskDataReturn {
  // ...
}
```

### 6. Error Handling

**✅ DO: Handle errors gracefully**

```typescript
<DataTable
  error={current.error?.message}
  emptyMessage="No tasks found"
/>
```

**✅ DO: Provide retry mechanisms**

```typescript
const { data, error, retry } = useTaskData({ ... });

if (error) {
  return <ErrorState onRetry={retry} />;
}
```

### 7. Loading States

**✅ DO: Show loading indicators**

```typescript
<DataTable loading={current.loading} />
```

**✅ DO: Debounce search input**

```typescript
const debouncedSearch = useDebounce(search, 300)
```

### 8. Accessibility

**✅ DO: Provide accessible labels**

```typescript
<DataDisplay
  searchPlaceholder="Search tasks by name, description, or assignee"
  data-testid="task-management"
>
```

**✅ DO: Support keyboard navigation**

- Tab through actions
- Enter to activate
- Arrow keys in dropdowns

### 9. Testing

**✅ DO: Add test IDs**

```typescript
<DataDisplay data-testid="task-list">
  <DataTable data-testid="task-table" />
</DataDisplay>
```

**✅ DO: Test user interactions**

```typescript
test('filters tasks by status', async () => {
  render(<TaskManagement {...props} />);

  // Open filter sheet
  await userEvent.click(screen.getByLabelText('Filters'));

  // Select filter
  await userEvent.click(screen.getByLabelText('Active'));

  // Apply
  await userEvent.click(screen.getByText('Apply Filters'));

  // Verify
  expect(screen.getByText('Status: Active')).toBeInTheDocument();
});
```

### 10. Documentation

**✅ DO: Document complex filters**

```typescript
/**
 * Task filter configuration
 *
 * Groups:
 * - Status: Filter by task status (pending, in_progress, completed)
 * - Priority: Filter by priority level (low, medium, high, urgent)
 * - Type: Filter by task type (call, email, meeting, todo)
 * - Date: Filter by creation date range
 */
export const taskFilterConfig: FilterConfiguration = {...};
```

---

## Migration Checklist

Use this checklist when migrating a view:

### Pre-Migration

- [ ] Identify all table features currently in use
- [ ] List all filters and their types
- [ ] Document current state management
- [ ] Note any custom behaviors

### Create New Structure

- [ ] Create data hook (`useXData`)
- [ ] Define column configuration
- [ ] Define filter configuration
- [ ] Define sortable columns list
- [ ] Create action handlers

### Implement DataDisplay

- [ ] Add DataDisplay wrapper
- [ ] Configure search
- [ ] Configure filters
- [ ] Configure sorting
- [ ] Configure column visibility
- [ ] Add bulk actions
- [ ] Add sections (if needed)

### Implement DataTable

- [ ] Replace Table with DataTable
- [ ] Add column definitions
- [ ] Enable features (pagination, sorting, selection)
- [ ] Add row actions
- [ ] Add row click handler
- [ ] Configure pagination options

### Testing

- [ ] Test search functionality
- [ ] Test each filter
- [ ] Test filter chips (click to edit, remove)
- [ ] Test sorting (each column)
- [ ] Test pagination (all controls)
- [ ] Test column visibility
- [ ] Test bulk actions
- [ ] Test row actions
- [ ] Test row selection
- [ ] Test loading state
- [ ] Test error state
- [ ] Test empty state

### Cleanup

- [ ] Remove old table component
- [ ] Remove manual pagination code
- [ ] Remove manual sorting logic
- [ ] Remove custom filter UI
- [ ] Update imports
- [ ] Run linter
- [ ] Update tests

### Documentation

- [ ] Update component documentation
- [ ] Add usage examples
- [ ] Document custom behaviors
- [ ] Update Storybook (if applicable)

---

## Troubleshooting

### Issue: Filters not showing as chips

**Solution:** Ensure filters are in the correct format:

```typescript
// Correct
filters={{ status: ['active', 'pending'], priority: ['high'] }}

// Wrong
filters={{ status: 'active', priority: 'high' }}  // Should be arrays
```

### Issue: Pagination not working

**Solution:** Ensure you're using controlled pagination:

```typescript
<DataTable
  pagination={current.pagination}
  onPaginationChange={current.setPagination}
  totalCount={current.total}  // ← Must provide total
  enablePagination
/>
```

### Issue: Sorting not updating

**Solution:** Check that sorting state is connected:

```typescript
// In hook
const [sorting, setSorting] = useState<SortingState>([]);

// In DataDisplay
sorting={current.sorting}
onSortingChange={current.setSorting}

// In DataTable
sorting={current.sorting}
onSortingChange={current.setSorting}
```

### Issue: Columns not filtering by visibility

**Solution:** Filter columns before passing to DataTable:

```typescript
<DataTable
  columns={allColumns.filter(col =>
    current.visibleColumns.includes(col.id!)
  )}
/>
```

### Issue: Filter sheet not opening

**Solution:** Ensure filterConfiguration is provided:

```typescript
<DataDisplay
  filterConfiguration={taskFilterConfig}  // ← Required
  filters={current.filters}
  onFilterChange={current.setFilters}
>
```

---

## Example: Complete Migration

Here's a complete before/after example:

### Before (350+ lines)

```tsx
// Old pattern - lots of manual code
export const AccountList: React.FC<Props> = ({
  accounts,
  isLoading,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onSort,
  sortField,
  sortOrder
}) => {
  const getSortIcon = (field: string) => {
    if (sortField !== field) return null
    return sortOrder?.startsWith('ASC') ? '↑' : '↓'
  }

  return (
    <div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => onSort('name')} className="cursor-pointer hover:bg-gray-50">
                  Account {getSortIcon('name')}
                </TableHead>
                <TableHead onClick={() => onSort('email')} className="cursor-pointer hover:bg-gray-50">
                  Contact {getSortIcon('email')}
                </TableHead>
                {/* More headers... */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map(account => (
                <TableRow
                  key={account.id}
                  onClick={() => handleRowClick(account.id)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{account.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  {/* More cells... */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Manual pagination - 30+ lines */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
              Previous
            </Button>
            <Button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage * pageSize >= totalCount}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

### After (80 lines)

```tsx
// New pattern - clean and maintainable
export const AccountView: React.FC<Props> = props => {
  const { accessToken } = props
  const accounts = useAccountData({ accessToken })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <p className="text-gray-600">Manage client accounts</p>
      </div>

      <AccountStatistics {...props} />

      <DataDisplay
        searchValue={accounts.search}
        searchPlaceholder="Search accounts..."
        onSearchChange={accounts.setSearch}
        filters={accounts.filters}
        filterConfiguration={accountFilterConfig}
        onFilterChange={accounts.setFilters}
        sorting={accounts.sorting}
        sortableColumns={accountSortableColumns}
        onSortingChange={accounts.setSorting}
        availableColumns={accountColumns.map(col => ({
          id: col.id!,
          label: col.header as string
        }))}
        visibleColumns={accounts.visibleColumns}
        onVisibleColumnsChange={accounts.setVisibleColumns}
        selectedCount={accounts.selectedRows.length}
        bulkActions={[
          { id: 'export', label: 'Export', onClick: handleExport },
          { id: 'delete', label: 'Delete', onClick: handleDelete }
        ]}
        onClearSelection={() => accounts.setSelectedRows([])}
      >
        <DataTable
          data={accounts.data}
          columns={accountColumns.filter(col => accounts.visibleColumns.includes(col.id!))}
          loading={accounts.loading}
          totalCount={accounts.total}
          sorting={accounts.sorting}
          onSortingChange={accounts.setSorting}
          pagination={accounts.pagination}
          onPaginationChange={accounts.setPagination}
          selectedRows={accounts.selectedRows}
          onSelectionChange={accounts.setSelectedRows}
          enablePagination
          enableSorting
          enableSelection
          enableColumnPinning
          actions={[
            { label: 'View', onClick: acc => navigateTo(`/accounts/${acc.id}`) },
            { label: 'Edit', onClick: acc => handleEdit(acc) }
          ]}
          onRowClick={acc => navigateTo(`/accounts/${acc.id}`)}
        />
      </DataDisplay>
    </div>
  )
}
```

**Result:**

- 270 fewer lines of code
- All features preserved
- Additional features added (filters, column visibility, bulk actions)
- Consistent UI
- Easier to maintain

---

## Summary

The Data Display pattern provides:

1. **Unified Architecture**: DataDisplay + DataToolbar + FilterSheet + DataTable
2. **70% Code Reduction**: From 300+ lines to ~100 lines per view
3. **Feature Complete**: Search, filters, sorting, pagination, selection, bulk actions, column visibility
4. **Type Safe**: Full TypeScript support
5. **Accessible**: WCAG compliant
6. **Maintainable**: Changes in one place affect all tables
7. **Consistent**: Same UI across all data views
8. **Tested**: Built-in test coverage

**Next Steps:**

1. Create your first data hook
2. Define column and filter configurations
3. Replace one existing view
4. Verify all functionality
5. Migrate remaining views
6. Remove old code
7. Celebrate! 🎉
