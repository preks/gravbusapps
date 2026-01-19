import React from 'react'
import { TableRow, TableCell, Badge } from '@newwork/nw-design-system'
import { Asset } from '../types'
import { AssetTableActionButton } from './AssetTableActionButton'
import { getStatusBadgeVariant, formatStatus, formatCurrency } from './AssetTableUtils'
import { getTranslationFromI18nKeyAndLabel, formatDate, getCatalogValue } from '@/common/utils/windowUtils'

interface AssetTableRowProps {
  asset: Asset
  accessToken: string
  dataTestIdPrefix: string
  onAssetClick?: (asset: Asset) => void
  onAllocateAsset?: (assetId: string) => void
  onUpdateAsset?: (assetId: string) => void
  onRetireAsset?: (assetId: string) => void
  onRetrieveAsset?: (assetId: string) => void
}

export const AssetTableRow: React.FC<AssetTableRowProps> = ({
  asset,
  accessToken,
  dataTestIdPrefix,
  onAssetClick,
  onAllocateAsset,
  onUpdateAsset,
  onRetireAsset,
  onRetrieveAsset
}) => {
  const acquisitionDate = new Date(asset.acquisitionDate)
  const warrantyExpiryDate = new Date(acquisitionDate)
  warrantyExpiryDate.setMonth(warrantyExpiryDate.getMonth() + asset.warrantyPeriodMonths)

  const isWarrantyExpired = warrantyExpiryDate < new Date()
  const warrantyDaysRemaining = Math.ceil((warrantyExpiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  return (
    <TableRow
      key={asset.id}
      className={onAssetClick ? 'gba:cursor-pointer' : ''}
      onClick={() => onAssetClick?.(asset)}
      data-testid={`asset-table-row-${asset.id}`}
    >
      <TableCell className="gba:py-4 gba:px-6">
        <div className="gba:flex gba:justify-start gba:gap-2" onClick={e => e.stopPropagation()}>
          <AssetTableActionButton
            key={`action-button-${asset.id}-${asset.assetStatus}`}
            assetId={asset.id}
            assetStatus={asset.assetStatus}
            accessToken={accessToken}
            dataTestIdPrefix={dataTestIdPrefix}
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
        <Badge variant={getStatusBadgeVariant(asset.assetStatus)}>{formatStatus(asset.assetStatus)}</Badge>
      </TableCell>
      <TableCell data-testid={`asset-location-${asset.id}`}>
        {asset.siteLocation?.name || getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.not_available', 'N/A')}
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
}
