import React from 'react'
import { Badge, Card, CardContent, CardHeader, CardTitle, Progress } from '@newwork/nw-design-system'
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
    return <p className="gba:text-sm gba:text-muted-foreground">{t('skills-snapshot-needs-levels')}</p>
  }

  return (
    <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="skills-snapshot-top-skills-list">
      {topSkills.map(skill => (
        <Badge
          key={skill.skill.id}
          variant="secondary"
          className="gba:gap-2"
          data-testid={`skills-snapshot-top-${skill.skill.id}`}
        >
          <span>{skill.skill.name}</span>
          <span className="gba:font-semibold">{parseSkillLevel(skill.level) || '-'}</span>
        </Badge>
      ))}
    </div>
  )
}

export const SkillsSnapshot: React.FC<SkillsSnapshotProps> = ({ snapshot, t }) => {
  return (
    <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-3 gba:gap-4" data-testid="skills-snapshot-section">
      <Card data-testid="skills-snapshot-strength-card">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base">{t('skills-snapshot-strength-title')}</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-3">
          <div className="gba:flex gba:items-end gba:gap-2">
            <span className="gba:text-3xl gba:font-bold">{snapshot.strengthScore}</span>
            <span className="gba:text-sm gba:text-muted-foreground">/100</span>
          </div>
          <Progress
            value={snapshot.strengthScore}
            className="gba:h-2"
            data-testid="skills-snapshot-strength-progress"
          />
          <p className="gba:text-xs gba:text-muted-foreground">
            {t('skills-snapshot-strength-footnote', { count: snapshot.leveledSkillCount })}
          </p>
        </CardContent>
      </Card>

      <Card data-testid="skills-snapshot-top-card">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base">{t('skills-snapshot-top-title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <TopSkillsContent topSkills={snapshot.topSkills} t={t} />
        </CardContent>
      </Card>

      <Card data-testid="skills-snapshot-coverage-card">
        <CardHeader className="gba:pb-2">
          <CardTitle className="gba:text-base">{t('skills-snapshot-coverage-title')}</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-3">
          <div className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:text-sm gba:text-muted-foreground">{t('skills-snapshot-verified')}</span>
            <span className="gba:text-lg gba:font-semibold" data-testid="skills-snapshot-verified-count">
              {snapshot.verifiedCount}
            </span>
          </div>
          <div className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:text-sm gba:text-muted-foreground">{t('skills-snapshot-active')}</span>
            <span className="gba:text-lg gba:font-semibold" data-testid="skills-snapshot-active-count">
              {snapshot.activeCount}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
