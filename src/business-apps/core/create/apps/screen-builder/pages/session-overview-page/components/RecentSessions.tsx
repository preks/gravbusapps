import React from 'react'
import {
  AiButton,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@newwork/nw-design-system'
import { Plus, Clock, FileCode, Trash2, Settings } from 'lucide-react'
import { SessionMetadata } from '../../../types/session'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface RecentSessionsProps {
  sessions: SessionMetadata[]
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => void
  onDeleteSession: (sessionId: string) => void
  onOpenSettings?: () => void
  disabled?: boolean
  'data-testid'?: string
}

export const RecentSessions: React.FC<RecentSessionsProps> = ({
  sessions,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onOpenSettings,
  disabled = false,
  'data-testid': testId = 'recent-sessions'
}) => {
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

  return (
    <section
      className="gba:py-8 gba:px-6"
      data-testid={testId}
      style={{ animation: 'fadeInUp 0.6s ease-out 0.5s both' }}
    >
      <div className="gba:max-w-6xl gba:mx-auto">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
          <div>
            <h2 className="gba:text-2xl gba:font-bold gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.recent_sessions', 'Recent Sessions')}
            </h2>
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:ai_builder.sessions.continue_or_start',
                'Continue working on existing screens or start a new project'
              )}
            </p>
          </div>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-muted gba:transition-colors"
              title={getTranslationFromI18nKeyAndLabel(
                'lowcoder:ai_builder.sessions.repository_settings',
                'Repository Settings'
              )}
            >
              <Settings className="gba:w-4 gba:h-4" />
              <span className="gba:hidden md:gba:inline">
                {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.settings', 'Settings')}
              </span>
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <Card className="gba:py-12">
            <CardContent className="gba:text-center gba:space-y-4">
              <div className="gba:w-16 gba:h-16 gba:mx-auto gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
                {disabled ? (
                  <Settings className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
                ) : (
                  <FileCode className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">
                  {disabled
                    ? getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.sessions.repo_not_configured',
                        'Repository Not Configured'
                      )
                    : getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.sessions.no_sessions_yet',
                        'No sessions yet'
                      )}
                </h3>
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                  {disabled
                    ? getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.sessions.configure_repo_help',
                        'Please configure a repository in Settings to get started'
                      )
                    : getTranslationFromI18nKeyAndLabel(
                        'lowcoder:ai_builder.sessions.create_first_help',
                        'Create your first session to start building screens with Screen Builder'
                      )}
                </p>
              </div>
              {!disabled && (
                <AiButton onClick={onCreateSession} className="gba:gap-2">
                  <Plus className="gba:w-4 gba:h-4" />
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:ai_builder.sessions.create_first',
                    'Create First Session'
                  )}
                </AiButton>
              )}
              {disabled && onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="gba:inline-flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:rounded-lg gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90 gba:transition-colors"
                >
                  <Settings className="gba:w-4 gba:h-4" />
                  {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.open_settings', 'Open Settings')}
                </button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
            {sessions.map(session => (
              <Card
                key={session.sessionId}
                className="gba:group gba:cursor-pointer gba:transition-all hover:gba:shadow-lg hover:gba:border-primary/50"
                onClick={() => onSelectSession(session.sessionId)}
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
                      title={getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.delete', 'Delete session')}
                      data-testid={`delete-session-${session.sessionId}`}
                    >
                      <Trash2 className="gba:w-4 gba:h-4" />
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="gba:space-y-3">
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

                  {session.description && (
                    <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2">{session.description}</p>
                  )}

                  <div className="gba:flex gba:items-center gba:justify-between gba:pt-2 gba:border-t gba:border-border">
                    <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                      <Clock className="gba:w-3 gba:h-3" />
                      <span>{formatDate(session.lastModified)}</span>
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

        {sessions.length > 0 && (
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-6 gba:text-sm gba:text-muted-foreground gba:mt-6">
            <span>
              {sessions.length}{' '}
              {sessions.length === 1
                ? getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.session_singular', 'session')
                : getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.sessions.session_plural', 'sessions')}
            </span>
          </div>
        )}
      </div>
    </section>
  )
}

export default RecentSessions
