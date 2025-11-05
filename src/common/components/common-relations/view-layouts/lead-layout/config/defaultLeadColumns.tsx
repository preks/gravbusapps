import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Avatar, AvatarFallback, Tooltip, TooltipTrigger, TooltipContent } from '@newwork/nw-design-system'
import { User, Building2, Calendar, MapPin, Flag } from 'lucide-react'
import type { CommonLead } from '@/common/data/relations/types/commonLeadTypes'
import { getLeadName } from '@/common/data/relations/mappers/leadMapper'
import {
  getCommunicationChannelIcon,
  formatCommunicationChannelValue
} from '@/common/data/common/utils/communicationChannelUtils'
import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'
import { formatAddress } from '@/common/utils/addressFormatter'
import { navigateTo } from '@/common/utils/navigationUtils'

// Helper to safely convert values to strings
const safeString = (value: any): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return ''
  return String(value)
}

// Helper function to format date
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return '-'
  }
}

// Helper function to get lead status variant
const getLeadStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' => {
  const statusLower = status.toLowerCase()
  if (statusLower.includes('new')) return 'info'
  if (statusLower.includes('open') || statusLower.includes('contacted')) return 'default'
  if (statusLower.includes('qualified')) return 'success'
  if (statusLower.includes('converted')) return 'success'
  if (statusLower.includes('lost') || statusLower.includes('disqualified')) return 'destructive'
  return 'default'
}

// Helper function to get owner display name
const getOwnerName = (lead: CommonLead): string => {
  if (lead.ownerEmployee?.displayName) {
    return safeString(lead.ownerEmployee.displayName)
  }
  if (lead.ownerEmployee?.firstName || lead.ownerEmployee?.lastName) {
    return `${lead.ownerEmployee.firstName || ''} ${lead.ownerEmployee.lastName || ''}`.trim()
  }
  return '-'
}

/**
 * Default Lead Columns
 * Uses CommonLead (the CORRECT structure)
 * Leads must be mapped via leadMapper before passing to these columns
 */
