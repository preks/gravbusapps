import { useEffect, useRef, useState } from 'react'

interface UseTypewriterRevealOptions {
  enabled?: boolean
  initialDelayMs?: number
  stepMs?: number
  maxSteps?: number
}

const DEFAULT_INITIAL_DELAY_MS = 70
const DEFAULT_STEP_MS = 18
const DEFAULT_MAX_STEPS = 48

/**
 * Generic typewriter-style reveal for a final string. Keeps the display logic
 * out of the consuming component so visuals like streaming markdown bubbles
 * stay declarative. When `enabled` is false the full content is shown
 * immediately. When the target extends what is already on screen we continue
 * typing forward (useful for progressive chunks) instead of wiping + restarting.
 */
export function useTypewriterReveal(content: string, options: UseTypewriterRevealOptions = {}) {
  const {
    enabled = true,
    initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
    stepMs = DEFAULT_STEP_MS,
    maxSteps = DEFAULT_MAX_STEPS
  } = options

  const [revealed, setRevealed] = useState(enabled ? '' : content)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completedTargetRef = useRef('')
  const renderedRef = useRef(enabled ? '' : content)
  const lastTargetRef = useRef(enabled ? '' : content)

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (!content) {
      completedTargetRef.current = ''
      lastTargetRef.current = ''
      renderedRef.current = ''
      setRevealed('')
      return
    }

    if (!enabled) {
      completedTargetRef.current = content
      lastTargetRef.current = content
      renderedRef.current = content
      setRevealed(content)
      return
    }

    if (lastTargetRef.current === content) {
      renderedRef.current = content
      setRevealed(content)
      return
    }

    if (completedTargetRef.current === content) {
      renderedRef.current = content
      setRevealed(content)
      return
    }

    const canContinueForward = renderedRef.current.length > 0 && content.startsWith(renderedRef.current)

    let visibleChars = canContinueForward ? renderedRef.current.length : 0
    const stepSize = Math.max(1, Math.ceil(content.length / maxSteps))

    const revealNextChunk = () => {
      visibleChars = Math.min(content.length, visibleChars + stepSize)
      const nextContent = content.slice(0, visibleChars)
      renderedRef.current = nextContent
      setRevealed(nextContent)

      if (visibleChars < content.length) {
        timerRef.current = setTimeout(revealNextChunk, stepMs)
        return
      }

      completedTargetRef.current = content
      lastTargetRef.current = content
      timerRef.current = null
    }

    if (!canContinueForward) {
      completedTargetRef.current = ''
      renderedRef.current = ''
      setRevealed('')
    }

    const firstDelay = canContinueForward ? stepMs : initialDelayMs
    timerRef.current = setTimeout(revealNextChunk, firstDelay)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [content, enabled, initialDelayMs, stepMs, maxSteps])

  const isRevealing = enabled && revealed.length > 0 && revealed.length < content.length

  return { revealed, isRevealing }
}
