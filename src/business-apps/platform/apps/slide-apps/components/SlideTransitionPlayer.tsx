// SlideTransitionPlayer - Handles transition animations between slides.

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { cn } from '@newwork/nw-design-system'
import type { SlideTransition, SlideTransitionType } from './slideElements'
import { DEFAULT_TRANSITION } from './slideElements'
import './slideTransitions.css'

export interface SlideTransitionPlayerProps {
  currentSlideId: string
  previousSlideId: string | null
  transition?: SlideTransition
  onTransitionComplete?: () => void
  children: React.ReactNode
  previousContent?: React.ReactNode
  className?: string
  'data-testid'?: string
}

type TransitionPhase = 'idle' | 'entering' | 'active'

const getTransitionClasses = (type: SlideTransitionType, phase: TransitionPhase, isEntering: boolean): string => {
  if (type === 'none' || phase === 'idle') return ''

  const prefix = `transition-${type}`

  if (isEntering) {
    return phase === 'entering' ? `${prefix}-enter` : `${prefix}-enter ${prefix}-enter-active`
  } else {
    return phase === 'entering' ? `${prefix}-exit` : `${prefix}-exit ${prefix}-exit-active`
  }
}

export const SlideTransitionPlayer: React.FC<SlideTransitionPlayerProps> = ({
  currentSlideId,
  previousSlideId,
  transition,
  onTransitionComplete,
  children,
  previousContent,
  className,
  'data-testid': testId = 'slide-transition-player'
}) => {
  const effectiveTransition = transition || DEFAULT_TRANSITION
  const [phase, setPhase] = useState<TransitionPhase>('idle')
  const [showPrevious, setShowPrevious] = useState(false)
  const [renderedPreviousContent, setRenderedPreviousContent] = useState<React.ReactNode>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousSlideIdRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  useEffect(() => {
    const hasSlideChanged = previousSlideId && previousSlideId !== currentSlideId
    const isNewTransition = previousSlideId !== previousSlideIdRef.current

    if (hasSlideChanged && isNewTransition) {
      previousSlideIdRef.current = previousSlideId

      if (effectiveTransition.type === 'none') {
        setShowPrevious(false)
        setPhase('idle')
        onTransitionComplete?.()
        return
      }

      clearTimers()
      setRenderedPreviousContent(previousContent)
      setShowPrevious(true)
      setPhase('entering')

      // Use setTimeout to ensure browser paints the entering state before applying active
      // RAF alone doesn't guarantee paint, setTimeout with small delay is more reliable
      timeoutRef.current = setTimeout(() => {
        setPhase('active')

        timeoutRef.current = setTimeout(() => {
          setPhase('idle')
          setShowPrevious(false)
          setRenderedPreviousContent(null)
          previousSlideIdRef.current = null
          onTransitionComplete?.()
        }, effectiveTransition.duration)
      }, 50) // 50ms delay to ensure browser paints entering state
    } else if (!previousSlideId && phase !== 'idle') {
      clearTimers()
      setPhase('idle')
      setShowPrevious(false)
      setRenderedPreviousContent(null)
      previousSlideIdRef.current = null
    }
  }, [currentSlideId, previousSlideId, previousContent, effectiveTransition, onTransitionComplete, clearTimers, phase])

  const isAnimating = phase !== 'idle'
  const currentClasses = isAnimating ? getTransitionClasses(effectiveTransition.type, phase, true) : ''
  const previousClasses = getTransitionClasses(effectiveTransition.type, phase, false)

  // Compute inline styles for transitions (more reliable than CSS classes)
  const getInlineTransitionStyle = (isEntering: boolean): React.CSSProperties => {
    if (!isAnimating) return {}

    const duration = effectiveTransition.duration
    const easing = 'cubic-bezier(0.4, 0, 0.2, 1)'
    const type = effectiveTransition.type

    if (type === 'fade') {
      if (isEntering) {
        // Current slide fades in
        return {
          opacity: phase === 'entering' ? 0 : 1,
          transition: `opacity ${duration}ms ${easing}`
        }
      } else {
        // Previous slide fades out
        return {
          opacity: phase === 'entering' ? 1 : 0,
          transition: `opacity ${duration}ms ${easing}`
        }
      }
    }

    // For other transitions, rely on CSS classes
    return {}
  }

  return (
    <div
      ref={containerRef}
      className={cn('slide-transition-container', isAnimating && 'slide-transition-animating', className)}
      style={{ '--slide-transition-duration': `${effectiveTransition.duration}ms` } as React.CSSProperties}
      data-testid={testId}
    >
      {showPrevious && renderedPreviousContent && (
        <div
          className={cn('slide-transition-slide slide-transition-previous', previousClasses)}
          style={getInlineTransitionStyle(false)}
          data-testid={`${testId}-previous`}
        >
          {renderedPreviousContent}
        </div>
      )}

      <div
        className={cn('slide-transition-slide slide-transition-current', currentClasses)}
        style={getInlineTransitionStyle(true)}
        data-testid={`${testId}-current`}
      >
        {children}
      </div>
    </div>
  )
}

export default SlideTransitionPlayer
