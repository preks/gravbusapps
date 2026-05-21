import type { ColumnDef } from '@tanstack/react-table'
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { Clock, Calendar } from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'
import type { Task } from '@/common/data/relations/types/taskTypes'
import { TaskPriority, TaskStatus } from '@/common/data/relations/constants/taskConstants'
import { getEmployeeName } from '@/common/components/common-relations/record-sections/opportunity-pipeline-section/utils'
import dayjs from 'dayjs'

const formatDate = (dateString: string) => dayjs(dateString).format('MM/DD/YYYY')

// Helper function to get employee display name from taskAssignees
const getAssigneeDisplay = (taskAssignees?: Task['taskAssignees']): { name: string; employee?: any; count: number } => {
  if (!taskAssignees || taskAssignees.length === 0) {
    return { name: '-', count: 0 }
  }

  if (taskAssignees.length === 1) {
    const employee = taskAssignees[0].assignedEmployee
    if (!employee) return { name: '-', count: 0 }

    let name = '-'
    if (employee.displayName) {
      name = employee.displayName
    } else if (employee.firstName || employee.lastName) {
      name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
    }

    return { name, employee, count: 1 }
  }

  // Multiple assignees
  return { name: 'Multiple', count: taskAssignees.length }
}

// Badge variant helpers - use CODE for logic, not value
const getTaskPriorityBadgeVariant = (code?: string | null): 'default' | 'success' | 'warning' | 'destructive' => {
  if (!code) return 'default'

  const codeUpper = code.toUpperCase()

  switch (codeUpper) {
    case TaskPriority.HIGH:
      return 'destructive'
    case TaskPriority.MEDIUM:
      return 'warning'
    case TaskPriority.LOW:
      return 'success'
    default:
      return 'default'
  }
}

const getTaskStatusBadgeVariant = (
  code?: string | null
): 'default' | 'success' | 'warning' | 'destructive' | 'info' => {
  if (!code) return 'default'

  const codeUpper = code.toUpperCase()

  switch (codeUpper) {
    case TaskStatus.COMPLETED:
      return 'success'
    case TaskStatus.IN_PROGRESS:
      return 'info'
    case TaskStatus.OVERDUE:
      return 'destructive'
    case TaskStatus.PENDING:
      return 'warning'
    default:
      return 'default'
  }
}

const getReferenceTypeBadgeVariant = (type?: string): 'default' | 'secondary' | 'outline' => {
  if (!type) return 'outline'
  const typeLower = type.toLowerCase()
  if (typeLower === 'opportunity') return 'default'
  if (typeLower === 'lead') return 'secondary'
  return 'outline'
}

const getTimingTypeIcon = (task: Task) => {
  const timingType = task.taskTiming

  if (!timingType) {
    return { icon: <Clock className="gba:h-4 gba:w-4 gba:text-gray-400" />, tooltip: 'No timing type specified' }
  }

  const timingStr = typeof timingType === 'string' ? timingType : String(timingType)

  switch (timingStr.toUpperCase()) {
    case 'DEADLINE':
      return {
        icon: <Clock className="gba:h-4 gba:w-4 gba:text-destructive" />,
        tooltip: 'Deadline - Complete by this date'
      }
    case 'SCHEDULED':
      return {
        icon: <Calendar className="gba:h-4 gba:w-4 gba:text-info" />,
        tooltip: 'Scheduled - Execute on this specific date'
      }
    default:
      return { icon: <Clock className="gba:h-4 gba:w-4 gba:text-gray-400" />, tooltip: 'Unknown timing type' }
  }
}

/**
 * Default Task Columns based on Task
 * Views can use these as-is, filter, extend, or completely override
 */
