import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Building2, Mail, Phone, Globe, Calendar, MapPin } from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { formatAddress } from '@/common/utils/addressFormatter'
import { formatCurrencyParts } from '@/common/utils/numberFormatter'

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

// Generic Account interface for columns
interface BaseAccount {
  id: string
  name?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  geographicPresence?: string | null
  investmentAddress?: Array<{
    addressType?: string
    addressLine?: { lines: string[] } | null
    locality?: string | null
    postalCode?: string | null
    region?: { value?: string } | null
    country?: { value?: string } | null
  }> | null
  addresses?: Array<{
    type?: string
    street?: string | null
    city?: string | null
    postalCode?: string | null
    region?: { value?: string } | null
    country?: { value?: string } | null
  }> | null
  industryClass?: { value?: string; code?: string } | null
  legalForm?: { value?: string; code?: string } | null
  companySize?: { value?: string; code?: string } | null
  accountAnnualRevenueBand?: { value?: string; code?: string } | null
  ownerEmployee?: {
    id: string
    displayName?: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
  } | null
  createdAt?: string | null
}

// Helper function to get owner display name
const getOwnerName = (account: BaseAccount) => {
  if (account.ownerEmployee?.displayName) {
    return safeString(account.ownerEmployee.displayName)
  }
  if (account.ownerEmployee?.firstName || account.ownerEmployee?.lastName) {
    return `${account.ownerEmployee.firstName || ''} ${account.ownerEmployee.lastName || ''}`.trim()
  }
  return '-'
}

