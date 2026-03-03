/**
 * PdfExportDialog - Dialog for configuring and exporting presentations to PDF.
 */

import React, { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  RadioGroup,
  RadioGroupItem,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Progress
} from '@newwork/nw-design-system'
import { FileDown, Loader2 } from 'lucide-react'
import type { SlideData } from './slideElements'
import type { SlideTheme } from './slideThemes'
import { SlideExportRenderer } from './SlideExportRenderer'
import {
  exportToPdf,
  defaultPdfExportOptions,
  type PdfQuality,
  type NotesPosition,
  type SlidesPerPage,
  type SlideRange
} from '../utils/pdfExport'

export interface PdfExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slides: SlideData[]
  currentSlideIndex: number
  theme: SlideTheme
  title: string
  t: (key: string, params?: Record<string, string | number>) => string
}

export const PdfExportDialog: React.FC<PdfExportDialogProps> = ({
  open,
  onOpenChange,
  slides,
  currentSlideIndex,
  theme,
  title,
  t
}) => {
  const [slideRange, setSlideRange] = useState<SlideRange>(defaultPdfExportOptions.slideRange)
  const [quality, setQuality] = useState<PdfQuality>(defaultPdfExportOptions.quality)
  const [includeNotes, setIncludeNotes] = useState<NotesPosition>(defaultPdfExportOptions.includeNotes)
  const [includePageNumbers, setIncludePageNumbers] = useState(defaultPdfExportOptions.includePageNumbers)
  const [slidesPerPage, setSlidesPerPage] = useState<SlidesPerPage>(defaultPdfExportOptions.slidesPerPage)

  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)

  const renderContainerRef = useRef<HTMLDivElement>(null)

  const getSlideIndices = useCallback((): number[] => {
    if (slideRange === 'all') {
      return slides.map((_, index) => index)
    }
    if (slideRange === 'current') {
      return [currentSlideIndex]
    }
    return slideRange
  }, [slideRange, slides, currentSlideIndex])

  const handleExport = async () => {
    if (!renderContainerRef.current) {
      setError('Export renderer not ready')
      return
    }

    setIsExporting(true)
    setError(null)
    setExportProgress({ current: 0, total: getSlideIndices().length })

    try {
      await exportToPdf(
        {
          slides,
          theme,
          title,
          currentSlideIndex,
          slideRange,
          quality,
          includeNotes,
          includePageNumbers,
          slidesPerPage,
          onProgress: (current, total) => {
            setExportProgress({ current, total })
          }
        },
        renderContainerRef.current
      )

      onOpenChange(false)
    } catch (err) {
      console.error('[PdfExportDialog] Export failed:', err)
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const slideIndices = getSlideIndices()
  const hasNotes = slides.some(slide => slide.notes && slide.notes.trim())

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gba:max-w-md">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <FileDown className="gba:w-5 gba:h-5" />
              {t('editor-export-pdf-dialog-title')}
            </DialogTitle>
          </DialogHeader>

          <div className="gba:space-y-6 gba:py-4">
            {/* Slide Selection */}
            <div className="gba:space-y-3">
              <Label className="gba:text-sm gba:font-medium">{t('editor-export-pdf-slides')}</Label>
              <RadioGroup
                value={typeof slideRange === 'string' ? slideRange : 'custom'}
                onValueChange={value => setSlideRange(value as SlideRange)}
                className="gba:space-y-2"
              >
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <RadioGroupItem value="all" id="slides-all" />
                  <Label htmlFor="slides-all" className="gba:text-sm gba:font-normal gba:cursor-pointer">
                    {t('editor-export-pdf-slides-all')} ({slides.length})
                  </Label>
                </div>
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <RadioGroupItem value="current" id="slides-current" />
                  <Label htmlFor="slides-current" className="gba:text-sm gba:font-normal gba:cursor-pointer">
                    {t('editor-export-pdf-slides-current')} (#{currentSlideIndex + 1})
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Quality */}
            <div className="gba:space-y-3">
              <Label className="gba:text-sm gba:font-medium">{t('editor-export-pdf-quality')}</Label>
              <Select value={quality} onValueChange={value => setQuality(value as PdfQuality)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('editor-export-pdf-quality-low')}</SelectItem>
                  <SelectItem value="medium">{t('editor-export-pdf-quality-medium')}</SelectItem>
                  <SelectItem value="high">{t('editor-export-pdf-quality-high')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Slides Per Page */}
            <div className="gba:space-y-3">
              <Label className="gba:text-sm gba:font-medium">{t('editor-export-pdf-handout')}</Label>
              <Select
                value={String(slidesPerPage)}
                onValueChange={value => setSlidesPerPage(Number(value) as SlidesPerPage)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 {t('editor-export-pdf-slides-per-page')}</SelectItem>
                  <SelectItem value="2">2 {t('editor-export-pdf-slides-per-page')}</SelectItem>
                  <SelectItem value="4">4 {t('editor-export-pdf-slides-per-page')}</SelectItem>
                  <SelectItem value="6">6 {t('editor-export-pdf-slides-per-page')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="gba:space-y-3">
              <Label className="gba:text-sm gba:font-medium">{t('editor-export-pdf-options')}</Label>
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <Checkbox
                    id="page-numbers"
                    checked={includePageNumbers}
                    onCheckedChange={checked => setIncludePageNumbers(checked === true)}
                  />
                  <Label htmlFor="page-numbers" className="gba:text-sm gba:font-normal gba:cursor-pointer">
                    {t('editor-export-pdf-page-numbers')}
                  </Label>
                </div>

                {hasNotes && (
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <Checkbox
                      id="include-notes"
                      checked={includeNotes !== 'none'}
                      onCheckedChange={checked => setIncludeNotes(checked ? 'separate-page' : 'none')}
                    />
                    <Label htmlFor="include-notes" className="gba:text-sm gba:font-normal gba:cursor-pointer">
                      {t('editor-export-pdf-notes')}
                    </Label>
                  </div>
                )}
              </div>
            </div>

            {/* Progress */}
            {isExporting && (
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                  <span>{t('editor-export-pdf-exporting')}</span>
                  <span>
                    {exportProgress.current} / {exportProgress.total}
                  </span>
                </div>
                <Progress value={(exportProgress.current / exportProgress.total) * 100} />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="gba:p-3 gba:bg-destructive/10 gba:text-destructive gba:rounded-md gba:text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4 gba:border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
              {t('editor-cancel')}
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="gba:w-4 gba:h-4 gba:mr-2 gba:animate-spin" />
                  {t('editor-export-pdf-exporting')}
                </>
              ) : (
                <>
                  <FileDown className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('editor-export-pdf')}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden render container for capturing slides */}
      {open && (
        <div ref={renderContainerRef}>
          <SlideExportRenderer slides={slides} slideIndices={slideIndices} />
        </div>
      )}
    </>
  )
}

export default PdfExportDialog
