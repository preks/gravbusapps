import React from 'react'
import { PillType } from '@/components/pill/Pill'
import { getEntityStatusDisplay } from '../../../common/utils/statusDisplayUtils'
import { resolveCssVar } from './modals/charts'

export type StatusLegendEntry = {
  key: string
  label: string
  pillType: PillType
}

type StatusLegendEntity = 'item' | 'plan' | 'request' | 'advance'

export function buildEntityStatusLegendEntries(
  entity: StatusLegendEntity,
  statusCodes: readonly string[],
  t: (key: string) => string
): StatusLegendEntry[] {
  const entries: StatusLegendEntry[] = []
  const seenLabels = new Set<string>()

  for (const status of statusCodes) {
    const display = getEntityStatusDisplay(entity, status, t)
    if (!display.label || seenLabels.has(display.label)) {
      continue
    }
    seenLabels.add(display.label)
    entries.push({
      key: status,
      label: display.label,
      pillType: display.type
    })
  }

  return entries
}

type PillConfig = {
  dotClass: string
  textClass: string
  colorToken: string
}

const STATUS_CONFIG: Record<PillType, PillConfig> = {
  draft: {
    dotClass: 'gba:bg-muted',
    textClass: 'gba:text-muted-foreground',
    colorToken: 'var(--nw-muted)'
  },
  completed: {
    dotClass: 'gba:bg-success',
    textClass: 'gba:text-muted-foreground',
    colorToken: 'var(--nw-success)'
  },
  waiting: {
    dotClass: 'gba:bg-info',
    textClass: 'gba:text-muted-foreground',
    colorToken: 'var(--nw-info)'
  },
  task: {
    dotClass: 'gba:bg-warning',
    textClass: 'gba:text-muted-foreground',
    colorToken: 'var(--nw-warning)'
  },
  error: {
    dotClass: 'gba:bg-destructive',
    textClass: 'gba:text-muted-foreground',
    colorToken: 'var(--nw-destructive)'
  },
  preparing: {
    dotClass: 'gba:bg-muted',
    textClass: 'gba:text-foreground',
    colorToken: 'var(--nw-muted)'
  }
}

export const pillTypeColorTokens: Record<PillType, string> = Object.fromEntries(
  (Object.keys(STATUS_CONFIG) as PillType[]).map(k => [k, STATUS_CONFIG[k].colorToken])
) as Record<PillType, string>

export const pillTypeColorMap: Record<PillType, string> = Object.fromEntries(
  (Object.keys(STATUS_CONFIG) as PillType[]).map(k => [k, resolveCssVar(STATUS_CONFIG[k].colorToken)])
) as Record<PillType, string>

export const pillTypeClassMap: Record<PillType, string> = Object.fromEntries(
  (Object.keys(STATUS_CONFIG) as PillType[]).map(k => [k, `${STATUS_CONFIG[k].dotClass}`])
) as Record<PillType, string>

type StatusLegendProps = {
  id?: string
  entries: StatusLegendEntry[]
}

export const StatusLegend: React.FC<StatusLegendProps> = ({ id, entries }) => {
  if (entries.length === 0) {
    return null
  }

  return (
    <div
      className="gba:mt-3 gba:flex gba:flex-wrap gba:gap-3"
      data-testid={id ? `${id}-status-legend` : 'status-legend'}
    >
      {entries.map(entry => {
        const cfg = STATUS_CONFIG[entry.pillType]
        return (
          <div key={entry.key} className="gba:flex gba:items-center gba:gap-2">
            <span aria-hidden="true" className={`gba:inline-block gba:h-3 gba:w-3 gba:rounded-full ${cfg.dotClass}`} />
            <span className={`gba:text-xs ${cfg.textClass}`}>{entry.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default StatusLegend
