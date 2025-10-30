import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Building2, Calendar } from 'lucide-react'
import type { InvestmentOpportunity } from '@/common/data/investment/types'
import { formatDate } from '../utils'
import { formatCurrencyParts } from '@/common/utils/numberFormatter'
import { navigateTo } from '@/common/utils/navigationUtils'

// Helper to safely convert values to strings
const safeString = (value: any): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return ''
  return String(value)
}

// Helper function to get owner display name
const getOwnerName = (opportunity: InvestmentOpportunity) => {
  if (opportunity.ownerEmployee?.displayName) {
    return safeString(opportunity.ownerEmployee.displayName)
  }
  if (opportunity.ownerEmployee?.firstName || opportunity.ownerEmployee?.lastName) {
    return `${opportunity.ownerEmployee.firstName || ''} ${opportunity.ownerEmployee.lastName || ''}`.trim()
  }
  return '-'
}

// Helper function to get stage color based on alternativeCode
const getStageColor = (
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
const getStatusColor = (
  alternativeCode?: string
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' => {
  if (!alternativeCode) return 'outline'

  switch (alternativeCode.toUpperCase()) {
    case 'ACTIVE':
    case 'IN_PROGRESS':
    case 'OPEN':
      return 'info'
    case 'WON':
    case 'CLOSED_WON':
    case 'SUCCESS':
      return 'success'
    case 'LOST':
    case 'CLOSED_LOST':
    case 'FAILED':
      return 'destructive'
    case 'ON_HOLD':
    case 'PAUSED':
      return 'warning'
    case 'QUALIFIED':
      return 'secondary'
    default:
      return 'outline'
  }
}

// Helper to extract currency code from catalog ID
const extractCurrencyCode = (currencyId?: string): string => {
  if (!currencyId) return 'EUR'
  const parts = currencyId.split(':')
  return parts.length > 0 ? parts[parts.length - 1] : 'EUR'
}

export const createOpportunityColumns = (): ColumnDef<InvestmentOpportunity>[] => [
  {
    id: 'name',
    accessorFn: row => safeString(row.name),
    header: 'Opportunity',
    size: 250,
    cell: ({ row }) => {
      return (
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`opportunity-cell-${row.original.id}`}>
          <Building2 className="gba:h-4 gba:w-4 gba:text-gray-400" />
          <div className="gba:font-medium">{safeString(row.original.name)}</div>
        </div>
      )
    }
  },
  {
    id: 'amount',
    accessorFn: row => row.estimatedAmount || 0,
    header: 'Amount',
    size: 150,
    cell: ({ row }) => {
      if (!row.original.estimatedAmount) {
        return <div className="gba:text-right gba:text-gray-400">-</div>
      }

      const currencyCode = extractCurrencyCode(row.original.currency?.id)
      const { number, symbol } = formatCurrencyParts(row.original.estimatedAmount, {
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })

      return (
        <div
          className="gba:w-full gba:flex gba:justify-end gba:items-baseline"
          data-testid={`amount-cell-${row.original.id}`}
        >
          <span className="gba:text-sm gba:[font-variant-numeric:tabular-nums]">{number}</span>
          <span className="gba:text-xs gba:text-gray-400 gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch]">
            {symbol}
          </span>
        </div>
      )
    }
  },
  {
    id: 'pipeline',
    accessorFn: row => row.opportunityPipeline?.value || row.opportunityPipeline?.code || '',
    header: 'Pipeline',
    size: 150,
    cell: ({ row }) => {
      if (!row.original.opportunityPipeline) {
        return <span className="gba:text-gray-400">-</span>
      }
      const pipelineValue = safeString(row.original.opportunityPipeline.value || row.original.opportunityPipeline.code)
      return (
        <Badge variant="secondary" data-testid={`pipeline-cell-${row.original.id}`}>
          {pipelineValue}
        </Badge>
      )
    }
  },
  {
    id: 'stage',
    accessorFn: row => row.opportunityPipelineStage?.value || row.opportunityPipelineStage?.code || '',
    header: 'Stage',
    size: 150,
    cell: ({ row }) => {
      if (!row.original.opportunityPipelineStage) {
        return <span className="gba:text-gray-400">-</span>
      }
      const stageValue = safeString(
        row.original.opportunityPipelineStage.value || row.original.opportunityPipelineStage.code
      )
      const stageColor = getStageColor(row.original.opportunityPipelineStage.alternativeCode)
      return (
        <Badge variant={stageColor} data-testid={`stage-cell-${row.original.id}`}>
          {stageValue}
        </Badge>
      )
    }
  },
  {
    id: 'status',
    accessorFn: row => row.opportunityStatus?.value || row.opportunityStatus?.code || '',
    header: 'Status',
    size: 130,
    cell: ({ row }) => {
      if (!row.original.opportunityStatus) {
        return <span className="gba:text-gray-400">-</span>
      }
      const statusValue = safeString(row.original.opportunityStatus.value || row.original.opportunityStatus.code)
      const statusColor = getStatusColor(row.original.opportunityStatus.alternativeCode)
      return (
        <Badge variant={statusColor} data-testid={`status-cell-${row.original.id}`}>
          {statusValue}
        </Badge>
      )
    }
  },
  {
    id: 'closeDate',
    accessorFn: row => safeString(row.closeDate),
    header: 'Close Date',
    size: 140,
    cell: ({ row }) => {
      if (!row.original.closeDate) {
        return <span className="gba:text-gray-400">-</span>
      }
      return (
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`close-date-cell-${row.original.id}`}>
          <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
          <span className="gba:text-sm">{formatDate(row.original.closeDate)}</span>
        </div>
      )
    }
  },
  {
    id: 'account',
    accessorFn: row => row.account?.name || '',
    header: 'Account',
    size: 200,
    cell: ({ row }) => {
      if (!row.original.account) {
        return <span className="gba:text-gray-400">-</span>
      }
      return (
        <div
          className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:text-primary hover:gba:underline"
          data-testid={`account-link-${row.original.id}`}
          onClick={e => {
            e.stopPropagation()
            if (row.original.account?.id) {
              navigateTo(`/platform/irm/account-record?accountId=${row.original.account.id}`)
            }
          }}
        >
          <Building2 className="gba:h-4 gba:w-4" />
          <span className="gba:text-sm">{safeString(row.original.account.name)}</span>
        </div>
      )
    }
  },
  {
    id: 'owner',
    accessorFn: row => row.ownerEmployee?.displayName || '',
    header: 'Owner',
    size: 180,
    cell: ({ row }) => {
      if (!row.original.ownerEmployee) {
        return <span className="gba:text-gray-400">-</span>
      }

      const ownerName = getOwnerName(row.original)

      return (
        <div
          className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer hover:gba:bg-transparent focus:gba:bg-transparent gba:group"
          data-testid={`owner-link-${row.original.id}`}
          onClick={e => {
            e.stopPropagation()
            const empId = row.original.ownerEmployee?.id
            if (empId) {
              navigateTo(`/platform/employee-record?employeeId=${empId}`)
            }
          }}
        >
          <Avatar
            size="sm"
            className="gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:rounded-full"
          >
            {row.original.ownerEmployee.pictureThumbnail && (
              <AvatarImage
                src={`data:image/gif;base64,${row.original.ownerEmployee.pictureThumbnail}`}
                alt={ownerName}
              />
            )}
            <AvatarFallback>
              {(() => {
                if (ownerName === '-') return 'O'
                const initials = ownerName
                  .split(' ')
                  .map(n => n[0] || '')
                  .join('')
                  .toUpperCase()
                return initials || 'O'
              })()}
            </AvatarFallback>
          </Avatar>
          <span className="gba:text-sm">{ownerName}</span>
        </div>
      )
    }
  },
  {
    id: 'createdAt',
    accessorFn: row => safeString(row.createdAt),
    header: 'Created',
    size: 140,
    cell: ({ row }) => {
      if (!row.original.createdAt) {
        return <span className="gba:text-gray-400">-</span>
      }
      return (
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`created-cell-${row.original.id}`}>
          <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
          <span className="gba:text-sm">{formatDate(row.original.createdAt)}</span>
        </div>
      )
    }
  }
]

export const createOpportunitySortableColumns = () => {
  return [
    { id: 'name', label: 'Opportunity Name' },
    { id: 'amount', label: 'Amount' },
    { id: 'closeDate', label: 'Close Date' },
    { id: 'createdAt', label: 'Created Date' },
    { id: 'updatedAt', label: 'Updated Date' }
  ]
}
