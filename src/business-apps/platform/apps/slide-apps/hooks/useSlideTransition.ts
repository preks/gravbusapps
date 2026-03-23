// Shared hook for managing slide transitions across presentation modes.

import { useState, useCallback, useEffect, useRef } from 'react'
import type { SlideData, SlideTransition } from '../components/slideElements'
import { DEFAULT_TRANSITION } from '../components/slideElements'

export interface UseSlideTransitionOptions {
  slides: SlideData[]
  currentIndex: number
  onIndexChange: (index: number) => void
  enabled?: boolean
}

export interface UseSlideTransitionReturn {
  isTransitioning: boolean
  previousSlide: SlideData | null
  currentTransition: SlideTransition
  navigateToSlide: (index: number) => void
  handleTransitionComplete: () => void
  canNavigatePrev: boolean
  canNavigateNext: boolean
}

export function useSlideTransition({
  slides,
  currentIndex,
  onIndexChange,
  enabled = true
}: UseSlideTransitionOptions): UseSlideTransitionReturn {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [previousSlide, setPreviousSlide] = useState<SlideData | null>(null)
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSlide = slides[currentIndex]
  const currentTransition = currentSlide?.transition || DEFAULT_TRANSITION

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearAutoAdvanceTimer()
  }, [clearAutoAdvanceTimer])

  const navigateToSlide = useCallback(
    (newIndex: number) => {
      if (!enabled) return
      if (newIndex < 0 || newIndex >= slides.length) return
      if (newIndex === currentIndex) return

      const targetSlide = slides[newIndex]
      const transition = targetSlide?.transition || DEFAULT_TRANSITION

      if (transition.type !== 'none') {
        setPreviousSlide(currentSlide)
        setIsTransitioning(true)
      }

      onIndexChange(newIndex)
    },
    [enabled, slides, currentIndex, currentSlide, onIndexChange]
  )

  const handleTransitionComplete = useCallback(() => {
    setIsTransitioning(false)
    setPreviousSlide(null)
  }, [])

  // Auto-advance logic
  useEffect(() => {
    if (!enabled || isTransitioning) return
    if (currentTransition.trigger !== 'auto') return
    if (currentIndex >= slides.length - 1) return

    clearAutoAdvanceTimer()

    const delay = currentTransition.delay > 0 ? currentTransition.delay : 3000
    autoAdvanceTimerRef.current = setTimeout(() => {
      navigateToSlide(currentIndex + 1)
    }, delay)

    return () => clearAutoAdvanceTimer()
  }, [enabled, currentIndex, currentTransition, slides.length, isTransitioning, navigateToSlide, clearAutoAdvanceTimer])

  const canNavigatePrev = currentIndex > 0
  const canNavigateNext = currentIndex < slides.length - 1

  return {
    isTransitioning,
    previousSlide,
    currentTransition,
    navigateToSlide,
    handleTransitionComplete,
    canNavigatePrev,
    canNavigateNext
  }
}
