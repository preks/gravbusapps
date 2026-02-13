import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { SessionMetadata } from '../../types/session'
import { AdminSettings } from './components/AdminSettings'
import { SessionHeroSection } from './components/SessionHeroSection'
import { SessionQuickActions } from './components/SessionQuickActions'
import { RecentSessions } from './components/RecentSessions'
import { ContentBackground } from './components/ContentBackground'
import { IndexingProgress } from '../../components/IndexingProgress'

export interface SessionOverviewPageProps {
  repositoryId: string
  configMessage: string | null
  sessions: SessionMetadata[]
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => void
  onDeleteSession: (sessionId: string) => Promise<void>
}

export const SessionOverviewPage: React.FC<SessionOverviewPageProps> = ({
  repositoryId,
  configMessage,
  sessions,
  onSelectSession,
  onCreateSession,
  onDeleteSession
}) => {
  const [showAdminSettings, setShowAdminSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredSessions, setFilteredSessions] = useState(sessions)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions)
      return
    }

    const search = searchQuery.toLowerCase()
    const filtered = sessions.filter(
      session =>
        session.targetPath?.toLowerCase().includes(search) ||
        session.resourceUrl?.toLowerCase().includes(search) ||
        session.description?.toLowerCase().includes(search) ||
        session.createdBy.displayName.toLowerCase().includes(search) ||
        session.createdBy.email?.toLowerCase().includes(search)
    )
    setFilteredSessions(filtered)
  }, [searchQuery, sessions])

  if (showAdminSettings) {
    return <AdminSettings onClose={() => setShowAdminSettings(false)} />
  }

  const disabled = !repositoryId
  const handleOpenSettings = () => setShowAdminSettings(true)
  const handleCreateSession = disabled ? handleOpenSettings : onCreateSession

  return (
    <div className="gba:min-h-screen gba:bg-background gba:relative">
      <ContentBackground />

      <div className="gba:relative gba:z-10">
        {configMessage && (
          <div className="gba:bg-amber-50 dark:gba:bg-amber-950/30 gba:border-b gba:border-amber-200 dark:gba:border-amber-800 gba:px-6 gba:py-3">
            <div className="gba:flex gba:items-center gba:justify-between gba:max-w-6xl gba:mx-auto">
              <div className="gba:flex gba:items-center gba:gap-3">
                <AlertCircle className="gba:w-5 gba:h-5 gba:text-amber-600 dark:gba:text-amber-400" />
                <span className="gba:text-sm gba:text-amber-800 dark:gba:text-amber-200">{configMessage}</span>
              </div>
              <button
                onClick={handleOpenSettings}
                className="gba:text-sm gba:font-medium gba:text-amber-700 dark:gba:text-amber-300 hover:gba:underline"
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.open_settings', 'Open Settings')}
              </button>
            </div>
          </div>
        )}

        <IndexingProgress />

        <SessionHeroSection />

        <SessionQuickActions
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateSession={handleCreateSession}
          disabled={disabled}
        />

        <RecentSessions
          sessions={filteredSessions}
          onSelectSession={onSelectSession}
          onCreateSession={handleCreateSession}
          onDeleteSession={onDeleteSession}
          onOpenSettings={handleOpenSettings}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
