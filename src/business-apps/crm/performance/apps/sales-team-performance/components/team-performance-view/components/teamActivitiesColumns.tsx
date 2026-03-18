import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import {
  UserIcon,
  TargetIcon,
  HandshakeIcon,
  BuildingIcon,
  CalendarBlankIcon as CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  UsersIcon,
  ListChecksIcon
} from '@phosphor-icons/react'
import type { TeamSalesActivity } from '../hooks/useTeamActivitiesData'
import type { SalesTeamMember } from '../../sales-members-list/types'
import {
  getEntityName,
  getEntityType,
  getEntityTypeFromIds,
  getActivityTypeVariant,
  safeString
} from '../../../utils/activityHelpers'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
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

// Get entity type icon (Lucide icons specific to this component)
const getEntityTypeIcon = (entityType: string) => {
  switch (entityType) {
    case 'Contact':
      return <UserIcon className="gba:h-4 gba:w-4" />
    case 'Lead':
      return <TargetIcon className="gba:h-4 gba:w-4" />
    case 'Opportunity':
      return <HandshakeIcon className="gba:h-4 gba:w-4" />
    case 'Account':
      return <BuildingIcon className="gba:h-4 gba:w-4" />
    default:
      return <UserIcon className="gba:h-4 gba:w-4" />
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
  if (activity.accountId) {
    const url = buildPlatformUrl('/platform/crm/account-record', { accountId: activity.accountId })
    navigateTo(url)
  } else if (activity.contactId) {
    const url = buildPlatformUrl('/platform/crm/contact-record', { contactId: activity.contactId })
    navigateTo(url)
  } else if (activity.leadId) {
    const url = buildPlatformUrl('/platform/crm/lead-record', { leadId: activity.leadId })
    navigateTo(url)
  } else if (activity.opportunityId) {
    const url = buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId: activity.opportunityId })
    navigateTo(url)
  }
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
    cell: ({ row }) => {
      const activity = row.original
      const isUnlinked = !activity.accountId && !activity.contactId && !activity.leadId && !activity.opportunityId

      if (isUnlinked) {
        return <span className="gba:text-sm gba:text-muted-foreground gba:italic">No reference</span>
      }

      const entityName = getEntityName(activity)
      const entityType = getEntityType(activity)

      // Fall back to ID-based type when the joined entity has no resolvable name
      const resolvedType = entityType === 'No reference' ? getEntityTypeFromIds(activity) : entityType
      const resolvedName = entityName === 'No reference' ? null : entityName

      const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        handleEntityReferenceClick(activity)
      }

      return (
        <button
          type="button"
          className="gba:flex gba:flex-col gba:gap-1 gba:cursor-pointer gba:hover:bg-accent gba:px-3 gba:py-2 gba:rounded gba:transition-colors gba:border-0 gba:bg-transparent gba:text-left gba:overflow-hidden gba:max-w-[200px]"
          onClick={handleClick}
        >
          {resolvedName ? (
            <span className="gba:text-sm gba:font-medium gba:text-primary gba:truncate" title={resolvedName}>
              {resolvedName}
            </span>
          ) : (
            <span className="gba:text-sm gba:italic gba:text-muted-foreground gba:truncate">
              Unnamed {resolvedType}
            </span>
          )}
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
            {getEntityTypeIcon(resolvedType)}
            <span>{resolvedType}</span>
          </div>
        </button>
      )
    }
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
