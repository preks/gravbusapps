import React, { useEffect, useState } from 'react'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'

const ROTATE_KEYS = [
  'composer-rotate-1',
  'composer-rotate-2',
  'composer-rotate-3',
  'composer-rotate-4',
  'composer-rotate-5',
  'composer-rotate-6'
] as const

const INTERVAL_MS = 2600

/**
 * Animated placeholder for the EveryFabric composer. A fixed prefix ("Ask
 * Every") stays put while the trailing phrase flips through suggestions like a
 * split-flap / digital clock display. Rendered as a pointer-events-none overlay
 * so it sits behind the caret without blocking input; the flip animation is
 * disabled under prefers-reduced-motion (see index.css).
 */
const ComposerRotatingPlaceholder: React.FC = () => {
  const { t } = useWorkplaceTranslation()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex(prev => (prev + 1) % ROTATE_KEYS.length)
    }, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="gba:pointer-events-none gba:absolute gba:inset-0 gba:flex gba:items-center gba:overflow-hidden gba:text-sm gba:text-muted-foreground"
    >
      <span className="gba:shrink-0">{t('composer-prefix')}&nbsp;</span>
      <span key={index} className="dw-phrase-flip gba:min-w-0 gba:truncate">
        {t(ROTATE_KEYS[index])}
      </span>
    </div>
  )
}

export default ComposerRotatingPlaceholder
export { ComposerRotatingPlaceholder }
