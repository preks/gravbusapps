import { useEffect, useState, type KeyboardEvent, type MouseEventHandler } from 'react'
import { Button, Input, Label, cn, useTranslation } from '@newwork/nw-design-system'
import {
  DEFAULT_IMAGE_BORDER_COLOR,
  DEFAULT_IMAGE_BORDER_DASH,
  DEFAULT_IMAGE_BORDER_WIDTH_PT,
  IMAGE_BORDER_WEIGHT_PRESETS,
  type CustomImageAttributes,
  type ImageBorderDash
} from '@/components/tiptap-extensions/tiptap-custom-image'
import { normalizeImageBorderColor } from '@/components/tiptap-extensions/tiptap-custom-image/styleUtils'
import translations from '../../_i18n'
import { ImageSidebarSection } from './ImageSidebarSection'

interface ImageBorderSectionProps {
  attrs: CustomImageAttributes
  updateImageAttrs: (nextAttrs: Partial<CustomImageAttributes>) => boolean
  onChoiceMouseDown: MouseEventHandler<HTMLElement>
  testId: string
}

const BORDER_COLOR_PRESETS = [
  '#FFFFFF',
  '#000000',
  '#D9D9D9',
  '#17365D',
  '#1F4E79',
  '#E46C0A',
  '#2E7D32',
  '#00A6D6',
  '#A61E9A',
  '#63A537'
] as const

const BORDER_DASH_OPTIONS: ReadonlyArray<{ value: ImageBorderDash; labelKey: string; dashArray?: string }> = [
  { value: 'solid', labelKey: 'image-sidebar-border-dash-solid' },
  { value: 'dash', labelKey: 'image-sidebar-border-dash-dash', dashArray: '12 8' },
  { value: 'dot', labelKey: 'image-sidebar-border-dash-dot', dashArray: '2 6' },
  { value: 'dash-dot', labelKey: 'image-sidebar-border-dash-dash-dot', dashArray: '12 6 2 6' },
  { value: 'dash-dot-dot', labelKey: 'image-sidebar-border-dash-dash-dot-dot', dashArray: '12 6 2 6 2 6' }
]

