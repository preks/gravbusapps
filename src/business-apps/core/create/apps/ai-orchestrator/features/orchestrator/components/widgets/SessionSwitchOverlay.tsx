/**
 * SessionSwitchOverlay - Full-screen blur overlay with minimal spinner.
 * Shown when switching sessions until chat and builder avatar are fully loaded.
 */

import React from 'react'
import { Loader2 } from 'lucide-react'

export const SessionSwitchOverlay: React.FC = () => {
  return (
    <div
      className="gba:absolute gba:inset-0 gba:bg-background/95 gba:backdrop-blur-md gba:flex gba:items-center gba:justify-center"
      style={{ zIndex: 9999 }}
    >
      <Loader2 className="gba:w-8 gba:h-8 gba:text-muted-foreground gba:animate-spin" aria-hidden />
    </div>
  )
}

export default SessionSwitchOverlay
