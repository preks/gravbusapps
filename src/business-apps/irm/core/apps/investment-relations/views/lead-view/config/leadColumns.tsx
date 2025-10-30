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
import type { InvestmentLead } from '@/common/data/investment/types'
import { formatDate, getLeadStatusVariant } from '../utils'
import { formatAddress } from '@/common/utils/addressFormatter'
import { navigateTo } from '@/common/utils/navigationUtils'

// Helper function to safely convert to string
const safeString = (value: any): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return ''
  return String(value)
}

// Helper function to get contact display name
const getContactName = (lead: InvestmentLead): string => {
  const firstName = safeString(lead.firstName)
  const lastName = safeString(lead.lastName)
  return `${firstName} ${lastName}`.trim() || '-'
}

// Helper function to get owner display name
const getOwnerName = (lead: InvestmentLead): string => {
  if (lead.ownerEmployee?.displayName) {
    return safeString(lead.ownerEmployee.displayName)
  }
  const firstName = safeString(lead.ownerEmployee?.firstName)
  const lastName = safeString(lead.ownerEmployee?.lastName)
  const fullName = `${firstName} ${lastName}`.trim()
  return fullName || '-'
}

export const createLeadColumns = (): ColumnDef<InvestmentLead>[] => [
  {
    id: 'firstName',
    accessorFn: row => safeString(row.displayName || row.fullName || row.companyName),
    header: 'Lead',
    size: 300,
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
    size: 200,
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
    accessorKey: 'cityValue',
    header: 'Address',
    size: 250,
    cell: ({ row }) => {
      const address = formatAddress({
        addressLine: row.original.addressLine,
        locality: row.original.locality,
        postalCode: row.original.postalCode,
        region: row.original.region?.value,
        country: row.original.country?.value
      })

      if (!address) {
        return (
          <div className="gba:flex gba:items-start gba:gap-2" data-testid={`address-cell-${row.original.id}`}>
            <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:mt-0.5" />
            <span className="gba:text-gray-400">-</span>
          </div>
        )
      }

      // Safely process address lines: ensure each line is a string before trimming
      const addressText = String(address || '')
        .split('\n')
        .map(line => String(line || '').trim())
        .filter(line => line.length > 0)
        .join(', ')

      return (
        <div className="gba:flex gba:items-start gba:gap-2" data-testid={`address-cell-${row.original.id}`}>
          <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:mt-0.5" />
          <div className="gba:text-sm gba:text-gray-700">{addressText || '-'}</div>
        </div>
      )
    }
  },
  {
    id: 'leadStatus',
    accessorKey: 'leadStatusValue',
    header: 'Status',
    size: 130,
    cell: ({ row }) => {
      const statusValue = safeString(row.original.leadStatus?.value || row.original.leadStatus?.code || '-')
      return <Badge variant={getLeadStatusVariant(statusValue)}>{statusValue}</Badge>
    }
  },
  {
    id: 'leadRating',
    accessorKey: 'leadRatingValue',
    header: 'Rating',
    size: 120,
    cell: ({ row }) => <Badge variant="default">{safeString(row.original.leadRating?.value || '-')}</Badge>
  },
  {
    id: 'leadSource',
    accessorKey: 'leadSourceValue',
    header: 'Source',
    size: 140,
    cell: ({ row }) => {
      const sourceValue = safeString(row.original.leadSource?.value || '-')
      return (
        <div className="gba:text-sm gba:text-gray-700 gba:truncate" title={sourceValue}>
          {sourceValue}
        </div>
      )
    }
  },
  {
    id: 'ownerEmployee',
    accessorKey: 'ownerEmployeeName',
    header: 'Owner',
    size: 180,
    cell: ({ row }) => (
      <div data-testid={`owner-cell-${row.original.id}`}>
        {row.original.ownerEmployee ? (
          <div
            className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer hover:gba:bg-transparent focus:gba:bg-transparent gba:group"
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
            <div className="gba:flex gba:flex-col">
              <span className="gba:font-medium gba:text-sm">{getOwnerName(row.original)}</span>
            </div>
          </div>
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
    size: 140,
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
    { id: 'companyName', label: 'Company Name' },
    { id: 'email', label: 'Email' },
    { id: 'phoneNumber', label: 'Phone' },
    { id: 'leadStatus', label: 'Status' },
    { id: 'leadRating', label: 'Rating' },
    { id: 'leadSource', label: 'Source' },
    { id: 'ownerEmployee', label: 'Owner' },
    { id: 'city', label: 'City' },
    { id: 'postalCode', label: 'Postal Code' },
    { id: 'createdAt', label: 'Created Date' },
    { id: 'updatedAt', label: 'Updated Date' },
    { id: 'code', label: 'Code' }
  ]
}
