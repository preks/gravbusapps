import {
  Button,
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

export interface HeaderFooterMenuBarPageNumbersDropdownProps {
  testId: string
  onOpenPageNumbers: () => void
  onQuickPageNumberPlacement: (position: 'header' | 'footer', alignment: PageNumberAlignment) => void
  onRemovePageNumber: () => void
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
  onRemovePageNumber
}: Readonly<HeaderFooterMenuBarPageNumbersDropdownProps>) {
  const { t } = useTranslation(translations)
  const onMouseDown = headerFooterSidebarPreventBlur

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
              onClick={() => onQuickPageNumberPlacement(region, align)}
            />
          ))}
        </div>

        <DropdownMenuSeparator className="gba:my-1" />

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
