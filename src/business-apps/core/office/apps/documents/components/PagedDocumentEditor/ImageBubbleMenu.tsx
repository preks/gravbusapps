import { useCallback, useMemo } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { NodeSelection } from '@tiptap/pm/state'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import type { Editor } from '@tiptap/react'
import {
  dispatchDocumentImageUiMode,
  hasImageCrop,
  normalizeImageCrop,
  resolveImageWrapPreset,
  type ImageAlignment,
  type ImageAnchorMode,
  type ImageWrapMode
} from '@/components/tiptap-extensions/tiptap-custom-image'
import translations from '../../_i18n'

const WRAP_OPTIONS: ReadonlyArray<{ key: string; value: ImageWrapMode }> = [
  { key: 'image-wrap-inline', value: 'inline' },
  { key: 'image-wrap-left', value: 'square-left' },
  { key: 'image-wrap-right', value: 'square-right' },
  { key: 'image-wrap-tight', value: 'tight' },
  { key: 'image-wrap-through', value: 'through' },
  { key: 'image-wrap-center', value: 'top-bottom' },
  { key: 'image-wrap-behind', value: 'behind' },
  { key: 'image-wrap-in-front', value: 'front' }
]

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

export interface ImageBubbleMenuProps {
  readonly editor: Editor
  readonly onReplace: (imagePos: number | null) => void
  readonly 'data-testid'?: string
}

function preventEditorBlurOnMouseDown(event: React.MouseEvent<HTMLElement>) {
  event.preventDefault()
}

function parseImageAttributeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return fallback
}

function getSelectedImage(editor: Editor): { pos: number; attrs: Record<string, unknown>; nodeSize: number } | null {
  const { selection } = editor.state

  if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
    return {
      pos: selection.from,
      attrs: selection.node.attrs as Record<string, unknown>,
      nodeSize: selection.node.nodeSize
    }
  }

  const { $from } = selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === 'image') {
      return {
        pos: $from.before(depth),
        attrs: node.attrs as Record<string, unknown>,
        nodeSize: node.nodeSize
      }
    }
  }

  return null
}

