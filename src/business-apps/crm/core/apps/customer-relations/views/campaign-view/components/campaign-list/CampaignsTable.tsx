import React, { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner,
  Button,
  Badge,
  Card,
  CardContent
} from '@newwork/nw-design-system'
import { PiArrowUp, PiArrowDown, PiCalendar, PiTag, PiMegaphone } from 'react-icons/pi'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { SalesCampaign } from './types/SalesCampaignTypes'
// Column visibility is managed in parent to match Lead List pattern
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'

interface CampaignsTableProps {
  campaigns: SalesCampaign[]
  isLoading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  pageSize: number
  sortField: string
  sortOrder: 'ASC' | 'DESC' | ''
  onTableChange: (pagination: any, filters: any, sorter: any) => void
  onPaginationChange: (page: number, pageSize?: number) => void
  onSortingChange: (field: string, order: 'ASC' | 'DESC' | '') => void
  onRowClick?: (campaign: SalesCampaign) => void
  accessToken: string
  visibleColumns?: string[] // managed by parent like LeadList
}

const CampaignsTable: React.FC<CampaignsTableProps> = ({
  campaigns,
  isLoading,
  error,
  totalCount,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  onTableChange,
  onPaginationChange,
  onSortingChange,
  onRowClick,
  accessToken,
  visibleColumns: visibleColumnsProp
}) => {
  const DATA_TEST_ID_PREFIX = 'CampaignsTable'
  const allColumns = ['actions', 'name', 'type', 'startDate', 'endDate', 'status', 'createdAt']
  const visibleColumns = useMemo(() => new Set(visibleColumnsProp ?? allColumns), [visibleColumnsProp])

  // Helper function to format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-'
    return dayjs(dateString).format('DD/MM/YYYY')
  }

  // Helper to compute campaign status from dates
  const getCampaignStatus = (startDate?: string, endDate?: string): string => {
    if (!startDate || !endDate) return '-'
    const now = dayjs()
    const start = dayjs(startDate)
    const end = dayjs(endDate)

    if (now.isBefore(start, 'day')) return 'Planned'
    if (now.isAfter(end, 'day')) return 'Completed'
    return 'Active'
  }

  // Helper function to handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Cycle through: ASC -> DESC -> clear
      if (sortOrder === 'ASC') {
        onSortingChange(field, 'DESC')
      } else if (sortOrder === 'DESC') {
        onSortingChange('', '')
      } else {
        onSortingChange(field, 'ASC')
      }
    } else {
      onSortingChange(field, 'ASC')
    }
  }

  // Helper function to render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field || !sortField) return null
    if (sortOrder === 'ASC') return <PiArrowUp className="gba:inline gba:ml-1" size={12} />
    if (sortOrder === 'DESC') return <PiArrowDown className="gba:inline gba:ml-1" size={12} />
    return null
  }

  // Handle row click
  const handleRowClick = (campaign: SalesCampaign) => {
    if (onRowClick) {
      onRowClick(campaign)
    }
  }

  // Show error state
  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-lg gba:font-medium gba:mb-2" style={{ color: 'var(--color-danger-500)' }}>
          {getTranslationFromI18nKeyAndLabel('campaigns.error.title', 'Error Loading Campaigns')}
        </div>
        <div className="gba:mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {error}
        </div>
        <Button
          variant="default"
          onClick={() => onTableChange({ current: 1, pageSize: 20 }, {}, {})}
          data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
        >
          {getTranslationFromI18nKeyAndLabel('common.retry', 'Retry')}
        </Button>
      </div>
    )
  }

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <CardContent className="gba:p-0">
        {isLoading && (
          <div className="gba:flex gba:justify-center gba:p-4">
            <Spinner />
          </div>
        )}

        <div className="gba:overflow-x-auto">
          <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`} style={{ minWidth: '1000px' }}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-gray-50">
                {visibleColumns.has('name') && (
                  <TableHead
                    className="gba:w-[300px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort('name')}
                    data-testid={`${DATA_TEST_ID_PREFIX}-name-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {getTranslationFromI18nKeyAndLabel('campaigns.table.name', 'Campaign Name')}
                      {renderSortIcon('name')}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.has('type') && (
                  <TableHead
                    className="gba:w-[180px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort('typeRef')}
                    data-testid={`${DATA_TEST_ID_PREFIX}-type-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {getTranslationFromI18nKeyAndLabel('campaigns.table.type', 'Campaign Type')}
                      {renderSortIcon('typeRef')}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.has('startDate') && (
                  <TableHead
                    className="gba:w-[144px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort('startDate')}
                    data-testid={`${DATA_TEST_ID_PREFIX}-start-date-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {getTranslationFromI18nKeyAndLabel('campaigns.table.startDate', 'Start Date')}
                      {renderSortIcon('startDate')}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.has('endDate') && (
                  <TableHead
                    className="gba:w-[144px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort('endDate')}
                    data-testid={`${DATA_TEST_ID_PREFIX}-end-date-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {getTranslationFromI18nKeyAndLabel('campaigns.table.endDate', 'End Date')}
                      {renderSortIcon('endDate')}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.has('status') && (
                  <TableHead
                    className="gba:w-[144px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100"
                    onClick={() => handleSort('status')}
                    data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {getTranslationFromI18nKeyAndLabel('campaigns.table.status', 'Status')}
                      {renderSortIcon('status')}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.has('createdAt') && (
                  <TableHead
                    className="gba:w-[144px] gba:font-semibold gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none"
                    style={{ color: 'var(--color-text-primary)' }}
                    onClick={() => handleSort('createdAt')}
                    data-testid={`${DATA_TEST_ID_PREFIX}-created-header`}
                  >
                    <div className="gba:flex gba:items-center">
                      {getTranslationFromI18nKeyAndLabel('campaigns.table.created', 'Created')}
                      {renderSortIcon('createdAt')}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.has('actions') && (
                  <TableHead
                    className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                  >
                    {getTranslationFromI18nKeyAndLabel('campaigns.table.actions', 'ACTIONS')}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map(campaign => (
                <TableRow
                  key={campaign.id}
                  className={`gba:border-b gba:transition-colors ${onRowClick ? 'gba:cursor-pointer' : ''}`}
                  data-testid={`${DATA_TEST_ID_PREFIX}-row-${campaign.id}`}
                  onClick={() => handleRowClick(campaign)}
                  onMouseEnter={e => {
                    if (onRowClick) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-secondary)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (onRowClick) {
                      e.currentTarget.style.backgroundColor = ''
                    }
                  }}
                >
                  {visibleColumns.has('name') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-name-cell-${campaign.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <PiMegaphone size={16} style={{ color: 'var(--color-primary-500)' }} />
                        <div>
                          <div className="gba:font-medium gba:text-sm">{campaign.name || '-'}</div>
                          {campaign.description && (
                            <div
                              className="gba:text-xs gba:truncate gba:max-w-[200px]"
                              style={{ color: 'var(--color-text-secondary)' }}
                              title={campaign.description}
                            >
                              {campaign.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.has('type') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-type-cell-${campaign.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiTag size={14} style={{ color: 'var(--color-primary-600)' }} />
                        <span className="gba:text-sm">{campaign.type?.value || '-'}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.has('startDate') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-start-date-cell-${campaign.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCalendar size={14} style={{ color: 'var(--color-text-secondary)' }} />
                        <span className="gba:text-sm">{formatDate(campaign.startDate)}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.has('endDate') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-end-date-cell-${campaign.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCalendar size={14} style={{ color: 'var(--color-text-secondary)' }} />
                        <span className="gba:text-sm">{formatDate(campaign.endDate)}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.has('status') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-status-cell-${campaign.id}`}
                    >
                      {(() => {
                        const statusText = getCampaignStatus(campaign.startDate, campaign.endDate)
                        const badgeVariant =
                          statusText === 'Active'
                            ? 'success'
                            : statusText === 'Planned'
                              ? 'pending'
                              : statusText === 'Completed'
                                ? 'default'
                                : 'secondary'
                        return (
                          <Badge
                            variant={badgeVariant}
                            data-testid={`${DATA_TEST_ID_PREFIX}-status-badge-${campaign.id}`}
                          >
                            {statusText}
                          </Badge>
                        )
                      })()}
                    </TableCell>
                  )}
                  {visibleColumns.has('createdAt') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-created-cell-${campaign.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCalendar size={14} style={{ color: 'var(--color-text-secondary)' }} />
                        <span className="gba:text-sm">
                          {campaign.createdAt ? dayjs(campaign.createdAt).format('MMM DD, YYYY') : '-'}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.has('actions') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${campaign.id}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`${DATA_TEST_ID_PREFIX}-update-campaign-button-${campaign.id}`}
                          size="icon"
                          contextsArray={[FlowContextName.customerCampaignEntity]}
                          externalContextData={{
                            campaignId: campaign.id
                          }}
                          prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-campaign`}
                          deferMainContextRequestsUntilClick
                          accessToken={accessToken}
                          emptyStateBehavior="enable"
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Pagination */}
      <div
        className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
        data-testid={`${DATA_TEST_ID_PREFIX}-pagination`}
      >
        <div
          className="gba:text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
          data-testid={`${DATA_TEST_ID_PREFIX}-pagination-info`}
        >
          {`${(currentPage - 1) * pageSize + 1}-${Math.min(
            currentPage * pageSize,
            totalCount
          )} of ${totalCount} campaigns`}
        </div>
        <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
          <div className="gba:flex gba:items-center gba:space-x-2">
            <p className="gba:text-sm gba:font-medium">Rows per page</p>
            <select
              value={pageSize}
              onChange={e => onPaginationChange(1, Number(e.target.value))}
              className="gba:h-8 gba:w-[70px] gba:rounded gba:px-3 gba:py-1 gba:text-sm"
              style={{
                border: '1px solid var(--color-border-default)',
                backgroundColor: 'var(--color-surface-primary)',
                color: 'var(--color-text-primary)'
              }}
              data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select`}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div
            className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
            data-testid={`${DATA_TEST_ID_PREFIX}-page-info`}
          >
            Page {currentPage} of {Math.ceil(totalCount / pageSize)}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-2">
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(1)}
              disabled={currentPage === 1}
              data-testid={`${DATA_TEST_ID_PREFIX}-first-page-button`}
            >
              <span className="gba:sr-only">Go to first page</span>
              ⟨⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(currentPage - 1)}
              disabled={currentPage === 1}
              data-testid={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
            >
              <span className="gba:sr-only">Go to previous page</span>⟨
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
              data-testid={`${DATA_TEST_ID_PREFIX}-next-page-button`}
            >
              <span className="gba:sr-only">Go to next page</span>⟩
            </Button>
            <Button
              variant="outline"
              className="gba:h-8 gba:w-8 gba:p-0"
              onClick={() => onPaginationChange(Math.ceil(totalCount / pageSize))}
              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
              data-testid={`${DATA_TEST_ID_PREFIX}-last-page-button`}
            >
              <span className="gba:sr-only">Go to last page</span>
              ⟩⟩
            </Button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {campaigns.length === 0 && !isLoading && (
        <div
          className="gba:text-center gba:py-8"
          style={{ color: 'var(--color-text-secondary)' }}
          data-testid={`${DATA_TEST_ID_PREFIX}-empty-state`}
        >
          {getTranslationFromI18nKeyAndLabel('campaigns.table.noData', 'No campaigns found')}
        </div>
      )}
    </Card>
  )
}

export default CampaignsTable
