/**
 * PresenterView - Split-screen presenter view showing slide and notes.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button, cn } from '@newwork/nw-design-system'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  StickyNote,
  Maximize2,
  Minimize2,
  Cast,
  MonitorX,
  Loader2,
  Mic,
  MicOff,
  Check,
  ArrowRight,
  Settings,
  Info
} from 'lucide-react'
import type { SlideData } from './slideElements'
import type { SlideTheme } from './slideThemes'
import { SlideCanvas } from './SlideCanvas'
import type { ConnectionState } from '../hooks/usePresentationCast'
import type { MatchResult } from '../hooks/useSpeechMatcher'

export interface AIAssistStatus {
  enabled: boolean
  isListening: boolean
  isSupported: boolean
  transcript: string
  recentMatches: MatchResult[]
  error: string | null
  volumeLevel: number // 0-100 microphone volume
  cooldownProgress: number // 0-100, 100 = ready
}

export interface PresenterViewProps {
  slides: SlideData[]
  currentSlideIndex: number
  theme: SlideTheme
  onSlideChange: (index: number) => void
  onExit: () => void
  t: (key: string, params?: Record<string, string | number>) => string
  /** Casting connection state */
  castConnectionState?: ConnectionState
  /** Whether casting is in fallback (window) mode */
  isCastFallback?: boolean
  /** Callback to stop casting */
  onStopCast?: () => void
  /** AI Assist status */
  aiAssistStatus?: AIAssistStatus
  /** Callback to toggle AI Assist */
  onToggleAIAssist?: () => void
  /** Callback to open AI Assist settings */
  onOpenAIAssistSettings?: () => void
  /** Whether to show transcript panel */
  showTranscript?: boolean
  /** Whether to show match feedback */
  showMatchFeedback?: boolean
  /** Callback when element is clicked (for highlighting on presenter window) */
  onElementClick?: (elementId: string) => void
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
  castConnectionState,
  isCastFallback,
  onStopCast,
  aiAssistStatus,
  onToggleAIAssist,
  onOpenAIAssistSettings,
  showTranscript = false,
  showMatchFeedback = true,
  onElementClick,
  'data-testid': testId = 'presenter-view'
}) => {
  const isCasting = castConnectionState === 'connected'
  const isConnecting = castConnectionState === 'connecting'
  const aiAssistEnabled = aiAssistStatus?.enabled ?? false
  const aiAssistListening = aiAssistStatus?.isListening ?? false
  const aiAssistSupported = aiAssistStatus?.isSupported ?? true
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
    <div className="gba:fixed gba:inset-0 gba:z-40 gba:bg-zinc-900 gba:flex gba:flex-col" data-testid={testId}>
      {/* Top bar */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:bg-zinc-800 gba:border-b gba:border-zinc-700">
        <div className="gba:flex gba:items-center gba:gap-4">
          <span className="gba:text-sm gba:font-medium gba:text-zinc-200">{t('presenter-view')}</span>
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-zinc-400">
            <Clock className="gba:w-4 gba:h-4" />
            <span className="gba:text-sm gba:tabular-nums">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:gap-4">
          {/* Cast status indicator */}
          {(isCasting || isConnecting) && (
            <div
              className={cn(
                'gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1 gba:rounded-full gba:text-sm',
                isConnecting && 'gba:bg-yellow-900/50 gba:text-yellow-300',
                isCasting && 'gba:bg-green-900/50 gba:text-green-300'
              )}
              data-testid={`${testId}-cast-status`}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                  <span>{t('cast-connecting-short')}</span>
                </>
              ) : (
                <>
                  <Cast className="gba:w-4 gba:h-4" />
                  <span className="gba:relative gba:flex gba:items-center gba:gap-2">
                    <span className="gba:relative gba:flex gba:h-2 gba:w-2">
                      <span className="gba:animate-ping gba:absolute gba:inline-flex gba:h-full gba:w-full gba:rounded-full gba:bg-green-400 gba:opacity-75" />
                      <span className="gba:relative gba:inline-flex gba:rounded-full gba:h-2 gba:w-2 gba:bg-green-500" />
                    </span>
                    {isCastFallback ? t('presenter-presenting-window') : t('presenter-casting')}
                  </span>
                  {onStopCast && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onStopCast}
                      className="gba:h-6 gba:px-2 gba:text-green-300 hover:gba:text-white hover:gba:bg-green-800/50"
                      data-testid={`${testId}-stop-cast`}
                    >
                      <MonitorX className="gba:w-3 gba:h-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {/* AI Assist toggle */}
          {onToggleAIAssist && (
            <div className="gba:flex gba:items-center gba:gap-2">
              {!aiAssistSupported ? (
                <div
                  className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1 gba:text-zinc-500 gba:text-sm"
                  title={t('ai-assist-not-supported')}
                >
                  <MicOff className="gba:w-4 gba:h-4" />
                  <span className="gba:text-xs">{t('ai-assist-not-supported')}</span>
                </div>
              ) : (
                <>
                  <Button
                    variant={aiAssistEnabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={onToggleAIAssist}
                    className={cn('gba:gap-2', aiAssistEnabled && 'gba:bg-green-600 hover:gba:bg-green-700')}
                    data-testid={`${testId}-ai-assist-toggle`}
                  >
                    {aiAssistListening ? (
                      <Mic className="gba:w-4 gba:h-4 gba:animate-pulse" />
                    ) : (
                      <MicOff className="gba:w-4 gba:h-4" />
                    )}
                    {aiAssistEnabled ? t('ai-assist-on') : t('ai-assist-off')}
                  </Button>

                  {/* Volume Meter */}
                  {aiAssistListening && (
                    <div
                      className="gba:flex gba:items-center gba:gap-1 gba:h-6"
                      title={t('ai-assist-volume')}
                      data-testid={`${testId}-ai-volume-meter`}
                    >
                      <div className="gba:flex gba:items-end gba:gap-0.5 gba:h-4">
                        {[0, 1, 2, 3, 4].map(i => {
                          const threshold = (i + 1) * 20
                          const isActive = (aiAssistStatus?.volumeLevel ?? 0) >= threshold
                          return (
                            <div
                              key={i}
                              className={cn(
                                'gba:w-1 gba:rounded-sm gba:transition-all gba:duration-75',
                                isActive ? 'gba:bg-green-500' : 'gba:bg-zinc-600'
                              )}
                              style={{ height: `${(i + 1) * 3 + 4}px` }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {onOpenAIAssistSettings && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onOpenAIAssistSettings}
                      className="gba:h-8 gba:w-8 gba:p-0 gba:text-zinc-400 hover:gba:text-white"
                      title={t('ai-assist-settings')}
                      data-testid={`${testId}-ai-assist-settings`}
                    >
                      <Settings className="gba:w-4 gba:h-4" />
                    </Button>
                  )}
                </>
              )}
              {aiAssistStatus?.error && (
                <span className="gba:text-xs gba:text-red-400 gba:ml-2">{aiAssistStatus.error}</span>
              )}
            </div>
          )}

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
            <div
              className="gba:relative gba:overflow-hidden gba:flex-shrink-0"
              style={{
                width: 1280 * mainSlideScale,
                height: 720 * mainSlideScale
              }}
            >
              <SlideCanvas
                elements={currentSlide.elements}
                selectedIds={new Set()}
                background={currentSlide.background}
                onSelectElements={() => {}}
                onUpdateElement={() => {}}
                onUpdateMultipleElements={() => {}}
                onEditText={() => {}}
                onElementClick={onElementClick}
                scale={mainSlideScale}
                isPresenting={true}
              />
            </div>
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
            <div className="gba:flex-1 gba:overflow-y-auto gba:p-4 gba:space-y-4">
              {currentSlide.notes ? (
                <p className="gba:text-base gba:text-zinc-200 gba:leading-relaxed gba:whitespace-pre-wrap">
                  {currentSlide.notes}
                </p>
              ) : (
                <p className="gba:text-sm gba:text-zinc-500 gba:italic">{t('presenter-no-notes')}</p>
              )}

              {/* AI Assist Privacy Note */}
              {aiAssistEnabled && (
                <div
                  className="gba:bg-blue-900/30 gba:border gba:border-blue-800/50 gba:rounded gba:p-3"
                  data-testid={`${testId}-ai-privacy-note`}
                >
                  <div className="gba:flex gba:items-start gba:gap-2">
                    <Info className="gba:w-4 gba:h-4 gba:text-blue-400 gba:flex-shrink-0 gba:mt-0.5" />
                    <p className="gba:text-xs gba:text-blue-300">{t('ai-assist-privacy-note')}</p>
                  </div>
                </div>
              )}

              {/* AI Assist Transcript Panel */}
              {showTranscript && aiAssistEnabled && aiAssistStatus?.transcript && (
                <div
                  className="gba:bg-zinc-800 gba:rounded gba:p-3 gba:space-y-2"
                  data-testid={`${testId}-ai-transcript`}
                >
                  <h4 className="gba:text-xs gba:font-medium gba:text-zinc-400 gba:uppercase">
                    {t('ai-assist-transcript')}
                  </h4>
                  <p className="gba:text-sm gba:text-zinc-300 gba:italic">"{aiAssistStatus.transcript}"</p>
                </div>
              )}

              {/* AI Assist Match Feedback Panel */}
              {showMatchFeedback &&
                aiAssistEnabled &&
                aiAssistStatus?.recentMatches &&
                aiAssistStatus.recentMatches.length > 0 && (
                  <div
                    className="gba:bg-zinc-800 gba:rounded gba:p-3 gba:space-y-2"
                    data-testid={`${testId}-ai-matches`}
                  >
                    <div className="gba:flex gba:items-center gba:justify-between">
                      <h4 className="gba:text-xs gba:font-medium gba:text-zinc-400 gba:uppercase">
                        {t('ai-assist-recent-matches')}
                      </h4>
                      {/* Cooldown Progress */}
                      {(aiAssistStatus?.cooldownProgress ?? 100) < 100 && (
                        <div
                          className="gba:flex gba:items-center gba:gap-2"
                          title={t('ai-assist-cooldown')}
                          data-testid={`${testId}-ai-cooldown`}
                        >
                          <span className="gba:text-[10px] gba:text-zinc-500">{t('ai-assist-cooldown')}</span>
                          <div className="gba:w-20 gba:h-1.5 gba:bg-zinc-700 gba:rounded-full gba:overflow-hidden">
                            <div
                              className="gba:h-full gba:bg-amber-500 gba:transition-all gba:duration-100 gba:ease-linear gba:rounded-full"
                              style={{ width: `${aiAssistStatus?.cooldownProgress ?? 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <ul className="gba:space-y-1">
                      {aiAssistStatus.recentMatches.slice(-5).map((match, i) => (
                        <li key={i} className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-zinc-300">
                          <Check className="gba:w-3 gba:h-3 gba:text-green-500 gba:flex-shrink-0" />
                          <span className="gba:truncate">"{match.matchedPhrase}"</span>
                          <ArrowRight className="gba:w-3 gba:h-3 gba:text-zinc-500 gba:flex-shrink-0" />
                          <span className="gba:text-zinc-400 gba:truncate">{match.slidePhrase.slice(0, 20)}...</span>
                        </li>
                      ))}
                    </ul>
                  </div>
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
                  <div
                    className="gba:relative gba:overflow-hidden gba:flex-shrink-0"
                    style={{
                      width: 1280 * previewScale,
                      height: 720 * previewScale
                    }}
                  >
                    <SlideCanvas
                      elements={nextSlide.elements}
                      selectedIds={new Set()}
                      background={nextSlide.background}
                      onSelectElements={() => {}}
                      onUpdateElement={() => {}}
                      onUpdateMultipleElements={() => {}}
                      onEditText={() => {}}
                      scale={previewScale}
                      isPresenting={true}
                    />
                  </div>
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