export const defaultLeadColumns = (): ColumnDef<CommonLead>[] => [
  {
    id: 'lead',
    accessorFn: row => getLeadName(row),
    header: 'Lead',
    size: 250,
    minSize: 200,
    maxSize: 350,
    enableResizing: false,
    cell: ({ row }) => {
      const leadName = getLeadName(row.original)
      const companyName = safeString(row.original.companyName)
      const isSensitive = row.original.sensitive

      return (
        <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0" data-testid={`lead-cell-${row.original.id}`}>
          <Avatar className="gba:w-8 gba:h-8 gba:shrink-0">
            <AvatarFallback>
              {companyName ? (
                <Building2 className="gba:h-4 gba:w-4" />
              ) : (
                (() => {
                  if (leadName === '-') return <User className="gba:h-4 gba:w-4" />
                  const initials = leadName
                    .split(' ')
                    .map(n => n[0] || '')
                    .join('')
                    .toUpperCase()
                    .substring(0, 2)
                  return initials || <User className="gba:h-4 gba:w-4" />
                })()
              )}
            </AvatarFallback>
          </Avatar>
          <div className="gba:min-w-0 gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:font-medium gba:text-sm gba:truncate" title={leadName}>
                {leadName}
              </span>
              {isSensitive && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Flag className="gba:h-3.5 gba:w-3.5 gba:text-warning gba:shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>Sensitive</TooltipContent>
                </Tooltip>
              )}
            </div>
            {companyName && (
              <div className="gba:text-xs gba:text-gray-500 gba:truncate" title={companyName}>
                {companyName}
              </div>
            )}
          </div>
        </div>
      )
    }
  },
  {
    id: 'contactInfo',
    accessorFn: row => {
      if (row.communicationChannels?.length) {
        const email = row.communicationChannels.find(ch => ch.communicationChannel?.type?.toLowerCase() === 'email')
        return safeString(email?.value)
      }
      return ''
    },
    header: 'Contact Info',
    size: 200,
    minSize: 180,
    maxSize: 280,
    enableResizing: false,
    cell: ({ row }) => {
      const channels = row.original.communicationChannels || []

      if (channels.length === 0) {
        return <span className="gba:text-gray-400">-</span>
      }

      // Display communication channels with proper icons
      return (
        <div className="gba:flex gba:flex-col gba:gap-1 gba:min-w-0">
          {channels.slice(0, 2).map((channel, index) => {
            const type = channel.communicationChannel?.type
            const value = channel.value

            if (!value) return null

            const Icon = getCommunicationChannelIcon(type)
            const displayValue = formatCommunicationChannelValue(type, value)

            return (
              <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
                <Icon className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0" />
                <span className="gba:text-xs gba:truncate" title={value}>
                  {displayValue}
                </span>
              </div>
            )
          })}
          {channels.length > 2 && <span className="gba:text-xs gba:text-gray-500">+{channels.length - 2} more</span>}
        </div>
      )
    }
  },
  {
    id: 'location',
    accessorFn: row => {
      const address = row.address
      if (!address) return ''

      // Use formatAddress util for proper formatting
      return formatAddress({
        addressLine: address.addressLine,
        locality: address.locality,
        postalCode: address.postalCode,
        region: address.region?.value,
        country: address.country?.value
      })
    },
    header: 'Location',
    size: 180,
    minSize: 150,
    maxSize: 250,
    enableResizing: false,
    cell: ({ row }) => {
      const address = row.original.address
      if (!address) {
        return <span className="gba:text-gray-400">-</span>
      }

      // Use formatAddress util for proper formatting
      const location = formatAddress({
        addressLine: address.addressLine,
        locality: address.locality,
        postalCode: address.postalCode,
        region: address.region?.value,
        country: address.country?.value
      })

      if (!location) {
        return <span className="gba:text-gray-400">-</span>
      }

      return (
        <div className="gba:flex gba:items-start gba:gap-2 gba:min-w-0">
          <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0 gba:mt-0.5" />
          <span className="gba:text-sm gba:whitespace-pre-line" title={location}>
            {location}
          </span>
        </div>
      )
    }
  },
  {
    id: 'status',
    accessorFn: row => (row.leadStatus ? getCatalogEntryValue(row.leadStatus as any) : ''),
    header: 'Status',
    size: 140,
    minSize: 120,
    maxSize: 180,
    enableResizing: false,
    cell: ({ row }) => {
      const status = row.original.leadStatus ? getCatalogEntryValue(row.original.leadStatus as any) : undefined
      if (!status) {
        return <span className="gba:text-gray-400">-</span>
      }

      const variant = getLeadStatusVariant(status)

      return (
        <Badge variant={variant} data-testid={`lead-status-${row.original.id}`}>
          {status}
        </Badge>
      )
    }
  },
  {
    id: 'rating',
    accessorFn: row => (row.leadRating ? getCatalogEntryValue(row.leadRating as any) : ''),
    header: 'Rating',
    size: 120,
    minSize: 100,
    maxSize: 150,
    enableResizing: false,
    cell: ({ row }) => {
      const rating = row.original.leadRating ? getCatalogEntryValue(row.original.leadRating as any) : undefined
      if (!rating) {
        return <span className="gba:text-gray-400">-</span>
      }

      // Determine priority based on rating
      let variant: 'default' | 'warning' | 'destructive' = 'default'
      const ratingLower = rating.toLowerCase()
      if (ratingLower.includes('hot') || ratingLower.includes('high')) {
        variant = 'destructive'
      } else if (ratingLower.includes('warm') || ratingLower.includes('medium')) {
        variant = 'warning'
      }

      return (
        <Badge variant={variant} data-testid={`lead-rating-${row.original.id}`}>
          {rating}
        </Badge>
      )
    }
  },
  {
    id: 'source',
    accessorFn: row => (row.leadSource ? getCatalogEntryValue(row.leadSource as any) : ''),
    header: 'Source',
    size: 140,
    minSize: 120,
    maxSize: 180,
    enableResizing: false,
    cell: ({ row }) => {
      const source = row.original.leadSource ? getCatalogEntryValue(row.original.leadSource as any) : undefined
      if (!source) {
        return <span className="gba:text-gray-400">-</span>
      }
      return (
        <span className="gba:text-sm gba:truncate gba:block" title={source}>
          {source}
        </span>
      )
    }
  },
  {
    id: 'industry',
    accessorFn: row => (row.industryClass ? getCatalogEntryValue(row.industryClass as any) : ''),
    header: 'Industry',
    size: 160,
    minSize: 140,
    maxSize: 220,
    enableResizing: false,
    cell: ({ row }) => {
      const industry = row.original.industryClass ? getCatalogEntryValue(row.original.industryClass as any) : undefined
      if (!industry) {
        return <span className="gba:text-gray-400">-</span>
      }
      return (
        <span className="gba:text-sm gba:truncate gba:block" title={industry}>
          {industry}
        </span>
      )
    }
  },
  {
    id: 'createdAt',
    accessorFn: row => safeString(row.createdAt),
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
        <span className="gba:text-gray-400">-</span>
      )
  },
  {
    id: 'ownerEmployee',
    accessorFn: row => getOwnerName(row),
    header: 'Owner',
    size: 180,
    minSize: 150,
    maxSize: 250,
    enableResizing: false,
    cell: ({ row }) => {
      const owner = row.original.ownerEmployee
      if (!owner) {
        return <span className="gba:text-gray-400">-</span>
      }
      const ownerName = getOwnerName(row.original)

      return (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            const empId = row.original.ownerEmployee?.id
            if (empId) {
              navigateTo(`/platform/employee-record?employeeId=${empId}`)
            }
          }}
          className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:group gba:bg-transparent gba:border-0 gba:p-0 gba:w-full gba:text-left"
          data-testid={`owner-link-${row.original.id}`}
        >
          <Avatar className="gba:w-8 gba:h-8 gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:transition-all">
            <AvatarFallback>
              {(() => {
                if (ownerName === '-') return 'O'
                const initials = ownerName
                  .split(' ')
                  .map(n => n[0] || '')
                  .join('')
                  .toUpperCase()
                  .substring(0, 2)
                return initials || 'O'
              })()}
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
  }
]

