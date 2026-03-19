// Cast status indicator for showing connection state.

import React from 'react'
import { Button, cn, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { Cast, MonitorX, Loader2 } from 'lucide-react'
import type { ConnectionState } from '../hooks/usePresentationCast'

export interface CastStatusIndicatorProps {
  connectionState: ConnectionState
  isFallbackMode: boolean
  onStopCasting: () => void
  t: (key: string) => string
  'data-testid'?: string
}

export const CastStatusIndicator: React.FC<CastStatusIndicatorProps> = ({
  connectionState,
  isFallbackMode,
  onStopCasting,
  t,
  'data-testid': testId = 'cast-status'
}) => {
  if (connectionState === 'disconnected' || connectionState === 'closed') {
    return null
  }

  if (connectionState === 'connecting') {
    return (
      <Button variant="outline" size="sm" disabled className="gba:gap-2" data-testid={testId}>
        <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
        {t('cast-connecting')}
      </Button>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onStopCasting}
            className={cn('gba:gap-2 gba:text-green-600 gba:border-green-600 hover:gba:bg-green-50')}
            data-testid={testId}
          >
            <Cast className="gba:w-4 gba:h-4" />
            <span className="gba:hidden gba:sm:inline">
              {isFallbackMode ? t('cast-connected-window') : t('cast-connected')}
            </span>
            <MonitorX className="gba:w-4 gba:h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('cast-stop')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default CastStatusIndicator
