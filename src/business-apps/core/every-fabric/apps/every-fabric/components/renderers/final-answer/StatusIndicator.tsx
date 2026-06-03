import React from 'react'

export const StatusIndicator: React.FC<{ isInstant?: boolean }> = ({ isInstant }) => {
  if (!isInstant) {
    return <span className="gba:text-[11px] gba:text-muted-foreground">Completed</span>
  }
  return null
}
