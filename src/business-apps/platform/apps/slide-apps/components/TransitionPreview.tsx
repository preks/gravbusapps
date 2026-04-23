/**
 * TransitionPreview - Small animated preview of slide transition effects
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Button, cn, useTranslation } from '@newwork/nw-design-system'
import { Play } from 'lucide-react'
import type { SlideTransition } from './slideElements'
import translations from '../_i18n'

export interface TransitionPreviewProps {
  transition: SlideTransition
  slideIndex?: number
  onPreview?: () => void
  className?: string
  'data-testid'?: string
}

type PreviewPhase = 'idle' | 'entering' | 'entered'

export const TransitionPreview: React.FC<TransitionPreviewProps> = ({
  transition,
  slideIndex = 1,
  onPreview,
  className,
  'data-testid': testId = 'transition-preview'
}) => {
  const { t } = useTranslation(translations)
  const [phase, setPhase] = useState<PreviewPhase>('idle')
  const [showOld, setShowOld] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  const playPreview = useCallback(() => {
    if (transition.type === 'none') return

    clearTimers()
    setShowOld(true)
    setPhase('entering')

    // Use setTimeout to ensure browser paints the entering state
    timeoutRef.current = setTimeout(() => {
      setPhase('entered')

      timeoutRef.current = setTimeout(() => {
        setPhase('idle')
        setShowOld(false)
      }, transition.duration)
    }, 50) // 50ms delay to ensure browser paints entering state

    onPreview?.()
  }, [transition, onPreview, clearTimers])

  const isAnimating = phase !== 'idle'

  // Get inline styles for transitions (more reliable than CSS classes)
  const getTransitionStyle = (isNew: boolean): React.CSSProperties => {
    if (!isAnimating) return {}

    const duration = transition.duration
    const easing = 'cubic-bezier(0.4, 0, 0.2, 1)'
    const type = transition.type
    const isEntering = phase === 'entering'

    // Common transition property
    const transitionProp = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`

    switch (type) {
      case 'fade':
        if (isNew) {
          return { opacity: isEntering ? 0 : 1, transition: transitionProp }
        } else {
          return { opacity: isEntering ? 1 : 0, transition: transitionProp }
        }

      case 'slide-left':
        if (isNew) {
          return { transform: isEntering ? 'translateX(100%)' : 'translateX(0)', transition: transitionProp }
        } else {
          return { transform: isEntering ? 'translateX(0)' : 'translateX(-100%)', transition: transitionProp }
        }

      case 'slide-right':
        if (isNew) {
          return { transform: isEntering ? 'translateX(-100%)' : 'translateX(0)', transition: transitionProp }
        } else {
          return { transform: isEntering ? 'translateX(0)' : 'translateX(100%)', transition: transitionProp }
        }

      case 'slide-up':
        if (isNew) {
          return { transform: isEntering ? 'translateY(100%)' : 'translateY(0)', transition: transitionProp }
        } else {
          return { transform: isEntering ? 'translateY(0)' : 'translateY(-100%)', transition: transitionProp }
        }

      case 'slide-down':
        if (isNew) {
          return { transform: isEntering ? 'translateY(-100%)' : 'translateY(0)', transition: transitionProp }
        } else {
          return { transform: isEntering ? 'translateY(0)' : 'translateY(100%)', transition: transitionProp }
        }

      case 'zoom-in':
        if (isNew) {
          return {
            transform: isEntering ? 'scale(0.5)' : 'scale(1)',
            opacity: isEntering ? 0 : 1,
            transition: transitionProp
          }
        } else {
          return {
            transform: isEntering ? 'scale(1)' : 'scale(1.2)',
            opacity: isEntering ? 1 : 0,
            transition: transitionProp
          }
        }

      case 'zoom-out':
        if (isNew) {
          return {
            transform: isEntering ? 'scale(1.5)' : 'scale(1)',
            opacity: isEntering ? 0 : 1,
            transition: transitionProp
          }
        } else {
          return {
            transform: isEntering ? 'scale(1)' : 'scale(0.5)',
            opacity: isEntering ? 1 : 0,
            transition: transitionProp
          }
        }

      case 'push-left':
        if (isNew) {
          return { transform: isEntering ? 'translateX(100%)' : 'translateX(0)', transition: transitionProp }
        } else {
          return {
            transform: isEntering ? 'translateX(0)' : 'translateX(-30%)',
            opacity: isEntering ? 1 : 0.5,
            transition: transitionProp
          }
        }

      case 'push-right':
        if (isNew) {
          return { transform: isEntering ? 'translateX(-100%)' : 'translateX(0)', transition: transitionProp }
        } else {
          return {
            transform: isEntering ? 'translateX(0)' : 'translateX(30%)',
            opacity: isEntering ? 1 : 0.5,
            transition: transitionProp
          }
        }

      case 'flip':
        if (isNew) {
          return {
            transform: isEntering ? 'perspective(1200px) rotateY(-90deg)' : 'perspective(1200px) rotateY(0)',
            opacity: isEntering ? 0 : 1,
            transition: transitionProp
          }
        } else {
          return {
            transform: isEntering ? 'perspective(1200px) rotateY(0)' : 'perspective(1200px) rotateY(90deg)',
            opacity: isEntering ? 1 : 0,
            transition: transitionProp
          }
        }

      default:
        return {}
    }
  }

  return (
    <div className={cn('gba:flex gba:flex-col gba:gap-2', className)} data-testid={testId}>
      {/* Preview animation box - full width */}
      <div
        className="gba:relative gba:rounded-lg gba:border-2 gba:border-border gba:overflow-hidden gba:bg-slate-300"
        style={{ width: '100%', height: 100 }}
      >
        {/* Old slide (orange) - shown during transition */}
        {showOld && (
          <div
            className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-orange-100"
            style={getTransitionStyle(false)}
          >
            <div className="gba:px-4 gba:py-2 gba:rounded-md gba:bg-orange-500 gba:text-sm gba:font-semibold gba:text-white gba:shadow-md">
              {t('transition-slide-number', { number: slideIndex })}
            </div>
          </div>
        )}

        {/* New slide (blue) - always visible */}
        <div
          className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-blue-100"
          style={getTransitionStyle(true)}
        >
          <div className="gba:px-4 gba:py-2 gba:rounded-md gba:bg-blue-600 gba:text-sm gba:font-semibold gba:text-white gba:shadow-md">
            {t('transition-slide-number', { number: slideIndex + 1 })}
          </div>
        </div>
      </div>

      {/* Play button - below the preview */}
      <Button
        variant="outline"
        size="sm"
        onClick={playPreview}
        disabled={transition.type === 'none' || isAnimating}
        className="gba:w-full gba:h-9"
        data-testid={`${testId}-play`}
      >
        <Play className="gba:w-4 gba:h-4 gba:mr-2" />
        {isAnimating ? t('transition-playing') : t('transition-play-preview')}
      </Button>
    </div>
  )
}

export default TransitionPreview
