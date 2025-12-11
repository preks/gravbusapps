/**
 * EmptyState Component
 * Displays empty state message when no tasks or flows are available
 */

import React from 'react'
import { Inbox, Send, CheckCircle, LucideIcon } from 'lucide-react'

type EmptyStateType = 'inbox' | 'outbox' | 'completed'

interface EmptyStateProps {
  type: EmptyStateType
  message?: string
}

// Helper function to get the icon based on type
const getEmptyStateIcon = (type: EmptyStateType): LucideIcon => {
  switch (type) {
    case 'inbox':
      return Inbox
    case 'outbox':
      return Send
    case 'completed':
      return CheckCircle
  }
}

// Helper function to get the default message based on type
const getDefaultMessage = (type: EmptyStateType): string => {
  switch (type) {
    case 'inbox':
      return 'No tasks assigned to you at the moment'
    case 'outbox':
      return 'You have not initiated any workflows yet'
    case 'completed':
      return 'No completed tasks yet'
  }
}

// Helper function to get the title based on type
const getEmptyStateTitle = (type: EmptyStateType): string => {
  switch (type) {
    case 'inbox':
      return 'Inbox Empty'
    case 'outbox':
      return 'No Workflows Started'
    case 'completed':
      return 'No Completed Tasks'
  }
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, message }) => {
  const Icon = getEmptyStateIcon(type)
  const defaultMessage = getDefaultMessage(type)
  const title = getEmptyStateTitle(type)

  return (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:px-4 gba:text-center"
      data-testid={`empty-state-${type}`}
    >
      <div className="gba:mb-4 gba:rounded-full gba:bg-muted gba:p-6">
        <Icon className="gba:h-12 gba:w-12 gba:text-muted-foreground" />
      </div>
      <h3 className="gba:text-lg gba:font-semibold gba:mb-2">{title}</h3>
      <p className="gba:text-sm gba:text-muted-foreground gba:max-w-md">{message || defaultMessage}</p>
    </div>
  )
}
