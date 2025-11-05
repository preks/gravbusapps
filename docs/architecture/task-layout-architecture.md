# Task Layout Architecture

## Overview

The Task Layout system provides a **generic, reusable foundation** for task management views across different business domains (CRM, IRM). It follows a **three-layer architecture** with clear separation of concerns and domain-specific customization capabilities.

---

## Architecture Layers

### Layer 1: Common Task Layout (Generic Foundation)

**Location:** `src/common/components/common-relations/view-layouts/task-layout/`

**Purpose:** Provides domain-agnostic task management infrastructure

**Key Components:**

#### 1.1 TaskLayout Component

```typescript
TaskLayout<TTask extends CommonTask, TQueryVariables>
```

**Responsibilities:**

- Generic task list rendering (My Tasks / Team Tasks tabs)
- State management (pagination, sorting, filtering, search)
- Process completion event handling
- Column visibility management
- Statistics integration

**Type Safety:**

- Generic `TTask` must extend `CommonTask`
- Enforces type safety throughout the component tree

#### 1.2 Default Task Columns (`taskColumns.tsx`)

**Based on:** `CommonTask` interface

**Columns provided:**

- `name` - Task name
- `assignedTo` - Assigned employee (clickable, navigates to employee profile)
- `type` - Task type (catalog entry with translation)
- `priority` - Task priority (catalog entry with translation)
- `status` - Task status (catalog entry with translation)
- `reference` - Related entity reference (computed field from mappers)
- `dueDate` - Due/Scheduled date with timing icon
- `createdBy` - Creator employee (clickable, navigates to employee profile)
- `createdAt` - Creation date

**Key Features:**

- Uses `getCatalogEntryValue()` for translated catalog values
- Employee fields are clickable with hover outline effect
- All catalog fields use translated `.value` for display
- Timing type icons (Deadline vs Scheduled)

#### 1.3 Default Column Mapping

```typescript
export const defaultTaskColumnMapping: Record<string, string> = {
  // Scalar fields
  name: 'name',
  dueDate: 'dueDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',

  // Catalog fields (sorted by translated value)
  type: 'taskType.value',
  priority: 'taskPriority.value',
  status: 'taskStatus.value',

  // Employee fields (sorted by displayName)
  assignedTo: 'assignedEmployee.displayName',
  createdBy: 'creatorEmployee.displayName'
}
```

**Creates GraphQL sort paths for:**

- Translated catalog values (`.value` field)
- Employee display names (`.displayName` field)
- Direct scalar fields

#### 1.4 Column Mapping Factory

```typescript
createTaskColumnToGraphQLMapping(overrides?: Record<string, string>)
```

**Purpose:** Create domain-specific column mappings with complete override capability

**Usage:**

```typescript
// No overrides (IRM - uses CommonTask naming)
mapColumnToGraphQLField: createTaskColumnToGraphQLMapping()

// With overrides (CRM - uses different field names)
mapColumnToGraphQLField: createTaskColumnToGraphQLMapping({
  type: 'type.value', // CRM uses 'type' instead of 'taskType'
  priority: 'priority.value', // CRM uses 'priority' instead of 'taskPriority'
  status: 'status.value' // CRM uses 'status' instead of 'taskStatus'
})

// Can override ANY column
mapColumnToGraphQLField: createTaskColumnToGraphQLMapping({
  myCustomColumn: 'some.nested.graphql.path',
  assignedTo: 'myCustomEmployeeField.customName'
})
```

#### 1.5 Filter System

**Default Filter Configuration** (`taskFilters.ts`):

- Status filter (multi-select)
- Priority filter (multi-select)
- Type filter (multi-select)
- Created Date Range (date range picker)
- Due Date Range (date range picker)
- Reference Type filter (multi-select)

**Generic Filter Applier:**

```typescript
createTaskFilterApplier(customMappings?: Record<string, (vars: any, value: any) => void>)
```

**Default Mappings:**

