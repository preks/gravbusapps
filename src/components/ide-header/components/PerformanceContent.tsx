import React, { useMemo } from 'react'
import { Badge, ScrollArea, ScrollBar } from '@newwork/nw-design-system'
import { useScreenPerformanceSnapshot } from '@/common/hooks/useScreenPerformanceMetrics'

type ScreenHealth = 'healthy' | 'watch' | 'poor'

interface ScreenPerformanceRow {
  screenKey: string
  commitCount: number
  mountCount: number
  updateCount: number
  avgRenderDurationMs: number | null
  maxRenderDurationMs: number | null
  slowRenderCount: number
  verySlowRenderCount: number
  recentLongTaskCount: number
  totalLongTaskCount: number
  health: ScreenHealth
}

function formatDuration(value: number | null): string {
  return value == null ? '—' : value.toFixed(1)
}

function getScreenHealth(row: Omit<ScreenPerformanceRow, 'health'>): ScreenHealth {
  if (
    row.recentLongTaskCount > 0 ||
    (row.maxRenderDurationMs != null && row.maxRenderDurationMs >= 50) ||
    row.verySlowRenderCount > 0
  ) {
    return 'poor'
  }

  if ((row.avgRenderDurationMs != null && row.avgRenderDurationMs >= 16) || row.slowRenderCount > 0) {
    return 'watch'
  }

  return 'healthy'
}

