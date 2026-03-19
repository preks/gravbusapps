import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Separator,
  useTranslation
} from '@newwork/nw-design-system'
import { ChevronDown } from 'lucide-react'
import type { PageNumberAlignment } from '../../types/document'
import translations from '../../_i18n'
import { HEADER_PRESETS, FOOTER_PRESETS } from './headerFooterSidebarPresets'
import { headerFooterSidebarPreventBlur } from './headerFooterSidebarPreventBlur'

export interface HeaderFooterSettingsSidebarPresetsInsertProps {
  testId: string
  applyHeaderPreset: (html: string) => void
  applyFooterPreset: (html: string) => void
  insertInOverlay: (text: string) => void
  canInsertInOverlay: boolean
  onOpenDate: () => void
  onOpenPageNumbers: () => void
  onQuickPageNumberPlacement: (position: 'header' | 'footer', alignment: PageNumberAlignment) => void
}

const PAGE_NUMBER_ALIGNMENTS: PageNumberAlignment[] = ['left', 'center', 'right', 'inside', 'outside']

export function HeaderFooterSettingsSidebarPresetsInsert({
  testId,
  applyHeaderPreset,
  applyFooterPreset,
  insertInOverlay,
  canInsertInOverlay,
  onOpenDate,
  onOpenPageNumbers,
  onQuickPageNumberPlacement
}: Readonly<HeaderFooterSettingsSidebarPresetsInsertProps>) {
  const { t } = useTranslation(translations)
  const onMouseDown = headerFooterSidebarPreventBlur

  return (
    <>
      <div>
        <p className="gba:mb-2 gba:text-xs gba:font-semibold gba:text-muted-foreground">
          {t('header-footer-sidebar-section-layout')}
        </p>
        <div className="gba:flex gba:flex-col gba:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gba:w-full gba:justify-between"
                onMouseDown={onMouseDown}
                data-testid={`${testId}-header-menu`}
              >
                {t('editor-header-footer-label-header')}
                <ChevronDown className="gba:h-4 gba:w-4 gba:opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="gba:max-h-64 gba:overflow-y-auto gba:w-[var(--radix-dropdown-menu-trigger-width)]"
            >
              {HEADER_PRESETS.map(p => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => applyHeaderPreset(p.html)}
                  data-testid={`${testId}-header-${p.id}`}
                >
                  {t(p.labelKey)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gba:w-full gba:justify-between"
                onMouseDown={onMouseDown}
                data-testid={`${testId}-footer-menu`}
              >
                {t('editor-header-footer-label-footer')}
                <ChevronDown className="gba:h-4 gba:w-4 gba:opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="gba:w-[var(--radix-dropdown-menu-trigger-width)]">
              {FOOTER_PRESETS.map(p => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => applyFooterPreset(p.html)}
                  data-testid={`${testId}-footer-${p.id}`}
                >
                  {t(p.labelKey)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gba:w-full gba:justify-between"
                onMouseDown={onMouseDown}
                data-testid={`${testId}-page-number-menu`}
              >
                {t('header-footer-sidebar-page-number')}
                <ChevronDown className="gba:h-4 gba:w-4 gba:opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="gba:min-w-52">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger onMouseDown={onMouseDown} data-testid={`${testId}-pn-footer-submenu`}>
                  {t('header-footer-sidebar-pn-bottom-page')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="gba:min-w-40">
                  {PAGE_NUMBER_ALIGNMENTS.map(align => (
                    <DropdownMenuItem
                      key={`f-${align}`}
                      onClick={() => onQuickPageNumberPlacement('footer', align)}
                      data-testid={`${testId}-pn-footer-${align}`}
                    >
                      {t(`page-numbers-align-${align}`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger onMouseDown={onMouseDown} data-testid={`${testId}-pn-header-submenu`}>
                  {t('header-footer-sidebar-pn-top-page')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="gba:min-w-56">
                  <DropdownMenuLabel className="gba:font-normal gba:text-xs gba:text-muted-foreground gba:whitespace-normal gba:leading-snug">
                    {t('header-footer-sidebar-pn-header-band-hint')}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {PAGE_NUMBER_ALIGNMENTS.map(align => (
                    <DropdownMenuItem
                      key={`h-${align}`}
                      onClick={() => onQuickPageNumberPlacement('header', align)}
                      data-testid={`${testId}-pn-header-${align}`}
                    >
                      {t(`page-numbers-align-${align}`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onOpenPageNumbers()} data-testid={`${testId}-pn-dialog`}>
                {t('header-footer-sidebar-page-numbers-dialog')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Separator />

      <div>
        <p className="gba:mb-2 gba:text-xs gba:font-semibold gba:text-muted-foreground">
          {t('header-footer-sidebar-section-insert')}
        </p>
        <div className="gba:flex gba:flex-col gba:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gba:w-full gba:justify-start"
            disabled={!canInsertInOverlay}
            onMouseDown={onMouseDown}
            onClick={onOpenDate}
            data-testid={`${testId}-date-time`}
          >
            {t('header-footer-sidebar-date-time')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gba:w-full gba:justify-start"
            disabled={!canInsertInOverlay}
            onMouseDown={onMouseDown}
            onClick={() => insertInOverlay('{page}')}
            data-testid={`${testId}-field-page`}
          >
            {t('header-footer-sidebar-insert-page-field')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gba:w-full gba:justify-start"
            disabled={!canInsertInOverlay}
            onMouseDown={onMouseDown}
            onClick={() => insertInOverlay('{total}')}
            data-testid={`${testId}-field-total`}
          >
            {t('header-footer-sidebar-insert-total-field')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gba:w-full gba:justify-start"
            disabled={!canInsertInOverlay}
            onMouseDown={onMouseDown}
            onClick={() => insertInOverlay('{title}')}
            data-testid={`${testId}-field-title`}
          >
            {t('header-footer-sidebar-field-title')}
          </Button>
        </div>
      </div>
    </>
  )
}
