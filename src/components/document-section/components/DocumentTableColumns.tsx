import React from 'react'
import { Button, Badge } from '@newwork/nw-design-system'
import { DotsThreeIcon, CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react'
import { getDocumentIcon } from '@/common/utils/documentIconUtils'
import { DocumentColumn, DocumentItem } from '../types'

interface DocumentTableColumnsProps {
  dataTestId: string
  viewMode: 'tree' | 'list'
  showActionsColumn?: boolean
  toggleFolderExpansion: (folderId: string) => void
  getFolderChildrenCount: (folderId: string) => number
  handleActionsButtonClick: (document: DocumentItem, event: React.MouseEvent) => void
  t: (key: string, args?: Record<string, unknown>) => string
}

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function createDocumentTableColumns({
  dataTestId,
  viewMode,
  showActionsColumn = true,
  toggleFolderExpansion,
  getFolderChildrenCount,
  handleActionsButtonClick,
  t
}: DocumentTableColumnsProps): DocumentColumn[] {
  const columns: DocumentColumn[] = [
    {
      id: 'name',
      header: t('document-column-name'),
      align: 'left',
      sortable: true,
      getSortValue: document => document.name?.toLowerCase() || '',
      render: document => {
        const docWithTreeInfo = document as DocumentItem & {
          level?: number
          hasChildren?: boolean
          isExpanded?: boolean
        }
        const level = docWithTreeInfo.level || 0
        const hasChildren = docWithTreeInfo.hasChildren || false
        const isExpanded = docWithTreeInfo.isExpanded || false

        return (
          <div className="gba:flex gba:items-center gba:gap-2" style={{ paddingLeft: `${level * 20}px` }}>
            {/* Tree expansion control - only show for folders with children */}
            {viewMode === 'tree' && document.folder && hasChildren && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  toggleFolderExpansion(document.id)
                }}
                className="gba:p-0 gba:h-4 gba:w-4 gba:flex gba:items-center gba:justify-center gba:hover:bg-muted gba:rounded"
                data-testid={`${dataTestId}-expand-${document.id}`}
              >
                {isExpanded ? (
                  <CaretDownIcon className="gba:h-3 gba:w-3" />
                ) : (
                  <CaretRightIcon className="gba:h-3 gba:w-3" />
                )}
              </button>
            )}
            {viewMode === 'tree' && (!document.folder || !hasChildren) && (
              // Empty space to maintain alignment for items without expansion controls
              <div className="gba:w-4 gba:h-4" />
            )}

            {/* File/Folder icon with proper type-based styling */}
            {getDocumentIcon({ name: document.name, mimeType: document.mimeType, isFolder: document.folder })}

            {/* Document name */}
            <span
              className="gba:text-sm gba:font-medium gba:truncate"
              data-testid={`${dataTestId}-name-${document.id}`}
              title={document.name || t('document-label-untitled-document')}
            >
              {document.name || t('document-label-untitled-document')}
              {/* Show children count for folders */}
              {document.folder && viewMode === 'tree' && (
                <span className="gba:ml-2 gba:text-xs gba:text-muted-foreground">
                  ({getFolderChildrenCount(document.id)} {t('document-label-items')})
                </span>
              )}
            </span>
          </div>
        )
      }
    },
    {
      id: 'group',
      header: t('document-column-group'),
      width: '150px',
      align: 'left',
      sortable: true,
      getSortValue: document => document.documentGroup?.value?.toLowerCase() || '',
      render: document => (
        <span
          className="gba:text-xs gba:text-muted-foreground gba:truncate"
          data-testid={`${dataTestId}-group-${document.id}`}
          title={document.documentGroup?.value || '-'}
        >
          {document.documentGroup?.value || '-'}
        </span>
      )
    },
    {
      id: 'type',
      header: t('document-column-type'),
      width: '120px',
      align: 'left',
      sortable: true,
      getSortValue: document => {
        if (document.folder) {
          return t('document-label-folder')
        }

        return document.documentType?.value?.toLowerCase() || ''
      },
      render: document => (
        <Badge variant="secondary" className="gba:text-xs" data-testid={`${dataTestId}-type-${document.id}`}>
          {document.folder === true ? t('document-label-folder') : document.documentType?.value || '-'}
        </Badge>
      )
    },
    {
      id: 'size',
      header: t('document-column-size'),
      width: '100px',
      align: 'left',
      sortable: true,
      getSortValue: document => (document.folder ? -1 : document.fileSize || 0),
      render: document => (
        <span className="gba:text-xs gba:text-muted-foreground" data-testid={`${dataTestId}-size-${document.id}`}>
          {!document.folder && document.fileSize ? formatFileSize(document.fileSize) : '-'}
        </span>
      )
    },
    {
      id: 'uploadDate',
      header: t('document-column-upload-date'),
      width: '140px',
      align: 'left',
      sortable: true,
      getSortValue: document => new Date(document.createdAt).getTime(),
      render: document => (
        <span
          className="gba:text-xs gba:text-muted-foreground"
          data-testid={`${dataTestId}-upload-date-${document.id}`}
        >
          {new Date(document.createdAt).toLocaleDateString()}
        </span>
      )
    },
    {
      id: 'actions',
      header: t('document-column-actions'),
      width: '80px',
      align: 'center',
      render: document => (
        <Button
          variant="ghost"
          size="sm"
          onClick={e => handleActionsButtonClick(document, e)}
          data-testid={`${dataTestId}-actions-${document.id}`}
        >
          <DotsThreeIcon className="gba:h-4 gba:w-4" />
        </Button>
      )
    }
  ]

  return showActionsColumn ? columns : columns.filter(column => column.id !== 'actions')
}
