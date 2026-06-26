import React, { type FC, type ReactNode } from 'react'

const STYLE_ID = 'gba-thinking-shimmer-style'

const SHIMMER_CSS = `
@keyframes gba-thinking-shimmer {
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
}

.gba-thinking-shimmer {
  background-image: linear-gradient(
    90deg,
    color-mix(in srgb, var(--muted-foreground, #737373) 45%, transparent) 0%,
    var(--muted-foreground, #737373) 28%,
    var(--foreground, #0a0a0a) 50%,
    var(--muted-foreground, #737373) 72%,
    color-mix(in srgb, var(--muted-foreground, #737373) 45%, transparent) 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: gba-thinking-shimmer 2.4s ease-in-out infinite;
}

@supports not (background-clip: text) {
  .gba-thinking-shimmer {
    background: none;
    color: var(--muted-foreground, #737373);
    animation: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gba-thinking-shimmer {
    animation: none;
    background: none;
    -webkit-background-clip: unset;
    background-clip: unset;
    color: var(--muted-foreground, #737373);
  }
}
`

function ensureShimmerStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = SHIMMER_CSS
  document.head.appendChild(style)
}

ensureShimmerStyles()

export interface ShimmerTextProps {
  children: ReactNode
  className?: string
  enabled?: boolean
}

/** Sweeps a soft highlight across text — used for active agent status / thinking lines. */
export const ShimmerText: FC<ShimmerTextProps> = ({ children, className = '', enabled = true }) => {
  if (!enabled) {
    return <span className={className}>{children}</span>
  }

  return (
    <span className={`gba-thinking-shimmer ${className}`.trim()} data-testid="shimmer-text">
      {children}
    </span>
  )
}