export const createTaskColumns = (): ColumnDef<Task>[] => [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Task',
    size: 250,
    cell: ({ row }) => (
      <div
        className="gba:font-medium gba:text-sm gba:truncate gba:max-w-[250px]"
        data-testid={`task-name-${row.original.id}`}
        title={row.original.name}
      >
        {row.original.name}
      </div>
    )
  },
  {
    id: 'assignedTo',
    accessorFn: row => getAssigneeDisplay(row.taskAssignees).name,
    header: 'Assigned To',
    size: 180,
    enableSorting: false,
    cell: ({ row }) => {
      const assigneeInfo = getAssigneeDisplay(row.original.taskAssignees)

      if (assigneeInfo.count === 0) {
        return <span className="gba:text-sm gba:text-muted-foreground">No assignee</span>
      }

      // Multiple assignees - show count badge
      if (assigneeInfo.count > 1) {
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Badge variant="secondary" className="gba:text-xs">
              {assigneeInfo.count} assignees
            </Badge>
          </div>
        )
      }

      // Single assignee - show with avatar
      const employee = assigneeInfo.employee
      if (!employee) {
        return <span className="gba:text-sm gba:text-muted-foreground">No assignee</span>
      }

      const assigneeName = assigneeInfo.name

      return (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            const empId = employee.id
            if (empId) {
              navigateTo(`/platform/employee-record?employeeId=${empId}`)
            }
          }}
          className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:group gba:bg-transparent gba:border-0 gba:p-0 gba:w-full gba:text-left"
          data-testid={`task-assigned-to-link-${row.original.id}`}
        >
          <Avatar className="gba:w-8 gba:h-8 gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:transition-all">
            {employee.pictureThumbnail && (
              <AvatarImage src={`data:image/gif;base64,${employee.pictureThumbnail}`} alt={assigneeName} />
            )}
            <AvatarFallback>
              {(() => {
                if (assigneeName === '-') return 'U'
                const initials = assigneeName
                  .split(' ')
                  .map(n => n[0] || '')
                  .join('')
                  .toUpperCase()
                return initials || 'U'
              })()}
            </AvatarFallback>
          </Avatar>
          <div className="gba:min-w-0 gba:flex-1">
            <div className="gba:font-medium gba:truncate gba:text-sm gba:group-hover:gba:text-primary gba:transition-colors">
              {assigneeName}
            </div>
          </div>
        </button>
      )
    }
  },
  {
    id: 'taskType',
    accessorFn: row => (row.taskType ? getCatalogEntryValue(row.taskType as any) : '-'),
    header: 'Type',
    size: 120,
    cell: ({ row }) => {
      const typeValue = row.original.taskType ? getCatalogEntryValue(row.original.taskType as any) : undefined

      if (!typeValue) return <span className="gba:text-sm gba:text-muted-foreground">No type</span>

      return <span className="gba:text-sm">{typeValue}</span>
    }
  },
  {
    id: 'taskPriority',
    accessorFn: row => (row.taskPriority ? getCatalogEntryValue(row.taskPriority as any) : '-'),
    header: 'Priority',
    size: 120,
    cell: ({ row }) => {
      const priorityCatalog = row.original.taskPriority

      if (!priorityCatalog) return <span className="gba:text-sm gba:text-muted-foreground">No priority</span>

      const priorityValue = getCatalogEntryValue(priorityCatalog as any)
      const priorityCode = priorityCatalog.type || priorityCatalog.code

      return <Badge variant={getTaskPriorityBadgeVariant(priorityCode)}>{priorityValue}</Badge>
    }
  },
  {
    id: 'taskStatus',
    accessorFn: row => (row.taskStatus ? getCatalogEntryValue(row.taskStatus as any) : '-'),
    header: 'Status',
    size: 120,
    cell: ({ row }) => {
      const statusCatalog = row.original.taskStatus

      if (!statusCatalog) return <span className="gba:text-sm gba:text-muted-foreground">No status</span>

      const statusValue = getCatalogEntryValue(statusCatalog as any)
      const statusCode = statusCatalog.type || statusCatalog.code

      return <Badge variant={getTaskStatusBadgeVariant(statusCode)}>{statusValue}</Badge>
    }
  },
  {
    id: 'reference',
    accessorFn: row => row.reference?.name || 'No reference',
    header: 'Reference',
    size: 200,
    cell: ({ row }) => {
      const reference = row.original.reference
      if (!reference || !reference.name) {
        return <span className="gba:text-sm gba:text-muted-foreground">No reference</span>
      }

      return (
        <div className="gba:min-w-0">
          <div className="gba:font-medium gba:text-sm gba:truncate" title={reference.name}>
            {reference.name}
          </div>
          <div className="gba:flex gba:items-center gba:gap-1 gba:mt-1">
            <Badge variant={getReferenceTypeBadgeVariant(reference.type)} className="gba:text-xs">
              {reference.type ? reference.type.charAt(0).toUpperCase() + reference.type.slice(1) : '-'}
            </Badge>
          </div>
        </div>
      )
    }
  },
  {
    id: 'dueDate',
    accessorKey: 'dueDate',
    header: 'Schedule / Due Date',
    size: 150,
    cell: ({ row }) => {
      if (!row.original.dueDate) {
        return <span className="gba:text-sm gba:text-muted-foreground">No due date</span>
      }
      const timingIcon = getTimingTypeIcon(row.original)
      return (
        <div className="gba:flex gba:items-center gba:gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="gba:flex gba:items-center gba:shrink-0">{timingIcon.icon}</div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{timingIcon.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="gba:text-sm">{formatDate(row.original.dueDate)}</span>
        </div>
      )
    }
  },
  {
    id: 'createdBy',
    accessorFn: row => getEmployeeName(row.creatorEmployee),
    header: 'Created By',
    size: 150,
    cell: ({ row }) => {
      if (!row.original.creatorEmployee) {
        return <span className="gba:text-sm gba:text-gray-400">Unknown</span>
      }

      const creatorName = getEmployeeName(row.original.creatorEmployee)

      return (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            const empId = row.original.creatorEmployee?.id
            if (empId) {
              navigateTo(`/platform/employee-record?employeeId=${empId}`)
            }
          }}
          className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:group gba:bg-transparent gba:border-0 gba:p-0 gba:w-full gba:text-left"
          data-testid={`task-creator-link-${row.original.id}`}
        >
          <Avatar className="gba:w-8 gba:h-8 gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:transition-all">
            {row.original.creatorEmployee.pictureThumbnail && (
              <AvatarImage
                src={`data:image/gif;base64,${row.original.creatorEmployee.pictureThumbnail}`}
                alt={creatorName}
              />
            )}
            <AvatarFallback>
              {(() => {
                if (creatorName === '-') return 'U'
                const initials = creatorName
                  .split(' ')
                  .map(n => n[0] || '')
                  .join('')
                  .toUpperCase()
                return initials || 'U'
              })()}
            </AvatarFallback>
          </Avatar>
          <div className="gba:min-w-0 gba:flex-1">
            <div className="gba:font-medium gba:truncate gba:text-sm gba:group-hover:gba:text-primary gba:transition-colors">
              {creatorName}
            </div>
          </div>
        </button>
      )
    }
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: 'Created At',
    size: 120,
    cell: ({ row }) => (
      <div className="gba:text-sm" data-testid={`task-created-at-${row.original.id}`}>
        {formatDate(row.original.createdAt)}
      </div>
    )
  }
]

