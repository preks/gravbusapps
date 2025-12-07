import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { Building2, Mail, Phone, Globe, Calendar, MapPin } from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { formatAddress } from '@/common/utils/addressFormatter'
import { type Account, createAccountDescriptors, AccountFields } from '@/common/data/relations/types/accountTypes'
import { deriveSortableColumns, deriveAvailableColumns } from '@/common/network/graphql/descriptorUtils'
import { getAccountPriorityBadgeVariant } from '@/common/utils/badgeUtils'

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
const getOwnerName = (account: Account) => {
  if (account.ownerEmployee?.displayName) {
    return safeString(account.ownerEmployee.displayName)
  }
  if (account.ownerEmployee?.firstName || account.ownerEmployee?.lastName) {
    return `${account.ownerEmployee.firstName || ''} ${account.ownerEmployee.lastName || ''}`.trim()
  }
  return '-'
}

/**
 * Default Account Columns - Base columns that work for both Customer and Investment Accounts
 * Uses Account (the CORRECT structure)
 * Accounts must be mapped via accountMapper before passing to these columns
 * These can be extended or overridden in context-specific views
 */
export const commonAccountColumns: ColumnDef<Account>[] = [
  {
    id: 'name',
    accessorFn: row => safeString(row.name),
    header: 'Account',
    size: 250,
    minSize: 200,
    maxSize: 350,
    enableResizing: false,
    cell: ({ row }) => {
      const accountName = safeString(row.original.name)
      const imageUrl = row.original.pictureThumbnail
        ? `data:image/gif;base64,${row.original.pictureThumbnail}`
        : undefined

      return (
        <div
          className="gba:flex gba:items-center gba:gap-3 gba:min-w-0"
          data-testid={`account-cell-${row.original.id}`}
        >
          <Avatar className="gba:w-8 gba:h-8 gba:shrink-0">
            {imageUrl && <AvatarImage src={imageUrl} alt={accountName} />}
            <AvatarFallback>
              <Building2 className="gba:h-4 gba:w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="gba:min-w-0 gba:flex-1">
            <div className="gba:font-medium gba:text-sm gba:truncate" title={accountName}>
              {accountName}
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
    enableSorting: false,
    cell: ({ row }) => {
      const contactInfo = []

      // Helper to get communication channel by type (lowercase: email, url, tel, text)
      const getChannel = (type: string) => {
        return row.original.communicationChannels?.find(
          ch => ch.communicationChannel?.type?.toLowerCase() === type.toLowerCase()
        )
      }

      // Email from communicationChannels
      const emailChannel = getChannel('email')
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

      // Phone from communicationChannels (type: tel)
      const phoneChannel = getChannel('tel')
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

      // Website from communicationChannels (type: url) or direct field
      const websiteChannel = getChannel('url')
      const websiteValue = websiteChannel?.value || (row.original as any).website
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
        <span className="gba:text-sm gba:text-muted-foreground">No contact info</span>
      )
    }
  },
  {
    id: 'addresses',
    accessorFn: row => {
      // Account has: addresses (with locality)
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
      // Account has: addresses (standardized)
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
                {addressParts.map(part => (
                  <div key={part} className="gba:text-sm gba:leading-snug gba:truncate" title={part}>
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
          <span className="gba:text-sm gba:text-muted-foreground">No address</span>
        </div>
      )
    }
  },
  {
    id: 'accountPriority',
    accessorFn: row => {
      const priority = row.accountPriority
      if (!priority) return ''
      const value = safeString(priority.value || priority.code)
      const additionalValue1 = safeString(priority.additionalValue1)
      return additionalValue1 ? `${value}: ${additionalValue1}` : value
    },
    header: 'Priority',
    size: 250,
    minSize: 120,
    maxSize: 250,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.accountPriority) {
        return <span className="gba:text-sm gba:text-muted-foreground">No priority</span>
      }
      const priority = row.original.accountPriority
      const value = safeString(priority.value || priority.code)
      const additionalValue1 = safeString(priority.additionalValue1)
      const displayValue = additionalValue1 ? `${value}: ${additionalValue1}` : value
      return (
        <Badge
          variant={getAccountPriorityBadgeVariant(priority)}
          className="gba:text-sm"
          data-testid={`account-priority-cell-${row.original.id}`}
        >
          {displayValue}
        </Badge>
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
      // Account has: industryClass (correct name)
      if (!row.original.industryClass) {
        return <span className="gba:text-sm gba:text-muted-foreground">No industry</span>
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
        return <span className="gba:text-sm gba:text-muted-foreground">No legal form</span>
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
    id: 'companySize',
    accessorFn: row => row.companySize?.value || row.companySize?.code || '',
    header: 'Size',
    size: 110,
    minSize: 90,
    maxSize: 140,
    enableResizing: false,
    cell: ({ row }) => {
      // Account has: companySize (correct name)
      if (!row.original.companySize) {
        return <span className="gba:text-sm gba:text-muted-foreground">No size</span>
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
    id: 'accountAnnualRevenueBand',
    accessorFn: row => row.accountAnnualRevenueBand?.value || row.accountAnnualRevenueBand?.code || '',
    header: 'Revenue Band',
    size: 150,
    minSize: 120,
    maxSize: 200,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.accountAnnualRevenueBand) {
        return <span className="gba:text-sm gba:text-muted-foreground">No revenue band</span>
      }
      const revenueBandValue = safeString(
        row.original.accountAnnualRevenueBand.value || row.original.accountAnnualRevenueBand.code
      )
      return (
        <span
          className="gba:text-sm gba:truncate gba:block"
          title={revenueBandValue}
          data-testid={`revenue-band-cell-${row.original.id}`}
        >
          {revenueBandValue}
        </span>
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
    cell: ({ row }) => {
      if (!row.original.ownerEmployee) {
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
        return <span className="gba:text-sm gba:text-muted-foreground">No date</span>
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
  accountPriority: 'Priority',
  industryClass: 'Industry',
  legalForm: 'Legal Form',
  size: 'Size',
  accountAnnualRevenueBand: 'Revenue Band',
  ownerEmployee: 'Owner',
  createdAt: 'Created Date',
  updatedAt: 'Updated Date'
}

export const defaultAccountSortableColumns = deriveSortableColumns(
  createAccountDescriptors(AccountFields),
  ACCOUNT_COLUMN_LABELS
)

/**
 * Default visible columns
 */
export const defaultVisibleAccountColumns = [
  'name',
  'communicationChannels',
  'addresses',
  'accountPriority',
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
