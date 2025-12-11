import type { ColumnDef } from '@tanstack/react-table'
import {
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@newwork/nw-design-system'
import { User, Building2, Calendar, MapPin, Flag, Mail, Phone } from 'lucide-react'
import { type Lead, createLeadDescriptors, LeadFields } from '@/common/data/relations/types/leadTypes'
import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'
import { formatAddress } from '@/common/utils/addressFormatter'
import { navigateTo } from '@/common/utils/navigationUtils'
import { deriveSortableColumns, deriveAvailableColumns } from '@/common/network/graphql/descriptorUtils'

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
const getOwnerName = (lead: Lead): string => {
  if (lead.ownerEmployee?.displayName) {
    return safeString(lead.ownerEmployee.displayName)
  }
  if (lead.ownerEmployee?.firstName || lead.ownerEmployee?.lastName) {
    return `${lead.ownerEmployee.firstName || ''} ${lead.ownerEmployee.lastName || ''}`.trim()
  }
  return '-'
}

// Helper function to get lead name (inline - no mapper dependency)
const getLeadName = (lead: Lead): string => {
  if (lead.firstName && lead.lastName) {
    return `${lead.firstName} ${lead.lastName}`.trim()
  }
  if (lead.firstName) return lead.firstName
  if (lead.lastName) return lead.lastName
  return '-'
}

/**
 * Default Lead Columns
 * Uses Lead with correct IRM field names
 * Column IDs must match descriptor keys for sorting/filtering
 */
export const commonLeadColumns = (): ColumnDef<Lead>[] => [
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
    id: 'communicationChannels',
    accessorFn: row => {
      // Primary: email, Fallback: phoneNumber
      return safeString(row.email) || safeString(row.phoneNumber)
    },
    header: 'Contact Info',
    size: 200,
    minSize: 180,
    maxSize: 280,
    enableResizing: false,
    enableSorting: false,
    cell: ({ row }) => {
      const email = row.original.email
      const phoneNumber = row.original.phoneNumber
      const companyWebsite = row.original.companyWebsite

      if (!email && !phoneNumber && !companyWebsite) {
        return <span className="gba:text-sm gba:text-muted-foreground">No contact info</span>
      }

      return (
        <div className="gba:flex gba:flex-col gba:gap-1 gba:min-w-0">
          {email && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
              <Mail className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0" />
              <span className="gba:text-xs gba:truncate" title={email}>
                {email}
              </span>
            </div>
          )}
          {phoneNumber && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
              <Phone className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0" />
              <span className="gba:text-xs gba:truncate" title={phoneNumber}>
                {phoneNumber}
              </span>
            </div>
          )}
        </div>
      )
    }
  },
  {
    id: 'address',
    accessorFn: row => {
      // Primary: locality, Fallback: postalCode
      return row.locality || row.postalCode || ''
    },
    header: 'Address',
    size: 180,
    minSize: 150,
    maxSize: 250,
    enableResizing: false,
    enableSorting: false,
    cell: ({ row }) => {
      const address = formatAddress({
        addressLine: row.original.addressLine,
        locality: row.original.locality,
        postalCode: row.original.postalCode,
        region: row.original.region?.value,
        country: row.original.country?.value
      })

      if (!address) {
        return <span className="gba:text-sm gba:text-muted-foreground">No address</span>
      }

      return (
        <div className="gba:flex gba:items-start gba:gap-2 gba:min-w-0">
          <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0 gba:mt-0.5" />
          <span className="gba:text-sm gba:whitespace-pre-line" title={address}>
            {address}
          </span>
        </div>
      )
    }
  },
  {
    id: 'leadStatus',
    accessorFn: row => (row.leadStatus ? getCatalogEntryValue(row.leadStatus as any) : ''),
    header: 'Status',
    size: 140,
    minSize: 120,
    maxSize: 180,
    enableResizing: false,
    cell: ({ row }) => {
      const status = row.original.leadStatus ? getCatalogEntryValue(row.original.leadStatus as any) : undefined
      if (!status) {
        return <span className="gba:text-sm gba:text-muted-foreground">No status</span>
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
    id: 'leadRating',
    accessorFn: row => (row.leadRating ? getCatalogEntryValue(row.leadRating as any) : ''),
    header: 'Rating',
    size: 120,
    minSize: 100,
    maxSize: 150,
    enableResizing: false,
    cell: ({ row }) => {
      const rating = row.original.leadRating ? getCatalogEntryValue(row.original.leadRating as any) : undefined
      if (!rating) {
        return <span className="gba:text-sm gba:text-muted-foreground">No rating</span>
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
    id: 'leadSource',
    accessorFn: row => (row.leadSource ? getCatalogEntryValue(row.leadSource as any) : ''),
    header: 'Source',
    size: 140,
    minSize: 120,
    maxSize: 180,
    enableResizing: false,
    cell: ({ row }) => {
      const source = row.original.leadSource ? getCatalogEntryValue(row.original.leadSource as any) : undefined
      if (!source) {
        return <span className="gba:text-sm gba:text-muted-foreground">No source</span>
      }
      return (
        <span className="gba:text-sm gba:truncate gba:block" title={source}>
          {source}
        </span>
      )
    }
  },
  {
    id: 'industryClass',
    accessorFn: row => (row.industryClass ? getCatalogEntryValue(row.industryClass as any) : ''),
    header: 'Industry',
    size: 160,
    minSize: 140,
    maxSize: 220,
    enableResizing: false,
    cell: ({ row }) => {
      const industry = row.original.industryClass ? getCatalogEntryValue(row.original.industryClass as any) : undefined
      if (!industry) {
        return <span className="gba:text-sm gba:text-muted-foreground">No industry</span>
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
        <span className="gba:text-sm gba:text-muted-foreground">No date</span>
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
        return <span className="gba:text-sm gba:text-muted-foreground">No owner</span>
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
            {owner.pictureThumbnail ? (
              <AvatarImage src={`data:image/jpeg;base64,${owner.pictureThumbnail}`} alt={ownerName} />
            ) : null}
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
 * Default sortable columns derived from descriptors
 * Automatically includes all descriptors with enableSort !== false and sortPath/sortPaths
 */
const LEAD_COLUMN_LABELS: Record<string, string> = {
  lead: 'Lead',
  firstName: 'First Name',
  lastName: 'Last Name',
  companyName: 'Company',
  leadStatus: 'Status',
  leadRating: 'Rating',
  leadSource: 'Source',
  industryClass: 'Industry',
  ownerEmployee: 'Owner',
  createdAt: 'Created Date',
  updatedAt: 'Updated Date'
}

export const defaultLeadSortableColumns = deriveSortableColumns(createLeadDescriptors(LeadFields), LEAD_COLUMN_LABELS)

/**
 * Default visible columns
 */
export const defaultVisibleLeadColumns = [
  'lead',
  'communicationChannels',
  'address',
  'leadStatus',
  'leadRating',
  'leadSource',
  'createdAt',
  'ownerEmployee'
]

/**
 * Default available columns derived from column definitions
 * Automatically includes all columns with an id
 */
export const defaultAvailableLeadColumns = deriveAvailableColumns(commonLeadColumns())
