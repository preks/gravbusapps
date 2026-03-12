import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { UserIcon, TargetIcon, HandshakeIcon, BuildingIcon, CalendarIcon } from '@phosphor-icons/react'
import type { TeamSalesActivity } from '../hooks/useTeamActivitiesData'
import type { SalesTeamMember } from '../../sales-members-list/types'
import { getEntityName, getEntityType, getActivityTypeVariant, safeString } from '../../../utils/activityHelpers'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatDate } from '@/common/utils/windowUtils'

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
  if (activity.accountId && activity.account) {
    const url = buildPlatformUrl('/platform/crm/account-record', { accountId: activity.accountId })
    navigateTo(url)
  } else if (activity.contactId && activity.contact) {
    const url = buildPlatformUrl('/platform/crm/contact-record', { contactId: activity.contactId })
    navigateTo(url)
  } else if (activity.leadId && activity.lead) {
    const url = buildPlatformUrl('/platform/crm/lead-record', { leadId: activity.leadId })
    navigateTo(url)
  } else if (activity.opportunityId && activity.opportunity) {
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
      return (
        <div className="gba:flex gba:items-center">
          <Badge variant={getActivityTypeVariant(type)}>{type}</Badge>
        </div>
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
      const entityName = getEntityName(activity)
      const entityType = getEntityType(activity)

      // Check if we have actual reference data (not just IDs)
      const hasReference = entityName !== 'No reference' && entityType !== 'No reference'

      // If no reference, show simple text ONCE
      if (!hasReference) {
        return <span className="gba:text-sm gba:text-muted-foreground gba:italic">No reference</span>
      }

      // If we have a reference, show clickable button with name and type
      const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        handleEntityReferenceClick(activity)
      }

      return (
        <button
          type="button"
          className="gba:flex gba:flex-col gba:gap-1 gba:cursor-pointer gba:hover:bg-accent gba:px-3 gba:py-2 gba:rounded gba:transition-colors gba:border-0 gba:bg-transparent gba:text-left gba:w-fit"
          onClick={handleClick}
        >
          <span className="gba:text-sm gba:font-medium gba:text-primary" title={entityName}>
            {entityName}
          </span>
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
            {getEntityTypeIcon(entityType)}
            <span>{entityType}</span>
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
