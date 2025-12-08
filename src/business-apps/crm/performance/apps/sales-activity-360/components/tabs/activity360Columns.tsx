import React, { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import {
  PiUser,
  PiPhone,
  PiEnvelope,
  PiUsers,
  PiListChecks,
  PiTarget,
  PiHandshake,
  PiBuilding,
  PiCalendarBlank as PiCalendar,
  PiInfo
} from 'react-icons/pi'
import type { TeamSalesActivity } from '@/business-apps/crm/performance/apps/sales-team-performance/components/team-performance-view/hooks/useTeamActivitiesData'
import {
  getEntityName,
  getEntityType,
  getActivityTypeVariant
} from '@/business-apps/crm/performance/apps/sales-team-performance/utils/activityHelpers'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

// Format date with time
const formatDateTime = (date: string | Date) => {
  const d = new Date(date)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
}

// Date cell component with hover/touch support for created date
const DateCell: React.FC<{ occurredAt?: string; createdAt?: string }> = ({ occurredAt, createdAt }) => {
  const [showTooltip, setShowTooltip] = useState(false)

  if (!occurredAt) {
    return <span className="gba:text-sm gba:text-muted-foreground gba:italic">Not specified</span>
  }

  const occurred = formatDateTime(occurredAt)
  const created = createdAt ? formatDateTime(createdAt) : null

  const tooltipContent = created ? (
    <div className="gba:text-xs">
      <div className="gba:font-medium gba:mb-1">Created</div>
      <div>{created.date}</div>
      <div className="gba:text-muted-foreground">{created.time}</div>
    </div>
  ) : null

  return (
    <TooltipProvider>
      <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="gba:flex gba:items-start gba:gap-2 gba:text-left gba:bg-transparent gba:border-0 gba:p-0 gba:cursor-default"
            onClick={() => setShowTooltip(!showTooltip)}
            onTouchStart={() => setShowTooltip(true)}
            onTouchEnd={() => setTimeout(() => setShowTooltip(false), 2000)}
          >
            <PiCalendar className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:mt-0.5 gba:flex-shrink-0" />
            <div className="gba:flex gba:flex-col">
              <span className="gba:text-sm gba:font-medium">{occurred.date}</span>
              <span className="gba:text-xs gba:text-muted-foreground">{occurred.time}</span>
            </div>
            {created && (
              <PiInfo className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:ml-1 gba:mt-0.5 gba:flex-shrink-0 gba:opacity-50" />
            )}
          </button>
        </TooltipTrigger>
        {tooltipContent && (
          <TooltipContent side="top" className="gba:bg-popover gba:text-popover-foreground">
            {tooltipContent}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}

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
 *
 * Column order:
 * 1. Date - Shows occurred date/time, hover shows created date/time
 * 2. Owner - Employee who owns the activity
 * 3. Reference - Related entity (Lead, Contact, Account, Opportunity)
 * 4. Type - Activity type (Call, Email, Meeting, Task)
 */
export const createActivity360Columns = (): ColumnDef<TeamSalesActivity>[] => [
  // 1. Date Column - Shows occurred date with time, hover/tap shows created date
  {
    id: 'occurredAt',
    accessorKey: 'occurredAt',
    header: 'Date',
    size: 160,
    cell: ({ row }) => {
      return <DateCell occurredAt={row.original.occurredAt} createdAt={row.original.createdAt} />
    }
  },
  // 2. Owner Column - uses GraphQL ownerEmployee directly
  {
    id: 'ownerEmployee.fullName',
    accessorKey: 'ownerEmployee.fullName',
    header: 'Owner',
    size: 200,
    cell: ({ row }) => {
      const activity = row.original
      const ownerEmployee = activity.ownerEmployee

      // Fallback to firstName + lastName if fullName is not available
      const fullName =
        ownerEmployee?.fullName ||
        (ownerEmployee?.firstName && ownerEmployee?.lastName
          ? `${ownerEmployee.firstName} ${ownerEmployee.lastName}`.trim()
          : ownerEmployee?.firstName || ownerEmployee?.lastName || 'Unknown')

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
              <PiUser className="gba:h-4 gba:w-4" />
            </AvatarFallback>
          </Avatar>
          <span className="gba:text-[color:var(--nw-color-text-disabled)]">{fullName}</span>
        </div>
      )
    }
  },
  // 3. Reference Column
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
  // 4. Type Column
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
  }
]
