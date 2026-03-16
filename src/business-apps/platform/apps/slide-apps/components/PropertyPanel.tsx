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
  Upload
} from 'lucide-react'
import type {
  AnySlideElement,
  TextElement,
  ShapeElement,
  ImageElement,
  VideoElement,
  ChartElement,
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
  gradientToCss,
  DEFAULT_TRANSITION
} from './slideElements'
import { GradientBuilder } from './GradientBuilder'
import { TransitionPreview } from './TransitionPreview'
import translations from '../_i18n'

/**
 * Sanitizes a URL to prevent XSS attacks in img src attributes.
 * Only allows safe protocols: https, http, data:image, blob, and relative paths.
 */
function sanitizeImageUrl(url: string | undefined): string {
  if (!url) return ''

  const trimmedUrl = url.trim()
  if (!trimmedUrl) return ''

  // Allow relative paths
  if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('./') || trimmedUrl.startsWith('../')) {
    return trimmedUrl
  }

  // Allow blob URLs (from file uploads)
  if (trimmedUrl.startsWith('blob:')) {
    return trimmedUrl
  }

  // Allow data URLs but only for images
  if (trimmedUrl.startsWith('data:')) {
    if (trimmedUrl.startsWith('data:image/')) {
      return trimmedUrl
    }
    return ''
  }

  // Allow http/https URLs
  try {
    const parsedUrl = new URL(trimmedUrl)
    if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') {
      return trimmedUrl
    }
  } catch {
    // Invalid URL format
    return ''
  }

  return ''
}

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

interface PropertyPanelProps {
  element: AnySlideElement | null
  onUpdate: (updates: Partial<AnySlideElement>) => void
  onDelete: () => void
  onDuplicate: () => void
  onBringForward: () => void
  onSendBackward: () => void
  slideTransition?: SlideTransition
  onSlideTransitionChange?: (transition: SlideTransition) => void
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  slideTransition,
  onSlideTransitionChange
}) => {
  const { t } = useTranslation(translations)
  const [showGradientBuilder, setShowGradientBuilder] = useState(false)
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
                  <TransitionPreview transition={currentTransition} />
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
  const chartElement = element.type === 'chart' ? (element as ChartElement) : null

  const ColorPicker = ({
    value,
    onChange,
    label
  }: {
    value: string
    onChange: (color: string) => void
    label: string
  }) => (
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

  const GradientSection = ({
    gradient,
    onChange
  }: {
    gradient?: GradientConfig
    onChange: (gradient: GradientConfig | undefined) => void
  }) => (
    <Collapsible open={showGradientBuilder} onOpenChange={setShowGradientBuilder}>
      <div className="gba:space-y-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <Label className="gba:text-xs gba:font-semibold">{t('props-gradient-fill')}</Label>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gba:h-7">
              <Palette className="gba:w-3 gba:h-3 gba:mr-1" />
              {showGradientBuilder ? t('props-close') : t('props-custom')}
              <ChevronDown
                className={`gba:w-3 gba:h-3 gba:ml-1 gba:transition-transform ${showGradientBuilder ? 'gba:rotate-180' : ''}`}
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
        {gradient && (
          <div
            className="gba:h-8 gba:rounded gba:border gba:shadow-inner"
            style={{ background: gradientToCss(gradient) }}
          />
        )}

        {/* Custom Gradient Builder */}
        <CollapsibleContent>
          <div className="gba:mt-3 gba:p-3 gba:border gba:rounded-lg gba:bg-muted/30">
            <GradientBuilder gradient={gradient} onChange={onChange} onClose={() => setShowGradientBuilder(false)} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )

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
          <ColorPicker
            value={textElement.color}
            onChange={color => onUpdate({ color })}
            label={t('props-text-color')}
          />

          {/* Background Color */}
          <ColorPicker
            value={textElement.backgroundColor === 'transparent' ? '#ffffff' : textElement.backgroundColor}
            onChange={color => onUpdate({ backgroundColor: color })}
            label={t('props-background-color')}
          />

          {/* Gradient */}
          <GradientSection gradient={textElement.gradient} onChange={gradient => onUpdate({ gradient })} />

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
          <ColorPicker value={shapeElement.fill} onChange={fill => onUpdate({ fill })} label={t('props-fill-color')} />

          {/* Gradient */}
          <GradientSection gradient={shapeElement.gradient} onChange={gradient => onUpdate({ gradient })} />

          {/* Stroke Color */}
          <ColorPicker
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

      {/* IMAGE PROPERTIES */}
      {imageElement && (
        <div className="gba:space-y-4">
          {/* Image Source */}
          <div className="gba:space-y-3">
            <Label className="gba:text-xs gba:font-semibold">{t('props-image-source')}</Label>

            {/* Current image preview */}
            <div className="gba:w-full gba:h-20 gba:rounded gba:overflow-hidden gba:bg-muted gba:border">
              {sanitizeImageUrl(imageElement.src) && (
                <img
                  // nosemgrep: react-insecure-url
                  // snyk-ignore: URL is validated by sanitizeImageUrl
                  src={sanitizeImageUrl(imageElement.src)}
                  alt=""
                  className="gba:w-full gba:h-full gba:object-contain"
                />
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
          <ColorPicker
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
          <ColorPicker
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
        </div>
      )}
    </div>
  )
}

export default PropertyPanel
