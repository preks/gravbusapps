import React from 'react'
import { AiButton, Button, useTranslation } from '@newwork/nw-design-system'
import {
  UploadSimpleIcon,
  FolderNotchIcon,
  MagnifyingGlassIcon,
  ArrowsOutIcon,
  ArrowsInIcon,
  TreeStructureIcon,
  ListBulletsIcon,
  SparkleIcon
} from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { DocumentItem } from '../types'
import translations from '../_i18n'

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
  readonly showAiOrganize?: boolean
  readonly onAiOrganize?: () => void
  readonly showViewModeToggle?: boolean
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
  handleCollapseAll,
  showAiOrganize = false,
  onAiOrganize,
  showViewModeToggle = true
}: DocumentSectionToolbarProps) {
  const { t } = useTranslation(translations)
  // Cache the selected folder to avoid redundant array traversals
  const selectedFolder =
    viewMode === 'tree' && selectedItems.length === 1
      ? filteredDocuments.find(doc => doc.id === selectedItems[0] && doc.folder)
      : null

  // Build tooltip titles with translations
  const createFolderTitle = selectedFolder
    ? t('document-tooltip-create-folder-in', { folderName: selectedFolder.name || '' })
    : t('document-tooltip-create-folder-root')

  const uploadTitle = selectedFolder
    ? t('document-tooltip-upload-to', { folderName: selectedFolder.name || '' })
    : t('document-tooltip-upload-root')

  return (
    <>
      {/* Header with title and actions */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <h3 className="gba:text-lg gba:font-semibold">{t('document-section-title')}</h3>

        <div className="gba:flex gba:items-center gba:gap-2">
          {createFolderActionProps && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateFolder}
              data-testid={`${dataTestId}-create-folder-button`}
              title={createFolderTitle}
            >
              <FolderNotchIcon className="gba:h-4 gba:w-4 gba:mr-2" />
              {t('document-folder-new')}
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
              <UploadSimpleIcon className="gba:h-4 gba:w-4 gba:mr-2" />
              {t('document-upload-files')}
            </Button>
          )}
          {showAiOrganize && onAiOrganize && (
            <AiButton
              variant="default"
              size="sm"
              showIcon={true}
              icon={<SparkleIcon size={16} />}
              autoExecuteSingleAction={false}
              emptyStateBehavior="enable"
              onClick={onAiOrganize}
              data-testid={`${dataTestId}-ai-organize-button`}
            >
              {t('document-ai-organize-button')}
            </AiButton>
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
        <div className="gba:w-full gba:max-w-md">
          <DebouncedInput
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={t('document-search-placeholder')}
            icon={<MagnifyingGlassIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
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
                title={t('document-tree-expand-all')}
              >
                <ArrowsOutIcon className="gba:h-4 gba:w-4 gba:mr-1" />
                {t('document-tree-expand-all')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCollapseAll}
                data-testid={`${dataTestId}-collapse-all-button`}
                title={t('document-tree-collapse-all')}
              >
                <ArrowsInIcon className="gba:h-4 gba:w-4 gba:mr-1" />
                {t('document-tree-collapse-all')}
              </Button>
            </div>
          )}

          {showViewModeToggle && (
            <div className="gba:flex gba:items-center gba:border gba:rounded-md">
              <Button
                variant={viewMode === 'tree' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setViewMode('tree')
                  setSelectedItems([])
                }}
                className="gba:rounded-r-none gba:border-r"
                data-testid={`${dataTestId}-tree-view-button`}
              >
                <TreeStructureIcon className="gba:h-4 gba:w-4 gba:mr-1" />
                {t('document-view-tree')}
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setViewMode('list')
                  setSelectedItems([])
                }}
                className="gba:rounded-l-none"
                data-testid={`${dataTestId}-list-view-button`}
              >
                <ListBulletsIcon className="gba:h-4 gba:w-4 gba:mr-1" />
                {t('document-view-list')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
