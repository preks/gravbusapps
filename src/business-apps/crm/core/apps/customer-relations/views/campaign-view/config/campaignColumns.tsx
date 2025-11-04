import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@newwork/nw-design-system'
import { Calendar, Tag } from 'lucide-react'
import type { SalesCampaign } from '../components/campaign-list/types/SalesCampaignTypes'
import dayjs from 'dayjs'

// Helper to safely convert values to strings
const safeString = (value: any): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return ''
  return String(value)
}

// Helper function to format date
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-'
  return dayjs(dateString).format('DD/MM/YYYY')
}

// Helper to compute campaign status from dates
const getCampaignStatus = (startDate?: string, endDate?: string): string => {
  if (!startDate || !endDate) return '-'
  const now = dayjs()
  const start = dayjs(startDate)
  const end = dayjs(endDate)

  if (now.isBefore(start, 'day')) return 'Planned'
  if (now.isAfter(end, 'day')) return 'Completed'
  return 'Active'
}

// Helper to get status badge variant
const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'info' => {
  if (status === 'Active') return 'success'
  if (status === 'Planned') return 'info'
  if (status === 'Completed') return 'default'
  return 'default'
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
    cell: ({ row }) => (
      <div
        className="gba:flex gba:items-center gba:gap-2 gba:min-w-0"
        data-testid={`campaign-name-cell-${row.original.id}`}
      >
        <Tag className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:font-medium gba:text-sm gba:truncate" title={safeString(row.original.name)}>
            {safeString(row.original.name)}
          </div>
          {row.original.description && (
            <div className="gba:text-xs gba:text-gray-500 gba:truncate" title={safeString(row.original.description)}>
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
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.type) {
        return <span className="gba:text-gray-400">-</span>
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
    cell: ({ row }) => (
      <div className="gba:flex gba:items-center gba:gap-2" data-testid={`campaign-start-date-cell-${row.original.id}`}>
        <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
        <span className="gba:text-sm">{formatDate(row.original.startDate)}</span>
      </div>
    )
  },
  {
    id: 'endDate',
    accessorFn: row => safeString(row.endDate),
    header: 'End Date',
    size: 130,
    minSize: 110,
    maxSize: 160,
    enableResizing: false,
    cell: ({ row }) => (
      <div className="gba:flex gba:items-center gba:gap-2" data-testid={`campaign-end-date-cell-${row.original.id}`}>
        <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
        <span className="gba:text-sm">{formatDate(row.original.endDate)}</span>
      </div>
    )
  },
  {
    id: 'status',
    accessorFn: row => getCampaignStatus(row.startDate, row.endDate),
    header: 'Status',
    size: 120,
    minSize: 100,
    maxSize: 150,
    enableResizing: false,
    cell: ({ row }) => {
      const status = getCampaignStatus(row.original.startDate, row.original.endDate)
      return (
        <Badge variant={getStatusVariant(status)} data-testid={`campaign-status-cell-${row.original.id}`}>
          {status}
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
    cell: ({ row }) => (
      <div className="gba:flex gba:items-center gba:gap-2" data-testid={`campaign-created-cell-${row.original.id}`}>
        <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
        <span className="gba:text-sm">{formatDate(row.original.createdAt)}</span>
      </div>
    )
  }
]

export const createCampaignSortableColumns = () => {
  return [
    { id: 'name', label: 'Campaign Name' },
    { id: 'startDate', label: 'Start Date' },
    { id: 'endDate', label: 'End Date' },
    { id: 'createdAt', label: 'Created Date' },
    { id: 'updatedAt', label: 'Updated Date' }
  ]
}
