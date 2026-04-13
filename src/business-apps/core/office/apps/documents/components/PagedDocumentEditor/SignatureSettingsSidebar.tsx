import { useCallback } from 'react'
import { X } from '@phosphor-icons/react'
import { Button, Input, Label, ScrollArea, Separator, Switch, useTranslation } from '@newwork/nw-design-system'
import type { Editor } from '@tiptap/react'
import { normalizeImageCrop } from '@/components/tiptap-extensions/tiptap-custom-image'
import translations from '../../_i18n'
import { dispatchDocumentSignatureUiMode } from './signatureUiEvents'

/** Scalar attrs for the `signature` node (avoid coupling to extension file). */
export interface SignatureSidebarAttributes {
  signatureId: string | null
  kind: string
  snapshotSvg: string
  name: string | null
  pageNumber: number | null
  x: number | null
  y: number | null
  width: number
  height: number
  lockAspectRatio: boolean
  createdBy: string | null
  cropTop: number
  cropRight: number
  cropBottom: number
  cropLeft: number
  rotation?: number
}

export interface SelectedSignatureSidebarState {
  open: boolean
  editor: Editor | null
  pos: number | null
  nodeSize: number | null
  attrs: SignatureSidebarAttributes | null
}

export interface SignatureSettingsSidebarProps {
  editor: Editor | null
  signature: SelectedSignatureSidebarState
  contextSubtitle?: string
  /** When true, interactive crop mode is on for this signature (handles on the canvas). */
  signatureCropActive?: boolean
  headerHeight?: number
  rightOffset?: number
  onClose: () => void
  onReplace: () => void
  'data-testid'?: string
}

