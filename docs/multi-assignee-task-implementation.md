# Multi-Assignee Task Implementation Guide

**IRM Temporary Extension & Future CRM Unification Plan**

## 📋 Executive Summary

### Current State (January 2026)

- **IRM Backend**: Updated to support multiple assignees per task via `InvestmentTaskAssignee` junction table
- **CRM Backend**: Still uses single assignee per task (`assignedEmployee`, `assignedEmployeeId`, `assignedUserId` fields)
- **Frontend**: Implemented IRM-specific code paths that extend/overlay the common CRM structure to support multiple assignees while maintaining backward compatibility

### Future State (When CRM Backend Updates)

- **Both IRM & CRM**: Will use the same multiple assignee structure
- **Frontend**: Can be simplified by removing IRM-specific overrides and using unified code paths
- **Migration**: Replace IRM-specific implementations with the common/unified versions

---

## 🔄 Backend Schema Changes (IRM Only - For Now)

### What Changed in IRM Schema

#### **Removed Fields** (from `InvestmentTask`)

```graphql
# ❌ REMOVED (IRM only)
assignedEmployee: Employee
assignedEmployeeId: uuid
assignedUserId: String
```

#### **Added Fields** (to `InvestmentTask`)

```graphql
# ✅ ADDED (IRM only)
taskAssignees: [InvestmentTaskAssignee!]!
taskAssigneesAggregate: InvestmentTaskAssigneeAggregate
```

#### **New Junction Table** (IRM only)

```graphql
type InvestmentTaskAssignee {
  id: uuid!
  taskId: uuid!
  assignedEmployee: Employee
  assignedEmployeeId: uuid!
  assignedUserId: String
  isDeleted: Boolean!
  # ... audit fields
}
```

#### **Filter Changes** (IRM only)

```graphql
# Old CRM way (still valid for CRM)
where: { assignedEmployeeId: { _eq: $employeeId } }

# New IRM way
where: {
  taskAssignees: {
    assignedEmployeeId: { _eq: $employeeId }
  }
}
```

---

## 🛠️ Frontend Implementation Changes

### 1. Core Type Definitions

#### **File:** `src/common/data/investment/types/investmentTaskTypes.ts`

**Changes Made:**

```typescript
// ✅ ADDED: New junction table type
export interface InvestmentTaskAssignee {
  id?: string
  taskId?: string
  assignedEmployee?: Employee
  assignedEmployeeId?: string
  assignedUserId?: string
  isDeleted?: boolean
  // ... audit fields
}

// ✅ ADDED: Field mapping for junction table
export const InvestmentTaskAssigneeFields: Record<keyof InvestmentTaskAssignee, string> = {
  id: 'id',
  taskId: 'taskId',
  assignedEmployee: 'assignedEmployee',
  assignedEmployeeId: 'assignedEmployeeId',
  assignedUserId: 'assignedUserId',
  isDeleted: 'isDeleted'
  // ... audit fields
}

// ✅ MODIFIED: InvestmentTask interface
export interface InvestmentTask extends CommonTask {
  // NEW: Multiple assignees
  taskAssignees?: InvestmentTaskAssignee[]
  taskAssigneesAggregate?: { aggregate: { count: number } }

  // KEPT FOR BACKWARD COMPATIBILITY (populated by mapper)
  assignedEmployee?: Employee
  assignedEmployeeId?: string
  assignedUserId?: string
}

// ✅ MODIFIED: Field mapping (commented out old fields, added new ones)
export const InvestmentTaskFields = {
  // assignedEmployee: 'assignedEmployee',  // COMMENTED OUT
  // assignedEmployeeId: 'assignedEmployeeId',  // COMMENTED OUT
  // assignedUserId: 'assignedUserId',  // COMMENTED OUT

  // NEW FIELDS
  taskAssignees: 'taskAssignees',
  taskAssigneesAggregate: 'taskAssigneesAggregate'
  // ... other fields
}
```

**💡 IRM-SPECIFIC PAYLOAD TRANSFORMATION:**

```typescript
// This function transforms form data to backend format
export const buildInvestmentTaskPayload = (task: Partial<InvestmentTask>) => {
  const payload = buildPayload(task, InvestmentTaskFormFields)

  // IRM-SPECIFIC: Transform single/multi assignee to taskAssignees array
  if (payload.assignedEmployeeIds && Array.isArray(payload.assignedEmployeeIds)) {
    // Multi-assignee mode (new)
    payload.taskAssignees = payload.assignedEmployeeIds.map((id, idx) => ({
      assignedEmployeeId: id,
      assignedEmployee: payload.assignedEmployees?.[idx],
      assignedUserId: payload.assignedEmployees?.[idx]?.userId
    }))
    delete payload.assignedEmployeeIds
    delete payload.assignedEmployees
  } else if (payload.assignedEmployeeId || payload.assignedEmployee) {
    // Single-assignee mode (backward compatibility)
    payload.taskAssignees = [
      {
        assignedEmployee: payload.assignedEmployee,
        assignedEmployeeId: payload.assignedEmployeeId,
        assignedUserId: payload.assignedUserId
      }
    ]
  }

  // Remove old fields (IRM backend doesn't accept these)
  delete payload.assignedEmployee
  delete payload.assignedEmployeeId
  delete payload.assignedUserId

  return { investmentTask: payload }
}
```

