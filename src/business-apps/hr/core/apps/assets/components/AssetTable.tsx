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
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
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
  onPageChange?: (page: number) => void
  onSearchChange?: (search: string) => void
  onStatusFilterChange?: (status: string) => void
  onAssetClick?: (asset: Asset) => void
  onAllocateAsset?: (assetId: string) => void
  onUpdateAsset?: (assetId: string) => void
  onRetireAsset?: (assetId: string) => void
  onRetrieveAsset?: (assetId: string) => void
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
  // Fallback: format by removing _ASSET and replacing underscores with spaces
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
  onPageChange,
  onSearchChange,
  onStatusFilterChange,
  onAssetClick,
  onAllocateAsset,
  onUpdateAsset,
  onRetireAsset,
  onRetrieveAsset,
  accessToken
}) => {
  const DATA_TEST_ID_PREFIX = 'asset-table'
  const [localState, setLocalState] = useState<AssetTableState>({
    searchQuery: '',
    statusFilter: 'all'
  })

  const handleStatusFilterChange = (value: string) => {
    setLocalState(prev => ({ ...prev, statusFilter: value }))
    onStatusFilterChange?.(value)
    onPageChange?.(1)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalState(prev => ({ ...prev, searchQuery: value }))
    onSearchChange?.(value)
    onPageChange?.(1)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="gba:space-y-4" data-testid="asset-table-container">
      <div className="gba:flex gba:gap-4 gba:flex-wrap">
        <div className="gba:flex-1 gba:min-w-[200px]">
          <Input
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.search_assets', 'Search assets...')}
            value={localState.searchQuery}
            onChange={handleSearchChange}
            className="gba:w-full"
            data-testid="asset-search-input"
          />
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

      <div className="gba:text-sm gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.showing', 'Showing')} {assets.length}{' '}
        {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.of', 'of')} {totalCount}{' '}
        {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.assets', 'assets')}
      </div>

      <div className="gba:border gba:rounded-lg">
        <Table data-testid="assets-table">
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-[60px]"></TableHead>
              <TableHead className="gba:w-[120px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.category', 'Category')}
              </TableHead>
              <TableHead className="gba:w-[130px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.producer', 'Producer')}
              </TableHead>
              <TableHead className="gba:w-[160px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.model', 'Model')}
              </TableHead>
              <TableHead className="gba:w-[140px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.serial_number', 'Serial Number')}
              </TableHead>
              <TableHead className="gba:w-[100px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status', 'Status')}
              </TableHead>
              <TableHead className="gba:w-[150px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.location', 'Location')}
              </TableHead>
              <TableHead className="gba:w-[120px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.warranty', 'Warranty')}
              </TableHead>
              <TableHead className="gba:w-[100px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.value', 'Value')}
              </TableHead>
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

      {totalPages > 1 && (
        <div className="gba:flex gba:justify-between gba:items-center">
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.page', 'Page')} {currentPage}{' '}
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.of', 'of')} {totalPages}
          </div>
          <div className="gba:flex gba:gap-2">
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
      )}
    </div>
  )
}
