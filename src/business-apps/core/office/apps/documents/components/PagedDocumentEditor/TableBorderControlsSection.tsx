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
import { DEFAULT_TABLE_CELL_BORDER_COLOR } from '@/components/tiptap-extensions/tiptap-custom-tables/types'
import { normalizeColorValue } from '@/components/tiptap-extensions/tiptap-custom-tables/styleUtils'
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

/** 6-digit #rrggbb for native color input (falls back to editor default border color when invalid). */
function hexForColorInput(value: string): string {
  const n = normalizeColorValue(value.trim())
  if (!n) return DEFAULT_TABLE_CELL_BORDER_COLOR
  if (/^#[0-9a-f]{6}$/i.test(n)) return n.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(n)) {
    const r = n[1]
    const g = n[2]
    const b = n[3]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return DEFAULT_TABLE_CELL_BORDER_COLOR
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
  /** Re-applied when style/width/color change so dropdowns take effect without an extra preset click. */
  const [lastPreset, setLastPreset] = useState<TableBorderPreset>('all')

  useEffect(() => {
    setBorderStyle(getSelectableBorderStyle(initialStyle))
  }, [initialStyle])

  useEffect(() => {
    setBorderWidth(initialWidth)
  }, [initialWidth])

  useEffect(() => {
    setBorderColor(initialColor)
  }, [initialColor])

  const applyOptions = () => ({
    style: borderStyle,
    width: borderWidth,
    color: borderColor.trim() || DEFAULT_TABLE_CELL_BORDER_COLOR
  })

  const applyWithPreset = (preset: TableBorderPreset) => {
    if (!canApplyBorders) return
    onApplyPreset(preset, applyOptions())
  }

  const applyPreset = (preset: TableBorderPreset) => {
    setLastPreset(preset)
    applyWithPreset(preset)
  }

  const reapplyLastPreset = (next: {
    style?: Exclude<TableBorderStyle, 'none'>
    width?: string
    color?: string | null
  }) => {
    if (!canApplyBorders) return
    const nextColor = next.color !== undefined ? next.color : borderColor
    const resolvedColor =
      typeof nextColor === 'string'
        ? nextColor.trim() || DEFAULT_TABLE_CELL_BORDER_COLOR
        : (nextColor ?? DEFAULT_TABLE_CELL_BORDER_COLOR)
    onApplyPreset(lastPreset, {
      style: next.style ?? borderStyle,
      width: next.width ?? borderWidth,
      color: resolvedColor
    })
  }

  const borderColorHexForPicker = hexForColorInput(borderColor)

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
            onValueChange={value => {
              const next = value as Exclude<TableBorderStyle, 'none'>
              setBorderStyle(next)
              reapplyLastPreset({ style: next })
            }}
          >
            <SelectTrigger
              id={`${testId}-style`}
              data-testid={`${testId}-style`}
              onMouseDown={preventEditorBlurOnMouseDown}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              data-document-table-sidebar-dropdown=""
              onOpenAutoFocus={event => event.preventDefault()}
              onCloseAutoFocus={event => event.preventDefault()}
            >
              {BORDER_STYLE_OPTIONS.map(option => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  data-testid={`${testId}-style-${option.value}`}
                  onMouseDown={preventEditorBlurOnMouseDown}
                >
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
          <Select
            value={borderWidth}
            onValueChange={value => {
              setBorderWidth(value)
              reapplyLastPreset({ width: value })
            }}
          >
            <SelectTrigger
              id={`${testId}-width`}
              data-testid={`${testId}-width`}
              onMouseDown={preventEditorBlurOnMouseDown}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              data-document-table-sidebar-dropdown=""
              onOpenAutoFocus={event => event.preventDefault()}
              onCloseAutoFocus={event => event.preventDefault()}
            >
              {BORDER_WIDTH_OPTIONS.map(option => (
                <SelectItem
                  key={option}
                  value={option}
                  data-testid={`${testId}-width-${option}`}
                  onMouseDown={preventEditorBlurOnMouseDown}
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="gba:space-y-2">
        <Label htmlFor={`${testId}-border-color-hex`} className="gba:text-xs gba:text-muted-foreground">
          {t('table-sidebar-border-color')}
        </Label>
        <div className="gba:flex gba:items-center gba:gap-2">
          <input
            type="color"
            value={borderColorHexForPicker}
            onChange={event => setBorderColor(event.target.value)}
            className="gba:h-10 gba:w-14 gba:cursor-pointer gba:rounded-md gba:border gba:border-input gba:shrink-0"
            data-testid={`${testId}-border-color-picker`}
            aria-label={t('table-sidebar-border-color')}
          />
          <Input
            id={`${testId}-border-color-hex`}
            value={borderColor}
            onChange={event => setBorderColor(event.target.value)}
            placeholder="#333333"
            className="gba:flex-1 gba:font-mono gba:text-sm"
            maxLength={32}
            data-testid={`${testId}-color`}
          />
          <Button
            type="button"
            variant="outline"
            className="gba:shrink-0"
            onMouseDown={preventEditorBlurOnMouseDown}
            onClick={() => reapplyLastPreset({ color: borderColor.trim() || DEFAULT_TABLE_CELL_BORDER_COLOR })}
            data-testid={`${testId}-border-color-apply`}
          >
            {t('table-sidebar-apply')}
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gba:w-full gba:text-muted-foreground"
          disabled={!canApplyBorders}
          onMouseDown={preventEditorBlurOnMouseDown}
          onClick={() => {
            setBorderColor(DEFAULT_TABLE_CELL_BORDER_COLOR)
            reapplyLastPreset({ color: DEFAULT_TABLE_CELL_BORDER_COLOR })
          }}
          data-testid={`${testId}-border-color-reset-default`}
        >
          {t('table-sidebar-reset-default')}
        </Button>
      </div>
    </section>
  )
}