**🔮 Future CRM Migration:**

- When CRM backend updates, this exact pattern will be moved to `src/common/data/customer/types/taskTypes.ts`
- The IRM-specific version will be removed
- Both will use the unified common version

---

### 2. GraphQL Query Fragments

#### **File:** `src/common/data/investment/queries/investmentTaskQueries.ts`

**Changes Made:**

**✅ ADDED: Task Assignee Fragment**

```typescript
export const buildTaskAssigneeFragment = (): string => {
  return `
    id
    taskId
    assignedEmployee {
      ${EMPLOYEE_REF}
    }
    assignedEmployeeId
    assignedUserId
    ${AUDIT_FIELDS}
  `
}
```

**✅ ADDED: IRM-Specific Task Fragment (for relations)**

```typescript
export const buildInvestmentTaskFragmentForRelations = (): string => {
  return `
    ${AUDIT_FIELDS}
    
    # Task Assignees (multiple assignees - IRM ONLY)
    taskAssignees(where: { isDeleted: { _eq: false } }) {
      ${buildTaskAssigneeFragment()}
    }
    
    code
    creatorEmployee { ${EMPLOYEE_REF} }
    creatorEmployeeId
    creatorUserId
    description
    dueDate
    endDate
    id
    name
    source
    startDate
    taskPriority { ${CATALOG_ENTRY} }
    taskPriorityRef
    taskStatus { ${CATALOG_ENTRY} }
    taskStatusRef
    taskTiming
    taskType { ${CATALOG_ENTRY} }
    taskTypeRef
    templateStartDate
  `
}
```

**✅ MODIFIED: Main Task Query**

```typescript
export const buildInvestmentTaskQuery = (_fields = InvestmentTaskFields): string => {
  // ... relation builders ...

  return `
    query GetInvestmentTasks($limit: Int, $offset: Int, $where: InvestmentTaskBoolExp, $orderBy: [InvestmentTaskOrderBy!]) {
      InvestmentTask(limit: $limit, offset: $offset, orderBy: $orderBy, where: $where) {
        ${AUDIT_FIELDS}
        
        # IRM: Multiple assignees (replaces single assignedEmployee)
        taskAssignees(where: { isDeleted: { _eq: false } }) {
          ${buildTaskAssigneeFragment()}
        }
        
        # Rest of fields...
        code
        creatorEmployee { ${EMPLOYEE_REF} }
        description
        dueDate
        # ... etc
      }
    }
  `
}
```

**✅ MODIFIED: Where Condition Builder**

```typescript
export const buildInvestmentTaskWhereCondition = (
  variables: InvestmentTaskQueryVariables,
  additionalDescriptors: Descriptor[] = [],
  customConditions: any[] = []
): any => {
  // IRM-SPECIFIC: Handle multiple assignees filter
  if (variables.assignedEmployeeIds && Array.isArray(variables.assignedEmployeeIds)) {
    customConditions.push({
      taskAssignees: {
        assignedEmployeeId: { _in: variables.assignedEmployeeIds },
        isDeleted: { _eq: false }
      }
    })
    const { assignedEmployeeIds: _removed, ...rest } = variables
    variables = rest as InvestmentTaskQueryVariables
  }

  return buildTaskWhereCondition(
    variables,
    [...INVESTMENT_TASK_DESCRIPTORS, ...additionalDescriptors],
    customConditions
  )
}
```

**🔮 Future CRM Migration:**

- These IRM-specific fragments will become the common/unified versions
- Current common `buildTaskFragment` in `src/common/data/relations/queries/taskQueries.ts` will be updated to use `taskAssignees`
- IRM-specific versions will be deleted

---

### 3. Data Mappers (Backward Compatibility Layer)

#### **File:** `src/common/data/investment/mappers/investmentTaskMappers.ts`

**Changes Made:**

```typescript
export const toInvestmentTask = (base: any): InvestmentTask => {
  // ... existing mapping logic ...

  // ✅ ADDED: Map first assignee to legacy fields for backward compatibility
  // NOTE: InvestmentTask now supports multiple assignees via taskAssignees array
  // But UI components may still expect single assignedEmployee
  const firstAssignee = base.taskAssignees?.[0]
  const assignedEmployee = firstAssignee?.assignedEmployee || base.assignedEmployee
  const assignedEmployeeId = firstAssignee?.assignedEmployeeId || base.assignedEmployeeId
  const assignedUserId = firstAssignee?.assignedUserId || base.assignedUserId

  return {
    ...base,
    // Maintain backward compatibility
    assignedTo: assignedEmployee, // Alias for task columns
    assignedEmployee,
    assignedEmployeeId,
    assignedUserId,
    creatorEmployee: base.creatorEmployee
  } as any
}
```