export function ImageBubbleMenu({
  editor,
  onReplace,
  'data-testid': testId = 'image-bubble-menu'
}: Readonly<ImageBubbleMenuProps>) {
  const { t } = useTranslation(translations)
  const imageSelection = useMemo(() => getSelectedImage(editor), [editor, editor.state])
  const imageAttrs = imageSelection?.attrs ?? {}
  const wrapMode = (imageAttrs.wrapMode as ImageWrapMode | undefined) ?? 'inline'
  const align = (imageAttrs.align as ImageAlignment | undefined) ?? 'left'
  const anchorMode = (imageAttrs.anchorMode as ImageAnchorMode | undefined) ?? 'inline'
  const zIndex = parseImageAttributeNumber(imageAttrs.zIndex, 1)
  const crop = normalizeImageCrop({
    cropTop: parseImageAttributeNumber(imageAttrs.cropTop, 0),
    cropRight: parseImageAttributeNumber(imageAttrs.cropRight, 0),
    cropBottom: parseImageAttributeNumber(imageAttrs.cropBottom, 0),
    cropLeft: parseImageAttributeNumber(imageAttrs.cropLeft, 0)
  })
  const imageHasCrop = hasImageCrop({
    cropTop: crop.top,
    cropRight: crop.right,
    cropBottom: crop.bottom,
    cropLeft: crop.left
  })

  const updateImageAttrs = useCallback(
    (nextAttrs: Record<string, unknown>) => {
      if (!imageSelection) return false

      const tr = editor.state.tr
      tr.setNodeMarkup(imageSelection.pos, undefined, {
        ...imageSelection.attrs,
        ...nextAttrs
      })
      tr.setSelection(NodeSelection.create(tr.doc, imageSelection.pos))
      editor.view.dispatch(tr)
      editor.commands.refreshPagesAndStabilize?.()
      editor.view.focus()
      return true
    },
    [editor, imageSelection]
  )

  const deleteImage = useCallback(() => editor.commands.removeSelectedImage?.(), [editor])

  const nudgeImage = useCallback(
    (dx: number, dy: number) => {
      editor.commands.moveImage?.(dx, dy)
    },
    [editor]
  )

  const adjustZIndex = useCallback(
    (delta: number) => {
      updateImageAttrs({
        zIndex: zIndex + delta,
        allowOverlap: true
      })
    },
    [updateImageAttrs, zIndex]
  )

  const wrapButtonLabel = t('image-context-wrap-text')
  const alignButtonLabel = t('image-context-align')
  const anchorButtonLabel = t('image-context-anchor')
  const positionButtonLabel = t('image-position-menu')
  const cropButtonLabel = imageHasCrop ? t('image-context-crop-active') : t('image-context-crop')
  const finishCropButtonLabel = t('image-context-finish-crop')

  return (
    <div
      className="gba:flex gba:flex-wrap gba:items-center gba:gap-1 gba:rounded-md gba:border gba:bg-popover gba:px-1 gba:py-1 gba:shadow-md"
      data-testid={testId}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={preventEditorBlurOnMouseDown}
            className="gba:h-8 gba:gap-1"
            data-testid="image-bubble-wrap-trigger"
          >
            {wrapButtonLabel}
            <ChevronDown className="gba:h-3 gba:w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {WRAP_OPTIONS.map(option => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() =>
                editor.commands.setImageLayout?.({
                  ...resolveImageWrapPreset(option.value, imageAttrs)
                })
              }
              data-testid={`image-bubble-wrap-${option.value}`}
            >
              {wrapMode === option.value ? (
                <Check className="gba:mr-2 gba:h-4 gba:w-4" />
              ) : (
                <span className="gba:mr-2 gba:w-4" />
              )}
              {t(option.key)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={preventEditorBlurOnMouseDown}
            className="gba:h-8 gba:gap-1"
            data-testid="image-bubble-align-trigger"
          >
            {alignButtonLabel}
            <ChevronDown className="gba:h-3 gba:w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {ALIGN_OPTIONS.map(option => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => updateImageAttrs({ align: option.value })}
              data-testid={`image-bubble-align-${option.value}`}
            >
              {align === option.value ? (
                <Check className="gba:mr-2 gba:h-4 gba:w-4" />
              ) : (
                <span className="gba:mr-2 gba:w-4" />
              )}
              {t(option.key)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={preventEditorBlurOnMouseDown}
            className="gba:h-8 gba:gap-1"
            data-testid="image-bubble-anchor-trigger"
          >
            {anchorButtonLabel}
            <ChevronDown className="gba:h-3 gba:w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {ANCHOR_OPTIONS.map(option => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => editor.commands.setImageAnchorMode?.(option.value)}
              data-testid={`image-bubble-anchor-${option.value}`}
            >
              {anchorMode === option.value ? (
                <Check className="gba:mr-2 gba:h-4 gba:w-4" />
              ) : (
                <span className="gba:mr-2 gba:w-4" />
              )}
              {t(option.key)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={preventEditorBlurOnMouseDown}
            className="gba:h-8 gba:gap-1"
            data-testid="image-bubble-position-trigger"
          >
            {positionButtonLabel}
            <ChevronDown className="gba:h-3 gba:w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => nudgeImage(-8, 0)} data-testid="image-bubble-position-left">
            {t('image-position-move-left')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => nudgeImage(8, 0)} data-testid="image-bubble-position-right">
            {t('image-position-move-right')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => nudgeImage(0, -8)} data-testid="image-bubble-position-up">
            {t('image-position-move-up')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => nudgeImage(0, 8)} data-testid="image-bubble-position-down">
            {t('image-position-move-down')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => adjustZIndex(1)} data-testid="image-bubble-position-forward">
            {t('image-position-bring-forward')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => adjustZIndex(-1)} data-testid="image-bubble-position-backward">
            {t('image-position-send-backward')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="sm"
        onMouseDown={preventEditorBlurOnMouseDown}
        onClick={() => dispatchDocumentImageUiMode({ pos: imageSelection?.pos ?? null, mode: 'crop' })}
        className="gba:h-8"
        data-testid="image-bubble-crop"
      >
        {cropButtonLabel}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={preventEditorBlurOnMouseDown}
        onClick={() => dispatchDocumentImageUiMode({ pos: imageSelection?.pos ?? null, mode: 'default' })}
        className="gba:h-8"
        data-testid="image-bubble-finish-crop"
      >
        {finishCropButtonLabel}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={preventEditorBlurOnMouseDown}
        onClick={() => editor.commands.resetImageCrop?.()}
        className="gba:h-8"
        data-testid="image-bubble-reset-crop"
      >
        {t('image-context-reset-crop')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={preventEditorBlurOnMouseDown}
        onClick={() => onReplace(imageSelection?.pos ?? null)}
        className="gba:h-8"
        data-testid="image-bubble-replace"
      >
        {t('image-context-replace')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={preventEditorBlurOnMouseDown}
        onClick={deleteImage}
        className="gba:h-8"
        data-testid="image-bubble-delete"
      >
        {t('image-context-delete')}
      </Button>
    </div>
  )
}
