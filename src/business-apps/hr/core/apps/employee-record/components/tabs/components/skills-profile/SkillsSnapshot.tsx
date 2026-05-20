import React from 'react'
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from '@newwork/nw-design-system'
import { EmployeeSkillItem, SkillSnapshotData, parseSkillLevel } from './skillsProfile.utils'

interface SkillsSnapshotProps {
  snapshot: SkillSnapshotData
  t: (key: string, args?: Record<string, unknown>) => string
}

const TopSkillsContent: React.FC<{ topSkills: EmployeeSkillItem[]; t: SkillsSnapshotProps['t'] }> = ({
  topSkills,
  t
}) => {
  if (topSkills.length === 0) {
    return <p className="gba:text-xs gba:text-muted-foreground">{t('skills-snapshot-needs-levels')}</p>
  }

  return (
    <div className="gba:flex gba:flex-wrap gba:gap-1.5" data-testid="skills-snapshot-top-skills-list">
      {topSkills.map(skill => (
        <Badge key={skill.skill.id} variant="secondary" data-testid={`skills-snapshot-top-${skill.skill.id}`}>
          <span>{skill.skill.name}</span>
          <span>{parseSkillLevel(skill.level) || '-'}</span>
        </Badge>
      ))}
    </div>
  )
}

export const SkillsSnapshot: React.FC<SkillsSnapshotProps & { children?: React.ReactNode }> = ({
  snapshot,
  t,
  children
}) => {
  return (
    <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-4 gba:gap-4" data-testid="skills-snapshot-section">
      <Card data-testid="skills-snapshot-strength-card">
        <CardHeader className="gba:px-4 gba:pt-3 gba:pb-1">
          <CardTitle className="gba:text-sm gba:font-bold">{t('skills-snapshot-strength-title')}</CardTitle>
          <CardDescription className="gba:text-xs">{t('skills-snapshot-strength-description')}</CardDescription>
        </CardHeader>
        <CardContent className="gba:px-4 gba:pb-3 gba:pt-0 gba:space-y-2">
          <div className="gba:flex gba:items-end gba:gap-1.5">
            <span className="gba:text-2xl gba:font-bold">{snapshot.strengthScore}</span>
            <span className="gba:text-xs gba:text-muted-foreground">/100</span>
          </div>
          <Progress value={snapshot.strengthScore} data-testid="skills-snapshot-strength-progress" />
          <p className="gba:text-[11px] gba:text-muted-foreground">
            {t('skills-snapshot-strength-footnote', { count: snapshot.leveledSkillCount })}
          </p>
        </CardContent>
      </Card>

      <Card data-testid="skills-snapshot-top-card">
        <CardHeader className="gba:px-4 gba:pt-3 gba:pb-1">
          <CardTitle className="gba:text-sm gba:font-bold">{t('skills-snapshot-top-title')}</CardTitle>
          <CardDescription className="gba:text-xs">{t('skills-snapshot-top-description')}</CardDescription>
        </CardHeader>
        <CardContent className="gba:px-4 gba:pb-3 gba:pt-0">
          <TopSkillsContent topSkills={snapshot.topSkills} t={t} />
        </CardContent>
      </Card>

      <Card data-testid="skills-snapshot-coverage-card">
        <CardHeader className="gba:px-4 gba:pt-3 gba:pb-1">
          <CardTitle className="gba:text-sm gba:font-bold">{t('skills-snapshot-coverage-title')}</CardTitle>
          <CardDescription className="gba:text-xs">{t('skills-snapshot-coverage-description')}</CardDescription>
        </CardHeader>
        <CardContent className="gba:px-4 gba:pb-3 gba:pt-0 gba:space-y-2">
          <div className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:text-xs gba:text-muted-foreground">{t('skills-snapshot-verified')}</span>
            <span className="gba:text-base gba:font-semibold" data-testid="skills-snapshot-verified-count">
              {snapshot.verifiedCount}
            </span>
          </div>
          <div className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:text-xs gba:text-muted-foreground">{t('skills-snapshot-active')}</span>
            <span className="gba:text-base gba:font-semibold" data-testid="skills-snapshot-active-count">
              {snapshot.activeCount}
            </span>
          </div>
          <div className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:text-xs gba:text-muted-foreground">{t('skills-snapshot-pending')}</span>
            <span className="gba:text-base gba:font-semibold" data-testid="skills-snapshot-pending-count">
              {snapshot.pendingCount}
            </span>
          </div>
        </CardContent>
      </Card>

      {children}
    </div>
  )
}