**💡 Why This Matters:**

- Allows existing UI components that expect `assignedEmployee` to continue working
- Task lists, filters, and simple displays don't need immediate updates
- Only components that need to show ALL assignees were updated

**🔮 Future CRM Migration:**

- This backward compatibility layer can be removed once all UI is updated
- Or kept for a transition period during CRM migration

---

### 4. GraphQL Hooks & Statistics

#### **File:** `src/common/data/investment/hooks/useInvestmentTaskStatistics.ts`

**Changes Made:**

```typescript
// ✅ CHANGED: Filter queries to use taskAssignees
const myTasks = await graphqlClient.request<{ InvestmentTask: any[] }>(`
  query GetMyTasks($employeeId: uuid!) {
    InvestmentTask(
      where: {
        isDeleted: {_eq: false}
        # OLD CRM WAY: assignedEmployeeId: {_eq: $employeeId}
        # NEW IRM WAY:
        taskAssignees: {
          assignedEmployeeId: {_eq: $employeeId}
        }
      }
    ) {
      id
      taskStatusRef
    }
  }
`)
```

**🔮 Future CRM Migration:**

- Same filter change will apply to `src/common/data/customer/hooks/useTaskStatistics.ts`
- All task-related hooks will use the unified `taskAssignees` filter

---

### 5. UI Components - Multi-Assignee Selection

#### **File:** `src/components/multi-employee-select/MultiEmployeeSelect.tsx`

**NEW COMPONENT - IRM ONLY (For Now)**

**Purpose:** Allow users to select multiple employees for task assignment

**Key Features:**

```typescript
interface MultiEmployeeSelectProps {
  accessToken: string
  initialEmployees?: EmployeeLiteOption[]
  value: string[]  // Array of employee IDs
  onValueChange: (employeeIds: string[]) => void
  onEmployeesChange: (employees: EmployeeLiteOption[]) => void
  placeholder?: string
  searchPlaceholder?: string
}

// Displays selected employees as compact badges
<Badge variant="secondary" className="gba:flex gba:items-center gba:gap-1.5 gba:pr-1.5 gba:pl-1 gba:py-0.5 gba:h-7">
  <Avatar size="xs" className="gba:h-5 gba:w-5">
    {/* Employee avatar */}
  </Avatar>
  <span className="gba:text-xs">{employee.displayName}</span>
  <Button size="icon" onClick={handleRemove}>
    <X className="gba:h-2.5 gba:w-2.5" />
  </Button>
</Badge>
```

**🔮 Future CRM Migration:**

- Move to `src/common/components/` once CRM backend supports multiple assignees
- Becomes the standard assignee selector for both IRM and CRM

---

### 6. Form Components

#### **File:** `src/common/components/common-relations/form-segments/task-segment/TaskSegment.tsx`

**Changes Made:**

```typescript
interface TaskSegmentProps {
  // ... existing props ...

  // ✅ ADDED: Multi-assignee mode props
  multiAssigneeMode?: boolean
  assignedEmployees?: EmployeeLiteOption[]
}

export const TaskSegment: React.FC<TaskSegmentProps> = ({
  multiAssigneeMode = false,
  assignedEmployees = [],
  // ... other props
}) => {
  return (
    <div>
      {/* ... other form fields ... */}

      {/* ✅ CONDITIONAL: Multi vs Single Assignee Selection */}
      {multiAssigneeMode ? (
        <FormField
          control={form.control}
          name="assignedEmployeeIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignees</FormLabel>
              <FormControl>
                <MultiEmployeeSelect
                  accessToken={accessToken}
                  initialEmployees={assignedEmployees}
                  value={field.value || []}
                  onValueChange={employeeIds => {
                    field.onChange(employeeIds)
                    form.setValue('assignedEmployeeIds', employeeIds)
                  }}
                  onEmployeesChange={employees => {
                    form.setValue('assignedEmployees', employees)
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
      ) : (
        <FormField
          control={form.control}
          name="assignedEmployeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignee</FormLabel>
              <FormControl>
                <EmployeeSelect
                  accessToken={accessToken}
                  initialEmployee={assignedEmployee}
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v || '')}
                  onEmployeeChange={emp => {
                    form.setValue('assignedEmployeeId', emp?.id || '')
                    form.setValue('assignedEmployee', emp)
                    form.setValue('assignedUserId', emp?.userId)
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </div>
  )
}

// ✅ MODIFIED: Schema builder to support both modes
export const buildTaskSegmentSchema = (options: TaskSegmentOptions = {}) => {
  const { multiAssigneeMode = false } = options

  return z.object({
    // ... other fields ...

    // Multi-assignee mode fields
    ...(multiAssigneeMode && {
      assignedEmployeeIds: z.array(z.string()).optional(),
      assignedEmployees: z.array(z.any()).optional()
    }),

    // Single-assignee mode fields
    ...(!multiAssigneeMode && {
      assignedEmployeeId: z.string().optional(),
      assignedEmployee: z.any().optional(),
      assignedUserId: z.string().optional()
    })
  })
}
```

