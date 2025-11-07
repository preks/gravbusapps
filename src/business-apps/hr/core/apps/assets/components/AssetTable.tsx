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
  assetStatus: AssetStatus
  accessToken: string
  dataTestIdPrefix: string
  onAllocateAsset?: (assetId: string) => void
  onUpdateAsset?: (assetId: string) => void
}>(({ assetId, assetStatus, accessToken, dataTestIdPrefix, onAllocateAsset, onUpdateAsset }) => {
  // Check if asset is already allocated - hide allocate action if true
  const isAllocated = assetStatus === AssetStatus.ALLOCATED || (assetStatus as string) === 'ALLOCATED_ASSET'

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

  const isAllocateAction = useCallback((action: ActionOption): boolean => {
    const actionLabel = typeof action.label === 'string' ? action.label.toLowerCase() : ''
    const actionKey = typeof action.key === 'string' ? action.key.toLowerCase() : ''
    const processName = (action as any)?.processName?.toLowerCase() || ''
    const actionId = typeof (action as any)?.id === 'string' ? (action as any).id.toLowerCase() : ''

    const allocatePatterns = ['allocate', 'allocateasset', 'allocate-asset', 'allocate_asset', 'allocate asset']
    const hasAllocatePattern = (text: string) => allocatePatterns.some(pattern => text.includes(pattern))

    return (
      hasAllocatePattern(actionLabel) ||
      hasAllocatePattern(actionKey) ||
      hasAllocatePattern(processName) ||
      hasAllocatePattern(actionId) ||
      (actionLabel.includes('allocate') && actionLabel.includes('asset')) ||
      (actionKey.includes('allocate') && actionKey.includes('asset'))
    )
  }, [])

  const isUpdateAction = useCallback((action: ActionOption): boolean => {
    const actionLabel = typeof action.label === 'string' ? action.label.toLowerCase() : ''
    const actionKey = typeof action.key === 'string' ? action.key.toLowerCase() : ''
    const processName = (action as any)?.processName?.toLowerCase() || ''

    return (
      (actionLabel.includes('update') && actionLabel.includes('asset')) ||
      (actionLabel.includes('edit') && actionLabel.includes('asset')) ||
      (actionKey.includes('update') && actionKey.includes('asset')) ||
      (actionKey.includes('edit') && actionKey.includes('asset')) ||
      processName === 'updateasset' ||
      processName.includes('update-asset') ||
      processName.includes('editasset') ||
      processName.includes('edit-asset')
    )
  }, [])

  const filteredAndTransformedActions = useMemo(() => {
    if (rawCombinedData.length === 0) {
      return undefined
    }

    const deduplicatedRawData: ActionOption[] = []
    const rawSeenKeys = new Set<string>()
    const rawSeenSignatures = new Set<string>()

    for (const action of rawCombinedData) {
      const actionKey = action.key
      const actionLabel = typeof action.label === 'string' ? action.label.toLowerCase().trim() : ''
      const actionProcessName = (action as any)?.processName?.toLowerCase().trim() || ''
      const actionId = typeof (action as any)?.id === 'string' ? (action as any).id.toLowerCase().trim() : ''
      const signature = JSON.stringify({
        label: actionLabel,
        key: actionKey?.toLowerCase().trim() || '',
        processName: actionProcessName,
        id: actionId
      }).toLowerCase()

      // Skip duplicates
      if (actionKey && rawSeenKeys.has(actionKey)) {
        continue
      }
      if (rawSeenSignatures.has(signature)) {
        continue
      }

      deduplicatedRawData.push(action)
      if (actionKey) {
        rawSeenKeys.add(actionKey)
      }
      rawSeenSignatures.add(signature)
    }

    const allocateAction = onAllocateAsset ? deduplicatedRawData.find(isAllocateAction) : null
    const updateAction = onUpdateAsset ? deduplicatedRawData.find(isUpdateAction) : null

    const transformedActions: ActionOption[] = []

    const createTransformedAction = (action: ActionOption, handler: (assetId: string) => void) => {
      const actionWithoutProcess = { ...action } as any
      delete actionWithoutProcess.processName
      delete actionWithoutProcess.domain
      delete actionWithoutProcess.onClick
      return {
        ...actionWithoutProcess,
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          e?.preventDefault()
          handler(assetId)
        }
      } as ActionOption
    }

    if (updateAction && onUpdateAsset) {
      transformedActions.push(createTransformedAction(updateAction, onUpdateAsset))
    }

    if (allocateAction && onAllocateAsset && !isAllocated) {
      transformedActions.push(createTransformedAction(allocateAction, onAllocateAsset))
    }

    const seenKeys = new Set<string>()
    const seenIdentifiers = new Set<string>()

    transformedActions.forEach(action => {
      if (action.key) {
        seenKeys.add(action.key)
      }
      const label = typeof action.label === 'string' ? action.label.toLowerCase().trim() : ''
      const processName = (action as any)?.processName?.toLowerCase().trim() || ''
      if (label || processName) {
        seenIdentifiers.add(`${label}|${processName}`)
      }
    })

    const otherActions = deduplicatedRawData.filter(action => {
      if (isAllocated) {
        const actionLabel = typeof action.label === 'string' ? action.label.toLowerCase() : ''
        const actionKey = typeof action.key === 'string' ? action.key.toLowerCase() : ''
        const processName = (action as any)?.processName?.toLowerCase() || ''
        const actionId = typeof (action as any)?.id === 'string' ? (action as any).id.toLowerCase() : ''
        const allText = `${actionLabel} ${actionKey} ${processName} ${actionId}`.toLowerCase()
        if (allText.includes('allocate')) {
          return false
        }
      }

      if (action.key && seenKeys.has(action.key)) {
        return false
      }

      const actionLabel = typeof action.label === 'string' ? action.label.toLowerCase().trim() : ''
      const actionProcessName = (action as any)?.processName?.toLowerCase().trim() || ''
      const identifier = `${actionLabel}|${actionProcessName}`
      if ((actionLabel || actionProcessName) && seenIdentifiers.has(identifier)) {
        return false
      }

      if (onAllocateAsset && isAllocateAction(action)) {
        return false
      }
      if (onUpdateAsset && isUpdateAction(action)) {
        return false
      }

      if (action.key) {
        seenKeys.add(action.key)
      }
      if (actionLabel || actionProcessName) {
        seenIdentifiers.add(identifier)
      }
      return true
    })

    const allActions = [...transformedActions, ...otherActions]
    const finalActions: ActionOption[] = []
    const finalSeenKeys = new Set<string>()
    const finalSeenIdentifiers = new Set<string>()
    const seenActionSignatures = new Set<string>()

    for (const action of allActions) {
      if (isAllocated) {
        const actionLabel = typeof action.label === 'string' ? action.label.toLowerCase() : ''
        const actionKey = typeof action.key === 'string' ? action.key.toLowerCase() : ''
        const processName = (action as any)?.processName?.toLowerCase() || ''
        const actionId = typeof (action as any)?.id === 'string' ? (action as any).id.toLowerCase() : ''
        const allText = `${actionLabel} ${actionKey} ${processName} ${actionId}`.toLowerCase()
        if (allText.includes('allocate')) {
          continue
        }
      }

      const actionKey = action.key
      const actionLabel = typeof action.label === 'string' ? action.label.toLowerCase().trim() : ''
      const actionProcessName = (action as any)?.processName?.toLowerCase().trim() || ''
      const actionId = typeof (action as any)?.id === 'string' ? (action as any).id.toLowerCase().trim() : ''
      const identifier = `${actionLabel}|${actionProcessName}`

      const signature = JSON.stringify({
        label: actionLabel,
        key: actionKey?.toLowerCase().trim() || '',
        processName: actionProcessName,
        id: actionId
      }).toLowerCase()

      if (actionKey && finalSeenKeys.has(actionKey)) {
        continue
      }
      if ((actionLabel || actionProcessName) && finalSeenIdentifiers.has(identifier)) {
        continue
      }
      if (seenActionSignatures.has(signature)) {
        continue
      }

      finalActions.push(action)
      if (actionKey) {
        finalSeenKeys.add(actionKey)
      }
      if (actionLabel || actionProcessName) {
        finalSeenIdentifiers.add(identifier)
      }
      seenActionSignatures.add(signature)
    }

    return finalActions
  }, [
    rawCombinedData,
    assetId,
    assetStatus,
    isAllocated,
    onAllocateAsset,
    onUpdateAsset,
    isAllocateAction,
    isUpdateAction
  ])

  const handleDropdownOpen = useCallback(() => {
    handleDeferredFetch()
  }, [handleDeferredFetch])

  const shouldUseStaticDataOnly =
    filteredAndTransformedActions !== undefined && filteredAndTransformedActions.length > 0

  return (
    <AppActionButton
      data-testid={`${dataTestIdPrefix}-actions-${assetId}`}
      size="icon"
      contextsArray={shouldUseStaticDataOnly ? [] : [FlowContextName.assetEntity]}
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
  onAllocateAsset?: (assetId: string) => void
  onUpdateAsset?: (assetId: string) => void
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

export const AssetTable: React.FC<AssetTableProps> = ({
  assets,
  isLoading = false,
  onAssetClick,
  onAllocateAsset,
  onUpdateAsset,
  accessToken
}) => {
  const DATA_TEST_ID_PREFIX = 'asset-table'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if (asset.assetStatus === AssetStatus.RETIRED) {
        return false
      }

      if (statusFilter !== 'all' && asset.assetStatus !== statusFilter) {
        return false
      }

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

  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredAssets.slice(startIndex, startIndex + pageSize)
  }, [filteredAssets, currentPage, pageSize])

  const totalPages = Math.ceil(filteredAssets.length / pageSize)

  return (
    <div className="gba:space-y-4" data-testid="asset-table-container">
      <div className="gba:flex gba:gap-4 gba:flex-wrap">
        <div className="gba:flex-1 gba:min-w-[200px]">
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:w-full"
            data-testid="asset-search-input"
          />
        </div>

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

      <div className="gba:text-sm gba:text-muted-foreground">
        Showing {paginatedAssets.length} of {filteredAssets.length} assets
      </div>

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

                    <TableCell className="gba:py-4 gba:px-6">
                      <div onClick={e => e.stopPropagation()}>
                        <MemoizedAppActionButton
                          assetId={asset.id}
                          assetStatus={asset.assetStatus}
                          accessToken={accessToken}
                          dataTestIdPrefix={DATA_TEST_ID_PREFIX}
                          onAllocateAsset={onAllocateAsset}
                          onUpdateAsset={onUpdateAsset}
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
