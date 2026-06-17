import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@newwork/nw-design-system'
import { CalendarIcon, TagIcon } from '@phosphor-icons/react'
import type { SalesCampaign } from '../components/campaign-list/types/SalesCampaignTypes'
import {
  CAMPAIGN_STATUS_CODE_ACTIVE,
  CAMPAIGN_STATUS_CODE_COMPLETED,
  CAMPAIGN_STATUS_CODE_PLANNED
} from '@/common/data/customer/constants/customerCatalogs'

// Unified status wording shown in the UI (table + filter), keyed by catalog code. Most campaigns
// have no stored status and render a date-derived label, so the stored values are relabeled to match.
export const CAMPAIGN_STATUS_DISPLAY_LABEL_BY_CODE: Record<string, string> = {
  [CAMPAIGN_STATUS_CODE_ACTIVE]: 'Active',
  [CAMPAIGN_STATUS_CODE_COMPLETED]: 'Completed',
  [CAMPAIGN_STATUS_CODE_PLANNED]: 'Planned'
}

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

const getFallbackCampaignStatusCode = (campaign: SalesCampaign): string => {
  const now = new Date()
  const startDate = campaign.startDate ? new Date(campaign.startDate) : null
  const endDate = campaign.endDate ? new Date(campaign.endDate) : null

  if (endDate && !Number.isNaN(endDate.getTime()) && now > endDate) {
    return CAMPAIGN_STATUS_CODE_COMPLETED
  }

  if (startDate && endDate && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
    if (now >= startDate && now <= endDate) {
      return CAMPAIGN_STATUS_CODE_ACTIVE
    }
  }

  return CAMPAIGN_STATUS_CODE_PLANNED
}

const formatCampaignStatusLabel = (statusCode: string): string => {
  if (statusCode === CAMPAIGN_STATUS_CODE_ACTIVE) return 'Active'
  if (statusCode === CAMPAIGN_STATUS_CODE_COMPLETED) return 'Completed'
  return 'Planned'
}

// Same status always renders the same badge color, whether it comes from the stored catalog entry
// or the date-derived fallback.
const getCampaignStatusVariant = (statusCode: string): 'success' | 'default' | 'secondary' => {
  if (statusCode === CAMPAIGN_STATUS_CODE_ACTIVE) return 'success'
  if (statusCode === CAMPAIGN_STATUS_CODE_COMPLETED) return 'default'
  return 'secondary'
}

const getCampaignStatusDisplay = (campaign: SalesCampaign) => {
  if (campaign.customerCampaignStatus) {
    const { code, value } = campaign.customerCampaignStatus
    const unifiedLabel = (code && CAMPAIGN_STATUS_DISPLAY_LABEL_BY_CODE[code]) || safeString(value || code)
    return {
      value: unifiedLabel,
      variant: getCampaignStatusVariant(code)
    }
  }

  const fallbackStatusCode = getFallbackCampaignStatusCode(campaign)
  return {
    value: formatCampaignStatusLabel(fallbackStatusCode),
    variant: getCampaignStatusVariant(fallbackStatusCode)
  }
}

export const createCampaignColumns = (): ColumnDef<SalesCampaign>[] => [
  {
    id: 'name',
    accessorFn: row => safeString(row.name),
    header: 'Campaign',
    size: 250,
    minSize: 200,
    maxSize: 350,
    enableResizing: false,
    enableSorting: true,
    cell: ({ row }) => (
      <div
        className="gba:flex gba:items-center gba:gap-2 gba:min-w-0"
        data-testid={`campaign-name-cell-${row.original.id}`}
      >
        <TagIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:font-medium gba:text-sm gba:truncate" title={safeString(row.original.name)}>
            {safeString(row.original.name)}
          </div>
          {row.original.description && (
            <div
              className="gba:text-xs gba:text-muted-foreground gba:truncate"
              title={safeString(row.original.description)}
            >
              {safeString(row.original.description)}
            </div>
          )}
        </div>
      </div>
    )
  },
  {
    id: 'type',
    accessorFn: row => row.type?.value || row.type?.code || '',
    header: 'Type',
    size: 140,
    minSize: 120,
    maxSize: 180,
    enableSorting: true,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.type) {
        return <span className="gba:text-muted-foreground">-</span>
      }
      const typeValue = safeString(row.original.type.value || row.original.type.code)
      return (
        <Badge variant="secondary" data-testid={`campaign-type-cell-${row.original.id}`}>
          <span className="gba:truncate" title={typeValue}>
            {typeValue}
          </span>
        </Badge>
      )
    }
  },
  {
    id: 'startDate',
    accessorFn: row => safeString(row.startDate),
    header: 'Start Date',
    size: 130,
    minSize: 110,
    maxSize: 160,
    enableResizing: false,
    enableSorting: true,
    cell: ({ row }) => {
      const formattedDate = row.original.startDate
        ? new Date(row.original.startDate).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        : '-'
      return (
        <div
          className="gba:flex gba:items-center gba:gap-2"
          data-testid={`campaign-start-date-cell-${row.original.id}`}
        >
          <CalendarIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
          <span className="gba:text-sm">{formattedDate}</span>
        </div>
      )
    }
  },
  {
    id: 'endDate',
    accessorFn: row => safeString(row.endDate),
    header: 'End Date',
    size: 130,
    minSize: 110,
    maxSize: 160,
    enableResizing: false,
    enableSorting: true,
    cell: ({ row }) => {
      const formattedDate = row.original.endDate
        ? new Date(row.original.endDate).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        : '-'
      return (
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`campaign-end-date-cell-${row.original.id}`}>
          <CalendarIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
          <span className="gba:text-sm">{formattedDate}</span>
        </div>
      )
    }
  },
  {
    id: 'status',
    accessorFn: row => getCampaignStatusDisplay(row).value,
    header: 'Status',
    size: 120,
    minSize: 100,
    maxSize: 150,
    enableResizing: false,
    enableSorting: true,
    cell: ({ row }) => {
      const statusDisplay = getCampaignStatusDisplay(row.original)
      return (
        <Badge variant={statusDisplay.variant as any} data-testid={`campaign-status-cell-${row.original.id}`}>
          {statusDisplay.value}
        </Badge>
      )
    }
  },
  {
    id: 'createdAt',
    accessorFn: row => safeString(row.createdAt),
    header: 'Created',
    size: 130,
    minSize: 110,
    maxSize: 160,
    enableResizing: false,
    enableSorting: true,
    cell: ({ row }) => {
      const formattedDate = row.original.createdAt
        ? new Date(row.original.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        : '-'
      return (
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`campaign-created-cell-${row.original.id}`}>
          <CalendarIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
          <span className="gba:text-sm">{formattedDate}</span>
        </div>
      )
    }
  }
]

export const createCampaignSortableColumns = () => {
  return [
    { id: 'name', label: 'Campaign Name' },
    { id: 'type', label: 'Type' },
    { id: 'startDate', label: 'Start Date' },
    { id: 'endDate', label: 'End Date' },
    { id: 'status', label: 'Status' },
    { id: 'createdAt', label: 'Created Date' }
  ]
}
