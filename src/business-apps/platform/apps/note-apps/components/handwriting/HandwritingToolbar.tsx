/**
 * HandwritingToolbar Component
 * Provides controls for pen color, width, paper style, and actions
 */

import React from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { Undo2, Redo2, Trash2 } from 'lucide-react'
import translations from '../../_i18n'
import type { PaperStyle } from './index'

interface HandwritingToolbarProps {
  penColor: string
  penWidth: number
  paperStyle: PaperStyle
  onPenColorChange: (color: string) => void
  onPenWidthChange: (width: number) => void
  onPaperStyleChange: (style: PaperStyle) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  canUndo: boolean
  canRedo: boolean
}

const PEN_COLORS = [
  { value: '#000000', labelKey: 'toolbar-pen-black' },
  { value: '#1e40af', labelKey: 'toolbar-pen-blue' },
  { value: '#dc2626', labelKey: 'toolbar-pen-red' },
  { value: '#16a34a', labelKey: 'toolbar-pen-green' },
  { value: '#9333ea', labelKey: 'toolbar-pen-purple' }
]

const PEN_WIDTHS = [
  { value: 2, labelKey: 'toolbar-pen-fine' },
  { value: 4, labelKey: 'toolbar-pen-medium' },
  { value: 8, labelKey: 'toolbar-pen-bold' }
]

const PAPER_STYLES: { value: PaperStyle; labelKey: string }[] = [
  { value: 'lined', labelKey: 'toolbar-paper-lined' },
  { value: 'grid', labelKey: 'toolbar-paper-grid' },
  { value: 'dotted', labelKey: 'toolbar-paper-dotted' },
  { value: 'plain', labelKey: 'toolbar-paper-plain' }
]

export const HandwritingToolbar: React.FC<HandwritingToolbarProps> = ({
  penColor,
  penWidth,
  paperStyle,
  onPenColorChange,
  onPenWidthChange,
  onPaperStyleChange,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo
}) => {
  const { t } = useTranslation(translations)
  return (
    <div className="gba:flex gba:items-center gba:gap-4 gba:px-4 gba:py-2 gba:border-b gba:bg-muted/30">
      {/* Pen Colors */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-1">{t('toolbar-color')}</span>
        {PEN_COLORS.map(color => (
          <button
            key={color.value}
            onClick={() => onPenColorChange(color.value)}
            className={`gba:w-6 gba:h-6 gba:rounded-full gba:border-2 gba:transition-transform ${
              penColor === color.value
                ? 'gba:scale-110 gba:border-primary'
                : 'gba:border-transparent hover:gba:scale-105'
            }`}
            style={{ backgroundColor: color.value }}
            title={t(color.labelKey)}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="gba:w-px gba:h-6 gba:bg-border" />

      {/* Pen Widths */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-1">{t('toolbar-size')}</span>
        {PEN_WIDTHS.map(width => (
          <button
            key={width.value}
            onClick={() => onPenWidthChange(width.value)}
            className={`gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:transition-colors ${
              penWidth === width.value
                ? 'gba:bg-primary gba:text-primary-foreground'
                : 'gba:bg-muted hover:gba:bg-muted/80'
            }`}
            title={t(width.labelKey)}
          >
            {t(width.labelKey)}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="gba:w-px gba:h-6 gba:bg-border" />

      {/* Paper Styles */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-1">{t('toolbar-paper')}</span>
        {PAPER_STYLES.map(style => (
          <button
            key={style.value}
            onClick={() => onPaperStyleChange(style.value)}
            className={`gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:transition-colors ${
              paperStyle === style.value
                ? 'gba:bg-primary gba:text-primary-foreground'
                : 'gba:bg-muted hover:gba:bg-muted/80'
            }`}
          >
            {t(style.labelKey)}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="gba:flex-1" />

      {/* Actions */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title={t('toolbar-undo')}
          data-testid="handwriting-toolbar-undo"
        >
          <Undo2 className="gba:w-4 gba:h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title={t('toolbar-redo')}
          data-testid="handwriting-toolbar-redo"
        >
          <Redo2 className="gba:w-4 gba:h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={!canUndo} title={t('toolbar-clear')}>
          <Trash2 className="gba:w-4 gba:h-4" />
        </Button>
      </div>
    </div>
  )
}
