import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { User, Calendar } from 'lucide-react'
import type { Activity } from '@/common/data/relations/types/activityTypes'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatDate } from '@/common/utils/windowUtils'
import { PiPhone, PiEnvelope, PiUsers, PiListChecks, PiUser, PiBuilding, PiTarget, PiHandshake } from 'react-icons/pi'

// Get activity type icon
const getActivityTypeIcon = (type: string) => {
  switch (type) {
    case 'Call':
      return <PiPhone size={16} className="gba:text-success" />
    case 'Email':
      return <PiEnvelope size={16} className="gba:text-primary" />
    case 'Meeting':
      return <PiUsers size={16} className="gba:text-warning" />
    case 'Task':
      return <PiListChecks size={16} className="gba:text-accent" />
    default:
      return <PiListChecks size={16} className="gba:text-muted-foreground" />
  }
}

// Get activity type badge variant
const getActivityTypeVariant = (type: string): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' => {
  switch (type) {
    case 'Call':
      return 'success'
    case 'Email':
      return 'default'
    case 'Meeting':
      return 'warning'
    case 'Task':
      return 'secondary'
    default:
      return 'secondary'
  }
}

// Get entity type icon
const getEntityTypeIcon = (entityType: string) => {
  switch (entityType) {
    case 'Contact':
      return <PiUser size={14} />
    case 'Lead':
      return <PiTarget size={14} />
    case 'Opportunity':
      return <PiHandshake size={14} />
    case 'Account':
      return <PiBuilding size={14} />
    default:
      return <PiUser size={14} />
  }
}

// Get entity name from activity
const getEntityName = (activity: Activity): string => {
  if (activity.account?.name) {
    return activity.account.name
  }
  if (activity.contact) {
    const contactName = `${activity.contact.firstName || ''} ${activity.contact.lastName || ''}`.trim()
    if (contactName) return contactName
  }
  if (activity.lead) {
    // Lead doesn't have a name field - use firstName/lastName or companyName
    const leadName =
      activity.lead.companyName || `${activity.lead.firstName || ''} ${activity.lead.lastName || ''}`.trim()
    if (leadName) return leadName
  }
  if (activity.opportunity?.name) {
    return activity.opportunity.name
  }
  return 'No reference'
}

// Get entity type from activity
const getEntityType = (activity: Activity): string => {
  // Match the same logic as getEntityName - check actual data, not just IDs
  if (activity.account?.name) return 'Account'
  if (activity.contact?.firstName || activity.contact?.lastName) return 'Contact'
  if (activity.lead?.companyName || activity.lead?.firstName || activity.lead?.lastName) return 'Lead'
  if (activity.opportunity?.name) return 'Opportunity'
  return 'No reference'
}

// Handle entity reference click
const handleEntityReferenceClick = (activity: Activity) => {
  let url = ''

  if (activity.accountId) {
    url = buildPlatformUrl('/platform/crm/account-record', { accountId: activity.accountId })
  } else if (activity.contactId) {
    url = buildPlatformUrl('/platform/crm/contact-record', { contactId: activity.contactId })
  } else if (activity.leadId) {
    url = buildPlatformUrl('/platform/crm/lead-record', { leadId: activity.leadId })
  } else if (activity.opportunityId) {
    url = buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId: activity.opportunityId })
  }

  if (url) {
    navigateTo(url)
  }
}

// Safe string helper
const safeString = (value: any): string => {
  if (value === null || value === undefined) return ''
  return String(value)
}

export interface ActivityColumnsConfig {
  showOwnerEmployee?: boolean
  onReferenceClick?: (activity: Activity) => void
}

