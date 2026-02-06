import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Upload, Folder, Search, Expand, Minimize, ListTree, List } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { DocumentItem } from '../types'

interface DocumentSectionToolbarProps {
  readonly dataTestId: string
  readonly viewMode: 'tree' | 'list'
  readonly setViewMode: (mode: 'tree' | 'list') => void
  readonly selectedItems: string[]
  readonly setSelectedItems: (items: string[]) => void
  readonly filteredDocuments: DocumentItem[]
  readonly searchTerm: string
  readonly handleSearchChange: (term: string) => void
  readonly createFolderActionProps?: {
    contextsArray: any[]
    externalContextData: Record<string, any>
    prefixDataTestId: string
  }
  readonly uploadActionProps?: {
    contextsArray: any[]
    externalContextData: Record<string, any>
    prefixDataTestId: string
  }
  readonly toolbarActions?: Array<{
    key: string
    label: string
    icon?: React.ReactNode
    onClick: () => void
    variant?: 'default' | 'outline' | 'ghost'
    testId?: string
  }>
  readonly handleCreateFolder: () => void
  readonly handleUpload: () => void
  readonly handleExpandAll: () => void
  readonly handleCollapseAll: () => void
}

export function DocumentSectionToolbar({
  dataTestId,
  viewMode,
  setViewMode,
  selectedItems,
  setSelectedItems,
  filteredDocuments,
  searchTerm,
  handleSearchChange,
  createFolderActionProps,
  uploadActionProps,
  toolbarActions = [],
  handleCreateFolder,
  handleUpload,
  handleExpandAll,
  handleCollapseAll
}: DocumentSectionToolbarProps) {
  // Cache the selected folder to avoid redundant array traversals
  const selectedFolder =
    viewMode === 'tree' && selectedItems.length === 1
      ? filteredDocuments.find(doc => doc.id === selectedItems[0] && doc.folder)
      : null

  // Build tooltip titles with translations
  const createFolderTranslation: string =
    getTranslationFromI18nKeyAndLabel('document.tooltip.createFolderIn', 'Create folder in "{ $folderName }"') || ''
  const createFolderTitle = selectedFolder
    ? createFolderTranslation.replace('{ $folderName }', selectedFolder.name || '')
    : getTranslationFromI18nKeyAndLabel('document.tooltip.createFolderRoot', 'Create folder at root level') || ''

  const uploadTranslation: string =
    getTranslationFromI18nKeyAndLabel('document.tooltip.uploadTo', 'Upload to "{ $folderName }"') || ''
  const uploadTitle = selectedFolder
    ? uploadTranslation.replace('{ $folderName }', selectedFolder.name || '')
    : getTranslationFromI18nKeyAndLabel('document.tooltip.uploadRoot', 'Upload to root level') || ''

  return (
    <>
      {/* Header with title and actions */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <h3 className="gba:text-lg gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('document.section.title', 'Document Management')}
        </h3>

        <div className="gba:flex gba:items-center gba:gap-2">
          {createFolderActionProps && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateFolder}
              data-testid={`${dataTestId}-create-folder-button`}
              title={createFolderTitle}
            >
              <Folder className="gba:h-4 gba:w-4 gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('document.folder.new', 'New Document Folder')}
            </Button>
          )}
          {uploadActionProps && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpload}
              data-testid={`${dataTestId}-upload-button`}
              title={uploadTitle}
            >
              <Upload className="gba:h-4 gba:w-4 gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('document.upload.files', 'Upload Documents')}
            </Button>
          )}
          {toolbarActions.map(action => (
            <Button
              key={action.key}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={action.onClick}
              data-testid={action.testId || `${dataTestId}-${action.key}-button`}
            >
              {action.icon && <span className="gba:mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Search and View Toggle Row */}
      <div className="gba:flex gba:items-center gba:justify-between">
        {/* Search Input */}
        <div className="gba:max-w-sm">
          <DebouncedInput
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={getTranslationFromI18nKeyAndLabel('document.search.placeholder', 'Search documents...')}
            icon={<Search className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
            data-testid={`${dataTestId}-search-input`}
            debounceDelay={300}
          />
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          {/* Expand/Collapse buttons - only show in tree view */}
          {viewMode === 'tree' && (
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExpandAll}
                data-testid={`${dataTestId}-expand-all-button`}
                title={getTranslationFromI18nKeyAndLabel('document.tree.expand.all', 'Expand All')}
              >
                <Expand className="gba:h-4 gba:w-4 gba:mr-1" />
                {getTranslationFromI18nKeyAndLabel('document.tree.expand.all', 'Expand All')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCollapseAll}
                data-testid={`${dataTestId}-collapse-all-button`}
                title={getTranslationFromI18nKeyAndLabel('document.tree.collapse.all', 'Collapse All')}
              >
                <Minimize className="gba:h-4 gba:w-4 gba:mr-1" />
                {getTranslationFromI18nKeyAndLabel('document.tree.collapse.all', 'Collapse All')}
              </Button>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="gba:flex gba:items-center gba:border gba:rounded-md">
            <Button
              variant={viewMode === 'tree' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setViewMode('tree')
                // Clear selection when switching to tree view
                setSelectedItems([])
              }}
              className="gba:rounded-r-none gba:border-r"
              data-testid={`${dataTestId}-tree-view-button`}
            >
              <ListTree className="gba:h-4 gba:w-4 gba:mr-1" />
              {getTranslationFromI18nKeyAndLabel('document.view.tree', 'Tree View')}
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setViewMode('list')
                // Clear selection when switching to list view
                setSelectedItems([])
              }}
              className="gba:rounded-l-none"
              data-testid={`${dataTestId}-list-view-button`}
            >
              <List className="gba:h-4 gba:w-4 gba:mr-1" />
              {getTranslationFromI18nKeyAndLabel('document.view.list', 'List View')}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
