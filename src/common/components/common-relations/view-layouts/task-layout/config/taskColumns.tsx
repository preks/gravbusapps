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
import type { Task, TaskEmployee } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import { TaskPriority, TaskStatus } from '@/common/data/relations/constants/commonTaskConstants'
import dayjs from 'dayjs'

const formatDate = (dateString: string) => dayjs(dateString).format('MM/DD/YYYY')

// Helper function to get employee display name
const getEmployeeName = (employee: TaskEmployee | null | undefined): string => {
  if (!employee) return '-'
  if (employee.displayName) return employee.displayName
  if (employee.firstName || employee.lastName) {
    return `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
  }
  return '-'
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

const getTimingTypeIcon = (task: any) => {
  // Try to get timing type from different possible fields
  const timingType = task.timingType || task.taskTiming

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

// Reference click handling removed - should be handled by parent TaskView component

export const createTaskColumns = (): ColumnDef<Task>[] => [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Task',
    size: 250,
    cell: ({ row }) => (
      <div className="gba:font-medium gba:text-sm" data-testid={`task-name-${row.original.id}`}>
        {row.original.name}
      </div>
    )
  },
  {
    id: 'assignedTo',
    accessorKey: 'assignedTo',
    header: 'Assigned To',
    size: 180,
    cell: ({ row }) => {
      if (!row.original.assignedTo) {
        return <span className="gba:text-gray-400">-</span>
      }

      const assigneeName = getEmployeeName(row.original.assignedTo)

      return (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            const empId = row.original.assignedTo?.id
            if (empId) {
              navigateTo(`/platform/employee-record?employeeId=${empId}`)
            }
          }}
          className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:group gba:bg-transparent gba:border-0 gba:p-0 gba:w-full gba:text-left"
          data-testid={`task-assigned-to-link-${row.original.id}`}
        >
          <Avatar className="gba:w-8 gba:h-8 gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:transition-all">
            {row.original.assignedTo.pictureThumbnail && (
              <AvatarImage
                src={`data:image/gif;base64,${row.original.assignedTo.pictureThumbnail}`}
                alt={assigneeName}
              />
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
    id: 'type',
    accessorKey: 'type',
    header: 'Type',
    size: 120,
    cell: ({ row }) => {
      // Use taskTypeLabel from mapper or extract from catalog entry
      const typeValue =
        (row.original as any).taskTypeLabel ||
        (typeof row.original.type === 'string' ? row.original.type : getCatalogEntryValue(row.original.type as any))

      if (!typeValue) return <span className="gba:text-gray-400">-</span>

      return <span className="gba:text-sm">{typeValue}</span>
    }
  },
  {
    id: 'priority',
    accessorKey: 'priority',
    header: 'Priority',
    size: 120,
    cell: ({ row }) => {
      const taskPriority = (row.original as any).taskPriority
      const priorityLabel = taskPriority ? getCatalogEntryValue(taskPriority) : undefined
      const priorityType = taskPriority?.type

      if (!priorityLabel) return <span className="gba:text-gray-400">-</span>

      return <Badge variant={getTaskPriorityBadgeVariant(priorityType)}>{priorityLabel}</Badge>
    }
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    size: 120,
    cell: ({ row }) => {
      const taskStatus = (row.original as any).taskStatus
      const statusLabel = taskStatus ? getCatalogEntryValue(taskStatus) : undefined
      const statusType = taskStatus?.type

      if (!statusLabel) return <span className="gba:text-gray-400">-</span>

      return <Badge variant={getTaskStatusBadgeVariant(statusType)}>{statusLabel}</Badge>
    }
  },
  {
    id: 'reference',
    accessorKey: 'reference',
    header: 'Reference',
    size: 200,
    cell: ({ row }) => {
      const reference = row.original.reference
      if (!reference || !reference.name) {
        return <span className="gba:text-gray-400">No reference</span>
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
        return <span className="gba:text-gray-400">-</span>
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
    accessorKey: 'createdBy',
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

export const createTaskSortableColumns = () => {
  const columns = createTaskColumns()
  return columns.map(col => ({
    id: col.id!,
    label: col.header as string
  }))
}
