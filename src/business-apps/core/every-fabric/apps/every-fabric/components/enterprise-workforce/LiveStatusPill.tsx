// Small "LIVE" indicator with a pulsing dot, shown while a run is streaming.

import { BroadcastIcon } from '@phosphor-icons/react'
import React from 'react'

export interface LiveStatusPillProps {
  /** Optional short label for what is happening right now. */
  label?: string
  connected?: boolean
}

export const LiveStatusPill: React.FC<LiveStatusPillProps> = ({ label, connected = true }) => {
  return (
    <span
      className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:bg-primary/10 gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-primary"
      data-testid="workforce-live-pill"
    >
      <span className="gba:relative gba:flex gba:h-2 gba:w-2">
        {connected && (
          <span className="gba:absolute gba:inline-flex gba:h-full gba:w-full gba:animate-ping gba:rounded-full gba:bg-primary/60" />
        )}
        <span className="gba:relative gba:inline-flex gba:h-2 gba:w-2 gba:rounded-full gba:bg-primary" />
      </span>
      <BroadcastIcon className="gba:h-3 gba:w-3" weight="bold" />
      {label || 'Live'}
    </span>
  )
}
