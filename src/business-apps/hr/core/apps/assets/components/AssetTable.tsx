import React, { useState, useMemo } from 'react'
import { Asset, AssetStatus } from '../types'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { MagnifyingGlass, X, CaretUp, CaretDown } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { DebouncedInput } from '@/components/debounced-input'
import {
  getTranslationFromI18nKeyAndLabel,
  formatDate,
  formatNumberFunction,
  getCatalogValue
} from '@/common/utils/windowUtils'

const MemoizedAppActionButton: React.FC<{
  assetId: string
  assetStatus: AssetStatus
  accessToken: string
  dataTestIdPrefix: string
  onAllocateAsset?: (assetId: string) => void
  onUpdateAsset?: (assetId: string) => void
  onRetireAsset?: (assetId: string) => void
  onRetrieveAsset?: (assetId: string) => void
}> = ({
  assetId,
  assetStatus,
  accessToken,
  dataTestIdPrefix,
  onAllocateAsset,
  onUpdateAsset,
  onRetireAsset,
  onRetrieveAsset
}) => {
  const isAllocated = assetStatus === AssetStatus.ALLOCATED
  const isRetired = assetStatus === AssetStatus.RETIRED

  const staticFlowData = useMemo(() => {
    const actions: any[] = []

    if (!isRetired && onUpdateAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions'),
        key: 'update-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.update_asset', 'Update Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onUpdateAsset(assetId)
        }
      })
    }

    if (!isAllocated && !isRetired && onAllocateAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions'),
        key: 'allocate-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.allocate_asset', 'Allocate Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onAllocateAsset(assetId)
        }
      })
    }

    if (isAllocated && !isRetired && onRetrieveAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions'),
        key: 'retrieve-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.retrieve_asset', 'Retrieve Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onRetrieveAsset(assetId)
        }
      })
    }

    if (!isRetired && onRetireAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.actions', 'Actions'),
        key: 'retire-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.retire_asset', 'Retire Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onRetireAsset(assetId)
        }
      })
    }

    return actions
  }, [assetId, isAllocated, isRetired, onAllocateAsset, onUpdateAsset, onRetireAsset, onRetrieveAsset])

  return (
    <AppActionButton
      data-testid={`${dataTestIdPrefix}-actions-${assetId}`}
      size="icon"
      staticFlowData={staticFlowData}
      prefixDataTestId={`${dataTestIdPrefix}-action-${assetId}`}
      accessToken={accessToken}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick={true}
      onClick={e => e.stopPropagation()}
    />
  )
}

MemoizedAppActionButton.displayName = 'MemoizedAppActionButton'

interface AssetTableProps extends BusinessAppContextProps {
  assets: Asset[]
  totalCount?: number
  isLoading?: boolean
  currentPage?: number
  pageSize?: number
  statusFilter?: string
  searchQuery?: string
  sortField?: string
  sortOrder?: 'ASC' | 'DESC'
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onSearchChange?: (search: string) => void
  onStatusFilterChange?: (status: string) => void
  onSortChange?: (field: string, order: 'ASC' | 'DESC' | '') => void
  onAssetClick?: (asset: Asset) => void
  onAllocateAsset?: (assetId: string) => void
  onUpdateAsset?: (assetId: string) => void
  onRetireAsset?: (assetId: string) => void
  onRetrieveAsset?: (assetId: string) => void
}

