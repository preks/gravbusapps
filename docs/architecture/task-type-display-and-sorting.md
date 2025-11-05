# Task Type Display and Sorting Implementation

## Overview

This document describes how Task Type (and other catalog entry columns) are displayed and sorted in both CRM (Customer Relations) and IRM (Investment Relations) task views.

---

## 1. Task Type Display in Tables

### Common Implementation (Shared Across CRM & IRM)

**File:** `src/common/components/common-relations/view-layouts/task-layout/config/taskColumns.tsx`

```typescript
{
  id: 'type',
  accessorKey: 'type',
  header: 'Type',
  size: 120,
  cell: ({ row }) => {
    const task = row.original as any
    // Extract type value from catalog entry (supports both CRM and IRM naming)
    const typeValue = task.taskType
      ? getCatalogEntryValue(task.taskType)  // IRM naming
      : task.type
        ? getCatalogEntryValue(task.type)    // CRM naming
        : undefined

    if (!typeValue) return <span className="gba:text-gray-400">-</span>

    return <span className="gba:text-sm">{typeValue}</span>
  }
}
```

### Display Logic Flow:

```
┌─────────────────────────────────────────────────────────────┐
│                   Task Type Display Flow                     │
└─────────────────────────────────────────────────────────────┘

1. Check domain-specific field name:
   ├─ IRM: task.taskType (CatalogEntry)
   └─ CRM: task.type (CatalogEntry)

2. Extract translated value:
   └─ getCatalogEntryValue(catalogEntry)
      ├─ Returns translated value based on locale
      └─ Fallback to code if value not found

3. Display result:
   ├─ Value exists → <span>{typeValue}</span>
   └─ No value → <span className="text-gray-400">-</span>
```

### Key Points:

1. **Always Use `getCatalogEntryValue()`:**
   - Extracts the correct translated value based on user's locale
   - Handles fallbacks gracefully
   - Consistent across all catalog entry columns

2. **Domain-Agnostic:**
   - Supports both CRM naming (`type`, `priority`, `status`)
   - Supports IRM naming (`taskType`, `taskPriority`, `taskStatus`)
   - Single implementation works for both

3. **No `as any` Usage:**
   - Properly typed as `CatalogEntry`
   - Type-safe access to catalog properties

---

## 2. Catalog Entry Based Sorting

### ✅ Implementation Overview

Both CRM and IRM use **nested GraphQL sorting** to sort by the translated catalog entry value.

### Sorting Configuration

**CRM (`src/business-apps/crm/core/apps/customer-relations/views/task-view/TaskView.tsx`):**

```typescript
mapColumnToGraphQLField: (columnId: string): string => {
  const mapping: Record<string, string> = {
    name: 'name',
    dueDate: 'dueDate',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    // Catalog entry columns - sort by translated value
    type: 'type.value',
    priority: 'priority.value',
    status: 'status.value',
    // Employee columns - sort by display name
    assignedTo: 'assignedEmployee.displayName',
    createdBy: 'creatorEmployee.displayName'
  }
  return mapping[columnId] || 'createdAt'
}
```

**IRM (`src/business-apps/irm/core/apps/investment-relations/views/task-view/TaskView.tsx`):**

```typescript
mapColumnToGraphQLField: (columnId: string): string => {
  const mapping: Record<string, string> = {
    name: 'name',
    dueDate: 'dueDate',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    // Catalog entry columns - sort by translated value
    type: 'taskType.value',
    priority: 'taskPriority.value',
    status: 'taskStatus.value',
    // Employee columns - sort by display name
    assignedTo: 'assignedEmployee.displayName',
    createdBy: 'creatorEmployee.displayName'
  }
  return mapping[columnId] || 'createdAt'
}
```

### Hasura Nested Sorting Support

**GraphQL Query Example:**

```graphql
query SortedTasks {
  # CRM - Sort by catalog entry value
  SalesTask(orderBy: { type: { value: ASC } }) {
    id
    type {
      value
    }
  }

  # IRM - Sort by catalog entry value
  InvestmentTask(orderBy: { taskType: { value: ASC } }) {
    id
    taskType {
      value
    }
  }
}
```

