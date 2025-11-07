/**
 * AssetTable Component
 * Displays assets in a table with filtering, search, and actions
 * Uses nw-design-system Table component
 */

import React, { useState, useMemo, useCallback } from 'react'
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
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useAppActionData } from '@/common/hooks/useAppActionData'
import type { ActionOption } from '@newwork/nw-design-system'

// Memoized AppActionButton to prevent unnecessary re-renders
const MemoizedAppActionButton = React.memo<{
  assetId: string
  accessToken: string
  dataTestIdPrefix: string
  onRetireAsset?: (assetId: string) => void
  onAllocateAsset?: (assetId: string) => void
}>(({ assetId, accessToken, dataTestIdPrefix, onRetireAsset, onAllocateAsset }) => {
  const { combinedData: rawCombinedData, handleDeferredFetch } = useAppActionData(
    {
      contextsArray: [FlowContextName.assetEntity],
      externalContextData: { assetId },
      accessToken,
      deferMainContextRequestsUntilClick: true,
      emptyStateBehavior: 'enable'
    },
    'AppActionButton'
  )

  const isRetireAction = useCallback((action: ActionOption): boolean => {
    const actionLabel = typeof action.label === 'string' ? action.label.toLowerCase() : ''
    const actionKey = typeof action.key === 'string' ? action.key.toLowerCase() : ''
    const processName = (action as any)?.processName?.toLowerCase() || ''

    return (
      (actionLabel.includes('retire') && actionLabel.includes('asset')) ||
      (actionKey.includes('retire') && actionKey.includes('asset')) ||
      processName === 'saveasset' ||
      processName.includes('retire') ||
      processName.includes('change-asset-status')
    )
  }, [])

  const isAllocateAction = useCallback((action: ActionOption): boolean => {
    const actionLabel = typeof action.label === 'string' ? action.label.toLowerCase() : ''
    const actionKey = typeof action.key === 'string' ? action.key.toLowerCase() : ''
    const processName = (action as any)?.processName?.toLowerCase() || ''

    return (
      (actionLabel.includes('allocate') && actionLabel.includes('asset')) ||
      (actionKey.includes('allocate') && actionKey.includes('asset')) ||
      processName.includes('allocate') ||
      processName.includes('allocateasset')
    )
  }, [])

  const filteredAndTransformedActions = useMemo(() => {
    if (rawCombinedData.length === 0) {
      return undefined
    }

    const retireAction = onRetireAsset ? rawCombinedData.find(isRetireAction) : null
    const allocateAction = onAllocateAsset ? rawCombinedData.find(isAllocateAction) : null

    if (!retireAction && !allocateAction) {
      return undefined
    }

    const transformedActions: ActionOption[] = []

    if (retireAction && onRetireAsset) {
      transformedActions.push({
        ...retireAction,
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          e?.preventDefault()
          onRetireAsset(assetId)
        }
      })
    }

    if (allocateAction && onAllocateAsset) {
      transformedActions.push({
        ...allocateAction,
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          e?.preventDefault()
          onAllocateAsset(assetId)
        }
      })
    }

    const seenKeys = new Set<string>()
    const otherActions = rawCombinedData.filter(action => {
      if (onRetireAsset && isRetireAction(action)) {
        return false
      }
      if (onAllocateAsset && isAllocateAction(action)) {
        return false
      }
      if (action.key && seenKeys.has(action.key)) {
        return false
      }
      if (action.key) {
        seenKeys.add(action.key)
      }
      return true
    })

    return [...transformedActions, ...otherActions]
  }, [rawCombinedData, assetId, onRetireAsset, onAllocateAsset, isRetireAction, isAllocateAction])

  const handleDropdownOpen = useCallback(() => {
    handleDeferredFetch()
  }, [handleDeferredFetch])

  return (
    <AppActionButton
      data-testid={`${dataTestIdPrefix}-actions-${assetId}`}
      size="icon"
      contextsArray={[FlowContextName.assetEntity]}
      externalContextData={{ assetId }}
      prefixDataTestId={`${dataTestIdPrefix}-action-${assetId}`}
      accessToken={accessToken}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick
      autoExecuteSingleAction={true}
      staticFlowData={filteredAndTransformedActions}
      onDropdownOpen={handleDropdownOpen}
    />
  )
})

