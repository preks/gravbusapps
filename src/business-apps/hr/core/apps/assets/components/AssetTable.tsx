import React from 'react'
import { Asset } from '../types'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { SortableTableHead } from './SortableTableHead'
import { AssetTableRow } from './AssetTableRow'
import { AssetTablePagination } from './AssetTablePagination'

interface AssetTableProps extends BusinessAppContextProps {
  assets: Asset[]
  totalCount?: number
  isLoading?: boolean
  currentPage?: number
  pageSize?: number
  searchQuery?: string
  sortField?: string
  sortOrder?: 'ASC' | 'DESC'
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onSearchChange?: (search: string) => void
  onSortChange?: (field: string, order: 'ASC' | 'DESC' | '') => void
  onAssetClick?: (asset: Asset) => void
  onAllocateAsset?: (assetId: string) => void
  onUpdateAsset?: (assetId: string) => void
  onRetireAsset?: (assetId: string) => void
  onRetrieveAsset?: (assetId: string) => void
  onDeleteAsset?: (assetId: string) => void
  onGenerateDocument?: (assetId: string) => void
  emptyMessage?: string
}

export const AssetTable: React.FC<AssetTableProps> = ({
  assets,
  totalCount = 0,
  isLoading = false,
  currentPage = 1,
  pageSize = 10,
  searchQuery: _searchQuery = '',
  sortField: sortFieldProp,
  sortOrder: sortOrderProp,
  onPageChange,
  onPageSizeChange,
  onSearchChange: _onSearchChange,
  onSortChange,
  onAssetClick,
  onAllocateAsset,
  onUpdateAsset,
  onRetireAsset,
  onRetrieveAsset,
  onDeleteAsset,
  onGenerateDocument,
  emptyMessage,
  accessToken
}) => {
  const DATA_TEST_ID_PREFIX = 'asset-table'
  void _searchQuery
  void _onSearchChange

  return (
    <div className="gba:space-y-4" data-testid="asset-table-container">
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
                    {emptyMessage ||
                      getTranslationFromI18nKeyAndLabel(
                        'lowcoder:hr_assets.no_assets_found',
                        'No assets found matching your criteria.'
                      )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              assets.map(asset => (
                <AssetTableRow
                  key={asset.id}
                  asset={asset}
                  accessToken={accessToken}
                  dataTestIdPrefix={DATA_TEST_ID_PREFIX}
                  onAssetClick={onAssetClick}
                  onAllocateAsset={onAllocateAsset}
                  onUpdateAsset={onUpdateAsset}
                  onRetireAsset={onRetireAsset}
                  onRetrieveAsset={onRetrieveAsset}
                  onDeleteAsset={onDeleteAsset}
                  onGenerateDocument={onGenerateDocument}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AssetTablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  )
}
