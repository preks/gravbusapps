import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { Button, Input, Label, ScrollArea, Separator, useTranslation } from '@newwork/nw-design-system'
import type { CustomImageAttributes, ImageAlignment } from '@/components/tiptap-extensions/tiptap-custom-image'
import { ImageAdvancedSizeSection } from './ImageAdvancedSizeSection'
import translations from '../../_i18n'

const DEFAULT_IMAGE_DISTANCE = 0

const ALIGN_OPTIONS: ReadonlyArray<{ key: string; value: ImageAlignment }> = [
  { key: 'editor-toolbar-align-left', value: 'left' },
  { key: 'editor-toolbar-align-center', value: 'center' },
  { key: 'editor-toolbar-align-right', value: 'right' }
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
      if (!node || node.type.name !== 'image') {
        onClose()
        return false
      }

      const tr = editor.state.tr.setNodeMarkup(imagePos, undefined, {
        ...node.attrs,
        ...nextAttrs
      })

      editor.view.dispatch(tr)
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
  const caption = attrs.caption ?? ''
  const alt = attrs.alt ?? ''

  return (
    <div
      className="gba:fixed gba:right-0 gba:bottom-0 gba:bg-background gba:border-l gba:border-border/50 gba:flex gba:flex-col gba:overflow-hidden gba:shadow-lg"
      style={{ top: `${headerHeight}px`, right: rightOffset, width: 360, zIndex: 45 }}
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:px-4 gba:py-3 gba:border-b gba:border-border/50 gba:bg-gradient-to-b gba:from-muted/20 gba:to-transparent">
        <div className="gba:min-w-0">
          <h3 className="gba:text-sm gba:font-semibold">{t('image-sidebar-title')}</h3>
          {contextSubtitle ? (
            <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-context-subtitle`}>
              {contextSubtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden">
        <ScrollArea className="gba:flex-1 gba:h-full">
          <div className="gba:flex gba:flex-col gba:gap-4 gba:px-4 gba:py-4">
            <ImageAdvancedSizeSection
              editor={editor}
              imagePos={imagePos}
              attrs={attrs}
              testId={testId}
              updateImageAttrs={updateImageAttrs}
            />

            <section className="gba:space-y-2">
              <Label className="gba:text-xs gba:text-muted-foreground">{t('image-context-align')}</Label>
              <div className="gba:grid gba:grid-cols-3 gba:gap-2">
                {ALIGN_OPTIONS.map(option => (
                  <Button
                    key={option.value}
                    variant={align === option.value ? 'default' : 'outline'}
                    size="sm"
                    onMouseDown={preventEditorBlurOnMouseDown}
                    onClick={() => updateImageAttrs({ align: option.value })}
                    data-testid={`${testId}-align-${option.value}`}
                  >
                    {t(option.key)}
                  </Button>
                ))}
              </div>
            </section>

            <Separator />

            <section className="gba:space-y-2">
              <Label htmlFor={`${testId}-caption`}>{t('image-context-caption')}</Label>
              <Input
                id={`${testId}-caption`}
                value={caption}
                onChange={event => updateImageAttrs({ caption: event.target.value || null })}
                data-testid={`${testId}-caption`}
              />
            </section>

            <section className="gba:space-y-2">
              <Label htmlFor={`${testId}-alt-text`}>{t('image-context-alt-text')}</Label>
              <Input
                id={`${testId}-alt-text`}
                value={alt}
                onChange={event => updateImageAttrs({ alt: event.target.value })}
                data-testid={`${testId}-alt-text`}
              />
            </section>

            <section className="gba:space-y-2">
              <Label className="gba:text-xs gba:text-muted-foreground">{t('image-context-spacing')}</Label>
              <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                {DISTANCE_FIELDS.map(field => {
                  const value = attrs[field.key] ?? DEFAULT_IMAGE_DISTANCE

                  return (
                    <div key={field.key} className="gba:space-y-1">
                      <Label htmlFor={`${testId}-${field.key}`} className="gba:text-xs gba:text-muted-foreground">
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
            </section>
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
