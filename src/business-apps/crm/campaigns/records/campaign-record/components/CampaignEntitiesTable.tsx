import React from 'react'
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
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { UserIcon, BuildingIcon, TargetIcon, CalendarIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { CampaignEntity } from '../types/CampaignRecordTypes'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { SortableHeader, PaginationButton, IconCell, useTableSorting } from '@/common/components/customer/TableHelpers'

interface CampaignEntitiesTableProps {
  entities: CampaignEntity[]
  isLoading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  pageSize: number
  sortField: string
  sortOrder: 'ASC' | 'DESC' | ''
  onPaginationChange: (page: number, pageSize?: number) => void
  onSortingChange: (field: string, order: 'ASC' | 'DESC' | '') => void
  onRowClick?: (entity: CampaignEntity) => void
  accessToken: string
}

const CampaignEntitiesTable: React.FC<CampaignEntitiesTableProps> = ({
  entities,
  isLoading,
  error,
  totalCount,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  onPaginationChange,
  onSortingChange,
  onRowClick,
  accessToken
}) => {
  const DATA_TEST_ID_PREFIX = 'CampaignEntitiesTable'

  // Helper function to get entity type config
  const getEntityTypeConfig = (type: string) => {
    const typeConfig = {
      lead: { label: 'Lead', variant: 'default' as const, icon: UserIcon, color: 'var(--color-primary-500)' },
      account: {
        label: 'Account',
        variant: 'secondary' as const,
        icon: BuildingIcon,
        color: 'var(--color-primary-600)'
      },
      contact: { label: 'Contact', variant: 'outline' as const, icon: UserIcons, color: 'var(--color-primary-600)' },
      opportunity: {
        label: 'Opportunity',
        variant: 'destructive' as const,
        icon: TargetIcon,
        color: 'var(--color-primary-500)'
      }
    }

    return (
      typeConfig[type as keyof typeof typeConfig] || {
        label: type,
        variant: 'default' as const,
        icon: UserIcon,
        color: 'var(--color-primary-500)'
      }
    )
  }

  // Helper function to get entity display name
  const getEntityDisplayName = (entity: CampaignEntity): string => {
    if (entity.type === 'lead' || entity.type === 'contact') {
      return entity.name || `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || '-'
    }
    return entity.name || '-'
  }

  // Use shared table sorting logic
  const { handleSort, renderSortIcon } = useTableSorting(sortField, sortOrder, onSortingChange)

  // Helper function to get flow context for entity type
  const getFlowContext = (entityType: string): FlowContextName[] => {
    switch (entityType) {
      case 'lead':
        return [FlowContextName.customerLeadEntity]
      case 'account':
        return [FlowContextName.customerAccountEntity]
      case 'contact':
        return [FlowContextName.customerContactEntity]
      case 'opportunity':
        return [FlowContextName.customerOpportunityEntity]
      default:
        return []
    }
  }

  // Helper function to get external context data
  const getExternalContextData = (entity: CampaignEntity) => {
    switch (entity.type) {
      case 'lead':
        return { leadId: entity.id }
      case 'account':
        return { accountId: entity.id }
      case 'contact':
        return { contactId: entity.id }
      case 'opportunity':
        return { opportunityId: entity.id }
      default:
        return { entityId: entity.id }
    }
  }

  // Handle row click
  const handleRowClick = (entity: CampaignEntity) => {
    if (onRowClick) {
      onRowClick(entity)
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
          {getTranslationFromI18nKeyAndLabel('campaign.entities.error.title', 'Error Loading Entities')}
        </div>
        <div className="gba:mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {error}
        </div>
        <Button
          variant="default"
          onClick={() => globalThis.location.reload()}
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
                {/* Actions Column */}
                <TableHead
                  className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6"
                  data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                >
                  {getTranslationFromI18nKeyAndLabel('campaign.entities.table.actions', 'ACTIONS')}
                </TableHead>

                {/* Name Column - Sortable */}
                <SortableHeader
                  field="name"
                  label={getTranslationFromI18nKeyAndLabel('campaign.entities.table.name', 'Name')}
                  width="gba:w-[300px]"
                  onSort={handleSort}
                  renderSortIcon={renderSortIcon}
                  testIdPrefix={DATA_TEST_ID_PREFIX}
                  testIdSuffix="name-header"
                />

                {/* Type Column - Sortable */}
                <SortableHeader
                  field="type"
                  label={getTranslationFromI18nKeyAndLabel('campaign.entities.table.type', 'Type')}
                  width="gba:w-[180px]"
                  onSort={handleSort}
                  renderSortIcon={renderSortIcon}
                  testIdPrefix={DATA_TEST_ID_PREFIX}
                  testIdSuffix="type-header"
                />

                {/* Creation Date Column - Sortable */}
                <SortableHeader
                  field="createdAt"
                  label={getTranslationFromI18nKeyAndLabel('campaign.entities.table.creationDate', 'Creation Date')}
                  width="gba:w-[144px]"
                  onSort={handleSort}
                  renderSortIcon={renderSortIcon}
                  testIdPrefix={DATA_TEST_ID_PREFIX}
                  testIdSuffix="creation-date-header"
                />

                {/* Owner Column - Sortable */}
                <SortableHeader
                  field="ownerEmployeeId"
                  label={getTranslationFromI18nKeyAndLabel('campaign.entities.table.owner', 'Owner')}
                  width="gba:w-[200px]"
                  onSort={handleSort}
                  renderSortIcon={renderSortIcon}
                  testIdPrefix={DATA_TEST_ID_PREFIX}
                  testIdSuffix="owner-header"
                />

                {/* Status Column - Sortable */}
                <SortableHeader
                  field="status"
                  label={getTranslationFromI18nKeyAndLabel('campaign.entities.table.status', 'Status')}
                  width="gba:w-[144px]"
                  onSort={handleSort}
                  renderSortIcon={renderSortIcon}
                  testIdPrefix={DATA_TEST_ID_PREFIX}
                  testIdSuffix="status-header"
                />
              </TableRow>
            </TableHeader>

            <TableBody>
              {entities.map(entity => {
                const typeConfig = getEntityTypeConfig(entity.type)
                const IconComponent = typeConfig.icon
                return (
                  <TableRow
                    key={entity.id}
                    className={`gba:border-b gba:transition-colors ${onRowClick ? 'gba:cursor-pointer' : ''}`}
                    data-testid={`${DATA_TEST_ID_PREFIX}-row-${entity.id}`}
                    onClick={() => handleRowClick(entity)}
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
                    {/* Actions */}
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${entity.id}`}
                    >
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppAction
                          variant="table-row"
                          data-testid={`${DATA_TEST_ID_PREFIX}-update-${entity.type}-button-${entity.id}`}
                          contexts={getFlowContext(entity.type).map(context => ({
                            context,
                            contextData: getExternalContextData(entity)
                          }))}
                          prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-${entity.type}`}
                          accessToken={accessToken}
                          emptyState="enable"
                          lazyLoad
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>

                    {/* Name */}
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-name-cell-${entity.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <IconComponent size={16} style={{ color: typeConfig.color }} />
                        <div>
                          <div className="gba:font-medium gba:text-sm">{getEntityDisplayName(entity)}</div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Type */}
                    <IconCell
                      icon={IconComponent}
                      iconColor={typeConfig.color}
                      content={<span className="gba:text-sm">{typeConfig.label}</span>}
                      testId={`${DATA_TEST_ID_PREFIX}-type-cell-${entity.id}`}
                    />

                    {/* Creation Date */}
                    <IconCell
                      icon={CalendarIcon}
                      iconColor="var(--color-text-secondary)"
                      content={<span className="gba:text-sm">{formatDate(entity.creationDate)}</span>}
                      testId={`${DATA_TEST_ID_PREFIX}-creation-date-cell-${entity.id}`}
                    />

                    {/* Owner */}
                    <IconCell
                      icon={UserIcon}
                      iconColor="var(--color-text-secondary)"
                      content={
                        <span className="gba:text-sm">
                          {entity.owner?.displayName ||
                            (entity.owner?.firstName && entity.owner?.lastName
                              ? `${entity.owner.firstName} ${entity.owner.lastName}`
                              : '-')}
                        </span>
                      }
                      testId={`${DATA_TEST_ID_PREFIX}-owner-cell-${entity.id}`}
                    />

                    {/* Status */}
                    <TableCell
                      className="gba:py-4 gba:px-6"
                      data-testid={`${DATA_TEST_ID_PREFIX}-status-cell-${entity.id}`}
                    >
                      {entity.status ? (
                        <Badge variant="default" data-testid={`${DATA_TEST_ID_PREFIX}-status-badge-${entity.id}`}>
                          {entity.status.value}
                        </Badge>
                      ) : (
                        <span className="gba:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          -
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
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
          {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} entities`}
        </div>
        <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
          <div className="gba:flex gba:items-center gba:space-x-2">
            <p className="gba:text-sm gba:font-medium">Rows per page</p>
            <Select value={String(pageSize)} onValueChange={value => onPaginationChange(1, Number(value))}>
              <SelectTrigger className="gba:h-8 gba:w-20" data-testid={`${DATA_TEST_ID_PREFIX}-page-size-select`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map(size => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
      {entities.length === 0 && !isLoading && (
        <div
          className="gba:text-center gba:py-8"
          style={{ color: 'var(--color-text-secondary)' }}
          data-testid={`${DATA_TEST_ID_PREFIX}-empty-state`}
        >
          {getTranslationFromI18nKeyAndLabel('campaign.entities.empty', 'No entities found for this campaign')}
        </div>
      )}
    </Card>
  )
}

export default CampaignEntitiesTable
