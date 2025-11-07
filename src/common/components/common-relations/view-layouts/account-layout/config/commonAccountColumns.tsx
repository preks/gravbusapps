import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Building2, Mail, Phone, Globe, Calendar, MapPin } from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { formatAddress } from '@/common/utils/addressFormatter'
import { formatCurrencyParts } from '@/common/utils/numberFormatter'
import type { CommonAccount } from '@/common/data/relations/types/commonAccountTypes'
import { COMMON_ACCOUNT_DESCRIPTORS } from '@/common/data/relations/types/commonAccountTypes'
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

// Helper function to get owner display name
const getOwnerName = (account: CommonAccount) => {
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
const renderRevenueCell = (account: CommonAccount) => {
  // CommonAccount has: annualRevenueBand (correct name)
  const band = account.annualRevenueBand
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

/**
 * Default Account Columns - Base columns that work for both Customer and Investment Accounts
 * Uses CommonAccount (the CORRECT structure)
 * Accounts must be mapped via accountMapper before passing to these columns
 * These can be extended or overridden in context-specific views
 */
export const commonAccountColumns: ColumnDef<CommonAccount>[] = [
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
    id: 'communicationChannels',
    accessorFn: row => {
      // Future: all use communicationChannels
      if (row.communicationChannels?.length) {
        const email = row.communicationChannels.find(
          ch => ch.communicationChannel?.alternativeCode?.toUpperCase() === 'EMAIL'
        )
        return safeString(email?.value)
      }
      return ''
    },
    header: 'Contact Info',
    size: 200,
    minSize: 180,
    maxSize: 280,
    enableResizing: false,
    enableSorting: false,
    cell: ({ row }) => {
      const contactInfo = []

      // Helper to get communication channel by type
      const getChannel = (type: string) => {
        return row.original.communicationChannels?.find(
          ch => ch.communicationChannel?.alternativeCode?.toUpperCase() === type.toUpperCase()
        )
      }

      // Email from communicationChannels
      const emailChannel = getChannel('EMAIL')
      if (emailChannel?.value) {
        contactInfo.push(
          <div key="email" className="gba:flex gba:items-center gba:gap-2 gba:mb-1 gba:min-w-0">
            <Mail className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0" />
            <span className="gba:text-sm gba:truncate" title={safeString(emailChannel.value)}>
              {safeString(emailChannel.value)}
            </span>
          </div>
        )
      }

      // Phone from communicationChannels
      const phoneChannel = getChannel('PHONE')
      if (phoneChannel?.value) {
        contactInfo.push(
          <div key="phone" className="gba:flex gba:items-center gba:gap-2 gba:mb-1 gba:min-w-0">
            <Phone className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0" />
            <span className="gba:text-sm gba:truncate" title={safeString(phoneChannel.value)}>
              {safeString(phoneChannel.value)}
            </span>
          </div>
        )
      }

      // Website from communicationChannels or direct field
      const websiteChannel = getChannel('WEBSITE')
      const websiteValue = websiteChannel?.value || row.original.website
      if (websiteValue) {
        contactInfo.push(
          <div key="website" className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
            <Globe className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0" />
            <span className="gba:text-sm gba:truncate" title={safeString(websiteValue)}>
              {safeString(websiteValue)}
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
    id: 'addresses',
    accessorFn: row => {
      // CommonAccount has: addresses (with locality)
      const primaryAddress = row.addresses?.find(addr => addr.addressType === 'PRIMARY_ADDRESS') || row.addresses?.[0]

      if (primaryAddress) {
        const locality = (primaryAddress as any).locality
        const country = primaryAddress.country?.value
        return `${locality || ''} ${country || ''}`.trim()
      }
      return ''
    },
    header: 'Location',
    size: 200,
    minSize: 150,
    maxSize: 300,
    enableResizing: false,
    enableSorting: false,
    cell: ({ row }) => {
      // CommonAccount has: addresses (standardized)
      const primaryAddress =
        row.original.addresses?.find(addr => addr.addressType === 'PRIMARY_ADDRESS') || row.original.addresses?.[0]

      if (primaryAddress) {
        const addressString = formatAddress({
          addressLine: (primaryAddress as any).addressLine || null,
          locality: (primaryAddress as any).locality,
          postalCode: primaryAddress.postalCode || undefined,
          country: primaryAddress.country?.value || undefined,
          region: primaryAddress.region?.value || undefined
        })

        if (addressString) {
          const addressParts = addressString.split('\n').filter(line => line.trim())

          return (
            <div
              className="gba:flex gba:items-start gba:gap-2 gba:min-w-0"
              data-testid={`addresses-cell-${row.original.id}`}
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
      // CommonAccount has: industryClass (correct name)
      if (!row.original.industryClass) {
        return <span className="gba:text-gray-400">-</span>
      }
      const industryValue = safeString(row.original.industryClass.value || row.original.industryClass.code)
      return (
        <span
          className="gba:text-sm gba:truncate gba:block"
          title={industryValue}
          data-testid={`industry-cell-${row.original.id}`}
        >
          {industryValue}
        </span>
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
        <span
          className="gba:text-sm gba:truncate gba:block"
          title={legalFormValue}
          data-testid={`legal-form-cell-${row.original.id}`}
        >
          {legalFormValue}
        </span>
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
      // CommonAccount has: companySize (correct name)
      if (!row.original.companySize) {
        return <span className="gba:text-gray-400">-</span>
      }
      const sizeValue = safeString(row.original.companySize.value || row.original.companySize.code)
      return (
        <span
          className="gba:text-sm gba:truncate gba:block"
          title={sizeValue}
          data-testid={`size-cell-${row.original.id}`}
        >
          {sizeValue}
        </span>
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

/**
 * Default sortable columns derived from descriptors
 * Automatically includes all descriptors with enableSort !== false and sortPath/sortPaths
 */
const ACCOUNT_COLUMN_LABELS: Record<string, string> = {
  name: 'Account Name',
  industryClass: 'Industry',
  legalForm: 'Legal Form',
  size: 'Size',
  revenue: 'Revenue',
  ownerEmployee: 'Owner',
  createdAt: 'Created Date',
  updatedAt: 'Updated Date'
}

export const defaultAccountSortableColumns = deriveSortableColumns(COMMON_ACCOUNT_DESCRIPTORS, ACCOUNT_COLUMN_LABELS)

/**
 * Default visible columns
 */
export const defaultVisibleAccountColumns = [
  'name',
  'communicationChannels',
  'addresses',
  'industryClass',
  'legalForm',
  'size',
  'ownerEmployee',
  'createdAt'
]

/**
 * Default available columns derived from column definitions
 * Automatically includes all columns with an id
 */
export const defaultAvailableAccountColumns = deriveAvailableColumns(commonAccountColumns)
