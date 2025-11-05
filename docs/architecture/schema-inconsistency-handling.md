# Schema Inconsistency Handling Pattern

## Overview

This document describes the pattern we use to handle schema inconsistencies between **Customer Relations (CRM)** and **Investment Relations** domains. These inconsistencies exist due to legacy naming conventions in the CRM schema that haven't been migrated to the newer standardized naming conventions used in Investment Relations.

## Problem

Different domains use different field names for the same logical concept:

| Logical Field | Investment Relations              | Customer Relations (CRM)       | Status          |
| ------------- | --------------------------------- | ------------------------------ | --------------- |
| Task Timing   | `taskTiming`                      | `timingType`                   | ⚠️ Inconsistent |
| Task Type     | `taskType`, `taskTypeRef`         | `type`, `typeRef`              | ⚠️ Inconsistent |
| Task Priority | `taskPriority`, `taskPriorityRef` | `priority`, `priorityRef`      | ⚠️ Inconsistent |
| Task Status   | `taskStatus`, `taskStatusRef`     | `status`, `statusRef`          | ⚠️ Inconsistent |
| Task Template | `taskTemplateId`                  | `salesTaskTemplateId`          | ⚠️ Inconsistent |
| Source (Enum) | `ACTIVITY`, `TASK`                | `SALES_ACTIVITY`, `SALES_TASK` | ⚠️ Inconsistent |

**Goal:** Provide a **consistent API** to the frontend while maintaining **compatibility** with different backend schemas.

**Note:** This pattern also applies to **Enum values** that differ between domains (e.g., `SourceTable` enum with `ACTIVITY` vs `SALES_ACTIVITY`).

---

## Solution Architecture

### Three-Layer Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    1. GraphQL Fragments                      │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │   Common     │  │   Investment    │  │   Customer     │ │
│  │   Fragment   │  │   Fragment      │  │   Fragment     │ │
│  │              │  │                 │  │                │ │
│  │ Shared fields│  │ taskTiming      │  │ timingType     │ │
│  │ only         │  │ taskType        │  │ type           │ │
│  │              │  │ taskPriority    │  │ priority       │ │
│  └──────────────┘  └─────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    2. TypeScript Types                       │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │ CommonTask   │  │ InvestmentTask  │  │ CustomerTask   │ │
│  │              │  │                 │  │                │ │
│  │ taskTiming   │  │ (inherits)      │  │ timingType +   │ │
│  │ taskType     │  │                 │  │ type           │ │
│  │ taskPriority │  │                 │  │ priority       │ │
│  │ taskStatus   │  │                 │  │ status         │ │
│  └──────────────┘  └─────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    3. Mappers (Transform)                    │
│                    ┌─────────────────┐                       │
│                    │ Customer Mapper │                       │
│                    │                 │                       │
│  timingType    ──→ │  taskTiming     │                       │
│  type          ──→ │  taskType       │                       │
│  priority      ──→ │  taskPriority   │                       │
│  status        ──→ │  taskStatus     │                       │
│                    └─────────────────┘                       │
│                           ↓                                  │
│                  Consistent App Logic                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Identify Schema Inconsistencies

Compare the GraphQL schemas for both domains and identify fields that represent the same concept but use different names.

**Example:**

```graphql
# Investment Relations
type InvestmentTask {
  taskTiming: String
  taskType: TaskType
  taskPriority: TaskPriority
}

# Customer Relations
type SalesTask {
  timingType: String # ← Different name!
  type: TaskType # ← Different name!
  priority: TaskPriority # ← Different name!
}
```

### Step 2: Create Common Fragment (Shared Fields Only)

**File:** `src/common/data/relations/queries/commonTaskFragments.ts`

```typescript
export const COMMON_TASK_FIELDS = `
    id
    code
    name
    description
    startDate
    dueDate
    
    # NOTE: The following fields differ between domains:
    # - Investment: taskTiming, taskType, taskPriority, taskStatus
    # - Customer: timingType, type, priority, status
    # TODO: Standardize naming in future schema migration
    # (Commented out - added in domain-specific fragments)
    
    # Only truly shared fields here
    accountId
    contactId
`
```

**Rule:** Only include fields that have **identical names** across all domains.

### Step 3: Create Domain-Specific Fragments

#### Investment Fragment

**File:** `src/common/data/investment/queries/investmentTaskFragments.ts`

