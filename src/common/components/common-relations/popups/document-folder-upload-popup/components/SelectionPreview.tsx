import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { XIcon } from '@phosphor-icons/react'
import { getDocumentIcon } from '@/common/utils/documentIconUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { depthIndentClass, formatBytes } from '../hooks/useFolderPreviewTree'
import { PREVIEW_PAGE_SIZE } from '../hooks/useFolderSelection'
import type { FolderSelectionSummary, PreviewRow } from '../types'

interface PreviewRowItemProps {
  readonly testIdPrefix: string
  readonly row: PreviewRow
}

const PreviewRowItem: React.FC<PreviewRowItemProps> = ({ testIdPrefix, row }) => {
  const indent = depthIndentClass(row.depth)
  const icon = getDocumentIcon({
    name: row.name,
    isFolder: row.isFolder,
    size: 14,
    className: 'gba:h-4 gba:w-4 gba:shrink-0'
  })

  return (
    <div
      className={`gba:flex gba:items-center gba:gap-2 gba:text-xs gba:py-0.5 ${indent}`}
      data-testid={`${testIdPrefix}-preview-row`}
    >
      {icon}
      <span className="gba:truncate gba:flex-1 gba:text-left">{row.name}</span>
      {!row.isFolder && (
        <span className="gba:text-muted-foreground gba:shrink-0 gba:ml-2">{formatBytes(row.size)}</span>
      )}
    </div>
  )
}

interface FolderTreePreviewProps {
  readonly testIdPrefix: string
  readonly rows: readonly PreviewRow[]
  readonly hiddenCount: number
  readonly onShowMore: () => void
}

const FolderTreePreview: React.FC<FolderTreePreviewProps> = ({ testIdPrefix, rows, hiddenCount, onShowMore }) => {
  const nextChunk = Math.min(hiddenCount, PREVIEW_PAGE_SIZE)

  return (
    <div
      className="gba:flex gba:flex-col gba:w-full gba:max-h-60 gba:overflow-y-auto gba:rounded-md gba:border gba:border-input gba:bg-background gba:p-2"
      data-testid={`${testIdPrefix}-tree-preview`}
    >
      {rows.map(row => (
        <PreviewRowItem key={row.path} testIdPrefix={testIdPrefix} row={row} />
      ))}
      {hiddenCount > 0 && (
        <Button
          variant="link"
          size="sm"
          className="gba:self-start gba:h-auto gba:px-2 gba:py-1 gba:text-xs"
          onClick={event => {
            event.preventDefault()
            event.stopPropagation()
            onShowMore()
          }}
          data-testid={`${testIdPrefix}-preview-show-more`}
        >
          {getTranslationFromI18nKeyAndLabel('folderUpload.popup.previewShowMore', 'Show {count} more').replace(
            '{count}',
            String(nextChunk)
          )}
        </Button>
      )}
    </div>
  )
}

export interface SelectionPreviewProps {
  readonly testIdPrefix: string
  readonly summary: FolderSelectionSummary
  readonly previewRows: readonly PreviewRow[]
  readonly hiddenPreviewCount: number
  readonly onShowMore: () => void
  readonly onClear: () => void
}

export const SelectionPreview: React.FC<SelectionPreviewProps> = ({
  testIdPrefix,
  summary,
  previewRows,
  hiddenPreviewCount,
  onShowMore,
  onClear
}) => (
  <div
    className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:w-full"
    data-testid={`${testIdPrefix}-selection-preview`}
  >
    <div className="gba:flex gba:flex-col gba:items-center gba:gap-1">
      {getDocumentIcon({ isFolder: true, size: 32, className: 'gba:h-8 gba:w-8' })}
      <div className="gba:text-sm gba:font-medium gba:break-all">{summary.rootName}</div>
      <div className="gba:text-xs gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('folderUpload.popup.selectionSummary', '{count} files • {size}')
          .replace('{count}', String(summary.fileCount))
          .replace('{size}', formatBytes(summary.totalBytes))}
      </div>
    </div>

    {previewRows.length > 0 && (
      <FolderTreePreview
        testIdPrefix={testIdPrefix}
        rows={previewRows}
        hiddenCount={hiddenPreviewCount}
        onShowMore={onShowMore}
      />
    )}

    <Button
      variant="ghost"
      size="sm"
      onClick={event => {
        event.stopPropagation()
        onClear()
      }}
      data-testid={`${testIdPrefix}-clear-selection-button`}
    >
      <XIcon className="gba:h-4 gba:w-4 gba:mr-1" />
      {getTranslationFromI18nKeyAndLabel('folderUpload.popup.clearSelection', 'Change selection')}
    </Button>
  </div>
)