/**
 * Default sortable columns
 * Only include columns that map to actual database fields
 */
export const defaultLeadSortableColumns = [
  { id: 'lead', label: 'Lead' },
  { id: 'firstName', label: 'First Name' },
  { id: 'lastName', label: 'Last Name' },
  { id: 'fullName', label: 'Full Name' },
  { id: 'companyName', label: 'Company' },
  { id: 'status', label: 'Status' },
  { id: 'rating', label: 'Rating' },
  { id: 'source', label: 'Source' },
  { id: 'industry', label: 'Industry' },
  { id: 'ownerEmployee', label: 'Owner' },
  { id: 'createdAt', label: 'Created Date' },
  { id: 'updatedAt', label: 'Updated Date' }
  // contactInfo, location are NOT sortable (computed fields)
]

/**
 * Default column mapping for CommonLead
 * Maps column IDs to GraphQL field paths for sorting
 */
export const defaultLeadColumnMapping: Record<string, string> = {
  // Scalar fields
  firstName: 'firstName',
  lastName: 'lastName',
  fullName: 'fullName',
  companyName: 'companyName',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',

  // Catalog fields (CommonLead naming with translated value sorting)
  status: 'leadStatus.value',
  rating: 'leadRating.value',
  source: 'leadSource.value',
  industry: 'industryClass.value',

  // Employee fields (sort by displayName)
  ownerEmployee: 'ownerEmployee.displayName'
}

/**
 * Create column to GraphQL mapping with custom overrides
 * @param overrides - Custom column ID to GraphQL field mappings
 * @returns Function that maps column ID to GraphQL field path
 */
export const createLeadColumnToGraphQLMapping = (
  overrides: Record<string, string> = {}
): ((columnId: string) => string) => {
  return (columnId: string) => {
    // Override has priority
    if (overrides[columnId]) {
      return overrides[columnId]
    }
    // Then default
    return defaultLeadColumnMapping[columnId] || 'createdAt'
  }
}

/**
 * Default visible columns
 */
export const defaultVisibleLeadColumns = [
  'lead',
  'contactInfo',
  'location',
  'status',
  'rating',
  'source',
  'createdAt',
  'ownerEmployee'
]

/**
 * Default available columns for column selector
 */
export const defaultAvailableLeadColumns = [
  { id: 'lead', label: 'Lead' },
  { id: 'contactInfo', label: 'Contact Info' },
  { id: 'location', label: 'Location' },
  { id: 'status', label: 'Status' },
  { id: 'rating', label: 'Rating' },
  { id: 'source', label: 'Source' },
  { id: 'industry', label: 'Industry' },
  { id: 'createdAt', label: 'Created' },
  { id: 'ownerEmployee', label: 'Owner' }
]
