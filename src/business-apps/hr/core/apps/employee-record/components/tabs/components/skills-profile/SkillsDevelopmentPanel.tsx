import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { SkillDistribution, SkillStatusFilter } from './skillsProfile.utils'

interface SkillsDevelopmentPanelProps {
  setLevelsCount: number
  verifyCount: number
  agingCount: number
  distribution: SkillDistribution[]
  groupFilter: SkillStatusFilter
  onGroupFilterChange: (value: SkillStatusFilter) => void
  t: (key: string, args?: Record<string, unknown>) => string
}

export const SkillsDevelopmentPanel: React.FC<SkillsDevelopmentPanelProps> = ({
  setLevelsCount,
  verifyCount,
  agingCount,
  distribution,
  groupFilter,
  onGroupFilterChange,
  t
}) => {
  const nextActionLines = useMemo(() => {
    const lines: React.ReactNode[] = []
    if (setLevelsCount > 0) {
      lines.push(
        <div key="setLevels" className="gba:text-sm">
          {t('skills-development-set-levels', { count: setLevelsCount })}
        </div>
      )
    }
    if (verifyCount > 0) {
      lines.push(
        <div key="verify" className="gba:text-sm">
          {t('skills-development-verify', { count: verifyCount })}
        </div>
      )
    }
    if (agingCount > 0) {
      lines.push(
        <div key="aging" className="gba:text-sm">
          {t('skills-development-aging', { count: agingCount })}
        </div>
      )
    }
    return lines
  }, [setLevelsCount, verifyCount, agingCount, t])

  const chartColor = 'var(--nw-chart-2)'
  const chartData = useMemo(
    () =>
      distribution.map(item => ({
        name: item.label,
        count: item.count,
        fill: chartColor
      })),
    [distribution]
  )

  const chartConfig = useMemo(
    (): ChartConfig => ({
      count: { label: t('skills-development-distribution'), color: chartColor }
    }),
    [t]
  )

  const hasDistribution = chartData.some(d => d.count > 0)

  return (
    <div className="gba:space-y-4" data-testid="skills-development-panel">
      {nextActionLines.length > 0 && (
        <Card data-testid="skills-next-actions-card">
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-base">{t('skills-development-next-actions')}</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-3">{nextActionLines}</CardContent>
        </Card>
      )}

      <Card data-testid="skills-distribution-card">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base">{t('skills-development-distribution')}</CardTitle>
        </CardHeader>
        <CardContent>
          {hasDistribution ? (
            <ChartContainer config={chartConfig} className="gba:h-[180px] gba:w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <XAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis type="number" allowDecimals={false} width={28} tick={{ fontSize: 11 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="gba:text-sm gba:text-muted-foreground">{t('skills-development-distribution-empty')}</p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="skills-groups-card">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base">{t('skills-development-groups')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={groupFilter} onValueChange={value => onGroupFilterChange(value as SkillStatusFilter)}>
            <SelectTrigger data-testid="skills-groups-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('skills-filter-status-all')}</SelectItem>
              <SelectItem value="verified">{t('skills-filter-status-verified')}</SelectItem>
              <SelectItem value="unverified">{t('skills-filter-status-unverified')}</SelectItem>
              <SelectItem value="inactive">{t('skills-filter-status-inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  )
}