MemoizedAppActionButton.displayName = 'MemoizedAppActionButton'

interface AssetTableProps extends BusinessAppContextProps {
  assets: Asset[]
  isLoading?: boolean
  onAssetClick?: (asset: Asset) => void
  onRetireAsset?: (assetId: string) => void
  onAllocateAsset?: (assetId: string) => void
}

// Helper function to get badge variant for asset status
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

// Format currency
const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Format date
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const AssetTable: React.FC<AssetTableProps> = ({
  assets,
  isLoading = false,
  onAssetClick,
  onRetireAsset,
  onAllocateAsset,
  accessToken
}) => {
  const DATA_TEST_ID_PREFIX = 'asset-table'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Filter and search assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Status filter
      if (statusFilter !== 'all' && asset.assetStatus !== statusFilter) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
          (asset.assetBrand?.value || '').toLowerCase().includes(searchLower) ||
          asset.model.toLowerCase().includes(searchLower) ||
          asset.serialNumber.toLowerCase().includes(searchLower) ||
          (asset.assetCategory?.value || '').toLowerCase().includes(searchLower) ||
          (asset.siteLocation?.name || '').toLowerCase().includes(searchLower)

        if (!matchesSearch) {
          return false
        }
      }

      return true
    })
  }, [assets, statusFilter, searchQuery])

  // Pagination
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredAssets.slice(startIndex, startIndex + pageSize)
  }, [filteredAssets, currentPage, pageSize])

  const totalPages = Math.ceil(filteredAssets.length / pageSize)

  return (
    <div className="gba:space-y-4" data-testid="asset-table-container">
      {/* Filters */}
      <div className="gba:flex gba:gap-4 gba:flex-wrap">
        {/* Search */}
        <div className="gba:flex-1 gba:min-w-[200px]">
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:w-full"
            data-testid="asset-search-input"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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

      {/* Results summary */}
      <div className="gba:text-sm gba:text-muted-foreground">
        Showing {paginatedAssets.length} of {filteredAssets.length} assets
      </div>

      {/* Table */}
      <div className="gba:border gba:rounded-lg">
        <Table data-testid="assets-table">
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-[120px]">Category</TableHead>
              <TableHead className="gba:w-[130px]">Producer</TableHead>
              <TableHead className="gba:w-[160px]">Model</TableHead>
              <TableHead className="gba:w-[140px]">Serial Number</TableHead>
              <TableHead className="gba:w-[100px]">Status</TableHead>
              <TableHead className="gba:w-[150px]">Location</TableHead>
              <TableHead className="gba:w-[120px]">Warranty</TableHead>
              <TableHead className="gba:w-[100px]">Value</TableHead>
              <TableHead className="gba:w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="gba:text-center gba:py-8">
                  <div data-testid="asset-table-loading">Loading assets...</div>
                </TableCell>
              </TableRow>
            ) : paginatedAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="gba:text-center gba:py-8">
                  <div data-testid="asset-table-empty">No assets found matching your criteria.</div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedAssets.map(asset => {
                // Calculate warranty expiry date from acquisition date + warranty period
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

                    {/* Actions Column - Last */}
                    <TableCell className="gba:py-4 gba:px-6">
                      <div onClick={e => e.stopPropagation()}>
                        <MemoizedAppActionButton
                          assetId={asset.id}
                          accessToken={accessToken}
                          dataTestIdPrefix={DATA_TEST_ID_PREFIX}
                          onRetireAsset={onRetireAsset}
                          onAllocateAsset={onAllocateAsset}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="gba:flex gba:justify-between gba:items-center">
          <div className="gba:text-sm gba:text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              data-testid="asset-table-prev-page"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
