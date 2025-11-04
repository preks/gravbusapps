import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { User, Mail, Phone, Calendar, Building2 } from 'lucide-react'
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

// Helper function to get contact type label
const getContactTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    PRIMARY: 'Primary',
    SECONDARY: 'Secondary',
    BILLING: 'Billing',
    TECHNICAL: 'Technical',
    DECISION_MAKER: 'Decision Maker',
    INFLUENCER: 'Influencer'
  }
  return typeMap[type] || type
}

// Generic Contact interface for columns
interface BaseContact {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  jobPosition?: string | null
  department?: string | null
  type?: string | null
  account?: {
    id: string
    name?: string
    pictureThumbnail?: string
    pictureThumbnailUrl?: string
  } | null
  ownerEmployee?: {
    id: string
    displayName?: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
  } | null
  createdAt?: string | null
}

// Helper function to get contact display name
const getContactName = (contact: BaseContact) => {
  return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '-'
}

// Helper function to get owner display name
const getOwnerName = (contact: BaseContact) => {
  if (contact.ownerEmployee?.displayName) {
    return safeString(contact.ownerEmployee.displayName)
  }
  if (contact.ownerEmployee?.firstName || contact.ownerEmployee?.lastName) {
    return `${contact.ownerEmployee.firstName || ''} ${contact.ownerEmployee.lastName || ''}`.trim()
  }
  return '-'
}

export const createContactColumns = <TContact extends BaseContact>(
  buildAccountUrl?: (id: string) => string
): ColumnDef<TContact>[] => [
  {
    id: 'firstName',
    accessorFn: row => safeString(row.firstName),
    header: 'Contact',
    size: 220,
    minSize: 180,
    maxSize: 300,
    enableResizing: false,
    cell: ({ row }) => {
      const contactName = getContactName(row.original)
      const position = safeString(row.original.jobPosition)
      return (
        <div
          className="gba:flex gba:items-center gba:gap-2 gba:min-w-0"
          data-testid={`contact-cell-${row.original.id}`}
        >
          <User className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
          <div className="gba:min-w-0 gba:flex-1">
            <div className="gba:font-medium gba:text-sm gba:truncate" title={contactName}>
              {contactName}
            </div>
            {position && (
              <div className="gba:text-sm gba:text-gray-500 gba:truncate" title={position}>
                {position}
              </div>
            )}
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
          <div key="phone" className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
            <Phone className="gba:w-4 gba:h-4 gba:text-gray-500 gba:shrink-0" />
            <span className="gba:text-sm gba:truncate" title={safeString(row.original.phone)}>
              {safeString(row.original.phone)}
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
    id: 'account',
    accessorFn: row => row.account?.name || '',
    header: 'Account',
    size: 200,
    minSize: 180,
    maxSize: 280,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.account) {
        return <span className="gba:text-gray-400">-</span>
      }

      const account = row.original.account
      const imageUrl = account.pictureThumbnail
        ? `data:image/gif;base64,${account.pictureThumbnail}`
        : account.pictureThumbnailUrl || undefined

      return (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            if (buildAccountUrl) {
              navigateTo(buildAccountUrl(account.id))
            }
          }}
          className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:group gba:bg-transparent gba:border-0 gba:p-0 gba:w-full gba:text-left"
          data-testid={`contact-account-link-${row.original.id}`}
        >
          <Avatar className="gba:w-8 gba:h-8 gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:transition-all">
            {imageUrl && <AvatarImage src={imageUrl} alt={account.name} />}
            <AvatarFallback>
              <Building2 className="gba:h-4 gba:w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="gba:min-w-0 gba:flex-1">
            <div className="gba:font-medium gba:truncate gba:text-sm gba:group-hover:gba:text-primary gba:transition-colors">
              {account.name}
            </div>
          </div>
        </button>
      )
    }
  },
  {
    id: 'type',
    accessorFn: row => safeString(row.type),
    header: 'Type',
    size: 130,
    minSize: 110,
    maxSize: 160,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.type) {
        return <span className="gba:text-gray-400">-</span>
      }
      return (
        <Badge variant="outline" data-testid={`type-cell-${row.original.id}`}>
          {getContactTypeLabel(row.original.type as any)}
        </Badge>
      )
    }
  },
  {
    id: 'jobPosition',
    accessorFn: row => safeString(row.jobPosition),
    header: 'Position',
    size: 150,
    minSize: 130,
    maxSize: 200,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.jobPosition) {
        return <span className="gba:text-gray-400">-</span>
      }
      return (
        <Badge variant="secondary" data-testid={`position-cell-${row.original.id}`}>
          <span className="gba:truncate" title={safeString(row.original.jobPosition)}>
            {safeString(row.original.jobPosition)}
          </span>
        </Badge>
      )
    }
  },
  {
    id: 'department',
    accessorFn: row => safeString(row.department),
    header: 'Department',
    size: 140,
    minSize: 120,
    maxSize: 180,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.department) {
        return <span className="gba:text-gray-400">-</span>
      }
      return (
        <span className="gba:text-sm gba:truncate gba:block" title={safeString(row.original.department)}>
          {safeString(row.original.department)}
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

export const createContactSortableColumns = () => {
  return [
    { id: 'firstName', label: 'First Name' },
    { id: 'lastName', label: 'Last Name' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Phone' },
    { id: 'createdAt', label: 'Created Date' },
    { id: 'updatedAt', label: 'Updated Date' }
  ]
}