// Sortable table header component
const SortableTableHead: React.FC<{
  children: React.ReactNode
  field: string
  currentSortField?: string
  currentSortOrder?: 'ASC' | 'DESC'
  onSort?: (field: string, order: 'ASC' | 'DESC' | '') => void
  className?: string
}> = ({ children, field, currentSortField, currentSortOrder, onSort, className }) => {
  if (!onSort) {
    return <TableHead className={className}>{children}</TableHead>
  }

  const isSorted = currentSortField === field
  const nextOrder = isSorted ? (currentSortOrder === 'ASC' ? 'DESC' : '') : 'ASC'

  return (
    <TableHead
      className={`gba:cursor-pointer gba:select-none gba:hover:gba:bg-muted gba:transition-colors ${className || ''}`}
      onClick={() => onSort(field, nextOrder)}
    >
      <div className="gba:flex gba:items-center gba:gap-1">
        {children}
        {isSorted &&
          (currentSortOrder === 'ASC' ? (
            <CaretUp className="gba:w-4 gba:h-4" />
          ) : (
            <CaretDown className="gba:w-4 gba:h-4" />
          ))}
      </div>
    </TableHead>
  )
}

const getStatusBadgeVariant = (status: AssetStatus): 'success' | 'info' | 'warning' | 'destructive' | 'default' => {
  switch (status) {
    case AssetStatus.AVAILABLE:
      return 'success'
    case AssetStatus.ALLOCATED:
      return 'info'
    case AssetStatus.UNDER_REPAIR:
      return 'warning'
    case AssetStatus.RETIRED:
      return 'destructive'
    default:
      return 'default'
  }
}

