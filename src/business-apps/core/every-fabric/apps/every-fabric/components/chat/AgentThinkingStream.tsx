import type { FC } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'

const MAX_VISIBLE_SENTENCES = 3
const FIXED_HEIGHT_REM = 5

interface AgentThinkingStreamProps {
  thinkingText: string
  isStreaming: boolean
}

interface SentenceSegment {
  text: string
  /** Stable key from substring offset in source text (not array index). */
  key: string
}

function isSentenceEndingPunctuation(char: string): boolean {
  return char === '.' || char === '!' || char === '?'
}

/** Single-character test equivalent to `\s` (no nested quantifiers; safe for untrusted-length input). */
const SINGLE_WHITESPACE = /\s/
function isWhitespaceCodeUnit(char: string): boolean {
  return SINGLE_WHITESPACE.test(char)
}

/**
 * Split text into sentences.
 * Splits after a run of . ! ? that is followed by whitespace or end of string (same rules as before, O(n)).
 */
function splitIntoSentences(text: string): SentenceSegment[] {
  if (!text) return []

  const parts: SentenceSegment[] = []
  let lastIndex = 0
  const n = text.length
  let i = 0

  const pushSentence = (from: number, until: number) => {
    const sentence = text.substring(from, until).trim()
    if (sentence) {
      parts.push({ text: sentence, key: `thinking-seg-${from}` })
    }
  }

  while (i < n) {
    if (!isSentenceEndingPunctuation(text[i])) {
      i += 1
      continue
    }

    let punctEnd = i + 1
    while (punctEnd < n && isSentenceEndingPunctuation(text[punctEnd])) {
      punctEnd += 1
    }

    if (punctEnd === n) {
      pushSentence(lastIndex, punctEnd)
      lastIndex = punctEnd
      break
    }

    if (isWhitespaceCodeUnit(text[punctEnd])) {
      let boundaryEnd = punctEnd
      while (boundaryEnd < n && isWhitespaceCodeUnit(text[boundaryEnd])) {
        boundaryEnd += 1
      }
      pushSentence(lastIndex, boundaryEnd)
      lastIndex = boundaryEnd
      i = boundaryEnd
      continue
    }

    i = punctEnd
  }

  if (lastIndex < n) {
    const remaining = text.substring(lastIndex).trim()
    if (remaining) {
      parts.push({ text: remaining, key: `thinking-tail-${lastIndex}` })
    }
  }

  return parts
}

export const AgentThinkingStream: FC<AgentThinkingStreamProps> = ({ thinkingText, isStreaming }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const sentences = useMemo(() => splitIntoSentences(thinkingText), [thinkingText])
  const visibleSentences = useMemo(() => sentences.slice(-MAX_VISIBLE_SENTENCES), [sentences])

  // Auto-scroll to bottom when new content arrives
  useLayoutEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [thinkingText])

  // Fade in animation on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.opacity = '0'
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.opacity = '1'
        }
      })
    }
  }, [])

  // Only show when streaming AND has thinking text
  if (!isStreaming || !thinkingText) return null

  return (
    <div
      ref={containerRef}
      className="gba:relative gba:mt-3 gba:transition-opacity gba:duration-300"
      style={{ opacity: 1 }}
      data-testid="agent-thinking-stream"
    >
      <div className="gba:mb-1.5 gba:flex gba:items-center gba:gap-1.5">
        <span className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-[0.08em] gba:text-muted-foreground">
          Thinking
        </span>
      </div>

      {/* Gradient overlay at the top */}
      <div
        className="gba:absolute gba:top-0 gba:left-0 gba:right-0 gba:h-6 gba:pointer-events-none gba:z-10"
        style={{
          background: 'linear-gradient(to bottom, var(--background) 0%, transparent 100%)'
        }}
      />

      {/* Fixed-height scrollable container */}
      <div
        ref={contentRef}
        className="gba:relative gba:overflow-hidden gba:rounded-lg gba:border gba:border-border/30 gba:bg-muted/20 gba:px-3 gba:py-2"
        style={{
          height: `${FIXED_HEIGHT_REM}rem`,
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)'
        }}
      >
        <div className="gba:space-y-2">
          {visibleSentences.map((segment, idx) => (
            <p
              key={segment.key}
              className="gba:text-xs gba:leading-relaxed gba:text-muted-foreground gba:animate-in gba:fade-in gba:slide-in-from-bottom-1 gba:duration-200"
              style={{
                animationDelay: `${idx * 50}ms`,
                opacity: isStreaming && idx === visibleSentences.length - 1 ? 0.85 : 0.7
              }}
            >
              {segment.text}
            </p>
          ))}
        </div>
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="gba:absolute gba:bottom-2 gba:right-2 gba:flex gba:items-center gba:gap-1">
          <span className="gba:w-1 gba:h-1 gba:rounded-full gba:bg-muted-foreground/40 gba:animate-pulse" />
          <span
            className="gba:w-1 gba:h-1 gba:rounded-full gba:bg-muted-foreground/40 gba:animate-pulse"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="gba:w-1 gba:h-1 gba:rounded-full gba:bg-muted-foreground/40 gba:animate-pulse"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      )}
    </div>
  )
}