```typescript
import { COMMON_TASK_FIELDS } from '@/common/data/relations/queries/commonTaskFragments'
import { CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

export const INVESTMENT_TASK_FIELDS = `
    ${COMMON_TASK_FIELDS}
    
    # Investment-specific fields (correct naming)
    taskTiming
    taskTypeRef
    taskType {
      ${CATALOG_ENTRY}
    }
    taskPriorityRef
    taskPriority {
      ${CATALOG_ENTRY}
    }
    taskStatusRef
    taskStatus {
      ${CATALOG_ENTRY}
    }
    taskTemplateId
`
```

#### Customer Fragment

**File:** `src/common/data/customer/queries/customerTaskFragments.ts`

```typescript
import { COMMON_TASK_FIELDS } from '@/common/data/relations/queries/commonTaskFragments'
import { CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

export const CUSTOMER_TASK_FIELDS = `
    ${COMMON_TASK_FIELDS}
    
    # Customer-specific fields (legacy naming)
    # NOTE: Old naming schema - TODO: migrate to standard names
    timingType
    typeRef
    type {
      ${CATALOG_ENTRY}
    }
    priorityRef
    priority {
      ${CATALOG_ENTRY}
    }
    statusRef
    status {
      ${CATALOG_ENTRY}
    }
    salesTaskTemplateId
`
```

### Step 4: Define Common Type (Standardized Names)

**File:** `src/common/data/relations/types/commonTaskTypes.ts`

```typescript
import type { TaskTiming } from '../constants/commonTaskConstants'

export interface CommonTask extends BaseEntity {
  id: string
  code?: string
  name?: string

  // Use STANDARDIZED naming (Investment Relations naming)
  taskTiming?: TaskTiming
  taskType?: CatalogEntry
  taskTypeRef?: string
  taskPriority?: CatalogEntry
  taskPriorityRef?: string
  taskStatus?: CatalogEntry
  taskStatusRef?: string
  taskTemplateId?: string

  // ... other common fields
}
```

**Rule:** The common type uses the **target/standardized** naming convention (Investment Relations naming).

### Step 5: Define Domain-Specific Types

#### Investment Type (Inherits Directly)

**File:** `src/common/data/investment/types/investmentTaskTypes.ts`

```typescript
export interface InvestmentTask extends CommonTask {
  // Investment-specific fields only
  source?: SourceTable
  investment?: InvestmentRef

  // Inherits: taskTiming, taskType, taskPriority, taskStatus, taskTemplateId
  // No mapping needed - names already match!
}
```

#### Customer Type (Raw + Inherited)

**File:** `src/common/data/customer/types/customerTaskTypes.ts`

```typescript
export interface CustomerTask extends CommonTask {
  // Customer-specific fields
  comment?: string

  // NOTE: Customer Relations uses old naming schema
  // We include BOTH the raw GraphQL fields AND the standardized fields

  // Raw fields from GraphQL (for compatibility)
  timingType?: TaskTiming // SalesTask.timing_type
  type?: CatalogEntry // SalesTask.type
  typeRef?: string
  priority?: CatalogEntry // SalesTask.priority
  priorityRef?: string
  status?: CatalogEntry // SalesTask.status
  statusRef?: string
  salesTaskTemplateId?: string // SalesTask.sales_task_template_id

  // Standardized fields (inherited from CommonTask):
  // - taskTiming
  // - taskType, taskTypeRef
  // - taskPriority, taskPriorityRef
  // - taskStatus, taskStatusRef
  // - taskTemplateId
  // These will be populated by the mapper
}
```

**Rule:** Customer types include **both raw and standardized fields** to support the mapping layer.

### Step 6: Create Mapper (Customer Only)

**File:** `src/common/data/customer/mappers/customerRelatedEntityMappers.ts`

```typescript
export function toCustomerTask(base: CustomerTask): CustomerTask {
  // Map old naming to new standardized naming
  const taskTiming = base.timingType
  const taskType = base.type
  const taskPriority = base.priority
  const taskStatus = base.status
  const taskTemplateId = base.salesTaskTemplateId

  return {
    ...base, // Keep all original fields
    // Add standardized fields
    taskTiming,
    taskType,
    taskPriority,
    taskStatus,
    taskTemplateId
    // ... other computed fields
  }
}
```

**Rule:**

- **Investment:** No mapper needed (names already match)
- **Customer:** Mapper copies old field values to new standardized field names

### Step 7: Use Standardized Names in App Logic

```typescript
// ✅ GOOD: Use standardized names everywhere in app logic
const TaskComponent = ({ task }: { task: CustomerTask | InvestmentTask }) => {
  // Works for both domains!
  const timing = task.taskTiming
  const type = task.taskType
  const priority = task.taskPriority
  const status = task.taskStatus

  return <div>{timing} - {type?.value}</div>
}

// ❌ BAD: Don't use domain-specific names
const BadComponent = ({ task }: { task: CustomerTask }) => {
  // This only works for Customer domain!
  const timing = task.timingType // ← Wrong!
  const type = task.type // ← Wrong!
}
```