// Currency rendering via central formatter
const renderAmount = (amount: number, currencyCode?: string) => {
  const { number, symbol } = formatCurrencyParts(amount, {
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
  return (
    <div className="gba:w-full gba:flex gba:justify-end gba:items-baseline gba:min-w-0">
      <span className="gba:text-sm gba:[font-variant-numeric:tabular-nums] gba:truncate">{number}</span>
      <span className="gba:text-xs gba:text-gray-400 gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch]">
        {symbol}
      </span>
    </div>
  )
}

// Render revenue (band code may be a single number or a range "min-max")
const renderRevenueCell = (account: BaseAccount) => {
  const band = account.accountAnnualRevenueBand
  if (!band?.code && !band?.value) {
    return <span className="gba:text-gray-400">-</span>
  }

  const code = safeString(band.code || '').trim()
  if (!code) {
    return <span className="gba:text-gray-400">-</span>
  }

  // Parse numeric(s)
  const parts = code
    .split('-')
    .map(s => Number(s.trim()))
    .filter(n => !Number.isNaN(n))
  if (parts.length === 0) {
    return (
      <span className="gba:text-sm gba:truncate" title={safeString(band.value)}>
        {safeString(band.value) || '-'}
      </span>
    )
  }

  if (parts.length === 1) return renderAmount(parts[0])

  // Range: show "min – max" with a single trailing symbol
  const [min, max] = parts
  const left = formatCurrencyParts(min, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const right = formatCurrencyParts(max, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return (
    <div className="gba:w-full gba:flex gba:justify-end gba:items-baseline gba:min-w-0">
      <span className="gba:text-sm gba:[font-variant-numeric:tabular-nums] gba:truncate">
        {left.number} – {right.number}
      </span>
      <span className="gba:text-xs gba:text-gray-400 gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch]">
        {right.symbol}
      </span>
    </div>
  )
}

export const createAccountColumns = <TAccount extends BaseAccount>(): ColumnDef<TAccount>[] => [
  {
    id: 'name',
    accessorFn: row => safeString(row.name),
    header: 'Account',
    size: 250,
    minSize: 200,
    maxSize: 350,
    enableResizing: false,
    cell: ({ row }) => {
      return (
        <div
          className="gba:flex gba:items-center gba:gap-2 gba:min-w-0"
          data-testid={`account-cell-${row.original.id}`}
        >
          <Building2 className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
          <div className="gba:min-w-0 gba:flex-1">
            <div className="gba:font-medium gba:text-sm gba:truncate" title={safeString(row.original.name)}>
              {safeString(row.original.name)}
            </div>
          </div>
        </div>
      )
    }
  },
  {
    id: 'email',
    accessorFn: row => safeString(row.email),
    header: 'Contact Info',
    size: 200,
    minSize: 180,
    maxSize: 280,
    enableResizing: false,
    cell: ({ row }) => {
      const contactInfo = []

      if (row.original.email) {
        contactInfo.push(
          <div key="email" className="gba:flex gba:items-center gba:gap-2 gba:mb-1 gba:min-w-0">
            <Mail className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0" />
            <span className="gba:text-sm gba:truncate" title={safeString(row.original.email)}>
              {safeString(row.original.email)}
            </span>
          </div>
        )
      }

      if (row.original.phone) {
        contactInfo.push(
          <div key="phone" className="gba:flex gba:items-center gba:gap-2 gba:mb-1 gba:min-w-0">
            <Phone className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0" />
            <span className="gba:text-sm gba:truncate" title={safeString(row.original.phone)}>
              {safeString(row.original.phone)}
            </span>
          </div>
        )
      }

      if (row.original.website) {
        contactInfo.push(
          <div key="website" className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
            <Globe className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0" />
            <span className="gba:text-sm gba:truncate" title={safeString(row.original.website)}>
              {safeString(row.original.website)}
            </span>
          </div>
        )
      }

      return contactInfo.length > 0 ? (
        <div className="gba:min-w-0">{contactInfo}</div>
      ) : (
        <span className="gba:text-gray-400">-</span>
      )
    }
  },
  {
    id: 'geographicPresence',
    accessorKey: 'geographicPresence',
    header: 'Location',
    size: 200,
    minSize: 150,
    maxSize: 300,
    enableResizing: false,
    cell: ({ row }) => {
      // Try investmentAddress first (Investment Relations)
      const primaryAddress =
        row.original.investmentAddress?.find(addr => addr.addressType === 'PRIMARY_ADDRESS') ||
        row.original.investmentAddress?.[0] ||
        // Try addresses (Customer Relations)
        row.original.addresses?.find(addr => addr.type === 'PRIMARY') ||
        row.original.addresses?.[0]

      if (primaryAddress) {
        const addressString = formatAddress({
          addressLine: (primaryAddress as any).addressLine || null,
          locality: (primaryAddress as any).locality || (primaryAddress as any).city,
          postalCode: primaryAddress.postalCode,
          country: primaryAddress.country?.value,
          region: primaryAddress.region?.value
        })

        if (addressString) {
          const addressParts = addressString.split('\n').filter(line => line.trim())

          return (
            <div
              className="gba:flex gba:items-start gba:gap-2 gba:min-w-0"
              data-testid={`location-cell-${row.original.id}`}
            >
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
      }

      // Fallback to geographicPresence
      if (row.original.geographicPresence) {
        return (
          <div className="gba:flex gba:items-start gba:gap-2 gba:min-w-0">
            <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0 gba:mt-0.5" />
            <div
              className="gba:text-sm gba:text-gray-700 gba:truncate"
              title={safeString(row.original.geographicPresence)}
            >
              {safeString(row.original.geographicPresence)}
            </div>
          </div>
        )
      }

      return (
        <div className="gba:flex gba:items-start gba:gap-2">
          <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0 gba:mt-0.5" />
          <span className="gba:text-sm gba:text-gray-400">-</span>
        </div>
      )
    }
  },
  {
    id: 'industryClass',
    accessorFn: row => row.industryClass?.value || row.industryClass?.code || '',
    header: 'Industry',
    size: 140,
    minSize: 120,
    maxSize: 180,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.industryClass) {
        return <span className="gba:text-gray-400">-</span>
      }
      const industryValue = safeString(row.original.industryClass.value || row.original.industryClass.code)
      return (
        <Badge variant="secondary" data-testid={`industry-cell-${row.original.id}`}>
          <span className="gba:truncate" title={industryValue}>
            {industryValue}
          </span>
        </Badge>
      )
    }
  },
  {
    id: 'legalForm',
    accessorFn: row => row.legalForm?.value || row.legalForm?.code || '',
    header: 'Legal Form',
    size: 130,
    minSize: 110,
    maxSize: 160,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.legalForm) {
        return <span className="gba:text-gray-400">-</span>
      }
      const legalFormValue = safeString(row.original.legalForm.value || row.original.legalForm.code)
      return (
        <Badge variant="secondary" data-testid={`legal-form-cell-${row.original.id}`}>
          <span className="gba:truncate" title={legalFormValue}>
            {legalFormValue}
          </span>
        </Badge>
      )
    }
  },
  {
    id: 'size',
    accessorFn: row => row.companySize?.value || row.companySize?.code || '',
    header: 'Size',
    size: 110,
    minSize: 90,
    maxSize: 140,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.companySize) {
        return <span className="gba:text-gray-400">-</span>
      }
      const sizeValue = safeString(row.original.companySize.value || row.original.companySize.code)
      return (
        <Badge variant="outline" data-testid={`size-cell-${row.original.id}`}>
          <span className="gba:truncate" title={sizeValue}>
            {sizeValue}
          </span>
        </Badge>
      )
    }
  },
  {
    id: 'revenue',
    accessorKey: 'accountAnnualRevenueBand',
    header: 'Revenue',
    size: 140,
    minSize: 120,
    maxSize: 180,
    enableResizing: false,
    cell: ({ row }) => renderRevenueCell(row.original)
  },
  {
    id: 'ownerEmployee',
    accessorFn: row => getOwnerName(row),
    header: 'Owner',
    size: 200,
    minSize: 180,
    maxSize: 280,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.ownerEmployee) {
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
    id: 'createdAt',
    accessorFn: row => safeString(row.createdAt),
    header: 'Created',
    size: 130,
    minSize: 110,
    maxSize: 160,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.createdAt) {
        return <span className="gba:text-gray-400">-</span>
      }
      return (
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`created-cell-${row.original.id}`}>
          <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
          <span className="gba:text-sm">{formatDate(row.original.createdAt)}</span>
        </div>
      )
    }
  }
]

export const createAccountSortableColumns = () => {
  return [
    { id: 'name', label: 'Account Name' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Phone' },
    { id: 'createdAt', label: 'Created Date' },
    { id: 'updatedAt', label: 'Updated Date' }
  ]
}