- `status` → `taskStatusIds`
- `priority` → `taskPriorityIds`
- `type` → `taskTypeIds`
- `referenceType` → `referenceTypes`
- `createdDateRange` → `createdAfter`, `createdBefore`
- `dueDateRange` → `dueDateAfter`, `dueDateBefore`

**Extensibility:**

```typescript
// Use default filters
applyTaskFilters(vars, selectedFilters)

// Extend with custom filters
const customFilterApplier = createTaskFilterApplier({
  myCustomFilter: (vars, value) => {
    vars.customField = value
  },
  // Override default filter
  status: (vars, value) => {
    vars.myCustomStatusField = value
  }
})

customFilterApplier(vars, selectedFilters)
```

---

### Layer 2: Domain-Specific Task Types

**Location:**

- `src/common/data/customer/types/customerTaskTypes.ts` (CRM)
- `src/common/data/investment/types/investmentTaskTypes.ts` (IRM)

**Type Hierarchy:**

```
CommonTask (Common)
    ↓ extends
CustomerTask (CRM) / InvestmentTask (IRM)
```

**CustomerTask (CRM):**

- Extends `CommonTask`
- Adds CRM-specific fields: `comment`, `salesCampaignId`
- Raw GraphQL fields: `type`, `priority`, `status` (instead of `taskType`, etc.)
- Mapper transforms CRM naming to CommonTask naming

**InvestmentTask (IRM):**

- Extends `CommonTask`
- Adds IRM-specific fields: `investment`, `source`
- Uses CommonTask naming directly: `taskType`, `taskPriority`, `taskStatus`
- No field name mapping needed

---

### Layer 3: Domain-Specific Task Views

**Location:**

- `src/business-apps/crm/core/apps/customer-relations/views/task-view/TaskView.tsx`
- `src/business-apps/irm/core/apps/investment-relations/views/task-view/TaskView.tsx`

**Purpose:** Configure and customize TaskLayout for specific business domain

**Responsibilities:**

#### 3.1 Type Safety

```typescript
// CRM
const config: TaskViewConfig<CustomerTask, CustomerTaskQueryVariables>

// IRM
const config: TaskViewConfig<InvestmentTask, InvestmentTaskQueryVariables>
```

#### 3.2 Data Fetching

```typescript
fetchMyTasks: async variables => {
  const employeeId = context.userInfo?.employeeDetails?.employeeId
  const result = await fetchCustomerTasks({
    ...variables,
    assignedEmployeeIds: employeeId ? [employeeId] : []
  })
  return { tasks: result.tasks, total: result.total }
}
```

Views decide:

- Which hook to use (`useCustomerTasks` vs `useInvestmentTasks`)
- How to filter for "My Tasks" (by employeeId)
- How to transform hook results

#### 3.3 Column Selection & Customization

```typescript
// Option 1: Use default columns as-is
createColumns: () => createTaskColumns() as any

// Option 2: Filter columns
createColumns: () => {
  const defaults = createTaskColumns()
  return defaults.filter(col => col.id !== 'unwantedColumn') as any
}

// Option 3: Add custom columns
createColumns: () => {
  const defaults = createTaskColumns()
  return [
    ...defaults,
    {
      id: 'customColumn',
      header: 'Custom',
      cell: ({ row }) => row.original.domainSpecificField
    }
  ] as any
}

// Option 4: Completely custom columns
createColumns: () => myFullyCustomColumns()
```

#### 3.4 Column Mapping (GraphQL Sorting)

```typescript
// CRM: Override for different field names
mapColumnToGraphQLField: createTaskColumnToGraphQLMapping({
  type: 'type.value', // CRM uses 'type' not 'taskType'
  priority: 'priority.value',
  status: 'status.value'
})

// IRM: Use defaults (matches CommonTask naming)
mapColumnToGraphQLField: createTaskColumnToGraphQLMapping()

// Custom: Override any field
mapColumnToGraphQLField: createTaskColumnToGraphQLMapping({
  myColumn: 'my.nested.graphql.path',
  assignedTo: 'customEmployeeField.name'
})
```