---

## Checklist for New Entity

When implementing a new entity with schema inconsistencies:

### 1. GraphQL Fragments

- [ ] Create `COMMON_ENTITY_FIELDS` with **only shared fields**
- [ ] Document inconsistencies in comments with `NOTE:` and `TODO:`
- [ ] Create `INVESTMENT_ENTITY_FIELDS` extending common (standardized names)
- [ ] Create `CUSTOMER_ENTITY_FIELDS` extending common (legacy names)

### 2. TypeScript Types

- [ ] Create `CommonEntity` with **standardized naming** (Investment naming)
- [ ] Create `InvestmentEntity extends CommonEntity` (no extra fields needed)
- [ ] Create `CustomerEntity extends CommonEntity` with **both** raw and standardized fields
- [ ] Document mapping in comments: `// Raw: oldName, Standardized: newName`

### 3. Mappers

- [ ] No mapper needed for Investment (already standardized)
- [ ] Create `toCustomerEntity` mapper that copies old fields to new standardized names
- [ ] Test mapper with real GraphQL responses

### 4. Testing

- [ ] Verify GraphQL queries work for both domains
- [ ] Verify types compile without errors
- [ ] Verify mapper produces correct output
- [ ] Verify app logic works with both domain types

---

## Benefits

### ✅ Consistent API

Frontend code uses **one set of field names** regardless of backend domain:

```typescript
// Works for both Customer and Investment!
const priority = task.taskPriority
```

### ✅ Type Safety

TypeScript catches errors at compile time:

```typescript
// ✅ Compiles
task.taskTiming

// ❌ Compile error (if used outside mapper)
task.timingType // Property doesn't exist on InvestmentTask
```

### ✅ Backward Compatible

GraphQL queries still use correct schema-specific field names:

```graphql
query GetCustomerTasks {
  SalesTask {
    timingType # Still uses old name
    type # Still uses old name
  }
}
```

### ✅ Migration Path

When backend schema is updated, only need to change:

1. GraphQL fragments (remove from domain-specific, add to common)
2. Remove raw fields from CustomerTask type
3. Remove mapping from mapper
4. Frontend code **doesn't change at all**!

---

## Common Pitfalls

### ❌ Using Raw Names in App Logic

```typescript
// DON'T DO THIS
if (task.timingType === 'DEADLINE') {
} // Only works for Customer
```

### ✅ Use Standardized Names

```typescript
// DO THIS
if (task.taskTiming === TaskTiming.DEADLINE) {
} // Works for both
```

---

### ❌ Forgetting to Map in Customer Mapper

```typescript
// DON'T FORGET THIS
return {
  ...base
  // Missing: taskTiming: base.timingType
}
```

### ✅ Always Map Old to New

```typescript
// DO THIS
const taskTiming = base.timingType
return {
  ...base,
  taskTiming // Map old to new
}
```

---

### ❌ Including Inconsistent Fields in Common Fragment

```graphql
# DON'T DO THIS
export const COMMON_TASK_FIELDS = `
  taskTiming  # ← Wrong! Not common across all domains
`
```

### ✅ Only Shared Fields in Common

```graphql
# DO THIS
export const COMMON_TASK_FIELDS = `
  # NOTE: taskTiming differs (Investment: taskTiming, Customer: timingType)
  # Added in domain-specific fragments

  id
  name  # ← Only truly shared fields
`
```

---

## Future Migration

When CRM schema is updated to use standardized names:

1. **Update Customer Fragment:**

   ```diff
   - timingType
   + taskTiming
   ```

2. **Update CustomerTask Type:**

   ```diff
   - timingType?: TaskTiming
   ```

3. **Update Mapper:**

   ```diff
   - const taskTiming = base.timingType
   ```

4. **Move to Common Fragment:**
   ```diff
   # commonTaskFragments.ts
   + taskTiming
   ```

**Frontend code:** No changes needed! 🎉

---

## Summary

| Layer          | Investment   | Customer                        | Purpose                |
| -------------- | ------------ | ------------------------------- | ---------------------- |
| **Fragment**   | `taskTiming` | `timingType`                    | Match GraphQL schema   |
| **Type (Raw)** | `taskTiming` | `timingType` + `taskTiming`     | Store GraphQL response |
| **Mapper**     | N/A          | Map `timingType` → `taskTiming` | Transform to standard  |
| **App Logic**  | `taskTiming` | `taskTiming`                    | Consistent API         |

**Key Principle:** Backend schemas can differ, but the frontend API must be consistent.