**🔮 Future CRM Migration:**

- Remove conditional logic
- `multiAssigneeMode` becomes the default (always `true`)
- Single `EmployeeSelect` fallback can be removed

---

#### **File:** `src/business-apps/irm/core/forms/task-form/TaskForm.tsx`

**Changes Made:**

```typescript
// ✅ ADDED: Multi-assignee mode enabled
<TaskLayout
  // ... other props ...
  multiAssigneeMode={true}  // Enable multi-assignee for IRM
  assignedEmployees={
    task?.taskAssignees?.map(ta => ({
      id: ta.assignedEmployee?.id || '',
      displayName: ta.assignedEmployee?.displayName || '',
      firstName: ta.assignedEmployee?.firstName || '',
      lastName: ta.assignedEmployee?.lastName || '',
      userId: ta.assignedEmployee?.userId || '',
      pictureThumbnail: ta.assignedEmployee?.pictureThumbnail || ''
    })) || []
  }
  // ... other props ...
/>

// ✅ MODIFIED: Form schema to include multi-assignee fields
const investmentTaskSchema = buildTaskSchema({
  multiAssigneeMode: true,
  // ... other options
}).extend({
  assignedEmployeeIds: z.array(z.string()).optional(),
  assignedEmployees: z.array(z.any()).optional()
})

// ✅ MODIFIED: Map form values from taskAssignees
const mapToFormValues = (task: InvestmentTask) => {
  return {
    // ... other fields ...
    assignedEmployeeIds: task.taskAssignees?.map(ta => ta.assignedEmployeeId).filter(Boolean) || [],
    assignedEmployees: task.taskAssignees?.map(ta => ta.assignedEmployee).filter(Boolean) || []
  }
}

// ✅ MODIFIED: Clean up before submit (payload builder handles transformation)
const handleSubmit = async (data: any) => {
  delete data.assignedEmployeeIds  // Removed - payload builder handles this
  delete data.assignedEmployees    // Removed - payload builder handles this

  await saveTask(data)
}
```

**🔮 Future CRM Migration:**

- CRM task forms (`src/business-apps/crm/core/forms/task-form/`) will use the exact same pattern
- `multiAssigneeMode={true}` becomes default in common components

---

### 7. Display Components

#### **File:** `src/common/components/common-relations/detail-sheets/task-detail-sheet/TaskDetailSheet.tsx`

**Changes Made:**

**✅ MODIFIED: Task interface to support array**

```typescript
export interface Task {
  // ... other fields ...
  assignedTo?: TaskEmployee | TaskEmployee[] // ✅ Support both single and array
}
```

**✅ ADDED: AssigneeField component with multi-assignee support**

```typescript
interface AssigneeFieldProps {
  assignedTo?: TaskEmployee | TaskEmployee[]
  dataTestId?: string
  getInitials: (firstName: string, lastName: string) => string
}

const AssigneeField: React.FC<AssigneeFieldProps> = ({ assignedTo, dataTestId, getInitials }) => {
  const assignees = Array.isArray(assignedTo) ? assignedTo : assignedTo ? [assignedTo] : []

  if (assignees.length === 0) {
    return <span>Unassigned</span>
  }

  // Single assignee - show as before
  if (assignees.length === 1) {
    const employee = assignees[0]
    return (
      <div onClick={() => navigateToEmployee(employee.id)}>
        <Avatar size="sm">
          {/* Avatar image */}
        </Avatar>
        <span>{employee.displayName}</span>
      </div>
    )
  }

  // Multiple assignees - show as compact badges
  return (
    <div className="gba:flex gba:flex-wrap gba:gap-1.5">
      {assignees.map((employee, index) => (
        <Badge
          key={employee.id || index}
          variant="secondary"
          className="gba:flex gba:items-center gba:gap-1.5 gba:pr-2 gba:pl-1 gba:py-0.5 gba:h-6 gba:cursor-pointer"
          onClick={() => navigateToEmployee(employee.id)}
        >
          <Avatar size="xs" className="gba:h-4 gba:w-4">
            {/* Tiny avatar */}
          </Avatar>
          <span className="gba:text-xs">{employee.displayName}</span>
        </Badge>
      ))}
    </div>
  )
}
```

**🔮 Future CRM Migration:**

- No changes needed - already handles both single and multiple assignees
- When CRM updates, this component automatically supports it

---

#### **File:** `src/common/components/common-relations/record-sections/task-section/utils/taskMappers.ts`

