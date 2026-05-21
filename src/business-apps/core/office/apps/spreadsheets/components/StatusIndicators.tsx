/**
 * StatusIndicators Component
 *
 * Displays collaboration, connection, and entity data source status indicators.
 */

import React from 'react'
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { Signal, Database, RefreshCw, Loader2 } from 'lucide-react'
import { PresenceIndicator } from '../../../../../platform/apps/shared/components/PresenceIndicator'
import type { DocumentParticipant } from '../../../../../platform/apps/shared/services/CollaborationClient'
import translations from '../_i18n'

export interface StatusIndicatorsProps {
  // Collaboration
  headerParticipants: DocumentParticipant[]
  isCollaborationConnected: boolean

  // Entity data source
  entityDataSource?: {
    enabled?: boolean
    entityDisplayName?: string
  }
  onRefreshEntityData?: () => void
  isEntityDataLoading?: boolean

  'data-testid'?: string
}

export const StatusIndicators: React.FC<StatusIndicatorsProps> = ({
  headerParticipants,
  isCollaborationConnected,
  entityDataSource,
  onRefreshEntityData,
  isEntityDataLoading,
  'data-testid': testId = 'status-indicators'
}) => {
  const { t } = useTranslation(translations)
  const uniqueHeaderParticipants = React.useMemo(() => {
    const seen = new Map<string, DocumentParticipant>()
    for (const participant of headerParticipants) {
      const key = participant.userId || participant.socketId
      if (key && !seen.has(key)) {
        seen.set(key, participant)
      }
    }
    return [...seen.values()]
  }, [headerParticipants])

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid={testId}>
      {/* Collaboration presence indicator - shows active users */}
      {uniqueHeaderParticipants.length > 0 && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:mr-2 gba:pr-2 gba:border-r">
          <PresenceIndicator participants={uniqueHeaderParticipants} maxVisible={3} size="sm" showLabel={false} />
          <span className="gba:text-xs gba:text-muted-foreground">
            {t('status-indicator-active-count', { count: uniqueHeaderParticipants.length })}
          </span>
        </div>
      )}

      {/* Connection status indicator - shows when connected but alone */}
      {uniqueHeaderParticipants.length === 0 && isCollaborationConnected && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="success" className="gba:flex gba:items-center gba:gap-1.5 gba:cursor-default">
                <Signal className="gba:w-3.5 gba:h-3.5 gba:text-success" />
                <span className="gba:text-xs gba:font-medium">{t('status-indicator-live')}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <span>{t('status-indicator-collaboration-live')}</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Entity data source indicator */}
      {entityDataSource?.enabled && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-2.5 gba:py-1 gba:rounded-full gba:bg-info/10 gba:border gba:border-info/20">
                <Database className="gba:w-3.5 gba:h-3.5 gba:text-info" />
                <span className="gba:text-xs gba:font-medium gba:text-info-foreground gba:max-w-[120px] gba:truncate">
                  {entityDataSource.entityDisplayName}
                </span>
                {onRefreshEntityData && (
                  <button
                    type="button"
                    onClick={onRefreshEntityData}
                    disabled={isEntityDataLoading}
                    className="gba:p-0.5 gba:rounded gba:hover:bg-info/20 gba:transition-colors gba:disabled:opacity-50"
                  >
                    {isEntityDataLoading ? (
                      <Loader2 className="gba:w-3 gba:h-3 gba:text-info gba:animate-spin" />
                    ) : (
                      <RefreshCw className="gba:w-3 gba:h-3 gba:text-info" />
                    )}
                  </button>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <span>
                {t('status-indicator-data-source-connected', { name: entityDataSource.entityDisplayName || '' })}
              </span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
