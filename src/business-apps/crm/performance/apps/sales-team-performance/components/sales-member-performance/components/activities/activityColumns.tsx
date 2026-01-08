import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@newwork/nw-design-system'
import {
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  UsersIcon,
  ListChecksIcon,
  UserIcon,
  BuildingIcon,
  TargetIcon,
  HandshakeIcon
} from '@phosphor-icons/react'
import { EmployeeActivity } from '../../hooks/useEmployeeActivitiesData'
import { getEntityName, getEntityType } from '../../../../utils/activityHelpers'
import { calculateActivityScore, getScoreBadgeVariant } from '../../../../utils/activityScoreCalculator'
import { formatDate } from '@/common/utils/windowUtils'

// Get activity type icon
const getActivityTypeIcon = (type: string) => {
  switch (type) {
    case 'Call':
      return <PhoneIcon size={16} className="gba:text-success" />
    case 'Email':
      return <EnvelopeIcon size={16} className="gba:text-primary" />
    case 'Meeting':
      return <UsersIcon size={16} className="gba:text-warning" />
    case 'Task':
      return <ListChecksIcon size={16} className="gba:text-accent" />
    default:
      return <ListChecksIcon size={16} className="gba:text-muted-foreground" />
  }
}

// Get entity type icon
const getEntityTypeIcon = (entityType: string) => {
  switch (entityType) {
    case 'Contact':
      return <UserIcon size={14} />
    case 'Lead':
      return <TargetIcon size={14} />
    case 'Opportunity':
      return <HandshakeIcon size={14} />
    case 'Account':
      return <BuildingIcon size={14} />
    default:
      return <UserIcon size={14} />
  }
}

// Local icon mapping functions (icon library specific)

export const createActivityColumns = ({
  onReferenceClick
}: {
  onReferenceClick: (activity: EmployeeActivity) => void
}): ColumnDef<EmployeeActivity>[] => [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <div className="gba:font-medium gba:text-sm" data-testid={`activity-title-${row.original.id}`}>
        {row.original.title}
      </div>
    )
  },
  {
    id: 'activityType.value',
    accessorKey: 'activityType.value',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.activityType?.value || row.original.type || ''
      return (
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`activity-type-${row.original.id}`}>
          {getActivityTypeIcon(type)}
          <span className="gba:text-sm">{type}</span>
        </div>
      )
    }
  },
  {
    accessorKey: 'reference',
    header: 'Reference',
    enableSorting: false,
    cell: ({ row }) => {
      const activity = row.original
      const entityName = getEntityName(activity)
      const entityType = getEntityType(activity)

      // If no reference, display simple text without icon
      if (entityName === 'No reference' || entityType === 'No reference') {
        return (
          <span
            className="gba:text-sm gba:text-muted-foreground gba:italic"
            data-testid={`activity-reference-${row.original.id}`}
          >
            No reference
          </span>
        )
      }

      return (
        <button
          type="button"
          className="gba:flex gba:flex-col gba:gap-1 gba:cursor-pointer gba:hover:bg-accent gba:px-3 gba:py-2 gba:rounded gba:transition-colors gba:border-0 gba:bg-transparent gba:text-left gba:w-fit"
          onClick={e => {
            e.stopPropagation()
            onReferenceClick(activity)
          }}
          title={`View ${entityType.toLowerCase()}: ${entityName}`}
          data-testid={`activity-reference-${row.original.id}`}
        >
          <span className="gba:text-sm gba:font-medium gba:text-primary">{entityName}</span>
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
            {getEntityTypeIcon(entityType)}
            <span>{entityType}</span>
          </div>
        </button>
      )
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Creation Date',
    cell: ({ row }) => (
      <div data-testid={`activity-created-${row.original.id}`}>
        {row.original.createdAt ? (
          <div className="gba:flex gba:items-center gba:gap-2">
            <CalendarIcon className="gba:h-4 gba:w-4 gba:text-gray-400" />
            <span className="gba:text-sm">{formatDate(row.original.createdAt)}</span>
          </div>
        ) : (
          '-'
        )}
      </div>
    )
  },
  {
    accessorKey: 'occurredAt',
    header: 'Occurred At',
    cell: ({ row }) => (
      <div data-testid={`activity-occurred-${row.original.id}`}>
        {row.original.occurredAt ? (
          <div className="gba:flex gba:items-center gba:gap-2">
            <CalendarIcon className="gba:h-4 gba:w-4 gba:text-gray-400" />
            <span className="gba:text-sm">{formatDate(row.original.occurredAt)}</span>
          </div>
        ) : (
          <span className="gba:text-muted-foreground gba:text-sm gba:italic">Not specified</span>
        )}
      </div>
    )
  },
  {
    accessorKey: 'activityScore',
    header: 'Activity Score',
    enableSorting: false,
    cell: ({ row }) => {
      // Calculate score dynamically using the formula
      const score = calculateActivityScore(row.original.createdAt, row.original.occurredAt)
      return (
        <Badge variant={getScoreBadgeVariant(score)} data-testid={`activity-score-${row.original.id}`}>
          {score}%
        </Badge>
      )
    }
  }
]