**Changes Made:**

```typescript
export interface TaskOrApprovalSource {
  // ... other fields ...

  // OLD: Single assignee (CRM)
  assignedEmployee?: {
    /* ... */
  }

  // ✅ NEW: Support for multiple assignees (IRM)
  taskAssignees?: Array<{
    assignedEmployee?: {
      /* ... */
    }
  }>
}

export const transformTaskOrApproval = (item: TaskOrApprovalSource): TaskItem => {
  // ✅ Extract assignees - support both single and multiple
  let assigneeEmployee: any
  let assignee: string | undefined

  if (item.taskAssignees && item.taskAssignees.length > 0) {
    // IRM: Multiple assignees
    const assignees = item.taskAssignees.map(ta => ta.assignedEmployee).filter(Boolean)

    assigneeEmployee = assignees.length > 0 ? assignees : undefined
    assignee = assignees
      .map(emp => emp?.displayName || emp?.fullName)
      .filter(Boolean)
      .join(', ')
  } else if (item.assignedEmployee) {
    // CRM: Single assignee (backward compatibility)
    assigneeEmployee = item.assignedEmployee
    assignee = item.assignedEmployee?.displayName || item.assignedEmployee?.fullName
  }

  return {
    // ... other fields ...
    assignee,
    assigneeEmployee // Can be single object or array
  }
}
```

**🔮 Future CRM Migration:**

- `taskAssignees` check becomes the primary path
- `assignedEmployee` fallback can be removed once CRM updates

---

#### **File:** `src/common/components/common-relations/record-sections/task-section/TaskSection.tsx`

**Changes Made:**

```typescript
// ✅ ADDED: Helper to handle both single and array assignees
const getEmployeeDisplayName = (emp: any) => {
  if (!emp) return 'Unknown User'
  const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
  if (fullName) return fullName
  return emp.displayName || 'Unknown User'
}

const getAssigneeDisplayName = (assigneeEmployee: any, fallback?: string) => {
  if (!assigneeEmployee) return fallback

  if (Array.isArray(assigneeEmployee)) {
    if (assigneeEmployee.length === 0) return fallback
    if (assigneeEmployee.length === 1) return getEmployeeDisplayName(assigneeEmployee[0])
    return 'Multiple' // ✅ Show "Multiple" for 2+ assignees
  }

  return getEmployeeDisplayName(assigneeEmployee)
}

// ✅ MODIFIED: Convert to common task format
const convertToCommonTask = (task: TaskItem): Task => {
  // Handle assigneeEmployee (single or array)
  let assignedTo: TaskEmployee | TaskEmployee[] | undefined

  if (Array.isArray(task.assigneeEmployee)) {
    assignedTo = task.assigneeEmployee // Keep as array
  } else if (task.assigneeEmployee) {
    assignedTo = task.assigneeEmployee // Keep as single
  }

  return {
    // ... other fields ...
    assignedTo
  }
}
```

**Display Behavior:**

- **Single assignee:** Shows "John Doe"
- **Multiple assignees:** Shows "Multiple" in list view
- **No assignee:** Shows "Unassigned"
- **Detail sheet:** Shows all assignees as individual badges

**🔮 Future CRM Migration:**

- No changes needed - already handles both formats

---

### 8. Relation Query Updates

**Files Modified to Use IRM-Specific Task Fragment:**

1. **`src/common/data/investment/queries/investmentOpportunityQueries.ts`**

   ```typescript
   // ✅ CHANGED: Use IRM-specific task fragment
   import { buildInvestmentTaskFragmentForRelations } from './investmentTaskQueries'

   export const buildInvestmentOpportunityByIdQuery = () => {
     const relationBuilders = {
       buildTaskFragment: buildInvestmentTaskFragmentForRelations // IRM-specific
       // ... other builders
     }
   }
   ```

2. **`src/common/data/investment/queries/investmentDocumentQueries.ts`**
3. **`src/common/data/investment/queries/investmentAccountQueries.ts`**
4. **`src/common/data/investment/queries/investmentContactQueries.ts`**
5. **`src/common/data/investment/queries/investmentLeadQueries.ts`**

**Pattern:** All entity record queries that include related tasks were updated to use the IRM-specific fragment.

**🔮 Future CRM Migration:**

- Corresponding CRM query files will use the unified task fragment
- `buildInvestmentTaskFragmentForRelations` becomes `buildTaskFragmentForRelations` (common)

---

### 9. Reference Fragments

#### **File:** `src/common/data/investment/queries/fragments/investmentReferenceFragments.ts`

**Changes Made:**

```typescript
// ✅ CHANGED: Task reference to use taskAssignees
export const INVESTMENT_TASK_REF = `
  id
  name
  code
  description
  dueDate
  taskStatusRef
  taskPriorityRef
  taskTypeRef
  
  # IRM: Multiple assignees
  taskAssignees(where: { isDeleted: { _eq: false } }) {
    assignedEmployee {
      id
      firstName
      lastName
      displayName
      userId
    }
    assignedEmployeeId
    assignedUserId
  }
