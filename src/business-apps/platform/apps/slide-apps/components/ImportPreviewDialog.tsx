// Slide-selection dialog shown after parsing a PPTX, before importing.

import React, { useState, useCallback, useMemo } from 'react'
import { Button, Checkbox, ScrollArea, useTranslation } from '@newwork/nw-design-system'
import { CheckCircle, FileSpreadsheet } from 'lucide-react'
import type { ParsedPowerPointDocument } from '../hooks/usePowerPointParser'
import type { SlideData, ShapeElement } from './slideElements'
import { gradientToCss, textTransformToCss } from './slideElements'
import type { RichTextTransform } from './slideElements'
import { tryRenderOfficePresetShape } from './OfficeShapeRenderer'
import translations from '../_i18n'
import { sanitizeSlideImageUrl } from '../utils/slideMediaUrl'

export interface ImportPreviewDialogProps {
  parsedDocument: ParsedPowerPointDocument
  onConfirm: (doc: ParsedPowerPointDocument) => void
  onCancel: () => void
  'data-testid'?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const THUMB_SCALE = 1 / 8
/** Fallback canvas used when a slide has no explicit <p:sldSz> (legacy decks). */
const DEFAULT_CANVAS_W = 1280
const DEFAULT_CANVAS_H = 720

function ThumbImage({ src, style }: { src: string; style: React.CSSProperties }) {
  const [failed, setFailed] = React.useState(false)
  // Preview must use the same image URL sanitization as the editor so that a
  // slide that passes preview cannot later render as a blank frame in the
  // canvas (or vice versa).
  const safeSrc = sanitizeSlideImageUrl(src)
  if (failed || !safeSrc) {
    return <div style={{ ...style, backgroundColor: 'var(--nw-muted)' }} />
  }
  return <img src={safeSrc} alt="" style={{ ...style, objectFit: 'cover' }} onError={() => setFailed(true)} />
}

function ThumbElement({ el, idx }: { el: SlideData['elements'][number]; idx: number }) {
  const base: React.CSSProperties = {
    position: 'absolute',
    left: el.position.x * THUMB_SCALE,
    top: el.position.y * THUMB_SCALE,
    width: el.size.width * THUMB_SCALE,
    height: el.size.height * THUMB_SCALE,
    opacity: el.opacity ?? 1,
    overflow: 'hidden',
    zIndex: el.zIndex ?? idx,
    ...(el.rotation ? { transform: `rotate(${el.rotation}deg)` } : {})
  }

  if (el.type === 'text') {
    const te = el as SlideData['elements'][number] & {
      content?: string
      fontSize?: number
      color?: string
      fontWeight?: string
      fontFamily?: string
      textAlign?: string
      backgroundColor?: string
      textTransform?: RichTextTransform
    }
    const bgColor = te.backgroundColor && te.backgroundColor !== 'transparent' ? te.backgroundColor : undefined
    return (
      <div
        style={{
          ...base,
          fontSize: Math.max(1, (te.fontSize || 16) * THUMB_SCALE),
          lineHeight: 1.2,
          color: te.color || '#000',
          fontWeight: te.fontWeight || 'normal',
          fontFamily: te.fontFamily || 'Inter',
          textAlign: (te.textAlign as React.CSSProperties['textAlign']) || 'left',
          ...textTransformToCss(te.textTransform),
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          backgroundColor: bgColor
        }}
      >
        {(te.content || '').slice(0, 200)}
      </div>
    )
  }

  if (el.type === 'image') {
    const ie = el as SlideData['elements'][number] & { src?: string }
    return <ThumbImage src={ie.src || ''} style={base} />
  }

  if (el.type === 'shape') {
    const se = el as ShapeElement
    const fillColor = se.fill || 'transparent'
    const fillStyle = se.gradient ? gradientToCss(se.gradient) : fillColor
    // Preset-aware preview: when the imported shape carries Office metadata,
    // render it using the same SVG paths the editor uses so users see the
    // real geometry before committing to import.
    const officePreset = tryRenderOfficePresetShape({
      element: se,
      fillStyle: fillStyle === 'transparent' ? 'transparent' : fillStyle,
      strokeColor: se.strokeColor || '#888',
      strokeWidth: se.strokeWidth ? Math.max(0.5, se.strokeWidth * THUMB_SCALE) : 0,
      shadow: false,
      width: Math.max(1, se.size.width * THUMB_SCALE),
      height: Math.max(1, se.size.height * THUMB_SCALE)
    })

    if (officePreset) {
      return (
        <div style={{ ...base, position: 'relative' as const }}>
          {officePreset}
          {se.shapeText?.content && (
            <div
              className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:px-0.5 gba:overflow-hidden gba:text-center gba:leading-tight gba:line-clamp-2"
              style={{
                color: se.shapeText.color || 'inherit',
                fontSize: Math.max(3, (se.shapeText.fontSize || 12) * 0.08 * THUMB_SCALE)
              }}
            >
              {se.shapeText.content.slice(0, 40)}
            </div>
          )}
        </div>
      )
    }

    const borderRadius =
      se.shapeType === 'circle' || se.shapeType === 'ellipse' ? '50%' : se.shapeType === 'rounded-rectangle' ? 4 : 0
    return (
      <div
        style={{
          ...base,
          position: 'relative' as const,
          backgroundColor: fillColor === 'transparent' ? 'transparent' : fillColor,
          borderRadius,
          border: se.strokeWidth
            ? `${Math.max(0.5, se.strokeWidth * THUMB_SCALE)}px solid ${se.strokeColor || '#888'}`
            : undefined
        }}
      >
        {se.shapeText?.content && (
          <div
            className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:px-0.5 gba:overflow-hidden gba:text-center gba:leading-tight gba:line-clamp-2"
            style={{
              color: se.shapeText.color || 'inherit',
              fontSize: Math.max(3, (se.shapeText.fontSize || 12) * 0.08 * THUMB_SCALE)
            }}
          >
            {se.shapeText.content.slice(0, 40)}
          </div>
        )}
      </div>
    )
  }

  if (el.type === 'table') {
    return <div style={{ ...base, backgroundColor: 'var(--nw-muted)', border: '0.5px solid var(--nw-border)' }} />
  }

  if (el.type === 'chart') {
    return <div style={{ ...base, backgroundColor: 'var(--nw-accent)', border: '0.5px solid var(--nw-ring)' }} />
  }

  return <div style={base} />
}

function SlideThumb({ slide, index }: { slide: SlideData; index: number }) {
  const bgStyle = useMemo(() => {
    const bg = slide.background
    if (bg.type === 'solid') return { backgroundColor: bg.color || '#ffffff' }
    if (bg.type === 'gradient' && bg.gradient) return { background: gradientToCss(bg.gradient) }
    if (bg.type === 'image' && bg.imageUrl) {
      const safeBgUrl = sanitizeSlideImageUrl(bg.imageUrl)
      if (safeBgUrl) {
        return { backgroundImage: `url(${safeBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      }
    }
    return { backgroundColor: '#ffffff' }
  }, [slide.background])

  const sortedElements = useMemo(
    () => [...slide.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)),
    [slide.elements]
  )

  // Preview thumbs match the slide's original canvas aspect ratio so 4:3 /
  // A4 / custom decks aren't squished into 16:9.
  const canvasW = slide.canvasSize?.width ?? DEFAULT_CANVAS_W
  const canvasH = slide.canvasSize?.height ?? DEFAULT_CANVAS_H

  return (
    <div
      className="gba:relative gba:rounded gba:border gba:border-border gba:overflow-hidden gba:flex-shrink-0"
      style={{ ...bgStyle, width: canvasW * THUMB_SCALE, height: canvasH * THUMB_SCALE }}
    >
      {sortedElements.map((el, idx) => (
        <ThumbElement key={el.id} el={el} idx={idx} />
      ))}
      <div className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:bg-black/50 gba:text-white gba:text-[9px] gba:text-center gba:py-0.5">
        {index + 1}
      </div>
    </div>
  )
}

export const ImportPreviewDialog: React.FC<ImportPreviewDialogProps> = ({
  parsedDocument,
  onConfirm,
  onCancel,
  'data-testid': testId = 'import-preview'
}) => {
  const { t } = useTranslation(translations)
  const [selected, setSelected] = useState<Set<number>>(() => new Set(parsedDocument.slides.map((_, i) => i)))

  const toggleSlide = useCallback((index: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selected.size === parsedDocument.slides.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(parsedDocument.slides.map((_, i) => i)))
    }
  }, [selected.size, parsedDocument.slides.length])

  const handleImportSelected = useCallback(() => {
    const selectedSlides = parsedDocument.slides.filter((_, i) => selected.has(i))
    onConfirm({
      ...parsedDocument,
      slides: selectedSlides,
      slideCount: selectedSlides.length
    })
  }, [parsedDocument, selected, onConfirm])

  const handleImportAll = useCallback(() => {
    onConfirm(parsedDocument)
  }, [parsedDocument, onConfirm])

  const warnings = parsedDocument.messages.filter(m => m.type === 'warning')
  const infos = parsedDocument.messages.filter(m => m.type === 'info')

  const summarizedMessages = useMemo(() => {
    // Messages whose practical meaning is "N assets of kind X on slide Y
    // could not be converted". We aggregate them per (messageKey, slide)
    // so users see "16 vector images on slide 6 couldn't be rendered"
    // instead of the first message verbatim followed by "(+15 more)".
    // Slide 6 of the Enterprise AI deck hits this via 16 `image18.emf`
    // bullet checkmarks.
    const PER_SLIDE_GROUPED_KEYS = new Set<string>([
      'parser-image-metafile-placeholder',
      'parser-image-missing',
      'parser-image-decode-failed',
      'parser-image-linked-unsupported',
      'parser-shape-picture-fill-unsupported'
    ])

    const summarize = (msgs: typeof warnings) => {
      type Bucket = { count: number; translated: string }
      const perSlide = new Map<string, Bucket>()
      const generic = new Map<string, Bucket>()

      for (const msg of msgs) {
        const slide = typeof msg.params?.slide === 'string' ? msg.params.slide : undefined
        const isPerSlide = PER_SLIDE_GROUPED_KEYS.has(msg.message) && !!slide
        const key = isPerSlide ? `${msg.message}@@${slide}` : msg.message
        const bucket = isPerSlide ? perSlide : generic
        const existing = bucket.get(key)
        if (existing) {
          existing.count++
          continue
        }
        const translated = msg.params ? t(msg.message, msg.params) : t(msg.message)
        bucket.set(key, { count: 1, translated })
      }

      const formatted: string[] = []
      for (const [key, { count, translated }] of perSlide) {
        const [messageKey] = key.split('@@')
        // Translator entries already carry the slide number (and a sample
        // path for metafile errors). We prepend "N×" so the aggregated
        // count is the first thing a user sees.
        const countLabel = count > 1 ? `${count}× ` : ''
        formatted.push(
          messageKey === 'parser-image-metafile-placeholder' && count > 1
            ? `${countLabel}${translated}`
            : `${countLabel}${translated}`
        )
      }
      for (const { count, translated } of generic.values()) {
        formatted.push(count > 1 ? `${translated} (+${count - 1} more)` : translated)
      }
      return formatted
    }
    return { warnings: summarize(warnings), infos: summarize(infos) }
  }, [warnings, infos, t])

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-3">
        <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
          <FileSpreadsheet className="gba:w-5 gba:h-5 gba:text-primary" />
        </div>
        <div>
          <h3 className="gba:text-base gba:font-semibold">{t('import-preview-title')}</h3>
          <p className="gba:text-xs gba:text-muted-foreground">
            {parsedDocument.fileName} ({formatFileSize(parsedDocument.fileSize)})
          </p>
        </div>
      </div>

      <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
        <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
          <Checkbox checked={selected.size === parsedDocument.slides.length} onCheckedChange={toggleAll} />
          <span>{t('import-preview-select-slides')}</span>
        </label>
        <span className="gba:text-muted-foreground gba:text-xs">
          {t('import-preview-selected', {
            selected: String(selected.size),
            total: String(parsedDocument.slides.length)
          })}
        </span>
      </div>

      <ScrollArea className="gba:max-h-[340px]">
        <div className="gba:flex gba:flex-wrap gba:gap-3 gba:p-1">
          {parsedDocument.slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`gba:relative gba:rounded-lg gba:p-1 gba:transition-all gba:cursor-pointer ${
                selected.has(index)
                  ? 'gba:ring-2 gba:ring-primary gba:bg-primary/5'
                  : 'gba:ring-1 gba:ring-border gba:opacity-50 hover:gba:opacity-80'
              }`}
              onClick={() => toggleSlide(index)}
              data-testid={`${testId}-slide-${index}`}
            >
              <SlideThumb slide={slide} index={index} />
              {selected.has(index) && (
                <div className="gba:absolute gba:top-0 gba:right-0 gba:translate-x-1/3 -gba:translate-y-1/3">
                  <CheckCircle className="gba:w-4 gba:h-4 gba:text-primary gba:fill-background" />
                </div>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>

      {summarizedMessages.warnings.length > 0 && (
        <div className="gba:p-3 gba:bg-warning/10 gba:rounded-lg gba:text-xs">
          <p className="gba:font-medium gba:mb-1">{t('import-notes')}:</p>
          <ul className="gba:space-y-0.5">
            {summarizedMessages.warnings.map((text, idx) => (
              <li key={idx} className="gba:text-muted-foreground">
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summarizedMessages.infos.length > 0 && (
        <div className="gba:p-3 gba:bg-muted/50 gba:rounded-lg gba:text-xs gba:text-muted-foreground">
          <ul className="gba:space-y-0.5">
            {summarizedMessages.infos.map((text, idx) => (
              <li key={idx}>{text}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('import-cancel')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleImportAll}>
          {t('import-preview-import-all')}
        </Button>
        <Button variant="default" size="sm" disabled={selected.size === 0} onClick={handleImportSelected}>
          {t('import-preview-import-selected')} ({selected.size})
        </Button>
      </div>
    </div>
  )
}

export default ImportPreviewDialog
