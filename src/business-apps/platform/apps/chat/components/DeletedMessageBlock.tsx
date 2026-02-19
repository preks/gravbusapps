/**
 * Deleted message placeholder.
 */

import React from 'react'
import type { Message } from '../types'

export interface DeletedMessageBlockProps {
  message: Message
}

export const DeletedMessageBlock: React.FC<DeletedMessageBlockProps> = ({ message }) => (
  <div className="gba:flex gba:justify-center gba:py-1.5" data-testid={`message-${message.id}`}>
    <span className="gba:text-xs gba:text-muted-foreground gba:italic gba:bg-muted/50 gba:px-3 gba:py-1 gba:rounded-full">
      Message deleted
    </span>
  </div>
)

DeletedMessageBlock.displayName = 'DeletedMessageBlock'