export const createActivityColumns = (config: ActivityColumnsConfig = {}): ColumnDef<Activity>[] => {
  const { showOwnerEmployee = false, onReferenceClick = handleEntityReferenceClick } = config

  const columns: ColumnDef<Activity>[] = []

  // Owner Employee Column (optional)
  if (showOwnerEmployee) {
    columns.push({
      id: 'ownerEmployee.displayName',
      accessorKey: 'ownerEmployee.displayName',
      header: 'Owner',
      size: 200,
      cell: ({ row }) => {
        const activity = row.original
        const displayName = activity.ownerEmployee?.displayName || 'Unknown'
        const employeeId = activity.ownerEmployeeId

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
              className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer hover:gba:bg-accent gba:rounded gba:p-1 gba:-m-1 gba:transition-colors gba:border-0 gba:bg-transparent gba:text-left gba:w-full"
              onClick={handleClick}
            >
              <Avatar size="sm">
                {activity.ownerEmployee?.pictureThumbnail && (
                  <AvatarImage
                    src={`data:image/jpeg;base64,${activity.ownerEmployee.pictureThumbnail}`}
                    alt={displayName}
                  />
                )}
                <AvatarFallback>
                  <User className="gba:h-4 gba:w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="gba:flex gba:flex-col">
                <span
                  className={`gba:text-sm gba:font-medium ${employeeId ? 'gba:text-primary hover:gba:underline' : ''}`}
                >
                  {displayName}
                </span>
              </div>
            </button>
          )
        }

        return (
          <div className="gba:flex gba:items-center gba:gap-3">
            <Avatar size="sm">
              {activity.ownerEmployee?.pictureThumbnail && (
                <AvatarImage
                  src={`data:image/jpeg;base64,${activity.ownerEmployee.pictureThumbnail}`}
                  alt={displayName}
                />
              )}
              <AvatarFallback>
                <User className="gba:h-4 gba:w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="gba:flex gba:flex-col">
              <span className="gba:text-sm gba:font-medium" title={displayName}>
                {displayName}
              </span>
            </div>
          </div>
        )
      }
    })
  }

  // Title, Type, and Reference Columns
  columns.push(
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

        // If no reference, show simple text
        if (!hasReference) {
          return <span className="gba:text-sm gba:text-muted-foreground gba:italic">No reference</span>
        }

        // If we have a reference, show clickable button with name and type
        const handleClick = (e: React.MouseEvent) => {
          e.stopPropagation()
          onReferenceClick(activity)
        }

        return (
          <button
            type="button"
            className="gba:flex gba:flex-col gba:gap-1 gba:cursor-pointer hover:gba:bg-accent gba:rounded gba:p-1 gba:-m-1 gba:transition-colors gba:border-0 gba:bg-transparent gba:text-left gba:w-full"
            onClick={handleClick}
          >
            <span className="gba:text-sm gba:font-medium gba:text-primary hover:gba:underline" title={entityName}>
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
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: 'Created',
      size: 150,
      cell: ({ row }) => {
        const date = formatDate(row.original.createdAt)
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
            <span className="gba:text-sm">{date}</span>
          </div>
        )
      }
    },
    {
      id: 'occurredAt',
      accessorKey: 'occurredAt',
      header: 'Occurred',
      size: 150,
      cell: ({ row }) => {
        const date = formatDate(row.original.occurredAt)
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
            <span className="gba:text-sm">{date}</span>
          </div>
        )
      }
    }
  )

  return columns
}

// Sortable columns configuration
export const activitySortableColumns = [
  { id: 'ownerEmployee.displayName', label: 'Owner' },
  { id: 'title', label: 'Title' },
  { id: 'activityType.value', label: 'Type' },
  { id: 'createdAt', label: 'Created' },
  { id: 'occurredAt', label: 'Occurred' }
]

// Available columns configuration (for column visibility)
export const activityAvailableColumns = [
  { id: 'ownerEmployee.displayName', label: 'Owner' },
  { id: 'title', label: 'Title' },
  { id: 'activityType.value', label: 'Type' },
  { id: 'reference', label: 'Reference' },
  { id: 'createdAt', label: 'Created' },
  { id: 'occurredAt', label: 'Occurred' }
]
