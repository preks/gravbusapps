/**
 * Catalog Entry Table - Refactored into manageable components
 * Features: Infinite scroll, 100-item initial load, comprehensive search including Description and Display Order
 */

import React, { useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  Spinner,
  Progress
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Catalog, CatalogEntry } from '@/common/data/catalog'
import { CatalogTableToolbar } from './components/CatalogTableToolbar'
import { CatalogTableRow } from './components/CatalogTableRow'
import { JsonEditorModal } from './components/JsonEditorModal'
import { useCatalogTableState } from './hooks/useCatalogTableState'
import { useCatalogTableActions } from './hooks/useCatalogTableActions'

interface CatalogEntryTableProps extends BusinessAppContextProps {
  catalog: Catalog
  onViewCatalog?: (catalog: Catalog) => void
  'data-testid'?: string
  prefetched?: {
    initialEntries?: CatalogEntry[]
    initialTotalCount?: number
    externalLoadEntries?: (
      searchTerm?: string,
      limit?: number,
      offset?: number
    ) => Promise<{ entries: CatalogEntry[]; totalCount: number }>
  }
}

export const CatalogEntryTable: React.FC<CatalogEntryTableProps> = ({
  catalog,
  onViewCatalog,
  'data-testid': dataTestId = 'CatalogEntryTable',
  prefetched,
  ...context
}) => {
  const {
    state,
    setState,
    jsonEditorState,
    setJsonEditorState,
    tableRef,
    loadingRef,
    isLoading,
    error,
    totalCount,
    createCatalogEntry,
    updateCatalogEntry,
    deleteCatalogEntry,
    importCatalogEntries,
    exportCatalogs,
    loadEntries,
    handleSearchChange,
    loadMoreEntries,
    hasUnsavedChanges
  } = useCatalogTableState(context, catalog, prefetched)

  const {
    handleCreateEntry,
    handleDeleteEntry,
    handleImportCsv,
    handleExportCsv,
    handleRefresh,
    handleViewObjectValue,
    handleJsonChange,
    handleFieldEdit,
    handleJsonSave,
    handleCloseJsonEditor,
    handleToggleRow,
    handleNavigateToChildCatalog,
    handleSaveAll,
    handleDiscardChanges,
    handleSaveEntry,
    handleDiscardEntry
  } = useCatalogTableActions({
    context,
    catalog,
    state,
    setState,
    jsonEditorState,
    setJsonEditorState,
    createCatalogEntry,
    updateCatalogEntry,
    deleteCatalogEntry,
    importCatalogEntries,
    exportCatalogs,
    loadEntries,
    onViewCatalog
  })

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && state.hasMore && !state.isLoadingMore) {
          loadMoreEntries()
        }
      },
      { threshold: 0.1 }
    )

    if (loadingRef.current) {
      observer.observe(loadingRef.current)
    }

    return () => observer.disconnect()
  }, [state.hasMore, state.isLoadingMore, loadMoreEntries])

  if (error) {
    return <Alert data-testid={`${dataTestId}-Error`}>{error}</Alert>
  }

  return (
    <div data-testid={dataTestId}>
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <span>Catalog Entries - {catalog.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {/* Toolbar */}
          <CatalogTableToolbar
            searchTerm={state.searchTerm}
            onSearchChange={handleSearchChange}
            onCreateEntry={handleCreateEntry}
            onImportCsv={handleImportCsv}
            onExportCsv={handleExportCsv}
            onRefresh={handleRefresh}
            onSaveAll={handleSaveAll}
            onDiscardChanges={handleDiscardChanges}
            onDeleteSelected={async () => {
              if (state.selectedIds.size === 0) return
              if (!window.confirm(`Delete ${state.selectedIds.size} selected entries?`)) return
              const ids = Array.from(state.selectedIds)
              setState(prev => ({ ...prev, bulkDeleteProgress: { current: 0, total: ids.length } }))
              for (let i = 0; i < ids.length; i++) {
                await deleteCatalogEntry(catalog.identifier, 'v1', ids[i])
                setState(prev =>
                  prev.bulkDeleteProgress
                    ? {
                        ...prev,
                        bulkDeleteProgress: {
                          current: prev.bulkDeleteProgress.current + 1,
                          total: prev.bulkDeleteProgress.total
                        }
                      }
                    : prev
                )
              }
              setState(prev => ({ ...prev, selectedIds: new Set(), bulkDeleteProgress: null }))
              loadEntries(state.searchTerm, state.currentLimit)
            }}
            anySelectedCount={state.selectedIds.size}
            hasUnsavedChanges={hasUnsavedChanges}
            isSaving={state.isSaving}
            totalCount={totalCount}
            dataTestId={dataTestId}
          />

          {/* Bulk delete progress */}
          {state.bulkDeleteProgress && (
            <div className="gba:mb-2">
              <div
                className="gba:flex gba:justify-between gba:text-xs"
                style={{ color: 'var(--nw-color-text-secondary)' }}
              >
                <span>Deleting entries...</span>
                <span>
                  {state.bulkDeleteProgress.current} / {state.bulkDeleteProgress.total}
                </span>
              </div>
              <Progress value={(state.bulkDeleteProgress.current / state.bulkDeleteProgress.total) * 100} />
            </div>
          )}

          {/* Table */}
          <div
            ref={tableRef}
            className="gba:border gba:rounded-lg gba:overflow-auto"
            style={{
              maxHeight: '600px',
              backgroundColor: 'var(--nw-color-surface-primary)'
            }}
            data-testid={`${dataTestId}-TableContainer`}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Alternative Code</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Additional Value 1</TableHead>
                  <TableHead>Additional Value 2</TableHead>
                  <TableHead>Additional Value 3</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="gba:text-center">Display Order</TableHead>
                  <TableHead>Object Value</TableHead>
                  <TableHead>Parent Entry</TableHead>
                  <TableHead className="gba:w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.allEntries.map(entry => (
                  <CatalogTableRow
                    key={entry.id}
                    entry={entry}
                    isDraft={state.draftEntryIds.has(entry.id)}
                    isExpanded={state.expandedRows.has(entry.id)}
                    hasEdits={state.editedEntries.has(entry.id)}
                    isSaving={state.isSaving}
                    editedEntries={state.editedEntries}
                    onToggleExpansion={handleToggleRow}
                    onFieldEdit={handleFieldEdit}
                    onViewObjectValue={handleViewObjectValue}
                    onSaveEntry={handleSaveEntry}
                    onDiscardEntry={handleDiscardEntry}
                    onDeleteEntry={handleDeleteEntry}
                    onNavigateToChildCatalog={handleNavigateToChildCatalog}
                    onToggleSelect={(id, checked) =>
                      setState(prev => {
                        const next = new Set(prev.selectedIds)
                        if (checked) next.add(id)
                        else next.delete(id)
                        return { ...prev, selectedIds: next }
                      })
                    }
                    isSelected={state.selectedIds.has(entry.id)}
                    dataTestId={dataTestId}
                    {...context}
                  />
                ))}
              </TableBody>
            </Table>

            {/* Loading indicator for infinite scroll */}
            <div ref={loadingRef} className="gba:p-4 gba:text-center" data-testid={`${dataTestId}-LoadingIndicator`}>
              {isLoading && (
                <div className="gba:flex gba:justify-center gba:items-center gba:gap-2">
                  <Spinner size="sm" />
                  <span className="gba:text-sm" style={{ color: 'var(--nw-color-text-secondary)' }}>
                    Loading entries...
                  </span>
                </div>
              )}
              {state.isLoadingMore && (
                <div className="gba:flex gba:justify-center gba:items-center gba:gap-2">
                  <Spinner size="sm" />
                  <span className="gba:text-sm" style={{ color: 'var(--nw-color-text-secondary)' }}>
                    Loading more entries...
                  </span>
                </div>
              )}
              {!state.hasMore && state.allEntries.length > 0 && (
                <div className="gba:text-sm" style={{ color: 'var(--nw-color-text-secondary)' }}>
                  All {state.allEntries.length} entries loaded
                </div>
              )}
              {state.allEntries.length === 0 && !isLoading && (
                <div className="gba:text-center gba:py-8">
                  <div className="gba:text-sm" style={{ color: 'var(--nw-color-text-secondary)' }}>
                    {state.searchTerm ? 'No entries found matching your search.' : 'No entries in this catalog.'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* JSON Editor Modal */}
      <JsonEditorModal
        isOpen={jsonEditorState.isOpen}
        entry={jsonEditorState.entry}
        jsonText={jsonEditorState.jsonText}
        isValid={jsonEditorState.isValid}
        error={jsonEditorState.error}
        hasChanges={jsonEditorState.hasChanges}
        onJsonChange={handleJsonChange}
        onSave={handleJsonSave}
        onClose={handleCloseJsonEditor}
        dataTestId={dataTestId}
      />
    </div>
  )
}

export default CatalogEntryTable