`
```

**🔮 Future CRM Migration:**

- `CUSTOMER_TASK_REF` in `src/common/data/customer/queries/fragments/` will be updated the same way
- Both will eventually reference a unified `COMMON_TASK_REF`

---

### 10. Dashboard & Widget Components

#### **File:** `src/business-apps/irm/core/apps/investment-relations/views/dashboard-view/hooks/useOverviewData.ts`

**Changes Made:**

```typescript
// ✅ ADDED: Helper function for assignee display
const getTaskAssigneeDisplay = (task: any): string => {
  // IRM: Check taskAssignees array first
  if (task.taskAssignees && task.taskAssignees.length > 0) {
    const assignees = task.taskAssignees
      .map((ta: any) => ta.assignedEmployee)
      .filter(Boolean)

    if (assignees.length === 0) return 'Unassigned'
    if (assignees.length === 1) {
      const emp = assignees[0]
      return emp.fullName || emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'
    }
    return 'Multiple'  // Multiple assignees
  }

  // CRM: Single assignedEmployee (backward compatibility)
  if (task.assignedEmployee) {
    return task.assignedEmployee.fullName || task.assignedEmployee.displayName || /* ... */
  }

  return 'Unassigned'
}

// ✅ MODIFIED: Process tasks with new helper
const processedTodaysTasks = todaysTasks.map((task: any) => ({
  // ... other fields ...
  assignedTo: getTaskAssigneeDisplay(task),  // Use helper
}))
```

**🔮 Future CRM Migration:**

- Same pattern will apply to CRM dashboard hooks
- Helper function can be extracted to shared utility

---

#### **File:** `src/business-apps/irm/core/apps/investment-relations/views/dashboard-view/queries/DashboardQueries.ts`

**Changes Made:**

```typescript
export const GET_TODAYS_TASKS = (): string => {
  return `
    query GetActiveTasks($employeeId: uuid!) {
      InvestmentTask(
        where: {
          isDeleted: {_eq: false}
          endDate: {_isNull: true}
          # ✅ CHANGED: Filter by taskAssignees
          taskAssignees: {
            assignedEmployeeId: {_eq: $employeeId}
          }
        }
      ) {
        id
        name
        # ... other fields ...
        
        # ✅ CHANGED: Query taskAssignees array
        taskAssignees(where: { isDeleted: { _eq: false } }) {
          assignedEmployee {
            id
            firstName
            lastName
            fullName
            displayName
          }
          assignedEmployeeId
          assignedUserId
        }
      }
    }
  `
}
```

**🔮 Future CRM Migration:**

- CRM dashboard queries will use same filter structure
- `CustomerTask` → `taskAssignees` filter

---

### 11. Other IRM Components

#### **File:** `src/business-apps/irm/investments/apps/investment-portal/components/InvestmentPortalTasks.tsx`

**Changes Made:**

```typescript
// ✅ CHANGED: Filter by taskAssignees
customConditions.push({
  _or: [
    {
      taskAssignees: {
        assignedEmployeeId: { _eq: currentEmployeeId }
      }
    },
    { creatorEmployeeId: { _eq: currentEmployeeId } }
  ]
})
```

---

#### **File:** `src/business-apps/irm/core/popups/task-delete-popup/TaskDeletePopup.tsx`

**Changes Made:**

```typescript
// ✅ CHANGED: Query taskAssignees
const query = `
  query GetTaskById($taskId: uuid!) {
    InvestmentTask(where: { id: { _eq: $taskId } }) {
      id
      name
      # ... other fields ...
      
      # NEW: Query taskAssignees
      taskAssignees(where: { isDeleted: { _eq: false } }) {
        assignedEmployee {
          id
          firstName
          lastName
          displayName
        }
        assignedEmployeeId
        assignedUserId
      }
    }
  }
`

// ✅ ADDED: Extract first assignee for display (backward compatibility)
const tsk = result.InvestmentTask[0]
const firstAssignee = tsk.taskAssignees?.[0]?.assignedEmployee
let assignedEmployee = firstAssignee

if (assignedEmployee && !assignedEmployee.displayName) {
  const computedDisplayName =
    `${assignedEmployee.firstName || ''} ${assignedEmployee.lastName || ''}`.trim() || 'Unassigned'
  assignedEmployee = { ...assignedEmployee, displayName: computedDisplayName }
}

setTask({
  // ... other fields ...
  assignedEmployee // Still use for display (single popup doesn't need full list)
})
```

---

## 🚀 Future Migration Plan

### When CRM Backend Updates to Support Multiple Assignees

#### **Phase 1: Update CRM Backend Schema** (Backend Team)

