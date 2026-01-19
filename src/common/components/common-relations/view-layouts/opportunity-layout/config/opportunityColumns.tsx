import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Building2, Calendar } from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { deriveSortableColumns } from '@/common/network/graphql/descriptorUtils'
import { createOpportunityDescriptors, OpportunityFields } from '@/common/data/relations/types/opportunityTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { getOpportunityForecastBadgeVariant } from '@/common/utils/badgeUtils'

// Generic opportunity interface that both Investment and Customer opportunities implement
export interface GenericOpportunityForColumns {
  id: string
  name: string
  estimatedAmount?: number | null
  currency?: { code?: string } | null
  opportunityPipeline?: { id: string; code?: string; value?: string } | null
  opportunityPipelineLabel?: string
  salesPipeline?: { id: string; code?: string; value?: string } | null
  salesPipelineLabel?: string
  opportunityPipelineStage?: { id: string; code?: string; value?: string; alternativeCode?: string } | null
  opportunityPipelineStageLabel?: string
  salesPipelineStage?: { id: string; code?: string; value?: string; alternativeCode?: string } | null
  salesPipelineStageLabel?: string
  opportunityStatus?: { id: string; code?: string; value?: string; alternativeCode?: string } | null
  opportunityStatusLabel?: string
  opportunityForecast?: { id: string; code?: string; value?: string; additionalValue1?: string } | null
  closeDate?: string | null
  account?: { id: string; name: string; pictureThumbnail?: string | null; pictureThumbnailUrl?: string | null } | null
  ownerEmployee?: {
    id: string
    displayName?: string | null
    firstName?: string | null
    lastName?: string | null
    pictureThumbnail?: string | null
  } | null
  createdAt?: string | null
}

// Helper function to get owner display name
export const getOwnerName = (opportunity: GenericOpportunityForColumns) => {
  if (opportunity.ownerEmployee?.displayName) {
    return opportunity.ownerEmployee.displayName
  }
  if (opportunity.ownerEmployee?.firstName || opportunity.ownerEmployee?.lastName) {
    return `${opportunity.ownerEmployee.firstName || ''} ${opportunity.ownerEmployee.lastName || ''}`.trim()
  }
  return '-'
}

// Helper function to get stage color based on alternativeCode
export const getStageColor = (
  alternativeCode?: string
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' => {
  if (!alternativeCode) return 'outline'

  switch (alternativeCode.toUpperCase()) {
    case 'DISCOVERY':
      return 'info'
    case 'QUALIFICATION':
      return 'warning'
    case 'NEGOTIATION':
      return 'secondary'
    case 'CLOSED_WON':
      return 'success'
    case 'CLOSED_LOST':
      return 'destructive'
    default:
      return 'outline'
  }
}

// Helper function to get status color based on alternativeCode
export const getStatusColor = (
  alternativeCode?: string
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' => {
  if (!alternativeCode) return 'outline'

  switch (alternativeCode.toUpperCase()) {
    case 'ACTIVE':
    case 'IN_PROGRESS':
      return 'info'
    case 'OPEN':
      return 'secondary'
    case 'WON':
    case 'CLOSED_WON':
    case 'SUCCESS':
    case 'CONVERTED':
      return 'success'
    case 'LOST':
    case 'CLOSED_LOST':
    case 'FAILED':
    case 'REJECTED':
      return 'destructive'
    case 'ON_HOLD':
    case 'PAUSED':
      return 'warning'
    case 'QUALIFIED':
      return 'info'
    default:
      return 'outline'
  }
}

// Helper function to format status labels (remove prefixes and convert to Title Case)
export const formatStatusLabel = (status?: string): string => {
  if (!status) return '-'

  // Remove common prefixes like OPPORTUNITY_, INVESTMENT_, STATUS_
  const withoutPrefix = status
    .replace(/^OPPORTUNITY_/, '')
    .replace(/^INVESTMENT_/, '')
    .replace(/^STATUS_/, '')

  // Convert SCREAMING_SNAKE_CASE to Title Case
  return withoutPrefix
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Extract currency symbol
export const getCurrencySymbol = (currencyCode?: string): string => {
  try {
    const code = currencyCode || 'EUR'
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol'
    }).formatToParts(0)
    return parts.find(p => p.type === 'currency')?.value || code
  } catch {
    return '€'
  }
}

export const formatCurrencyNumberOnly = (amount: number, currencyCode?: string): string => {
  try {
    const code = currencyCode || 'EUR'
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).formatToParts(amount)
    return parts
      .filter(p => p.type !== 'currency')
      .map(p => p.value)
      .join('')
  } catch {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }
}

export const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