#### 3.5 Filter Customization

```typescript
// Use default filter config
baseFilterConfig: taskFilterConfig

// Extend with custom filters (future)
baseFilterConfig: extendTaskFilterConfig([
  {
    id: 'custom-group',
    label: 'Custom Filters',
    filters: [
      {
        /* custom filter */
      }
    ]
  }
])
```

#### 3.6 Reference URL Building (Domain-Specific)

```typescript
// CRM URLs
const buildReferenceUrl = (reference: TaskReference): string => {
  switch (reference.type) {
    case 'lead':
      return buildPlatformUrl('/platform/crm/lead-record', { leadId: reference.id })
    // ... other CRM routes
  }
}

// IRM URLs
const buildReferenceUrl = (reference: TaskReference): string => {
  switch (reference.type) {
    case 'lead':
      return buildPlatformUrl('/platform/irm/lead-record', { leadId: reference.id })
    case 'investment':
      return buildPlatformUrl('/platform/irm/investment-record', { investmentId: reference.id })
    // ... other IRM routes
  }
}
```

**Key Principle:** Common layouts know NOTHING about CRM/IRM URLs!

---

## Type Safety Flow

```
1. CommonTask (Common Relations)
   ↓ extends
2. CustomerTask / InvestmentTask (Domain Types)
   ↓ used in
3. TaskViewConfig<CustomerTask> / TaskViewConfig<InvestmentTask> (View Config)
   ↓ passed to
4. TaskLayout<CustomerTask> / TaskLayout<InvestmentTask> (Generic Layout)
```

**Benefits:**

- Compile-time type checking
- IntelliSense support for domain-specific fields
- Prevents accidental cross-domain data usage
- Clear separation between common and domain-specific logic

**Computed Fields:**

- `reference` - Computed by domain-specific mappers (`toCustomerTask`, `toInvestmentTask`)
- Added to `CommonTask` as `reference?: any` for column compatibility
- Domain mappers build reference from `opportunity`, `account`, `lead`, `contact`, or `investment`

---

## Customization Points

### ✅ Views CAN customize:

1. **Columns:**
   - Select which default columns to show
   - Add domain-specific columns
   - Completely override column definitions

2. **Column Mapping (Sorting):**
   - Override any column's GraphQL path
   - Support different field naming schemas (CRM vs IRM)
   - Add custom sorting paths

3. **Filters:**
   - Use default filter config
   - Extend with custom filters (future)
   - Override filter behavior via custom applier

4. **Data Fetching:**
   - Complete control over hooks
   - Domain-specific query variables
   - Transform data as needed

5. **URLs & Navigation:**
   - Full control over reference URLs
   - Domain-specific routing logic

### ❌ Common Layout does NOT know about:

- Specific business domains (CRM/IRM/etc.)
- Domain-specific URLs or routes
- Domain-specific business logic
- GraphQL schema differences between domains

---

## Key Design Principles

### 1. Inversion of Control

- Layout provides structure
- Views provide behavior and data

### 2. Override-First Configuration

- Default configurations can be completely overridden
- No hardcoded assumptions about domain

### 3. Type Safety Without Coupling

- Generic types enforce structure
- Concrete types provide domain safety
- No cross-domain type pollution

### 4. Catalog Translation Support

- All catalog fields use `getCatalogEntryValue()` for display
- Sorting by translated `.value` field
- Consistent internationalization

### 5. Separation of Concerns

- Common code knows only about `CommonTask`
- Views know about domain-specific types
- No circular dependencies or cross-domain imports

---

## Example: Adding a Custom Column

**Scenario:** IRM wants to add an "Investment" column

