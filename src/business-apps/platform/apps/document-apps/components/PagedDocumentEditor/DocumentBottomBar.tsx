import React from 'react'
import { Button, Slider, useTranslation } from '@newwork/nw-design-system'
import { ZoomIn, ZoomOut } from 'lucide-react'
import translations from '../../_i18n'

interface DocumentBottomBarProps {
  zoom: number
  wordCount: number
  charCount: number
  currentPage: number
  pageCount: number
  onZoomOut: () => void
  onZoomChange: (zoom: number) => void
  onZoomIn: () => void
  'data-testid'?: string
}

export function DocumentBottomBar({
  zoom,
  wordCount,
  charCount,
  currentPage,
  pageCount,
  onZoomOut,
  onZoomChange,
  onZoomIn,
  'data-testid': testId = 'document-bottom-bar'
}: Readonly<DocumentBottomBarProps>) {
  const { t } = useTranslation(translations)

  return (
    <div
      className="gba:flex gba:w-full gba:min-w-0 gba:items-center gba:justify-between gba:gap-4 gba:border-t gba:border-border/40 gba:bg-background gba:px-3 gba:py-1"
      data-testid={testId}
    >
      <div className="gba:flex gba:min-w-0 gba:flex-shrink gba:items-center gba:gap-2 gba:text-[11px] gba:text-muted-foreground">
        <span className="gba:min-w-0 gba:truncate">{t('editor-word-count', { count: wordCount })}</span>
        <span aria-hidden>•</span>
        <span className="gba:min-w-0 gba:truncate">{t('editor-character-count', { count: charCount })}</span>
        <span aria-hidden>•</span>
        <span className="gba:min-w-0 gba:truncate">
          {t('editor-page-of', { current: currentPage, total: pageCount })}
        </span>
      </div>

      <div className="gba:flex gba:flex-shrink-0 gba:items-center gba:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          title={t('editor-zoom-out')}
          className="gba:h-7 gba:w-7"
          data-testid={`${testId}-zoom-out`}
        >
          <ZoomOut className="gba:h-4 gba:w-4" />
        </Button>
        <div className="gba:flex gba:min-w-[132px] gba:items-center gba:gap-2">
          <Slider
            value={[zoom]}
            min={50}
            max={200}
            step={10}
            onValueChange={([value]) => onZoomChange(value)}
            data-testid={`${testId}-zoom-slider`}
          />
          <span
            className="gba:min-w-[38px] gba:text-[11px] gba:text-muted-foreground"
            data-testid={`${testId}-zoom-value`}
          >
            {zoom}%
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          title={t('editor-zoom-in')}
          className="gba:h-7 gba:w-7"
          data-testid={`${testId}-zoom-in`}
        >
          <ZoomIn className="gba:h-4 gba:w-4" />
        </Button>
      </div>
    </div>
  )
}

export default DocumentBottomBar
