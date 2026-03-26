import { Button, ScrollArea, useTranslation } from '@newwork/nw-design-system'
import type { Editor } from '@tiptap/react'
import { X } from 'lucide-react'
import translations from '../../_i18n'
import { TableSettingsSidebarContent } from './TableSettingsSidebarContent'
import { useTableSidebarActions } from './useTableSidebarActions'

export interface SelectedTableSidebarState {
  open: boolean
  editor: Editor | null
  tablePos: number | null
}

export interface TableSettingsSidebarProps {
  editor: Editor | null
  table: SelectedTableSidebarState
  contextSubtitle?: string
  headerHeight?: number
  rightOffset?: number
  onClose: () => void
  'data-testid'?: string
}

function preventEditorBlurOnMouseDown(event: React.MouseEvent<HTMLElement>) {
  event.preventDefault()
}

export function TableSettingsSidebar({
  editor,
  table,
  contextSubtitle,
  headerHeight = 120,
  rightOffset = 16,
  onClose,
  'data-testid': testId = 'document-table-settings-sidebar'
}: Readonly<TableSettingsSidebarProps>) {
  const { t } = useTranslation(translations)
  const controller = useTableSidebarActions({
    editor,
    tablePos: table.tablePos
  })

  if (!editor || !table.open || table.tablePos == null) {
    return null
  }

  return (
    <div
      className="gba:fixed gba:right-0 gba:bottom-0 gba:bg-background gba:border-l gba:border-border/50 gba:flex gba:flex-col gba:overflow-hidden gba:shadow-lg"
      style={{ top: `${headerHeight}px`, right: rightOffset, width: 360, zIndex: 45 }}
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-4 gba:py-3 gba:border-b gba:border-border/50 gba:bg-gradient-to-b gba:from-muted/20 gba:to-transparent">
        <div className="gba:min-w-0">
          <h3 className="gba:text-base gba:font-semibold gba:leading-tight gba:min-w-0">{t('table-sidebar-title')}</h3>
          {contextSubtitle ? (
            <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-context-subtitle`}>
              {contextSubtitle}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="gba:h-8 gba:w-8 gba:shrink-0"
          onMouseDown={preventEditorBlurOnMouseDown}
          onClick={onClose}
          aria-label={t('editor-header-footer-close')}
          title={t('editor-header-footer-close')}
          data-testid={`${testId}-close`}
        >
          <X className="gba:h-4 gba:w-4" aria-hidden />
        </Button>
      </div>

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden">
        <ScrollArea className="gba:flex-1 gba:h-full">
          <TableSettingsSidebarContent testId={testId} controller={controller} />
        </ScrollArea>
      </div>
    </div>
  )
}