function getHealthBadge(row: ScreenPerformanceRow): React.ReactNode {
  if (row.health === 'poor') {
    return (
      <Badge variant="secondary" className="gba:bg-destructive-secondary gba:text-destructive-secondary-foreground">
        Poor
      </Badge>
    )
  }

  if (row.health === 'watch') {
    return (
      <Badge variant="secondary" className="gba:bg-warning-secondary gba:text-warning-secondary-foreground">
        Watch
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="gba:bg-success-secondary gba:text-success-secondary-foreground">
      Healthy
    </Badge>
  )
}

export const PerformanceContent: React.FC = () => {
  const performanceSnapshot = useScreenPerformanceSnapshot()

  const rows = useMemo(() => {
    return performanceSnapshot.screens
      .map(screenMetrics => {
        const nextRow = {
          screenKey: screenMetrics.screenKey,
          commitCount: screenMetrics.commitCount,
          mountCount: screenMetrics.mountCount,
          updateCount: screenMetrics.updateCount + screenMetrics.nestedUpdateCount,
          avgRenderDurationMs: screenMetrics.commitCount ? screenMetrics.avgRenderDurationMs : null,
          maxRenderDurationMs: screenMetrics.commitCount ? screenMetrics.maxRenderDurationMs : null,
          slowRenderCount: screenMetrics.slowRenderCount,
          verySlowRenderCount: screenMetrics.verySlowRenderCount,
          recentLongTaskCount: screenMetrics.recentLongTaskCount,
          totalLongTaskCount: screenMetrics.totalLongTaskCount
        }

        return {
          ...nextRow,
          health: getScreenHealth(nextRow)
        } satisfies ScreenPerformanceRow
      })
      .sort((leftRow, rightRow) => {
        if (leftRow.screenKey === performanceSnapshot.activeScreenKey) return -1
        if (rightRow.screenKey === performanceSnapshot.activeScreenKey) return 1

        const healthRank = { poor: 2, watch: 1, healthy: 0 }
        if (healthRank[rightRow.health] !== healthRank[leftRow.health]) {
          return healthRank[rightRow.health] - healthRank[leftRow.health]
        }

        if ((rightRow.maxRenderDurationMs ?? 0) !== (leftRow.maxRenderDurationMs ?? 0)) {
          return (rightRow.maxRenderDurationMs ?? 0) - (leftRow.maxRenderDurationMs ?? 0)
        }

        if ((rightRow.avgRenderDurationMs ?? 0) !== (leftRow.avgRenderDurationMs ?? 0)) {
          return (rightRow.avgRenderDurationMs ?? 0) - (leftRow.avgRenderDurationMs ?? 0)
        }

        return leftRow.screenKey.localeCompare(rightRow.screenKey)
      })
  }, [performanceSnapshot])

  const activeRow = rows.find(row => row.screenKey === performanceSnapshot.activeScreenKey) ?? null

  return (
    <div className="gba:space-y-3 gba:min-w-0">
      <div className="gba:p-3 gba:bg-muted/50 gba:border gba:border-border gba:rounded-lg">
        <h4 className="gba:font-semibold gba:text-sm gba:mb-2">How To Read It</h4>
        <ul className="gba:text-xs gba:text-muted-foreground gba:space-y-1">
          <li>Runtime render metrics only. Dev loader and Vite compile time are excluded.</li>
          <li>Avg render under 16ms usually feels smooth.</li>
          <li>Spikes above 50ms or recent long tasks indicate main-thread blocking.</li>
        </ul>
      </div>

      {activeRow && (
        <div className="gba:p-3 gba:border gba:border-border gba:rounded-lg gba:space-y-2">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <div className="gba:min-w-0">
              <div className="gba:text-sm gba:font-semibold">Current Screen</div>
              <div className="gba:text-[10px] gba:font-mono gba:text-muted-foreground gba:break-all">
                {activeRow.screenKey}
              </div>
            </div>
            {getHealthBadge(activeRow)}
          </div>

          <dl className="gba:text-xs gba:space-y-1">
            <div className="gba:flex gba:justify-between gba:gap-2">
              <dt className="gba:text-muted-foreground">Avg render (ms)</dt>
              <dd className="gba:font-mono">{formatDuration(activeRow.avgRenderDurationMs)}</dd>
            </div>
            <div className="gba:flex gba:justify-between gba:gap-2">
              <dt className="gba:text-muted-foreground">Max render (ms)</dt>
              <dd className="gba:font-mono">{formatDuration(activeRow.maxRenderDurationMs)}</dd>
            </div>
            <div className="gba:flex gba:justify-between gba:gap-2">
              <dt className="gba:text-muted-foreground">Commits</dt>
              <dd className="gba:font-mono">{activeRow.commitCount}</dd>
            </div>
            <div className="gba:flex gba:justify-between gba:gap-2">
              <dt className="gba:text-muted-foreground">Mount / update commits</dt>
              <dd className="gba:font-mono">
                {activeRow.mountCount} / {activeRow.updateCount}
              </dd>
            </div>
            <div className="gba:flex gba:justify-between gba:gap-2">
              <dt className="gba:text-muted-foreground">Slow commits</dt>
              <dd className="gba:font-mono">
                {activeRow.slowRenderCount}
                {activeRow.verySlowRenderCount > 0 ? ` / ${activeRow.verySlowRenderCount} >50ms` : ''}
              </dd>
            </div>
            <div className="gba:flex gba:justify-between gba:gap-2">
              <dt className="gba:text-muted-foreground">Long tasks (30s / total)</dt>
              <dd className="gba:font-mono">
                {activeRow.recentLongTaskCount} / {activeRow.totalLongTaskCount}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <div className="gba:min-w-0">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <h4 className="gba:font-semibold gba:text-sm">Per Screen Analysis</h4>
          <div className="gba:text-[10px] gba:text-muted-foreground">{rows.length} screens tracked</div>
        </div>
        <ScrollArea className="gba:max-h-[420px] gba:border gba:border-border gba:rounded-lg">
          <ScrollArea className="gba:w-full gba:border-0 gba:rounded-none">
            <ScrollBar orientation="horizontal" />
            <div className="gba:min-w-[760px]">
              <table className="gba:w-full gba:text-xs">
                <thead className="gba:bg-muted gba:sticky gba:top-0">
                  <tr>
                    <th className="gba:p-2 gba:text-left gba:font-medium">Screen</th>
                    <th className="gba:p-2 gba:text-left gba:font-medium">Health</th>
                    <th className="gba:p-2 gba:text-left gba:font-medium">Commits</th>
                    <th className="gba:p-2 gba:text-left gba:font-medium">Avg Render</th>
                    <th className="gba:p-2 gba:text-left gba:font-medium">Max Render</th>
                    <th className="gba:p-2 gba:text-left gba:font-medium">Slow Commits</th>
                    <th className="gba:p-2 gba:text-left gba:font-medium">Long Tasks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.screenKey} className="gba:border-t gba:border-border">
                      <td className="gba:p-2 gba:min-w-[240px]">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <code className="gba:text-[10px] gba:break-all">{row.screenKey}</code>
                          {row.screenKey === performanceSnapshot.activeScreenKey && (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </div>
                      </td>
                      <td className="gba:p-2">{getHealthBadge(row)}</td>
                      <td className="gba:p-2 gba:font-mono">{row.commitCount}</td>
                      <td className="gba:p-2 gba:font-mono">{formatDuration(row.avgRenderDurationMs)}</td>
                      <td className="gba:p-2 gba:font-mono">{formatDuration(row.maxRenderDurationMs)}</td>
                      <td className="gba:p-2 gba:font-mono">
                        {row.slowRenderCount}
                        {row.verySlowRenderCount > 0 ? ` / ${row.verySlowRenderCount} >50ms` : ''}
                      </td>
                      <td className="gba:p-2 gba:font-mono">
                        {row.recentLongTaskCount}
                        {row.totalLongTaskCount > row.recentLongTaskCount ? ` / ${row.totalLongTaskCount}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
          {rows.length === 0 && (
            <div className="gba:p-6 gba:text-center gba:text-muted-foreground gba:text-xs">
              No screen metrics captured yet. Open a screen and interact with it to collect data.
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