1. Add `CustomerTaskAssignee` junction table (same structure as `InvestmentTaskAssignee`)
2. Remove `assignedEmployee`, `assignedEmployeeId`, `assignedUserId` from `CustomerTask`
3. Add `taskAssignees` and `taskAssigneesAggregate` to `CustomerTask`
4. Update GraphQL schema and resolvers

#### **Phase 2: Unify Frontend Type Definitions** (Frontend Team)

1. Move multi-assignee types to common location:

   ```typescript
   // src/common/data/relations/types/taskTypes.ts
   export interface TaskAssignee {
     // Remove "Investment" prefix
     id?: string
     taskId?: string
     assignedEmployee?: Employee
     assignedEmployeeId?: string
     assignedUserId?: string
     // ... etc
   }

   export interface CommonTask {
     taskAssignees?: TaskAssignee[]
     taskAssigneesAggregate?: { aggregate: { count: number } }
     // ... other fields
   }
   ```

2. Update `buildInvestmentTaskPayload` → Move to common or duplicate for CRM:
   ```typescript
   // src/common/data/relations/types/taskTypes.ts
   export const buildTaskPayload = (task: Partial<CommonTask>) => {
     // Same transformation logic
     // Works for both IRM and CRM
   }
   ```

#### **Phase 3: Unify GraphQL Fragments** (Frontend Team)

1. Update common task fragment:

   ```typescript
   // src/common/data/relations/queries/taskQueries.ts
   export const buildTaskFragment = (): string => {
     return `
       ${AUDIT_FIELDS}
       
       # Multiple assignees (unified for CRM & IRM)
       taskAssignees(where: { isDeleted: { _eq: false } }) {
         ${buildTaskAssigneeFragment()}
       }
       
       code
       creatorEmployee { ${EMPLOYEE_REF} }
       # ... rest of fields
     `
   }
   ```

2. Delete IRM-specific override:

   ```bash
   # Delete: buildInvestmentTaskFragmentForRelations
   # Use: buildTaskFragment (common)
   ```

3. Update all relation queries to use common fragment:

   ```typescript
   // Before (IRM-specific)
   buildTaskFragment: buildInvestmentTaskFragmentForRelations

   // After (unified)
   buildTaskFragment: buildTaskFragment
   ```

#### **Phase 4: Update CRM Components** (Frontend Team)

1. Enable multi-assignee mode in CRM task forms:

   ```typescript
   // src/business-apps/crm/core/forms/task-form/TaskForm.tsx
   <TaskLayout
     multiAssigneeMode={true}  // Enable for CRM
     assignedEmployees={task?.taskAssignees?.map(/* ... */)}
   />
   ```

2. Update CRM query hooks:

   ```typescript
   // src/common/data/customer/hooks/useCustomerTaskStatistics.ts
   where: {
     taskAssignees: {
       assignedEmployeeId: {
         _eq: $employeeId
       }
     }
   }
   ```

3. Update CRM mappers (same as IRM):
   ```typescript
   // src/common/data/customer/mappers/taskMappers.ts
   const firstAssignee = base.taskAssignees?.[0]
   const assignedEmployee = firstAssignee?.assignedEmployee || base.assignedEmployee
   ```

#### **Phase 5: Cleanup & Optimization** (Frontend Team)

1. Remove IRM-specific overrides:
   - Delete `buildInvestmentTaskFragmentForRelations`
   - Remove conditional `multiAssigneeMode` logic
   - Remove backward compatibility mappers (optional - can keep for safety)

2. Move `MultiEmployeeSelect` to common components:

   ```bash
   mv src/components/multi-employee-select/ → src/common/components/employee-select/
   ```

3. Update documentation:
   - Remove "IRM-specific" comments
   - Update this document to reflect unified state

#### **Phase 6: Testing** (QA Team)

1. **CRM Task Creation:**
   - [ ] Can select multiple assignees
   - [ ] Can select single assignee
   - [ ] Form validation works
   - [ ] Task saves correctly

2. **CRM Task Display:**
   - [ ] Task lists show "Multiple" for multi-assignee tasks
   - [ ] Task detail sheets show all assignees as badges
   - [ ] Assignee badges are clickable
   - [ ] Single assignee displays correctly

3. **CRM Filters:**
   - [ ] "My Tasks" filter shows tasks assigned to current user
   - [ ] Statistics count tasks correctly
   - [ ] Dashboard widgets display correctly

4. **CRM/IRM Consistency:**
   - [ ] Both systems behave identically
   - [ ] UI components look the same
   - [ ] No visual regressions

---

## 📋 Migration Checklist

### For Backend Team (When Updating CRM)

