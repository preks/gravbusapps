import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { User, Calendar } from 'lucide-react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { type Contact, createContactDescriptors, ContactFields } from '@/common/data/relations/types/contactTypes'
import {
  getCommunicationChannelIcon,
  formatCommunicationChannelValue
} from '@/common/data/common/utils/communicationChannelUtils'
import { deriveSortableColumns, deriveAvailableColumns } from '@/common/network/graphql/descriptorUtils'
import { CommunicationChannelCode } from '@/common/data/common/types/commonTypes'

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
          ch => ch.communicationChannel?.code === CommunicationChannelCode.EMAIL
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
      const channels = (row.original.communicationChannels || []).filter(
        channel =>
          channel.communicationChannel?.code === CommunicationChannelCode.EMAIL ||
          channel.communicationChannel?.code === CommunicationChannelCode.PHONE
      )

      if (channels.length === 0) {
        return <span className="gba:text-sm gba:text-muted-foreground">No contact info</span>
      }

      // Display ALL communication channels with proper icons based on type
      return (
        <div className="gba:flex gba:flex-col gba:gap-1 gba:min-w-0">
          {channels.slice(0, 3).map(channel => {
            const type = channel.communicationChannel?.type
            const value = channel.value

            if (!value) return null

            const Icon = getCommunicationChannelIcon(type)
            const displayValue = formatCommunicationChannelValue(type, value)
            // Use combination of type and value for unique key
            const key = `${type || 'unknown'}-${value}`

            return (
              <div key={key} className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
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
  'department',
  'createdAt',
  'ownerEmployee'
]

/**
 * Default available columns derived from column definitions
 * Automatically includes all columns with an id
 */
export const defaultAvailableContactColumns = deriveAvailableColumns(commonContactColumns())

// Note: communicationChannels is a computed/related field and cannot be sorted in GraphQL
// Only include database fields in sortableColumns above
