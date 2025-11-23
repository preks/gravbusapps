import React, { useMemo } from 'react'
import { Calendar, Clock, Warning } from '@phosphor-icons/react'
import { Bug, ChevronUp, ChevronDown } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { StepStatus } from '../../packages/services-plus-core/src'
import type { StepInstance } from '../../types'
import { formatRequestId, formatStatusText } from '../../utils'
import { useEmployeeNamesBatch } from '../../hooks/useEmployeeNamesBatch'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { useDeskTablePreferencesSimple } from '../../hooks/useDeskTablePreferencesSimple'
import { navigateTo } from '@/common/utils/navigationUtils'
import type { ColumnConfig } from '@/components/dataController'
import { formatDate, formatTime } from '../../config/dateTimeConfig'

// Import nw-design-system components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Spinner,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger
} from '@newwork/nw-design-system'

// Filter group interface
export interface FilterGroup {
  id: string
  title: string
  filters: {
    id: string
    label: string
    value: string
    selected: boolean
  }[]
}

// Ticket action interface
export interface TicketAction {
  type: 'claim' | 'unclaim' | 'view' | 'debug' | 'custom'
  label: string
  icon?: React.ReactNode
  onClick: (ticket: StepInstance) => void
  show: (ticket: StepInstance, currentUserId?: string) => boolean
  disabled?: (ticket: StepInstance) => boolean
  testId?: string
  title?: string
}

// Props interface
export interface TicketTableProps extends Omit<BusinessAppContextProps, 'children'> {
  // Data
  tickets: StepInstance[]
  isLoading: boolean

  // Configuration
  tableId: string // For preferences scoping (e.g., "deskQueue_HR", "completedTickets")

  // Customization
  customColumns?: ColumnConfig[] // Override default columns
  filterGroups?: FilterGroup[] // Custom filter groups
  actions?: TicketAction[] // Custom actions per ticket

  // Callbacks
  onTicketSelect?: (ticket: StepInstance) => void
  onTaskSelect?: (taskId: string, deskKey: string) => void // Original callback for title clicks
  onDebugTicket?: (ticket: StepInstance) => void

  // Context for onTaskSelect
  deskKey?: string

  // Display options
  showDebug?: boolean
  emptyMessage?: string
  emptySearchMessage?: string
}

// Priority options for urgency level mapping
const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: '#ff4d4f' },
  { value: 'high', label: 'High', color: '#ff7a45' },
  { value: 'medium', label: 'Medium', color: '#faad14' },
  { value: 'low', label: 'Low', color: '#52c41a' }
]

// Calculate SLA due date based on ticket data
const calculateSLADue = (ticket: StepInstance): Date | null => {
  if (!ticket.startedAt) return null

  // Default SLA hours based on urgency level from API
  const slaHours = {
    critical: 4,
    high: 8,
    medium: 24,
    low: 72
  }

  // Use actual urgency_level from API response instead of random generation
  const urgencyLevel = (ticket as any).urgency_level || 'medium'
  const hours = slaHours[urgencyLevel as keyof typeof slaHours] || 24

  const startDate = new Date(ticket.startedAt)
  const dueDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000)
  return dueDate
}

// Format SLA status
const getSLAStatus = (dueDate: Date | null): { status: 'ok' | 'warning' | 'overdue'; color: string } => {
  if (!dueDate) return { status: 'ok', color: '#52c41a' }

  const now = new Date()
  const timeDiff = dueDate.getTime() - now.getTime()
  const hoursLeft = timeDiff / (1000 * 60 * 60)

  if (hoursLeft < 0) return { status: 'overdue', color: '#ff4d4f' }
  if (hoursLeft < 2) return { status: 'warning', color: '#faad14' }
  return { status: 'ok', color: '#52c41a' }
}

// Sortable table header component
const SortableTableHead: React.FC<{
  children: React.ReactNode
  field: string
  currentSortField: string
  currentSortOrder: 'ASC' | 'DESC'
  onSort: (field: string, order: 'ASC' | 'DESC' | '') => void
  className?: string
}> = ({ children, field, currentSortField, currentSortOrder, onSort, className }) => {
  const isSorted = currentSortField === field
  const nextOrder = isSorted ? (currentSortOrder === 'ASC' ? 'DESC' : '') : 'ASC'

  return (
    <TableHead
      className={`gba:cursor-pointer gba:select-none gba:hover:gba:bg-gray-100 gba:transition-colors ${className || ''}`}
      onClick={() => onSort(field, nextOrder)}
    >
      <div className="gba:flex gba:items-center gba:gap-1">
        {children}
        {isSorted &&
          (currentSortOrder === 'ASC' ? (
            <ChevronUp className="gba:w-4 gba:h-4" />
          ) : (
            <ChevronDown className="gba:w-4 gba:h-4" />
          ))}
      </div>
    </TableHead>
  )
}

