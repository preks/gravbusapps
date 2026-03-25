import { useEffect, useState } from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import type { TableBorderPreset } from '@/components/tiptap-extensions/tiptap-custom-tables/tableFormattingUtils'
import type { TableBorderStyle } from '@/components/tiptap-extensions/tiptap-custom-tables/types'
import translations from '../../_i18n'

const BORDER_STYLE_OPTIONS: ReadonlyArray<{ value: TableBorderStyle; labelKey: string }> = [
  { value: 'solid', labelKey: 'table-sidebar-border-style-solid' },
  { value: 'dashed', labelKey: 'table-sidebar-border-style-dashed' },
  { value: 'dotted', labelKey: 'table-sidebar-border-style-dotted' },
  { value: 'double', labelKey: 'table-sidebar-border-style-double' }
]

const BORDER_WIDTH_OPTIONS = ['0.75pt', '1pt', '1.5pt', '2.25pt', '3pt'] as const

const BORDER_PRESET_OPTIONS: ReadonlyArray<{ value: TableBorderPreset; labelKey: string }> = [
  { value: 'none', labelKey: 'table-sidebar-border-none' },
  { value: 'all', labelKey: 'table-sidebar-border-all' },
  { value: 'outside', labelKey: 'table-sidebar-border-outside' },
  { value: 'inside', labelKey: 'table-sidebar-border-inside' },
  { value: 'insideHorizontal', labelKey: 'table-sidebar-border-inside-horizontal' },
  { value: 'insideVertical', labelKey: 'table-sidebar-border-inside-vertical' },
  { value: 'top', labelKey: 'table-sidebar-border-top' },
  { value: 'right', labelKey: 'table-sidebar-border-right' },
  { value: 'bottom', labelKey: 'table-sidebar-border-bottom' },
  { value: 'left', labelKey: 'table-sidebar-border-left' }
]

function getSelectableBorderStyle(style: TableBorderStyle): Exclude<TableBorderStyle, 'none'> {
  return style === 'none' ? 'solid' : style
}

function preventEditorBlurOnMouseDown(event: React.MouseEvent<HTMLElement>) {
  event.preventDefault()
}

interface TableBorderControlsSectionProps {
  testId: string
  initialStyle: TableBorderStyle
  initialWidth: string
  initialColor: string
  canApplyBorders: boolean
  onApplyPreset: (
    preset: TableBorderPreset,
    options: { style: TableBorderStyle; width: string; color: string | null }
  ) => void
}

export function TableBorderControlsSection({
  testId,
  initialStyle,
  initialWidth,
  initialColor,
  canApplyBorders,
  onApplyPreset
}: Readonly<TableBorderControlsSectionProps>) {
  const { t } = useTranslation(translations)
  const [borderStyle, setBorderStyle] = useState<Exclude<TableBorderStyle, 'none'>>(
    getSelectableBorderStyle(initialStyle)
  )
  const [borderWidth, setBorderWidth] = useState(initialWidth)
  const [borderColor, setBorderColor] = useState(initialColor)

  useEffect(() => {
    setBorderStyle(getSelectableBorderStyle(initialStyle))
  }, [initialStyle])

  useEffect(() => {
    setBorderWidth(initialWidth)
  }, [initialWidth])

  useEffect(() => {
    setBorderColor(initialColor)
  }, [initialColor])

  const applyPreset = (preset: TableBorderPreset) => {
    onApplyPreset(preset, {
      style: borderStyle,
      width: borderWidth,
      color: borderColor.trim() || null
    })
  }

  return (
    <section className="gba:space-y-3">
      <div className="gba:space-y-1">
        <Label className="gba:text-xs gba:text-muted-foreground">{t('table-sidebar-section-borders')}</Label>
        <p className="gba:text-xs gba:text-muted-foreground">{t('table-sidebar-border-hint')}</p>
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
        {BORDER_PRESET_OPTIONS.map(option => (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            size="sm"
            disabled={!canApplyBorders}
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={() => applyPreset(option.value)}
            data-testid={`${testId}-preset-${option.value}`}
          >
            {t(option.labelKey)}
          </Button>
        ))}
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:gap-3">
        <div className="gba:space-y-1">
          <Label htmlFor={`${testId}-style`} className="gba:text-xs gba:text-muted-foreground">
            {t('table-sidebar-border-style')}
          </Label>
          <Select
            value={borderStyle}
            onValueChange={value => setBorderStyle(value as Exclude<TableBorderStyle, 'none'>)}
          >
            <SelectTrigger id={`${testId}-style`} data-testid={`${testId}-style`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BORDER_STYLE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value} data-testid={`${testId}-style-${option.value}`}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="gba:space-y-1">
          <Label htmlFor={`${testId}-width`} className="gba:text-xs gba:text-muted-foreground">
            {t('table-sidebar-border-width')}
          </Label>
          <Select value={borderWidth} onValueChange={setBorderWidth}>
            <SelectTrigger id={`${testId}-width`} data-testid={`${testId}-width`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BORDER_WIDTH_OPTIONS.map(option => (
                <SelectItem key={option} value={option} data-testid={`${testId}-width-${option}`}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="gba:space-y-1">
        <Label htmlFor={`${testId}-color`} className="gba:text-xs gba:text-muted-foreground">
          {t('table-sidebar-border-color')}
        </Label>
        <div className="gba:flex gba:gap-2">
          <Input
            id={`${testId}-color`}
            value={borderColor}
            onChange={event => setBorderColor(event.target.value)}
            placeholder="#2563EB"
            data-testid={`${testId}-color`}
          />
          <Button
            type="button"
            variant="outline"
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={() => setBorderColor('')}
            data-testid={`${testId}-color-clear`}
          >
            {t('editor-toolbar-table-border-clear')}
          </Button>
        </div>
      </div>
    </section>
  )
}
