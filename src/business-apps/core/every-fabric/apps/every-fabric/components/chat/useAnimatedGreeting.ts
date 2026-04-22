import { useEffect, useRef, useState } from 'react'

const GREETING_INITIAL_DELAY_MS = 70
const GREETING_STEP_MS = 18
const GREETING_MAX_STEPS = 48

/**
 * Typewriter-style reveal for greeting markdown; complexity lives here so the bubble stays simple.
 */
export function useAnimatedGreeting(greetingContent: string) {
  const [animatedGreetingContent, setAnimatedGreetingContent] = useState('')
  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animatedGreetingRef = useRef('')
  const renderedRef = useRef('')
  const lastGreetingRef = useRef('')

  useEffect(() => {
    if (greetingTimerRef.current) {
      clearTimeout(greetingTimerRef.current)
      greetingTimerRef.current = null
    }

    if (!greetingContent) {
      animatedGreetingRef.current = ''
      lastGreetingRef.current = ''
      renderedRef.current = ''
      setAnimatedGreetingContent('')
      return
    }

    if (lastGreetingRef.current === greetingContent) {
      renderedRef.current = greetingContent
      setAnimatedGreetingContent(greetingContent)
      return
    }

    if (animatedGreetingRef.current === greetingContent) {
      renderedRef.current = greetingContent
      setAnimatedGreetingContent(greetingContent)
      return
    }

    // Continue typing forward when the new target extends what's already on screen
    // (e.g. REST trace → SSE events handoff, or progressive chunks). This prevents a
    // visible "wipe + restart" that reads as the greeting flashing twice.
    const canContinueForward = renderedRef.current.length > 0 && greetingContent.startsWith(renderedRef.current)

    let visibleChars = canContinueForward ? renderedRef.current.length : 0
    const stepSize = Math.max(1, Math.ceil(greetingContent.length / GREETING_MAX_STEPS))

    const revealNextChunk = () => {
      visibleChars = Math.min(greetingContent.length, visibleChars + stepSize)
      const nextContent = greetingContent.slice(0, visibleChars)
      renderedRef.current = nextContent
      setAnimatedGreetingContent(nextContent)

      if (visibleChars < greetingContent.length) {
        greetingTimerRef.current = setTimeout(revealNextChunk, GREETING_STEP_MS)
        return
      }

      animatedGreetingRef.current = greetingContent
      lastGreetingRef.current = greetingContent
      greetingTimerRef.current = null
    }

    if (!canContinueForward) {
      animatedGreetingRef.current = ''
      renderedRef.current = ''
      setAnimatedGreetingContent('')
    }

    const initialDelay = canContinueForward ? GREETING_STEP_MS : GREETING_INITIAL_DELAY_MS
    greetingTimerRef.current = setTimeout(revealNextChunk, initialDelay)

    return () => {
      if (greetingTimerRef.current) {
        clearTimeout(greetingTimerRef.current)
        greetingTimerRef.current = null
      }
    }
  }, [greetingContent])

  const isGreetingAnimating =
    animatedGreetingContent.length > 0 && animatedGreetingContent.length < greetingContent.length

  return { animatedGreetingContent, isGreetingAnimating }
}