// Enhanced Employee Display Component with Avatar (similar to investment lead view)
const EnhancedEmployeeDisplay: React.FC<{
  userId: string
  displayName: string
  employeeData?: any // Full employee data from batch fetch (for future profile picture support)
  testId?: string
  showTooltip?: boolean
}> = ({ userId, displayName, employeeData, testId, showTooltip = true }) => {
  // Helper function to get employee initials
  const getInitials = (name: string) => {
    if (!name || name === '-') return 'U'
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) // Max 2 characters
  }

  // Handle click to navigate to employee record
  const handleEmployeeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (userId && userId !== 'unknown' && employeeData?.id) {
      const employeeId = employeeData.id
      navigateTo(`/platform/employee-record?employeeId=${employeeId}`)
    }
  }

  const avatarDisplay = (
    <div
      className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer hover:gba:bg-transparent focus:gba:bg-transparent gba:group gba:p-1 gba:rounded gba:transition-colors hover:gba:bg-gray-100"
      data-testid={testId}
      onClick={handleEmployeeClick}
    >
      <Avatar
        size="sm"
        className="gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:rounded-full"
      >
        {/* Future: Profile picture support when available in employee data */}
        {employeeData?.pictureThumbnail && (
          <AvatarImage
            src={`data:image/png;base64,${employeeData.pictureThumbnail}`}
            alt={displayName}
            onError={e => {
              // Try different image formats if PNG fails
              const target = e.target as HTMLImageElement
              if (target.src.includes('png')) {
                target.src = `data:image/jpeg;base64,${employeeData.pictureThumbnail}`
              } else if (target.src.includes('jpeg')) {
                target.src = `data:image/gif;base64,${employeeData.pictureThumbnail}`
              }
            }}
          />
        )}
        <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
      </Avatar>
      <span className="gba:text-sm gba:group-hover:gba:text-blue-600 gba:transition-colors">{displayName}</span>
    </div>
  )

  if (showTooltip && userId && userId !== 'unknown') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{avatarDisplay}</TooltipTrigger>
          <TooltipContent>
            <p>Click to view employee profile</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return avatarDisplay
}