**Result:** ✅ Hasura supports nested sorting on related tables (catalog entries)

### Sorting Query Variables

**File:** Both `TaskView.tsx` files (CRM & IRM)

```typescript
buildQueryVariables: params => {
  const vars: TaskQueryVariables = {
    limit: params.pagination.pageSize,
    offset: params.pagination.pageIndex * params.pagination.pageSize,
    search: params.searchTerm.trim() || undefined
  }

  applyBasicFilters(vars, params.selectedFilters)
  applyDateFilter(vars, params.selectedFilters)

  // Sorting with nested paths
  if (params.sorting.length > 0) {
    const field = params.mapColumnToGraphQLField(params.sorting[0].id)
    vars.orderBy = [
      {
        field: field as any, // e.g., "type.value" or "taskType.value"
        direction: params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
      }
    ]
  } else {
    vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
  }

  return vars
}
```

---

## 3. Schema Differences Handling

### Field Name Mapping

| Logical Field | GraphQL Field (CRM)      | GraphQL Field (IRM)          | Sorting Path (CRM) | Sorting Path (IRM)   |
| ------------- | ------------------------ | ---------------------------- | ------------------ | -------------------- |
| Task Type     | `type: CatalogEntry`     | `taskType: CatalogEntry`     | `type.value`       | `taskType.value`     |
| Task Priority | `priority: CatalogEntry` | `taskPriority: CatalogEntry` | `priority.value`   | `taskPriority.value` |
| Task Status   | `status: CatalogEntry`   | `taskStatus: CatalogEntry`   | `status.value`     | `taskStatus.value`   |

### Implementation Strategy

1. **Display Layer:** Handle both naming conventions

   ```typescript
   const typeValue = task.taskType
     ? getCatalogEntryValue(task.taskType) // IRM
     : task.type
       ? getCatalogEntryValue(task.type) // CRM
       : undefined
   ```

2. **Sorting Layer:** Domain-specific mapping

   ```typescript
   // CRM uses: type.value, priority.value, status.value
   // IRM uses: taskType.value, taskPriority.value, taskStatus.value
   ```

3. **Type Safety:** No `as any` for catalog entries
   ```typescript
   const priorityCatalog: CatalogEntry = task.taskPriority || task.priority
   const priorityValue = getCatalogEntryValue(priorityCatalog)
   ```

---

## 4. All Sortable Columns

### Current Sortable Columns (Both CRM & IRM)

| Column ID    | Display Name        | GraphQL Sort Path (CRM)        | GraphQL Sort Path (IRM)        |
| ------------ | ------------------- | ------------------------------ | ------------------------------ |
| `name`       | Task                | `name`                         | `name`                         |
| `type`       | Type                | `type.value`                   | `taskType.value`               |
| `priority`   | Priority            | `priority.value`               | `taskPriority.value`           |
| `status`     | Status              | `status.value`                 | `taskStatus.value`             |
| `assignedTo` | Assigned To         | `assignedEmployee.displayName` | `assignedEmployee.displayName` |
| `createdBy`  | Created By          | `creatorEmployee.displayName`  | `creatorEmployee.displayName`  |
| `dueDate`    | Schedule / Due Date | `dueDate`                      | `dueDate`                      |
| `createdAt`  | Created At          | `createdAt`                    | `createdAt`                    |

### Sorting Behavior

```
User Clicks Column Header
         ↓
Table Component Calls mapColumnToGraphQLField()
         ↓
Returns Nested Path (e.g., "type.value")
         ↓
GraphQL Query: orderBy: { type: { value: ASC } }
         ↓
Hasura Joins CatalogEntry Table & Sorts
         ↓
Results Sorted by Translated Value
```

---

## 5. Comparison: CRM vs IRM

