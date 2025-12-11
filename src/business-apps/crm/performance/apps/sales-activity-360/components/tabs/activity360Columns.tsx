import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import {
  PiUser,
  PiPhone,
  PiEnvelope,
  PiUsers,
  PiListChecks,
  PiTarget,
  PiHandshake,
  PiBuilding,
  PiCalendarBlank as PiCalendar
} from 'react-icons/pi'
import type { TeamSalesActivity } from '@/business-apps/crm/performance/apps/sales-team-performance/components/team-performance-view/hooks/useTeamActivitiesData'
import {
  getEntityName,
  getEntityType,
  getActivityTypeVariant,
  safeString
} from '@/business-apps/crm/performance/apps/sales-team-performance/utils/activityHelpers'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatDate } from '@/common/utils/windowUtils'

// Get activity type icon
const getActivityTypeIcon = (type: string) => {
  switch (type) {
    case 'Call':
      return <PiPhone className="gba:h-4 gba:w-4 gba:text-success" />
    case 'Email':
      return <PiEnvelope className="gba:h-4 gba:w-4 gba:text-primary" />
    case 'Meeting':
      return <PiUsers className="gba:h-4 gba:w-4 gba:text-warning" />
    case 'Task':
      return <PiListChecks className="gba:h-4 gba:w-4 gba:text-accent" />
    default:
      return <PiListChecks className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
  }
}

// Get entity type icon
const getEntityTypeIcon = (entityType: string) => {
  switch (entityType) {
    case 'Contact':
      return <PiUser className="gba:h-4 gba:w-4" />
    case 'Lead':
      return <PiTarget className="gba:h-4 gba:w-4" />
    case 'Opportunity':
      return <PiHandshake className="gba:h-4 gba:w-4" />
    case 'Account':
      return <PiBuilding className="gba:h-4 gba:w-4" />
    default:
      return <PiUser className="gba:h-4 gba:w-4" />
  }
}

// Handle entity reference clicks
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

/**
 * Creates columns for Activity 360 that use GraphQL data directly
 * (no teamMembers lookup needed - uses ownerEmployee from GraphQL)
 */
export const createActivity360Columns = (): ColumnDef<TeamSalesActivity>[] => [
  // Owner Column - uses GraphQL ownerEmployee directly
  {
    id: 'ownerEmployee.fullName',
    accessorKey: 'ownerEmployee.fullName',
    header: 'Owner',
    size: 200,
    cell: ({ row }) => {
      const activity = row.original
      const fullName = activity.ownerEmployee?.fullName || 'Unknown'
      const employeeId = activity.ownerEmployeeId
      const avatar = activity.ownerEmployee?.pictureThumbnail

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
              {avatar && <AvatarImage src={`data:image/jpeg;base64,${avatar}`} alt={fullName} />}
              <AvatarFallback>
                <PiUser className="gba:h-4 gba:w-4" />
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
            {avatar && <AvatarImage src={`data:image/jpeg;base64,${avatar}`} alt={fullName} />}
            <AvatarFallback>
              <User className="gba:h-4 gba:w-4" />
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
        <div className="gba:flex gba:flex-col gba:gap-1">
          <span className="gba:text-sm gba:font-medium" title={title}>
            {title || '-'}
          </span>
          {row.original.description && (
            <span className="gba:text-xs gba:text-muted-foreground gba:line-clamp-1" title={row.original.description}>
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
        <Badge variant={getActivityTypeVariant(type)} className="gba:gap-1.5">
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
      const entityName = getEntityName(activity)
      const entityType = getEntityType(activity)

      const hasReference = entityName !== 'No reference' && entityType !== 'No reference'

      if (!hasReference) {
        return <span className="gba:text-sm gba:text-muted-foreground gba:italic">No reference</span>
      }

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
          <PiCalendar className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
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
          <PiCalendar className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
          <span className="gba:text-sm">{formatDate(date)}</span>
        </div>
      )
    }
  }
]
