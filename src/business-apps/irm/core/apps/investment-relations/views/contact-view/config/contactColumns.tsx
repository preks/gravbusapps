import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { User, Mail, Phone, Calendar } from 'lucide-react'
import type { InvestmentContact } from '@/common/data/investment/types'
import { getContactTypeLabel } from '@/common/data/investment/types/investmentEnums'
import { formatDate } from '../utils'
import { navigateTo } from '@/common/utils/navigationUtils'

// Helper to safely convert values to strings
const safeString = (value: any): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return ''
  return String(value)
}

// Helper function to get contact display name
const getContactName = (contact: InvestmentContact) => {
  return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '-'
}

// Helper function to get owner display name
const getOwnerName = (contact: InvestmentContact) => {
  if (contact.ownerEmployee?.displayName) {
    return safeString(contact.ownerEmployee.displayName)
  }
  if (contact.ownerEmployee?.firstName || contact.ownerEmployee?.lastName) {
    return `${contact.ownerEmployee.firstName || ''} ${contact.ownerEmployee.lastName || ''}`.trim()
  }
  return '-'
}

export const createContactColumns = (): ColumnDef<InvestmentContact>[] => [
  {
    id: 'firstName',
    accessorFn: row => safeString(row.firstName),
    header: 'Contact',
    size: 250,
    cell: ({ row }) => {
      const contactName = getContactName(row.original)
      const position = safeString(row.original.jobPosition)
      return (
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`contact-cell-${row.original.id}`}>
          <User className="gba:h-4 gba:w-4 gba:text-gray-400" />
          <div>
            <div className="gba:font-medium">{contactName}</div>
            {position && <div className="gba:text-sm gba:text-gray-500">{position}</div>}
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
          <div key="phone" className="gba:flex gba:items-center gba:gap-2">
            <Phone className="gba:w-4 gba:h-4 gba:text-gray-500" />
            <span className="gba:text-sm">{safeString(row.original.phone)}</span>
          </div>
        )
      }

      return contactInfo.length > 0 ? <>{contactInfo}</> : <span className="gba:text-gray-400">-</span>
    }
  },
  {
    id: 'type',
    accessorFn: row => safeString(row.type),
    header: 'Type',
    size: 130,
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
    cell: ({ row }) => {
      if (!row.original.jobPosition) {
        return <span className="gba:text-gray-400">-</span>
      }
      return (
        <Badge variant="secondary" data-testid={`position-cell-${row.original.id}`}>
          {safeString(row.original.jobPosition)}
        </Badge>
      )
    }
  },
  {
    id: 'department',
    accessorFn: row => safeString(row.department),
    header: 'Department',
    size: 150,
    cell: ({ row }) => {
      if (!row.original.department) {
        return <span className="gba:text-gray-400">-</span>
      }
      return <span className="gba:text-sm">{safeString(row.original.department)}</span>
    }
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

export const createContactSortableColumns = () => {
  return [
    { id: 'firstName', label: 'First Name' },
    { id: 'lastName', label: 'Last Name' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Phone' },
    { id: 'jobPosition', label: 'Position' },
    { id: 'department', label: 'Department' },
    { id: 'ownerEmployee', label: 'Owner' },
    { id: 'createdAt', label: 'Created Date' },
    { id: 'updatedAt', label: 'Updated Date' }
  ]
}