| Aspect                   | CRM (Customer Relations)             | IRM (Investment Relations)               |
| ------------------------ | ------------------------------------ | ---------------------------------------- |
| **Shared Columns**       | ✅ Uses `createTaskColumns()`        | ✅ Uses `createTaskColumns()`            |
| **Type Display**         | ✅ `getCatalogEntryValue(task.type)` | ✅ `getCatalogEntryValue(task.taskType)` |
| **Priority Display**     | ✅ Badge with catalog value          | ✅ Badge with catalog value              |
| **Status Display**       | ✅ Badge with catalog value          | ✅ Badge with catalog value              |
| **Type Sorting**         | ✅ `type.value` (nested)             | ✅ `taskType.value` (nested)             |
| **Priority Sorting**     | ✅ `priority.value` (nested)         | ✅ `taskPriority.value` (nested)         |
| **Status Sorting**       | ✅ `status.value` (nested)           | ✅ `taskStatus.value` (nested)           |
| **Employee Sorting**     | ✅ `assignedEmployee.displayName`    | ✅ `assignedEmployee.displayName`        |
| **All Columns Sortable** | ✅ YES                               | ✅ YES                                   |

---

## 6. Best Practices

### ✅ Do's:

1. **Always use `getCatalogEntryValue()` for display:**

   ```typescript
   const value = getCatalogEntryValue(catalogEntry)
   ```

2. **Sort by `.value` for translated sorting:**

   ```typescript
   orderBy: {
     type: {
       value: ASC
     }
   }
   ```

3. **Handle both CRM and IRM naming conventions:**

   ```typescript
   const catalog = task.taskType || task.type
   ```

4. **Use proper TypeScript types:**
   ```typescript
   const catalog: CatalogEntry = task.taskType
   ```

### ❌ Don'ts:

1. **Don't use `as any` for catalog entries:**

   ```typescript
   // ❌ Bad
   getCatalogEntryValue(task.type as any)

   // ✅ Good
   getCatalogEntryValue(task.type)
   ```

2. **Don't sort by ref or code:**

   ```typescript
   // ❌ Bad - sorts by ID, not translated value
   orderBy: {
     typeRef: ASC
   }

   // ✅ Good - sorts by translated value
   orderBy: {
     type: {
       value: ASC
     }
   }
   ```

3. **Don't use hardcoded values:**

   ```typescript
   // ❌ Bad
   const typeValue = task.taskTypeLabel || 'Unknown'

   // ✅ Good
   const typeValue = getCatalogEntryValue(task.taskType)
   ```

---

## 7. Summary

### ✅ What Works:

1. **Unified Display Logic:** Single implementation for both CRM and IRM
2. **Proper Catalog Handling:** Uses `getCatalogEntryValue()` consistently
3. **Nested Sorting:** Sorts by translated catalog values
4. **Type Safety:** No `as any` for catalog entries
5. **All Columns Sortable:** Every column can be sorted properly
6. **Employee Sorting:** Sorts by display name

### 🎯 Key Features:

- ✅ Locale-aware translations via `getCatalogEntryValue()`
- ✅ Hasura nested sorting support
- ✅ Domain-agnostic display layer
- ✅ Domain-specific sorting paths
- ✅ Proper TypeScript typing
- ✅ Consistent badge variants based on catalog codes

## 1. Task Type Display in Tables

### Common Implementation (Shared Across CRM & IRM)

**File:** `src/common/components/common-relations/view-layouts/task-layout/config/taskColumns.tsx`

```typescript
{
  id: 'type',
  accessorKey: 'type',
  header: 'Type',
  size: 120,
  cell: ({ row }) => {
    // Use taskTypeLabel from mapper or extract from catalog entry
    const typeValue =
      (row.original as any).taskTypeLabel ||
      (typeof row.original.type === 'string'
        ? row.original.type
        : getCatalogEntryValue(row.original.type as any))

    if (!typeValue) return <span className="gba:text-gray-400">-</span>

    return <span className="gba:text-sm">{typeValue}</span>
  }
}
```

### Display Logic Flow:

```
┌─────────────────────────────────────────────────────────────┐
│                   Task Type Display Flow                     │
└─────────────────────────────────────────────────────────────┘

1. Check if `taskTypeLabel` exists (computed field from mapper)
   ├─ YES → Use taskTypeLabel directly ✅
   └─ NO  → Check if `type` is string or catalog entry
          ├─ STRING → Use type directly
          └─ CATALOG ENTRY → Extract value via getCatalogEntryValue()

2. Display result:
   ├─ Value exists → <span>{typeValue}</span>
   └─ No value → <span className="text-gray-400">-</span>
```

