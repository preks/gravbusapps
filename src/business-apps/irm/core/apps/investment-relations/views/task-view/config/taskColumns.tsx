import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { Clock, Calendar } from 'lucide-react'
import { OwnerDisplay } from '../components/OwnerDisplay'
import { Task, TaskEmployee } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import {
  getTaskStatusBadgeVariant,
  getTaskPriorityBadgeVariant,
  getReferenceTypeBadgeVariant
} from '../utils/taskBadgeUtils'
import dayjs from 'dayjs'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'

const formatDate = (dateString: string) => dayjs(dateString).format('MM/DD/YYYY')

// Helper function to convert TaskEmployee to OwnerEmployee format
const convertToOwnerEmployee = (taskEmployee: TaskEmployee) => ({
  id: taskEmployee.id,
  displayName: taskEmployee.displayName,
  firstName: taskEmployee.firstName,
  lastName: taskEmployee.lastName,
  pictureThumbnail: taskEmployee.pictureThumbnail
})

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

const handleReferenceClick = (reference: Task['reference']) => {
  if (!reference) return

  // Use IRM paths for investment relations
  let url = ''
  switch (reference.type) {
    case 'lead':
      url = buildPlatformUrl('/platform/irm/lead-record', { leadId: reference.id })
      break
    case 'account':
      url = buildPlatformUrl('/platform/irm/account-record', { accountId: reference.id })
      break
    case 'contact':
      url = buildPlatformUrl('/platform/irm/contact-record', { contactId: reference.id })
      break
    case 'opportunity':
      url = buildPlatformUrl('/platform/irm/opportunity-record', { opportunityId: reference.id })
      break
    case 'investment':
      url = buildPlatformUrl('/platform/irm/investment-record', { investmentId: reference.id })
      break
    default:
      return
  }
  navigateTo(url)
}

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
    cell: ({ row }) => (
      <OwnerDisplay
        ownerEmployee={convertToOwnerEmployee(row.original.assignedTo)}
        entityId={row.original.id}
        testIdPrefix="task-assigned-to"
      />
    )
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
      // Use taskPriorityLabel from mapper or extract from catalog entry
      const priorityValue =
        (row.original as any).taskPriorityLabel ||
        (typeof row.original.priority === 'string'
          ? row.original.priority
          : getCatalogEntryValue(row.original.priority as any))

      if (!priorityValue) return <span className="gba:text-gray-400">-</span>

      return <Badge variant={getTaskPriorityBadgeVariant(priorityValue)}>{priorityValue}</Badge>
    }
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    size: 120,
    cell: ({ row }) => {
      // Use taskStatusLabel from mapper or extract from catalog entry
      const statusValue =
        (row.original as any).taskStatusLabel ||
        (typeof row.original.status === 'string'
          ? row.original.status
          : getCatalogEntryValue(row.original.status as any))

      if (!statusValue) return <span className="gba:text-gray-400">-</span>

      return <Badge variant={getTaskStatusBadgeVariant(statusValue)}>{statusValue}</Badge>
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
        <div
          className="gba:cursor-pointer gba:hover:bg-gray-50 gba:p-2 gba:rounded gba:transition-colors"
          onClick={e => {
            e.stopPropagation()
            handleReferenceClick(reference)
          }}
          data-testid={`task-reference-link-${row.original.id}`}
        >
          <div className="gba:font-medium gba:text-sm">{reference.name}</div>
          <div className="gba:flex gba:items-center gba:gap-1 gba:mt-1">
            <Badge variant={getReferenceTypeBadgeVariant(reference.type)} className="gba:text-xs">
              {reference.type ? reference.type.charAt(0).toUpperCase() + reference.type.slice(1) : '-'}
            </Badge>
            {reference.description && <span className="gba:text-xs gba:text-gray-500">{reference.description}</span>}
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
    cell: ({ row }) =>
      row.original.creatorEmployee ? (
        <OwnerDisplay
          ownerEmployee={convertToOwnerEmployee(row.original.creatorEmployee)}
          entityId={row.original.id}
          testIdPrefix="task-creator"
        />
      ) : (
        <span className="gba:text-sm gba:text-gray-400">Unknown</span>
      )
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
