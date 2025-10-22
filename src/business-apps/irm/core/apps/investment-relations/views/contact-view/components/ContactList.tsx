import React, { useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Card,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { User, Mail, Phone, Calendar } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentContact } from '@/common/data/investment/types'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getContactTypeLabel } from '@/common/data/investment/types/investmentEnums'
import { formatDate } from '../utils'
import { navigateTo } from '@/common/utils/navigationUtils'

export interface ContactListProps extends BusinessAppContextProps {
  contacts: InvestmentContact[]
  isLoading?: boolean
  totalCount: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onSort: (field: string) => void
  sortField: string
  sortOrder: 'ASC' | 'DESC' | ''
  visibleColumns?: string[]
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onSort,
  sortField,
  sortOrder,
  visibleColumns = ['actions', 'contact', 'contactInfo', 'type', 'position', 'department', 'owner', 'created'],
  ...context
}) => {
  const handleRowClick = useCallback((contactId: string) => {
    navigateTo(`/platform/irm/contact-record?contactId=${contactId}`)
  }, [])

  const getSortIcon = (field: string) => {
    if (sortField !== field || !sortOrder) return null
    return sortOrder === 'ASC' ? '↑' : '↓'
  }

  // Helper function to get contact display name
  const getContactName = (contact: InvestmentContact) => {
    return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '-'
  }

  // Helper function to get contact position
  const getContactPosition = (contact: InvestmentContact) => {
    return contact.jobPosition || '-'
  }

  // Helper function to get owner display name
  const getOwnerName = (contact: InvestmentContact) => {
    if (contact.ownerEmployee?.displayName) {
      return contact.ownerEmployee.displayName
    }
    if (contact.ownerEmployee?.firstName || contact.ownerEmployee?.lastName) {
      return `${contact.ownerEmployee.firstName || ''} ${contact.ownerEmployee.lastName || ''}`.trim()
    }
    return '-'
  }

  // Helper function to get contact info
  const getContactInfo = (contact: InvestmentContact) => {
    const contactInfo = []

    if (contact.email) {
      contactInfo.push(
        <div key="email" className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
          <Mail className="gba:w-4 gba:h-4 gba:text-gray-500" />
          <span className="gba:text-sm">{contact.email}</span>
        </div>
      )
    }

    if (contact.phone) {
      contactInfo.push(
        <div key="phone" className="gba:flex gba:items-center gba:gap-2">
          <Phone className="gba:w-4 gba:h-4 gba:text-gray-500" />
          <span className="gba:text-sm">{contact.phone}</span>
        </div>
      )
    }

    return contactInfo.length > 0 ? contactInfo : <span className="gba:text-gray-400">No contact info</span>
  }

  return (
    <div>
      {/* Table */}
      <Card>
        <CardContent className="gba:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.includes('contact') && (
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort('firstName')}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Contact
                      {getSortIcon('firstName')}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes('contactInfo') && (
                  <TableHead className="gba:cursor-pointer gba:hover:gba:bg-gray-50" onClick={() => onSort('email')}>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Contact Info
                      {getSortIcon('email')}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes('type') && (
                  <TableHead className="gba:cursor-pointer gba:hover:gba:bg-gray-50" onClick={() => onSort('type')}>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Type
                      {getSortIcon('type')}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes('position') && (
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort('jobPosition')}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Position
                      {getSortIcon('jobPosition')}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes('department') && (
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort('department')}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Department
                      {getSortIcon('department')}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes('owner') && (
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort('ownerEmployeeId')}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Owner
                      {getSortIcon('ownerEmployeeId')}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes('created') && (
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort('createdAt')}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Created
                      {getSortIcon('createdAt')}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes('actions') && <TableHead className="gba:w-[60px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="gba:text-center gba:py-8">
                    <div className="gba:text-gray-500">No contacts available.</div>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map(contact => (
                  <TableRow
                    key={contact.id}
                    data-testid={`investment-contact-row-${contact.id}`}
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50 gba:transition-colors"
                    onClick={() => handleRowClick(contact.id)}
                  >
                    {visibleColumns.includes('contact') && (
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <User className="gba:h-4 gba:w-4 gba:text-gray-400" />
                          <div>
                            <div className="gba:font-medium">{getContactName(contact)}</div>
                            <div className="gba:text-sm gba:text-gray-500">{getContactPosition(contact)}</div>
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes('contactInfo') && (
                      <TableCell>
                        <div className="gba:min-w-[200px]">{getContactInfo(contact)}</div>
                      </TableCell>
                    )}
                    {visibleColumns.includes('type') && (
                      <TableCell>
                        {contact.type ? (
                          <Badge variant="outline" data-testid={`investment-contact-type-${contact.id}`}>
                            {getContactTypeLabel(contact.type as any)}
                          </Badge>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes('position') && (
                      <TableCell>
                        {contact.jobPosition ? (
                          <Badge variant="secondary" data-testid={`investment-contact-position-${contact.id}`}>
                            {contact.jobPosition}
                          </Badge>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes('department') && (
                      <TableCell>
                        {contact.department ? (
                          <span className="gba:text-sm">{contact.department}</span>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes('owner') && (
                      <TableCell>
                        {contact.ownerEmployee ? (
                          <div
                            className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer hover:gba:bg-transparent focus:gba:bg-transparent gba:group"
                            data-testid={`investment-contact-owner-link-${contact.id}`}
                            onClick={e => {
                              e.stopPropagation()
                              const empId = contact.ownerEmployee?.id
                              if (empId) {
                                navigateTo(`/platform/employee-record?employeeId=${empId}`)
                              }
                            }}
                          >
                            <Avatar
                              size="sm"
                              className="gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:rounded-full"
                            >
                              {contact.ownerEmployee.pictureThumbnail && (
                                <AvatarImage
                                  src={`data:image/gif;base64,${contact.ownerEmployee.pictureThumbnail}`}
                                  alt={getOwnerName(contact)}
                                />
                              )}
                              <AvatarFallback>
                                {getOwnerName(contact) !== '-'
                                  ? getOwnerName(contact)
                                      .split(' ')
                                      .map((n: string) => n[0])
                                      .join('')
                                      .toUpperCase()
                                  : 'O'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="gba:text-sm">{getOwnerName(contact)}</span>
                          </div>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes('created') && (
                      <TableCell>
                        {contact.createdAt ? (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                            <span className="gba:text-sm">{formatDate(contact.createdAt)}</span>
                          </div>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes('actions') && (
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <AppActionButton
                            data-testid={`contact-entity-button-${contact.id}`}
                            size="icon"
                            contextsArray={[FlowContextName.investmentContactEntity]}
                            externalContextData={{ contactId: contact.id }}
                            prefixDataTestId={`contact-entity-button`}
                            accessToken={context.accessToken}
                            emptyStateBehavior="enable"
                            deferMainContextRequestsUntilClick={true}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="gba:flex gba:items-center gba:justify-between gba:mt-4">
          <div className="gba:text-sm gba:text-gray-700">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{' '}
            contacts
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              data-testid="investment-contacts-prev-page-button"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * pageSize >= totalCount}
              onClick={() => onPageChange(currentPage + 1)}
              data-testid="investment-contacts-next-page-button"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
