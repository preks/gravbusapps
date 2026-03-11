/**
 * StatusIndicators Component
 *
 * Displays collaboration, connection, and entity data source status indicators.
 */

import React from 'react'
import { Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { Signal, Database, RefreshCw, Loader2 } from 'lucide-react'
import { PresenceIndicator } from '../../../../../platform/apps/shared/components/PresenceIndicator'
import type { CollaborationParticipant } from '../../../../../platform/apps/shared/hooks/useCollaboration'

export interface StatusIndicatorsProps {
  // Collaboration
  headerParticipants: CollaborationParticipant[]
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
  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid={testId}>
      {/* Collaboration presence indicator - shows active users */}
      {headerParticipants.length > 0 && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:mr-2 gba:pr-2 gba:border-r">
          <PresenceIndicator participants={headerParticipants} maxVisible={3} size="sm" showLabel={false} />
          <span className="gba:text-xs gba:text-muted-foreground">{headerParticipants.length} active</span>
        </div>
      )}

      {/* Connection status indicator - shows when connected but alone */}
      {headerParticipants.length === 0 && isCollaborationConnected && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="success" className="gba:flex gba:items-center gba:gap-1.5 gba:cursor-default">
                <Signal className="gba:w-3.5 gba:h-3.5 gba:text-success" />
                <span className="gba:text-xs gba:font-medium">Live</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <span>Real-time collaboration active. Others will appear when they join.</span>
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
              <span>Connected to {entityDataSource.entityDisplayName} data source</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
