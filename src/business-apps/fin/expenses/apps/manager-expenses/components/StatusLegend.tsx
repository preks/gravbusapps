import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { PillType } from '@/components/pill/Pill'
import { resolveCssVar } from './modals/charts'

// Unified status config to avoid duplication across maps/switches
// Each entry controls: dot class, text class, chart color token, i18n key and fallback label
type PillConfig = {
  dotClass: string
  textClass: string
  colorToken: string
  i18nKey: string
  fallbackLabel: string
}

const STATUS_CONFIG: Record<PillType, PillConfig> = {
  draft: {
    dotClass: 'gba:bg-muted',
    textClass: 'gba:text-muted-foreground',
    colorToken: 'var(--nw-muted)',
    i18nKey: 'lowcoder:status_legend.draft',
    fallbackLabel: 'Draft'
  },
  completed: {
    dotClass: 'gba:bg-success',
    textClass: 'gba:text-muted-foreground',
    colorToken: 'var(--nw-success)',
    i18nKey: 'lowcoder:status_legend.completed',
    fallbackLabel: 'Completed'
  },
  waiting: {
    dotClass: 'gba:bg-info',
    textClass: 'gba:text-muted-foreground',
    colorToken: 'var(--nw-info)',
    i18nKey: 'lowcoder:status_legend.waiting',
    fallbackLabel: 'Waiting'
  },
  task: {
    dotClass: 'gba:bg-warning',
    textClass: 'gba:text-muted-foreground',
    colorToken: 'var(--nw-warning)',
    i18nKey: 'lowcoder:status_legend.task',
    fallbackLabel: 'Task'
  },
  error: {
    dotClass: 'gba:bg-destructive',
    textClass: 'gba:text-muted-foreground',
    colorToken: 'var(--nw-destructive)',
    i18nKey: 'lowcoder:status_legend.error',
    fallbackLabel: 'Error'
  },
  preparing: {
    dotClass: 'gba:bg-muted',
    textClass: 'gba:text-foreground',
    colorToken: 'var(--nw-muted)',
    i18nKey: 'lowcoder:status_legend.preparing',
    fallbackLabel: 'Preparing'
  }
}

// Derived tokens and resolved color maps for charts/consumers (exported via named consts)
export const pillTypeColorTokens: Record<PillType, string> = Object.fromEntries(
  (Object.keys(STATUS_CONFIG) as PillType[]).map(k => [k, STATUS_CONFIG[k].colorToken])
) as Record<PillType, string>

export const pillTypeColorMap: Record<PillType, string> = Object.fromEntries(
  (Object.keys(STATUS_CONFIG) as PillType[]).map(k => [k, resolveCssVar(STATUS_CONFIG[k].colorToken)])
) as Record<PillType, string>

// Expose the dot/text class map for table badges
export const pillTypeClassMap: Record<PillType, string> = Object.fromEntries(
  (Object.keys(STATUS_CONFIG) as PillType[]).map(k => [k, `${STATUS_CONFIG[k].dotClass}`])
) as Record<PillType, string>

// Helper function to get label with SSR safety
const getPillTypeLabel = (type: PillType): string => {
  const cfg = STATUS_CONFIG[type]
  if (globalThis.window !== undefined) {
    return getTranslationFromI18nKeyAndLabel(cfg.i18nKey, cfg.fallbackLabel)
  }
  return cfg.fallbackLabel
}

export const StatusLegend: React.FC<{ id?: string }> = ({ id }) => (
  <div className="gba:mt-3 gba:flex gba:flex-wrap gba:gap-3" data-testid={id ? `${id}-status-legend` : 'status-legend'}>
    {(Object.keys(STATUS_CONFIG) as PillType[]).map(type => {
      const cfg = STATUS_CONFIG[type]
      return (
        <div key={type} className="gba:flex gba:items-center gba:gap-2">
          <span aria-hidden="true" className={`gba:inline-block gba:h-3 gba:w-3 gba:rounded-full ${cfg.dotClass}`} />
          <span className={`gba:text-xs ${cfg.textClass}`}>{getPillTypeLabel(type)}</span>
        </div>
      )
    })}
  </div>
)

// keep component default export only below for stable Fast Refresh

export default StatusLegend
