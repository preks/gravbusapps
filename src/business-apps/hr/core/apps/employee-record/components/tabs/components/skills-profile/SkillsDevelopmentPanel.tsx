import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { SparkleIcon } from '@phosphor-icons/react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { SkillDistribution, type JobProfileGap } from './skillsProfile.utils'

interface SkillsDevelopmentPanelProps {
  verifyCount: number
  distribution: SkillDistribution[]
  jobProfileGap: JobProfileGap | null
  t: (key: string, args?: Record<string, unknown>) => string
}

function buildNextActionItems(
  verifyCount: number,
  jobProfileGap: JobProfileGap | null,
  t: (key: string, args?: Record<string, unknown>) => string
): Array<{ key: string; node: React.ReactNode }> {
  const items: Array<{ key: string; node: React.ReactNode }> = []
  if (verifyCount > 0) {
    items.push({
      key: 'verify',
      node: <div className="gba:text-sm">{t('skills-development-verify-certification', { count: verifyCount })}</div>
    })
  }
  if (jobProfileGap == null) return items
  const { jobProfileName, missingSkills, belowLevelSkills } = jobProfileGap
  const hasMissing = missingSkills.length > 0
  const hasBelowLevel = belowLevelSkills.length > 0
  if (hasMissing === false && hasBelowLevel === false) {
    items.push({
      key: 'job-profile-fit',
      node: (
        <div className="gba:text-sm" data-testid="skills-job-profile-fit">
          {t('skills-development-job-profile-fit', { name: jobProfileName })}
        </div>
      )
    })
    return items
  }
  if (hasMissing) {
    if (missingSkills.length === 1) {
      items.push({
        key: 'job-profile-missing-one',
        node: (
          <div className="gba:text-sm" data-testid="skills-job-profile-gap">
            {t('skills-development-job-profile-missing-one-prefix')}{' '}
            <strong className="gba:font-bold gba:text-foreground">{missingSkills[0].name}</strong>
            {t('skills-development-job-profile-missing-one-suffix')}
          </div>
        )
      })
    } else {
      items.push({
        key: 'job-profile-missing',
        node: (
          <div className="gba:text-sm" data-testid="skills-job-profile-gap">
            {t('skills-development-job-profile-missing-prefix', { count: missingSkills.length })}{' '}
            {missingSkills.map((s, i) => (
              <React.Fragment key={s.id}>
                {i > 0 && ', '}
                <strong className="gba:font-bold gba:text-foreground">{s.name}</strong>
              </React.Fragment>
            ))}
            .
          </div>
        )
      })
    }
  }
  if (hasBelowLevel) {
    belowLevelSkills.forEach(s => {
      items.push({
        key: `job-profile-below-${s.skillName}-${s.employeeLevel}-${s.profileLevel}`,
        node: (
          <div className="gba:text-sm">
            {t('skills-development-job-profile-below-level-prefix')}{' '}
            <strong className="gba:font-bold gba:text-foreground">{s.skillName}</strong>{' '}
            {t('skills-development-job-profile-below-level-suffix', {
              employeeLevel: s.employeeLevel,
              profileLevel: s.profileLevel
            })}
          </div>
        )
      })
    })
  }
  return items
}

export const SkillsDevelopmentPanel: React.FC<SkillsDevelopmentPanelProps> = ({
  verifyCount,
  distribution,
  jobProfileGap,
  t
}) => {
  const nextActionItems = useMemo(
    () => buildNextActionItems(verifyCount, jobProfileGap, t),
    [verifyCount, jobProfileGap, t]
  )

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
      {nextActionItems.length > 0 && (
        <Card data-testid="skills-next-actions-card">
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
              <SparkleIcon className="gba:w-5 gba:h-5 gba:text-primary" />
              {t('skills-development-next-actions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="gba:space-y-0 gba:list-none gba:pl-0 gba:m-0" data-testid="skills-next-actions-list">
              {nextActionItems.map(item => (
                <li
                  key={item.key}
                  className="gba:flex gba:gap-2 gba:items-start gba:py-2 gba:border-b gba:border-border gba:last:border-b-0 gba:first:pt-0"
                >
                  <span
                    className="gba:flex-shrink-0 gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:mt-1.5"
                    aria-hidden
                  />
                  <div className="gba:min-w-0 gba:flex-1">{item.node}</div>
                </li>
              ))}
            </ul>
          </CardContent>
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
    </div>
  )
}
