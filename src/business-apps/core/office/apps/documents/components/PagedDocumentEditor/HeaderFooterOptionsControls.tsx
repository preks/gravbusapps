import { Switch, useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { headerFooterSidebarPreventBlur } from './headerFooterSidebarPreventBlur'
import type { HeaderFooterPaginationCmd } from './headerFooterSidebarUtils'

export interface HeaderFooterOptionsControlsProps {
  testId: string
  cmds: HeaderFooterPaginationCmd
  differentFirstPage: boolean
  differentOddEven: boolean
  showDocumentBody: boolean
  onShowDocumentBodyChange: (v: boolean) => void
  reopenAfterLayoutToggle: (apply: () => void) => void
}

export function HeaderFooterOptionsControls({
  testId,
  cmds,
  differentFirstPage,
  differentOddEven,
  showDocumentBody,
  onShowDocumentBodyChange,
  reopenAfterLayoutToggle
}: Readonly<HeaderFooterOptionsControlsProps>) {
  const { t } = useTranslation(translations)
  const onMouseDown = headerFooterSidebarPreventBlur

  return (
    <div
      className="gba:flex gba:w-full gba:flex-col gba:gap-3 gba:rounded-md gba:border gba:border-border/50 gba:bg-muted/15 gba:p-3"
      onMouseDown={onMouseDown}
      data-testid={`${testId}-menu-options`}
    >
      <label className="gba:flex gba:cursor-pointer gba:items-center gba:justify-between gba:gap-2 gba:text-sm">
        <span>{t('header-footer-sidebar-diff-first')}</span>
        <Switch
          checked={differentFirstPage}
          onCheckedChange={v => reopenAfterLayoutToggle(() => cmds.setDifferentFirstPage?.(v))}
          data-testid={`${testId}-opt-first`}
        />
      </label>
      <label className="gba:flex gba:cursor-pointer gba:items-center gba:justify-between gba:gap-2 gba:text-sm">
        <span>{t('header-footer-sidebar-diff-oddeven')}</span>
        <Switch
          checked={differentOddEven}
          onCheckedChange={v => reopenAfterLayoutToggle(() => cmds.setDifferentOddEven?.(v))}
          data-testid={`${testId}-opt-oddeven`}
        />
      </label>
      <label className="gba:flex gba:cursor-pointer gba:items-center gba:justify-between gba:gap-2 gba:text-sm">
        <span>{t('header-footer-sidebar-show-body')}</span>
        <Switch
          checked={showDocumentBody}
          onCheckedChange={onShowDocumentBodyChange}
          data-testid={`${testId}-show-body`}
        />
      </label>
    </div>
  )
}