function parseNumericInput(value: string, fallback: number): number {
  const trimmed = value.trim().replace(/\s/g, '')
  if (trimmed === '') return fallback
  // Locale decimals (e.g. 0,175); avoid parseFloat("0,175") === 0
  const normalized = trimmed.replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

function preventEditorBlurOnMouseDown(event: React.MouseEvent<HTMLElement>) {
  event.preventDefault()
}

function isFloatingSignature(attrs: SignatureSidebarAttributes): boolean {
  return typeof attrs.x === 'number' && typeof attrs.y === 'number'
}

export function SignatureSettingsSidebar({
  editor,
  signature,
  contextSubtitle,
  signatureCropActive = false,
  headerHeight = 120,
  rightOffset = 16,
  onClose,
  onReplace,
  'data-testid': testId = 'document-signature-settings-sidebar'
}: Readonly<SignatureSettingsSidebarProps>) {
  const { t } = useTranslation(translations)
  const sigPos = signature.pos
  const attrs = signature.attrs
  const nodeSize = signature.nodeSize

  const updateSignatureAttrs = useCallback(
    (partial: Partial<SignatureSidebarAttributes>) => {
      if (!editor || sigPos == null) return false
      const ok = editor.chain().focus().setNodeSelection(sigPos).updateAttributes('signature', partial).run()
      if (ok) {
        editor.commands.refreshPagesAndStabilize?.()
      }
      return ok
    },
    [editor, sigPos]
  )

  const handleRemove = useCallback(() => {
    if (!editor || sigPos == null || nodeSize == null) return
    const tr = editor.state.tr.delete(sigPos, sigPos + nodeSize)
    editor.view.dispatch(tr)
    onClose()
  }, [editor, nodeSize, onClose, sigPos])

  if (!editor || !signature.open || !attrs || sigPos == null || nodeSize == null) {
    return null
  }

  const floating = isFloatingSignature(attrs)
  const width = attrs.width ?? 200
  const height = attrs.height ?? 80
  const lockAspectRatio = attrs.lockAspectRatio !== false

  const applySize = (nextW: number, nextH: number) => {
    const w = Math.max(1, Math.round(nextW))
    const h = Math.max(1, Math.round(nextH))
    updateSignatureAttrs({ width: w, height: h })
  }

  const onWidthChange = (raw: string) => {
    const nextW = parseNumericInput(raw, width)
    if (lockAspectRatio && width > 0) {
      const ratio = height / width
      applySize(nextW, nextW * ratio)
    } else {
      applySize(nextW, height)
    }
  }

  const onHeightChange = (raw: string) => {
    const nextH = parseNumericInput(raw, height)
    if (lockAspectRatio && height > 0) {
      const ratio = width / height
      applySize(nextH * ratio, nextH)
    } else {
      applySize(width, nextH)
    }
  }

  return (
    <div
      className="gba:fixed gba:right-0 gba:bottom-0 gba:bg-background gba:border-l gba:border-border/50 gba:flex gba:flex-col gba:overflow-hidden gba:shadow-lg"
      style={{
        top: `${headerHeight}px`,
        right: rightOffset,
        width: 360,
        zIndex: 45
      }}
      data-testid={testId}
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:px-4 gba:py-3.5 gba:border-b gba:border-border/50 gba:bg-muted/15">
        <div className="gba:min-w-0 gba:pr-1">
          <h3 className="gba:text-base gba:font-semibold gba:leading-tight gba:tracking-tight">
            {t('signature-sidebar-title')}
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
          <div className="gba:flex gba:flex-col gba:gap-4 gba:px-4 gba:py-4">
            <div className="gba:space-y-2">
              <Label htmlFor={`${testId}-name`}>{t('signature-sidebar-name')}</Label>
              <Input
                id={`${testId}-name`}
                value={attrs.name ?? ''}
                onChange={e => updateSignatureAttrs({ name: e.target.value || null })}
                data-testid={`${testId}-name-input`}
              />
            </div>

            <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
              <Label htmlFor={`${testId}-lock-aspect`} className="gba:mb-0">
                {t('signature-sidebar-lock-aspect')}
              </Label>
              <Switch
                id={`${testId}-lock-aspect`}
                checked={lockAspectRatio}
                onMouseDown={preventEditorBlurOnMouseDown}
                onCheckedChange={v => updateSignatureAttrs({ lockAspectRatio: v })}
                data-testid={`${testId}-lock-aspect`}
              />
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-3">
              <div className="gba:space-y-2">
                <Label htmlFor={`${testId}-width`}>{t('signature-sidebar-width')}</Label>
                <Input
                  id={`${testId}-width`}
                  type="text"
                  inputMode="decimal"
                  value={String(width)}
                  onChange={e => onWidthChange(e.target.value)}
                  data-testid={`${testId}-width-input`}
                />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor={`${testId}-height`}>{t('signature-sidebar-height')}</Label>
                <Input
                  id={`${testId}-height`}
                  type="text"
                  inputMode="decimal"
                  value={String(height)}
                  onChange={e => onHeightChange(e.target.value)}
                  data-testid={`${testId}-height-input`}
                />
              </div>
            </div>

            <div className="gba:space-y-2">
              <Label htmlFor={`${testId}-rotation`}>{t('image-sidebar-rotation')}</Label>
              <Input
                id={`${testId}-rotation`}
                type="text"
                inputMode="decimal"
                value={String(attrs.rotation ?? 0)}
                onChange={e =>
                  updateSignatureAttrs({
                    rotation: parseNumericInput(e.target.value, attrs.rotation ?? 0)
                  })
                }
                data-testid={`${testId}-rotation-input`}
              />
            </div>

            {floating ? (
              <>
                <Separator />
                <p className="gba:text-xs gba:font-medium gba:text-foreground">
                  {t('signature-sidebar-floating-position')}
                </p>
                <div className="gba:grid gba:grid-cols-3 gba:gap-2">
                  <div className="gba:space-y-2">
                    <Label htmlFor={`${testId}-page`}>{t('signature-sidebar-page')}</Label>
                    <Input
                      id={`${testId}-page`}
                      type="text"
                      inputMode="numeric"
                      value={String(attrs.pageNumber ?? 1)}
                      onChange={e => {
                        const p = Math.max(1, Math.round(parseNumericInput(e.target.value, attrs.pageNumber ?? 1)))
                        updateSignatureAttrs({ pageNumber: p })
                      }}
                      data-testid={`${testId}-page-input`}
                    />
                  </div>
                  <div className="gba:space-y-2">
                    <Label htmlFor={`${testId}-x`}>{t('signature-sidebar-x')}</Label>
                    <Input
                      id={`${testId}-x`}
                      type="text"
                      inputMode="decimal"
                      value={String(attrs.x ?? 0)}
                      onChange={e => updateSignatureAttrs({ x: parseNumericInput(e.target.value, attrs.x ?? 0) })}
                      data-testid={`${testId}-x-input`}
                    />
                  </div>
                  <div className="gba:space-y-2">
                    <Label htmlFor={`${testId}-y`}>{t('signature-sidebar-y')}</Label>
                    <Input
                      id={`${testId}-y`}
                      type="text"
                      inputMode="decimal"
                      value={String(attrs.y ?? 0)}
                      onChange={e => updateSignatureAttrs({ y: parseNumericInput(e.target.value, attrs.y ?? 0) })}
                      data-testid={`${testId}-y-input`}
                    />
                  </div>
                </div>
              </>
            ) : null}

            <Separator />

            <div
              className="gba:flex gba:flex-col gba:gap-3"
              data-testid={`${testId}-crop-section`}
              aria-labelledby={`${testId}-crop-heading`}
            >
              <div className="gba:flex gba:flex-col gba:gap-2">
                <h4
                  id={`${testId}-crop-heading`}
                  className="gba:text-xs gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide"
                >
                  {t('signature-sidebar-crop-section')}
                </h4>
                {signatureCropActive ? (
                  <p
                    className="gba:rounded-md gba:border gba:border-primary/30 gba:bg-primary/5 gba:px-3 gba:py-2 gba:text-xs gba:leading-relaxed gba:text-foreground"
                    data-testid={`${testId}-crop-active-banner`}
                    role="status"
                  >
                    {t('signature-sidebar-crop-active-banner')}
                  </p>
                ) : (
                  <p className="gba:text-xs gba:leading-relaxed gba:text-muted-foreground">
                    {t('signature-sidebar-crop-intro')}
                  </p>
                )}
              </div>

              <div className="gba:flex gba:flex-wrap gba:justify-end gba:gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gba:text-xs"
                  disabled={signatureCropActive}
                  onMouseDown={preventEditorBlurOnMouseDown}
                  onClick={() => {
                    if (sigPos == null) return
                    dispatchDocumentSignatureUiMode({ pos: sigPos, mode: 'crop' })
                  }}
                  data-testid={`${testId}-crop-mode`}
                >
                  {signatureCropActive ? t('signature-sidebar-cropping') : t('signature-sidebar-crop-start')}
                </Button>
                <Button
                  type="button"
                  variant={signatureCropActive ? 'default' : 'outline'}
                  size="sm"
                  className="gba:text-xs"
                  onMouseDown={preventEditorBlurOnMouseDown}
                  onClick={() => {
                    if (sigPos == null) return
                    dispatchDocumentSignatureUiMode({ pos: sigPos, mode: 'default' })
                  }}
                  data-testid={`${testId}-crop-finish`}
                >
                  {t('signature-sidebar-crop-done')}
                </Button>
              </div>

              <p className="gba:text-xs gba:leading-relaxed gba:text-muted-foreground">
                {t('signature-sidebar-crop-values-hint')}
              </p>

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
                    value={String(attrs.cropTop ?? 0)}
                    onChange={event => {
                      const next = normalizeImageCrop({
                        cropTop: parseNumericInput(event.target.value, attrs.cropTop ?? 0),
                        cropRight: attrs.cropRight ?? 0,
                        cropBottom: attrs.cropBottom ?? 0,
                        cropLeft: attrs.cropLeft ?? 0
                      })
                      updateSignatureAttrs({
                        cropTop: next.top,
                        cropRight: next.right,
                        cropBottom: next.bottom,
                        cropLeft: next.left
                      })
                    }}
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
                    value={String(attrs.cropRight ?? 0)}
                    onChange={event => {
                      const next = normalizeImageCrop({
                        cropTop: attrs.cropTop ?? 0,
                        cropRight: parseNumericInput(event.target.value, attrs.cropRight ?? 0),
                        cropBottom: attrs.cropBottom ?? 0,
                        cropLeft: attrs.cropLeft ?? 0
                      })
                      updateSignatureAttrs({
                        cropTop: next.top,
                        cropRight: next.right,
                        cropBottom: next.bottom,
                        cropLeft: next.left
                      })
                    }}
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
                    value={String(attrs.cropBottom ?? 0)}
                    onChange={event => {
                      const next = normalizeImageCrop({
                        cropTop: attrs.cropTop ?? 0,
                        cropRight: attrs.cropRight ?? 0,
                        cropBottom: parseNumericInput(event.target.value, attrs.cropBottom ?? 0),
                        cropLeft: attrs.cropLeft ?? 0
                      })
                      updateSignatureAttrs({
                        cropTop: next.top,
                        cropRight: next.right,
                        cropBottom: next.bottom,
                        cropLeft: next.left
                      })
                    }}
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
                    value={String(attrs.cropLeft ?? 0)}
                    onChange={event => {
                      const next = normalizeImageCrop({
                        cropTop: attrs.cropTop ?? 0,
                        cropRight: attrs.cropRight ?? 0,
                        cropBottom: attrs.cropBottom ?? 0,
                        cropLeft: parseNumericInput(event.target.value, attrs.cropLeft ?? 0)
                      })
                      updateSignatureAttrs({
                        cropTop: next.top,
                        cropRight: next.right,
                        cropBottom: next.bottom,
                        cropLeft: next.left
                      })
                    }}
                    data-testid={`${testId}-crop-left`}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="gba:flex gba:flex-col gba:gap-2">
              <Button
                type="button"
                variant="outline"
                onMouseDown={preventEditorBlurOnMouseDown}
                onClick={onReplace}
                data-testid={`${testId}-replace`}
              >
                {t('signature-sidebar-replace')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onMouseDown={preventEditorBlurOnMouseDown}
                onClick={handleRemove}
                data-testid={`${testId}-remove`}
              >
                {t('signature-sidebar-remove')}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