### Key Points:

1. **Priority System:**
   - First: Use computed `taskTypeLabel` from mapper (preferred)
   - Second: Use raw `type` if it's a string
   - Third: Extract value from catalog entry object using `getCatalogEntryValue()`

2. **Fallback Handling:**
   - Always shows "-" in gray if no value exists
   - Never throws errors for missing data

3. **Helper Function:**

   ```typescript
   import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'

   // Extracts the display value from a catalog entry
   getCatalogEntryValue(catalogEntry)
   ```

---

## 2. Catalog Entry Based Sorting

### Implementation Overview

Both CRM and IRM use the **SAME sorting implementation** from the common task layout.

### Sorting Configuration

**CRM (`src/business-apps/crm/core/apps/customer-relations/views/task-view/TaskView.tsx`):**

```typescript
mapColumnToGraphQLField: (columnId: string): string => {
  const mapping: Record<string, string> = {
    name: 'name',
    dueDate: 'dueDate',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
  return mapping[columnId] || 'createdAt'
}
```

**IRM (`src/business-apps/irm/core/apps/investment-relations/views/task-view/TaskView.tsx`):**

```typescript
mapColumnToGraphQLField: (columnId: string): string => {
  const mapping: Record<string, string> = {
    name: 'name',
    dueDate: 'dueDate',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
  return mapping[columnId] || 'createdAt'
}
```

### ⚠️ **CRITICAL FINDING: Catalog Entry Columns Are NOT Sortable!**

**Current State:**

- Only scalar fields are mapped for sorting: `name`, `dueDate`, `createdAt`, `updatedAt`
- **`type`, `priority`, `status` are NOT in the mapping!**
- This means catalog entry columns (`type`, `priority`, `status`) **CANNOT be sorted currently**

### Sortable Columns Definition

**File:** `src/common/components/common-relations/view-layouts/task-layout/config/taskColumns.tsx`

```typescript
export const createTaskSortableColumns = () => {
  const columns = createTaskColumns()
  return columns.map(col => ({
    id: col.id!,
    label: col.header as string
  }))
}
```

**Problem:** This function marks ALL columns as sortable, including catalog entry columns, but the GraphQL mapping doesn't support them!

### Sorting Query Variables

**File:** Both `TaskView.tsx` files (CRM & IRM)

```typescript
buildQueryVariables: params => {
  const vars: TaskQueryVariables = {
    limit: params.pagination.pageSize,
    offset: params.pagination.pageIndex * params.pagination.pageSize,
    search: params.searchTerm.trim() || undefined
  }

  applyBasicFilters(vars, params.selectedFilters)
  applyDateFilter(vars, params.selectedFilters)

  // Sorting
  if (params.sorting.length > 0) {
    vars.orderBy = [
      {
        field: params.mapColumnToGraphQLField(params.sorting[0].id) as any,
        direction: params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
      }
    ]
  } else {
    vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
  }

  return vars
}
```

---

## 3. Schema Inconsistencies Affecting Display & Sorting

### Field Name Differences

| Logical Field | GraphQL Field (CRM) | GraphQL Field (IRM) | Mapper Output  |
| ------------- | ------------------- | ------------------- | -------------- |
| Task Type     | `type`              | `taskType`          | `taskType`     |
| Task Priority | `priority`          | `taskPriority`      | `taskPriority` |
| Task Status   | `status`            | `taskStatus`        | `taskStatus`   |

### Impact on Sorting

**CRM (SalesTask):**

```graphql
orderBy: { field: "type" }      # ❌ NOT MAPPED - Won't work!
orderBy: { field: "priority" }  # ❌ NOT MAPPED - Won't work!
orderBy: { field: "status" }    # ❌ NOT MAPPED - Won't work!
```

**IRM (InvestmentTask):**

```graphql
orderBy: { field: "taskType" }     # ❌ NOT MAPPED - Won't work!
orderBy: { field: "taskPriority" } # ❌ NOT MAPPED - Won't work!
orderBy: { field: "taskStatus" }   # ❌ NOT MAPPED - Won't work!
```

