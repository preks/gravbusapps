import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { ChevronDown } from 'lucide-react'
import translations from '../../_i18n'
import { headerFooterSidebarPreventBlur } from './headerFooterSidebarPreventBlur'
import { HEADER_FOOTER_MENU_TRIGGER_CLASS } from './headerFooterMenuBarShared'

export interface HeaderFooterMenuBarInsertsDropdownProps {
  testId: string
  insertInOverlay: (text: string) => void
  canInsertInOverlay: boolean
  onOpenDate: () => void
}

export function HeaderFooterMenuBarInsertsDropdown({
  testId,
  insertInOverlay,
  canInsertInOverlay,
  onOpenDate
}: Readonly<HeaderFooterMenuBarInsertsDropdownProps>) {
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
          data-testid={`${testId}-menu-inserts`}
        >
          <span className="gba:truncate">{t('header-footer-menu-inserts')}</span>
          <ChevronDown className="gba:h-4 gba:w-4 gba:shrink-0 gba:opacity-50" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="gba:max-h-[min(70vh,24rem)] gba:overflow-y-auto gba:min-w-56">
        <DropdownMenuItem
          disabled={!canInsertInOverlay}
          onClick={onOpenDate}
          onMouseDown={onMouseDown}
          data-testid={`${testId}-date-time`}
        >
          {t('header-footer-sidebar-date-time')}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canInsertInOverlay}
          onClick={() => insertInOverlay('{page}')}
          onMouseDown={onMouseDown}
          data-testid={`${testId}-field-page`}
        >
          {t('header-footer-sidebar-insert-page-field')}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canInsertInOverlay}
          onClick={() => insertInOverlay('{total}')}
          onMouseDown={onMouseDown}
          data-testid={`${testId}-field-total`}
        >
          {t('header-footer-sidebar-insert-total-field')}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canInsertInOverlay}
          onClick={() => insertInOverlay('{title}')}
          onMouseDown={onMouseDown}
          data-testid={`${testId}-field-title`}
        >
          {t('header-footer-sidebar-field-title')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
