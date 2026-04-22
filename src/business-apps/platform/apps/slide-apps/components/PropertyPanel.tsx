/**
 * PropertyPanel - Styling panel for selected elements
 */

import React, { useState, useRef } from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Separator,
  Switch,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Copy,
  Lock,
  Unlock,
  MoveUp,
  MoveDown,
  RotateCcw,
  ChevronDown,
  Palette,
  Upload,
  Plus,
  X
} from 'lucide-react'
import type {
  AnySlideElement,
  TextElement,
  ShapeElement,
  ImageElement,
  VideoElement,
  ChartElement,
  ChartDataPoint,
  ChartSeries,
  CodeElement,
  ChartType,
  GradientConfig,
  SlideTransition,
  SlideTransitionType,
  TransitionTrigger
} from './slideElements'
import {
  FONT_FAMILIES,
  FONT_SIZES,
  COLOR_PRESETS,
  PRESET_GRADIENTS,
  CHART_TYPES,
  CODE_LANGUAGES,
  CODE_FONT_SIZES,
  gradientToCss,
  DEFAULT_TRANSITION
} from './slideElements'
import { GradientBuilder } from './GradientBuilder'
import { TransitionPreview } from './TransitionPreview'
import { sanitizeImageSourceUrl } from '@/common/utils/safeUrlUtils'
import translations from '../_i18n'

const TRANSITION_TYPES: { value: SlideTransitionType; label: string }[] = [
  { value: 'none', label: 'transition-none' },
  { value: 'fade', label: 'transition-fade' },
  { value: 'slide-left', label: 'transition-slide-left' },
  { value: 'slide-right', label: 'transition-slide-right' },
  { value: 'slide-up', label: 'transition-slide-up' },
  { value: 'slide-down', label: 'transition-slide-down' },
  { value: 'push-left', label: 'transition-push-left' },
  { value: 'push-right', label: 'transition-push-right' },
  { value: 'zoom-in', label: 'transition-zoom-in' },
  { value: 'zoom-out', label: 'transition-zoom-out' },
  { value: 'flip', label: 'transition-flip' },
  { value: 'cube', label: 'transition-cube' },
  { value: 'dissolve', label: 'transition-dissolve' }
]

// Extracted as stable components to prevent remount on parent re-render