export const TicketTable: React.FC<TicketTableProps> = ({
  // Data
  tickets,
  isLoading,

  // Configuration
  tableId,

  // Customization
  customColumns,
  filterGroups: customFilterGroups,
  actions = [],

  // Callbacks
  onTicketSelect,
  onTaskSelect,
  onDebugTicket,

  // Context for onTaskSelect
  deskKey,

  // Display options
  showDebug = false,
  emptyMessage,
  emptySearchMessage,

  // Context
  accessToken,
  userInfo
}) => {
  // Desk-scoped table preferences - simple and bulletproof
  const {
    search,
    setSearch,
    sortField,
    sortOrder,
    selectedFilters,
    setSelectedFilters,
    columnConfig: rawColumnConfig,
    handleSortingChange,
    handleFilterChange,
    handleColumnVisibilityChange,
    isLoading: preferencesLoading
  } = useDeskTablePreferencesSimple(tableId)

  // Use custom columns if provided, otherwise use saved preferences or defaults
  const columnConfig = useMemo(() => {
    if (customColumns) {
      // Merge custom columns with saved visibility preferences
      return customColumns.map(customCol => {
        const savedCol = rawColumnConfig.find(saved => saved.id === customCol.id)
        return {
          ...customCol,
          visible: savedCol ? savedCol.visible : customCol.visible
        }
      })
    }

    // Filter out debug column if not shown
    const filteredColumns = rawColumnConfig.filter(col => showDebug || col.id !== 'debug')

    return filteredColumns
  }, [customColumns, rawColumnConfig, showDebug])

  // Calculate visible columns from column configuration
  const visibleColumns = useMemo(() => {
    return columnConfig.filter(col => col.visible).map(col => col.id)
  }, [columnConfig])

  // Extract all userIds from tickets for batch fetching
  const allUserIds = useMemo(() => {
    if (!tickets) return []

    const userIds: string[] = []
    for (const ticket of tickets) {
      // Add requester user IDs (flowInitiatedBy takes priority over requesterId)
      const requesterUserId = ticket.flowInitiatedBy || ticket.requesterId
      if (requesterUserId && requesterUserId !== 'unknown') {
        userIds.push(requesterUserId)
      }

      // Add assignee user IDs
      if (ticket.assignedToUserId) userIds.push(ticket.assignedToUserId)
      if (ticket.claimedByUserId) userIds.push(ticket.claimedByUserId)
    }

    // Remove duplicates
    return [...new Set(userIds)]
  }, [tickets])

  // Batch fetch employee names and data for all users in the table
  const { displayNames: batchedDisplayNames, employees: batchedEmployees } = useEmployeeNamesBatch({
    userIds: allUserIds,
    accessToken,
    enabled: allUserIds.length > 0
  })

  // Generate unique people filters from current tickets
  const peopleFilters = useMemo(() => {
    if (!tickets) return { requesters: [], assignees: [] }

    const requesterSet = new Set<string>()
    const assigneeSet = new Set<string>()

    tickets.forEach(ticket => {
      // Collect requester info
      const requesterUserId = ticket.flowInitiatedBy || ticket.requesterId
      const requesterName = requesterUserId ? batchedDisplayNames.get(requesterUserId) : null
      if (requesterName) {
        requesterSet.add(`requester:${requesterUserId}:${requesterName}`)
      }

      // Collect assignee info (both assigned and claimed users)
      if (ticket.assignedToUserId) {
        const assigneeName = batchedDisplayNames.get(ticket.assignedToUserId)
        if (assigneeName) {
          assigneeSet.add(`assignee:${ticket.assignedToUserId}:${assigneeName}`)
        }
      }

      if (ticket.claimedByUserId) {
        const claimerName = batchedDisplayNames.get(ticket.claimedByUserId)
        if (claimerName) {
          assigneeSet.add(`assignee:${ticket.claimedByUserId}:${claimerName}`)
        }
      }
    })

    return {
      requesters: Array.from(requesterSet)
        .map(item => {
          const [, userId, name] = item.split(':')
          return {
            id: `requester:${userId}`,
            label: name,
            value: userId,
            selected: selectedFilters.includes(`requester:${userId}`)
          }
        })
        .sort((a, b) => a.label.localeCompare(b.label)),

      assignees: Array.from(assigneeSet)
        .map(item => {
          const [, userId, name] = item.split(':')
          return {
            id: `assignee:${userId}`,
            label: name,
            value: userId,
            selected: selectedFilters.includes(`assignee:${userId}`)
          }
        })
        .sort((a, b) => a.label.localeCompare(b.label))
    }
  }, [tickets, batchedDisplayNames, selectedFilters])

  // Default filter groups with dynamic selected state (after peopleFilters)
  const defaultFilterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: 'status',
        title: 'Status',
        filters: [
          // Core statuses
          {
            id: 'status:SCHEDULED',
            label: 'Scheduled',
            value: 'SCHEDULED',
            selected: selectedFilters.includes('status:SCHEDULED')
          },
          { id: 'status:OPEN', label: 'Open', value: 'OPEN', selected: selectedFilters.includes('status:OPEN') },
          {
            id: 'status:IN_PROGRESS',
            label: 'In Progress',
            value: 'IN_PROGRESS',
            selected: selectedFilters.includes('status:IN_PROGRESS')
          },
          {
            id: 'status:COMPLETED',
            label: 'Completed',
            value: 'COMPLETED',
            selected: selectedFilters.includes('status:COMPLETED')
          },
          {
            id: 'status:REJECTED',
            label: 'Rejected',
            value: 'REJECTED',
            selected: selectedFilters.includes('status:REJECTED')
          },
          {
            id: 'status:FAILED',
            label: 'Failed',
            value: 'FAILED',
            selected: selectedFilters.includes('status:FAILED')
          },
          { id: 'status:PAUSED', label: 'Paused', value: 'PAUSED', selected: selectedFilters.includes('status:PAUSED') }
        ]
      },
      {
        id: 'assignmentStatus',
        title: 'Assignment',
        filters: [
          {
            id: 'assignment:ASSIGNED',
            label: 'Assigned',
            value: 'ASSIGNED',
            selected: selectedFilters.includes('assignment:ASSIGNED')
          },
          {
            id: 'assignment:CLAIMED',
            label: 'Claimed',
            value: 'CLAIMED',
            selected: selectedFilters.includes('assignment:CLAIMED')
          },
          {
            id: 'assignment:UNASSIGNED',
            label: 'Unassigned',
            value: 'UNASSIGNED',
            selected: selectedFilters.includes('assignment:UNASSIGNED')
          }
        ]
      },
      {
        id: 'urgency',
        title: 'Urgency',
        filters: [
          { id: 'urgency:HIGH', label: 'High', value: 'HIGH', selected: selectedFilters.includes('urgency:HIGH') },
          {
            id: 'urgency:MEDIUM',
            label: 'Medium',
            value: 'MEDIUM',
            selected: selectedFilters.includes('urgency:MEDIUM')
          },
          { id: 'urgency:LOW', label: 'Low', value: 'LOW', selected: selectedFilters.includes('urgency:LOW') }
        ]
      },
      ...(peopleFilters.requesters.length > 0
        ? [
            {
              id: 'requester',
              title: 'Requester',
              filters: peopleFilters.requesters
            }
          ]
        : []),
      ...(peopleFilters.assignees.length > 0
        ? [
            {
              id: 'assignee',
              title: 'Assignee',
              filters: peopleFilters.assignees
            }
          ]
        : [])
    ],
    [selectedFilters, peopleFilters]
  )

  // Use custom filter groups if provided, otherwise use defaults with dynamic selected state
  const filterGroups = useMemo(() => {
    if (customFilterGroups && customFilterGroups.length > 0) {
      // Update custom filter groups with current selected state
      return customFilterGroups.map(group => ({
        ...group,
        filters: group.filters.map(filter => ({
          ...filter,
          selected: selectedFilters.includes(filter.id)
        }))
      }))
    }
    return defaultFilterGroups
  }, [customFilterGroups, selectedFilters, defaultFilterGroups])

  // Create filter label map for displaying human-readable names in badges
  const filterLabelMap = useMemo(() => {
    const labelMap: Record<string, string> = {}

    // Add people filter labels
    peopleFilters.requesters.forEach(filter => {
      labelMap[filter.id] = filter.label
    })

    peopleFilters.assignees.forEach(filter => {
      labelMap[filter.id] = filter.label
    })

    // Add static filter labels for better display
    labelMap['status:SCHEDULED'] = 'Scheduled'
    labelMap['status:OPEN'] = 'Open'
    labelMap['status:IN_PROGRESS'] = 'In Progress'
    labelMap['status:COMPLETED'] = 'Completed'
    labelMap['status:REJECTED'] = 'Rejected'
    labelMap['status:FAILED'] = 'Failed'
    labelMap['status:PAUSED'] = 'Paused'
    labelMap['assignment:ASSIGNED'] = 'Assigned'
    labelMap['assignment:CLAIMED'] = 'Claimed'
    labelMap['assignment:UNASSIGNED'] = 'Unassigned'
    labelMap['urgency:HIGH'] = 'High Priority'
    labelMap['urgency:MEDIUM'] = 'Medium Priority'
    labelMap['urgency:LOW'] = 'Low Priority'

    return labelMap
  }, [peopleFilters])

  // Get current user ID for action permissions
  const currentUserId = userInfo?.employeeDetails?.employeeId

  // Enhanced filtering with search and client-side operations
  const filteredTickets = useMemo(() => {
    if (!tickets) return []

    let filteredList = [...tickets]

    // Apply filters if any are selected - OR within groups, AND between groups
    if (selectedFilters.length > 0) {
      filteredList = filteredList.filter(ticket => {
        // Group filters by type
        const statusFilters = selectedFilters.filter(f => f.startsWith('status:'))
        const assignmentFilters = selectedFilters.filter(f => f.startsWith('assignment:'))
        const urgencyFilters = selectedFilters.filter(f => f.startsWith('urgency:'))
        const requesterFilters = selectedFilters.filter(f => f.startsWith('requester:'))
        const assigneeFilters = selectedFilters.filter(f => f.startsWith('assignee:'))

        // Check each group - if any filters in a group are selected, at least one must match
        const statusMatch =
          statusFilters.length === 0 ||
          statusFilters.some(filterId => {
            const status = filterId.replace('status:', '')
            return ticket.status === status
          })

        const assignmentMatch =
          assignmentFilters.length === 0 ||
          assignmentFilters.some(filterId => {
            const assignmentType = filterId.replace('assignment:', '')
            if (assignmentType === 'ASSIGNED') {
              return ticket.assignedToUserId && !ticket.claimedByUserId
            } else if (assignmentType === 'CLAIMED') {
              return ticket.claimedByUserId
            } else if (assignmentType === 'UNASSIGNED') {
              return !ticket.assignedToUserId && !ticket.claimedByUserId
            }
            return false
          })

        const urgencyMatch =
          urgencyFilters.length === 0 ||
          urgencyFilters.some(filterId => {
            const urgency = filterId.replace('urgency:', '')
            const ticketUrgency = (ticket as any).urgency_level || (ticket as any).urgency || 'MEDIUM'
            return ticketUrgency.toUpperCase() === urgency
          })

        // Check requester filters
        const requesterMatch =
          requesterFilters.length === 0 ||
          requesterFilters.some(filterId => {
            const userId = filterId.replace('requester:', '')
            const ticketRequesterUserId = ticket.flowInitiatedBy || ticket.requesterId
            return ticketRequesterUserId === userId
          })

        // Check assignee filters (both assigned and claimed users)
        const assigneeMatch =
          assigneeFilters.length === 0 ||
          assigneeFilters.some(filterId => {
            const userId = filterId.replace('assignee:', '')
            return ticket.assignedToUserId === userId || ticket.claimedByUserId === userId
          })

        // AND logic between groups: ticket must match ALL non-empty groups
        return statusMatch && assignmentMatch && urgencyMatch && requesterMatch && assigneeMatch
      })
    }

    // Apply search filter if search term exists
    if (search.trim()) {
      const searchLower = search.toLowerCase()

      filteredList = filteredList.filter(ticket => {
        // Basic ticket fields
        const basicMatch =
          ticket.name?.toLowerCase().includes(searchLower) ||
          ticket.id.toLowerCase().includes(searchLower) ||
          ticket.requestId?.toLowerCase().includes(searchLower) ||
          ticket.requesterId?.toLowerCase().includes(searchLower) ||
          ticket.requesterName?.toLowerCase().includes(searchLower) ||
          // Also search in formatted Request ID (REQ-XXXXX format)
          (ticket.requestId ? formatRequestId(ticket.requestId).toLowerCase().includes(searchLower) : false) ||
          // Search in requester details (flowInitiatedBy user)
          ticket.flowInitiatedBy?.toLowerCase().includes(searchLower) ||
          // Search in assignee details
          ticket.assignedToUserId?.toLowerCase().includes(searchLower) ||
          ticket.claimedByUserId?.toLowerCase().includes(searchLower)

        if (basicMatch) return true

        // Search in resolved employee display names - check all possible user roles
        // For requester, use the same logic as the display: flowInitiatedBy || requesterId
        const requesterUserId = ticket.flowInitiatedBy || ticket.requesterId
        const requesterDisplayName = requesterUserId ? batchedDisplayNames.get(requesterUserId) : null
        const assigneeDisplayName = ticket.assignedToUserId ? batchedDisplayNames.get(ticket.assignedToUserId) : null
        const claimerDisplayName = ticket.claimedByUserId ? batchedDisplayNames.get(ticket.claimedByUserId) : null

        const nameMatch =
          requesterDisplayName?.toLowerCase().includes(searchLower) ||
          assigneeDisplayName?.toLowerCase().includes(searchLower) ||
          claimerDisplayName?.toLowerCase().includes(searchLower)

        return nameMatch
      })
    }

    // Apply sorting
    if (sortField && sortOrder) {
      filteredList.sort((a, b) => {
        let aValue: any
        let bValue: any

        // Get the values to compare based on the sort field
        switch (sortField) {
          case 'requestId':
            aValue = a.requestId || ''
            bValue = b.requestId || ''
            break
          case 'name':
            aValue = a.name || ''
            bValue = b.name || ''
            break
          case 'requesterName':
            // Use the same logic as display: get name from batch or fallback to requesterName
            const aRequesterUserId = a.flowInitiatedBy || a.requesterId
            const bRequesterUserId = b.flowInitiatedBy || b.requesterId
            aValue = (aRequesterUserId ? batchedDisplayNames.get(aRequesterUserId) : null) || a.requesterName || ''
            bValue = (bRequesterUserId ? batchedDisplayNames.get(bRequesterUserId) : null) || b.requesterName || ''
            break
          case 'status':
            aValue = a.status || ''
            bValue = b.status || ''
            break
          case 'assignedToUserId':
            // Sort by assignee display name
            aValue = a.assignedToUserId ? batchedDisplayNames.get(a.assignedToUserId) || a.assignedToUserId : ''
            bValue = b.assignedToUserId ? batchedDisplayNames.get(b.assignedToUserId) || b.assignedToUserId : ''
            break
          case 'slaDue':
            // Sort by SLA due date
            const aSLADue = calculateSLADue(a)
            const bSLADue = calculateSLADue(b)
            // Tickets without SLA due dates go to the end
            aValue = aSLADue ? aSLADue.getTime() : Number.MAX_SAFE_INTEGER
            bValue = bSLADue ? bSLADue.getTime() : Number.MAX_SAFE_INTEGER
            break
          case 'updatedAt':
            // Use the same logic as display: updatedAt || startedAt || Date.now()
            const aDate = a.updatedAt ? new Date(a.updatedAt) : new Date(a.startedAt || Date.now())
            const bDate = b.updatedAt ? new Date(b.updatedAt) : new Date(b.startedAt || Date.now())

            // Handle invalid dates
            aValue = isNaN(aDate.getTime()) ? Date.now() : aDate.getTime()
            bValue = isNaN(bDate.getTime()) ? Date.now() : bDate.getTime()
            break
          default:
            aValue = ''
            bValue = ''
        }

        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase())
          return sortOrder === 'ASC' ? comparison : -comparison
        }

        // Handle numeric comparison (for dates)
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'ASC' ? aValue - bValue : bValue - aValue
        }

        return 0
      })
    }

    return filteredList
  }, [tickets, selectedFilters, search, batchedDisplayNames, sortField, sortOrder])

  // Total count for display
  const totalCount = filteredTickets.length

  // Get status variant for badges
  const getStatusVariant = (status: StepStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'SCHEDULED':
      case 'READY':
      case 'QUEUED':
        return 'secondary'
      case 'IN_PROGRESS':
      case 'RUNNING':
        return 'default'
      case 'COMPLETED':
      case 'DONE':
      case 'SKIPPED':
        return 'outline'
      case 'FAILED':
      case 'ERROR':
      case 'REJECTED':
      case 'CANCELLED':
      case 'CANCELED':
      case 'TIMED_OUT':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // Loading state - wait for both preferences and tickets
  if ((isLoading || preferencesLoading) && filteredTickets.length === 0) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:h-64"
        data-testid={`ticket-table-${tableId.toLowerCase()}-loading`}
      >
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
          <Spinner size="lg" />
          <span className="gba:text-sm gba:text-muted-foreground">
            {preferencesLoading ? 'Loading preferences...' : 'Loading tickets...'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div data-testid={`ticket-table-${tableId.toLowerCase()}`} className="gba:w-full">
      <DataContainer
        dataControllerProps={{
          search,
          setSearch,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: setSelectedFilters,
          filterLabelMap: filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Tickets</span>
                <span className="gba:text-gray-500">({totalCount})</span>
              </div>
            </div>
          ),
          columnVisibility: {
            columns: columnConfig,
            onColumnVisibilityChange: handleColumnVisibilityChange,
            'data-testid': `ticket-table-${tableId.toLowerCase()}-column-visibility`
          }
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
          <div className="gba:bg-white gba:rounded-lg gba:border">
            <Table>
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-gray-50">
                  {visibleColumns.includes('requestId') && (
                    <SortableTableHead
                      field="requestId"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSortingChange}
                    >
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.requestId', 'Request ID')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('stepName') && (
                    <SortableTableHead
                      field="name"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSortingChange}
                    >
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.stepName', 'Ticket Title')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('requester') && (
                    <SortableTableHead
                      field="requesterName"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSortingChange}
                    >
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.requester', 'Requester')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('status') && (
                    <SortableTableHead
                      field="status"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSortingChange}
                    >
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.status', 'Status')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('urgency') && (
                    <TableHead className="gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.urgency', 'Urgency')}
                    </TableHead>
                  )}
                  {visibleColumns.includes('slaDue') && (
                    <SortableTableHead
                      field="slaDue"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSortingChange}
                      className="gba:whitespace-nowrap"
                    >
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.slaDue', 'SLA Due')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('assignee') && (
                    <SortableTableHead
                      field="assignedToUserId"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSortingChange}
                    >
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.assignee', 'Assignee')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('updated') && (
                    <SortableTableHead
                      field="updatedAt"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSortingChange}
                    >
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.updated', 'Updated')}
                    </SortableTableHead>
                  )}
                  {visibleColumns.includes('debug') && (
                    <TableHead className="gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.debug', 'Debug')}
                    </TableHead>
                  )}
                  {visibleColumns.includes('actions') && (
                    <TableHead className="gba:w-[180px] gba:whitespace-nowrap">
                      {getTranslationFromI18nKeyAndLabel('services.queue.columns.actions', 'Actions')}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
                      className="gba:text-center gba:py-8 gba:text-muted-foreground"
                    >
                      <div className="gba:mb-2">
                        {search.trim()
                          ? emptySearchMessage ||
                            getTranslationFromI18nKeyAndLabel(
                              'services.queue.searchEmpty',
                              'No tickets found matching your search'
                            )
                          : emptyMessage ||
                            getTranslationFromI18nKeyAndLabel('services.queue.empty', 'No tickets found')}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map(ticket => (
                    <TableRow
                      key={ticket.id}
                      className="gba:border-b gba:hover:gba:bg-gray-50 gba:cursor-pointer gba:transition-colors"
                      onClick={() => onTicketSelect?.(ticket)}
                    >
                      {visibleColumns.includes('requestId') && (
                        <TableCell className="gba:align-middle">
                          <code
                            className="gba:text-sm gba:font-mono gba:bg-muted gba:px-2 gba:py-1 gba:rounded gba:text-muted-foreground"
                            data-testid={`request-id-${ticket.requestId}`}
                          >
                            {ticket.requestId ? formatRequestId(ticket.requestId) : 'N/A'}
                          </code>
                        </TableCell>
                      )}
                      {visibleColumns.includes('stepName') && (
                        <TableCell className="gba:align-middle">
                          <div className="gba:max-w-xs">
                            <div
                              className="gba:font-medium gba:text-sm gba:text-blue-600 hover:gba:text-blue-800 gba:cursor-pointer gba:hover:underline gba:break-words"
                              onClick={e => {
                                e.stopPropagation()
                                if (onTaskSelect && deskKey) {
                                  onTaskSelect(ticket.id, deskKey)
                                } else {
                                  onTicketSelect?.(ticket)
                                }
                              }}
                              data-testid={`step-name-${ticket.id}`}
                            >
                              {ticket.name}
                            </div>
                            <div className="gba:text-xs gba:text-muted-foreground gba:break-words gba:whitespace-normal">
                              {ticket.flowName || `ID: ${ticket.id}`}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('requester') && (
                        <TableCell className="gba:align-middle">
                          {(() => {
                            const requesterUserId = ticket.flowInitiatedBy || ticket.requesterId
                            const requesterName = requesterUserId ? batchedDisplayNames.get(requesterUserId) : null
                            const displayName = requesterName || ticket.requesterName || 'Unknown User'

                            if (!requesterUserId || requesterUserId === 'unknown') {
                              return <span className="gba:text-gray-400">{displayName}</span>
                            }

                            return (
                              <EnhancedEmployeeDisplay
                                userId={requesterUserId}
                                displayName={displayName}
                                employeeData={batchedEmployees.get(requesterUserId)}
                                testId={`requester-${ticket.id}`}
                                showTooltip={true}
                              />
                            )
                          })()}
                        </TableCell>
                      )}
                      {visibleColumns.includes('status') && (
                        <TableCell className="gba:align-middle">
                          <Badge
                            variant={getStatusVariant(ticket.status)}
                            data-testid={`status-badge-${ticket.status}`}
                            className="gba:text-xs"
                          >
                            {formatStatusText(ticket.status)}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.includes('urgency') && (
                        <TableCell className="gba:align-middle">
                          {(() => {
                            const urgencyLevel = (ticket as any).urgency_level || 'medium'
                            const priorityOption = PRIORITY_OPTIONS.find(p => p.value === urgencyLevel)
                            const variant =
                              urgencyLevel === 'critical' || urgencyLevel === 'high'
                                ? 'destructive'
                                : urgencyLevel === 'medium'
                                  ? 'default'
                                  : 'secondary'
                            return (
                              <Badge variant={variant} className="gba:text-xs" data-testid={`urgency-${ticket.id}`}>
                                {priorityOption?.label || urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1)}
                              </Badge>
                            )
                          })()}
                        </TableCell>
                      )}
                      {visibleColumns.includes('slaDue') && (
                        <TableCell className="gba:align-middle">
                          {(() => {
                            const dueDate = calculateSLADue(ticket)
                            if (!dueDate) {
                              return <span className="gba:text-muted-foreground gba:text-xs">-</span>
                            }

                            const slaStatus = getSLAStatus(dueDate)
                            const now = new Date()
                            const isOverdue = dueDate < now

                            return (
                              <div className="gba:flex gba:items-center gba:gap-2">
                                {isOverdue && <Warning className="gba:w-3 gba:h-3 gba:text-destructive" />}
                                {!isOverdue && slaStatus.status === 'warning' && (
                                  <Clock className="gba:w-3 gba:h-3 gba:text-warning" />
                                )}
                                <div>
                                  <div
                                    className={`gba:text-xs ${slaStatus.status === 'overdue' ? 'gba:text-destructive' : slaStatus.status === 'warning' ? 'gba:text-warning' : 'gba:text-success'}`}
                                  >
                                    {formatDate(dueDate)}
                                  </div>
                                  <div className="gba:text-xs gba:text-muted-foreground">{formatTime(dueDate)}</div>
                                </div>
                              </div>
                            )
                          })()}
                        </TableCell>
                      )}
                      {visibleColumns.includes('assignee') && (
                        <TableCell className="gba:align-middle">
                          {(() => {
                            // Priority: claimedByUserId > assignedToUserId
                            const assigneeUserId = ticket.claimedByUserId || ticket.assignedToUserId
                            const assigneeName = assigneeUserId ? batchedDisplayNames.get(assigneeUserId) : null

                            if (!assigneeUserId) {
                              return (
                                <span className="gba:text-muted-foreground gba:text-sm">
                                  {getTranslationFromI18nKeyAndLabel('services.queue.unassigned', 'Unassigned')}
                                </span>
                              )
                            }

                            const displayName =
                              assigneeName || (ticket.claimedByUserId ? 'Claimed User' : 'Assigned User')

                            return (
                              <div className="gba:flex gba:flex-col gba:gap-1">
                                <EnhancedEmployeeDisplay
                                  userId={assigneeUserId}
                                  displayName={displayName}
                                  employeeData={batchedEmployees.get(assigneeUserId)}
                                  testId={`assignee-${ticket.id}`}
                                  showTooltip={true}
                                />
                              </div>
                            )
                          })()}
                        </TableCell>
                      )}
                      {visibleColumns.includes('updated') && (
                        <TableCell className="gba:align-middle">
                          {(() => {
                            const date = ticket.updatedAt
                              ? new Date(ticket.updatedAt)
                              : new Date(ticket.startedAt || Date.now())
                            return (
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <Calendar className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
                                <div>
                                  <div className="gba:text-xs gba:text-foreground">{formatDate(date)}</div>
                                  <div className="gba:text-xs gba:text-muted-foreground">{formatTime(date)}</div>
                                </div>
                              </div>
                            )
                          })()}
                        </TableCell>
                      )}
                      {visibleColumns.includes('debug') && (
                        <TableCell className="gba:align-middle" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDebugTicket?.(ticket)}
                            data-testid={`debug-ticket-${ticket.id}`}
                            className="gba:gap-1 gba:text-xs"
                            title={getTranslationFromI18nKeyAndLabel(
                              'services.queue.actions.debug.tooltip',
                              'Show debug data from flow engine'
                            )}
                          >
                            <Bug className="gba:w-3 gba:h-3" />
                            <span className="gba:hidden md:gba:inline">
                              {getTranslationFromI18nKeyAndLabel('services.queue.actions.debug', 'Debug')}
                            </span>
                          </Button>
                        </TableCell>
                      )}
                      {visibleColumns.includes('actions') && (
                        <TableCell className="gba:align-middle" onClick={e => e.stopPropagation()}>
                          <div className="gba:flex gba:gap-2 gba:flex-nowrap">
                            {actions.map((action, index) => {
                              if (!action.show(ticket, currentUserId)) return null

                              return (
                                <Button
                                  key={`${action.type}-${index}`}
                                  variant={action.type === 'view' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => action.onClick(ticket)}
                                  disabled={action.disabled?.(ticket)}
                                  data-testid={action.testId || `${action.type}-ticket-${ticket.id}`}
                                  className="gba:gap-1 gba:text-xs"
                                  title={action.title}
                                >
                                  {action.icon}
                                  {action.label}
                                </Button>
                              )
                            })}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        }
      />
    </div>
  )
}
