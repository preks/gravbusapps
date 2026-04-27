/**
 * SlideMetaEditor Component
 *
 * Reusable component for editing a single slide's metadata (purpose, position, capabilities).
 */

import React, { useCallback, useMemo } from 'react'
import {
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Button,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ChevronDown,
  Presentation,
  List,
  Minus,
  FileText,
  Target,
  ListOrdered,
  Columns,
  Image,
  BarChart3,
  Quote,
  Clock,
  ArrowLeftRight,
  Users,
  Workflow,
  CheckCircle,
  MousePointerClick,
  Heart,
  Wand2
} from 'lucide-react'
import type { SlideData, SlideBackground } from './slideElements'
import type { SlidePurpose, SlidePosition, SlideCapabilities, SlideTemplateMeta } from '../types'
import { PURPOSE_DEFINITIONS, getAllPurposes, getAllPositions } from '../services/SlideMetadataService'
import { gradientToCss } from './slideElements'
import translations from '../_i18n'

const PURPOSE_ICON_MAP: Record<SlidePurpose, React.ReactNode> = {
  cover: <Presentation className="gba:w-4 gba:h-4" />,
  agenda: <List className="gba:w-4 gba:h-4" />,
  'section-divider': <Minus className="gba:w-4 gba:h-4" />,
  content: <FileText className="gba:w-4 gba:h-4" />,
  'key-point': <Target className="gba:w-4 gba:h-4" />,
  bullets: <ListOrdered className="gba:w-4 gba:h-4" />,
  'two-column': <Columns className="gba:w-4 gba:h-4" />,
  'image-focus': <Image className="gba:w-4 gba:h-4" />,
  'data-viz': <BarChart3 className="gba:w-4 gba:h-4" />,
  quote: <Quote className="gba:w-4 gba:h-4" />,
  timeline: <Clock className="gba:w-4 gba:h-4" />,
  comparison: <ArrowLeftRight className="gba:w-4 gba:h-4" />,
  team: <Users className="gba:w-4 gba:h-4" />,
  process: <Workflow className="gba:w-4 gba:h-4" />,
  conclusion: <CheckCircle className="gba:w-4 gba:h-4" />,
  cta: <MousePointerClick className="gba:w-4 gba:h-4" />,
  'thank-you': <Heart className="gba:w-4 gba:h-4" />
}

