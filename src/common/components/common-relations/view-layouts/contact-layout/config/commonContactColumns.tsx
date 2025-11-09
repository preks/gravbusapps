import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { User, Building2, Calendar } from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import { createContactDescriptors, ContactFields } from '@/common/data/relations/types/contactTypes'
import {
  getCommunicationChannelIcon,
  formatCommunicationChannelValue
} from '@/common/data/common/utils/communicationChannelUtils'
import { deriveSortableColumns, deriveAvailableColumns } from '@/common/network/graphql/descriptorUtils'
import { getContactTypeLabel } from '@/common/data/relations/constants/commonContactConstants'

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

// Helper function to get contact display name
const getContactName = (contact: Contact) => {
  if (contact.fullName) return contact.fullName
  return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '-'
}

// Helper function to get owner display name
const getOwnerName = (contact: Contact) => {
  if (contact.ownerEmployee?.displayName) {
    return safeString(contact.ownerEmployee.displayName)
  }
  if (contact.ownerEmployee?.firstName || contact.ownerEmployee?.lastName) {
    return `${contact.ownerEmployee.firstName || ''} ${contact.ownerEmployee.lastName || ''}`.trim()
  }
  return '-'
}

// Helper to get primary account (first in accountContacts array)
const getPrimaryAccount = (contact: Contact) => {
  return contact.accountContacts?.[0]?.account
}

/**
 * Default Contact Columns
 * Uses Contact (the CORRECT structure)
 * Contacts must be mapped via contactMapper before passing to these columns
 */
