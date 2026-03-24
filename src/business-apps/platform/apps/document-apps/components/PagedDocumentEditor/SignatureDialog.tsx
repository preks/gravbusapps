/**
 * SignatureDialog – create (typed/drawn) and insert signatures from library.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useTranslation
} from '@newwork/nw-design-system'
import { Loader2, Upload } from 'lucide-react'
import translations from '../../_i18n'
import { UserSignatureApiService, type UserSignatureDto } from '../../services/UserSignatureApiService'
import { SignatureCanvas, strokesToSvg } from './SignatureCanvas'
import { SignatureInkPicker } from './SignatureInkPicker'
import { SignaturePicker } from './SignaturePicker'
import { DEFAULT_SIGNATURE_INK_HEX } from './signatureInkPalette'
import type { StrokeData, StrokePoint } from '@/business-apps/platform/apps/shared/types/strokes'
import {
  typedTextToSvg,
  typedInitialsToSvg,
  type TypedSignatureStyle,
  TYPED_SIGNATURE_STYLE_IDS,
  parseTypedSignatureStyle
} from './typedSignatureStyles'

const UPLOAD_MAX_WIDTH = 800
/** DocuSign-style limits: GIF, JPG, PNG, BMP only; max 500 KB */
const UPLOAD_MAX_FILE_BYTES = 500 * 1024

const ALLOWED_SIGNATURE_UPLOAD_MIME = new Set([
  'image/gif',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/bmp',
  'image/x-ms-bmp'
])

function isAllowedSignatureUploadMime(type: string): boolean {
  const t = type.toLowerCase().trim()
  return ALLOWED_SIGNATURE_UPLOAD_MIME.has(t)
}

const ALLOWED_SIGNATURE_UPLOAD_EXT = /\.(gif|jpe?g|png|bmp)$/i

function isAllowedSignatureUploadFile(file: File): boolean {
  if (isAllowedSignatureUploadMime(file.type)) return true
  if (!file.type && ALLOWED_SIGNATURE_UPLOAD_EXT.test(file.name)) return true
  return false
}

function imageFileToSvgSnapshot(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const w = img.naturalWidth
      const h = img.naturalHeight
      const scale = w > UPLOAD_MAX_WIDTH ? UPLOAD_MAX_WIDTH / w : 1
      const cw = Math.round(w * scale)
      const ch = Math.round(h * scale)
      const canvas = document.createElement('canvas')
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not available'))
        return
      }
      ctx.drawImage(img, 0, 0, cw, ch)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cw} ${ch}" width="${cw}" height="${ch}"><image href="${dataUrl}" width="${cw}" height="${ch}"/></svg>`
      resolve(svg)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}
/** Full signature capture size (exported SVG uses these dimensions). */
const CANVAS_WIDTH = 520
const CANVAS_HEIGHT = 200
/** Initials pad sized for ~40% column vs full signature canvas (60/40 layout). */
const CANVAS_INITIALS_WIDTH = Math.round((CANVAS_WIDTH * 2) / 3)
const CANVAS_INITIALS_HEIGHT = 160

function isStrokePoint(v: unknown): v is StrokePoint {
  if (typeof v !== 'object' || v === null) return false
  const o = v as { x?: unknown; y?: unknown }
  return typeof o.x === 'number' && typeof o.y === 'number'
}

function parseStrokesFromSourceData(raw: unknown): StrokeData[] | null {
  if (!Array.isArray(raw)) return null
  const out: StrokeData[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null
    const o = item as Record<string, unknown>
    if (!Array.isArray(o.points)) return null
    const points: StrokePoint[] = []
    for (const p of o.points) {
      if (!isStrokePoint(p)) return null
      const pt: StrokePoint = { x: p.x, y: p.y }
      if (typeof (p as { pressure?: unknown }).pressure === 'number') {
        pt.pressure = (p as { pressure: number }).pressure
      }
      points.push(pt)
    }
    if (points.length < 2) continue
    out.push({
      points,
      color: typeof o.color === 'string' ? o.color : '#000000',
      width: typeof o.width === 'number' && o.width > 0 ? o.width : 4,
      timestamp: typeof o.timestamp === 'number' ? o.timestamp : Date.now()
    })
  }
  return out.length > 0 ? out : null
}

export interface SignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editor: Editor | null
  accessToken: string | null
  onInsertSignature: (signature: {
    snapshotSvg: string
    name: string
    kind: 'typed' | 'drawn' | 'uploaded'
    id?: string
    insertPart: 'full' | 'initials'
  }) => void
  'data-testid'?: string
}