export function createOpportunityColumns<T extends GenericOpportunityForColumns>(
  buildAccountUrl: (accountId: string) => string
): ColumnDef<T>[] {
  return [
    {
      id: 'opportunity',
      accessorKey: 'name',
      header: 'Opportunity',
      size: 250,
      minSize: 200,
      maxSize: 400,
      cell: ({ row }) => (
        <div className="gba:font-medium gba:text-sm gba:truncate" data-testid={`opportunity-name-${row.original.id}`}>
          {row.original.name}
        </div>
      )
    },
    {
      id: 'amount',
      accessorKey: 'estimatedAmount',
      header: 'Amount',
      size: 150,
      minSize: 120,
      maxSize: 200,
      meta: {
        type: 'currency' as const,
        currency: 'EUR',
        align: 'right' as const
      },
      cell: ({ row }) => {
        if (!row.original.estimatedAmount) {
          return <div className="gba:text-right gba:text-sm gba:text-muted-foreground">No amount</div>
        }

        const formattedValue = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: row.original.currency?.code || 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(row.original.estimatedAmount)

        return (
          <div
            className="gba:text-right gba:text-sm gba:font-mono gba:truncate"
            data-testid={`opportunity-amount-${row.original.id}`}
          >
            {formattedValue}
          </div>
        )
      }
    },
    {
      id: 'opportunityPipeline',
      accessorKey: 'opportunityPipeline',
      header: 'Pipeline',
      size: 150,
      minSize: 120,
      maxSize: 200,
      cell: ({ row }) => (
        <span className="gba:text-sm gba:truncate gba:block" data-testid={`opportunity-pipeline-${row.original.id}`}>
          {row.original.opportunityPipelineLabel ||
            row.original.opportunityPipeline?.value ||
            row.original.opportunityPipeline?.code ||
            row.original.salesPipelineLabel ||
            row.original.salesPipeline?.value ||
            row.original.salesPipeline?.code ||
            'No pipeline'}
        </span>
      )
    },
    {
      id: 'opportunityPipelineStage',
      accessorKey: 'opportunityPipelineStage',
      header: 'Stage',
      size: 150,
      minSize: 120,
      maxSize: 200,
      cell: ({ row }) => {
        const stage = row.original.opportunityPipelineStage || row.original.salesPipelineStage
        const stageLabel =
          row.original.opportunityPipelineStageLabel ||
          row.original.salesPipelineStageLabel ||
          stage?.value ||
          stage?.code ||
          '-'

        return (
          <>
            {stage ? (
              <Badge
                variant={getStageColor(stage?.alternativeCode)}
                data-testid={`opportunity-stage-${row.original.id}`}
              >
                {stageLabel}
              </Badge>
            ) : (
              <span className="gba:text-sm gba:text-muted-foreground">No stage</span>
            )}
          </>
        )
      }
    },
    {
      id: 'opportunityStatus',
      accessorKey: 'opportunityStatus',
      header: 'Status',
      size: 120,
      minSize: 100,
      maxSize: 150,
      cell: ({ row }) => {
        // Only display if opportunityStatus catalog entry exists
        if (!row.original.opportunityStatus) {
          return <span className="gba:text-sm gba:text-muted-foreground">No status</span>
        }

        // Priority: opportunityStatusLabel > catalog value > catalog code
        const rawStatus =
          row.original.opportunityStatusLabel ||
          row.original.opportunityStatus?.value ||
          row.original.opportunityStatus?.code

        if (!rawStatus) {
          return <span className="gba:text-sm gba:text-muted-foreground">No status</span>
        }

        // Format the status (handles cases like "OPPORTUNITY_OPEN" -> "Open")
        const statusLabel = formatStatusLabel(rawStatus)

        return (
          <Badge
            variant={getStatusColor(row.original.opportunityStatus?.alternativeCode || rawStatus)}
            data-testid={`opportunity-status-${row.original.id}`}
          >
            {statusLabel}
          </Badge>
        )
      }
    },
    {
      id: 'opportunityForecast',
      accessorFn: row => {
        const forecast = row.opportunityForecast
        if (!forecast) return ''
        const value = forecast.value || forecast.code || ''
        const additionalValue1 = forecast.additionalValue1 || ''
        return additionalValue1 ? `${value}: ${additionalValue1}` : value
      },
      header: 'Forecast',
      size: 140,
      minSize: 120,
      maxSize: 180,
      cell: ({ row }) => {
        if (!row.original.opportunityForecast) {
          return <span className="gba:text-sm gba:text-muted-foreground">No forecast</span>
        }
        const forecast = row.original.opportunityForecast
        const value = forecast.value || forecast.code || ''
        const additionalValue1 = forecast.additionalValue1 || ''
        const displayValue = additionalValue1 ? `${value}: ${additionalValue1}` : value
        return (
          <Badge
            variant={getOpportunityForecastBadgeVariant(forecast)}
            className="gba:text-sm"
            data-testid={`opportunity-forecast-cell-${row.original.id}`}
          >
            {displayValue}
          </Badge>
        )
      }
    },
    {
      id: 'closeDate',
      accessorKey: 'closeDate',
      header: 'Close Date',
      size: 150,
      minSize: 130,
      maxSize: 180,
      meta: {
        type: 'date' as const
      },
      cell: ({ row }) =>
        row.original.closeDate ? (
          <div className="gba:flex gba:items-center gba:gap-2 gba:truncate">
            <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
            <span className="gba:text-sm gba:truncate">{formatDate(row.original.closeDate)}</span>
          </div>
        ) : (
          <span className="gba:text-sm gba:text-muted-foreground">No close date</span>
        )
    },
    {
      id: 'account',
      accessorFn: row => row.opportunityAccounts?.[0]?.account?.name || '',
      header: 'Account',
      size: 200,
      minSize: 180,
      maxSize: 280,
      cell: ({ row }) => {
        const account = row.original.opportunityAccounts?.[0]?.account

        if (!account) {
          return <span className="gba:text-sm gba:text-muted-foreground">No account</span>
        }

        const imageUrl = account.pictureThumbnail
          ? `data:image/gif;base64,${account.pictureThumbnail}`
          : account.pictureThumbnailUrl || undefined

        return (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              navigateTo(buildAccountUrl(account.id))
            }}
            className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:group gba:bg-transparent gba:border-0 gba:p-0 gba:w-full gba:text-left"
            data-testid={`opportunity-account-link-${row.original.id}`}
          >
            <Avatar className="gba:w-8 gba:h-8 gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:transition-all">
              {imageUrl && <AvatarImage src={imageUrl} alt={account.name} />}
              <AvatarFallback>
                <Building2 className="gba:h-4 gba:w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="gba:min-w-0 gba:flex-1">
              <div className="gba:font-medium gba:truncate gba:text-sm gba:group-hover:gba:text-primary gba:transition-colors">
                {account.name}
              </div>
            </div>
          </button>
        )
      }
    },
    {
      id: 'owner',
      accessorFn: row => getOwnerName(row),
      header: 'Owner',
      size: 180,
      minSize: 160,
      maxSize: 240,
      cell: ({ row }) => {
        if (!row.original.ownerEmployee) {
          return <span className="gba:text-sm gba:text-muted-foreground">No owner</span>
        }

        const owner = row.original.ownerEmployee
        const imageUrl = owner.pictureThumbnail ? `data:image/gif;base64,${owner.pictureThumbnail}` : undefined
        const ownerName = getOwnerName(row.original)

        return (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              navigateTo(`/platform/employee-record?employeeId=${owner.id}`)
            }}
            className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:group gba:bg-transparent gba:border-0 gba:p-0 gba:w-full gba:text-left"
            data-testid={`opportunity-owner-link-${row.original.id}`}
          >
            <Avatar className="gba:w-8 gba:h-8 gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:transition-all">
              {imageUrl && <AvatarImage src={imageUrl} alt={ownerName} />}
              <AvatarFallback>
                {ownerName === '-'
                  ? 'O'
                  : ownerName
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="gba:min-w-0 gba:flex-1">
              <div className="gba:font-medium gba:truncate gba:text-sm gba:group-hover:gba:text-primary gba:transition-colors">
                {ownerName}
              </div>
            </div>
          </button>
        )
      }
    },
    {
      id: 'created',
      accessorKey: 'createdAt',
      header: 'Created',
      size: 150,
      minSize: 130,
      maxSize: 180,
      meta: {
        type: 'date' as const
      },
      cell: ({ row }) =>
        row.original.createdAt ? (
          <div className="gba:flex gba:items-center gba:gap-2 gba:truncate">
            <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
            <span className="gba:text-sm gba:truncate">{formatDate(row.original.createdAt)}</span>
          </div>
        ) : (
          <span className="gba:text-sm gba:text-muted-foreground">No date</span>
        )
    }
  ]
}