function PanelColorPicker({
  value,
  onChange,
  label
}: {
  value: string
  onChange: (color: string) => void
  label: string
}) {
  return (
    <div className="gba:space-y-2">
      <Label className="gba:text-xs">{label}</Label>
      <div className="gba:flex gba:gap-2 gba:items-center">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="gba:w-8 gba:h-8 gba:rounded gba:border gba:cursor-pointer"
        />
        <Input value={value} onChange={e => onChange(e.target.value)} className="gba:flex-1 gba:text-xs" />
      </div>
      <div className="gba:flex gba:flex-wrap gba:gap-1">
        {COLOR_PRESETS.slice(0, 12).map(color => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className="gba:w-5 gba:h-5 gba:rounded gba:border gba:border-muted hover:gba:scale-110 gba:transition-transform"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  )
}

function PanelGradientSection({
  gradient,
  onChange
}: {
  gradient?: GradientConfig
  onChange: (gradient: GradientConfig | undefined) => void
}) {
  const { t } = useTranslation(translations)
  const [showBuilder, setShowBuilder] = useState(false)

  return (
    <Collapsible open={showBuilder} onOpenChange={setShowBuilder}>
      <div className="gba:space-y-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <Label className="gba:text-xs gba:font-semibold">{t('props-gradient-fill')}</Label>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gba:h-7">
              <Palette className="gba:w-3 gba:h-3 gba:mr-1" />
              {showBuilder ? t('props-close') : t('props-custom')}
              <ChevronDown
                className={`gba:w-3 gba:h-3 gba:ml-1 gba:transition-transform ${showBuilder ? 'gba:rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Quick Presets */}
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          <button
            onClick={() => onChange(undefined)}
            className={`gba:w-8 gba:h-8 gba:rounded gba:border-2 gba:flex gba:items-center gba:justify-center gba:text-xs ${!gradient ? 'gba:border-primary gba:bg-muted' : 'gba:border-muted'}`}
            title={t('props-no-gradient')}
          >
            ✕
          </button>
          {PRESET_GRADIENTS.map(preset => (
            <button
              key={preset.name}
              onClick={() => onChange(preset.gradient)}
              className={`gba:w-8 gba:h-8 gba:rounded gba:border-2 hover:gba:scale-110 gba:transition-transform ${gradient && gradientToCss(gradient) === gradientToCss(preset.gradient) ? 'gba:border-primary gba:shadow-md' : 'gba:border-muted'}`}
              style={{ background: gradientToCss(preset.gradient) }}
              title={preset.name}
            />
          ))}
        </div>

        {/* Current gradient preview */}
        <div
          className="gba:h-8 gba:rounded gba:border gba:shadow-inner"
          style={{
            background: gradient ? gradientToCss(gradient) : 'transparent',
            visibility: gradient ? 'visible' : 'hidden'
          }}
        />

        {/* Custom Gradient Builder */}
        <CollapsibleContent>
          <div className="gba:mt-3 gba:p-3 gba:border gba:rounded-lg gba:bg-muted/30">
            <GradientBuilder gradient={gradient} onChange={onChange} onClose={() => setShowBuilder(false)} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

const SERIES_COLORS = ['#2563eb', '#e11d48', '#16a34a', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

function ChartDataEditor({
  data,
  series,
  onUpdate,
  t
}: {
  data: ChartDataPoint[]
  series: ChartSeries[]
  onUpdate: (updates: Partial<AnySlideElement>) => void
  t: (key: string) => string
}) {
  const handleSeriesLabelChange = (index: number, label: string) => {
    const updated = series.map((s, i) => (i === index ? { ...s, label } : s))
    onUpdate({ series: updated })
  }

  const handleSeriesColorChange = (index: number, color: string) => {
    const updated = series.map((s, i) => (i === index ? { ...s, color } : s))
    onUpdate({ series: updated })
  }

  const handleAddSeries = () => {
    const newKey = `value${series.length + 1}`
    const newSeries: ChartSeries = {
      key: newKey,
      label: `Series ${series.length + 1}`,
      color: SERIES_COLORS[series.length % SERIES_COLORS.length]
    }
    const updatedData = data.map(row => ({ ...row, [newKey]: 0 }))
    onUpdate({ series: [...series, newSeries], data: updatedData })
  }

  const handleRemoveSeries = (index: number) => {
    if (series.length <= 1) return
    const removedKey = series[index].key
    const updatedSeries = series.filter((_, i) => i !== index)
    const updatedData = data.map(
      row => Object.fromEntries(Object.entries(row).filter(([k]) => k !== removedKey)) as ChartDataPoint
    )
    onUpdate({ series: updatedSeries, data: updatedData })
  }

  const handleDataLabelChange = (rowIndex: number, label: string) => {
    const updated = data.map((row, i) => (i === rowIndex ? { ...row, label } : row))
    onUpdate({ data: updated })
  }

  const handleDataValueChange = (rowIndex: number, key: string, value: string) => {
    const numValue = value === '' ? 0 : Number(value)
    if (isNaN(numValue)) return
    const updated = data.map((row, i) => (i === rowIndex ? { ...row, [key]: numValue } : row))
    onUpdate({ data: updated })
  }

  const handleAddRow = () => {
    const newRow: ChartDataPoint = { label: `Item ${data.length + 1}` }
    series.forEach(s => {
      ;(newRow as Record<string, string | number>)[s.key] = 0
    })
    onUpdate({ data: [...data, newRow] })
  }

  const handleRemoveRow = (rowIndex: number) => {
    if (data.length <= 1) return
    onUpdate({ data: data.filter((_, i) => i !== rowIndex) })
  }

  return (
    <Collapsible>
      <CollapsibleTrigger className="gba:flex gba:w-full gba:items-center gba:justify-between gba:py-1">
        <Label className="gba:text-xs gba:font-semibold">{t('props-chart-data')}</Label>
        <ChevronDown className="gba:h-4 gba:w-4" />
      </CollapsibleTrigger>
      <CollapsibleContent className="gba:space-y-3 gba:pt-2">
        {/* Series Management */}
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">{t('props-chart-series')}</Label>
            <Button variant="ghost" size="sm" className="gba:h-6 gba:px-2 gba:text-xs" onClick={handleAddSeries}>
              <Plus className="gba:w-3 gba:h-3 gba:mr-1" />
              {t('props-chart-add-series')}
            </Button>
          </div>

          {series.map((s, i) => (
            <div key={s.key} className="gba:flex gba:items-center gba:gap-1">
              <input
                type="color"
                value={s.color || SERIES_COLORS[i % SERIES_COLORS.length]}
                onChange={e => handleSeriesColorChange(i, e.target.value)}
                className="gba:w-6 gba:h-6 gba:rounded gba:border gba:cursor-pointer gba:shrink-0"
              />
              <Input
                value={s.label}
                onChange={e => handleSeriesLabelChange(i, e.target.value)}
                className="gba:text-xs gba:h-7 gba:flex-1"
              />
              {series.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gba:h-6 gba:w-6 gba:p-0 gba:shrink-0"
                  onClick={() => handleRemoveSeries(i)}
                >
                  <X className="gba:w-3 gba:h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Data Table */}
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">{t('props-chart-data-rows')}</Label>
            <Button variant="ghost" size="sm" className="gba:h-6 gba:px-2 gba:text-xs" onClick={handleAddRow}>
              <Plus className="gba:w-3 gba:h-3 gba:mr-1" />
              {t('props-chart-add-row')}
            </Button>
          </div>

          <div className="gba:border gba:rounded gba:overflow-hidden">
            {/* Header */}
            <div
              className="gba:grid gba:gap-px gba:bg-muted/50 gba:text-xs gba:font-medium gba:border-b"
              style={{
                gridTemplateColumns: `minmax(60px, 1fr) ${series.map(() => 'minmax(50px, 1fr)').join(' ')} 28px`
              }}
            >
              <div className="gba:px-2 gba:py-1 gba:bg-background">{t('props-chart-label')}</div>
              {series.map(s => (
                <div key={s.key} className="gba:px-2 gba:py-1 gba:bg-background gba:truncate" title={s.label}>
                  {s.label}
                </div>
              ))}
              <div className="gba:bg-background" />
            </div>

            {/* Rows */}
            {data.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="gba:grid gba:gap-px gba:bg-muted/30 gba:text-xs"
                style={{
                  gridTemplateColumns: `minmax(60px, 1fr) ${series.map(() => 'minmax(50px, 1fr)').join(' ')} 28px`
                }}
              >
                <input
                  value={row.label}
                  onChange={e => handleDataLabelChange(rowIndex, e.target.value)}
                  className="gba:px-2 gba:py-1 gba:bg-background gba:border-0 gba:outline-none gba:text-xs gba:w-full"
                />
                {series.map(s => (
                  <input
                    key={s.key}
                    type="number"
                    value={row[s.key] ?? 0}
                    onChange={e => handleDataValueChange(rowIndex, s.key, e.target.value)}
                    className="gba:px-2 gba:py-1 gba:bg-background gba:border-0 gba:outline-none gba:text-xs gba:w-full"
                  />
                ))}
                <div className="gba:flex gba:items-center gba:justify-center gba:bg-background">
                  {data.length > 1 && (
                    <button
                      onClick={() => handleRemoveRow(rowIndex)}
                      className="gba:text-muted-foreground hover:gba:text-destructive gba:transition-colors"
                    >
                      <X className="gba:w-3 gba:h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface PropertyPanelProps {
  element: AnySlideElement | null
  onUpdate: (updates: Partial<AnySlideElement>) => void
  onDelete: () => void
  onDuplicate: () => void
  onBringForward: () => void
  onSendBackward: () => void
  slideTransition?: SlideTransition
  onSlideTransitionChange?: (transition: SlideTransition) => void
  slideIndex?: number
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  slideTransition,
  onSlideTransitionChange,
  slideIndex = 0
}) => {
  const { t } = useTranslation(translations)
  const replaceImageInputRef = useRef<HTMLInputElement>(null)

  const currentTransition = slideTransition || DEFAULT_TRANSITION

  const handleTransitionChange = (updates: Partial<SlideTransition>) => {
    if (onSlideTransitionChange) {
      onSlideTransitionChange({ ...currentTransition, ...updates })
    }
  }

  const handleReplaceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      onUpdate({ src: reader.result as string })
    }
    reader.readAsDataURL(file)

    if (replaceImageInputRef.current) {
      replaceImageInputRef.current.value = ''
    }
  }

  if (!element) {
    return (
      <div className="gba:p-4 gba:space-y-4">
        <div className="gba:text-center gba:text-muted-foreground gba:mb-4">
          <p className="gba:text-sm">{t('props-select-element')}</p>
        </div>

        {onSlideTransitionChange && (
          <>
            <Separator />

            <Collapsible defaultOpen>
              <CollapsibleTrigger className="gba:flex gba:w-full gba:items-center gba:justify-between gba:py-2">
                <Label className="gba:text-xs gba:font-semibold">{t('transition-title')}</Label>
                <ChevronDown className="gba:h-4 gba:w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="gba:space-y-4 gba:pt-2">
                {/* Transition Type */}
                <div>
                  <Label className="gba:text-xs gba:mb-1 gba:block">{t('transition-type')}</Label>
                  <Select
                    value={currentTransition.type}
                    onValueChange={(value: SlideTransitionType) => handleTransitionChange({ type: value })}
                  >
                    <SelectTrigger className="gba:text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSITION_TYPES.map(tt => (
                        <SelectItem key={tt.value} value={tt.value}>
                          {t(tt.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration */}
                <div>
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                    <Label className="gba:text-xs">{t('transition-duration')}</Label>
                    <span className="gba:text-xs gba:text-muted-foreground">{currentTransition.duration}ms</span>
                  </div>
                  <Slider
                    value={[currentTransition.duration]}
                    min={300}
                    max={3000}
                    step={100}
                    onValueChange={([value]) => handleTransitionChange({ duration: value })}
                    disabled={currentTransition.type === 'none'}
                  />
                </div>

                {/* Trigger */}
                <div>
                  <Label className="gba:text-xs gba:mb-1 gba:block">{t('transition-trigger')}</Label>
                  <Select
                    value={currentTransition.trigger}
                    onValueChange={(value: TransitionTrigger) => handleTransitionChange({ trigger: value })}
                    disabled={currentTransition.type === 'none'}
                  >
                    <SelectTrigger className="gba:text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on-click">{t('transition-trigger-click')}</SelectItem>
                      <SelectItem value="auto">{t('transition-trigger-auto')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Delay (only for auto trigger) */}
                {currentTransition.trigger === 'auto' && (
                  <div>
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                      <Label className="gba:text-xs">{t('transition-delay')}</Label>
                      <span className="gba:text-xs gba:text-muted-foreground">{currentTransition.delay}ms</span>
                    </div>
                    <Slider
                      value={[currentTransition.delay]}
                      min={0}
                      max={5000}
                      step={100}
                      onValueChange={([value]) => handleTransitionChange({ delay: value })}
                      disabled={currentTransition.type === 'none'}
                    />
                  </div>
                )}

                {/* Preview */}
                <div>
                  <Label className="gba:text-xs gba:mb-2 gba:block">{t('transition-preview')}</Label>
                  <TransitionPreview transition={currentTransition} slideIndex={slideIndex + 1} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>
    )
  }

  const textElement = element.type === 'text' ? (element as TextElement) : null
  const shapeElement = element.type === 'shape' ? (element as ShapeElement) : null
  const imageElement = element.type === 'image' ? (element as ImageElement) : null
  const videoElement = element.type === 'video' ? (element as VideoElement) : null
  const codeElement = element.type === 'code' ? (element as CodeElement) : null
  const chartElement = element.type === 'chart' ? (element as ChartElement) : null

  return (
    <div className="gba:p-4 gba:space-y-4 gba:overflow-y-auto gba:h-full">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <span className="gba:font-semibold gba:capitalize">{element.type}</span>
        <div className="gba:flex gba:gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onUpdate({ locked: !element.locked })}
            title={element.locked ? t('props-unlock') : t('props-lock')}
          >
            {element.locked ? <Lock className="gba:w-4 gba:h-4" /> : <Unlock className="gba:w-4 gba:h-4" />}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDuplicate} title={t('props-duplicate')}>
            <Copy className="gba:w-4 gba:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            title={t('props-delete')}
            className="gba:text-destructive"
          >
            <Trash2 className="gba:w-4 gba:h-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Position & Size */}
      <div className="gba:space-y-3">
        <Label className="gba:text-xs gba:font-semibold">{t('props-position-size')}</Label>
        <div className="gba:grid gba:grid-cols-2 gba:gap-2">
          <div>
            <Label className="gba:text-xs">{t('props-position-x')}</Label>
            <Input
              type="number"
              value={Math.round(element.position.x)}
              onChange={e => onUpdate({ position: { ...element.position, x: Number(e.target.value) } })}
              className="gba:text-xs"
            />
          </div>
          <div>
            <Label className="gba:text-xs">{t('props-position-y')}</Label>
            <Input
              type="number"
              value={Math.round(element.position.y)}
              onChange={e => onUpdate({ position: { ...element.position, y: Number(e.target.value) } })}
              className="gba:text-xs"
            />
          </div>
          <div>
            <Label className="gba:text-xs">{t('props-width')}</Label>
            <Input
              type="number"
              value={Math.round(element.size.width)}
              onChange={e => onUpdate({ size: { ...element.size, width: Number(e.target.value) } })}
              className="gba:text-xs"
            />
          </div>
          <div>
            <Label className="gba:text-xs">{t('props-height')}</Label>
            <Input
              type="number"
              value={Math.round(element.size.height)}
              onChange={e => onUpdate({ size: { ...element.size, height: Number(e.target.value) } })}
              className="gba:text-xs"
            />
          </div>
        </div>
      </div>

      {/* Rotation & Opacity */}
      <div className="gba:space-y-3">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Label className="gba:text-xs gba:flex-1">{t('props-rotation')}</Label>
          <Input
            type="number"
            value={element.rotation}
            onChange={e => onUpdate({ rotation: Number(e.target.value) })}
            className="gba:w-16 gba:text-xs"
          />
          <span className="gba:text-xs">°</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onUpdate({ rotation: 0 })}
            title={t('props-reset-rotation')}
          >
            <RotateCcw className="gba:w-3 gba:h-3" />
          </Button>
        </div>
        <div>
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
            <Label className="gba:text-xs">{t('props-opacity')}</Label>
            <span className="gba:text-xs gba:text-muted-foreground">{Math.round(element.opacity * 100)}%</span>
          </div>
          <Slider
            value={[element.opacity * 100]}
            min={0}
            max={100}
            step={1}
            onValueChange={([value]) => onUpdate({ opacity: value / 100 })}
          />
        </div>
      </div>

      {/* Layer Order */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <Label className="gba:text-xs gba:flex-1">{t('props-layer')}</Label>
        <Button variant="outlined" size="sm" onClick={onBringForward}>
          <MoveUp className="gba:w-3 gba:h-3 gba:mr-1" />
          {t('props-forward')}
        </Button>
        <Button variant="outlined" size="sm" onClick={onSendBackward}>
          <MoveDown className="gba:w-3 gba:h-3 gba:mr-1" />
          {t('props-back')}
        </Button>
      </div>

      <Separator />

      {/* TEXT PROPERTIES */}
      {textElement && (
        <div className="gba:space-y-4">
          <Label className="gba:text-xs gba:font-semibold">{t('props-text-formatting')}</Label>

          {/* Font Family */}
          <div>
            <Label className="gba:text-xs">{t('props-font-family')}</Label>
            <Select value={textElement.fontFamily} onValueChange={value => onUpdate({ fontFamily: value })}>
              <SelectTrigger className="gba:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map(font => (
                  <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div>
            <Label className="gba:text-xs">{t('props-font-size')}</Label>
            <Select value={String(textElement.fontSize)} onValueChange={value => onUpdate({ fontSize: Number(value) })}>
              <SelectTrigger className="gba:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map(size => (
                  <SelectItem key={size} value={String(size)}>
                    {size}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Style Buttons */}
          <div className="gba:flex gba:gap-1">
            <Button
              variant={textElement.fontWeight === 'bold' ? 'default' : 'outlined'}
              size="icon-sm"
              onClick={() => onUpdate({ fontWeight: textElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
            >
              <Bold className="gba:w-4 gba:h-4" />
            </Button>
            <Button
              variant={textElement.fontStyle === 'italic' ? 'default' : 'outlined'}
              size="icon-sm"
              onClick={() => onUpdate({ fontStyle: textElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
            >
              <Italic className="gba:w-4 gba:h-4" />
            </Button>
            <Button
              variant={textElement.textDecoration === 'underline' ? 'default' : 'outlined'}
              size="icon-sm"
              onClick={() =>
                onUpdate({ textDecoration: textElement.textDecoration === 'underline' ? 'none' : 'underline' })
              }
            >
              <Underline className="gba:w-4 gba:h-4" />
            </Button>
            <Button
              variant={textElement.textDecoration === 'line-through' ? 'default' : 'outlined'}
              size="icon-sm"
              onClick={() =>
                onUpdate({ textDecoration: textElement.textDecoration === 'line-through' ? 'none' : 'line-through' })
              }
            >
              <Strikethrough className="gba:w-4 gba:h-4" />
            </Button>
          </div>

          {/* Text Alignment */}
          <div className="gba:flex gba:gap-1">
            <Button
              variant={textElement.textAlign === 'left' ? 'default' : 'outlined'}
              size="icon-sm"
              onClick={() => onUpdate({ textAlign: 'left' })}
            >
              <AlignLeft className="gba:w-4 gba:h-4" />
            </Button>
            <Button
              variant={textElement.textAlign === 'center' ? 'default' : 'outlined'}
              size="icon-sm"
              onClick={() => onUpdate({ textAlign: 'center' })}
            >
              <AlignCenter className="gba:w-4 gba:h-4" />
            </Button>
            <Button
              variant={textElement.textAlign === 'right' ? 'default' : 'outlined'}
              size="icon-sm"
              onClick={() => onUpdate({ textAlign: 'right' })}
            >
              <AlignRight className="gba:w-4 gba:h-4" />
            </Button>
          </div>

          {/* Text Color */}
          <PanelColorPicker
            value={textElement.color}
            onChange={color => onUpdate({ color })}
            label={t('props-text-color')}
          />

          {/* Background Color */}
          <PanelColorPicker
            value={textElement.backgroundColor === 'transparent' ? '#ffffff' : textElement.backgroundColor}
            onChange={color => onUpdate({ backgroundColor: color, gradient: undefined })}
            label={t('props-background-color')}
          />

          {/* Gradient */}
          <PanelGradientSection
            gradient={textElement.gradient}
            onChange={gradient => {
              if (gradient) {
                onUpdate({ gradient, backgroundColor: 'transparent' })
              } else {
                const restoredBg =
                  textElement.backgroundColor === 'transparent' ? '#ffffff' : textElement.backgroundColor
                onUpdate({ gradient, backgroundColor: restoredBg })
              }
            }}
          />

          {/* Line Height */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">{t('props-line-height')}</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{textElement.lineHeight}</span>
            </div>
            <Slider
              value={[textElement.lineHeight * 100]}
              min={80}
              max={200}
              step={10}
              onValueChange={([value]) => onUpdate({ lineHeight: value / 100 })}
            />
          </div>

          {/* Letter Spacing */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">{t('props-letter-spacing')}</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{textElement.letterSpacing}px</span>
            </div>
            <Slider
              value={[textElement.letterSpacing]}
              min={-5}
              max={20}
              step={1}
              onValueChange={([value]) => onUpdate({ letterSpacing: value })}
            />
          </div>
        </div>
      )}

      {/* SHAPE PROPERTIES */}
      {shapeElement && (
        <div className="gba:space-y-4">
          <Label className="gba:text-xs gba:font-semibold">{t('props-shape-styling')}</Label>

          {/* Fill Color */}
          <PanelColorPicker
            value={shapeElement.fill}
            onChange={fill => onUpdate({ fill, gradient: undefined })}
            label={t('props-fill-color')}
          />

          {/* Gradient */}
          <PanelGradientSection gradient={shapeElement.gradient} onChange={gradient => onUpdate({ gradient })} />

          {/* Stroke Color */}
          <PanelColorPicker
            value={shapeElement.strokeColor}
            onChange={strokeColor => onUpdate({ strokeColor })}
            label={t('props-stroke-color')}
          />

          {/* Stroke Width */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">{t('props-stroke-width')}</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{shapeElement.strokeWidth}px</span>
            </div>
            <Slider
              value={[shapeElement.strokeWidth]}
              min={0}
              max={20}
              step={1}
              onValueChange={([value]) => onUpdate({ strokeWidth: value })}
            />
          </div>

          {/* Stroke Style */}
          <div>
            <Label className="gba:text-xs">{t('props-stroke-style')}</Label>
            <Select
              value={shapeElement.strokeStyle}
              onValueChange={(value: 'solid' | 'dashed' | 'dotted') => onUpdate({ strokeStyle: value })}
            >
              <SelectTrigger className="gba:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">{t('props-solid')}</SelectItem>
                <SelectItem value="dashed">{t('props-dashed')}</SelectItem>
                <SelectItem value="dotted">{t('props-dotted')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Corner Radius */}
          {(shapeElement.shapeType === 'rectangle' || shapeElement.shapeType === 'rounded-rectangle') && (
            <div>
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                <Label className="gba:text-xs">{t('props-corner-radius')}</Label>
                <span className="gba:text-xs gba:text-muted-foreground">{shapeElement.cornerRadius}px</span>
              </div>
              <Slider
                value={[shapeElement.cornerRadius]}
                min={0}
                max={50}
                step={1}
                onValueChange={([value]) => onUpdate({ cornerRadius: value })}
              />
            </div>
          )}

          {/* Shadow */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">{t('props-drop-shadow')}</Label>
            <Switch checked={shapeElement.shadow} onCheckedChange={shadow => onUpdate({ shadow })} />
          </div>
        </div>
      )}

      {/* CODE PROPERTIES */}
      {codeElement && (
        <div className="gba:space-y-4">
          <Label className="gba:text-xs gba:font-semibold">{t('props-code-styling')}</Label>

          {/* Language */}
          <div>
            <Label className="gba:text-xs">{t('props-code-language')}</Label>
            <Select value={codeElement.language} onValueChange={value => onUpdate({ language: value })}>
              <SelectTrigger className="gba:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CODE_LANGUAGES.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Theme */}
          <div>
            <Label className="gba:text-xs">{t('props-code-theme')}</Label>
            <Select value={codeElement.theme} onValueChange={(value: 'dark' | 'light') => onUpdate({ theme: value })}>
              <SelectTrigger className="gba:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">{t('props-code-theme-dark')}</SelectItem>
                <SelectItem value="light">{t('props-code-theme-light')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div>
            <Label className="gba:text-xs">{t('props-code-font-size')}</Label>
            <Select value={String(codeElement.fontSize)} onValueChange={value => onUpdate({ fontSize: Number(value) })}>
              <SelectTrigger className="gba:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CODE_FONT_SIZES.map(size => (
                  <SelectItem key={size} value={String(size)}>
                    {size}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show Line Numbers */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">{t('props-code-show-line-numbers')}</Label>
            <Switch
              checked={codeElement.showLineNumbers}
              onCheckedChange={showLineNumbers => onUpdate({ showLineNumbers })}
            />
          </div>

          <Separator />

          {/* Text Color */}
          <PanelColorPicker
            value={codeElement.textColor || (codeElement.theme === 'dark' ? '#d4d4d4' : '#333333')}
            onChange={textColor => onUpdate({ textColor })}
            label={t('props-text-color')}
          />

          {/* Background Color */}
          <PanelColorPicker
            value={codeElement.backgroundColor || (codeElement.theme === 'dark' ? '#1e1e1e' : '#f8f8f8')}
            onChange={backgroundColor => onUpdate({ backgroundColor })}
            label={t('props-background-color')}
          />

          {/* Border Radius */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">{t('props-border-radius')}</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{codeElement.borderRadius ?? 8}px</span>
            </div>
            <Slider
              value={[codeElement.borderRadius ?? 8]}
              min={0}
              max={32}
              step={1}
              onValueChange={([value]) => onUpdate({ borderRadius: value })}
            />
          </div>

          {/* Border Width */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">{t('props-border-width')}</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{codeElement.borderWidth ?? 0}px</span>
            </div>
            <Slider
              value={[codeElement.borderWidth ?? 0]}
              min={0}
              max={10}
              step={1}
              onValueChange={([value]) => onUpdate({ borderWidth: value })}
            />
          </div>

          {/* Border Color */}
          <PanelColorPicker
            value={codeElement.borderColor || '#333333'}
            onChange={borderColor => onUpdate({ borderColor })}
            label={t('props-border-color')}
          />

          {/* Padding */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">{t('props-code-padding')}</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{codeElement.padding ?? 16}px</span>
            </div>
            <Slider
              value={[codeElement.padding ?? 16]}
              min={0}
              max={48}
              step={2}
              onValueChange={([value]) => onUpdate({ padding: value })}
            />
          </div>

          {/* Shadow */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">{t('props-drop-shadow')}</Label>
            <Switch checked={codeElement.shadow ?? false} onCheckedChange={shadow => onUpdate({ shadow })} />
          </div>
        </div>
      )}

      {/* IMAGE PROPERTIES */}
      {imageElement && (
        <div className="gba:space-y-4">
          {/* Image Source */}
          <div className="gba:space-y-3">
            <Label className="gba:text-xs gba:font-semibold">{t('props-image-source')}</Label>

            {/* Current image preview */}
            <div className="gba:w-full gba:h-20 gba:rounded gba:overflow-hidden gba:bg-muted gba:border">
              {sanitizeImageSourceUrl(imageElement.src, { allowRelative: true, allowBlob: true, allowData: true }) && (
                <div className="gba:flex gba:h-full gba:items-center gba:justify-center gba:text-xs gba:text-muted-foreground">
                  {t('props-image-preview-ready')}
                </div>
              )}
            </div>

            {/* Replace image button */}
            <div className="gba:flex gba:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => replaceImageInputRef.current?.click()}
                className="gba:text-xs"
              >
                <Upload className="gba:w-3 gba:h-3 gba:mr-1" />
                {t('props-replace-image')}
              </Button>
              <input
                ref={replaceImageInputRef}
                type="file"
                accept="image/*"
                className="gba:hidden"
                onChange={handleReplaceImage}
              />
            </div>

            {/* Alt text */}
            <div>
              <Label className="gba:text-xs">{t('props-alt-text')}</Label>
              <Input
                value={imageElement.alt}
                onChange={e => onUpdate({ alt: e.target.value })}
                placeholder={t('props-alt-text-placeholder')}
                className="gba:mt-1 gba:text-xs"
              />
            </div>
          </div>

          <Separator />

          <Label className="gba:text-xs gba:font-semibold">{t('props-image-styling')}</Label>

          {/* Object Fit */}
          <div>
            <Label className="gba:text-xs">{t('props-object-fit')}</Label>
            <Select
              value={imageElement.objectFit}
              onValueChange={(value: 'cover' | 'contain' | 'fill' | 'none') => onUpdate({ objectFit: value })}
            >
              <SelectTrigger className="gba:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">{t('props-cover')}</SelectItem>
                <SelectItem value="contain">{t('props-contain')}</SelectItem>
                <SelectItem value="fill">{t('props-fill')}</SelectItem>
                <SelectItem value="none">{t('props-none')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Border Radius */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">{t('props-border-radius')}</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{imageElement.borderRadius}px</span>
            </div>
            <Slider
              value={[imageElement.borderRadius]}
              min={0}
              max={100}
              step={1}
              onValueChange={([value]) => onUpdate({ borderRadius: value })}
            />
          </div>

          {/* Border Width */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">{t('props-border-width')}</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{imageElement.borderWidth}px</span>
            </div>
            <Slider
              value={[imageElement.borderWidth]}
              min={0}
              max={20}
              step={1}
              onValueChange={([value]) => onUpdate({ borderWidth: value })}
            />
          </div>

          {/* Border Color */}
          <PanelColorPicker
            value={imageElement.borderColor}
            onChange={borderColor => onUpdate({ borderColor })}
            label={t('props-border-color')}
          />

          {/* Shadow */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">{t('props-drop-shadow')}</Label>
            <Switch checked={imageElement.shadow} onCheckedChange={shadow => onUpdate({ shadow })} />
          </div>
        </div>
      )}

      {/* VIDEO PROPERTIES */}
      {videoElement && (
        <div className="gba:space-y-4">
          <Label className="gba:text-xs gba:font-semibold">{t('props-video-styling')}</Label>

          {/* Object Fit */}
          <div>
            <Label className="gba:text-xs">{t('props-object-fit')}</Label>
            <Select
              value={videoElement.objectFit}
              onValueChange={(value: 'cover' | 'contain' | 'fill') => onUpdate({ objectFit: value })}
            >
              <SelectTrigger className="gba:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">{t('props-cover')}</SelectItem>
                <SelectItem value="contain">{t('props-contain')}</SelectItem>
                <SelectItem value="fill">{t('props-fill')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Playback Options */}
          <div className="gba:space-y-2">
            <Label className="gba:text-xs gba:font-semibold">{t('props-playback')}</Label>
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:text-xs">{t('props-autoplay')}</Label>
              <Switch checked={videoElement.autoplay} onCheckedChange={autoplay => onUpdate({ autoplay })} />
            </div>
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:text-xs">{t('props-loop')}</Label>
              <Switch checked={videoElement.loop} onCheckedChange={loop => onUpdate({ loop })} />
            </div>
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:text-xs">{t('props-muted')}</Label>
              <Switch checked={videoElement.muted} onCheckedChange={muted => onUpdate({ muted })} />
            </div>
          </div>

          {/* Border Radius */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">{t('props-border-radius')}</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{videoElement.borderRadius}px</span>
            </div>
            <Slider
              value={[videoElement.borderRadius]}
              min={0}
              max={50}
              step={1}
              onValueChange={([value]) => onUpdate({ borderRadius: value })}
            />
          </div>

          {/* Shadow */}
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">{t('props-drop-shadow')}</Label>
            <Switch checked={videoElement.shadow} onCheckedChange={shadow => onUpdate({ shadow })} />
          </div>
        </div>
      )}

      {/* CHART PROPERTIES */}
      {chartElement && (
        <div className="gba:space-y-4">
          <Label className="gba:text-xs gba:font-semibold">{t('props-chart-settings')}</Label>

          {/* Chart Title */}
          <div>
            <Label className="gba:text-xs">{t('props-chart-title')}</Label>
            <Input
              value={chartElement.title}
              onChange={e => onUpdate({ title: e.target.value })}
              placeholder={t('props-chart-title-placeholder')}
              className="gba:mt-1 gba:text-xs"
            />
          </div>

          {/* Chart Type */}
          <div>
            <Label className="gba:text-xs">{t('props-chart-type')}</Label>
            <Select value={chartElement.chartType} onValueChange={(value: ChartType) => onUpdate({ chartType: value })}>
              <SelectTrigger className="gba:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map(ct => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.icon} {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Chart Display Options */}
          <Label className="gba:text-xs gba:font-semibold">{t('props-chart-display')}</Label>

          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">{t('props-show-legend')}</Label>
            <Switch checked={chartElement.showLegend} onCheckedChange={showLegend => onUpdate({ showLegend })} />
          </div>

          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">{t('props-show-grid')}</Label>
            <Switch checked={chartElement.showGrid} onCheckedChange={showGrid => onUpdate({ showGrid })} />
          </div>

          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-xs">{t('props-show-tooltip')}</Label>
            <Switch checked={chartElement.showTooltip} onCheckedChange={showTooltip => onUpdate({ showTooltip })} />
          </div>

          <Separator />

          {/* Chart Styling */}
          <Label className="gba:text-xs gba:font-semibold">{t('props-chart-styling')}</Label>

          {/* Background Color */}
          <PanelColorPicker
            value={chartElement.backgroundColor}
            onChange={backgroundColor => onUpdate({ backgroundColor })}
            label={t('props-background-color')}
          />

          {/* Border Radius */}
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <Label className="gba:text-xs">{t('props-border-radius')}</Label>
              <span className="gba:text-xs gba:text-muted-foreground">{chartElement.borderRadius}px</span>
            </div>
            <Slider
              value={[chartElement.borderRadius]}
              min={0}
              max={24}
              step={1}
              onValueChange={([value]) => onUpdate({ borderRadius: value })}
            />
          </div>

          <Separator />

          <ChartDataEditor data={chartElement.data} series={chartElement.series} onUpdate={onUpdate} t={t} />
        </div>
      )}
    </div>
  )
}

export default PropertyPanel
