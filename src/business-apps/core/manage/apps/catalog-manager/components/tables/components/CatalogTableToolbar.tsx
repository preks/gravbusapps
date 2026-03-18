import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Plus, Download, Upload, RefreshCw, Save } from 'lucide-react'
import { DebouncedInput } from '@/components/debounced-input'

interface CatalogTableToolbarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onCreateEntry: () => void
  onImportCsv: () => void
  onExportCsv: () => void
  onRefresh: () => void
  onSaveAll: () => void
  onDiscardChanges: () => void
  onDeleteSelected?: () => void
  anySelectedCount?: number
  hasUnsavedChanges: boolean
  isSaving: boolean
  totalCount: number
  dataTestId: string
}

export const CatalogTableToolbar: React.FC<CatalogTableToolbarProps> = ({
  searchTerm,
  onSearchChange,
  onCreateEntry,
  onImportCsv,
  onExportCsv,
  onRefresh,
  onSaveAll,
  onDiscardChanges,
  onDeleteSelected,
  anySelectedCount = 0,
  hasUnsavedChanges,
  isSaving,
  totalCount,
  dataTestId
}) => {
  return (
    <div className="gba:space-y-4">
      {/* Search and Actions Row */}
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
        <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1">
          <DebouncedInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search entries by value, description, display order..."
            className="gba:flex-1 gba:max-w-md"
            data-testid={`${dataTestId}-SearchInput`}
          />
          <div className="gba:text-sm" style={{ color: 'var(--nw-color-text-secondary)' }}>
            {totalCount} entries
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          {hasUnsavedChanges && (
            <>
              <Button onClick={onSaveAll} disabled={isSaving} data-testid={`${dataTestId}-SaveAllButton`}>
                <Save className="gba:h-4 gba:w-4 gba:mr-2" />
                {isSaving ? 'Saving...' : 'Save All'}
              </Button>
              <Button
                variant="outline"
                onClick={onDiscardChanges}
                disabled={isSaving}
                data-testid={`${dataTestId}-DiscardButton`}
              >
                Discard
              </Button>
            </>
          )}
          {anySelectedCount > 0 && (
            <Button variant="destructive" onClick={onDeleteSelected} data-testid={`${dataTestId}-DeleteSelectedButton`}>
              Delete Selected ({anySelectedCount})
            </Button>
          )}
          <Button variant="outline" onClick={onRefresh} data-testid={`${dataTestId}-RefreshButton`}>
            <RefreshCw className="gba:h-4 gba:w-4 gba:mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={onImportCsv} disabled={true} data-testid={`${dataTestId}-ImportButton`}>
            <Upload className="gba:h-4 gba:w-4 gba:mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={onExportCsv} disabled={true} data-testid={`${dataTestId}-ExportButton`}>
            <Download className="gba:h-4 gba:w-4 gba:mr-2" />
            Export CSV
          </Button>
          <Button onClick={onCreateEntry} data-testid={`${dataTestId}-AddButton`}>
            <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
            Add Entry
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CatalogTableToolbar
