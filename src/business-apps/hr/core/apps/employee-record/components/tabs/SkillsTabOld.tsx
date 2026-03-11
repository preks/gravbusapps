import React, { useMemo } from 'react'
import { Card, CardContent, EmptyState, Progress, useTranslation } from '@newwork/nw-design-system'
import { Employee } from '../../hooks/useEmployeeData'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'
import translations from '../../_i18n'
import { StarIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { calculateSkillStats, getLevelInfo, getSkillCategory, getTimeSince } from '../../utils/utils'

const LEVEL_TOKEN_CLASSES: Record<number, { bg: string; text: string }> = {
  0: { bg: 'gba:bg-muted', text: 'gba:text-muted-foreground' },
  1: { bg: 'gba:bg-destructive', text: 'gba:text-destructive' },
  2: { bg: 'gba:bg-warning', text: 'gba:text-warning' },
  3: { bg: 'gba:bg-warning', text: 'gba:text-warning' },
  4: { bg: 'gba:bg-info', text: 'gba:text-info' },
  5: { bg: 'gba:bg-success', text: 'gba:text-success' }
}

interface SkillsTabOldProps {
  employee: Employee
  accessToken: string
  employeeId?: string // Optional employeeId override for permissions check
  userInfo?: UserInfoProps // Current user info for self-view check
}

/**
 * Skills Tab Component
 * Displays skills for the employee with enhanced visual design
 */
const SkillsTabOld: React.FC<SkillsTabOldProps> = ({ employee, accessToken }) => {
  const { t } = useTranslation(translations)
  // Use employee skills data directly
  const employeeSkills = useMemo(() => {
    return employee.skills || []
  }, [employee.skills])

  // Get non-deleted skills for display
  const validSkills = useMemo(() => {
    return employeeSkills.filter(skill => !skill.isDeleted)
  }, [employeeSkills])

  // Calculate skill statistics
  const skillStats = useMemo(() => {
    return calculateSkillStats(employeeSkills)
  }, [employeeSkills])

  return (
    <div className="gba:skills-tab gba:space-y-8" data-testid="skills-tab">
      <div className="gba:flex gba:justify-between gba:items-start" data-testid="skills-header">
        <div className="gba:skills-header">
          <div className="gba:font-bold gba:text-2xl" data-testid="skills-title">
            {t('skills-title')}
          </div>
          <div className="gba:text-muted-foreground gba:text-lg" data-testid="skills-description">
            {t('skills-description')}
          </div>
        </div>
        <AppAction
          variant="update-primary"
          data-testid="employee-skills-edit-button"
          contexts={[{ context: FlowContextName.updateEmployeeSkill, contextData: { employeeId: employee?.id } }]}
          prefixDataTestId="employee-skills-edit"
          accessToken={accessToken}
          autoExecute={true}
        >
          {t('skills-edit-button')}
        </AppAction>
      </div>

      {validSkills.length === 0 ? (
        <EmptyState title={t('skills-empty')} data-testid="skills-empty" />
      ) : (
        <>
          {/* Skills Statistics */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4 gba:mb-8" data-testid="skills-stats">
            <Card>
              <CardContent className="gba:p-4">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div>
                    <div className="gba:text-2xl gba:font-bold">{skillStats.total}</div>
                    <div className="gba:text-sm gba:text-muted-foreground">{t('skills-total')}</div>
                  </div>
                  <StarIcon className="gba:h-8 gba:w-8" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="gba:p-4">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div>
                    <div className="gba:text-lg gba:font-bold">
                      {skillStats.highestSkills.length > 0
                        ? skillStats.highestSkills.map((skill: any) => skill.skill.name).join(', ')
                        : t('skills-none')}
                    </div>
                    <div className="gba:text-sm gba:text-muted-foreground">{t('skills-highest')}</div>
                  </div>
                  <CheckCircleIcon className="gba:h-8 gba:w-8 gba:text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Skills Grid */}
          <div
            className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6"
            data-testid="skills-grid"
          >
            {validSkills.map(skillItem => {
              const hasLevel = skillItem.level && skillItem.level !== null && skillItem.level !== ''
              const levelInfo = hasLevel ? getLevelInfo(Number(skillItem.level), t) : getLevelInfo(0, t)
              const category = getSkillCategory(skillItem.skill.additionalProperties)
              const timeSinceCreated = getTimeSince(skillItem.skill.createdAt || '')
              const timeSinceUpdated = getTimeSince(skillItem.skill.updatedAt || '')

              return (
                <Card
                  key={skillItem.skill.id}
                  className="gba:h-full gba:overflow-hidden"
                  data-testid={`skill-card-${skillItem.skill.id}`}
                >
                  <div className="gba:relative">
                    {/* Skill Level Progress Bar */}
                    <div
                      className={`gba:absolute gba:top-0 gba:left-0 gba:right-0 gba:h-1 ${LEVEL_TOKEN_CLASSES[hasLevel ? Number(skillItem.level) : 0]?.bg ?? 'gba:bg-muted'}`}
                    />

                    <CardContent className="gba:p-6">
                      {/* Header */}
                      <div className="gba:flex gba:justify-between gba:items-start gba:mb-4">
                        <div className="gba:flex-1">
                          <h4
                            className={`gba:font-bold gba:text-xl gba:mb-1 ${LEVEL_TOKEN_CLASSES[hasLevel ? Number(skillItem.level) : 0]?.text ?? 'gba:text-muted-foreground'}`}
                          >
                            {skillItem.skill.name}
                          </h4>
                        </div>
                        <div className="gba:flex gba:flex-col gba:items-end">
                          <div
                            className={`gba:font-bold gba:text-xl ${LEVEL_TOKEN_CLASSES[hasLevel ? Number(skillItem.level) : 0]?.text ?? 'gba:text-muted-foreground'}`}
                          >
                            {hasLevel ? skillItem.level : t('skills-na')}
                          </div>
                          <div className="gba:text-xs gba:text-muted-foreground">{t('skills-level')}</div>
                        </div>
                      </div>

                      {/* Progress Bar - Only show if skill has a level */}
                      {hasLevel && (
                        <div className="gba:mb-4">
                          <Progress value={(Number(skillItem.level) / 5) * 100} className="gba:h-2" />
                        </div>
                      )}

                      {/* Level Description */}
                      <div className="gba:mb-4">
                        <p className="gba:text-sm gba:text-muted-foreground">{levelInfo.description}</p>
                      </div>

                      {/* Additional Information */}
                      <div className="gba:space-y-2 gba:border-t gba:border-border gba:pt-4">
                        <div className="gba:flex gba:justify-between gba:items-center">
                          <span className="gba:text-xs gba:text-muted-foreground">{t('skills-category')}</span>
                          <span className="gba:text-xs gba:font-medium gba:text-foreground">{category}</span>
                        </div>

                        <div className="gba:flex gba:justify-between gba:items-center">
                          <span className="gba:text-xs gba:text-muted-foreground">{t('skills-added')}</span>
                          <span className="gba:text-xs gba:font-medium gba:text-foreground">{timeSinceCreated}</span>
                        </div>

                        {skillItem.skill.updatedAt && skillItem.skill.updatedAt !== skillItem.skill.createdAt && (
                          <div className="gba:flex gba:justify-between gba:items-center">
                            <span className="gba:text-xs gba:text-muted-foreground">{t('skills-updated')}</span>
                            <span className="gba:text-xs gba:font-medium gba:text-foreground">{timeSinceUpdated}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default SkillsTabOld
