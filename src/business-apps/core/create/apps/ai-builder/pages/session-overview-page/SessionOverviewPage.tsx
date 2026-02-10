import React from 'react'
import { AlertCircle } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { SessionList } from '../../components/SessionList'
import { SessionMetadata } from '../../types/session'

export interface SessionOverviewPageProps {
  repositoryId: string
  configMessage: string | null
  sessions: SessionMetadata[]
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => void
  onDeleteSession: (sessionId: string) => Promise<void>
  onOpenSettings: () => void
  disabled: boolean
}

export const SessionOverviewPage: React.FC<SessionOverviewPageProps> = ({
  configMessage,
  sessions,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onOpenSettings,
  disabled
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:h-full">
      {configMessage && (
        <div className="gba:bg-amber-50 dark:gba:bg-amber-950/30 gba:border-b gba:border-amber-200 dark:gba:border-amber-800 gba:px-6 gba:py-3">
          <div className="gba:flex gba:items-center gba:justify-between gba:max-w-6xl gba:mx-auto">
            <div className="gba:flex gba:items-center gba:gap-3">
              <AlertCircle className="gba:w-5 gba:h-5 gba:text-amber-600 dark:gba:text-amber-400" />
              <span className="gba:text-sm gba:text-amber-800 dark:gba:text-amber-200">{configMessage}</span>
            </div>
            <button
              onClick={onOpenSettings}
              className="gba:text-sm gba:font-medium gba:text-amber-700 dark:gba:text-amber-300 hover:gba:underline"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.open_settings', 'Open Settings')}
            </button>
          </div>
        </div>
      )}
      <div className="gba:flex-1">
        <SessionList
          sessions={sessions}
          onSelectSession={onSelectSession}
          onCreateSession={onCreateSession}
          onDeleteSession={onDeleteSession}
          onOpenSettings={onOpenSettings}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
