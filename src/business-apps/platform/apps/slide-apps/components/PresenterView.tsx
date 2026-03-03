/**
 * PresenterView - Split-screen presenter view showing slide and notes.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button, cn } from '@newwork/nw-design-system'
import { ChevronLeft, ChevronRight, X, Clock, StickyNote, Maximize2, Minimize2 } from 'lucide-react'
import type { SlideData } from './slideElements'
import type { SlideTheme } from './slideThemes'
import { SlideCanvas } from './SlideCanvas'

export interface PresenterViewProps {
  slides: SlideData[]
  currentSlideIndex: number
  theme: SlideTheme
  onSlideChange: (index: number) => void
  onExit: () => void
  t: (key: string, params?: Record<string, string | number>) => string
  'data-testid'?: string
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export const PresenterView: React.FC<PresenterViewProps> = ({
  slides,
  currentSlideIndex,
  onSlideChange,
  onExit,
  t,
  'data-testid': testId = 'presenter-view'
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [mainSlideScale, setMainSlideScale] = useState(0.5)
  const [previewScale, setPreviewScale] = useState(0.15)
  const [notesExpanded, setNotesExpanded] = useState(false)
  const mainSlideContainerRef = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  const currentSlide = slides[currentSlideIndex]
  const nextSlide = currentSlideIndex < slides.length - 1 ? slides[currentSlideIndex + 1] : null

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(s => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Calculate scales for slide display
  useEffect(() => {
    const calculateScales = () => {
      if (mainSlideContainerRef.current) {
        const container = mainSlideContainerRef.current
        const slideWidth = 1280
        const slideHeight = 720
        const containerWidth = container.clientWidth - 32
        const containerHeight = container.clientHeight - 32
        const scaleX = containerWidth / slideWidth
        const scaleY = containerHeight / slideHeight
        setMainSlideScale(Math.min(scaleX, scaleY, 1))
      }

      if (previewContainerRef.current) {
        const container = previewContainerRef.current
        const slideWidth = 1280
        const slideHeight = 720
        const containerWidth = container.clientWidth - 16
        const containerHeight = container.clientHeight - 16
        const scaleX = containerWidth / slideWidth
        const scaleY = containerHeight / slideHeight
        setPreviewScale(Math.min(scaleX, scaleY, 0.2))
      }
    }

    calculateScales()
    window.addEventListener('resize', calculateScales)
    return () => window.removeEventListener('resize', calculateScales)
  }, [notesExpanded])

  // Navigation
  const goToPrev = useCallback(() => {
    if (currentSlideIndex > 0) {
      onSlideChange(currentSlideIndex - 1)
    }
  }, [currentSlideIndex, onSlideChange])

  const goToNext = useCallback(() => {
    if (currentSlideIndex < slides.length - 1) {
      onSlideChange(currentSlideIndex + 1)
    }
  }, [currentSlideIndex, slides.length, onSlideChange])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          goToPrev()
          break
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          goToNext()
          break
        case 'Home':
          e.preventDefault()
          onSlideChange(0)
          break
        case 'End':
          e.preventDefault()
          onSlideChange(slides.length - 1)
          break
        case 'Escape':
          e.preventDefault()
          onExit()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrev, goToNext, onSlideChange, slides.length, onExit])

  const canGoPrev = currentSlideIndex > 0
  const canGoNext = currentSlideIndex < slides.length - 1

  return (
    <div className="gba:fixed gba:inset-0 gba:z-[9999] gba:bg-zinc-900 gba:flex gba:flex-col" data-testid={testId}>
      {/* Top bar */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:bg-zinc-800 gba:border-b gba:border-zinc-700">
        <div className="gba:flex gba:items-center gba:gap-4">
          <span className="gba:text-sm gba:font-medium gba:text-zinc-200">{t('presenter-view')}</span>
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-zinc-400">
            <Clock className="gba:w-4 gba:h-4" />
            <span className="gba:text-sm gba:tabular-nums">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:text-zinc-400 gba:tabular-nums">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="gba:text-zinc-300 hover:gba:text-white hover:gba:bg-zinc-700"
            data-testid={`${testId}-exit`}
          >
            <X className="gba:w-4 gba:h-4 gba:mr-1" />
            {t('presenter-exit')}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="gba:flex gba:flex-1 gba:min-h-0">
        {/* Current slide (left/main area) */}
        <div
          className={cn(
            'gba:flex gba:flex-col gba:border-r gba:border-zinc-700',
            notesExpanded ? 'gba:w-1/2' : 'gba:w-2/3'
          )}
        >
          <div className="gba:px-3 gba:py-2 gba:border-b gba:border-zinc-700">
            <span className="gba:text-xs gba:font-medium gba:text-zinc-400 gba:uppercase gba:tracking-wide">
              {t('presenter-current-slide')}
            </span>
          </div>
          <div
            ref={mainSlideContainerRef}
            className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:bg-zinc-950 gba:p-4"
          >
            <SlideCanvas
              elements={currentSlide.elements}
              selectedIds={new Set()}
              background={currentSlide.background}
              onSelectElements={() => {}}
              onUpdateElement={() => {}}
              onUpdateMultipleElements={() => {}}
              onEditText={() => {}}
              scale={mainSlideScale}
            />
          </div>
        </div>

        {/* Right panel: Notes and next slide */}
        <div className={cn('gba:flex gba:flex-col gba:bg-zinc-850', notesExpanded ? 'gba:w-1/2' : 'gba:w-1/3')}>
          {/* Notes section */}
          <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0">
            <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-b gba:border-zinc-700">
              <div className="gba:flex gba:items-center gba:gap-2">
                <StickyNote className="gba:w-4 gba:h-4 gba:text-zinc-400" />
                <span className="gba:text-xs gba:font-medium gba:text-zinc-400 gba:uppercase gba:tracking-wide">
                  {t('presenter-notes')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNotesExpanded(!notesExpanded)}
                className="gba:h-7 gba:w-7 gba:p-0 gba:text-zinc-400 hover:gba:text-white hover:gba:bg-zinc-700"
              >
                {notesExpanded ? <Minimize2 className="gba:w-4 gba:h-4" /> : <Maximize2 className="gba:w-4 gba:h-4" />}
              </Button>
            </div>
            <div className="gba:flex-1 gba:overflow-y-auto gba:p-4">
              {currentSlide.notes ? (
                <p className="gba:text-base gba:text-zinc-200 gba:leading-relaxed gba:whitespace-pre-wrap">
                  {currentSlide.notes}
                </p>
              ) : (
                <p className="gba:text-sm gba:text-zinc-500 gba:italic">{t('presenter-no-notes')}</p>
              )}
            </div>
          </div>

          {/* Next slide preview */}
          {!notesExpanded && (
            <div className="gba:flex gba:flex-col gba:border-t gba:border-zinc-700">
              <div className="gba:px-3 gba:py-2 gba:border-b gba:border-zinc-700">
                <span className="gba:text-xs gba:font-medium gba:text-zinc-400 gba:uppercase gba:tracking-wide">
                  {t('presenter-next-slide')}
                </span>
              </div>
              <div
                ref={previewContainerRef}
                className="gba:h-40 gba:flex gba:items-center gba:justify-center gba:bg-zinc-950 gba:p-2"
              >
                {nextSlide ? (
                  <SlideCanvas
                    elements={nextSlide.elements}
                    selectedIds={new Set()}
                    background={nextSlide.background}
                    onSelectElements={() => {}}
                    onUpdateElement={() => {}}
                    onUpdateMultipleElements={() => {}}
                    onEditText={() => {}}
                    scale={previewScale}
                  />
                ) : (
                  <span className="gba:text-sm gba:text-zinc-500">{t('presenter-last-slide')}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation bar */}
      <div className="gba:flex gba:items-center gba:justify-center gba:gap-4 gba:px-4 gba:py-3 gba:bg-zinc-800 gba:border-t gba:border-zinc-700">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPrev}
          disabled={!canGoPrev}
          className="gba:bg-zinc-700 gba:border-zinc-600 gba:text-zinc-200 hover:gba:bg-zinc-600 gba:disabled:opacity-40"
          data-testid={`${testId}-prev`}
        >
          <ChevronLeft className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('editor-previous')}
        </Button>

        <div className="gba:flex gba:items-center gba:gap-1">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onSlideChange(idx)}
              className={cn(
                'gba:w-2 gba:h-2 gba:rounded-full gba:transition-colors',
                idx === currentSlideIndex ? 'gba:bg-primary' : 'gba:bg-zinc-600 hover:gba:bg-zinc-500'
              )}
              data-testid={`${testId}-dot-${idx}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToNext}
          disabled={!canGoNext}
          className="gba:bg-zinc-700 gba:border-zinc-600 gba:text-zinc-200 hover:gba:bg-zinc-600 gba:disabled:opacity-40"
          data-testid={`${testId}-next`}
        >
          {t('editor-next')}
          <ChevronRight className="gba:w-4 gba:h-4 gba:ml-1" />
        </Button>
      </div>
    </div>
  )
}

export default PresenterView
