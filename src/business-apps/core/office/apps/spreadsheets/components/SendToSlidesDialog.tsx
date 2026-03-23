/**
 * SendToSlidesDialog
 *
 * Shows a list of the user's slide decks. On selection, inserts the chart
 * image as a new slide page into the chosen presentation.
 */

import React, { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Spinner
} from '@newwork/nw-design-system'
import { Presentation } from 'lucide-react'
import { SlidesApiService } from '../../../../../platform/apps/slide-apps/services/SlidesApiService'
import { createImageElement } from '../../../../../platform/apps/slide-apps/components/slideElements'
import type { SlideSummary } from '../../../../../platform/apps/slide-apps/types'
import type { SlideData } from '../../../../../platform/apps/slide-apps/components/slideElements'

const SLIDE_WIDTH = 1280
const SLIDE_HEIGHT = 720
const CHART_PADDING = 80

export interface SendToSlidesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  /** Returns the chart as a PNG data URL, or null on failure */
  getChartPngDataUrl: () => Promise<string | null>
  'data-testid'?: string
}

export const SendToSlidesDialog: React.FC<SendToSlidesDialogProps> = ({
  open,
  onOpenChange,
  accessToken,
  getChartPngDataUrl,
  'data-testid': testId = 'send-to-slides-dialog'
}) => {
  const [slides, setSlides] = useState<SlideSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !accessToken) return
    setError(null)
    setSelectedId(null)
    SlidesApiService.setAccessToken(accessToken)
    setLoading(true)
    SlidesApiService.listSlides({ limit: 100 })
      .then(list => {
        setSlides(list)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load presentations')
        setSlides([])
      })
      .finally(() => setLoading(false))
  }, [open, accessToken])

  const handleInsert = useCallback(async () => {
    if (!selectedId) {
      toast.error('Please select a presentation')
      return
    }
    setInserting(true)
    setError(null)
    try {
      const dataUrl = await getChartPngDataUrl()
      if (!dataUrl) {
        toast.error('Could not export chart as image')
        setInserting(false)
        return
      }
      const slide = await SlidesApiService.getSlide(selectedId)
      if (!slide) {
        toast.error('Presentation not found')
        setInserting(false)
        return
      }
      const content = slide.contentJson as { slides?: SlideData[]; themeId?: string } | undefined
      const existingSlides: SlideData[] = Array.isArray(content?.slides) ? content.slides : []
      const chartImg = createImageElement(dataUrl, {
        position: { x: CHART_PADDING, y: CHART_PADDING },
        size: {
          width: SLIDE_WIDTH - CHART_PADDING * 2,
          height: SLIDE_HEIGHT - CHART_PADDING * 2
        },
        objectFit: 'contain',
        alt: 'Chart from spreadsheet'
      })
      const newSlidePage: SlideData = {
        id: `slide-${Date.now()}`,
        elements: [chartImg],
        background: { type: 'solid', color: '#ffffff' }
      }
      const updatedSlides = [...existingSlides, newSlidePage]
      await SlidesApiService.updateSlide(selectedId, {
        contentJson: {
          ...content,
          slides: updatedSlides,
          themeId: content?.themeId ?? 'corporate'
        }
      })
      toast.success('Chart added to presentation')
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add chart to presentation'
      setError(msg)
      toast.error(msg)
    } finally {
      setInserting(false)
    }
  }, [selectedId, getChartPngDataUrl, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-md gba:max-h-[80vh] gba:overflow-hidden gba:flex gba:flex-col"
        style={{ zIndex: 1000003 }}
        data-testid={testId}
      >
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Presentation className="gba:w-5 gba:h-5" />
            Send chart to Slides
          </DialogTitle>
        </DialogHeader>
        <p className="gba:text-sm gba:text-muted-foreground">
          Choose a presentation. The chart will be added as a new slide.
        </p>
        <div className="gba:flex-1 gba:min-h-0">
          {loading && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
              <Spinner className="gba:w-8 gba:h-8" />
            </div>
          )}
          {!loading && error && <p className="gba:text-sm gba:text-destructive gba:py-4">{error}</p>}
          {!loading && !error && slides.length === 0 && (
            <p className="gba:text-sm gba:text-muted-foreground gba:py-4">No presentations found.</p>
          )}
          {!loading && !error && slides.length > 0 && (
            <div className="gba:h-full gba:min-h-0 gba:overflow-y-auto gba:rounded-md gba:border gba:border-border">
              <div className="gba:p-2 gba:space-y-1">
                {slides.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={`gba:w-full gba:text-left gba:px-3 gba:py-2 gba:rounded-md gba:text-sm gba:transition-colors ${
                      selectedId === s.id ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:hover:bg-muted/50'
                    }`}
                    data-testid={`${testId}-slide-${s.id}`}
                  >
                    {s.title || 'Untitled presentation'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={inserting}>
            Cancel
          </Button>
          <Button onClick={() => void handleInsert()} disabled={!selectedId || loading || inserting}>
            {inserting ? <Spinner className="gba:w-4 gba:h-4" /> : null}
            {inserting ? ' Adding...' : ' Add to presentation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
