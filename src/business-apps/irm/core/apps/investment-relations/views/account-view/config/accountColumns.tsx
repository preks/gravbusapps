import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Building2, Mail, Phone, Globe, Calendar, MapPin } from 'lucide-react'
import type { InvestmentAccount } from '@/common/data/investment/types'
import { formatDate } from '../utils'
import { formatAddress } from '@/common/utils/addressFormatter'
import { navigateTo } from '@/common/utils/navigationUtils'

// Helper to safely convert values to strings
const safeString = (value: any): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return ''
  return String(value)
}

// Helper function to get owner display name
const getOwnerName = (account: InvestmentAccount) => {
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
    <div className="gba:w-full gba:flex gba:justify-end gba:items-baseline">
      <span className="gba:text-sm gba:[font-variant-numeric:tabular-nums]">{number}</span>
      <span className="gba:text-xs gba:text-gray-400 gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch]">
        {symbol}
      </span>
    </div>
  )
}

// Render revenue (band code may be a single number or a range "min-max")
const renderRevenueCell = (account: InvestmentAccount) => {
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
    return <span className="gba:text-sm">{safeString(band.value) || '-'}</span>
  }

  if (parts.length === 1) return renderAmount(parts[0])

  // Range: show "min – max" with a single trailing symbol
  const [min, max] = parts
  const left = formatCurrencyParts(min, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const right = formatCurrencyParts(max, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return (
    <div className="gba:w-full gba:flex gba:justify-end gba:items-baseline">
      <span className="gba:text-sm gba:[font-variant-numeric:tabular-nums]">
        {left.number} – {right.number}
      </span>
      <span className="gba:text-xs gba:text-gray-400 gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch]">
        {right.symbol}
      </span>
    </div>
  )
}

export const createAccountColumns = (): ColumnDef<InvestmentAccount>[] => [
  {
    id: 'name',
    accessorFn: row => safeString(row.name),
    header: 'Account',
    size: 250,
    cell: ({ row }) => {
      return (
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`account-cell-${row.original.id}`}>
          <Building2 className="gba:h-4 gba:w-4 gba:text-gray-400" />
          <div>
            <div className="gba:font-medium">{safeString(row.original.name)}</div>
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
    cell: ({ row }) => {
      const contactInfo = []

      if (row.original.email) {
        contactInfo.push(
          <div key="email" className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <Mail className="gba:w-4 gba:h-4 gba:text-gray-500" />
            <span className="gba:text-sm">{safeString(row.original.email)}</span>
          </div>
        )
      }

      if (row.original.phone) {
        contactInfo.push(
          <div key="phone" className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <Phone className="gba:w-4 gba:h-4 gba:text-gray-500" />
            <span className="gba:text-sm">{safeString(row.original.phone)}</span>
          </div>
        )
      }

      if (row.original.website) {
        contactInfo.push(
          <div key="website" className="gba:flex gba:items-center gba:gap-2">
            <Globe className="gba:w-4 gba:h-4 gba:text-gray-500" />
            <span className="gba:text-sm">{safeString(row.original.website)}</span>
          </div>
        )
      }

      return contactInfo.length > 0 ? <>{contactInfo}</> : <span className="gba:text-gray-400">-</span>
    }
  },
  {
    id: 'geographicPresence',
    accessorKey: 'geographicPresence',
    header: 'Location',
    size: 250,
    cell: ({ row }) => {
      const primaryAddress =
        row.original.investmentAddress?.find(addr => addr.addressType === 'PRIMARY_ADDRESS') ||
        row.original.investmentAddress?.[0]

      if (primaryAddress) {
        const addressString = formatAddress({
          addressLine: primaryAddress.addressLine,
          locality: primaryAddress.locality,
          postalCode: primaryAddress.postalCode,
          country: primaryAddress.country?.value,
          region: primaryAddress.region?.value
        })

        if (addressString) {
          const addressText = String(addressString || '')
            .split('\n')
            .map(line => String(line || '').trim())
            .filter(line => line.length > 0)
            .join(', ')

          return (
            <div className="gba:flex gba:items-start gba:gap-2" data-testid={`location-cell-${row.original.id}`}>
              <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:mt-0.5" />
              <div className="gba:text-sm gba:text-gray-700">{addressText || '-'}</div>
            </div>
          )
        }
      }

      // Fallback to geographicPresence
      if (row.original.geographicPresence) {
        return (
          <div className="gba:flex gba:items-start gba:gap-2">
            <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:mt-0.5" />
            <div className="gba:text-sm gba:text-gray-700">{safeString(row.original.geographicPresence)}</div>
          </div>
        )
      }

      return (
        <div className="gba:flex gba:items-start gba:gap-2">
          <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:mt-0.5" />
          <span className="gba:text-sm gba:text-gray-400">-</span>
        </div>
      )
    }
  },
  {
    id: 'industryClass',
    accessorFn: row => row.industryClass?.value || row.industryClass?.code || '',
    header: 'Industry',
    size: 150,
    cell: ({ row }) => {
      if (!row.original.industryClass) {
        return <span className="gba:text-gray-400">-</span>
      }
      const industryValue = safeString(row.original.industryClass.value || row.original.industryClass.code)
      return (
        <Badge variant="secondary" data-testid={`industry-cell-${row.original.id}`}>
          {industryValue}
        </Badge>
      )
    }
  },
  {
    id: 'legalForm',
    accessorFn: row => row.legalForm?.value || row.legalForm?.code || '',
    header: 'Legal Form',
    size: 140,
    cell: ({ row }) => {
      if (!row.original.legalForm) {
        return <span className="gba:text-gray-400">-</span>
      }
      const legalFormValue = safeString(row.original.legalForm.value || row.original.legalForm.code)
      return (
        <Badge variant="secondary" data-testid={`legal-form-cell-${row.original.id}`}>
          {legalFormValue}
        </Badge>
      )
    }
  },
  {
    id: 'size',
    accessorFn: row => row.companySize?.value || row.companySize?.code || '',
    header: 'Size',
    size: 120,
    cell: ({ row }) => {
      if (!row.original.companySize) {
        return <span className="gba:text-gray-400">-</span>
      }
      const sizeValue = safeString(row.original.companySize.value || row.original.companySize.code)
      return (
        <Badge variant="outline" data-testid={`size-cell-${row.original.id}`}>
          {sizeValue}
        </Badge>
      )
    }
  },
  {
    id: 'revenue',
    accessorKey: 'accountAnnualRevenueBand',
    header: 'Revenue',
    size: 150,
    cell: ({ row }) => renderRevenueCell(row.original)
  },
  {
    id: 'ownerEmployee',
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

export const createAccountSortableColumns = () => {
  return [
    { id: 'name', label: 'Account Name' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Phone' },
    { id: 'geographicPresence', label: 'Location' },
    { id: 'industryClass', label: 'Industry' },
    { id: 'legalForm', label: 'Legal Form' },
    { id: 'companySize', label: 'Company Size' },
    { id: 'ownerEmployee', label: 'Owner' },
    { id: 'createdAt', label: 'Created Date' },
    { id: 'updatedAt', label: 'Updated Date' }
  ]
}
