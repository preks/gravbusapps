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
import type { ImageAlignment, ImageWrapMode } from '@/components/tiptap-extensions/tiptap-custom-image'
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

function resolveWrapAlignmentAttrs(wrapMode: ImageWrapMode): Partial<{ align: ImageAlignment }> {
  if (wrapMode === 'square-right') {
    return { align: 'right' }
  }

  if (wrapMode === 'square-left' || wrapMode === 'tight' || wrapMode === 'through') {
    return { align: 'left' }
  }

  return {}
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
  const spacing = parseImageAttributeNumber(imageAttrs.distanceRight, 8)
  const offsetX = parseImageAttributeNumber(imageAttrs.offsetX, 0)
  const offsetY = parseImageAttributeNumber(imageAttrs.offsetY, 0)
  const zIndex = parseImageAttributeNumber(imageAttrs.zIndex, 1)

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
      editor.view.focus()
      return true
    },
    [editor, imageSelection]
  )

  const deleteImage = useCallback(() => {
    if (!imageSelection) return false
    const tr = editor.state.tr.delete(imageSelection.pos, imageSelection.pos + imageSelection.nodeSize)
    editor.view.dispatch(tr)
    editor.view.focus()
    return true
  }, [editor, imageSelection])

  const handleCaption = useCallback(() => {
    const current = typeof imageAttrs.caption === 'string' ? imageAttrs.caption : ''
    const next = globalThis.prompt(t('image-caption-prompt'), current)
    if (next === null) return
    updateImageAttrs({ caption: next.trim() || null })
  }, [imageAttrs.caption, t, updateImageAttrs])

  const handleAltText = useCallback(() => {
    const current = typeof imageAttrs.alt === 'string' ? imageAttrs.alt : ''
    const next = globalThis.prompt(t('image-alt-text-label'), current)
    if (next === null) return
    updateImageAttrs({ alt: next.trim() || '' })
  }, [imageAttrs.alt, t, updateImageAttrs])

  const handleSpacing = useCallback(() => {
    const next = globalThis.prompt(t('image-distance-prompt'), String(spacing))
    if (next === null) return
    const parsed = Number.parseFloat(next.replace(',', '.'))
    if (!Number.isFinite(parsed)) return
    updateImageAttrs({
      distanceTop: parsed,
      distanceRight: parsed,
      distanceBottom: parsed,
      distanceLeft: parsed
    })
  }, [spacing, t, updateImageAttrs])

  const nudgeImage = useCallback(
    (dx: number, dy: number) => {
      updateImageAttrs({
        offsetX: offsetX + dx,
        offsetY: offsetY + dy
      })
    },
    [offsetX, offsetY, updateImageAttrs]
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
  const positionButtonLabel = t('image-position-menu')

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
                updateImageAttrs({
                  wrapMode: option.value,
                  display: option.value === 'inline' ? 'inline' : 'block',
                  anchorMode: option.value === 'behind' || option.value === 'front' ? 'move-with-text' : 'inline',
                  allowOverlap: option.value === 'behind' || option.value === 'front',
                  ...resolveWrapAlignmentAttrs(option.value)
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
        onClick={handleSpacing}
        className="gba:h-8"
        data-testid="image-bubble-spacing"
      >
        {t('image-context-spacing')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={preventEditorBlurOnMouseDown}
        onClick={handleCaption}
        className="gba:h-8"
        data-testid="image-bubble-caption"
      >
        {t('image-context-caption')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={preventEditorBlurOnMouseDown}
        onClick={handleAltText}
        className="gba:h-8"
        data-testid="image-bubble-alt-text"
      >
        {t('image-context-alt-text')}
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