export function SignatureDialog({
  open,
  onOpenChange,
  editor,
  accessToken,
  onInsertSignature,
  'data-testid': testId = 'signature-dialog'
}: Readonly<SignatureDialogProps>) {
  const { t } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState<'typed' | 'drawn' | 'library' | 'upload'>('library')
  const [signatures, setSignatures] = useState<UserSignatureDto[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [initialsText, setInitialsText] = useState('')
  const [typedStyle, setTypedStyle] = useState<TypedSignatureStyle>('cursive')
  const [drawnStrokes, setDrawnStrokes] = useState<StrokeData[]>([])
  const [drawnInitialsStrokes, setDrawnInitialsStrokes] = useState<StrokeData[]>([])
  const [strokeThickness, setStrokeThickness] = useState(2)
  const [uploadedSnapshotSvg, setUploadedSnapshotSvg] = useState<string | null>(null)
  const [uploadedInitialsSnapshotSvg, setUploadedInitialsSnapshotSvg] = useState<string | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadProcessing, setUploadProcessing] = useState(false)
  const [uploadInitialsProcessing, setUploadInitialsProcessing] = useState(false)
  const [isDraggingUpload, setIsDraggingUpload] = useState(false)
  const [isDraggingUploadInitials, setIsDraggingUploadInitials] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputUploadRef = useRef<HTMLInputElement>(null)
  const fileInputUploadInitialsRef = useRef<HTMLInputElement>(null)
  const [signatureInkHex, setSignatureInkHex] = useState(DEFAULT_SIGNATURE_INK_HEX)
  const [editingSignatureId, setEditingSignatureId] = useState<string | null>(null)
  const editingSignatureIdRef = useRef<string | null>(null)
  const [drawCanvasMountKey, setDrawCanvasMountKey] = useState(0)
  const [signaturePendingDelete, setSignaturePendingDelete] = useState<UserSignatureDto | null>(null)
  const [deletingSignature, setDeletingSignature] = useState(false)
  const deletingSignatureRef = useRef(false)

  useEffect(() => {
    editingSignatureIdRef.current = editingSignatureId
  }, [editingSignatureId])

  const fetchSignatures = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const list = await UserSignatureApiService.list(accessToken)
      setSignatures(list)
      // Preserve the current selection when refreshing so the list does not remount/scroll to top.
      setSelectedId(prev => {
        if (list.length === 0) return null
        if (prev !== null && list.some(s => s.id === prev)) return prev
        return list[0].id
      })
    } catch {
      setSignatures([])
      setSelectedId(null)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (open && accessToken) fetchSignatures()
  }, [open, accessToken, fetchSignatures])

  const resetDialogToLibrary = useCallback(() => {
    setEditingSignatureId(null)
    setSignatureInkHex(DEFAULT_SIGNATURE_INK_HEX)
    setActiveTab('library')
    setFullName('')
    setInitialsText('')
    setSaveName('')
    setTypedStyle('cursive')
    setDrawnStrokes([])
    setDrawnInitialsStrokes([])
    setDrawCanvasMountKey(k => k + 1)
    setUploadedSnapshotSvg(null)
    setUploadedInitialsSnapshotSvg(null)
    setUploadName('')
    setError(null)
    setSelectedId(null)
  }, [])

  useEffect(() => {
    if (open) resetDialogToLibrary()
  }, [open, resetDialogToLibrary])

  const discardEditForms = useCallback(() => {
    setEditingSignatureId(null)
    setFullName('')
    setInitialsText('')
    setSaveName('')
    setDrawnStrokes([])
    setDrawnInitialsStrokes([])
    setDrawCanvasMountKey(k => k + 1)
    setSignatureInkHex(DEFAULT_SIGNATURE_INK_HEX)
    setTypedStyle('cursive')
  }, [])

  const handleCancelEdit = useCallback(() => {
    discardEditForms()
    setActiveTab('library')
  }, [discardEditForms])

  const handleRequestDeleteSignature = useCallback((sig: UserSignatureDto) => {
    setError(null)
    setSignaturePendingDelete(sig)
  }, [])

  const handleConfirmDeleteSignature = useCallback(async () => {
    if (!signaturePendingDelete || !accessToken) return
    const id = signaturePendingDelete.id
    deletingSignatureRef.current = true
    setDeletingSignature(true)
    setError(null)
    try {
      await UserSignatureApiService.remove(id, accessToken)
      setSignaturePendingDelete(null)
      if (editingSignatureId === id) {
        discardEditForms()
        setActiveTab('library')
      }
      const list = await UserSignatureApiService.list(accessToken)
      setSignatures(list)
      setSelectedId(prev => {
        if (prev !== id) return prev
        return list[0]?.id ?? null
      })
    } catch {
      setError(t('signature-delete-failed'))
    } finally {
      deletingSignatureRef.current = false
      setDeletingSignature(false)
    }
  }, [signaturePendingDelete, accessToken, editingSignatureId, discardEditForms, t])

  const handleBeginEdit = useCallback(
    (sig: UserSignatureDto) => {
      if (sig.kind === 'uploaded') return
      setError(null)
      setSaveName(sig.name)
      setSelectedId(sig.id)
      if (sig.kind === 'typed') {
        const sd = sig.sourceData
        if (!sd || typeof sd.text !== 'string' || typeof sd.initials !== 'string') {
          setError(t('signature-error-edit-typed-source'))
          return
        }
        setFullName(sd.text)
        setInitialsText(sd.initials)
        setTypedStyle(parseTypedSignatureStyle(sd.style))
        setSignatureInkHex(typeof sd.inkColor === 'string' ? sd.inkColor : DEFAULT_SIGNATURE_INK_HEX)
        const st = sd.strokeThickness
        setStrokeThickness(typeof st === 'number' && [1, 2, 4, 6].includes(st) ? st : 2)
        setEditingSignatureId(sig.id)
        setActiveTab('typed')
        return
      }
      const sd = sig.sourceData
      const strokes = sd ? parseStrokesFromSourceData(sd.strokes) : null
      const initialsStrokesParsed = sd ? parseStrokesFromSourceData(sd.initialsStrokes) : null
      if (!strokes || !initialsStrokesParsed) {
        setError(t('signature-error-edit-drawn-source'))
        return
      }
      const fn = sd && typeof sd.fullName === 'string' && sd.fullName.trim() !== '' ? sd.fullName.trim() : sig.name
      const ini = sd && typeof sd.initials === 'string' ? sd.initials : ''
      const w = strokes[0]?.width
      const thicknessOption = w !== undefined && [1, 2, 4, 6].includes(w) ? w : 2
      setStrokeThickness(thicknessOption)
      const ink = typeof strokes[0]?.color === 'string' ? strokes[0].color : DEFAULT_SIGNATURE_INK_HEX
      setSignatureInkHex(ink)
      setDrawnStrokes(strokes)
      setDrawnInitialsStrokes(initialsStrokesParsed)
      setDrawCanvasMountKey(k => k + 1)
      setFullName(fn)
      setInitialsText(ini)
      setEditingSignatureId(sig.id)
      setActiveTab('drawn')
    },
    [t]
  )

  const handleSaveTyped = useCallback(async () => {
    if (!fullName.trim() || !initialsText.trim()) {
      setError(t('signature-error-initials-required'))
      return
    }
    const name = (saveName || fullName || t('signature-typed-default-name')).trim()
    if (!name || !accessToken) return
    const snapshotSvg = typedTextToSvg(fullName.trim(), typedStyle, signatureInkHex, strokeThickness)
    const initialsSnapshotSvg = typedInitialsToSvg(initialsText.trim(), typedStyle, signatureInkHex, strokeThickness)
    setSaving(true)
    setError(null)
    const sourceData = {
      text: fullName.trim(),
      initials: initialsText.trim(),
      style: typedStyle,
      inkColor: signatureInkHex,
      strokeThickness
    }
    try {
      if (editingSignatureId) {
        await UserSignatureApiService.update(
          editingSignatureId,
          {
            name,
            snapshotSvg,
            initialsSnapshotSvg,
            sourceData
          },
          accessToken
        )
      } else {
        await UserSignatureApiService.create(
          {
            name,
            kind: 'typed',
            snapshotSvg,
            initialsSnapshotSvg,
            sourceData
          },
          accessToken
        )
      }
      await fetchSignatures()
      setEditingSignatureId(null)
      setActiveTab('library')
      setFullName('')
      setInitialsText('')
      setSaveName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('signature-save-failed'))
    } finally {
      setSaving(false)
    }
  }, [
    fullName,
    initialsText,
    typedStyle,
    signatureInkHex,
    strokeThickness,
    saveName,
    accessToken,
    fetchSignatures,
    t,
    editingSignatureId
  ])

  const handleSaveDrawn = useCallback(async () => {
    if (!fullName.trim() || !initialsText.trim()) {
      setError(t('signature-error-initials-required'))
      return
    }
    if (drawnStrokes.length === 0 || drawnInitialsStrokes.length === 0) {
      setError(t('signature-error-draw-both-required'))
      return
    }
    const name = (saveName || fullName || t('signature-drawn-default-name')).trim()
    if (!accessToken) return
    const snapshotSvg = strokesToSvg(drawnStrokes, CANVAS_WIDTH, CANVAS_HEIGHT, signatureInkHex)
    const initialsSnapshotSvg = strokesToSvg(
      drawnInitialsStrokes,
      CANVAS_INITIALS_WIDTH,
      CANVAS_INITIALS_HEIGHT,
      signatureInkHex
    )
    setSaving(true)
    setError(null)
    const sourceData = {
      strokes: drawnStrokes,
      initialsStrokes: drawnInitialsStrokes,
      fullName: fullName.trim(),
      initials: initialsText.trim()
    }
    try {
      if (editingSignatureId) {
        await UserSignatureApiService.update(
          editingSignatureId,
          {
            name,
            snapshotSvg,
            initialsSnapshotSvg,
            sourceData
          },
          accessToken
        )
      } else {
        await UserSignatureApiService.create(
          {
            name,
            kind: 'drawn',
            snapshotSvg,
            initialsSnapshotSvg,
            sourceData
          },
          accessToken
        )
      }
      await fetchSignatures()
      setEditingSignatureId(null)
      setDrawCanvasMountKey(k => k + 1)
      setActiveTab('library')
      setDrawnStrokes([])
      setDrawnInitialsStrokes([])
      setSaveName('')
      setFullName('')
      setInitialsText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('signature-save-failed'))
    } finally {
      setSaving(false)
    }
  }, [
    drawnStrokes,
    drawnInitialsStrokes,
    fullName,
    initialsText,
    signatureInkHex,
    saveName,
    accessToken,
    fetchSignatures,
    t,
    editingSignatureId
  ])

  const handleUploadFile = useCallback(
    async (file: File, target: 'signature' | 'initials') => {
      if (!isAllowedSignatureUploadFile(file)) {
        setError(t('signature-upload-error-type'))
        return
      }
      if (file.size > UPLOAD_MAX_FILE_BYTES) {
        setError(t('signature-upload-error-size'))
        return
      }
      setError(null)
      const setProcessing = target === 'signature' ? setUploadProcessing : setUploadInitialsProcessing
      const setSvg = target === 'signature' ? setUploadedSnapshotSvg : setUploadedInitialsSnapshotSvg
      setProcessing(true)
      try {
        const svg = await imageFileToSvgSnapshot(file)
        setSvg(svg)
      } catch {
        setError(t('signature-upload-error-load'))
      } finally {
        setProcessing(false)
      }
    },
    [t]
  )

  const onUploadFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, target: 'signature' | 'initials') => {
      const file = e.target.files?.[0]
      const busy = target === 'signature' ? uploadProcessing : uploadInitialsProcessing
      if (file && !busy) handleUploadFile(file, target)
      e.target.value = ''
    },
    [handleUploadFile, uploadProcessing, uploadInitialsProcessing]
  )

  const onUploadDrop = useCallback(
    (e: React.DragEvent, target: 'signature' | 'initials') => {
      e.preventDefault()
      e.stopPropagation()
      if (target === 'signature') setIsDraggingUpload(false)
      else setIsDraggingUploadInitials(false)
      const file = e.dataTransfer.files?.[0]
      const busy = target === 'signature' ? uploadProcessing : uploadInitialsProcessing
      if (file && !busy) handleUploadFile(file, target)
    },
    [handleUploadFile, uploadProcessing, uploadInitialsProcessing]
  )

  const handleSaveUpload = useCallback(async () => {
    if (!fullName.trim() || !initialsText.trim()) {
      setError(t('signature-error-initials-required'))
      return
    }
    const name = (uploadName || fullName || t('signature-upload-default-name')).trim()
    if (!name || !accessToken || !uploadedSnapshotSvg || !uploadedInitialsSnapshotSvg) return
    setSaving(true)
    setError(null)
    try {
      await UserSignatureApiService.create(
        {
          name,
          kind: 'uploaded',
          snapshotSvg: uploadedSnapshotSvg,
          initialsSnapshotSvg: uploadedInitialsSnapshotSvg,
          sourceData: { type: 'upload', initialsText: initialsText.trim() }
        },
        accessToken
      )
      await fetchSignatures()
      setActiveTab('library')
      setUploadedSnapshotSvg(null)
      setUploadedInitialsSnapshotSvg(null)
      setUploadName('')
      setFullName('')
      setInitialsText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('signature-save-failed'))
    } finally {
      setSaving(false)
    }
  }, [
    uploadedSnapshotSvg,
    uploadedInitialsSnapshotSvg,
    uploadName,
    fullName,
    initialsText,
    accessToken,
    fetchSignatures,
    t
  ])

  const handleInsert = useCallback(
    (sig: UserSignatureDto, part: 'full' | 'initials') => {
      if (part === 'initials') {
        if (!sig.initialsSnapshotSvg) return
        onInsertSignature({
          snapshotSvg: sig.initialsSnapshotSvg,
          name: sig.name,
          kind: sig.kind,
          id: sig.id,
          insertPart: 'initials'
        })
      } else {
        onInsertSignature({
          snapshotSvg: sig.snapshotSvg,
          name: sig.name,
          kind: sig.kind,
          id: sig.id,
          insertPart: 'full'
        })
      }
      onOpenChange(false)
    },
    [onInsertSignature, onOpenChange]
  )

  const typedPreviewSvg = fullName.trim()
    ? typedTextToSvg(fullName.trim(), typedStyle, signatureInkHex, strokeThickness)
    : null
  const typedInitialsPreviewSvg = initialsText.trim()
    ? typedInitialsToSvg(initialsText.trim(), typedStyle, signatureInkHex, strokeThickness)
    : null

  const saveLibraryButtonLabel = (() => {
    if (saving) return t('signature-saving')
    if (editingSignatureId) return t('signature-save-update')
    return t('signature-save-to-library')
  })()

  if (!editor) return null

  const deleteBusyId = deletingSignature && signaturePendingDelete ? signaturePendingDelete.id : null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="gba:max-h-[90dvh] gba:overflow-y-auto gba:w-full gba:max-w-3xl gba:gap-6"
          data-testid={testId}
          onPointerDownOutside={() => !saving && onOpenChange(false)}
        >
          <DialogHeader>
            <DialogTitle data-testid={`${testId}-title`}>{t('signature-dialog-title')}</DialogTitle>
          </DialogHeader>

          {activeTab !== 'library' && (
            <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:gap-4 gba:pb-2">
              <div className="gba:space-y-2">
                <Label htmlFor="signature-full-name">{t('signature-full-name-label')}</Label>
                <Input
                  id="signature-full-name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder={t('signature-full-name-placeholder')}
                  data-testid={`${testId}-full-name`}
                />
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="signature-initials-text">{t('signature-initials-label')}</Label>
                <Input
                  id="signature-initials-text"
                  value={initialsText}
                  onChange={e => setInitialsText(e.target.value)}
                  placeholder={t('signature-initials-placeholder')}
                  data-testid={`${testId}-initials-text`}
                />
              </div>
            </div>
          )}

          {editingSignatureId ? (
            <div
              className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2 gba:rounded-md gba:border gba:border-dashed gba:border-input gba:bg-muted/20 gba:px-3 gba:py-2"
              data-testid={`${testId}-edit-banner`}
            >
              <span className="gba:text-sm gba:text-muted-foreground">
                {t('signature-edit-banner', {
                  name: signatures.find(s => s.id === editingSignatureId)?.name ?? ''
                })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                data-testid={`${testId}-edit-cancel`}
              >
                {t('signature-edit-cancel')}
              </Button>
            </div>
          ) : null}

          <Tabs
            value={activeTab}
            onValueChange={v => {
              setError(null)
              if (editingSignatureIdRef.current) discardEditForms()
              setActiveTab(v as 'typed' | 'drawn' | 'library' | 'upload')
            }}
            className="gba:w-full gba:gap-1"
          >
            <TabsList className="gba:grid gba:h-auto gba:w-full gba:grid-cols-2 gba:gap-1 gba:sm:grid-cols-4">
              <TabsTrigger value="library" data-testid={`${testId}-tab-library`}>
                {t('signature-dialog-tab-library')}
              </TabsTrigger>
              <TabsTrigger value="typed" data-testid={`${testId}-tab-typed`}>
                {t('signature-dialog-tab-typed')}
              </TabsTrigger>
              <TabsTrigger value="drawn" data-testid={`${testId}-tab-drawn`}>
                {t('signature-dialog-tab-drawn')}
              </TabsTrigger>
              <TabsTrigger value="upload" data-testid={`${testId}-tab-upload`}>
                {t('signature-dialog-tab-upload')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="gba:pt-4">
              <SignaturePicker
                signatures={signatures}
                loading={loading}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onInsert={handleInsert}
                onEdit={handleBeginEdit}
                onDeleteRequest={handleRequestDeleteSignature}
                busySignatureId={deleteBusyId}
                data-testid={`${testId}-picker`}
              />
            </TabsContent>

            <TabsContent value="typed" className="gba:space-y-4 gba:pt-4">
              <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:sm:grid-cols-3">
                <SignatureInkPicker
                  value={signatureInkHex}
                  onChange={setSignatureInkHex}
                  id={`${testId}-typed-ink`}
                  data-testid={`${testId}-typed-ink-picker`}
                />
                <div className="gba:space-y-2">
                  <Label htmlFor={`${testId}-typed-style`}>{t('signature-typed-style')}</Label>
                  <select
                    id={`${testId}-typed-style`}
                    value={typedStyle}
                    onChange={e => setTypedStyle(e.target.value as TypedSignatureStyle)}
                    className="gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm"
                    data-testid={`${testId}-typed-style`}
                  >
                    {TYPED_SIGNATURE_STYLE_IDS.map(id => (
                      <option key={id} value={id} data-testid={`${testId}-typed-style-${id}`}>
                        {t(`signature-style-${id}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor={`${testId}-typed-stroke-thickness`}>{t('signature-stroke-thickness-label')}</Label>
                  <select
                    id={`${testId}-typed-stroke-thickness`}
                    value={strokeThickness}
                    onChange={e => setStrokeThickness(Number(e.target.value))}
                    className="gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm"
                    data-testid={`${testId}-typed-stroke-thickness`}
                  >
                    <option value={1}>{t('signature-stroke-extra-thin')}</option>
                    <option value={2}>{t('signature-stroke-thin')}</option>
                    <option value={4}>{t('signature-stroke-medium')}</option>
                    <option value={6}>{t('signature-stroke-thick')}</option>
                  </select>
                </div>
              </div>
              <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:gap-4">
                <div className="gba:space-y-2">
                  <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                    {t('signature-typed-preview-full')}
                  </span>
                  {typedPreviewSvg ? (
                    <div
                      className="gba:border gba:border-input gba:rounded-md gba:p-2 gba:bg-muted/20 gba:min-h-[60px]"
                      dangerouslySetInnerHTML={{ __html: typedPreviewSvg }}
                    />
                  ) : (
                    <div className="gba:border gba:border-dashed gba:border-input gba:rounded-md gba:p-4 gba:text-sm gba:text-muted-foreground">
                      {t('signature-typed-preview-empty')}
                    </div>
                  )}
                </div>
                <div className="gba:space-y-2">
                  <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                    {t('signature-typed-preview-initials')}
                  </span>
                  {typedInitialsPreviewSvg ? (
                    <div
                      className="gba:border gba:border-input gba:rounded-md gba:p-2 gba:bg-muted/20 gba:min-h-[60px] gba:flex gba:items-center"
                      dangerouslySetInnerHTML={{ __html: typedInitialsPreviewSvg }}
                    />
                  ) : (
                    <div className="gba:border gba:border-dashed gba:border-input gba:rounded-md gba:p-4 gba:text-sm gba:text-muted-foreground">
                      {t('signature-typed-preview-initials-empty')}
                    </div>
                  )}
                </div>
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="signature-typed-save-name">{t('signature-save-name-label')}</Label>
                <Input
                  id="signature-typed-save-name"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder={fullName || t('signature-save-name-placeholder')}
                  data-testid={`${testId}-typed-save-name`}
                />
              </div>
              <Button
                onClick={handleSaveTyped}
                disabled={!fullName.trim() || !initialsText.trim() || saving}
                data-testid={`${testId}-typed-save`}
              >
                {saveLibraryButtonLabel}
              </Button>
            </TabsContent>

            <TabsContent value="drawn" className="gba:space-y-5 gba:pt-4">
              <div className="gba:space-y-5">
                <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:sm:grid-cols-2">
                  <SignatureInkPicker
                    value={signatureInkHex}
                    onChange={setSignatureInkHex}
                    id={`${testId}-drawn-ink`}
                    data-testid={`${testId}-drawn-ink-picker`}
                  />
                  <div className="gba:space-y-2">
                    <Label htmlFor="signature-stroke-thickness">{t('signature-stroke-thickness-label')}</Label>
                    <select
                      id="signature-stroke-thickness"
                      value={strokeThickness}
                      onChange={e => setStrokeThickness(Number(e.target.value))}
                      className="gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:py-2 gba:text-sm"
                      data-testid={`${testId}-stroke-thickness`}
                    >
                      <option value={1}>{t('signature-stroke-extra-thin')}</option>
                      <option value={2}>{t('signature-stroke-thin')}</option>
                      <option value={4}>{t('signature-stroke-medium')}</option>
                      <option value={6}>{t('signature-stroke-thick')}</option>
                    </select>
                  </div>
                </div>

                <div className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/10 gba:p-4 gba:sm:p-5">
                  <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-[3fr_2fr] gba:items-start">
                    <div className="gba:space-y-2 gba:min-w-0">
                      <Label className="gba:text-sm">{t('signature-draw-full-canvas-label')}</Label>
                      <SignatureCanvas
                        key={`${testId}-canvas-draw-${drawCanvasMountKey}`}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        penWidth={strokeThickness}
                        penColor={signatureInkHex}
                        inputMode="direct"
                        onStrokesChange={setDrawnStrokes}
                        initialStrokes={drawnStrokes}
                        data-testid={`${testId}-canvas`}
                      />
                    </div>
                    <div className="gba:space-y-2 gba:min-w-0">
                      <Label className="gba:text-sm">{t('signature-draw-initials-canvas-label')}</Label>
                      <SignatureCanvas
                        key={`${testId}-canvas-draw-ini-${drawCanvasMountKey}`}
                        width={CANVAS_INITIALS_WIDTH}
                        height={CANVAS_INITIALS_HEIGHT}
                        penWidth={strokeThickness}
                        penColor={signatureInkHex}
                        inputMode="direct"
                        onStrokesChange={setDrawnInitialsStrokes}
                        initialStrokes={drawnInitialsStrokes}
                        data-testid={`${testId}-canvas-initials`}
                      />
                    </div>
                  </div>
                </div>

                <div className="gba:space-y-2">
                  <Label htmlFor="signature-drawn-save-name">{t('signature-save-name-label')}</Label>
                  <Input
                    id="signature-drawn-save-name"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    placeholder={fullName || t('signature-save-name-placeholder')}
                    data-testid={`${testId}-drawn-save-name`}
                  />
                </div>
                <Button
                  onClick={handleSaveDrawn}
                  disabled={
                    drawnStrokes.length === 0 ||
                    drawnInitialsStrokes.length === 0 ||
                    !fullName.trim() ||
                    !initialsText.trim() ||
                    saving
                  }
                  data-testid={`${testId}-drawn-save`}
                >
                  {saveLibraryButtonLabel}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="gba:space-y-4 gba:pt-4">
              <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:gap-4">
                <div className="gba:space-y-2">
                  <Label className="gba:text-sm">{t('signature-upload-zone-full')}</Label>
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() => !uploadProcessing && fileInputUploadRef.current?.click()}
                    onDrop={e => onUploadDrop(e, 'signature')}
                    onDragOver={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (!uploadProcessing) setIsDraggingUpload(true)
                    }}
                    onDragLeave={e => {
                      e.preventDefault()
                      setIsDraggingUpload(false)
                    }}
                    onKeyDown={e => e.key === 'Enter' && !uploadProcessing && fileInputUploadRef.current?.click()}
                    disabled={uploadProcessing}
                    className={`gba:w-full gba:border-2 gba:border-dashed gba:rounded-md gba:p-4 gba:text-center gba:transition-colors gba:bg-transparent ${
                      uploadProcessing ? 'gba:cursor-wait gba:opacity-70' : 'gba:cursor-pointer'
                    } ${
                      isDraggingUpload && !uploadProcessing
                        ? 'gba:border-primary gba:bg-primary/5'
                        : 'gba:border-muted-foreground/25 gba:hover:border-muted-foreground/50'
                    }`}
                    data-testid={`${testId}-upload-drop-zone`}
                  >
                    <input
                      ref={fileInputUploadRef}
                      type="file"
                      accept=".gif,.jpg,.jpeg,.png,.bmp,image/gif,image/jpeg,image/png,image/bmp"
                      onChange={e => onUploadFileInputChange(e, 'signature')}
                      className="gba:sr-only"
                      aria-label={t('signature-upload-choose-file-full')}
                      disabled={uploadProcessing}
                    />
                    <Upload className="gba:mx-auto gba:h-6 gba:w-6 gba:text-muted-foreground gba:mb-2" />
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {uploadProcessing ? t('signature-upload-processing') : t('signature-upload-drop-here')}
                    </p>
                    <p
                      className="gba:text-xs gba:text-muted-foreground gba:mt-2"
                      data-testid={`${testId}-upload-formats-hint`}
                    >
                      {t('signature-upload-formats-hint')}
                    </p>
                  </button>
                  {uploadedSnapshotSvg && (
                    <div
                      className="gba:border gba:border-input gba:rounded-md gba:p-2 gba:bg-muted/20 gba:h-32 gba:w-full gba:overflow-hidden gba:flex gba:items-center gba:justify-center"
                      data-testid={`${testId}-upload-preview`}
                    >
                      <img
                        src={`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(uploadedSnapshotSvg)))}`}
                        alt=""
                        className="gba:max-h-full gba:max-w-full gba:w-auto gba:h-auto gba:object-contain"
                      />
                    </div>
                  )}
                </div>
                <div className="gba:space-y-2">
                  <Label className="gba:text-sm">{t('signature-upload-zone-initials')}</Label>
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() => !uploadInitialsProcessing && fileInputUploadInitialsRef.current?.click()}
                    onDrop={e => onUploadDrop(e, 'initials')}
                    onDragOver={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (!uploadInitialsProcessing) setIsDraggingUploadInitials(true)
                    }}
                    onDragLeave={e => {
                      e.preventDefault()
                      setIsDraggingUploadInitials(false)
                    }}
                    onKeyDown={e =>
                      e.key === 'Enter' && !uploadInitialsProcessing && fileInputUploadInitialsRef.current?.click()
                    }
                    disabled={uploadInitialsProcessing}
                    className={`gba:w-full gba:border-2 gba:border-dashed gba:rounded-md gba:p-4 gba:text-center gba:transition-colors gba:bg-transparent ${
                      uploadInitialsProcessing ? 'gba:cursor-wait gba:opacity-70' : 'gba:cursor-pointer'
                    } ${
                      isDraggingUploadInitials && !uploadInitialsProcessing
                        ? 'gba:border-primary gba:bg-primary/5'
                        : 'gba:border-muted-foreground/25 gba:hover:border-muted-foreground/50'
                    }`}
                    data-testid={`${testId}-upload-drop-zone-initials`}
                  >
                    <input
                      ref={fileInputUploadInitialsRef}
                      type="file"
                      accept=".gif,.jpg,.jpeg,.png,.bmp,image/gif,image/jpeg,image/png,image/bmp"
                      onChange={e => onUploadFileInputChange(e, 'initials')}
                      className="gba:sr-only"
                      aria-label={t('signature-upload-choose-file-initials')}
                      disabled={uploadInitialsProcessing}
                    />
                    <Upload className="gba:mx-auto gba:h-6 gba:w-6 gba:text-muted-foreground gba:mb-2" />
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {uploadInitialsProcessing
                        ? t('signature-upload-processing')
                        : t('signature-upload-drop-here-initials')}
                    </p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                      {t('signature-upload-formats-hint')}
                    </p>
                  </button>
                  {uploadedInitialsSnapshotSvg && (
                    <div
                      className="gba:border gba:border-input gba:rounded-md gba:p-2 gba:bg-muted/20 gba:h-32 gba:w-full gba:overflow-hidden gba:flex gba:items-center gba:justify-center"
                      data-testid={`${testId}-upload-preview-initials`}
                    >
                      <img
                        src={`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(uploadedInitialsSnapshotSvg)))}`}
                        alt=""
                        className="gba:max-h-full gba:max-w-full gba:w-auto gba:h-auto gba:object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="gba:space-y-2">
                <Label htmlFor="signature-upload-name">{t('signature-save-name-label')}</Label>
                <Input
                  id="signature-upload-name"
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                  placeholder={fullName || t('signature-upload-name-placeholder')}
                  data-testid={`${testId}-upload-name`}
                />
              </div>
              <Button
                onClick={handleSaveUpload}
                disabled={
                  !uploadedSnapshotSvg ||
                  !uploadedInitialsSnapshotSvg ||
                  !fullName.trim() ||
                  !initialsText.trim() ||
                  saving
                }
                data-testid={`${testId}-upload-save`}
              >
                {saving ? t('signature-saving') : t('signature-save-to-library')}
              </Button>
              {activeTab === 'upload' && error && (
                <p className="gba:text-sm gba:text-destructive" role="alert" data-testid={`${testId}-upload-error`}>
                  {error}
                </p>
              )}
            </TabsContent>
          </Tabs>

          {error && activeTab !== 'upload' && (
            <p className="gba:text-sm gba:text-destructive" role="alert" data-testid={`${testId}-error`}>
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              data-testid={`${testId}-cancel`}
            >
              {t('insert-image-cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={signaturePendingDelete !== null}
        onOpenChange={nextOpen => {
          if (!nextOpen && !deletingSignatureRef.current) {
            setSignaturePendingDelete(null)
            setError(null)
          }
        }}
      >
        <AlertDialogContent data-testid={`${testId}-delete-alert`}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('signature-delete-confirm-title')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {signaturePendingDelete
                  ? t('signature-delete-confirm-description', { name: signaturePendingDelete.name })
                  : null}
                {error && signaturePendingDelete ? (
                  <p
                    className="gba:mt-2 gba:text-sm gba:text-destructive"
                    role="alert"
                    data-testid={`${testId}-delete-error`}
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSignature} data-testid={`${testId}-delete-cancel`}>
              {t('signature-delete-confirm-cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingSignature}
              onClick={() => {
                void handleConfirmDeleteSignature()
              }}
              className="gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90"
              data-testid={`${testId}-delete-confirm`}
            >
              {deletingSignature ? (
                <>
                  <Loader2 className="gba:inline gba:size-4 gba:mr-2 gba:animate-spin" aria-hidden />
                  {t('signature-deleting')}
                </>
              ) : (
                t('signature-delete-confirm-action')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
