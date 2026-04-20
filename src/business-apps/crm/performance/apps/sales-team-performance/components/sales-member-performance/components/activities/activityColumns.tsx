import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@newwork/nw-design-system'
import { CalendarIcon, PhoneIcon, EnvelopeIcon, UsersIcon, ListChecksIcon } from '@phosphor-icons/react'
import { EmployeeActivity } from '../../hooks/useEmployeeActivitiesData'
import { ActivityTableReferenceCell } from '@/common/components/common-relations/view-layouts/activity-layout/config/ActivityTableReferenceCell'
import { calculateActivityScore, getScoreBadgeVariant } from '../../../../utils/activityScoreCalculator'
import { formatDate } from '@/common/utils/windowUtils'

// Get activity type icon
const getActivityTypeIcon = (type: string) => {
  switch (type) {
    case 'Call':
      return <PhoneIcon size={16} className="gba:text-foreground" />
    case 'Email':
      return <EnvelopeIcon size={16} />
    case 'Meeting':
      return <UsersIcon size={16} />
    case 'Task':
      return <ListChecksIcon size={16} />
    default:
      return <ListChecksIcon size={16} />
  }
}

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
    cell: ({ row }) => (
      <ActivityTableReferenceCell
        activity={row.original}
        onReferenceClick={onReferenceClick}
        emptyVariant="no-reference"
        dataTestId={`activity-reference-${row.original.id}`}
        singleReferenceButtonClassName="gba:px-3 gba:py-2 gba:w-fit"
      />
    )
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
