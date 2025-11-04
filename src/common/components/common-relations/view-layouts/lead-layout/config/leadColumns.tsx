import type { ColumnDef } from '@tanstack/react-table'
import {
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { User, Building2, Mail, Phone, Calendar, MapPin, Flag } from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { formatAddress } from '@/common/utils/addressFormatter'

// Helper function to safely convert to string
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

// Generic Lead interface for columns
interface BaseLead {
  id: string
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  fullName?: string | null
  companyName?: string | null
  email?: string | null
  phoneNumber?: string | null
  addressLine?: string | null
  locality?: string | null
  postalCode?: string | null
  region?: { value?: string } | null
  country?: { value?: string } | null
  leadStatus?: { value?: string; code?: string } | null
  leadRating?: { value?: string } | null
  leadSource?: { value?: string } | null
  ownerEmployee?: {
    id: string
    displayName?: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
  } | null
  createdAt?: string | null
  sensitive?: boolean | null
}

// Helper function to get contact display name
const getContactName = (lead: BaseLead): string => {
  const firstName = safeString(lead.firstName)
  const lastName = safeString(lead.lastName)
  return `${firstName} ${lastName}`.trim() || '-'
}

// Helper function to get owner display name
const getOwnerName = (lead: BaseLead): string => {
  if (lead.ownerEmployee?.displayName) {
    return safeString(lead.ownerEmployee.displayName)
  }
  const firstName = safeString(lead.ownerEmployee?.firstName)
  const lastName = safeString(lead.ownerEmployee?.lastName)
  const fullName = `${firstName} ${lastName}`.trim()
  return fullName || '-'
}

export const createLeadColumns = <TLead extends BaseLead>(): ColumnDef<TLead>[] => [
  {
    id: 'firstName',
    accessorFn: row => safeString(row.displayName || row.fullName || row.companyName),
    header: 'Lead',
    size: 250,
    minSize: 200,
    maxSize: 350,
    enableResizing: false,
    cell: ({ row }) => (
      <div className="gba:space-y-2" data-testid={`lead-combined-cell-${row.original.id}`}>
        {/* Contact Name */}
        {(row.original.firstName || row.original.lastName) && (
          <div className="gba:flex gba:items-center gba:gap-2">
            <User className="gba:w-4 gba:h-4 gba:text-gray-500" />
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:font-medium gba:text-sm">{getContactName(row.original)}</span>
              {row.original.sensitive && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="warning"
                        className="gba:rounded-full gba:p-1 gba:h-5 gba:w-5 gba:flex gba:items-center gba:justify-center"
                      >
                        <Flag className="gba:w-3 gba:h-3" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Sensitive</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}
        {/* Company Name */}
        {row.original.companyName && (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Building2 className="gba:w-4 gba:h-4 gba:text-gray-500" />
            <span className="gba:text-sm gba:text-gray-700">{safeString(row.original.companyName)}</span>
          </div>
        )}
        {!(row.original.firstName || row.original.lastName || row.original.companyName) && (
          <span className="gba:text-gray-400">-</span>
        )}
      </div>
    )
  },
  {
    id: 'email',
    accessorFn: row => safeString(row.email),
    header: 'Contact Info',
    size: 180,
    minSize: 150,
    maxSize: 250,
    enableResizing: false,
    cell: ({ row }) => (
      <div className="gba:space-y-1" data-testid={`contact-info-cell-${row.original.id}`}>
        {row.original.email && (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Mail className="gba:w-4 gba:h-4 gba:text-gray-500" />
            <span className="gba:text-sm gba:truncate">{safeString(row.original.email)}</span>
          </div>
        )}
        {row.original.phoneNumber && (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Phone className="gba:w-4 gba:h-4 gba:text-gray-500" />
            <span className="gba:text-sm">{safeString(row.original.phoneNumber)}</span>
          </div>
        )}
      </div>
    )
  },
  {
    id: 'locality',
    accessorFn: row => safeString(row.locality),
    header: 'Address',
    size: 200,
    minSize: 150,
    maxSize: 300,
    enableResizing: false,
    cell: ({ row }) => {
      const address = formatAddress({
        addressLine: row.original.addressLine as any,
        locality: row.original.locality,
        postalCode: row.original.postalCode,
        region: row.original.region?.value,
        country: row.original.country?.value
      })

      if (!address) {
        return (
          <div className="gba:flex gba:items-start gba:gap-2" data-testid={`address-cell-${row.original.id}`}>
            <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0 gba:mt-0.5" />
            <span className="gba:text-gray-400">-</span>
          </div>
        )
      }

      const addressParts = address.split('\n').filter(line => line.trim())

      return (
        <div className="gba:flex gba:items-start gba:gap-2 gba:min-w-0" data-testid={`address-cell-${row.original.id}`}>
          <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0 gba:mt-0.5" />
          <div className="gba:flex gba:flex-col gba:gap-1 gba:min-w-0">
            {addressParts.map((part, index) => (
              <div key={index} className="gba:text-sm gba:leading-snug gba:truncate" title={part}>
                {part}
              </div>
            ))}
          </div>
        </div>
      )
    }
  },
  {
    id: 'leadStatus',
    accessorFn: row => safeString(row.leadStatus?.value || row.leadStatus?.code),
    header: 'Status',
    size: 120,
    minSize: 100,
    maxSize: 150,
    enableResizing: false,
    cell: ({ row }) => {
      const statusValue = safeString(row.original.leadStatus?.value || row.original.leadStatus?.code || '-')
      return <Badge variant={getLeadStatusVariant(statusValue)}>{statusValue}</Badge>
    }
  },
  {
    id: 'leadRating',
    accessorFn: row => safeString(row.leadRating?.value),
    header: 'Rating',
    size: 110,
    minSize: 90,
    maxSize: 140,
    enableResizing: false,
    cell: ({ row }) => <Badge variant="default">{safeString(row.original.leadRating?.value || '-')}</Badge>
  },
  {
    id: 'leadSource',
    accessorFn: row => safeString(row.leadSource?.value),
    header: 'Source',
    size: 140,
    minSize: 120,
    maxSize: 180,
    enableResizing: false,
    cell: ({ row }) => {
      const sourceValue = safeString(row.original.leadSource?.value || '-')
      return (
        <div className="gba:text-sm gba:text-gray-700 gba:truncate gba:min-w-0" title={sourceValue}>
          {sourceValue}
        </div>
      )
    }
  },
  {
    id: 'ownerEmployee',
    accessorFn: row => getOwnerName(row),
    header: 'Owner',
    size: 200,
    minSize: 180,
    maxSize: 280,
    enableResizing: false,
    cell: ({ row }) => (
      <div data-testid={`owner-cell-${row.original.id}`}>
        {row.original.ownerEmployee ? (
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
              {row.original.ownerEmployee?.pictureThumbnail && (
                <AvatarImage
                  src={`data:image/gif;base64,${row.original.ownerEmployee.pictureThumbnail}`}
                  alt={getOwnerName(row.original)}
                />
              )}
              <AvatarFallback>
                {(() => {
                  const ownerName = getOwnerName(row.original)
                  if (ownerName === '-') return 'U'
                  const initials = ownerName
                    .split(' ')
                    .map(n => n[0] || '')
                    .join('')
                    .toUpperCase()
                  return initials || 'U'
                })()}
              </AvatarFallback>
            </Avatar>
            <div className="gba:min-w-0 gba:flex-1">
              <div className="gba:font-medium gba:truncate gba:text-sm gba:group-hover:gba:text-primary gba:transition-colors">
                {getOwnerName(row.original)}
              </div>
            </div>
          </button>
        ) : (
          <div className="gba:text-gray-400">-</div>
        )}
      </div>
    )
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
      <div className="gba:flex gba:items-center gba:gap-2" data-testid={`created-cell-${row.original.id}`}>
        <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
        <span className="gba:text-sm gba:text-gray-700">
          {row.original.createdAt ? formatDate(row.original.createdAt) : '-'}
        </span>
      </div>
    )
  }
]

export const createLeadSortableColumns = () => {
  return [
    { id: 'firstName', label: 'Lead (First Name)' },
    { id: 'lastName', label: 'Lead (Last Name)' },
    { id: 'email', label: 'Email' },
    { id: 'createdAt', label: 'Created Date' },
    { id: 'updatedAt', label: 'Updated Date' }
  ]
}
