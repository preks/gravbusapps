import type { PageNumberAlignment } from '../../types/document'
import type { HeaderFooterPaginationCmd } from './headerFooterSidebarUtils'
import { HeaderFooterMenuBarInsertsDropdown } from './HeaderFooterMenuBarInsertsDropdown'
import { HeaderFooterMenuBarPageNumbersDropdown } from './HeaderFooterMenuBarPageNumbersDropdown'
import { HeaderFooterOptionsControls } from './HeaderFooterOptionsControls'
import { HeaderFooterPositionMarginControls } from './HeaderFooterPositionMarginControls'

export interface HeaderFooterSettingsSidebarMenuBarProps {
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
  reopenAfterLayoutToggle: (apply: () => void) => void
  applyMargins: () => void
  insertInOverlay: (text: string) => void
  canInsertInOverlay: boolean
  onOpenDate: () => void
  onOpenPageNumbers: () => void
  onQuickPageNumberPlacement: (position: 'header' | 'footer', alignment: PageNumberAlignment) => void
  onRemovePageNumber: () => void
}

export function HeaderFooterSettingsSidebarMenuBar({
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
  reopenAfterLayoutToggle,
  applyMargins,
  insertInOverlay,
  canInsertInOverlay,
  onOpenDate,
  onOpenPageNumbers,
  onQuickPageNumberPlacement,
  onRemovePageNumber
}: Readonly<HeaderFooterSettingsSidebarMenuBarProps>) {
  return (
    <div className="gba:flex gba:w-full gba:flex-col gba:gap-3" data-testid={`${testId}-menu-bar`}>
      <div className="gba:flex gba:flex-wrap gba:items-stretch gba:gap-2">
        <HeaderFooterMenuBarPageNumbersDropdown
          testId={testId}
          onOpenPageNumbers={onOpenPageNumbers}
          onQuickPageNumberPlacement={onQuickPageNumberPlacement}
          onRemovePageNumber={onRemovePageNumber}
        />

        <HeaderFooterMenuBarInsertsDropdown
          testId={testId}
          insertInOverlay={insertInOverlay}
          canInsertInOverlay={canInsertInOverlay}
          onOpenDate={onOpenDate}
        />
      </div>

      <HeaderFooterOptionsControls
        testId={testId}
        cmds={cmds}
        differentFirstPage={differentFirstPage}
        differentOddEven={differentOddEven}
        showDocumentBody={showDocumentBody}
        onShowDocumentBodyChange={onShowDocumentBodyChange}
        reopenAfterLayoutToggle={reopenAfterLayoutToggle}
      />

      <HeaderFooterPositionMarginControls
        testId={testId}
        marginUnit={marginUnit}
        hPos={hPos}
        setHPos={setHPos}
        fPos={fPos}
        setFPos={setFPos}
        applyMargins={applyMargins}
      />
    </div>
  )
}
