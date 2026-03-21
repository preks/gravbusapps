import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { PageNumberAlignment } from '../../types/document'
import { Button, ScrollArea, useTranslation } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import translations from '../../_i18n'
import { HeaderFooterDateDialog } from './HeaderFooterDateDialog'
import { HeaderFooterSettingsSidebarContent } from './HeaderFooterSettingsSidebarContent'
import { useHeaderFooterSidebarActions } from './useHeaderFooterSidebarActions'

export interface HeaderFooterSettingsSidebarProps {
  editor: Editor
  overlayEditor: Editor | null
  type: 'header' | 'footer'
  pageNumber: number
  differentFirstPage: boolean
  differentOddEven: boolean
  headerTopMarginPx: number
  footerBottomMarginPx: number
  marginUnit: 'cm' | 'in'
  showDocumentBody: boolean
  onShowDocumentBodyChange: (v: boolean) => void
  onPersistPagesFromEditor: () => void
  onOpenPageNumbers: () => void
  onQuickPageNumberPlacement: (position: 'header' | 'footer', alignment: PageNumberAlignment) => void
  onRemovePageNumber: () => void
  headerHeight?: number
  rightOffset?: number
  onClose: () => void
  'data-testid'?: string
}

function preventEditorBlurOnMouseDown(event: React.MouseEvent<HTMLElement>) {
  event.preventDefault()
}

export function HeaderFooterSettingsSidebar({
  editor,
  overlayEditor,
  type,
  pageNumber,
  differentFirstPage,
  differentOddEven,
  headerTopMarginPx,
  footerBottomMarginPx,
  marginUnit,
  showDocumentBody,
  onShowDocumentBodyChange,
  onPersistPagesFromEditor,
  onOpenPageNumbers,
  onQuickPageNumberPlacement,
  onRemovePageNumber,
  headerHeight = 120,
  rightOffset = 16,
  onClose,
  'data-testid': testId = 'document-header-footer-settings-sidebar'
}: Readonly<HeaderFooterSettingsSidebarProps>) {
  const { t } = useTranslation(translations)
  const [dateOpen, setDateOpen] = useState(false)

  const actions = useHeaderFooterSidebarActions({
    editor,
    overlayEditor,
    activeType: type,
    activePage: pageNumber,
    differentFirstPage,
    differentOddEven,
    headerTopMarginPx,
    footerBottomMarginPx,
    marginUnit,
    onPersistPagesFromEditor
  })

  const areaTitle = type === 'header' ? t('editor-header-footer-label-header') : t('editor-header-footer-label-footer')

  return (
    <>
      <HeaderFooterDateDialog
        open={dateOpen}
        onOpenChange={setDateOpen}
        onInsert={actions.insertInOverlay}
        data-testid={`${testId}-date-dialog`}
      />
      <div
        className="gba:fixed gba:right-0 gba:bottom-0 gba:bg-background gba:border-l gba:border-border/50 gba:flex gba:flex-col gba:overflow-hidden gba:shadow-lg"
        style={{ top: `${headerHeight}px`, right: rightOffset, width: 360, zIndex: 45 }}
        data-testid={testId}
      >
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-4 gba:py-3 gba:border-b gba:border-border/50 gba:bg-gradient-to-b gba:from-muted/20 gba:to-transparent">
          <h3
            className="gba:text-base gba:font-semibold gba:leading-tight gba:min-w-0"
            data-testid={`${testId}-area-title`}
          >
            {areaTitle}
          </h3>
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
            <HeaderFooterSettingsSidebarContent
              testId={testId}
              cmds={actions.cmds}
              differentFirstPage={differentFirstPage}
              differentOddEven={differentOddEven}
              showDocumentBody={showDocumentBody}
              onShowDocumentBodyChange={onShowDocumentBodyChange}
              marginUnit={marginUnit}
              hPos={actions.hPos}
              setHPos={actions.setHPos}
              fPos={actions.fPos}
              setFPos={actions.setFPos}
              onOpenDate={() => setDateOpen(true)}
              reopenAfterLayoutToggle={actions.reopenAfterLayoutToggle}
              applyMargins={actions.applyMargins}
              applyHeaderPreset={actions.applyHeaderPreset}
              applyFooterPreset={actions.applyFooterPreset}
              insertInOverlay={actions.insertInOverlay}
              canInsertInOverlay={overlayEditor != null}
              onOpenPageNumbers={onOpenPageNumbers}
              onQuickPageNumberPlacement={onQuickPageNumberPlacement}
              onRemovePageNumber={onRemovePageNumber}
            />
          </ScrollArea>
        </div>
      </div>
    </>
  )
}
