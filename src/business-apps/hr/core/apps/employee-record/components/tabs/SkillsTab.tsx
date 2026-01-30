import React, { useMemo } from 'react'
import { Card } from '@newwork/gravity-ui-catalog'
import { Empty, Progress } from 'antd'
import { Employee } from '../../hooks/useEmployeeData'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { PiStar, PiCheckCircle } from 'react-icons/pi'
import { calculateSkillStats, getLevelInfo, getSkillCategory, getTimeSince } from '../../utils/utils'

interface SkillsTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string // Optional employeeId override for permissions check
  userInfo?: UserInfoProps // Current user info for self-view check
}

/**
 * Skills Tab Component
 * Displays skills for the employee with enhanced visual design
 */
const SkillsTab: React.FC<SkillsTabProps> = ({ employee, accessToken }) => {
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
        <Empty description={t('skills-empty')} data-testid="skills-empty" />
      ) : (
        <>
          {/* Skills Statistics */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4 gba:mb-8" data-testid="skills-stats">
            <Card className="gba:border gba:border-border gba:shadow-sm gba:hover:shadow-md gba:transition-all">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div>
                  <div className="gba:text-2xl gba:font-bold gba:text-info">{skillStats.total}</div>
                  <div className="gba:text-sm gba:text-muted-foreground">{t('skills-total')}</div>
                </div>
                <PiStar className="gba:h-8 gba:w-8 gba:text-info" />
              </div>
            </Card>

            <Card className="gba:border gba:border-border gba:shadow-sm gba:hover:shadow-md gba:transition-all">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div>
                  <div className="gba:text-lg gba:font-bold gba:text-info">
                    {skillStats.highestSkills.length > 0
                      ? skillStats.highestSkills.map((skill: any) => skill.skill.name).join(', ')
                      : t('skills-none')}
                  </div>
                  <div className="gba:text-sm gba:text-muted-foreground">{t('skills-highest')}</div>
                </div>
                <PiCheckCircle className="gba:h-8 gba:w-8" style={{ color: 'var(--nw-color-purple-500)' }} />
              </div>
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
                  className="gba:h-full gba:border gba:border-border gba:shadow-md gba:hover:shadow-lg gba:transition-all gba:overflow-hidden"
                  data-testid={`skill-card-${skillItem.skill.id}`}
                  style={{
                    background: 'var(--nw-color-white)',
                    borderRadius: 'var(--nw-spacing-3)'
                  }}
                >
                  <div className="gba:relative">
                    {/* Skill Level Progress Bar */}
                    <div
                      className="gba:absolute gba:top-0 gba:left-0 gba:right-0 gba:h-1"
                      style={{ backgroundColor: levelInfo.color }}
                    />

                    <div className="gba:p-6">
                      {/* Header */}
                      <div className="gba:flex gba:justify-between gba:items-start gba:mb-4">
                        <div className="gba:flex-1">
                          <h4 className="gba:font-bold gba:text-xl gba:mb-1" style={{ color: levelInfo.color }}>
                            {skillItem.skill.name}
                          </h4>
                        </div>
                        <div className="gba:flex gba:flex-col gba:items-end">
                          <div className="gba:font-bold gba:text-xl" style={{ color: levelInfo.color }}>
                            {hasLevel ? skillItem.level : t('skills-na')}
                          </div>
                          <div className="gba:text-xs gba:text-gray-500">{t('skills-level')}</div>
                        </div>
                      </div>

                      {/* Progress Bar - Only show if skill has a level */}
                      {hasLevel && (
                        <div className="gba:mb-4">
                          <Progress
                            percent={(Number(skillItem.level) / 5) * 100}
                            showInfo={false}
                            strokeColor={levelInfo.color}
                            trailColor="var(--color-gray-200)"
                            strokeWidth={8}
                          />
                        </div>
                      )}

                      {/* Level Description */}
                      <div className="gba:mb-4">
                        <p className="gba:text-sm gba:text-muted-foreground">{levelInfo.description}</p>
                      </div>

                      {/* Additional Information */}
                      <div className="gba:space-y-2 gba:border-t gba:border-gray-100 gba:pt-4">
                        <div className="gba:flex gba:justify-between gba:items-center">
                          <span className="gba:text-xs gba:text-gray-500">{t('skills-category')}</span>
                          <span className="gba:text-xs gba:font-medium" style={{ color: 'var(--nw-color-gray-700)' }}>
                            {category}
                          </span>
                        </div>

                        <div className="gba:flex gba:justify-between gba:items-center">
                          <span className="gba:text-xs gba:text-gray-500">{t('skills-added')}</span>
                          <span className="gba:text-xs gba:font-medium" style={{ color: 'var(--nw-color-gray-700)' }}>
                            {timeSinceCreated}
                          </span>
                        </div>

                        {skillItem.skill.updatedAt && skillItem.skill.updatedAt !== skillItem.skill.createdAt && (
                          <div className="gba:flex gba:justify-between gba:items-center">
                            <span className="gba:text-xs gba:text-gray-500">{t('skills-updated')}</span>
                            <span className="gba:text-xs gba:font-medium" style={{ color: 'var(--nw-color-gray-700)' }}>
                              {timeSinceUpdated}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
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

export default SkillsTab