/**
 * Create sortable columns derived from descriptors
 * Views should pass their specific descriptors (e.g., CUSTOMER_OPPORTUNITY_DESCRIPTORS or INVESTMENT_OPPORTUNITY_DESCRIPTORS)
 * which extend createOpportunityDescriptors(OpportunityFields) with domain-specific overrides
 */
const OPPORTUNITY_COLUMN_LABELS: Record<string, string> = {
  opportunity: 'Opportunity',
  amount: 'Amount',
  opportunityPipeline: 'Pipeline',
  opportunityPipelineStage: 'Stage',
  opportunityStatus: 'Status',
  opportunityForecast: 'Forecast',
  closeDate: 'Close Date',
  account: 'Account',
  owner: 'Owner',
  createdAt: 'Created',
  created: 'Created' // Alias for createdAt
}

/**
 * Create sortable columns from descriptors
 * @param viewDescriptors - Optional view-specific descriptors (e.g., CUSTOMER_OPPORTUNITY_DESCRIPTORS) that override common descriptors
 * @param availableColumnIds - Optional array of column IDs that are actually in the table. If provided, only descriptors with keys matching these IDs will be included.
 * @returns Array of sortable column definitions
 */
export const createOpportunitySortableColumns = (viewDescriptors?: Descriptor[], availableColumnIds?: string[]) => {
  return deriveSortableColumns(
    viewDescriptors
      ? [createOpportunityDescriptors(OpportunityFields), viewDescriptors]
      : createOpportunityDescriptors(OpportunityFields),
    OPPORTUNITY_COLUMN_LABELS,
    availableColumnIds
  )
}
