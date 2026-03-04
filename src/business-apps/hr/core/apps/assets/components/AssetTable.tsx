import React from 'react'
import { Asset } from '../types'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { PiX, PiXCircle } from 'react-icons/pi'
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
  onGenerateDocument?: (assetId: string) => void
  /** When provided, filter toggle is shown inline with table filters (Category/Location/Status sidebar) */
  showDataFilter?: boolean
  onToggleDataFilter?: () => void
  /** Category/Location/Status filter pills - when provided, pills row is shown below filters */
  filter?: string[]
  setFilter?: (v: string[]) => void
  filterLabelMap?: Record<string, string>
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
  onGenerateDocument,
  showDataFilter: _showDataFilter,
  onToggleDataFilter: _onToggleDataFilter,
  filter = [],
  setFilter,
  filterLabelMap,
  accessToken
}) => {
  const DATA_TEST_ID_PREFIX = 'asset-table'
  void _searchQuery
  void _onSearchChange
  void _showDataFilter
  void _onToggleDataFilter

  return (
    <div className="gba:space-y-4" data-testid="asset-table-container">
      {filter.length > 0 && setFilter && (
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2" data-testid="asset-table-filter-pills">
          {filter.map(val => (
            <div
              key={val}
              className="gba:flex gba:min-h-6 gba:py-1 gba:px-3 gba:items-center gba:gap-3 gba:rounded-full gba:bg-gray-100 gba:max-w-80 gba:break-words gba:flex-shrink-0"
              data-testid={`asset-table-filter-pill-${val}`}
            >
              <span className="gba:text-sm gba:leading-tight gba:whitespace-normal">
                {filterLabelMap?.[val] ?? val}
              </span>
              <button
                type="button"
                className="gba:ml-0.5 gba:bg-transparent gba:border-none gba:text-gray-800 gba:w-3 gba:h-3 gba:flex gba:items-center gba:justify-center gba:p-0 gba:cursor-pointer gba:rounded-full gba:hover:bg-gray-200 gba:transition-colors gba:flex-shrink-0"
                onClick={() => setFilter(filter.filter(f => f !== val))}
                aria-label={`Remove filter ${filterLabelMap?.[val] ?? val}`}
                data-testid={`asset-table-filter-pill-remove-${val}`}
              >
                <PiX size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:text-gray-600 gba:hover:text-gray-800 gba:transition-colors"
            onClick={() => setFilter([])}
            data-testid="asset-table-clear-all-filters"
          >
            <span>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_expenses.clear_all_filters_btn',
                'Clear all filters'
              )}
            </span>
            <span className="gba:flex gba:items-center gba:justify-center">
              <PiXCircle size={16} />
            </span>
          </button>
        </div>
      )}

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