```typescript
// src/business-apps/irm/core/apps/investment-relations/views/task-view/TaskView.tsx

createColumns: () => {
  const defaultColumns = createTaskColumns()

  // Add Investment column
  const investmentColumn: ColumnDef<InvestmentTask> = {
    id: 'investment',
    accessorFn: row => row.investment?.name || '-',
    header: 'Investment',
    size: 180,
    cell: ({ row }) => {
      if (!row.original.investment) {
        return <span className="gba:text-gray-400">-</span>
      }
      return (
        <span className="gba:text-sm gba:truncate">
          {row.original.investment.name}
        </span>
      )
    }
  }

  return [
    ...defaultColumns.slice(0, 2), // name, assignedTo
    investmentColumn,               // Custom column
    ...defaultColumns.slice(2)      // rest of columns
  ] as any
},

// Add sorting support
mapColumnToGraphQLField: createTaskColumnToGraphQLMapping({
  investment: 'investment.name'
})
```

---

## Migration Notes

### Before (Old Architecture)

- Duplicated column definitions in each view
- Inconsistent catalog value handling
- Type safety issues (`Task` interface didn't match domains)
- Separate `applyBasicFilters` and `applyDateFilter` functions

### After (New Architecture)

- ✅ Single source of truth for columns (`CommonTask`-based)
- ✅ Consistent catalog translation via `getCatalogEntryValue()`
- ✅ Type-safe: `CustomerTask` and `InvestmentTask` extend `CommonTask`
- ✅ Unified filter system: `applyTaskFilters()`
- ✅ Override system for domain-specific customizations

---

## Code Reduction

### Per TaskView:

- **Before:** ~167-176 lines
- **After:** ~145-155 lines
- **Reduction:** ~22-30 lines per view

### Eliminated Duplication:

- Column definitions (shared via `createTaskColumns()`)
- Column mapping boilerplate (shared via `createTaskColumnToGraphQLMapping()`)
- Filter application logic (unified `applyTaskFilters()`)
- Catalog value extraction (consistent `getCatalogEntryValue()` usage)

---

## Future Extensibility

### Planned Enhancements:

1. **Filter Extension API:**

```typescript
baseFilterConfig: extendTaskFilterConfig([
  {
    id: 'investment-filters',
    label: 'Investment Filters',
    filters: [{ id: 'investmentType', label: 'Type', type: 'multi-select' }]
  }
])
```

2. **Custom Statistics Layouts:**
   Views can provide custom statistics components via config

3. **Custom Row Actions:**
   Already supported via `renderRowActions` config property

4. **Bulk Actions:**
   Can be added to config interface without breaking existing views

---

## Related Files

### Common Layer:

- `src/common/components/common-relations/view-layouts/task-layout/TaskLayout.tsx`
- `src/common/components/common-relations/view-layouts/task-layout/config/taskColumns.tsx`
- `src/common/components/common-relations/view-layouts/task-layout/config/taskFilters.ts`
- `src/common/components/common-relations/view-layouts/task-layout/utils/queryHelpers.ts`
- `src/common/data/relations/types/commonTaskTypes.ts`

### Domain Layer:

- `src/common/data/customer/types/customerTaskTypes.ts`
- `src/common/data/investment/types/investmentTaskTypes.ts`
- `src/common/data/customer/mappers/customerTaskMappers.ts`
- `src/common/data/investment/mappers/investmentTaskMappers.ts`

### View Layer:

- `src/business-apps/crm/core/apps/customer-relations/views/task-view/TaskView.tsx`
- `src/business-apps/irm/core/apps/investment-relations/views/task-view/TaskView.tsx`

---

## Best Practices

### DO:

✅ Use `CommonTask` for all common layout components
✅ Use `CustomerTask`/`InvestmentTask` in views for type safety
✅ Use `getCatalogEntryValue()` for catalog field display
✅ Sort by translated values (`.value`) for catalog fields
✅ Override column mappings when domain uses different field names
✅ Keep reference URL logic in views (domain-specific)

### DON'T:

❌ Add domain-specific logic to common layouts
❌ Hardcode CRM/IRM URLs in common components
❌ Access catalog values directly without translation utils
❌ Use `as any` casting except for mapper transforms
❌ Duplicate column definitions across views
❌ Create separate filter functions for each filter type

---

**Last Updated:** 2025-01-04
**Author:** AI Agent (Task Layout Refactoring)