const formatStatus = (status: AssetStatus | string): string => {
  if (status === AssetStatus.AVAILABLE) {
    return getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status_available', 'Available')
  }
  if (status === AssetStatus.ALLOCATED) {
    return getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status_allocated', 'Allocated')
  }
  if (status === AssetStatus.UNDER_REPAIR) {
    return getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status_in_repair', 'In Repair')
  }
  if (status === AssetStatus.RETIRED) {
    return getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status_retired', 'Retired')
  }
  const statusStr = status as string
  return statusStr
    .replace(/_ASSET$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

const formatCurrency = (amount: number, currency?: string): string => {
  const formattedAmount = formatNumberFunction(amount)
  if (!currency) {
    return formattedAmount
  }
  return `${formattedAmount} ${currency}`
}

interface AssetTableState {
  searchQuery: string
  statusFilter: string
}

export const AssetTable: React.FC<AssetTableProps> = ({
  assets,
  totalCount = 0,
  isLoading = false,
  currentPage = 1,
  pageSize = 10,
  statusFilter: statusFilterProp = 'all',
  searchQuery: searchQueryProp = '',
  sortField: sortFieldProp,
  sortOrder: sortOrderProp,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onStatusFilterChange,
  onSortChange,
  onAssetClick,
  onAllocateAsset,
  onUpdateAsset,
  onRetireAsset,
  onRetrieveAsset,
  accessToken
}) => {
  const DATA_TEST_ID_PREFIX = 'asset-table'
  const [localState, setLocalState] = useState<AssetTableState>({
    searchQuery: searchQueryProp,
    statusFilter: statusFilterProp
  })
  const [inputKey, setInputKey] = useState(0)

  React.useEffect(() => {
    setLocalState(prev => ({ ...prev, statusFilter: statusFilterProp }))
  }, [statusFilterProp])

  React.useEffect(() => {
    setLocalState(prev => ({ ...prev, searchQuery: searchQueryProp }))
  }, [searchQueryProp])

  const handleStatusFilterChange = (value: string) => {
    setLocalState(prev => ({ ...prev, statusFilter: value }))
    onStatusFilterChange?.(value)
    onPageChange?.(1)
  }

  const handleSearchChange = (value: string) => {
    setLocalState(prev => ({ ...prev, searchQuery: value }))
    onSearchChange?.(value)
    onPageChange?.(1)
  }

  const handleClearSearch = () => {
    const emptyValue = ''
    setLocalState(prev => ({ ...prev, searchQuery: emptyValue }))
    onSearchChange?.(emptyValue)
    onPageChange?.(1)
    setInputKey(prev => prev + 1)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="gba:space-y-4" data-testid="asset-table-container">
      <div className="gba:flex gba:gap-4 gba:flex-wrap">
        <div className="gba:flex-1 gba:min-w-[200px] gba:relative">
          <DebouncedInput
            key={`search-input-${inputKey}`}
            value={searchQueryProp}
            onChange={handleSearchChange}
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.search_assets', 'Search assets...')}
            className="gba:w-full gba:pr-10"
            debounceDelay={300}
            ariaLabel={getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.search_assets', 'Search assets...')}
            data-testid="asset-search-input"
            icon={
              <MagnifyingGlass className="gba:w-4 gba:h-4 gba:text-muted-foreground" data-testid="asset-search-icon" />
            }
          />
          {searchQueryProp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="gba:absolute gba:right-1 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-6 gba:w-6 gba:p-0 gba:rounded-full hover:gba:bg-muted gba:transition-colors"
              data-testid="asset-search-clear-button"
              aria-label={getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.clear_search', 'Clear search')}
            >
              <X className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
            </Button>
          )}
        </div>

        <Select value={localState.statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="gba:w-[180px]" data-testid="asset-status-filter">
            <SelectValue
              placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.all_statuses', 'All Statuses')}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.all_statuses', 'All Statuses')}
            </SelectItem>
            {Object.values(AssetStatus)
              .filter(status => status !== AssetStatus.RETIRED)
              .map(status => (
                <SelectItem key={status} value={status}>
                  {formatStatus(status)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="gba:border gba:rounded-lg">
        <Table data-testid="assets-table">
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-[60px]"></TableHead>
              <SortableTableHead
                field="assetCategory.value"
                currentSortField={sortFieldProp}
                currentSortOrder={sortOrderProp}
                onSort={onSortChange}
                className="gba:w-[120px]"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.category', 'Category')}
              </SortableTableHead>
              <SortableTableHead
                field="assetBrand.value"
                currentSortField={sortFieldProp}
                currentSortOrder={sortOrderProp}
                onSort={onSortChange}
                className="gba:w-[130px]"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.producer', 'Producer')}
              </SortableTableHead>
              <SortableTableHead
                field="model"
                currentSortField={sortFieldProp}
                currentSortOrder={sortOrderProp}
                onSort={onSortChange}
                className="gba:w-[160px]"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.model', 'Model')}
              </SortableTableHead>
              <SortableTableHead
                field="serialNumber"
                currentSortField={sortFieldProp}
                currentSortOrder={sortOrderProp}
                onSort={onSortChange}
                className="gba:w-[140px]"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.serial_number', 'Serial Number')}
              </SortableTableHead>
              <SortableTableHead
                field="assetStatus"
                currentSortField={sortFieldProp}
                currentSortOrder={sortOrderProp}
                onSort={onSortChange}
                className="gba:w-[100px]"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status', 'Status')}
              </SortableTableHead>
              <SortableTableHead
                field="siteLocation.name"
                currentSortField={sortFieldProp}
                currentSortOrder={sortOrderProp}
                onSort={onSortChange}
                className="gba:w-[150px]"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.location', 'Location')}
              </SortableTableHead>
              <SortableTableHead
                field="acquisitionDate"
                currentSortField={sortFieldProp}
                currentSortOrder={sortOrderProp}
                onSort={onSortChange}
                className="gba:w-[120px]"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.warranty', 'Warranty')}
              </SortableTableHead>
              <SortableTableHead
                field="inventoryValue"
                currentSortField={sortFieldProp}
                currentSortOrder={sortOrderProp}
                onSort={onSortChange}
                className="gba:w-[100px]"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.value', 'Value')}
              </SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="gba:text-center gba:py-8">
                  <div data-testid="asset-table-loading">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.loading_assets', 'Loading assets...')}
                  </div>
                </TableCell>
              </TableRow>
            ) : assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="gba:text-center gba:py-8">
                  <div data-testid="asset-table-empty">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:hr_assets.no_assets_found',
                      'No assets found matching your criteria.'
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              assets.map(asset => {
                const acquisitionDate = new Date(asset.acquisitionDate)
                const warrantyExpiryDate = new Date(acquisitionDate)
                warrantyExpiryDate.setMonth(warrantyExpiryDate.getMonth() + asset.warrantyPeriodMonths)

                const isWarrantyExpired = warrantyExpiryDate < new Date()
                const warrantyDaysRemaining = Math.ceil(
                  (warrantyExpiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                )

                return (
                  <TableRow
                    key={asset.id}
                    className={onAssetClick ? 'gba:cursor-pointer' : ''}
                    onClick={() => onAssetClick?.(asset)}
                    data-testid={`asset-table-row-${asset.id}`}
                  >
                    <TableCell className="gba:py-4 gba:px-6">
                      <div className="gba:flex gba:justify-start gba:gap-2" onClick={e => e.stopPropagation()}>
                        <MemoizedAppActionButton
                          key={`action-button-${asset.id}-${asset.assetStatus}`}
                          assetId={asset.id}
                          assetStatus={asset.assetStatus}
                          accessToken={accessToken}
                          dataTestIdPrefix={DATA_TEST_ID_PREFIX}
                          onAllocateAsset={onAllocateAsset}
                          onUpdateAsset={onUpdateAsset}
                          onRetireAsset={onRetireAsset}
                          onRetrieveAsset={onRetrieveAsset}
                        />
                      </div>
                    </TableCell>
                    <TableCell data-testid={`asset-category-${asset.id}`}>
                      {asset.assetCategory
                        ? getCatalogValue(asset.assetCategory)
                        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')}
                    </TableCell>
                    <TableCell data-testid={`asset-producer-${asset.id}`}>
                      {asset.assetBrand
                        ? getCatalogValue(asset.assetBrand)
                        : getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')}
                    </TableCell>
                    <TableCell data-testid={`asset-model-${asset.id}`}>{asset.model}</TableCell>
                    <TableCell data-testid={`asset-serial-${asset.id}`} className="gba:font-mono gba:text-sm">
                      {asset.serialNumber}
                    </TableCell>
                    <TableCell data-testid={`asset-status-${asset.id}`}>
                      <Badge variant={getStatusBadgeVariant(asset.assetStatus)}>
                        {formatStatus(asset.assetStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`asset-location-${asset.id}`}>
                      {asset.siteLocation?.name ||
                        getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')}
                    </TableCell>
                    <TableCell data-testid={`asset-warranty-${asset.id}`}>
                      <div className="gba:text-sm">
                        {isWarrantyExpired ? (
                          <Badge variant="destructive">
                            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.expired', 'Expired')}
                          </Badge>
                        ) : warrantyDaysRemaining < 90 ? (
                          <Badge variant="warning">
                            {Math.ceil(warrantyDaysRemaining / 30)}{' '}
                            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.mo_left', 'mo left')}
                          </Badge>
                        ) : (
                          <span className="gba:text-muted-foreground">
                            {formatDate(warrantyExpiryDate) ||
                              formatDate(warrantyExpiryDate.toISOString()) ||
                              warrantyExpiryDate.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`asset-value-${asset.id}`}>
                      {formatCurrency(asset.inventoryValue, asset.currency?.code)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 0 && (
        <div
          className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
          data-testid="asset-table-pagination"
        >
          <div className="gba:text-sm gba:text-muted-foreground" data-testid="asset-table-pagination-info">
            {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCount)} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} ${totalCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.assets', 'assets')}`}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
            <div className="gba:flex gba:items-center gba:space-x-2">
              <p className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.rows_per_page', 'Rows per page')}
              </p>
              <select
                value={pageSize}
                onChange={e => {
                  const newPageSize = Number(e.target.value)
                  onPageSizeChange?.(newPageSize)
                  onPageChange?.(1)
                }}
                className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                data-testid="asset-table-page-size-select"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div
              className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
              data-testid="asset-table-page-info"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.page', 'Page')} {currentPage}{' '}
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} {totalPages}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                data-testid="asset-table-prev-page"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.previous', 'Previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                data-testid="asset-table-next-page"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.next', 'Next')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
