import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useTranslation
} from '@newwork/nw-design-system'
import { CaretDownIcon, CaretUpDownIcon, CaretUpIcon, FolderNotchIcon, FileIcon } from '@phosphor-icons/react'
import { DocumentColumn, DocumentItem, DocumentSortDirection } from '../types'
import translations from '../_i18n'

interface DocumentSectionTableProps {
  readonly dataTestId: string
  readonly viewMode: 'tree' | 'list'
  readonly displayDocuments: Array<DocumentItem & { level: number; hasChildren: boolean; isExpanded: boolean }>
  readonly columns: DocumentColumn[]
  readonly enableColumnSorting?: boolean
  readonly sortColumnId: string | null
  readonly sortDirection: DocumentSortDirection
  readonly onSortChange: (columnId: string) => void
  readonly draggedDocument: DocumentItem | null
  readonly dropTarget: string | null
  readonly isDroppingOnRoot: boolean
  readonly isOverDropZone: boolean
  readonly selectedItems: string[]
  // Event handlers
  readonly handleRowClick: (documentId: string, event: React.MouseEvent) => void
  readonly handleMouseDown: (e: React.MouseEvent) => void
  readonly handleMouseMove: (e: React.MouseEvent) => void
  readonly handleMouseUp: () => void
  readonly handleDragStart: (e: React.DragEvent, document: DocumentItem) => void
  readonly handleDragOver: (e: React.DragEvent, targetDocument: DocumentItem) => void
  readonly handleDragLeave: (e: React.DragEvent) => void
  readonly handleDrop: (e: React.DragEvent, targetFolder: DocumentItem) => void
  readonly handleDragEnd: () => void
  readonly handleDropZoneOver: (e: React.DragEvent) => void
  readonly handleDropZoneLeave: (e: React.DragEvent) => void
  readonly handleDropZoneDrop: (e: React.DragEvent) => void
  readonly handleRootDragOver: (e: React.DragEvent) => void
  readonly handleRootDragLeave: (e: React.DragEvent) => void
  readonly handleRootDrop: (e: React.DragEvent) => void
}

export function DocumentSectionTable({
  dataTestId,
  viewMode,
  displayDocuments,
  columns,
  enableColumnSorting = false,
  sortColumnId,
  sortDirection,
  onSortChange,
  draggedDocument,
  dropTarget,
  isDroppingOnRoot,
  isOverDropZone,
  selectedItems,
  handleRowClick,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragEnd,
  handleDropZoneOver,
  handleDropZoneLeave,
  handleDropZoneDrop,
  handleRootDragOver,
  handleRootDragLeave,
  handleRootDrop
}: DocumentSectionTableProps) {
  const { t } = useTranslation(translations)

  const getSortIcon = (columnId: string) => {
    if (sortColumnId !== columnId) {
      return <CaretUpDownIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
    }

    if (sortDirection === 'asc') {
      return <CaretUpIcon className="gba:h-3 gba:w-3" />
    }

    return <CaretDownIcon className="gba:h-3 gba:w-3" />
  }

  return (
    <>
      {/* Root Drop Zone - Always visible in tree view */}
      {viewMode === 'tree' && (
        <section
          aria-label={t('document-aria-root-drop-zone')}
          className={`gba:mb-4 gba:border-2 gba:border-dashed gba:rounded-lg gba:p-6 gba:text-center gba:transition-all gba:duration-200 ${
            isOverDropZone ? 'gba:border-primary gba:bg-primary/10' : 'gba:border-muted-foreground/30 gba:bg-muted/10'
          }`}
          onDragOver={handleDropZoneOver}
          onDragLeave={handleDropZoneLeave}
          onDrop={handleDropZoneDrop}
          data-testid={`${dataTestId}-root-drop-zone`}
        >
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <FolderNotchIcon className="gba:h-6 gba:w-6 gba:text-muted-foreground" />
            <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
              {isOverDropZone ? t('document-drop-root-active') : t('document-drop-root-prompt')}
            </span>
          </div>
        </section>
      )}

      {/* Documents Table */}
      <section
        aria-label={t('document-aria-table-container')}
        className={`gba:border gba:rounded-lg ${isDroppingOnRoot ? 'gba:bg-primary/5 gba:border-primary' : ''}`}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(column => {
                const widthClass = column.width ? `gba:w-[${column.width}]` : ''
                const canSort = enableColumnSorting && column.sortable
                return (
                  <TableHead
                    key={column.id}
                    className={`gba:text-left ${widthClass}`}
                    style={{
                      textAlign: column.align || 'left',
                      width: column.width
                    }}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        className="gba:flex gba:items-center gba:gap-1 gba:transition-colors hover:gba:text-foreground"
                        onClick={() => onSortChange(column.id)}
                        data-testid={`${dataTestId}-sort-${column.id}`}
                      >
                        <span>{column.header}</span>
                        {getSortIcon(column.id)}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="gba:text-center gba:py-12 gba:text-muted-foreground">
                  <div className="gba:space-y-2">
                    <FileIcon className="gba:h-12 gba:w-12 gba:mx-auto gba:text-muted-foreground" />
                    <div className="gba:text-lg gba:font-medium">{t('document-empty-title')}</div>
                    <div className="gba:text-sm">{t('document-empty-description')}</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayDocuments.map(document => {
                const isSelected = selectedItems.includes(document.id)
                const isDraggedOver = dropTarget === document.id
                const isDragging = draggedDocument?.id === document.id

                return (
                  <TableRow
                    key={document.id}
                    data-testid={`${dataTestId}-row-${document.id}`}
                    data-folder={document.folder ? 'true' : 'false'}
                    className={`
                       gba:cursor-pointer
                       ${isSelected && viewMode === 'tree' ? 'gba:bg-muted/50' : ''} 
                       ${viewMode === 'tree' ? 'hover:gba:bg-muted/30' : ''}
                       ${isDraggedOver ? 'gba:bg-primary/20 gba:border-2 gba:border-primary gba:border-dashed' : ''}
                       ${isDragging ? 'gba:opacity-50' : ''}
                       ${document.folder && draggedDocument ? 'gba:transition-all gba:duration-200 hover:gba:bg-primary/10' : ''}
                       ${document.folder ? 'gba:transition-all gba:duration-200' : ''}
                     `}
                    onClick={e => handleRowClick(document.id, e)}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    draggable={true}
                    onDragStart={e => handleDragStart(e, document)}
                    onDragEnter={e => (document.folder ? handleDragOver(e, document) : undefined)}
                    onDragOver={e => (document.folder ? handleDragOver(e, document) : undefined)}
                    onDragLeave={document.folder ? handleDragLeave : undefined}
                    onDrop={e => (document.folder ? handleDrop(e, document) : undefined)}
                    onDragEnd={handleDragEnd}
                  >
                    {columns.map(column => (
                      <TableCell
                        key={column.id}
                        style={{
                          textAlign: column.align || 'left',
                          width: column.width
                        }}
                      >
                        {column.render(document)}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </section>
    </>
  )
}
