import type { FC } from 'react'
import { useEffect, useState, useRef } from 'react'

interface ElegantStatusIndicatorProps {
  statusText: string | null
}

const FALLBACK_STATUS_TEXT = 'Working on it...'

// Belt-and-braces guard: even though useAgentSession already filters
// status/live_status content, this component is the most visible pill — if a
// raw payload, UUID, email, stack frame, or oversized blob ever reaches it,
// render a neutral fallback instead of the leaked text.
//
// All quantifiers below are bounded and character classes are mutually
// exclusive with their neighbouring literals to avoid super-linear backtracking
// (sonar typescript:S5852).
const STATUS_UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const STATUS_EMAIL_RE = /[^\s@.]{1,64}@[^\s@.]{1,64}(?:\.[^\s@.]{1,64}){1,4}/
const STATUS_STACK_RE = /(?:^|\n)[ \t]{1,16}at[ \t]{1,16}\S{1,200}/
const STATUS_STRIP_PREFIX_RE = /🔄[ \t]{0,4}/
const STATUS_MAX_LEN = 200

const isUnsafeStatusText = (text: string): boolean => {
  const trimmed = text.trim()
  if (!trimmed) return true
  if (trimmed.length > STATUS_MAX_LEN) return true
  const first = trimmed.charAt(0)
  if (first === '{' || first === '[' || first === '<') return true
  if (STATUS_UUID_RE.test(trimmed)) return true
  if (STATUS_EMAIL_RE.test(trimmed)) return true
  if (STATUS_STACK_RE.test(trimmed)) return true
  const lowered = trimmed.toLowerCase()
  return (
    lowered.includes('traceback (most recent call last)') ||
    lowered.includes("client error '4") ||
    lowered.includes("client error '5")
  )
}

/**
 * Minimal status indicator matching Claude's design
 * Just a small spinner icon and gray text, no background
 */
export const ElegantStatusIndicator: FC<ElegantStatusIndicatorProps> = ({ statusText }) => {
  const [displayText, setDisplayText] = useState(statusText || '')
  const [isVisible, setIsVisible] = useState(!!statusText)
  const [isFading, setIsFading] = useState(false)
  const previousTextRef = useRef(statusText)

  useEffect(() => {
    if (!statusText) {
      setIsVisible(false)
      return
    }

    // If text changed, fade out, update, then fade in
    if (statusText !== previousTextRef.current && previousTextRef.current) {
      setIsFading(true)

      // Fade out duration
      setTimeout(() => {
        setDisplayText(statusText)
        setIsFading(false)
      }, 300)
    } else {
      setDisplayText(statusText)
      setIsVisible(true)
    }

    previousTextRef.current = statusText
  }, [statusText])

  if (!isVisible) return null

  const stripped = displayText.replace(STATUS_STRIP_PREFIX_RE, '')
  const cleanText = isUnsafeStatusText(stripped) ? FALLBACK_STATUS_TEXT : stripped

  return (
    <div
      className="gba:flex gba:items-center gba:gap-2 gba:mt-2 gba:transition-opacity gba:duration-300"
      style={{
        opacity: isFading ? 0.55 : 0.82
      }}
    >
      {/* Simple spinner */}
      <svg
        className="gba:animate-spin gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/70"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="gba:opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="gba:opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="gba:text-[13px] gba:text-muted-foreground/80 gba:font-normal">{cleanText}</span>
    </div>
  )
}
