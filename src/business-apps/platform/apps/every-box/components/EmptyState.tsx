/**
 * EmptyState Component
 * Displays empty state message when no tasks or flows are available
 */

import React from 'react'
import { Inbox, Send, CheckCircle } from 'lucide-react'

interface EmptyStateProps {
  type: 'inbox' | 'outbox' | 'completed'
  message?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, message }) => {
  const Icon = type === 'inbox' ? Inbox : type === 'outbox' ? Send : CheckCircle
  const defaultMessage =
    type === 'inbox'
      ? 'No tasks assigned to you at the moment'
      : type === 'outbox'
        ? 'You have not initiated any workflows yet'
        : 'No completed tasks yet'

  return (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:px-4 gba:text-center"
      data-testid={`empty-state-${type}`}
    >
      <div className="gba:mb-4 gba:rounded-full gba:bg-muted gba:p-6">
        <Icon className="gba:h-12 gba:w-12 gba:text-muted-foreground" />
      </div>
      <h3 className="gba:text-lg gba:font-semibold gba:mb-2">
        {type === 'inbox' ? 'Inbox Empty' : type === 'outbox' ? 'No Workflows Started' : 'No Completed Tasks'}
      </h3>
      <p className="gba:text-sm gba:text-muted-foreground gba:max-w-md">{message || defaultMessage}</p>
    </div>
  )
}
