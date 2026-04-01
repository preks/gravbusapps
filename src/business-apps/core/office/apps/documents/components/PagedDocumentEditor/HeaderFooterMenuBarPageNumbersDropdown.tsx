import { useState } from 'react'
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { ChevronDown } from 'lucide-react'
import type { PageNumberAlignment } from '../../types/document'
import translations from '../../_i18n'
import { headerFooterSidebarPreventBlur } from './headerFooterSidebarPreventBlur'
import { HEADER_FOOTER_MENU_TRIGGER_CLASS } from './headerFooterMenuBarShared'
import { HeaderFooterPageNumberGridCell } from './HeaderFooterPageNumberGridCell'

export interface PlacePageNumberInBodyParams {
  region: 'header' | 'footer'
  alignment: 'left' | 'center' | 'right'
  includeTotal: boolean
}

export interface HeaderFooterMenuBarPageNumbersDropdownProps {
  testId: string
  onOpenPageNumbers: () => void
  onQuickPageNumberPlacement: (position: 'header' | 'footer', alignment: PageNumberAlignment) => void
  onRemovePageNumber: () => void
  onPlacePageNumberInBody: (params: PlacePageNumberInBodyParams) => void
}

const GRID: Array<{ region: 'header' | 'footer'; align: 'left' | 'center' | 'right'; testSuffix: string }> = [
  { region: 'header', align: 'left', testSuffix: 'h-left' },
  { region: 'header', align: 'center', testSuffix: 'h-center' },
  { region: 'header', align: 'right', testSuffix: 'h-right' },
  { region: 'footer', align: 'left', testSuffix: 'f-left' },
  { region: 'footer', align: 'center', testSuffix: 'f-center' },
  { region: 'footer', align: 'right', testSuffix: 'f-right' }
]

export function HeaderFooterMenuBarPageNumbersDropdown({
  testId,
  onOpenPageNumbers,
  onQuickPageNumberPlacement,
  onRemovePageNumber,
  onPlacePageNumberInBody
}: Readonly<HeaderFooterMenuBarPageNumbersDropdownProps>) {
  const { t } = useTranslation(translations)
  const onMouseDown = headerFooterSidebarPreventBlur
  const [includePageCount, setIncludePageCount] = useState(false)

  const handleCellClick = (region: 'header' | 'footer', align: 'left' | 'center' | 'right') => {
    if (includePageCount) {
      onPlacePageNumberInBody({ region, alignment: align, includeTotal: true })
      return
    }
    onQuickPageNumberPlacement(region, align)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={HEADER_FOOTER_MENU_TRIGGER_CLASS}
          onMouseDown={onMouseDown}
          data-testid={`${testId}-menu-page-numbers`}
        >
          <span className="gba:truncate">{t('header-footer-menu-page-numbers')}</span>
          <ChevronDown className="gba:h-4 gba:w-4 gba:shrink-0 gba:opacity-50" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="gba:w-72 gba:max-w-[min(92vw,20rem)] gba:p-2"
        onCloseAutoFocus={e => e.preventDefault()}
      >
        <DropdownMenuLabel className="gba:px-1 gba:pb-2 gba:text-xs gba:font-normal gba:text-muted-foreground">
          {t('header-footer-pn-add-to-header-footer')}
        </DropdownMenuLabel>
        <div className="gba:grid gba:grid-cols-3 gba:gap-1.5 gba:px-1">
          {GRID.map(({ region, align, testSuffix }) => (
            <HeaderFooterPageNumberGridCell
              key={testSuffix}
              region={region}
              alignment={align}
              testId={`${testId}-pn-grid-${testSuffix}`}
              onClick={() => handleCellClick(region, align)}
            />
          ))}
        </div>

        <DropdownMenuSeparator className="gba:my-1" />

        <div className="gba:flex gba:items-center gba:gap-2 gba:px-1 gba:py-1" onMouseDown={e => e.preventDefault()}>
          <Checkbox
            id={`${testId}-pn-include-count`}
            checked={includePageCount}
            onCheckedChange={v => setIncludePageCount(v === true)}
            data-testid={`${testId}-pn-include-count`}
          />
          <label htmlFor={`${testId}-pn-include-count`} className="gba:cursor-pointer gba:text-sm gba:leading-tight">
            {t('header-footer-pn-include-page-count')}
          </label>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => onOpenPageNumbers()}
          onMouseDown={onMouseDown}
          data-testid={`${testId}-pn-dialog`}
        >
          {t('header-footer-pn-manage')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRemovePageNumber} onMouseDown={onMouseDown} data-testid={`${testId}-pn-remove`}>
          {t('header-footer-sidebar-page-number-remove')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