function BorderColorSwatch({ color }: Readonly<{ color: string }>) {
  return (
    <svg className="gba:h-4 gba:w-4 gba:rounded-full gba:text-border" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="6" fill={color} stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function BorderDashPreview({ dashArray }: Readonly<{ dashArray?: string }>) {
  return (
    <svg className="gba:h-5 gba:w-16" viewBox="0 0 64 20" fill="none" aria-hidden>
      <path d="M4 10H60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray={dashArray} />
    </svg>
  )
}

export function ImageBorderSection({
  attrs,
  updateImageAttrs,
  onChoiceMouseDown,
  testId
}: Readonly<ImageBorderSectionProps>) {
  const { t } = useTranslation(translations)
  const borderVisible = attrs.borderVisible ?? false
  const borderColor = attrs.borderColor ?? DEFAULT_IMAGE_BORDER_COLOR
  const borderWidthPt = attrs.borderWidthPt ?? DEFAULT_IMAGE_BORDER_WIDTH_PT
  const borderDash = attrs.borderDash ?? DEFAULT_IMAGE_BORDER_DASH
  const [customColorInput, setCustomColorInput] = useState(borderColor)

  useEffect(() => {
    setCustomColorInput(borderColor)
  }, [borderColor])

  const applyBorderAttrs = (nextAttrs: Partial<CustomImageAttributes>) =>
    updateImageAttrs({
      borderVisible: true,
      ...nextAttrs
    })

  const commitCustomColor = () => {
    const normalizedColor = normalizeImageBorderColor(customColorInput, borderColor)

    if (!normalizedColor) {
      setCustomColorInput(borderColor)
      return
    }

    setCustomColorInput(normalizedColor)
    applyBorderAttrs({ borderColor: normalizedColor })
  }

  const handleCustomColorKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    commitCustomColor()
  }

  return (
    <ImageSidebarSection
      title={t('image-sidebar-border')}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gba:text-xs"
          onMouseDown={onChoiceMouseDown}
          onClick={() => updateImageAttrs({ borderVisible: !borderVisible })}
          data-testid={`${testId}-border-toggle`}
        >
          {borderVisible ? t('image-sidebar-border-no-outline') : t('image-sidebar-border-apply-outline')}
        </Button>
      }
      data-testid={`${testId}-border-section`}
    >
      {!borderVisible ? (
        <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-border-hidden`}>
          {t('image-sidebar-border-hidden')}
        </p>
      ) : null}

      <div className="gba:space-y-2">
        <Label htmlFor={`${testId}-border-color`} className="gba:text-xs gba:font-medium">
          {t('image-sidebar-border-color')}
        </Label>
        <div className="gba:grid gba:grid-cols-5 gba:gap-2">
          {BORDER_COLOR_PRESETS.map(color => {
            const active = borderColor.toUpperCase() === color

            return (
              <Button
                key={color}
                type="button"
                variant={active ? 'secondary' : 'outline'}
                size="sm"
                className={cn('gba:h-9 gba:w-full gba:px-0', active ? 'gba:border-primary' : undefined)}
                onMouseDown={onChoiceMouseDown}
                onClick={() => applyBorderAttrs({ borderColor: color })}
                data-testid={`${testId}-border-color-${color.slice(1).toLowerCase()}`}
              >
                <BorderColorSwatch color={color} />
              </Button>
            )
          })}
        </div>

        <div className="gba:space-y-1.5">
          <Label htmlFor={`${testId}-border-color`} className="gba:text-xs gba:font-medium">
            {t('image-sidebar-border-custom-color')}
          </Label>
          <Input
            id={`${testId}-border-color`}
            value={customColorInput}
            onChange={event => setCustomColorInput(event.target.value)}
            onBlur={commitCustomColor}
            onKeyDown={handleCustomColorKeyDown}
            data-testid={`${testId}-border-color-input`}
          />
        </div>
      </div>

      <div className="gba:space-y-2">
        <Label className="gba:text-xs gba:font-medium">{t('image-sidebar-border-weight')}</Label>
        <div className="gba:grid gba:grid-cols-3 gba:gap-1.5">
          {IMAGE_BORDER_WEIGHT_PRESETS.map(weight => (
            <Button
              key={weight}
              type="button"
              variant={borderWidthPt === weight ? 'secondary' : 'outline'}
              size="sm"
              className="gba:h-auto gba:min-h-10 gba:px-2.5 gba:py-2 gba:text-xs gba:font-medium"
              onMouseDown={onChoiceMouseDown}
              onClick={() => applyBorderAttrs({ borderWidthPt: weight })}
              data-testid={`${testId}-border-weight-${String(weight).replace('.', '-')}`}
            >
              {weight} pt
            </Button>
          ))}
        </div>
      </div>

      <div className="gba:space-y-2">
        <Label className="gba:text-xs gba:font-medium">{t('image-sidebar-border-dashes')}</Label>
        <div className="gba:grid gba:grid-cols-2 gba:gap-1.5">
          {BORDER_DASH_OPTIONS.map(option => (
            <Button
              key={option.value}
              type="button"
              variant={borderDash === option.value ? 'secondary' : 'outline'}
              size="sm"
              className="gba:h-auto gba:min-h-11 gba:justify-start gba:px-3 gba:py-2 gba:text-left"
              onMouseDown={onChoiceMouseDown}
              onClick={() => applyBorderAttrs({ borderDash: option.value })}
              data-testid={`${testId}-border-dash-${option.value}`}
            >
              <span className="gba:flex gba:w-full gba:items-center gba:justify-between gba:gap-2">
                <span className="gba:text-xs gba:font-medium">{t(option.labelKey)}</span>
                <span className="gba:text-muted-foreground">
                  <BorderDashPreview dashArray={option.dashArray} />
                </span>
              </span>
            </Button>
          ))}
        </div>
      </div>
    </ImageSidebarSection>
  )
}