export const commonContactColumns = (): ColumnDef<Contact>[] => [
  {
    id: 'contact',
    accessorFn: row => getContactName(row),
    header: 'Contact',
    size: 220,
    minSize: 180,
    maxSize: 300,
    enableResizing: false,
    cell: ({ row }) => {
      const contactName = getContactName(row.original)
      const position = safeString(row.original.jobPosition)
      const imageUrl = row.original.pictureThumbnail
        ? `data:image/gif;base64,${row.original.pictureThumbnail}`
        : undefined

      return (
        <div
          className="gba:flex gba:items-center gba:gap-3 gba:min-w-0"
          data-testid={`contact-cell-${row.original.id}`}
        >
          <Avatar className="gba:w-8 gba:h-8 gba:shrink-0">
            {imageUrl && <AvatarImage src={imageUrl} alt={contactName} />}
            <AvatarFallback>
              {(() => {
                if (contactName === '-') return <User className="gba:h-4 gba:w-4" />
                const initials = contactName
                  .split(' ')
                  .map(n => n[0] || '')
                  .join('')
                  .toUpperCase()
                  .substring(0, 2)
                return initials || <User className="gba:h-4 gba:w-4" />
              })()}
            </AvatarFallback>
          </Avatar>
          <div className="gba:min-w-0 gba:flex-1">
            <div className="gba:font-medium gba:text-sm gba:truncate" title={contactName}>
              {contactName}
            </div>
            {position && (
              <div className="gba:text-xs gba:text-gray-500 gba:truncate" title={position}>
                {position}
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
      // Get all communication channels
      if (row.communicationChannels?.length) {
        const email = row.communicationChannels.find(
          ch =>
            ch.communicationChannel?.code?.toUpperCase() === 'EMAIL' ||
            ch.communicationChannel?.alternativeCode?.toUpperCase() === 'EMAIL'
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
      const channels = row.original.communicationChannels || []

      if (channels.length === 0) {
        return <span className="gba:text-sm gba:text-muted-foreground">No contact info</span>
      }

      // Display ALL communication channels with proper icons based on type
      return (
        <div className="gba:flex gba:flex-col gba:gap-1 gba:min-w-0">
          {channels.slice(0, 3).map((channel, index) => {
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
          {channels.length > 3 && <span className="gba:text-xs gba:text-gray-500">+{channels.length - 3} more</span>}
        </div>
      )
    }
  },
  {
    id: 'accountContacts',
    accessorFn: row => getPrimaryAccount(row)?.name || '',
    header: 'Account',
    size: 200,
    minSize: 180,
    maxSize: 280,
    enableResizing: false,
    enableSorting: false,
    cell: ({ row }) => {
      const account = getPrimaryAccount(row.original)

      if (!account) {
        return <span className="gba:text-sm gba:text-muted-foreground">No account</span>
      }

      const imageUrl = account.pictureThumbnail ? `data:image/gif;base64,${account.pictureThumbnail}` : undefined

      return (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            // TODO: Navigate to account - need to determine if CRM or IRM based on context
            console.log('Navigate to account:', account.id)
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
    id: 'department',
    accessorFn: row => row.department || '',
    header: 'Department',
    size: 150,
    minSize: 120,
    maxSize: 200,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.department) {
        return <span className="gba:text-sm gba:text-muted-foreground">No department</span>
      }
      return (
        <span className="gba:text-sm gba:truncate gba:block" title={safeString(row.original.department)}>
          {safeString(row.original.department)}
        </span>
      )
    }
  },
  {
    id: 'type',
    accessorFn: row => (row as any).type || (row as any).contactType || '',
    header: 'Type',
    size: 120,
    minSize: 100,
    maxSize: 150,
    enableResizing: false,
    cell: ({ row }) => {
      // Get contact type directly from contact (mapped from contactType in CRM)
      const contactType = (row.original as any).type || (row.original as any).contactType

      if (!contactType) {
        return <span className="gba:text-sm gba:text-muted-foreground">No type</span>
      }

      const label = getContactTypeLabel(contactType)

      return (
        <span
          className="gba:text-sm gba:truncate gba:block"
          title={label || contactType}
          data-testid={`contact-type-${row.original.id}`}
        >
          {label || contactType}
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
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.createdAt) {
        return <span className="gba:text-sm gba:text-muted-foreground">No date</span>
      }
      return (
        <div
          className="gba:flex gba:items-center gba:gap-2 gba:truncate"
          data-testid={`created-cell-${row.original.id}`}
        >
          <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
          <span className="gba:text-sm gba:truncate">{formatDate(row.original.createdAt)}</span>
        </div>
      )
    }
  },
  {
    id: 'ownerEmployee',
    accessorFn: row => getOwnerName(row),
    header: 'Owner',
    size: 180,
    minSize: 160,
    maxSize: 240,
    enableResizing: false,
    cell: ({ row }) => {
      if (!row.original.ownerEmployee) {
        return <span className="gba:text-sm gba:text-muted-foreground">No owner</span>
      }

      const ownerName = getOwnerName(row.original)
      const imageUrl = row.original.ownerEmployee.pictureThumbnail
        ? `data:image/gif;base64,${row.original.ownerEmployee.pictureThumbnail}`
        : undefined

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
            {imageUrl && <AvatarImage src={imageUrl} alt={ownerName} />}
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
  }
]

/**
 * Default sortable columns derived from descriptors
 * Automatically includes all descriptors with enableSort !== false and sortPath/sortPaths
 */
const CONTACT_COLUMN_LABELS: Record<string, string> = {
  contact: 'Contact',
  firstName: 'First Name',
  lastName: 'Last Name',
  fullName: 'Full Name',
  department: 'Department',
  jobPosition: 'Job Position',
  account: 'Account',
  ownerEmployee: 'Owner',
  createdAt: 'Created Date',
  updatedAt: 'Updated Date'
}

export const defaultContactSortableColumns = deriveSortableColumns(
  createContactDescriptors(ContactFields),
  CONTACT_COLUMN_LABELS
)

/**
 * Default visible columns
 */
export const defaultVisibleContactColumns = [
  'contact',
  'communicationChannels',
  'account',
  'department',
  'type',
  'createdAt',
  'ownerEmployee'
]

/**
 * Default available columns derived from column definitions
 * Automatically includes all columns with an id
 */
export const defaultAvailableContactColumns = deriveAvailableColumns(commonContactColumns())

// Note: communicationChannels, account, and type are computed/related fields and cannot be sorted in GraphQL
// Only include database fields in sortableColumns above
