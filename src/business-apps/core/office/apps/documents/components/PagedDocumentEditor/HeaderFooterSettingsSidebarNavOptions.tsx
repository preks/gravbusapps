import { Input, Label, Separator, Switch, useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import type { HeaderFooterPaginationCmd } from './headerFooterSidebarUtils'

export interface HeaderFooterSettingsSidebarNavOptionsProps {
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
}

export function HeaderFooterSettingsSidebarNavOptions({
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
  applyMargins
}: Readonly<HeaderFooterSettingsSidebarNavOptionsProps>) {
  const { t } = useTranslation(translations)
  const unitLabel = marginUnit === 'in' ? t('header-footer-sidebar-unit-in') : t('header-footer-sidebar-unit-cm')

  return (
    <>
      <div>
        <p className="gba:mb-2 gba:text-xs gba:font-semibold gba:text-muted-foreground">
          {t('header-footer-sidebar-section-options')}
        </p>
        <div className="gba:flex gba:flex-col gba:gap-3">
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
      </div>

      <Separator />

      <div>
        <p className="gba:mb-2 gba:text-xs gba:font-semibold gba:text-muted-foreground">
          {t('header-footer-sidebar-section-position')}
        </p>
        <div className="gba:flex gba:flex-col gba:gap-3">
          <div className="gba:space-y-1">
            <Label className="gba:text-xs">
              {t('header-footer-sidebar-header-from-top')} ({unitLabel})
            </Label>
            <Input
              className="gba:h-9"
              value={hPos}
              onChange={e => setHPos(e.target.value)}
              onBlur={applyMargins}
              onKeyDown={e => e.key === 'Enter' && applyMargins()}
              data-testid={`${testId}-pos-header`}
            />
          </div>
          <div className="gba:space-y-1">
            <Label className="gba:text-xs">
              {t('header-footer-sidebar-footer-from-bottom')} ({unitLabel})
            </Label>
            <Input
              className="gba:h-9"
              value={fPos}
              onChange={e => setFPos(e.target.value)}
              onBlur={applyMargins}
              onKeyDown={e => e.key === 'Enter' && applyMargins()}
              data-testid={`${testId}-pos-footer`}
            />
          </div>
        </div>
      </div>
    </>
  )
}
