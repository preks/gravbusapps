import React from 'react'
import { DollarSign, Activity } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface UsageStatsProps {
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
}

export const UsageStats: React.FC<UsageStatsProps> = ({ totalInputTokens, totalOutputTokens, totalCost }) => {
  if (totalCost === 0) {
    return null
  }

  return (
    <div
      className="gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:bg-muted gba:rounded-lg gba:border"
      data-testid="ai-builder-usage-stats"
    >
      <div className="gba:flex gba:items-center gba:gap-2">
        <Activity className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
        <div className="gba:text-xs">
          <span className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.usage.tokens', 'Tokens:')}
          </span>
          <span className="gba:font-mono gba:font-medium gba:text-foreground gba:ml-1">
            {(totalInputTokens / 1000).toFixed(1)}K
          </span>
          <span className="gba:text-muted-foreground gba:mx-1">/</span>
          <span className="gba:font-mono gba:font-medium gba:text-foreground">
            {(totalOutputTokens / 1000).toFixed(1)}K
          </span>
        </div>
      </div>

      <div className="gba:h-4 gba:w-px gba:bg-border" />

      <div className="gba:flex gba:items-center gba:gap-2">
        <DollarSign className="gba:w-4 gba:h-4 gba:text-success" />
        <div className="gba:text-xs">
          <span className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:ai_builder.usage.cost', 'Cost:')}
          </span>
          <span className="gba:font-mono gba:font-semibold gba:text-success gba:ml-1">${totalCost.toFixed(4)}</span>
        </div>
      </div>
    </div>
  )
}
