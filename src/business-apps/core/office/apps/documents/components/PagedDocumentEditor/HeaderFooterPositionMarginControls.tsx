import { Input, cn, useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { headerFooterSidebarPreventBlur } from './headerFooterSidebarPreventBlur'

function HeaderFromTopIllustration({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={cn('gba:h-7 gba:w-9 gba:shrink-0', className)}
      viewBox="0 0 36 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3 2v5M3 2h30M33 2v5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="gba:text-muted-foreground"
      />
      <rect x="6" y="9" width="24" height="5" rx="1" className="gba:fill-primary" />
      <path
        d="M18 16v4M15 19l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="gba:text-primary"
      />
    </svg>
  )
}

function FooterFromBottomIllustration({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={cn('gba:h-7 gba:w-9 gba:shrink-0', className)}
      viewBox="0 0 36 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M18 6v4M15 9l3-3 3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="gba:text-primary"
      />
      <rect x="6" y="12" width="24" height="5" rx="1" className="gba:fill-primary" />
      <path
        d="M3 24v-5M3 24h30M33 24v-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="gba:text-muted-foreground"
      />
    </svg>
  )
}

export interface HeaderFooterPositionMarginControlsProps {
  testId: string
  marginUnit: 'cm' | 'in'
  hPos: string
  setHPos: (v: string) => void
  fPos: string
  setFPos: (v: string) => void
  applyMargins: () => void
}

export function HeaderFooterPositionMarginControls({
  testId,
  marginUnit,
  hPos,
  setHPos,
  fPos,
  setFPos,
  applyMargins
}: Readonly<HeaderFooterPositionMarginControlsProps>) {
  const { t } = useTranslation(translations)
  const unitSuffix = marginUnit === 'in' ? '"' : t('header-footer-sidebar-unit-cm')
  const step = marginUnit === 'in' ? 0.01 : 0.1

  return (
    <div
      className="gba:flex gba:w-full gba:flex-col gba:gap-4 gba:rounded-md gba:border gba:border-border/50 gba:bg-muted/15 gba:p-3"
      data-testid={`${testId}-position-margins`}
      onMouseDown={headerFooterSidebarPreventBlur}
    >
      <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
        <HeaderFromTopIllustration />
        <span className="gba:flex-1 gba:min-w-0 gba:text-sm gba:text-foreground gba:leading-tight">
          {t('header-footer-sidebar-header-from-top')}
        </span>
        <div className="gba:flex gba:items-center gba:gap-1.5 gba:shrink-0">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step={step}
            className="gba:h-9 gba:w-24 gba:text-right"
            value={hPos}
            onChange={e => setHPos(e.target.value)}
            onBlur={applyMargins}
            onKeyDown={e => e.key === 'Enter' && applyMargins()}
            onWheel={e => e.currentTarget.blur()}
            data-testid={`${testId}-pos-header`}
          />
          <span className="gba:text-sm gba:text-muted-foreground gba:tabular-nums gba:w-6">{unitSuffix}</span>
        </div>
      </div>
      <div className="gba:flex gba:items-center gba:gap-3 gba:min-w-0">
        <FooterFromBottomIllustration />
        <span className="gba:flex-1 gba:min-w-0 gba:text-sm gba:text-foreground gba:leading-tight">
          {t('header-footer-sidebar-footer-from-bottom')}
        </span>
        <div className="gba:flex gba:items-center gba:gap-1.5 gba:shrink-0">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step={step}
            className="gba:h-9 gba:w-24 gba:text-right"
            value={fPos}
            onChange={e => setFPos(e.target.value)}
            onBlur={applyMargins}
            onKeyDown={e => e.key === 'Enter' && applyMargins()}
            onWheel={e => e.currentTarget.blur()}
            data-testid={`${testId}-pos-footer`}
          />
          <span className="gba:text-sm gba:text-muted-foreground gba:tabular-nums gba:w-6">{unitSuffix}</span>
        </div>
      </div>
    </div>
  )
}
