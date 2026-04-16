import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import {
  UserIcon,
  CalendarBlankIcon as CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  UsersIcon,
  ListChecksIcon
} from '@phosphor-icons/react'
import type { TeamSalesActivity } from '../hooks/useTeamActivitiesData'
import type { SalesTeamMember } from '../../sales-members-list/types'
import { getActivityTypeVariant, safeString } from '../../../utils/activityHelpers'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { ActivityTableReferenceCell } from '@/common/components/common-relations/view-layouts/activity-layout/config/ActivityTableReferenceCell'
import { buildCrmRelatedEntityRecordUrl } from '@/common/utils/relatedEntityRecordUrls'
import { formatDate } from '@/common/utils/windowUtils'

// Get activity type icon (Lucide icons specific to this component)
const getActivityTypeIcon = (type: string) => {
  switch (type) {
    case 'Call':
      return <PhoneIcon className="gba:h-4 gba:w-4 gba:text-foreground" />
    case 'Email':
      return <EnvelopeIcon className="gba:h-4 gba:w-4" />
    case 'Meeting':
      return <UsersIcon className="gba:h-4 gba:w-4" />
    case 'Task':
      return <ListChecksIcon className="gba:h-4 gba:w-4" />
    default:
      return <ListChecksIcon className="gba:h-4 gba:w-4" />
  }
}

// Helper function to get team member from activities
const getTeamMemberForActivity = (activity: TeamSalesActivity, teamMembers: SalesTeamMember[]) => {
  return teamMembers.find(
    member => member.employeeId === activity.ownerEmployeeId || member.id === activity.ownerEmployeeId
  )
}

// Helper function to handle entity reference clicks
const handleEntityReferenceClick = (activity: TeamSalesActivity) => {
  const go = (kind: Parameters<typeof buildCrmRelatedEntityRecordUrl>[0], id: string | null | undefined) => {
    if (!id) return false
    const url = buildCrmRelatedEntityRecordUrl(kind, id)
    if (url.length > 0) {
      navigateTo(url)
      return true
    }
    return false
  }
  if (go('account', activity.accountId)) return
  if (go('contact', activity.contactId)) return
  if (go('lead', activity.leadId)) return
  if (go('opportunity', activity.opportunityId)) return
}

export const createTeamActivitiesColumns = (teamMembers: SalesTeamMember[]): ColumnDef<TeamSalesActivity>[] => [
  // Team Member Column
  {
    id: 'ownerEmployee.fullName',
    accessorKey: 'ownerEmployee.fullName',
    header: 'Team Member',
    size: 200,
    cell: ({ row }) => {
      const activity = row.original
      const member = getTeamMemberForActivity(activity, teamMembers)
      // Prioritize: 1) GraphQL ownerEmployee, 2) Team member name, 3) Unknown
      const fullName = activity.ownerEmployee?.fullName || member?.name || 'Unknown'
      const employeeId = activity.ownerEmployeeId || member?.employeeId

      const handleClick = (e: React.MouseEvent) => {
        if (employeeId) {
          e.stopPropagation()
          const url = buildPlatformUrl('/platform/employee-record', { employeeId })
          navigateTo(url)
        }
      }

      if (employeeId) {
        return (
          <button
            type="button"
            className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:bg-transparent gba:border-0 gba:p-0 hover:gba:bg-transparent focus:gba:bg-transparent gba:group"
            onClick={handleClick}
          >
            <Avatar
              size="sm"
              className="gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:rounded-full"
            >
              {member?.avatar && <AvatarImage src={`data:image/jpeg;base64,${member.avatar}`} alt={fullName} />}
              <AvatarFallback>
                <UserIcon className="gba:h-4 gba:w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="gba:text-[color:var(--nw-color-text-primary)] group-hover:gba:text-[color:var(--nw-color-primary-500)]">
              {fullName}
            </span>
          </button>
        )
      }

      return (
        <div className="gba:flex gba:items-center gba:gap-2">
          <Avatar size="sm" className="gba:opacity-50">
            {member?.avatar && <AvatarImage src={`data:image/jpeg;base64,${member.avatar}`} alt={fullName} />}
            <AvatarFallback>
              <UserIcon className="gba:h-4 gba:w-4" />
            </AvatarFallback>
          </Avatar>
          <span className="gba:text-[color:var(--nw-color-text-disabled)]">{fullName}</span>
        </div>
      )
    }
  },
  // Title Column
  {
    id: 'title',
    accessorKey: 'title',
    header: 'Title',
    size: 250,
    cell: ({ row }) => {
      const title = safeString(row.original.title)
      return (
        <div className="gba:flex gba:flex-col gba:gap-1 gba:overflow-hidden gba:max-w-[250px]">
          <span className="gba:text-sm gba:font-medium gba:truncate" title={title}>
            {title || '-'}
          </span>
          {row.original.description && (
            <span className="gba:text-xs gba:text-muted-foreground gba:truncate" title={row.original.description}>
              {row.original.description}
            </span>
          )}
        </div>
      )
    }
  },
  // Type Column
  {
    id: 'activityType.value',
    accessorKey: 'activityType.value',
    header: 'Type',
    size: 150,
    cell: ({ row }) => {
      const type = row.original.activityType?.value || 'Other'
      const isCall = type === 'Call'
      return (
        <Badge variant={getActivityTypeVariant(type)} className={`gba:gap-1.5${isCall ? ' gba:text-foreground' : ''}`}>
          {getActivityTypeIcon(type)}
          <span>{type}</span>
        </Badge>
      )
    }
  },
  // Reference Column
  {
    id: 'reference',
    header: 'Reference',
    size: 200,
    enableSorting: false,
    cell: ({ row }) => (
      <ActivityTableReferenceCell
        activity={row.original}
        onReferenceClick={handleEntityReferenceClick}
        emptyVariant="no-reference"
        singleReferenceButtonClassName="gba:px-3 gba:py-2"
      />
    )
  },
  // Created At Column
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: 'Created',
    size: 150,
    cell: ({ row }) => {
      const date = row.original.createdAt
      if (!date) return <span className="gba:text-sm gba:text-muted-foreground">-</span>

      return (
        <div className="gba:flex gba:items-center gba:gap-2">
          <CalendarIcon className="gba:h-4 gba:w-4 gba:text-gray-400" />
          <span className="gba:text-sm">{formatDate(date)}</span>
        </div>
      )
    }
  },
  // Occurred At Column
  {
    id: 'occurredAt',
    accessorKey: 'occurredAt',
    header: 'Occurred',
    size: 150,
    cell: ({ row }) => {
      const date = row.original.occurredAt
      if (!date) return <span className="gba:text-sm gba:text-muted-foreground gba:italic">Not specified</span>

      return (
        <div className="gba:flex gba:items-center gba:gap-2">
          <CalendarIcon className="gba:h-4 gba:w-4 gba:text-gray-400" />
          <span className="gba:text-sm">{formatDate(date)}</span>
        </div>
      )
    }
  }
]
