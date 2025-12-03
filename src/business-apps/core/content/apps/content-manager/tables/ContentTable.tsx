import React from 'react'
import { DataTable } from '@newwork/nw-design-system'
import { useContentData } from '../hooks/useContentData'
import { createContentColumns, getDefaultVisibleColumns } from '../config/contentColumns'
import type { ContentEntry } from '@/common/data/content/types/contentTypes'

export interface ContentTableProps {
  type: 'all' | 'news' | 'knowledge' | 'document' | 'question'
  accessToken: string
  onRowClick?: (entry: ContentEntry) => void
}

export const ContentTable: React.FC<ContentTableProps> = ({ type, accessToken, onRowClick }) => {
  // Use the data hook
  const contentData = useContentData({ type, accessToken })

  // Create columns with access token
  const columns = createContentColumns({
    accessToken
  })

  // Filter columns based on visible columns and type-specific defaults
  const defaultColumns = getDefaultVisibleColumns(type)
  const visibleColumns = contentData.visibleColumns.length > 0 ? contentData.visibleColumns : defaultColumns

  const filteredColumns = columns.filter(col => col.id && visibleColumns.includes(col.id))

  return (
    <DataTable<ContentEntry>
      // Data
      data={contentData.data}
      columns={filteredColumns}
      loading={contentData.loading}
      error={contentData.error?.message}
      totalCount={contentData.total}
      // Controlled State
      sorting={contentData.sorting}
      onSortingChange={contentData.setSorting}
      pagination={contentData.pagination}
      onPaginationChange={contentData.setPagination}
      selectedRows={contentData.selectedRows}
      onSelectionChange={contentData.setSelectedRows}
      // Features
      enablePagination
      enableSorting
      enableSelection={false}
      enableColumnPinning
      enableResizing={false}
      // UI
      rowsPerPageOptions={[10, 20, 50, 100]}
      showPageNumbers
      maxVisiblePages={7}
      emptyMessage="No content entries found"
      // Row Click
      onRowClick={onRowClick}
      data-testid={`content-table-${type}`}
    />
  )
}
export default ContentTable