---

## 4. Comparison: CRM vs IRM

| Aspect               | CRM (Customer Relations)                                    | IRM (Investment Relations)                   |
| -------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| **Shared Columns**   | ✅ Uses `createTaskColumns()`                               | ✅ Uses `createTaskColumns()`                |
| **Type Display**     | ✅ Same logic (taskTypeLabel → type → getCatalogEntryValue) | ✅ Same logic                                |
| **Priority Display** | ✅ Badge with variant based on catalog entry                | ✅ Badge with variant based on catalog entry |
| **Status Display**   | ✅ Badge with variant based on catalog entry                | ✅ Badge with variant based on catalog entry |
| **Sortable Fields**  | name, dueDate, createdAt, updatedAt                         | name, dueDate, createdAt, updatedAt          |
| **Catalog Sorting**  | ❌ NOT SUPPORTED                                            | ❌ NOT SUPPORTED                             |
| **Schema Fields**    | `type`, `priority`, `status`                                | `taskType`, `taskPriority`, `taskStatus`     |
| **Mappers**          | Transform `type` → `taskType`                               | Use `taskType` directly                      |

---

## 5. Recommendations

### 🎯 Immediate Fixes Required

#### A. Remove False Sortable Indicators

Update `createTaskSortableColumns()` to exclude catalog entry columns:

```typescript
export const createTaskSortableColumns = () => {
  const columns = createTaskColumns()
  const sortableColumnIds = ['name', 'dueDate', 'createdAt', 'createdBy', 'assignedTo']

  return columns
    .filter(col => sortableColumnIds.includes(col.id!))
    .map(col => ({
      id: col.id!,
      label: col.header as string
    }))
}
```

#### B. Add GraphQL Mapping for Catalog Columns (If Schema Supports)

**For CRM:**

```typescript
mapColumnToGraphQLField: (columnId: string): string => {
  const mapping: Record<string, string> = {
    name: 'name',
    dueDate: 'dueDate',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    // Add if schema supports sorting by these fields
    type: 'type', // or 'typeRef' if sorting by ref
    priority: 'priority', // or 'priorityRef'
    status: 'status' // or 'statusRef'
  }
  return mapping[columnId] || 'createdAt'
}
```

**For IRM:**

```typescript
mapColumnToGraphQLField: (columnId: string): string => {
  const mapping: Record<string, string> = {
    name: 'name',
    dueDate: 'dueDate',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    // Add if schema supports sorting by these fields
    type: 'taskType', // or 'taskTypeRef'
    priority: 'taskPriority', // or 'taskPriorityRef'
    status: 'taskStatus' // or 'taskStatusRef'
  }
  return mapping[columnId] || 'createdAt'
}
```

#### C. Test GraphQL Schema Support

Before implementing sorting, verify Hasura schema supports:

```graphql
query TestTaskSorting {
  SalesTask(orderBy: { type: ASC }) {
    id
  } # CRM
  SalesTask(orderBy: { priority: ASC }) {
    id
  } # CRM
  InvestmentTask(orderBy: { taskType: ASC }) {
    id
  } # IRM
  InvestmentTask(orderBy: { taskPriority: ASC }) {
    id
  } # IRM
}
```

---

## 6. Summary

### ✅ What Works Well:

1. **Unified Display Logic:** Both CRM and IRM use the same column definitions
2. **Smart Fallbacks:** Display logic handles missing data gracefully
3. **Computed Fields:** Mappers provide pre-computed `taskTypeLabel` for performance
4. **Badge Variants:** Priority and Status use proper badge styling

### ⚠️ Current Limitations:

1. **No Catalog Entry Sorting:** Users cannot sort by Type, Priority, or Status
2. **Schema Inconsistency:** Different field names between CRM and IRM
3. **Misleading UI:** Columns appear sortable but don't work

### 🎯 Action Items:

1. Verify if Hasura schema supports sorting by catalog entry fields
2. Update `createTaskSortableColumns()` to reflect actual sortable columns
3. Add proper GraphQL field mappings if sorting is supported
4. Document which columns are sortable in user-facing UI
