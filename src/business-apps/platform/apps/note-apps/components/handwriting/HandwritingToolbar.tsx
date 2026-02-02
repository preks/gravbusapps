/**
 * HandwritingToolbar Component
 * Provides controls for pen color, width, paper style, and actions
 */

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Undo2, Trash2 } from 'lucide-react'
import type { PaperStyle } from './index'

interface HandwritingToolbarProps {
  penColor: string
  penWidth: number
  paperStyle: PaperStyle
  onPenColorChange: (color: string) => void
  onPenWidthChange: (width: number) => void
  onPaperStyleChange: (style: PaperStyle) => void
  onUndo: () => void
  onClear: () => void
  canUndo: boolean
}

const PEN_COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#1e40af', label: 'Blue' },
  { value: '#dc2626', label: 'Red' },
  { value: '#16a34a', label: 'Green' },
  { value: '#9333ea', label: 'Purple' }
]

const PEN_WIDTHS = [
  { value: 2, label: 'Fine' },
  { value: 4, label: 'Medium' },
  { value: 8, label: 'Bold' }
]

const PAPER_STYLES: { value: PaperStyle; label: string }[] = [
  { value: 'lined', label: 'Lined' },
  { value: 'grid', label: 'Grid' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'plain', label: 'Plain' }
]

export const HandwritingToolbar: React.FC<HandwritingToolbarProps> = ({
  penColor,
  penWidth,
  paperStyle,
  onPenColorChange,
  onPenWidthChange,
  onPaperStyleChange,
  onUndo,
  onClear,
  canUndo
}) => {
  return (
    <div className="gba:flex gba:items-center gba:gap-4 gba:px-4 gba:py-2 gba:border-b gba:bg-muted/30">
      {/* Pen Colors */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-1">Color:</span>
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
            title={color.label}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="gba:w-px gba:h-6 gba:bg-border" />

      {/* Pen Widths */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-1">Size:</span>
        {PEN_WIDTHS.map(width => (
          <button
            key={width.value}
            onClick={() => onPenWidthChange(width.value)}
            className={`gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:transition-colors ${
              penWidth === width.value
                ? 'gba:bg-primary gba:text-primary-foreground'
                : 'gba:bg-muted hover:gba:bg-muted/80'
            }`}
            title={width.label}
          >
            {width.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="gba:w-px gba:h-6 gba:bg-border" />

      {/* Paper Styles */}
      <div className="gba:flex gba:items-center gba:gap-1">
        <span className="gba:text-xs gba:text-muted-foreground gba:mr-1">Paper:</span>
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
            {style.label}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="gba:flex-1" />

      {/* Actions */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo} title="Undo last stroke">
          <Undo2 className="gba:w-4 gba:h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={!canUndo} title="Clear all">
          <Trash2 className="gba:w-4 gba:h-4" />
        </Button>
      </div>
    </div>
  )
}
