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
  AvatarFallback,
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { User, Building2, Mail, Phone, Calendar, MapPin, Flag } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentLead } from '@/common/data/investment/types'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { formatDate, getLeadStatusVariant } from '../utils'
import { formatAddress } from '@/common/utils/addressFormatter'
import { navigateTo } from '@/common/utils/navigationUtils'

export interface LeadListProps extends BusinessAppContextProps {
  leads: InvestmentLead[]
  searchTerm: string
  onSearchChange: (value: string) => void
  isLoading?: boolean
  totalCount: number
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onSort: (field: string) => void
  sortField: string
  sortOrder: 'ASC' | 'DESC'
  onClearFilters: () => void
  visibleColumns?: string[]
}

export const LeadList: React.FC<LeadListProps> = ({
  leads,
  searchTerm,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onSort,
  sortField,
  sortOrder,
  visibleColumns = ['actions', 'lead', 'contact', 'address', 'status', 'rating', 'source', 'owner', 'created'],
  ...context
}) => {
  const handleRowClick = useCallback((leadId: string) => {
    navigateTo(`/platform/irm/lead-record?leadId=${leadId}`)
  }, [])

  const getSortIcon = (field: string) => {
    if (sortField !== field || !sortOrder) return null
    return sortOrder === 'ASC' ? '↑' : '↓'
  }

  // Helper function to get contact display name
  const getContactName = (lead: InvestmentLead) => {
    return `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || '-'
  }

  // Helper function to get owner display name
  const getOwnerName = (lead: InvestmentLead) => {
    if (lead.ownerEmployee?.displayName) {
      return lead.ownerEmployee.displayName
    }
    if (lead.ownerEmployee?.firstName || lead.ownerEmployee?.lastName) {
      return `${lead.ownerEmployee.firstName || ''} ${lead.ownerEmployee.lastName || ''}`.trim()
    }
    return '-'
  }

  // Helper function to get contact info
  const getContactInfo = (lead: InvestmentLead) => {
    const contactInfo = []

    if (lead.email) {
      contactInfo.push(
        <div key="email" className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
          <Mail className="gba:w-4 gba:h-4 gba:text-gray-500" />
          <span className="gba:text-sm">{lead.email}</span>
        </div>
      )
    }

    if (lead.phoneNumber) {
      contactInfo.push(
        <div key="phone" className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
          <Phone className="gba:w-4 gba:h-4 gba:text-gray-500" />
          <span className="gba:text-sm">{lead.phoneNumber}</span>
        </div>
      )
    }

    return contactInfo.length > 0 ? contactInfo : <span className="gba:text-gray-400">No contact info</span>
  }

  // no helper needed – inline rendering with addressFormatter

  return (
    <div>
      {/* Table */}
      <Card>
        <CardContent className="gba:p-0">
          <div className="gba:w-full gba:overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.includes('lead') && (
                    <TableHead
                      className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                      onClick={() => onSort('leadCombined')}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        Lead
                        {getSortIcon('leadCombined')}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.includes('contact') && (
                    <TableHead className="gba:cursor-pointer gba:hover:gba:bg-gray-50" onClick={() => onSort('email')}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        Contact Info
                        {getSortIcon('email')}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.includes('address') && (
                    <TableHead
                      className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                      onClick={() => onSort('city')}
                      data-testid="investment-lead-address-header"
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        Address
                        {getSortIcon('city')}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableHead
                      className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                      onClick={() => onSort('leadStatus')}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        Status
                        {getSortIcon('leadStatus')}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.includes('rating') && (
                    <TableHead
                      className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                      onClick={() => onSort('leadRating')}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        Rating
                        {getSortIcon('leadRating')}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.includes('source') && (
                    <TableHead
                      className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                      onClick={() => onSort('leadSource')}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        Source
                        {getSortIcon('leadSource')}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.includes('owner') && (
                    <TableHead
                      className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                      onClick={() => onSort('ownerEmployee')}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        Owner
                        {getSortIcon('ownerEmployee')}
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
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length} className="gba:text-center gba:py-8">
                      <div className="gba:text-gray-500">
                        {searchTerm ? 'No leads found matching your search criteria.' : 'No leads available.'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map(lead => (
                    <TableRow
                      key={lead.id}
                      data-testid={`investment-lead-row-${lead.id}`}
                      className="gba:cursor-pointer gba:hover:gba:bg-gray-50 gba:transition-colors"
                      onClick={() => handleRowClick(lead.id)}
                    >
                      {visibleColumns.includes('lead') && (
                        <TableCell>
                          <div className="gba:flex gba:flex-col gba:gap-1">
                            {(lead.firstName || lead.lastName) && (
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <User className="gba:h-4 gba:w-4 gba:text-gray-400" />
                                <div className="gba:flex gba:items-center gba:gap-1">
                                  <div className="gba:font-medium">{getContactName(lead)}</div>
                                  {lead.sensitive === true && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge
                                            variant="warning"
                                            className="gba:ml-2 gba:rounded-full gba:p-1 gba:h-5 gba:w-5 gba:flex gba:items-center gba:justify-center"
                                          >
                                            <Flag className="gba:h-3 gba:w-3" />
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>Sensitive</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </div>
                            )}
                            {lead.companyName && (
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <Building2 className="gba:h-4 gba:w-4 gba:text-gray-400" />
                                <div className="gba:flex gba:items-center gba:gap-1">
                                  <span className="gba:text-sm">{lead.companyName}</span>
                                  {lead.sensitive === true && !(lead.firstName || lead.lastName) && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge
                                            variant="warning"
                                            className="gba:ml-2 gba:rounded-full gba:p-1 gba:h-5 gba:w-5 gba:flex gba:items-center gba:justify-center"
                                          >
                                            <Flag className="gba:h-3 gba:w-3" />
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>Sensitive</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </div>
                            )}
                            {!(lead.firstName || lead.lastName || lead.companyName) && (
                              <span className="gba:text-gray-400">-</span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('contact') && (
                        <TableCell>
                          <div className="gba:min-w-[200px]">{getContactInfo(lead)}</div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('address') && (
                        <TableCell data-testid={`investment-lead-address-cell-${lead.id}`}>
                          <div className="gba:min-w-[200px]">
                            {(() => {
                              const address = formatAddress({
                                addressLine: (lead as any).addressLine,
                                locality: lead.locality,
                                postalCode: lead.postalCode,
                                region: lead.region?.additionalValue1,
                                country: lead.country?.value
                              })
                              if (!address) return <span className="gba:text-gray-400">No address</span>
                              return (
                                <div className="gba:flex gba:items-start gba:gap-2">
                                  <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500 gba:mt-0.5" />
                                  <div className="gba:flex gba:flex-col gba:gap-1">
                                    {address.split('\n').map((l, i) => (
                                      <div key={i} className="gba:text-sm gba:leading-snug">
                                        {l}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('status') && (
                        <TableCell>
                          <Badge
                            variant={getLeadStatusVariant(lead.leadStatus?.code)}
                            data-testid={`investment-lead-status-${lead.id}`}
                          >
                            {lead.leadStatus?.value || lead.leadStatus?.code || 'Unknown'}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.includes('rating') && (
                        <TableCell>
                          <Badge variant="outline" data-testid={`investment-lead-rating-${lead.id}`}>
                            {lead.leadRating?.value || lead.leadRating?.code || 'Unknown'}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.includes('source') && (
                        <TableCell>
                          <Badge variant="outline" data-testid={`investment-lead-source-${lead.id}`}>
                            {lead.leadSource?.value || lead.leadSource?.code || 'Unknown'}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.includes('owner') && (
                        <TableCell>
                          {lead.ownerEmployee ? (
                            <div
                              className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer hover:gba:bg-transparent focus:gba:bg-transparent gba:group"
                              data-testid={`investment-lead-owner-link-${lead.id}`}
                              onClick={e => {
                                e.stopPropagation()
                                const empId = lead.ownerEmployee?.id
                                if (empId) {
                                  navigateTo(`/platform/employee-record?employeeId=${empId}`)
                                }
                              }}
                            >
                              <Avatar
                                size="sm"
                                className="gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:rounded-full"
                              >
                                {lead.ownerEmployee.pictureThumbnail && (
                                  <AvatarImage
                                    src={`data:image/gif;base64,${lead.ownerEmployee.pictureThumbnail}`}
                                    alt={getOwnerName(lead)}
                                  />
                                )}
                                <AvatarFallback>
                                  {getOwnerName(lead) !== '-'
                                    ? getOwnerName(lead)
                                        .split(' ')
                                        .map((n: string) => n[0])
                                        .join('')
                                        .toUpperCase()
                                    : 'O'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="gba:text-sm">{getOwnerName(lead)}</span>
                            </div>
                          ) : (
                            <span className="gba:text-gray-400">-</span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.includes('created') && (
                        <TableCell>
                          {lead.createdAt ? (
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                              <span className="gba:text-sm">{formatDate(lead.createdAt)}</span>
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
                              data-testid={`investment-lead-update-button-${lead.id}`}
                              size="icon"
                              contextsArray={[FlowContextName.investmentLeadEntity]}
                              externalContextData={{ leadId: lead.id }}
                              prefixDataTestId={`investment-lead-update`}
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
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="gba:flex gba:items-center gba:justify-between gba:mt-4">
          <div className="gba:text-sm gba:text-gray-700">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{' '}
            leads
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              data-testid="investment-leads-prev-page-button"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * pageSize >= totalCount}
              onClick={() => onPageChange(currentPage + 1)}
              data-testid="investment-leads-next-page-button"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
