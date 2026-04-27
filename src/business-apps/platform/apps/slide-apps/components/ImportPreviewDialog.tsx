// Slide-selection dialog shown after parsing a PPTX, before importing.

import React, { useState, useCallback, useMemo } from 'react'
import { Button, Checkbox, ScrollArea, useTranslation } from '@newwork/nw-design-system'
import { CheckCircle, FileSpreadsheet } from 'lucide-react'
import type { ParsedPowerPointDocument } from '../hooks/usePowerPointParser'
import { DEFAULT_SLIDE_CANVAS_SIZE, type SlideData } from './slideElements'
import { SlideThumbnail } from './SlideThumbnail'
import translations from '../_i18n'

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

function SlideThumb({ slide, index }: { slide: SlideData; index: number }) {
  const canvasSize = slide.canvasSize ?? DEFAULT_SLIDE_CANVAS_SIZE

  return (
    <div
      className="gba:relative gba:rounded gba:border gba:border-border gba:overflow-hidden gba:flex-shrink-0"
      style={{ width: canvasSize.width * THUMB_SCALE, height: canvasSize.height * THUMB_SCALE }}
    >
      <SlideThumbnail slide={slide} index={index} thumbScale={THUMB_SCALE} />
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
      for (const [, { count, translated }] of perSlide) {
        // Translator entries already carry the slide number. We prepend "N×" so
        // the aggregated count is the first thing a user sees.
        const countLabel = count > 1 ? `${count}× ` : ''
        formatted.push(`${countLabel}${translated}`)
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
