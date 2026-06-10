import React from 'react'
import { Button, Spinner, Checkbox, useTranslation } from '@newwork/nw-design-system'
import { TreeStructureIcon, FileIcon } from '@phosphor-icons/react'
import type { FolderNode } from '@/common/components/common-relations/setting-pages/folder-templates/types'
import type { DocumentItem } from '../types'
import translations from '../_i18n'

interface TemplatePreviewSectionProps {
  isLoading: boolean
  folders: FolderNode[]
  dataTestId: string
}

export function TemplatePreviewSection({ isLoading, folders, dataTestId }: TemplatePreviewSectionProps) {
  const { t } = useTranslation(translations)

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:py-8">
        <Spinner size="sm" />
      </div>
    )
  }

  if (folders.length === 0) {
    return (
      <div
        className="gba:text-center gba:py-6 gba:text-muted-foreground gba:text-sm"
        data-testid={`${dataTestId}-no-template`}
      >
        {t('document-ai-organize-no-template')}
      </div>
    )
  }

  return (
    <div className="gba:border gba:rounded-lg gba:p-3 gba:bg-muted/30" data-testid={`${dataTestId}-template-preview`}>
      <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">{t('document-ai-organize-template-hint')}</p>
      <TemplateFolderTree folders={folders} />
    </div>
  )
}

function TemplateFolderTree({ folders, parentPath = '' }: { folders: FolderNode[]; parentPath?: string }) {
  return (
    <ul className="gba:list-none gba:p-0 gba:m-0">
      {folders.map(folder => {
        const path = parentPath ? `${parentPath}/${folder.name}` : folder.name

        return (
          <li key={`tmpl-${path}`} className="gba:min-w-0">
            <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2 gba:py-1 gba:text-sm">
              <TreeStructureIcon className="gba:h-3.5 gba:w-3.5 gba:text-warning gba:shrink-0" />
              <span className="gba:min-w-0 gba:flex-1 gba:truncate">{folder.name}</span>
            </div>
            {folder.folders.length > 0 && (
              <div className="gba:pl-4">
                <TemplateFolderTree folders={folder.folders} parentPath={path} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

interface DocumentSelectionListProps {
  fileDocuments: DocumentItem[]
  selectedDocIds: string[]
  allSelected: boolean
  toggleDocument: (id: string) => void
  toggleAll: () => void
  dataTestId: string
}

export function DocumentSelectionList({
  fileDocuments,
  selectedDocIds,
  allSelected,
  toggleDocument,
  toggleAll,
  dataTestId
}: DocumentSelectionListProps) {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:mt-4 gba:space-y-2" data-testid={`${dataTestId}-doc-selection`}>
      <div className="gba:flex gba:items-center gba:justify-between">
        <p className="gba:text-sm gba:font-medium">
          {t('document-ai-organize-select-documents')}
          <span className="gba:text-muted-foreground gba:ml-1">
            ({selectedDocIds.length}/{fileDocuments.length})
          </span>
        </p>
        <Button variant="ghost" size="sm" onClick={toggleAll} data-testid={`${dataTestId}-toggle-all`}>
          {allSelected ? t('document-ai-organize-deselect-all') : t('document-ai-organize-select-all')}
        </Button>
      </div>

      <div className="gba:border gba:rounded-lg gba:divide-y gba:max-h-40 gba:overflow-y-auto">
        {fileDocuments.map(doc => (
          <label
            key={doc.id}
            className="gba:flex gba:min-w-0 gba:items-center gba:gap-3 gba:px-3 gba:py-2 hover:gba:bg-muted/50 gba:cursor-pointer"
            data-testid={`${dataTestId}-doc-${doc.id}`}
          >
            <Checkbox checked={selectedDocIds.includes(doc.id)} onCheckedChange={() => toggleDocument(doc.id)} />
            <FileIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
            <span className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-sm">
              {doc.name || t('document-label-untitled-document')}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
