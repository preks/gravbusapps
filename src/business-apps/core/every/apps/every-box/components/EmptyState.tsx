/**
 * EmptyState Component
 * Displays empty state message when no tasks or flows are available
 */

import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Inbox, Send, CheckCircle, LucideIcon } from 'lucide-react'
import translations from '../_i18n'

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

export const EmptyState: React.FC<EmptyStateProps> = ({ type, message }) => {
  const { t } = useTranslation(translations)

  // Helper function to get the default message based on type
  const getDefaultMessage = (emptyStateType: EmptyStateType): string => {
    switch (emptyStateType) {
      case 'inbox':
        return t('inbox-empty-no-tasks')
      case 'outbox':
        return t('outbox-empty-no-workflows')
      case 'completed':
        return t('inbox-empty-no-completed')
    }
  }

  // Helper function to get the title based on type
  const getEmptyStateTitle = (emptyStateType: EmptyStateType): string => {
    switch (emptyStateType) {
      case 'inbox':
        return t('empty-state-inbox-title')
      case 'outbox':
        return t('empty-state-outbox-title')
      case 'completed':
        return t('empty-state-completed-title')
    }
  }

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
