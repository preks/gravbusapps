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
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

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
  const isAllocated = assetStatus === AssetStatus.ALLOCATED || (assetStatus as string) === 'ALLOCATED_ASSET'
  const isRetired = assetStatus === AssetStatus.RETIRED || (assetStatus as string) === 'RETIRED'

  const staticFlowData = useMemo(() => {
    const actions: any[] = []

    if (!isRetired && onUpdateAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
        key: 'update-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:asset_list.asset_flows.update_asset', 'Update Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onUpdateAsset(assetId)
        }
      })
    }

    if (!isAllocated && !isRetired && onAllocateAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
        key: 'allocate-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:asset_list.asset_flows.allocate_asset', 'Allocate Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onAllocateAsset(assetId)
        }
      })
    }

    if (isAllocated && !isRetired && onRetrieveAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
        key: 'retrieve-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:asset_list.asset_flows.retrieve_asset', 'Retrieve Asset'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onRetrieveAsset(assetId)
        }
      })
    }

    if (!isRetired && onRetireAsset) {
      actions.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
        key: 'retire-asset',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:asset_list.asset_flows.retire_asset', 'Retire Asset'),
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

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
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
            placeholder="Search assets..."
            value={localState.searchQuery}
            onChange={handleSearchChange}
            className="gba:w-full"
            data-testid="asset-search-input"
          />
        </div>

        <Select value={localState.statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="gba:w-[180px]" data-testid="asset-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.values(AssetStatus).map(status => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="gba:text-sm gba:text-muted-foreground">
        Showing {assets.length} of {totalCount} assets
      </div>

      <div className="gba:border gba:rounded-lg">
        <Table data-testid="assets-table">
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-[60px]"></TableHead>
              <TableHead className="gba:w-[120px]">Category</TableHead>
              <TableHead className="gba:w-[130px]">Producer</TableHead>
              <TableHead className="gba:w-[160px]">Model</TableHead>
              <TableHead className="gba:w-[140px]">Serial Number</TableHead>
              <TableHead className="gba:w-[100px]">Status</TableHead>
              <TableHead className="gba:w-[150px]">Location</TableHead>
              <TableHead className="gba:w-[120px]">Warranty</TableHead>
              <TableHead className="gba:w-[100px]">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="gba:text-center gba:py-8">
                  <div data-testid="asset-table-loading">Loading assets...</div>
                </TableCell>
              </TableRow>
            ) : assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="gba:text-center gba:py-8">
                  <div data-testid="asset-table-empty">No assets found matching your criteria.</div>
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
                      {asset.assetCategory?.value || 'N/A'}
                    </TableCell>
                    <TableCell data-testid={`asset-producer-${asset.id}`}>{asset.assetBrand?.value || 'N/A'}</TableCell>
                    <TableCell data-testid={`asset-model-${asset.id}`}>{asset.model}</TableCell>
                    <TableCell data-testid={`asset-serial-${asset.id}`} className="gba:font-mono gba:text-sm">
                      {asset.serialNumber}
                    </TableCell>
                    <TableCell data-testid={`asset-status-${asset.id}`}>
                      <Badge variant={getStatusBadgeVariant(asset.assetStatus)}>{asset.assetStatus}</Badge>
                    </TableCell>
                    <TableCell data-testid={`asset-location-${asset.id}`}>
                      {asset.siteLocation?.name || 'N/A'}
                    </TableCell>
                    <TableCell data-testid={`asset-warranty-${asset.id}`}>
                      <div className="gba:text-sm">
                        {isWarrantyExpired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : warrantyDaysRemaining < 90 ? (
                          <Badge variant="warning">{Math.ceil(warrantyDaysRemaining / 30)} mo left</Badge>
                        ) : (
                          <span className="gba:text-muted-foreground">
                            {formatDate(warrantyExpiryDate.toISOString())}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`asset-value-${asset.id}`}>
                      {asset.currency?.code
                        ? formatCurrency(asset.inventoryValue, asset.currency.code)
                        : `${asset.inventoryValue}`}
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
            Page {currentPage} of {totalPages}
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              data-testid="asset-table-prev-page"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              data-testid="asset-table-next-page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
