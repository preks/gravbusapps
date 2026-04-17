import type { PageNumberAlignment } from '../../types/document'
import type { HeaderFooterPaginationCmd } from './headerFooterSidebarUtils'
import { HeaderFooterSettingsSidebarMenuBar } from './HeaderFooterSettingsSidebarMenuBar'

export interface HeaderFooterSettingsSidebarContentProps {
  testId: string
  cmds: HeaderFooterPaginationCmd
  differentFirstPage: boolean
  differentOddEven: boolean
  showDocumentBody: boolean
  onShowDocumentBodyChange: (v: boolean) => void
  marginUnit: 'cm' | 'in'
  hPos: string
  setHPos: (v: string) => void
  fPos: string
  setFPos: (v: string) => void
  onOpenDate: () => void
  reopenAfterLayoutToggle: (apply: () => void) => void
  applyMargins: () => void
  insertInOverlay: (text: string) => void
  canInsertInOverlay: boolean
  onOpenPageNumbers: () => void
  onQuickPageNumberPlacement: (position: 'header' | 'footer', alignment: PageNumberAlignment) => void
  onRemovePageNumber: () => void
}

export function HeaderFooterSettingsSidebarContent(props: Readonly<HeaderFooterSettingsSidebarContentProps>) {
  const {
    testId,
    cmds,
    differentFirstPage,
    differentOddEven,
    showDocumentBody,
    onShowDocumentBodyChange,
    marginUnit,
    hPos,
    setHPos,
    fPos,
    setFPos,
    onOpenDate,
    reopenAfterLayoutToggle,
    applyMargins,
    insertInOverlay,
    canInsertInOverlay,
    onOpenPageNumbers,
    onQuickPageNumberPlacement,
    onRemovePageNumber
  } = props

  return (
    <div className="gba:flex gba:flex-col gba:gap-4 gba:px-4 gba:py-4">
      <HeaderFooterSettingsSidebarMenuBar
        testId={testId}
        cmds={cmds}
        differentFirstPage={differentFirstPage}
        differentOddEven={differentOddEven}
        showDocumentBody={showDocumentBody}
        onShowDocumentBodyChange={onShowDocumentBodyChange}
        marginUnit={marginUnit}
        hPos={hPos}
        setHPos={setHPos}
        fPos={fPos}
        setFPos={setFPos}
        reopenAfterLayoutToggle={reopenAfterLayoutToggle}
        applyMargins={applyMargins}
        insertInOverlay={insertInOverlay}
        canInsertInOverlay={canInsertInOverlay}
        onOpenDate={onOpenDate}
        onOpenPageNumbers={onOpenPageNumbers}
        onQuickPageNumberPlacement={onQuickPageNumberPlacement}
        onRemovePageNumber={onRemovePageNumber}
      />
    </div>
  )
}