- [ ] Create `CustomerTaskAssignee` table with same structure as `InvestmentTaskAssignee`
- [ ] Add foreign key relationships to `CustomerTask`
- [ ] Remove old `assignedEmployee`, `assignedEmployeeId`, `assignedUserId` fields
- [ ] Add `taskAssignees` and `taskAssigneesAggregate` to GraphQL schema
- [ ] Update resolvers to handle taskAssignees queries
- [ ] Update mutation resolvers to accept taskAssignees array
- [ ] Write data migration script (convert existing single assignees to array)
- [ ] Test with real CRM data
- [ ] Update API documentation

### For Frontend Team (After CRM Backend Updates)

- [ ] Update `src/common/data/relations/types/taskTypes.ts` with TaskAssignee interface
- [ ] Move `buildTaskPayload` transformation to common
- [ ] Update common `buildTaskFragment` to query `taskAssignees`
- [ ] Delete `buildInvestmentTaskFragmentForRelations`
- [ ] Update all CRM relation queries to use unified fragment
- [ ] Enable `multiAssigneeMode={true}` in CRM task forms
- [ ] Update CRM hooks to filter by `taskAssignees`
- [ ] Update CRM mappers for backward compatibility
- [ ] Move `MultiEmployeeSelect` to common components
- [ ] Remove IRM-specific comments
- [ ] Update this documentation
- [ ] Run full regression test suite

---

## 🎯 Key Takeaways

### Current Implementation Strategy

✅ **IRM-specific overrides** that work alongside CRM's existing single-assignee structure  
✅ **Backward compatibility** maintained via mappers and conditional logic  
✅ **No CRM disruption** - all changes isolated to IRM code paths  
✅ **UI components** already handle both single and multiple assignees

### Future Unification Benefits

🎯 **Single codebase** for task management across CRM and IRM  
🎯 **Reduced complexity** by removing conditional logic  
🎯 **Better maintainability** with unified patterns  
🎯 **Consistent UX** across all modules

### What Makes This Migration Easy

💡 UI components already support both formats (single and array)  
💡 Display logic uses helper functions that work for both  
💡 Payload transformation is centralized in one function  
💡 GraphQL fragments are modular and easy to swap

---

## 📊 Summary of Modified Files

### Type Definitions & Data Layer (8 files)

1. `src/common/data/investment/types/investmentTaskTypes.ts` - Core types and payload builder
2. `src/common/data/investment/queries/investmentTaskQueries.ts` - GraphQL fragments and queries
3. `src/common/data/investment/mappers/investmentTaskMappers.ts` - Backward compatibility mapper
4. `src/common/data/investment/hooks/useInvestmentTaskStatistics.ts` - Statistics queries
5. `src/common/data/investment/queries/investmentOpportunityQueries.ts` - Relation queries
6. `src/common/data/investment/queries/investmentDocumentQueries.ts` - Relation queries
7. `src/common/data/investment/queries/investmentAccountQueries.ts` - Relation queries
8. `src/common/data/investment/queries/investmentContactQueries.ts` - Relation queries
9. `src/common/data/investment/queries/investmentLeadQueries.ts` - Relation queries
10. `src/common/data/investment/queries/fragments/investmentReferenceFragments.ts` - Reference fragments

### UI Components (10 files)

11. `src/components/multi-employee-select/MultiEmployeeSelect.tsx` - NEW: Multi-assignee selector
12. `src/components/multi-employee-select/index.ts` - NEW: Export file
13. `src/common/components/common-relations/form-segments/task-segment/TaskSegment.tsx` - Form segment
14. `src/business-apps/irm/core/forms/task-form/TaskForm.tsx` - IRM task form
15. `src/common/components/common-relations/detail-sheets/task-detail-sheet/TaskDetailSheet.tsx` - Detail sheet
16. `src/common/components/common-relations/detail-sheets/task-detail-sheet/types.ts` - Detail sheet types
17. `src/common/components/common-relations/record-sections/task-section/utils/taskMappers.ts` - Task mappers
18. `src/common/components/common-relations/record-sections/task-section/TaskSection.tsx` - Task list section

### Dashboard & Apps (5 files)

19. `src/business-apps/irm/core/apps/investment-relations/views/dashboard-view/hooks/useOverviewData.ts` - Dashboard data
20. `src/business-apps/irm/core/apps/investment-relations/views/dashboard-view/queries/DashboardQueries.ts` - Dashboard queries
21. `src/business-apps/irm/investments/apps/investment-portal/components/InvestmentPortalTasks.tsx` - Portal tasks
22. `src/business-apps/irm/core/popups/task-delete-popup/TaskDeletePopup.tsx` - Delete popup

### Total: 22 Files Modified + 2 New Files Created

---

## 📚 Related Documentation

- Backend Schema Changes (see schema documentation)
- GraphQL API Documentation
- Component Library Guidelines (@newwork/nw-design-system)
- Testing Strategy for Multi-Assignee Tasks

---

**Document Version:** 1.0  
**Last Updated:** January 5, 2026  
**Authors:** Development Team  
**Status:** Active - IRM Multi-Assignee Extension Implemented  
**Next Review:** When CRM backend migration is scheduled
