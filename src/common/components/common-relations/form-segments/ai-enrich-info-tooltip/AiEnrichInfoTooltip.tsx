import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, useTranslation } from '@newwork/nw-design-system'
import { InfoIcon } from '@phosphor-icons/react'
import translations from './_i18n'

interface AiEnrichInfoTooltipProps {
  testIdPrefix: string
}

const AiEnrichInfoTooltip: React.FC<AiEnrichInfoTooltipProps> = ({ testIdPrefix }) => {
  const { t } = useTranslation(translations)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <InfoIcon
            aria-label={t('ai-enrich-info-tooltip-label')}
            className="gba:h-4 gba:w-4 gba:shrink-0 gba:cursor-help gba:text-muted-foreground"
            data-testid={`${testIdPrefix}-Info`}
          />
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="gba:max-w-xs">
          <p className="gba:text-sm">{t('ai-enrich-info-tooltip-text')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default AiEnrichInfoTooltip
