import { useTranslation } from '@newwork/nw-design-system'
import type { PageNumberAlignment } from '../../types/document'
import translations from '../../_i18n'

export interface PageNumbersDialogPreviewProps {
  testId: string
  region: 'header' | 'footer'
  alignment: PageNumberAlignment
  labelPage1: string
  labelPage2: string
}

function previewBandLayout(alignment: PageNumberAlignment, oddMiniPage: boolean) {
  const row = 'gba:flex gba:w-full'
  switch (alignment) {
    case 'left':
      return `${row} gba:justify-start`
    case 'right':
      return `${row} gba:justify-end`
    case 'center':
      return `${row} gba:justify-center`
    case 'outside':
      return oddMiniPage ? `${row} gba:justify-end` : `${row} gba:justify-start`
    case 'inside':
      return oddMiniPage ? `${row} gba:justify-start` : `${row} gba:justify-end`
    default:
      return `${row} gba:justify-center`
  }
}

export function PageNumbersDialogPreview({
  testId,
  region,
  alignment,
  labelPage1,
  labelPage2
}: Readonly<PageNumbersDialogPreviewProps>) {
  const { t } = useTranslation(translations)

  const bandClass =
    region === 'header'
      ? 'gba:border-b gba:border-border gba:pb-1'
      : 'gba:border-t gba:border-border gba:pt-1 gba:mt-auto'

  const band = (label: string, oddMiniPage: boolean) => (
    <div className={`${bandClass} ${previewBandLayout(alignment, oddMiniPage)} gba:text-muted-foreground`}>{label}</div>
  )

  const pageInner = (label: string, oddMiniPage: boolean) => (
    <div
      className={`gba:flex-1 gba:min-h-0 ${region === 'header' ? 'gba:flex gba:flex-col' : 'gba:flex gba:flex-col gba:justify-end'}`}
    >
      {region === 'header' && band(label, oddMiniPage)}
      <div className="gba:flex-1 gba:border gba:border-dashed gba:border-border/40 gba:rounded-sm gba:bg-muted/20" />
      {region === 'footer' && band(label, oddMiniPage)}
    </div>
  )

  return (
    <div>
      <p className="gba:mb-2 gba:text-sm gba:font-medium">{t('page-numbers-preview')}</p>
      <div className="gba:flex gba:gap-3 gba:justify-center">
        <div
          className="gba:flex gba:h-28 gba:w-24 gba:flex-col gba:rounded-md gba:border gba:border-border gba:bg-card gba:p-2 gba:text-xs gba:shadow-sm"
          data-testid={`${testId}-preview-page-1`}
        >
          {pageInner(labelPage1, true)}
        </div>
        <div
          className="gba:flex gba:h-28 gba:w-24 gba:flex-col gba:rounded-md gba:border gba:border-border gba:bg-card gba:p-2 gba:text-xs gba:shadow-sm"
          data-testid={`${testId}-preview-page-2`}
        >
          {pageInner(labelPage2, false)}
        </div>
      </div>
    </div>
  )
}
