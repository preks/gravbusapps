import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@newwork/nw-design-system'
import { CalendarIcon, UserIcon, BuildingIcon, UsersIcon, TargetIcon } from '@phosphor-icons/react'
import type { CampaignEntity } from '../types/CampaignRecordTypes'

// Helper to safely convert values to strings
// Returns empty string for objects to avoid '[object Object]' stringification
const safeString = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    // Objects should be handled by caller - return empty string to avoid [object Object]
    return ''
  }
  // At this point, only primitives (number, boolean, symbol, bigint) remain
  // which all have proper toString() implementations
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  // For any other edge case, return empty string
  return ''
}

// Helper to get entity type config
const getEntityTypeConfig = (type: string) => {
  const typeConfig = {
    lead: { label: 'Lead', icon: UserIcon, color: 'var(--color-primary-500)' },
    account: { label: 'Account', icon: BuildingIcon, color: 'var(--color-primary-600)' },
    contact: { label: 'Contact', icon: UsersIcon, color: 'var(--color-primary-600)' },
    opportunity: { label: 'Opportunity', icon: TargetIcon, color: 'var(--color-primary-500)' }
  }

  return (
    typeConfig[type as keyof typeof typeConfig] || {
      label: type,
      icon: UserIcon,
      color: 'var(--color-primary-500)'
    }
  )
}

// Helper function to get entity display name
const getEntityDisplayName = (entity: CampaignEntity): string => {
  if (entity.type === 'lead' || entity.type === 'contact') {
    return entity.name || `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || '-'
  }
  return entity.name || '-'
}

export const createCampaignEntityColumns = (): ColumnDef<CampaignEntity>[] => [
  {
    id: 'name',
    accessorFn: row => getEntityDisplayName(row),
    header: 'Name',
    size: 300,
    minSize: 200,
    maxSize: 400,
    enableResizing: false,
    cell: ({ row }) => {
      const typeConfig = getEntityTypeConfig(row.original.type)
      const IconComponent = typeConfig.icon
      return (
        <div
          className="gba:flex gba:items-center gba:gap-2 gba:min-w-0"
          data-testid={`entity-name-cell-${row.original.id}`}
        >
          <IconComponent className="gba:h-4 gba:w-4 gba:shrink-0" style={{ color: typeConfig.color }} />
          <div className="gba:min-w-0 gba:flex-1">
            <div className="gba:font-medium gba:text-sm gba:truncate" title={getEntityDisplayName(row.original)}>
              {getEntityDisplayName(row.original)}
            </div>
          </div>
        </div>
      )
    }
  },
  {
    id: 'type',
    accessorFn: row => row.type || '',
    header: 'Type',
    size: 180,
    minSize: 120,
    maxSize: 200,
    enableResizing: false,
    cell: ({ row }) => {
      const typeConfig = getEntityTypeConfig(row.original.type)
      const IconComponent = typeConfig.icon
      return (
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`entity-type-cell-${row.original.id}`}>
          <IconComponent className="gba:h-3.5 gba:w-3.5 gba:shrink-0" style={{ color: typeConfig.color }} />
          <span className="gba:text-sm">{typeConfig.label}</span>
        </div>
      )
    }
  },
  {
    id: 'createdAt',
    accessorFn: row => safeString(row.creationDate),
    header: 'Creation Date',
    size: 144,
    minSize: 120,
    maxSize: 180,
    enableResizing: false,
    cell: ({ row }) => {
      const formattedDate = row.original.creationDate
        ? new Date(row.original.creationDate).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        : '-'
      return (
        <div
          className="gba:flex gba:items-center gba:gap-2"
          data-testid={`entity-created-date-cell-${row.original.id}`}
        >
          <CalendarIcon className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
          <span className="gba:text-sm">{formattedDate}</span>
        </div>
      )
    }
  },
  {
    id: 'owner',
    accessorFn: row =>
      row.owner?.displayName ||
      (row.owner?.firstName && row.owner?.lastName ? `${row.owner.firstName} ${row.owner.lastName}` : ''),
    header: 'Owner',
    size: 200,
    minSize: 150,
    maxSize: 250,
    enableResizing: false,
    cell: ({ row }) => {
      const ownerName =
        row.original.owner?.displayName ||
        (row.original.owner?.firstName && row.original.owner?.lastName
          ? `${row.original.owner.firstName} ${row.original.owner.lastName}`
          : '-')
      return (
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`entity-owner-cell-${row.original.id}`}>
          <UserIcon className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
          <span className="gba:text-sm gba:truncate" title={ownerName}>
            {ownerName}
          </span>
        </div>
      )
    }
  },
  {
    id: 'status',
    accessorFn: row => row.status?.value || '',
    header: 'Status',
    size: 144,
    minSize: 100,
    maxSize: 180,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.status?.value) {
        return <span className="gba:text-sm gba:text-gray-400">-</span>
      }
      return (
        <Badge variant="default" data-testid={`entity-status-cell-${row.original.id}`}>
          <span className="gba:truncate" title={row.original.status.value}>
            {row.original.status.value}
          </span>
        </Badge>
      )
    }
  }
]

export const createCampaignEntitySortableColumns = () => {
  return [
    { id: 'name', label: 'Name' },
    { id: 'type', label: 'Type' },
    { id: 'createdAt', label: 'Creation Date' },
    { id: 'owner', label: 'Owner' },
    { id: 'status', label: 'Status' }
  ]
}
