import React, { useState, useEffect, useRef } from 'react'

interface AnimatedCounterProps {
  value: number
  duration?: number // Animation duration in ms
  formatValue?: (value: number) => string
  className?: string
  'data-testid'?: string
}

/**
 * AnimatedCounter - Smoothly animates number changes
 * Uses easing for a natural feel
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  formatValue,
  className = '',
  'data-testid': testId
}) => {
  const [displayValue, setDisplayValue] = useState(value)
  const animationRef = useRef<number>()
  const startTimeRef = useRef<number>()
  const startValueRef = useRef(value)
  const targetValueRef = useRef(value)

  useEffect(() => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // If value is the same, no need to animate
    if (targetValueRef.current === value) {
      return
    }

    startValueRef.current = displayValue
    targetValueRef.current = value
    startTimeRef.current = undefined

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic for smooth deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 3)

      const currentValue = Math.round(
        startValueRef.current + (targetValueRef.current - startValueRef.current) * easedProgress
      )

      setDisplayValue(currentValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration])

  // Set initial value immediately on mount
  useEffect(() => {
    setDisplayValue(value)
    startValueRef.current = value
    targetValueRef.current = value
  }, [])

  const formattedValue = formatValue ? formatValue(displayValue) : displayValue.toLocaleString()

  return (
    <span className={className} data-testid={testId}>
      {formattedValue}
    </span>
  )
}

/**
 * Format large numbers with K/M suffix
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}

/**
 * Format minutes to hours and minutes
 */
export function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  return `${minutes}m`
}

export default AnimatedCounter