const getBackgroundStyle = (background: SlideBackground): React.CSSProperties => {
  switch (background.type) {
    case 'gradient':
      return background.gradient ? { background: gradientToCss(background.gradient) } : {}
    case 'branded': {
      const layers: string[] = []
      if (background.overlay) {
        layers.push(gradientToCss(background.overlay))
      }
      if (background.gradient) {
        layers.push(gradientToCss(background.gradient))
      }
      const baseColor = background.color || '#0a0a0a'
      if (layers.length > 0) {
        return { background: `${layers.join(', ')}, ${baseColor}` }
      }
      return { backgroundColor: baseColor }
    }
    case 'image':
      return background.imageUrl
        ? { backgroundImage: `url(${background.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : {}
    case 'video':
      return { backgroundColor: '#000000' }
    default:
      return { backgroundColor: background.color || '#ffffff' }
  }
}

export interface SlideMetaEditorProps {
  slideMeta: SlideTemplateMeta
  slideIndex: number
  slidePreview?: SlideData
  onChange: (meta: SlideTemplateMeta) => void
  onAutoDetect?: () => void
  disabled?: boolean
  compact?: boolean
  'data-testid'?: string
}

export const SlideMetaEditor: React.FC<SlideMetaEditorProps> = ({
  slideMeta,
  slideIndex,
  slidePreview,
  onChange,
  onAutoDetect,
  disabled = false,
  compact = false,
  'data-testid': testId = 'slide-meta-editor'
}) => {
  const { t } = useTranslation(translations)

  const purposes = useMemo(() => getAllPurposes(), [])
  const positions = useMemo(() => getAllPositions(), [])

  const handlePurposeChange = useCallback(
    (purpose: SlidePurpose) => {
      const defaults = PURPOSE_DEFINITIONS[purpose]
      onChange({
        ...slideMeta,
        purpose,
        position: defaults.defaultPosition,
        maxUsage: defaults.defaultMaxUsage,
        capabilities: { ...defaults.defaultCapabilities }
      })
    },
    [slideMeta, onChange]
  )

  const handlePositionChange = useCallback(
    (position: SlidePosition) => {
      onChange({ ...slideMeta, position })
    },
    [slideMeta, onChange]
  )

  const handleMaxUsageChange = useCallback(
    (value: string) => {
      const num = Number.parseInt(value, 10)
      onChange({ ...slideMeta, maxUsage: isNaN(num) || num <= 0 ? undefined : num })
    },
    [slideMeta, onChange]
  )

  const handleCapabilityChange = useCallback(
    (key: keyof SlideCapabilities, value: boolean | number) => {
      onChange({
        ...slideMeta,
        capabilities: { ...slideMeta.capabilities, [key]: value }
      })
    },
    [slideMeta, onChange]
  )

  const handleHintsChange = useCallback(
    (value: string) => {
      const hints = value
        .split(',')
        .map(h => h.trim())
        .filter(h => h.length > 0)
      onChange({ ...slideMeta, contentHints: hints.length > 0 ? hints : undefined })
    },
    [slideMeta, onChange]
  )

  const thumbScale = 60 / 1280

  if (compact) {
    return (
      <div className="gba:flex gba:items-center gba:gap-3" data-testid={testId}>
        {slidePreview && (
          <div
            className="gba:flex-shrink-0 gba:rounded gba:border gba:overflow-hidden"
            style={{ width: 60, aspectRatio: '16/9' }}
          >
            <div
              className="gba:w-full gba:h-full"
              style={getBackgroundStyle(slidePreview.background || { type: 'solid', color: '#ffffff' })}
            />
          </div>
        )}
        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">#{slideIndex + 1}</span>
            <Select
              value={slideMeta.purpose}
              onValueChange={val => handlePurposeChange(val as SlidePurpose)}
              disabled={disabled}
            >
              <SelectTrigger
                className="gba:h-8 gba:text-xs gba:flex-1"
                aria-label={t('template-slide-purpose') || 'Select slide purpose'}
                data-testid={`${testId}-purpose-select`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {purposes.map(purpose => (
                  <SelectItem key={purpose} value={purpose}>
                    <span className="gba:flex gba:items-center gba:gap-2">
                      {PURPOSE_ICON_MAP[purpose]}
                      {t(`slide-purpose-${purpose}`) || PURPOSE_DEFINITIONS[purpose].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {onAutoDetect && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAutoDetect}
            disabled={disabled}
            className="gba:h-8 gba:px-2"
            aria-label={t('template-auto-detect') || 'Auto-detect purpose'}
            data-testid={`${testId}-auto-detect-btn`}
          >
            <Wand2 className="gba:w-3.5 gba:h-3.5" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="gba:space-y-4 gba:p-4 gba:rounded-lg gba:border gba:bg-card" data-testid={testId}>
      {/* Header with preview */}
      <div className="gba:flex gba:items-start gba:gap-4">
        {slidePreview && (
          <div
            className="gba:flex-shrink-0 gba:rounded gba:border gba:overflow-hidden"
            style={{ width: 80, aspectRatio: '16/9' }}
          >
            <div
              className="gba:relative gba:w-full gba:h-full"
              style={getBackgroundStyle(slidePreview.background || { type: 'solid', color: '#ffffff' })}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 1280,
                  height: 720,
                  transform: `scale(${thumbScale})`,
                  transformOrigin: 'top left'
                }}
              >
                {(slidePreview.elements || []).slice(0, 3).map(el => (
                  <div
                    key={el.id}
                    className="gba:absolute gba:overflow-hidden"
                    style={{
                      left: el.position.x,
                      top: el.position.y,
                      width: el.size.width,
                      height: el.size.height,
                      backgroundColor: el.type === 'shape' ? (el as any).fill : 'transparent'
                    }}
                  >
                    {el.type === 'text' && (
                      <div
                        className="gba:w-full gba:h-full gba:overflow-hidden"
                        style={{
                          color: (el as any).color,
                          fontSize: (el as any).fontSize,
                          fontWeight: (el as any).fontWeight
                        }}
                      >
                        {(el as any).content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="gba:absolute gba:bottom-0.5 gba:left-0.5 gba:min-w-3 gba:h-3 gba:px-0.5 gba:flex gba:items-center gba:justify-center gba:rounded-sm gba:bg-black/50">
                <span className="gba:text-[8px] gba:font-medium gba:text-white gba:leading-none">{slideIndex + 1}</span>
              </div>
            </div>
          </div>
        )}
        <div className="gba:flex-1 gba:space-y-1">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:font-medium">Slide {slideIndex + 1}</span>
            <Badge variant="outline" className="gba:text-xs">
              {PURPOSE_ICON_MAP[slideMeta.purpose]}
              <span className="gba:ml-1">
                {t(`slide-purpose-${slideMeta.purpose}`) || PURPOSE_DEFINITIONS[slideMeta.purpose].label}
              </span>
            </Badge>
          </div>
          <p className="gba:text-xs gba:text-muted-foreground">
            {t(`slide-purpose-${slideMeta.purpose}-desc`) || PURPOSE_DEFINITIONS[slideMeta.purpose].description}
          </p>
        </div>
        {onAutoDetect && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAutoDetect}
            disabled={disabled}
            aria-label={t('template-auto-detect') || 'Auto-detect purpose'}
            data-testid={`${testId}-auto-detect-btn`}
          >
            <Wand2 className="gba:w-4 gba:h-4 gba:mr-1" />
            {t('template-auto-detect') || 'Auto-detect'}
          </Button>
        )}
      </div>

      {/* Purpose & Position Row */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-purpose`} className="gba:text-xs gba:font-medium">
            {t('template-slide-purpose') || 'Slide Purpose'}
          </Label>
          <Select
            value={slideMeta.purpose}
            onValueChange={val => handlePurposeChange(val as SlidePurpose)}
            disabled={disabled}
          >
            <SelectTrigger
              id={`${testId}-purpose`}
              aria-label={t('template-slide-purpose') || 'Select slide purpose'}
              data-testid={`${testId}-purpose-select`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {purposes.map(purpose => (
                <SelectItem key={purpose} value={purpose}>
                  <span className="gba:flex gba:items-center gba:gap-2">
                    {PURPOSE_ICON_MAP[purpose]}
                    {t(`slide-purpose-${purpose}`) || PURPOSE_DEFINITIONS[purpose].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-position`} className="gba:text-xs gba:font-medium">
            {t('template-slide-position') || 'Position'}
          </Label>
          <Select
            value={slideMeta.position}
            onValueChange={val => handlePositionChange(val as SlidePosition)}
            disabled={disabled}
          >
            <SelectTrigger
              id={`${testId}-position`}
              aria-label={t('template-slide-position') || 'Select slide position'}
              data-testid={`${testId}-position-select`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {positions.map(position => (
                <SelectItem key={position} value={position}>
                  {t(`slide-position-${position}`) || position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Max Usage */}
      <div className="gba:space-y-2">
        <Label htmlFor={`${testId}-max-usage`} className="gba:text-xs gba:font-medium">
          {t('template-slide-max-usage') || 'Max Usage'}
        </Label>
        <Input
          id={`${testId}-max-usage`}
          type="number"
          min={1}
          value={slideMeta.maxUsage ?? ''}
          onChange={e => handleMaxUsageChange(e.target.value)}
          placeholder="Unlimited"
          disabled={disabled}
          className="gba:h-9"
          data-testid={`${testId}-max-usage-input`}
        />
        <p className="gba:text-xs gba:text-muted-foreground">
          {t('template-slide-max-usage-hint') || 'How many times AI can use this slide (blank = unlimited)'}
        </p>
      </div>

      {/* Capabilities */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="gba:w-full gba:justify-between gba:h-9 gba:px-2"
            disabled={disabled}
            data-testid={`${testId}-capabilities-section`}
          >
            <span className="gba:text-xs gba:font-medium">{t('template-slide-capabilities') || 'Capabilities'}</span>
            <ChevronDown className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:transition-transform [[data-state=open]_&]:gba:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="gba:pt-2">
          <div className="gba:grid gba:grid-cols-2 gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-muted/50">
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox
                id={`${testId}-cap-title`}
                checked={slideMeta.capabilities.title}
                onCheckedChange={checked => handleCapabilityChange('title', !!checked)}
                disabled={disabled}
              />
              <Label htmlFor={`${testId}-cap-title`} className="gba:text-xs gba:cursor-pointer">
                {t('template-cap-title') || 'Title'}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox
                id={`${testId}-cap-subtitle`}
                checked={slideMeta.capabilities.subtitle}
                onCheckedChange={checked => handleCapabilityChange('subtitle', !!checked)}
                disabled={disabled}
              />
              <Label htmlFor={`${testId}-cap-subtitle`} className="gba:text-xs gba:cursor-pointer">
                {t('template-cap-subtitle') || 'Subtitle'}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox
                id={`${testId}-cap-bullets`}
                checked={slideMeta.capabilities.bullets}
                onCheckedChange={checked => handleCapabilityChange('bullets', !!checked)}
                disabled={disabled}
              />
              <Label htmlFor={`${testId}-cap-bullets`} className="gba:text-xs gba:cursor-pointer">
                {t('template-cap-bullets') || 'Bullets'}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox
                id={`${testId}-cap-image`}
                checked={slideMeta.capabilities.image}
                onCheckedChange={checked => handleCapabilityChange('image', !!checked)}
                disabled={disabled}
              />
              <Label htmlFor={`${testId}-cap-image`} className="gba:text-xs gba:cursor-pointer">
                {t('template-cap-image') || 'Image'}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox
                id={`${testId}-cap-chart`}
                checked={slideMeta.capabilities.chart}
                onCheckedChange={checked => handleCapabilityChange('chart', !!checked)}
                disabled={disabled}
              />
              <Label htmlFor={`${testId}-cap-chart`} className="gba:text-xs gba:cursor-pointer">
                {t('template-cap-chart') || 'Chart'}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox
                id={`${testId}-cap-table`}
                checked={slideMeta.capabilities.table}
                onCheckedChange={checked => handleCapabilityChange('table', !!checked)}
                disabled={disabled}
              />
              <Label htmlFor={`${testId}-cap-table`} className="gba:text-xs gba:cursor-pointer">
                {t('template-cap-table') || 'Table'}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox
                id={`${testId}-cap-icons`}
                checked={slideMeta.capabilities.icons}
                onCheckedChange={checked => handleCapabilityChange('icons', !!checked)}
                disabled={disabled}
              />
              <Label htmlFor={`${testId}-cap-icons`} className="gba:text-xs gba:cursor-pointer">
                {t('template-cap-icons') || 'Icons'}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox
                id={`${testId}-cap-multi-column`}
                checked={slideMeta.capabilities.multiColumn}
                onCheckedChange={checked => handleCapabilityChange('multiColumn', !!checked)}
                disabled={disabled}
              />
              <Label htmlFor={`${testId}-cap-multi-column`} className="gba:text-xs gba:cursor-pointer">
                {t('template-cap-multi-column') || 'Multi-Column'}
              </Label>
            </div>
            {slideMeta.capabilities.bullets && (
              <div className="gba:col-span-2 gba:flex gba:items-center gba:gap-2">
                <Label htmlFor={`${testId}-cap-max-bullets`} className="gba:text-xs">
                  {t('template-cap-max-bullets') || 'Max Bullets'}:
                </Label>
                <Input
                  id={`${testId}-cap-max-bullets`}
                  type="number"
                  min={1}
                  max={20}
                  value={slideMeta.capabilities.maxBullets ?? ''}
                  onChange={e => {
                    const val = Number.parseInt(e.target.value, 10)
                    handleCapabilityChange('maxBullets', isNaN(val) ? 0 : val)
                  }}
                  disabled={disabled}
                  className="gba:h-7 gba:w-20"
                />
              </div>
            )}
            {slideMeta.capabilities.multiColumn && (
              <div className="gba:col-span-2 gba:flex gba:items-center gba:gap-2">
                <Label htmlFor={`${testId}-cap-column-count`} className="gba:text-xs">
                  {t('template-cap-column-count') || 'Columns'}:
                </Label>
                <Input
                  id={`${testId}-cap-column-count`}
                  type="number"
                  min={2}
                  max={4}
                  value={slideMeta.capabilities.columnCount ?? 2}
                  onChange={e => {
                    const val = Number.parseInt(e.target.value, 10)
                    handleCapabilityChange('columnCount', isNaN(val) ? 2 : val)
                  }}
                  disabled={disabled}
                  className="gba:h-7 gba:w-20"
                />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Content Hints */}
      <div className="gba:space-y-2">
        <Label htmlFor={`${testId}-hints`} className="gba:text-xs gba:font-medium">
          {t('template-slide-content-hints') || 'Content Hints'}
        </Label>
        <Input
          id={`${testId}-hints`}
          value={slideMeta.contentHints?.join(', ') ?? ''}
          onChange={e => handleHintsChange(e.target.value)}
          placeholder={t('template-slide-content-hints-placeholder') || 'Keywords to help AI match content...'}
          disabled={disabled}
          className="gba:h-9"
          data-testid={`${testId}-hints-input`}
        />
        <p className="gba:text-xs gba:text-muted-foreground">
          {t('template-hints-help') || 'Keywords to help AI match content'}
        </p>
      </div>
    </div>
  )
}

export default SlideMetaEditor
