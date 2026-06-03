// Scrollable list of command-center feed cards (active + just-finished runs),
// newest first. Empty state keeps the panel calm when nothing is happening.

import React from 'react'
import type { WorkforceFeedItem } from '../workforceFeedModel'
import { CommandCenterFeedItem } from './CommandCenterFeedItem'

export interface CommandCenterFeedProps {
  items: readonly WorkforceFeedItem[]
  nameById: Record<string, string>
  onOpenRun: (agentId: string, sessionId: string) => void
}

export const CommandCenterFeed: React.FC<CommandCenterFeedProps> = ({ items, nameById, onOpenRun }) => {
  if (items.length === 0) {
    return (
      <p
        className="gba:py-6 gba:text-center gba:text-[11px] gba:text-muted-foreground"
        data-testid="command-center-feed-empty"
      >
        Nothing in flight right now. New runs will appear here as they start and finish.
      </p>
    )
  }

  return (
    <ul
      className="gba:flex gba:max-h-80 gba:flex-col gba:gap-2 gba:overflow-y-auto gba:pr-1"
      data-testid="command-center-feed"
    >
      {items.map(item => (
        <li key={item.key}>
          <CommandCenterFeedItem item={item} nameById={nameById} onOpenRun={onOpenRun} />
        </li>
      ))}
    </ul>
  )
}
