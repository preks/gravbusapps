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
import { CalendarIcon, TagIcon, MegaphoneIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { SalesCampaign } from './types/SalesCampaignTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  SortableHeader,
  DateCell,
  PaginationButton,
  IconCell,
  useTableSorting
} from '@/common/components/customer/TableHelpers'
import dayjs from 'dayjs'
import { startProcess } from '@/common/utils/start-process'

interface CampaignsTableProps {
  campaigns: SalesCampaign[]
  isLoading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  pageSize: number
  sortField: string
  sortOrder: 'ASC' | 'DESC' | ''
  onTableChange: (
    pagination: { current: number; pageSize: number },
    filters: Record<string, unknown>,
    sorter: Record<string, unknown>
  ) => void
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

  // Use shared table sorting logic
  const { handleSort, renderSortIcon } = useTableSorting(sortField, sortOrder, onSortingChange)

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
                {visibleColumns.has('actions') && (
                  <TableHead
                    className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                    data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                  >
                    {getTranslationFromI18nKeyAndLabel('campaigns.table.actions', 'ACTIONS')}
                  </TableHead>
                )}
                {visibleColumns.has('name') && (
                  <SortableHeader
                    field="name"
                    label={getTranslationFromI18nKeyAndLabel('campaigns.table.name', 'Campaign Name')}
                    width="gba:w-[300px]"
                    onSort={handleSort}
                    renderSortIcon={renderSortIcon}
                    testIdPrefix={DATA_TEST_ID_PREFIX}
                    testIdSuffix="name-header"
                  />
                )}
                {visibleColumns.has('type') && (
                  <SortableHeader
                    field="typeRef"
                    label={getTranslationFromI18nKeyAndLabel('campaigns.table.type', 'Campaign Type')}
                    width="gba:w-[180px]"
                    onSort={handleSort}
                    renderSortIcon={renderSortIcon}
                    testIdPrefix={DATA_TEST_ID_PREFIX}
                    testIdSuffix="type-header"
                  />
                )}
                {visibleColumns.has('startDate') && (
                  <SortableHeader
                    field="startDate"
                    label={getTranslationFromI18nKeyAndLabel('campaigns.table.startDate', 'Start Date')}
                    width="gba:w-[144px]"
                    onSort={handleSort}
                    renderSortIcon={renderSortIcon}
                    testIdPrefix={DATA_TEST_ID_PREFIX}
                    testIdSuffix="start-date-header"
                  />
                )}
                {visibleColumns.has('endDate') && (
                  <SortableHeader
                    field="endDate"
                    label={getTranslationFromI18nKeyAndLabel('campaigns.table.endDate', 'End Date')}
                    width="gba:w-[144px]"
                    onSort={handleSort}
                    renderSortIcon={renderSortIcon}
                    testIdPrefix={DATA_TEST_ID_PREFIX}
                    testIdSuffix="end-date-header"
                  />
                )}
                {visibleColumns.has('status') && (
                  <SortableHeader
                    field="status"
                    label={getTranslationFromI18nKeyAndLabel('campaigns.table.status', 'Status')}
                    width="gba:w-[144px]"
                    onSort={handleSort}
                    renderSortIcon={renderSortIcon}
                    testIdPrefix={DATA_TEST_ID_PREFIX}
                    testIdSuffix="status-header"
                  />
                )}
                {visibleColumns.has('createdAt') && (
                  <SortableHeader
                    field="createdAt"
                    label={getTranslationFromI18nKeyAndLabel('campaigns.table.created', 'Created')}
                    width="gba:w-[144px]"
                    onSort={handleSort}
                    renderSortIcon={renderSortIcon}
                    testIdPrefix={DATA_TEST_ID_PREFIX}
                    testIdSuffix="created-header"
                  />
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
                  {visibleColumns.has('actions') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${campaign.id}`}
                    >
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppAction
                          variant="table-row"
                          data-testid={`${DATA_TEST_ID_PREFIX}-update-campaign-button-${campaign.id}`}
                          contexts={[]}
                          lazyLoad
                          customActions={[
                            {
                              category: 'Actions',
                              key: 'update-campaign',
                              label: getTranslationFromI18nKeyAndLabel('crm:campaign.update', 'Update Campaign'),
                              onClick: () => {
                                const currentUrl = new URL(globalThis.location.href)
                                startProcess({
                                  domain: 'customer-relations',
                                  processName: 'saveSalesCampaign',
                                  payload: {
                                    // broad payload so native screen can detect update
                                    changeMode: 'UPDATE',
                                    salesCampaign: { id: campaign.id },
                                    salesCampaignId: campaign.id,
                                    id: campaign.id,
                                    entityId: campaign.id,
                                    campaignId: campaign.id,
                                    returnUrl: currentUrl.toString(),
                                    saveSalesCampaignModelInput: {
                                      changeMode: 'UPDATE',
                                      salesCampaign: { id: campaign.id },
                                      returnUrl: currentUrl.toString()
                                    }
                                  },
                                  builderType: 'NATIVE_SCREEN'
                                })
                              }
                            }
                          ]}
                          accessToken={accessToken}
                          emptyState="enable"
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.has('name') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-name-cell-${campaign.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <MegaphoneIcon size={16} style={{ color: 'var(--color-primary-500)' }} />
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
                    <IconCell
                      icon={TagIcon}
                      iconColor="var(--color-primary-600)"
                      content={<span className="gba:text-sm">{campaign.type?.value || '-'}</span>}
                      testId={`${DATA_TEST_ID_PREFIX}-type-cell-${campaign.id}`}
                    />
                  )}
                  {visibleColumns.has('startDate') && (
                    <DateCell
                      dateString={campaign.startDate}
                      testId={`${DATA_TEST_ID_PREFIX}-start-date-cell-${campaign.id}`}
                    />
                  )}
                  {visibleColumns.has('endDate') && (
                    <DateCell
                      dateString={campaign.endDate}
                      testId={`${DATA_TEST_ID_PREFIX}-end-date-cell-${campaign.id}`}
                    />
                  )}
                  {visibleColumns.has('status') && (
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-status-cell-${campaign.id}`}
                    >
                      {(() => {
                        const statusText = getCampaignStatus(campaign.startDate, campaign.endDate)
                        let badgeVariant: 'success' | 'pending' | 'default' | 'secondary' = 'secondary'
                        if (statusText === 'Active') {
                          badgeVariant = 'success'
                        } else if (statusText === 'Planned') {
                          badgeVariant = 'pending'
                        } else if (statusText === 'Completed') {
                          badgeVariant = 'default'
                        }
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
                    <IconCell
                      icon={CalendarIcon}
                      iconColor="var(--color-text-secondary)"
                      content={
                        <span className="gba:text-sm">
                          {campaign.createdAt ? dayjs(campaign.createdAt).format('MMM DD, YYYY') : '-'}
                        </span>
                      }
                      testId={`${DATA_TEST_ID_PREFIX}-created-cell-${campaign.id}`}
                    />
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
            <PaginationButton
              onClick={() => onPaginationChange(1)}
              disabled={currentPage === 1}
              testId={`${DATA_TEST_ID_PREFIX}-first-page-button`}
              label="Go to first page"
              symbol="⟨⟨"
            />
            <PaginationButton
              onClick={() => onPaginationChange(currentPage - 1)}
              disabled={currentPage === 1}
              testId={`${DATA_TEST_ID_PREFIX}-previous-page-button`}
              label="Go to previous page"
              symbol="⟨"
            />
            <PaginationButton
              onClick={() => onPaginationChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
              testId={`${DATA_TEST_ID_PREFIX}-next-page-button`}
              label="Go to next page"
              symbol="⟩"
            />
            <PaginationButton
              onClick={() => onPaginationChange(Math.ceil(totalCount / pageSize))}
              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
              testId={`${DATA_TEST_ID_PREFIX}-last-page-button`}
              label="Go to last page"
              symbol="⟩⟩"
            />
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