/**
 * Default column mapping for Task
 * Maps column IDs to GraphQL field paths for sorting
 */
export const defaultTaskColumnMapping: Record<string, string> = {
  // Scalar fields
  name: 'name',
  dueDate: 'dueDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',

  // Catalog fields (Task naming with translated value sorting)
  type: 'taskType.value',
  priority: 'taskPriority.value',
  status: 'taskStatus.value',

  // Employee fields (sort by displayName)
  // Note: assignedTo now uses taskAssignees array - sorting may need adjustment at query level
  assignedTo: 'taskAssignees.assignedEmployee.displayName',
  createdBy: 'creatorEmployee.displayName'
}

/**
 * Create column to GraphQL mapping with custom overrides
 * @param overrides - Custom column ID to GraphQL field mappings
 * @returns Function that maps column ID to GraphQL field path
 */
export const createTaskColumnToGraphQLMapping = (
  overrides: Record<string, string> = {}
): ((columnId: string) => string) => {
  return (columnId: string) => {
    // Override has priority
    if (overrides[columnId]) {
      return overrides[columnId]
    }
    // Then default
    return defaultTaskColumnMapping[columnId] || 'createdAt'
  }
}

export const createTaskSortableColumns = () => {
  const columns = createTaskColumns()
  // Filter out columns that cannot be sorted server-side (computed fields)
  const nonSortableColumns = ['reference'] // reference is computed client-side

  return columns
    .filter(col => col.id && !nonSortableColumns.includes(col.id))
    .map(col => ({
      id: col.id!,
      label: col.header as string
    }))
}
