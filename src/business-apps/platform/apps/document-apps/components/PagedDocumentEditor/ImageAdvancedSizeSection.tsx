import { useCallback, useMemo } from 'react'
import type { Editor } from '@tiptap/react'
import { Button, Input, Label, Switch, useTranslation } from '@newwork/nw-design-system'
import type { CustomImageAttributes, ImageSizeUnit } from '@/components/tiptap-extensions/tiptap-custom-image'
import {
  DEFAULT_IMAGE_ROTATION,
  DEFAULT_IMAGE_SCALE_PERCENT,
  convertPxToPercent,
  getImageAspectRatio,
  resolveImageDimensions
} from '@/components/tiptap-extensions/tiptap-custom-image/sizeUtils'
import translations from '../../_i18n'

interface ImageAdvancedSizeSectionProps {
  editor: Editor | null
  imagePos: number
  attrs: CustomImageAttributes
  testId: string
  updateImageAttrs: (nextAttrs: Partial<CustomImageAttributes>) => boolean
}

function parseNumericInput(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : fallback
}

function preventEditorBlurOnMouseDown(event: React.MouseEvent<HTMLElement>) {
  event.preventDefault()
}

function getMeasurementContext(editor: Editor | null, imagePos: number) {
  if (!editor) {
    return { containerWidth: null, containerHeight: null }
  }

  const nodeDom = editor.view.nodeDOM(imagePos)
  const element = nodeDom instanceof HTMLElement ? nodeDom : null
  const container = element?.parentElement ?? null

  return {
    containerWidth: container?.clientWidth ?? editor.view.dom.clientWidth ?? null,
    containerHeight: container?.clientHeight ?? null
  }
}

