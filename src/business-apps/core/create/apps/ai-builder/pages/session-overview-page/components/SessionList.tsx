import React, { useState, useEffect } from 'react'
import {
  AiButton,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@newwork/nw-design-system'
import { Plus, Clock, FileCode, Search, Trash2, Folder, Settings, Loader2 } from 'lucide-react'
import { DebouncedInput } from '@/components/debounced-input'
import { SessionMetadata } from '../../../types/session'
import { IndexingProgress } from '../../../components/IndexingProgress'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface SessionListProps {
  sessions: SessionMetadata[]
  onSelectSession: (sessionId: string) => void | Promise<void>
  onCreateSession: () => void | Promise<void>
  onDeleteSession: (sessionId: string) => void
  onOpenSettings?: () => void
  disabled?: boolean
  isOpeningSession?: boolean
  openingSessionId?: string | null
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onOpenSettings,
  disabled = false,
  isOpeningSession = false,
  openingSessionId = null
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredSessions, setFilteredSessions] = useState(sessions)

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSessions(sessions)
      return
    }

    const search = searchTerm.toLowerCase()
    const filtered = sessions.filter(
      session =>
        session.targetPath?.toLowerCase().includes(search) ||
        session.resourceUrl?.toLowerCase().includes(search) ||
        session.description?.toLowerCase().includes(search) ||
        session.createdBy.displayName.toLowerCase().includes(search) ||
        session.createdBy.email?.toLowerCase().includes(search)
    )
    setFilteredSessions(filtered)
  }, [searchTerm, sessions])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return minutes <= 1
          ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.just_now', 'Just now')
          : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.minutes_ago', `${minutes} minutes ago`, {
              count: minutes
            })
      }
      return hours === 1
        ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.hour_ago', '1 hour ago')
        : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.hours_ago', `${hours} hours ago`, {
            count: hours
          })
    }
    if (days === 1) return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.yesterday', 'Yesterday')
    if (days < 7)
      return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.days_ago', `${days} days ago`, {
        count: days
      })
    if (days < 30)
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:ai_builder.sessions.weeks_ago',
        `${Math.floor(days / 7)} weeks ago`,
        { count: Math.floor(days / 7) }
      )
    return date.toLocaleDateString()
  }

  const getUserInitials = (user: SessionMetadata['createdBy']) => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
  }

  const getEmptyStateTitle = (): string => {
    if (disabled) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:ai_builder.sessions.repo_not_configured',
        'Repository Not Configured'
      )
    }
    if (searchTerm) {
      return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.no_sessions_found', 'No sessions found')
    }
    return getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.no_sessions_yet', 'No sessions yet')
  }

  const getEmptyStateDescription = (): string => {
    if (disabled) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:ai_builder.sessions.configure_repo_help',
        'Please configure a repository in Settings to get started'
      )
    }
    if (searchTerm) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:ai_builder.sessions.adjust_search',
        'Try adjusting your search terms'
      )
    }
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:ai_builder.sessions.create_first_help',
      'Create your first session to start building screens with AI'
    )
  }

  return (
    <div className="gba:min-h-screen gba:relative gba:p-6 gba:overflow-hidden">
      {/* AI-themed animated background */}
      <div className="gba:absolute gba:inset-0 gba:-z-10 gba:bg-gradient-to-br gba:from-blue-50 gba:via-purple-50 gba:to-pink-50 dark:gba:from-blue-950/20 dark:gba:via-purple-950/20 dark:gba:to-pink-950/20" />

      {/* Animated gradient orbs */}
      <div className="gba:absolute gba:top-0 gba:left-1/4 gba:w-96 gba:h-96 gba:bg-gradient-to-r gba:from-blue-400 gba:to-purple-400 gba:rounded-full gba:mix-blend-multiply gba:filter gba:blur-3xl gba:opacity-20 gba:animate-blob" />
      <div className="gba:absolute gba:top-0 gba:right-1/4 gba:w-96 gba:h-96 gba:bg-gradient-to-r gba:from-purple-400 gba:to-pink-400 gba:rounded-full gba:mix-blend-multiply gba:filter gba:blur-3xl gba:opacity-20 gba:animate-blob gba:animation-delay-2000" />
      <div className="gba:absolute gba:-bottom-32 gba:left-1/3 gba:w-96 gba:h-96 gba:bg-gradient-to-r gba:from-pink-400 gba:to-blue-400 gba:rounded-full gba:mix-blend-multiply gba:filter gba:blur-3xl gba:opacity-20 gba:animate-blob gba:animation-delay-4000" />

      {/* Grid pattern overlay */}
      <div
        className="gba:absolute gba:inset-0 gba:-z-10 gba:opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="gba:max-w-6xl gba:mx-auto gba:space-y-6 gba:relative">
        {isOpeningSession && (
          <div className="gba:fixed gba:inset-0 gba:z-50 gba:flex gba:items-center gba:justify-center gba:bg-background/70 gba:backdrop-blur-sm">
            <div className="gba:flex gba:items-center gba:gap-3">
              <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
              <span className="gba:text-sm">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:ai_builder.sessions.opening_session',
                  'Opening session...'
                )}
              </span>
            </div>
          </div>
        )}

        {/* Indexing Progress Banner */}
        <IndexingProgress />

        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <h1 className="gba:text-3xl gba:font-bold gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.title', 'AI Builder Sessions')}
            </h1>
            <p className="gba:text-muted-foreground gba:mt-1">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:ai_builder.sessions.description',
                'Continue working on existing screens or start a new project'
              )}
            </p>
          </div>
          <div className="gba:flex gba:items-center gba:gap-3">
            {onOpenSettings && (
              <Button
                onClick={onOpenSettings}
                variant="outline"
                size="lg"
                className="gba:gap-2 gba:shadow-sm"
                disabled={isOpeningSession}
                title={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:ai_builder.sessions.repository_settings',
                  'Repository Settings'
                )}
              >
                <Settings className="gba:w-5 gba:h-5" />
                <span className="gba:hidden md:gba:inline">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.settings', 'Settings')}
                </span>
              </Button>
            )}
            <AiButton
              onClick={onCreateSession}
              size="lg"
              className="gba:gap-2 gba:shadow-lg"
              disabled={disabled || isOpeningSession}
              title={
                disabled
                  ? getTranslationFromI18nKeyAndLabel(
                      'lowcoder:ai_builder.sessions.configure_first',
                      'Configure a repository first'
                    )
                  : undefined
              }
            >
              <Plus className="gba:w-5 gba:h-5" />
              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.new_session', 'New Session')}
            </AiButton>
          </div>
        </div>

        {/* Search */}
        <DebouncedInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={getTranslationFromI18nKeyAndLabel(
            'lowcoder:ai_builder.sessions.search_placeholder',
            'Search sessions by screen path, user, or description...'
          )}
          icon={<Search className="gba:w-4 gba:h-4 gba:text-muted-foreground" />}
          className="gba:w-full gba:shadow-sm gba:border-border"
          ariaLabel={getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.search_label', 'Search sessions')}
          data-testid="session-search-input"
          debounceDelay={300}
        />

        {/* Sessions Grid */}
        {filteredSessions.length === 0 ? (
          <Card className="gba:py-12">
            <CardContent className="gba:text-center gba:space-y-4">
              <div className="gba:w-16 gba:h-16 gba:mx-auto gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
                {disabled ? (
                  <Settings className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
                ) : (
                  <Folder className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{getEmptyStateTitle()}</h3>
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{getEmptyStateDescription()}</p>
              </div>
              {!searchTerm && !disabled && (
                <AiButton onClick={onCreateSession} className="gba:gap-2" disabled={isOpeningSession}>
                  <Plus className="gba:w-4 gba:h-4" />
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.sessions.create_first',
                    'Create First Session'
                  )}
                </AiButton>
              )}
              {disabled && onOpenSettings && (
                <Button onClick={onOpenSettings} className="gba:gap-2">
                  <Settings className="gba:w-4 gba:h-4" />
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.open_settings', 'Open Settings')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
            {filteredSessions.map(session => (
              <Card
                key={session.sessionId}
                className="gba:group gba:cursor-pointer gba:transition-all hover:gba:shadow-lg hover:gba:border-primary/50"
                onClick={() => {
                  if (!isOpeningSession) {
                    void onSelectSession(session.sessionId)
                  }
                }}
                data-testid={`session-card-${session.sessionId}`}
              >
                <CardHeader>
                  <CardTitle className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                        <FileCode className="gba:w-4 gba:h-4 gba:text-primary gba:flex-shrink-0" />
                        <span className="gba:text-sm gba:font-mono gba:truncate gba:text-foreground">
                          {session.targetPath ||
                            getTranslationFromI18nKeyAndLabel(
                              'lowcoder:ai_builder.sessions.untitled_screen',
                              'Untitled Screen'
                            )}
                        </span>
                      </div>
                      {session.resourceUrl && (
                        <div className="gba:text-xs gba:font-normal gba:text-muted-foreground gba:font-mono gba:truncate">
                          {session.resourceUrl}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        if (isOpeningSession) return
                        if (
                          confirm(
                            getTranslationFromI18nKeyAndLabel(
                              'lowcoder:ai_builder.sessions.delete_confirm',
                              'Delete this session? This action cannot be undone.'
                            )
                          )
                        ) {
                          onDeleteSession(session.sessionId)
                        }
                      }}
                      className="gba:shrink-0 gba:text-muted-foreground hover:gba:text-destructive gba:p-1.5 gba:rounded gba:transition-colors"
                      disabled={isOpeningSession}
                      title={getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.delete', 'Delete session')}
                      data-testid={`delete-session-${session.sessionId}`}
                    >
                      <Trash2 className="gba:w-4 gba:h-4" />
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="gba:space-y-3">
                  {/* User Info */}
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Avatar size="sm">
                      {session.createdBy.pictureThumbnail ? (
                        <AvatarImage
                          src={`data:image/jpeg;base64,${session.createdBy.pictureThumbnail}`}
                          alt={session.createdBy.displayName}
                        />
                      ) : null}
                      <AvatarFallback className="gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white gba:font-semibold gba:text-xs">
                        {getUserInitials(session.createdBy)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                        {session.createdBy.displayName}
                      </div>
                      {session.createdBy.email && (
                        <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                          {session.createdBy.email}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {session.description && (
                    <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2">{session.description}</p>
                  )}

                  {/* Metadata */}
                  <div className="gba:flex gba:items-center gba:justify-between gba:pt-2 gba:border-t gba:border-border">
                    <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                      {isOpeningSession && openingSessionId === session.sessionId ? (
                        <>
                          <Loader2 className="gba:w-3 gba:h-3 gba:animate-spin" />
                          <span>
                            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.opening', 'Opening...')}
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock className="gba:w-3 gba:h-3" />
                          <span>{formatDate(session.lastModified)}</span>
                        </>
                      )}
                    </div>
                    {session.fileCount > 0 && (
                      <div className="gba:text-xs gba:font-medium gba:text-primary">
                        {session.fileCount} {session.fileCount === 1 ? 'file' : 'files'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {sessions.length > 0 && (
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-6 gba:text-sm gba:text-muted-foreground">
            <span>
              {sessions.length}{' '}
              {sessions.length === 1
                ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.session_singular', 'session')
                : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.session_plural', 'sessions')}
            </span>
            {searchTerm && filteredSessions.length !== sessions.length && (
              <span>
                • {filteredSessions.length}{' '}
                {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.matching', 'matching')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
