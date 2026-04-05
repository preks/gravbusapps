import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import { X } from '@phosphor-icons/react'
import { Button, Input, Label, ScrollArea, Separator, Switch, useTranslation } from '@newwork/nw-design-system'
import {
  dispatchDocumentImageUiMode,
  normalizeImageCrop,
  resolveWordWrapTextSide,
  type CustomImageAttributes,
  type ImageAlignment,
  type ImageAnchorMode
} from '@/components/tiptap-extensions/tiptap-custom-image'
import { ImageAdvancedSizeSection } from './ImageAdvancedSizeSection'
import { ImageSidebarSection } from './ImageSidebarSection'
import { ImageWrapSection } from './ImageWrapSection'
import translations from '../../_i18n'

const DEFAULT_IMAGE_DISTANCE = 0

const ALIGN_OPTIONS: ReadonlyArray<{ key: string; value: ImageAlignment }> = [
  { key: 'editor-toolbar-align-left', value: 'left' },
  { key: 'editor-toolbar-align-center', value: 'center' },
  { key: 'editor-toolbar-align-right', value: 'right' }
]

const ANCHOR_OPTIONS: ReadonlyArray<{ key: string; value: ImageAnchorMode }> = [
  { key: 'image-anchor-inline', value: 'inline' },
  { key: 'image-anchor-move-with-text', value: 'move-with-text' },
  { key: 'image-anchor-fixed', value: 'fixed' }
]

const DISTANCE_FIELDS: ReadonlyArray<{
  key: 'distanceTop' | 'distanceRight' | 'distanceBottom' | 'distanceLeft'
  labelKey: string
}> = [
  { key: 'distanceTop', labelKey: 'image-sidebar-distance-top' },
  { key: 'distanceRight', labelKey: 'image-sidebar-distance-right' },
  { key: 'distanceBottom', labelKey: 'image-sidebar-distance-bottom' },
  { key: 'distanceLeft', labelKey: 'image-sidebar-distance-left' }
]

export interface SelectedImageSidebarState {
  open: boolean
  editor: Editor | null
  pos: number | null
  nodeSize: number | null
  attrs: CustomImageAttributes | null
}

export interface ImageSettingsSidebarProps {
  editor: Editor | null
  image: SelectedImageSidebarState
  /** Shown under the title when the image lives in header/footer overlay */
  contextSubtitle?: string
  headerHeight?: number
  rightOffset?: number
  onClose: () => void
  onReplace: (imagePos: number | null) => void
  'data-testid'?: string
}

function parseNumericInput(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : fallback
}

function preventEditorBlurOnMouseDown(event: React.MouseEvent<HTMLElement>) {
  event.preventDefault()
}