export function ImageAdvancedSizeSection({
  editor,
  imagePos,
  attrs,
  testId,
  updateImageAttrs
}: Readonly<ImageAdvancedSizeSectionProps>) {
  const { t } = useTranslation(translations)
  const measurementContext = useMemo(() => getMeasurementContext(editor, imagePos), [editor, imagePos])
  const resolvedDimensions = useMemo(
    () => resolveImageDimensions(attrs, measurementContext),
    [attrs, measurementContext]
  )
  const aspectRatio = getImageAspectRatio(attrs)
  const widthUnit = resolvedDimensions.widthUnit
  const heightUnit = resolvedDimensions.heightUnit
  const lockAspectRatio = resolvedDimensions.lockAspectRatio
  const widthInputValue =
    widthUnit === 'percent' ? (resolvedDimensions.widthPercent ?? 100) : (resolvedDimensions.baseWidth ?? 0)
  const heightInputValue =
    heightUnit === 'percent' ? (resolvedDimensions.heightPercent ?? 100) : (resolvedDimensions.baseHeight ?? 0)
  const scaleWidthInputValue = resolvedDimensions.scaleWidthPercent
  const scaleHeightInputValue = resolvedDimensions.scaleHeightPercent
  const rotationInputValue = resolvedDimensions.rotation
  const originalWidth = resolvedDimensions.originalWidth
  const originalHeight = resolvedDimensions.originalHeight

  const updateDimension = useCallback(
    (dimension: 'width' | 'height', unit: ImageSizeUnit, rawValue: string) => {
      const isWidth = dimension === 'width'
      const baseFallback = isWidth ? widthInputValue : heightInputValue
      const referenceLength = isWidth ? measurementContext.containerWidth : measurementContext.containerHeight
      const otherReferenceLength = isWidth ? measurementContext.containerHeight : measurementContext.containerWidth
      const nextValue = Math.max(1, parseNumericInput(rawValue, baseFallback))

      const nextAttrs: Partial<CustomImageAttributes> = isWidth
        ? {
            widthUnit: unit,
            widthPercent: unit === 'percent' ? nextValue : null,
            widthRelativeTo: 'page',
            width:
              unit === 'percent' && referenceLength != null
                ? Math.max(1, Math.round((referenceLength * nextValue) / 100))
                : nextValue
          }
        : {
            heightUnit: unit,
            heightPercent: unit === 'percent' ? nextValue : null,
            heightRelativeTo: 'page',
            height:
              unit === 'percent' && referenceLength != null
                ? Math.max(1, Math.round((referenceLength * nextValue) / 100))
                : nextValue
          }

      if (lockAspectRatio && aspectRatio) {
        const referenceAbsolute =
          unit === 'percent' && referenceLength != null
            ? Math.max(1, Math.round((referenceLength * nextValue) / 100))
            : nextValue
        const linkedAbsolute = isWidth
          ? Math.max(1, Math.round(referenceAbsolute / aspectRatio))
          : Math.max(1, Math.round(referenceAbsolute * aspectRatio))
        const otherUnit = isWidth ? heightUnit : widthUnit
        const linkedPercent = otherUnit === 'percent' ? convertPxToPercent(linkedAbsolute, otherReferenceLength) : null

        if (isWidth) {
          nextAttrs.heightUnit = linkedPercent != null ? 'percent' : 'px'
          nextAttrs.heightPercent = linkedPercent
          nextAttrs.heightRelativeTo = 'page'
          nextAttrs.height = linkedAbsolute
        } else {
          nextAttrs.widthUnit = linkedPercent != null ? 'percent' : 'px'
          nextAttrs.widthPercent = linkedPercent
          nextAttrs.widthRelativeTo = 'page'
          nextAttrs.width = linkedAbsolute
        }
      }

      updateImageAttrs(nextAttrs)
    },
    [
      aspectRatio,
      heightInputValue,
      heightUnit,
      lockAspectRatio,
      measurementContext.containerHeight,
      measurementContext.containerWidth,
      updateImageAttrs,
      widthInputValue,
      widthUnit
    ]
  )

  const updateDimensionUnit = useCallback(
    (dimension: 'width' | 'height', nextUnit: ImageSizeUnit) => {
      const isWidth = dimension === 'width'
      const currentAbsolute = isWidth ? resolvedDimensions.baseWidth : resolvedDimensions.baseHeight
      const referenceLength = isWidth ? measurementContext.containerWidth : measurementContext.containerHeight
      const nextPercent = nextUnit === 'percent' ? (convertPxToPercent(currentAbsolute, referenceLength) ?? 100) : null

      updateImageAttrs(
        isWidth
          ? {
              widthUnit: nextUnit,
              widthPercent: nextPercent,
              widthRelativeTo: 'page',
              width: currentAbsolute
            }
          : {
              heightUnit: nextUnit,
              heightPercent: nextPercent,
              heightRelativeTo: 'page',
              height: currentAbsolute
            }
      )
    },
    [
      measurementContext.containerHeight,
      measurementContext.containerWidth,
      resolvedDimensions.baseHeight,
      resolvedDimensions.baseWidth,
      updateImageAttrs
    ]
  )

  const handleScaleChange = useCallback(
    (dimension: 'width' | 'height', rawValue: string) => {
      const fallback = dimension === 'width' ? scaleWidthInputValue : scaleHeightInputValue
      const nextValue = Math.max(1, parseNumericInput(rawValue, fallback))

      if (lockAspectRatio) {
        updateImageAttrs({
          scaleWidthPercent: nextValue,
          scaleHeightPercent: nextValue
        })
        return
      }

      updateImageAttrs(dimension === 'width' ? { scaleWidthPercent: nextValue } : { scaleHeightPercent: nextValue })
    },
    [lockAspectRatio, scaleHeightInputValue, scaleWidthInputValue, updateImageAttrs]
  )

  const handleResetSize = useCallback(() => {
    updateImageAttrs({
      width: originalWidth,
      height: originalHeight,
      widthUnit: 'px',
      heightUnit: 'px',
      widthPercent: null,
      heightPercent: null,
      widthRelativeTo: 'page',
      heightRelativeTo: 'page',
      scaleWidthPercent: DEFAULT_IMAGE_SCALE_PERCENT,
      scaleHeightPercent: DEFAULT_IMAGE_SCALE_PERCENT
    })
  }, [originalHeight, originalWidth, updateImageAttrs])

  return (
    <section className="gba:space-y-3">
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
        <Label className="gba:text-xs gba:text-muted-foreground">{t('image-sidebar-size')}</Label>
        <Button
          variant="outline"
          size="sm"
          onMouseDown={preventEditorBlurOnMouseDown}
          onClick={handleResetSize}
          disabled={originalWidth == null || originalHeight == null}
          data-testid={`${testId}-reset-size`}
        >
          {t('image-sidebar-reset-size')}
        </Button>
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:gap-3">
        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-width`}>{t('image-sidebar-width')}</Label>
          <div className="gba:flex gba:gap-2">
            <Button
              variant={widthUnit === 'px' ? 'default' : 'outline'}
              size="sm"
              onMouseDown={preventEditorBlurOnMouseDown}
              onClick={() => updateDimensionUnit('width', 'px')}
              data-testid={`${testId}-width-unit-px`}
            >
              px
            </Button>
            <Button
              variant={widthUnit === 'percent' ? 'default' : 'outline'}
              size="sm"
              onMouseDown={preventEditorBlurOnMouseDown}
              onClick={() => updateDimensionUnit('width', 'percent')}
              data-testid={`${testId}-width-unit-percent`}
            >
              %
            </Button>
          </div>
          <Input
            id={`${testId}-width`}
            type="number"
            value={String(widthInputValue)}
            onChange={event => updateDimension('width', widthUnit, event.target.value)}
            data-testid={`${testId}-width`}
          />
          {widthUnit === 'percent' ? (
            <p className="gba:text-xs gba:text-muted-foreground">{t('image-sidebar-relative-to-page')}</p>
          ) : null}
        </div>

        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-height`}>{t('image-sidebar-height')}</Label>
          <div className="gba:flex gba:gap-2">
            <Button
              variant={heightUnit === 'px' ? 'default' : 'outline'}
              size="sm"
              onMouseDown={preventEditorBlurOnMouseDown}
              onClick={() => updateDimensionUnit('height', 'px')}
              data-testid={`${testId}-height-unit-px`}
            >
              px
            </Button>
            <Button
              variant={heightUnit === 'percent' ? 'default' : 'outline'}
              size="sm"
              onMouseDown={preventEditorBlurOnMouseDown}
              onClick={() => updateDimensionUnit('height', 'percent')}
              data-testid={`${testId}-height-unit-percent`}
            >
              %
            </Button>
          </div>
          <Input
            id={`${testId}-height`}
            type="number"
            value={String(heightInputValue)}
            onChange={event => updateDimension('height', heightUnit, event.target.value)}
            data-testid={`${testId}-height`}
          />
          {heightUnit === 'percent' ? (
            <p className="gba:text-xs gba:text-muted-foreground">{t('image-sidebar-relative-to-page')}</p>
          ) : null}
        </div>
      </div>

      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
        <Label htmlFor={`${testId}-lock-aspect-ratio`} className="gba:text-sm">
          {t('image-sidebar-lock-aspect-ratio')}
        </Label>
        <Switch
          id={`${testId}-lock-aspect-ratio`}
          checked={lockAspectRatio}
          onMouseDown={preventEditorBlurOnMouseDown}
          onCheckedChange={checked => updateImageAttrs({ lockAspectRatio: checked })}
          data-testid={`${testId}-lock-aspect-ratio`}
        />
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:gap-3">
        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-scale-width`}>{t('image-sidebar-scale-width')}</Label>
          <Input
            id={`${testId}-scale-width`}
            type="number"
            value={String(scaleWidthInputValue)}
            onChange={event => handleScaleChange('width', event.target.value)}
            data-testid={`${testId}-scale-width`}
          />
        </div>
        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-scale-height`}>{t('image-sidebar-scale-height')}</Label>
          <Input
            id={`${testId}-scale-height`}
            type="number"
            value={String(scaleHeightInputValue)}
            onChange={event => handleScaleChange('height', event.target.value)}
            data-testid={`${testId}-scale-height`}
          />
        </div>
      </div>

      <div className="gba:space-y-2">
        <Label htmlFor={`${testId}-rotation`}>{t('image-sidebar-rotation')}</Label>
        <Input
          id={`${testId}-rotation`}
          type="number"
          value={String(rotationInputValue)}
          onChange={event =>
            updateImageAttrs({
              rotation: parseNumericInput(event.target.value, DEFAULT_IMAGE_ROTATION)
            })
          }
          data-testid={`${testId}-rotation`}
        />
      </div>
    </section>
  )
}
