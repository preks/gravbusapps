import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { User, Building2, Calendar, MapPin, Flag } from 'lucide-react'
import type { CommonLead } from '@/common/data/relations/types/commonLeadTypes'
import { getLeadName } from '@/common/data/relations/mappers/leadMapper'
import {
  getCommunicationChannelIcon,
  formatCommunicationChannelValue
} from '@/common/data/common/utils/communicationChannelUtils'

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
      const imageUrl = row.original.pictureThumbnail
        ? `data:image/gif;base64,${row.original.pictureThumbnail}`
        : undefined

      return (
        <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0" data-testid={`lead-cell-${row.original.id}`}>
          <Avatar className="gba:w-8 gba:h-8 gba:shrink-0">
            {imageUrl && <AvatarImage src={imageUrl} alt={leadName} />}
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
            <div className="gba:font-medium gba:text-sm gba:truncate" title={leadName}>
              {leadName}
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
      const address = row.addresses?.[0]
      if (!address) return ''
      return `${address.locality || ''} ${address.country?.value || ''}`.trim()
    },
    header: 'Location',
    size: 180,
    minSize: 150,
    maxSize: 250,
    enableResizing: false,
    cell: ({ row }) => {
      const address = row.original.addresses?.[0]
      if (!address || (!address.locality && !address.country)) {
        return <span className="gba:text-gray-400">-</span>
      }

      const location = `${address.locality || ''}, ${address.country?.value || ''}`
        .replace(/^,\s*/, '')
        .replace(/,\s*$/, '')

      return (
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
          <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0" />
          <span className="gba:text-sm gba:truncate" title={location}>
            {location}
          </span>
        </div>
      )
    }
  },
  {
    id: 'status',
    accessorFn: row => row.status?.value || '',
    header: 'Status',
    size: 140,
    minSize: 120,
    maxSize: 180,
    enableResizing: false,
    cell: ({ row }) => {
      const status = row.original.status?.value
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
    accessorFn: row => row.rating?.value || '',
    header: 'Rating',
    size: 120,
    minSize: 100,
    maxSize: 150,
    enableResizing: false,
    cell: ({ row }) => {
      const rating = row.original.rating?.value
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
        <div className="gba:flex gba:items-center gba:gap-2">
          <Flag
            className={`gba:w-4 gba:h-4 ${variant === 'destructive' ? 'gba:text-red-500' : variant === 'warning' ? 'gba:text-orange-500' : 'gba:text-gray-400'}`}
          />
          <span className="gba:text-sm">{rating}</span>
        </div>
      )
    }
  },
  {
    id: 'source',
    accessorFn: row => row.source?.value || '',
    header: 'Source',
    size: 140,
    minSize: 120,
    maxSize: 180,
    enableResizing: false,
    cell: ({ row }) => {
      const source = row.original.source?.value
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
    accessorFn: row => row.industry?.value || '',
    header: 'Industry',
    size: 160,
    minSize: 140,
    maxSize: 220,
    enableResizing: false,
    cell: ({ row }) => {
      const industry = row.original.industry?.value
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
      const imageUrl = owner.pictureThumbnail ? `data:image/gif;base64,${owner.pictureThumbnail}` : undefined

      return (
        <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
          <Avatar className="gba:w-8 gba:h-8 gba:shrink-0">
            {imageUrl && <AvatarImage src={imageUrl} alt={ownerName} />}
            <AvatarFallback>
              {ownerName
                .split(' ')
                .map(n => n[0] || '')
                .join('')
                .toUpperCase()
                .substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="gba:min-w-0 gba:flex-1">
            <div className="gba:font-medium gba:truncate gba:text-sm">{ownerName}</div>
          </div>
        </div>
      )
    }
  }
]

/**
 * Default sortable columns
 * Only include columns that map to actual database fields
 */
export const defaultLeadSortableColumns = [
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
  // contactInfo, location are NOT sortable (computed/joined columns)
]

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