export function ImageSettingsSidebar({
  editor,
  image,
  contextSubtitle,
  headerHeight = 120,
  rightOffset = 16,
  onClose,
  onReplace,
  'data-testid': testId = 'image-settings-sidebar'
}: Readonly<ImageSettingsSidebarProps>) {
  const { t } = useTranslation(translations)

  const imagePos = image.pos
  const attrs = image.attrs

  const updateImageAttrs = useCallback(
    (nextAttrs: Partial<CustomImageAttributes>) => {
      if (!editor || imagePos == null) return false

      const node = editor.state.doc.nodeAt(imagePos)
      if (node?.type.name !== 'image') {
        onClose()
        return false
      }

      const normalizedCrop =
        nextAttrs.cropTop !== undefined ||
        nextAttrs.cropRight !== undefined ||
        nextAttrs.cropBottom !== undefined ||
        nextAttrs.cropLeft !== undefined
          ? normalizeImageCrop({
              cropTop: nextAttrs.cropTop ?? node.attrs.cropTop ?? 0,
              cropRight: nextAttrs.cropRight ?? node.attrs.cropRight ?? 0,
              cropBottom: nextAttrs.cropBottom ?? node.attrs.cropBottom ?? 0,
              cropLeft: nextAttrs.cropLeft ?? node.attrs.cropLeft ?? 0
            })
          : null

      const tr = editor.state.tr.setNodeMarkup(imagePos, undefined, {
        ...node.attrs,
        ...nextAttrs,
        ...(normalizedCrop
          ? {
              cropTop: normalizedCrop.top,
              cropRight: normalizedCrop.right,
              cropBottom: normalizedCrop.bottom,
              cropLeft: normalizedCrop.left
            }
          : {})
      })

      tr.setSelection(NodeSelection.create(tr.doc, imagePos))
      editor.view.dispatch(tr)
      editor.commands.refreshPagesAndStabilize?.()
      editor.view.focus()
      return true
    },
    [editor, imagePos, onClose]
  )

  const handleDelete = useCallback(() => {
    if (!editor || imagePos == null || image.nodeSize == null) return

    const tr = editor.state.tr.delete(imagePos, imagePos + image.nodeSize)
    editor.view.dispatch(tr)
    onClose()
  }, [editor, image.nodeSize, imagePos, onClose])

  if (!editor || !image.open || !attrs || imagePos == null) {
    return null
  }

  const align = attrs.align ?? 'left'
  const wrapMode = attrs.wrapMode ?? 'inline'
  const wrapTextSide = resolveWordWrapTextSide({
    wrapMode,
    align,
    wrapTextSide: attrs.wrapTextSide ?? null
  })
  const anchorMode = attrs.anchorMode ?? 'inline'
  const caption = attrs.caption ?? ''
  const alt = attrs.alt ?? ''
  const offsetX = attrs.offsetX ?? 0
  const offsetY = attrs.offsetY ?? 0
  const zIndex = attrs.zIndex ?? 1
  const cropTop = attrs.cropTop ?? 0
  const cropRight = attrs.cropRight ?? 0
  const cropBottom = attrs.cropBottom ?? 0
  const cropLeft = attrs.cropLeft ?? 0

  const choiceButtonClass =
    'gba:h-auto gba:min-h-10 gba:whitespace-normal gba:px-2.5 gba:py-2 gba:text-left gba:text-xs gba:font-medium gba:leading-snug'
  const orderedAnchorOptions =
    wrapMode === 'inline'
      ? ANCHOR_OPTIONS
      : [...ANCHOR_OPTIONS.filter(option => option.value !== 'inline'), ANCHOR_OPTIONS[0]]

  return (
    <div
      className="gba:fixed gba:right-0 gba:bottom-0 gba:bg-background gba:border-l gba:border-border/50 gba:flex gba:flex-col gba:overflow-hidden gba:shadow-lg"
      style={{ top: `${headerHeight}px`, right: rightOffset, width: 360, zIndex: 45 }}
      data-testid={testId}
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:px-4 gba:py-3.5 gba:border-b gba:border-border/50 gba:bg-muted/15">
        <div className="gba:min-w-0 gba:pr-1">
          <h3 className="gba:text-base gba:font-semibold gba:leading-tight gba:tracking-tight">
            {t('image-sidebar-title')}
          </h3>
          {contextSubtitle ? (
            <p
              className="gba:mt-1 gba:text-xs gba:text-muted-foreground gba:leading-relaxed"
              data-testid={`${testId}-context-subtitle`}
            >
              {contextSubtitle}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="gba:h-8 gba:w-8 gba:shrink-0"
          onMouseDown={preventEditorBlurOnMouseDown}
          onClick={onClose}
          aria-label={t('editor-header-footer-close')}
          title={t('editor-header-footer-close')}
          data-testid={`${testId}-close`}
        >
          <X className="gba:h-4 gba:w-4" aria-hidden />
        </Button>
      </div>

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden">
        <ScrollArea className="gba:flex-1 gba:h-full">
          <div className="gba:flex gba:flex-col gba:gap-3 gba:px-4 gba:py-4">
            <ImageAdvancedSizeSection
              editor={editor}
              imagePos={imagePos}
              attrs={attrs}
              testId={testId}
              updateImageAttrs={updateImageAttrs}
            />

            <ImageWrapSection
              attrs={attrs}
              wrapMode={wrapMode}
              wrapTextSide={wrapTextSide}
              updateImageAttrs={updateImageAttrs}
              onChoiceMouseDown={preventEditorBlurOnMouseDown}
              testId={testId}
            />

            <ImageSidebarSection title={t('image-context-position')} data-testid={`${testId}-position-section`}>
              <div className="gba:flex gba:flex-col gba:gap-3">
                <div className="gba:space-y-2">
                  <span className="gba:block gba:text-xs gba:font-medium gba:text-foreground">
                    {t('image-context-anchor')}
                  </span>
                  <div className="gba:flex gba:flex-col gba:gap-1.5">
                    {orderedAnchorOptions.map(option => (
                      <Button
                        key={option.value}
                        variant={anchorMode === option.value ? 'secondary' : 'outline'}
                        size="sm"
                        className="gba:h-auto gba:min-h-10 gba:justify-start gba:px-3 gba:py-2.5 gba:text-xs gba:font-medium gba:leading-snug"
                        onMouseDown={preventEditorBlurOnMouseDown}
                        onClick={() => updateImageAttrs({ anchorMode: option.value })}
                        data-testid={`${testId}-anchor-${option.value}`}
                      >
                        {t(option.key)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-lg gba:bg-muted/30 gba:px-3 gba:py-2.5">
                  <Label htmlFor={`${testId}-allow-overlap`} className="gba:text-sm gba:font-medium">
                    {t('image-sidebar-overlap')}
                  </Label>
                  <Switch
                    id={`${testId}-allow-overlap`}
                    checked={attrs.allowOverlap ?? false}
                    onMouseDown={preventEditorBlurOnMouseDown}
                    onCheckedChange={checked => updateImageAttrs({ allowOverlap: checked })}
                    data-testid={`${testId}-allow-overlap`}
                  />
                </div>

                <div className="gba:space-y-2">
                  <span className="gba:block gba:text-xs gba:font-medium gba:text-foreground">
                    {t('image-context-align')}
                  </span>
                  <div className="gba:grid gba:grid-cols-3 gba:gap-1.5">
                    {ALIGN_OPTIONS.map(option => (
                      <Button
                        key={option.value}
                        variant={align === option.value ? 'secondary' : 'outline'}
                        size="sm"
                        className={choiceButtonClass}
                        onMouseDown={preventEditorBlurOnMouseDown}
                        onClick={() => updateImageAttrs({ align: option.value })}
                        data-testid={`${testId}-align-${option.value}`}
                      >
                        {t(option.key)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </ImageSidebarSection>

            <Separator className="gba:my-1" />

            <ImageSidebarSection title={t('image-position-menu')} data-testid={`${testId}-offsets-section`}>
              <div className="gba:grid gba:grid-cols-3 gba:gap-3">
                <div className="gba:space-y-1.5">
                  <Label htmlFor={`${testId}-offset-x`} className="gba:text-xs gba:font-medium">
                    {t('image-sidebar-offset-x')}
                  </Label>
                  <Input
                    id={`${testId}-offset-x`}
                    type="number"
                    value={String(offsetX)}
                    onChange={event => updateImageAttrs({ offsetX: parseNumericInput(event.target.value, offsetX) })}
                    data-testid={`${testId}-offset-x`}
                  />
                </div>
                <div className="gba:space-y-1.5">
                  <Label htmlFor={`${testId}-offset-y`} className="gba:text-xs gba:font-medium">
                    {t('image-sidebar-offset-y')}
                  </Label>
                  <Input
                    id={`${testId}-offset-y`}
                    type="number"
                    value={String(offsetY)}
                    onChange={event => updateImageAttrs({ offsetY: parseNumericInput(event.target.value, offsetY) })}
                    data-testid={`${testId}-offset-y`}
                  />
                </div>
                <div className="gba:space-y-1.5">
                  <Label htmlFor={`${testId}-z-index`} className="gba:text-xs gba:font-medium">
                    {t('image-position-z-index')}
                  </Label>
                  <Input
                    id={`${testId}-z-index`}
                    type="number"
                    value={String(zIndex)}
                    onChange={event => updateImageAttrs({ zIndex: parseNumericInput(event.target.value, zIndex) })}
                    data-testid={`${testId}-z-index`}
                  />
                </div>
              </div>
            </ImageSidebarSection>

            <ImageSidebarSection
              title={t('image-sidebar-accessibility')}
              data-testid={`${testId}-accessibility-section`}
            >
              <div className="gba:space-y-3">
                <div className="gba:space-y-1.5">
                  <Label htmlFor={`${testId}-caption`} className="gba:text-xs gba:font-medium">
                    {t('image-context-caption')}
                  </Label>
                  <Input
                    id={`${testId}-caption`}
                    value={caption}
                    onChange={event => updateImageAttrs({ caption: event.target.value || null })}
                    data-testid={`${testId}-caption`}
                  />
                </div>
                <div className="gba:space-y-1.5">
                  <Label htmlFor={`${testId}-alt-text`} className="gba:text-xs gba:font-medium">
                    {t('image-context-alt-text')}
                  </Label>
                  <Input
                    id={`${testId}-alt-text`}
                    value={alt}
                    onChange={event => updateImageAttrs({ alt: event.target.value })}
                    data-testid={`${testId}-alt-text`}
                  />
                </div>
              </div>
            </ImageSidebarSection>

            <ImageSidebarSection title={t('image-context-spacing')} data-testid={`${testId}-spacing-section`}>
              <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                {DISTANCE_FIELDS.map(field => {
                  const value = attrs[field.key] ?? DEFAULT_IMAGE_DISTANCE

                  return (
                    <div key={field.key} className="gba:space-y-1.5">
                      <Label htmlFor={`${testId}-${field.key}`} className="gba:text-xs gba:font-medium">
                        {t(field.labelKey)}
                      </Label>
                      <Input
                        id={`${testId}-${field.key}`}
                        type="number"
                        value={String(value)}
                        onChange={event =>
                          updateImageAttrs({
                            [field.key]: parseNumericInput(event.target.value, value)
                          })
                        }
                        data-testid={`${testId}-${field.key}`}
                      />
                    </div>
                  )
                })}
              </div>
            </ImageSidebarSection>

            <Separator className="gba:my-1" />

            <ImageSidebarSection
              title={t('image-context-crop')}
              action={
                <div className="gba:flex gba:flex-wrap gba:justify-end gba:gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gba:text-xs"
                    onMouseDown={preventEditorBlurOnMouseDown}
                    onClick={() => dispatchDocumentImageUiMode({ pos: imagePos, mode: 'crop' })}
                    data-testid={`${testId}-crop-mode`}
                  >
                    {t('image-context-crop')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gba:text-xs"
                    onMouseDown={preventEditorBlurOnMouseDown}
                    onClick={() => dispatchDocumentImageUiMode({ pos: imagePos, mode: 'default' })}
                    data-testid={`${testId}-crop-finish`}
                  >
                    {t('image-context-finish-crop')}
                  </Button>
                </div>
              }
              data-testid={`${testId}-crop-section`}
            >
              <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                <div className="gba:space-y-1">
                  <Label htmlFor={`${testId}-crop-top`} className="gba:text-xs gba:text-muted-foreground">
                    {t('image-crop-top')}
                  </Label>
                  <Input
                    id={`${testId}-crop-top`}
                    type="number"
                    step="0.01"
                    min="0"
                    max="0.95"
                    value={String(cropTop)}
                    onChange={event => updateImageAttrs({ cropTop: parseNumericInput(event.target.value, cropTop) })}
                    data-testid={`${testId}-crop-top`}
                  />
                </div>
                <div className="gba:space-y-1">
                  <Label htmlFor={`${testId}-crop-right`} className="gba:text-xs gba:text-muted-foreground">
                    {t('image-crop-right')}
                  </Label>
                  <Input
                    id={`${testId}-crop-right`}
                    type="number"
                    step="0.01"
                    min="0"
                    max="0.95"
                    value={String(cropRight)}
                    onChange={event =>
                      updateImageAttrs({ cropRight: parseNumericInput(event.target.value, cropRight) })
                    }
                    data-testid={`${testId}-crop-right`}
                  />
                </div>
                <div className="gba:space-y-1">
                  <Label htmlFor={`${testId}-crop-bottom`} className="gba:text-xs gba:text-muted-foreground">
                    {t('image-crop-bottom')}
                  </Label>
                  <Input
                    id={`${testId}-crop-bottom`}
                    type="number"
                    step="0.01"
                    min="0"
                    max="0.95"
                    value={String(cropBottom)}
                    onChange={event =>
                      updateImageAttrs({ cropBottom: parseNumericInput(event.target.value, cropBottom) })
                    }
                    data-testid={`${testId}-crop-bottom`}
                  />
                </div>
                <div className="gba:space-y-1">
                  <Label htmlFor={`${testId}-crop-left`} className="gba:text-xs gba:text-muted-foreground">
                    {t('image-crop-left')}
                  </Label>
                  <Input
                    id={`${testId}-crop-left`}
                    type="number"
                    step="0.01"
                    min="0"
                    max="0.95"
                    value={String(cropLeft)}
                    onChange={event => updateImageAttrs({ cropLeft: parseNumericInput(event.target.value, cropLeft) })}
                    data-testid={`${testId}-crop-left`}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onMouseDown={preventEditorBlurOnMouseDown}
                onClick={() =>
                  updateImageAttrs({
                    cropTop: 0,
                    cropRight: 0,
                    cropBottom: 0,
                    cropLeft: 0
                  })
                }
                data-testid={`${testId}-reset-crop`}
              >
                {t('image-context-reset-crop')}
              </Button>
            </ImageSidebarSection>
          </div>
        </ScrollArea>
      </div>

      <div className="gba:flex gba:gap-2 gba:border-t gba:border-border/50 gba:px-4 gba:py-3">
        <Button
          variant="outline"
          className="gba:flex-1"
          onMouseDown={preventEditorBlurOnMouseDown}
          onClick={() => onReplace(imagePos)}
          data-testid={`${testId}-replace`}
        >
          {t('image-context-replace')}
        </Button>
        <Button
          variant="destructive"
          className="gba:flex-1"
          onMouseDown={preventEditorBlurOnMouseDown}
          onClick={handleDelete}
          data-testid={`${testId}-delete`}
        >
          {t('image-context-delete')}
        </Button>
      </div>
    </div>
  )
}
