import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Card, Badge, Button, Tabs, TabsContent } from '@newwork/nw-design-system'
import { PiArrowLeft, PiBuilding, PiGraph } from 'react-icons/pi'
import { useTeamCoverageData } from '../../hooks/useTeamCoverageData'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface TeamCoverageOptimizerPageProps extends BusinessAppContextProps {
  onNavigateBack: () => void
}

export const TeamCoverageOptimizerPage: React.FC<TeamCoverageOptimizerPageProps> = ({ onNavigateBack, ...props }) => {
  const { orgUnitImpacts, matrixTeamImpacts, isLoading, error } = useTeamCoverageData(props)
  const [activeTab, setActiveTab] = useState('org-units')

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'success'
      case 'medium':
        return 'warning'
      case 'high':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const getRiskText = (risk: string) => {
    switch (risk) {
      case 'low':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.statistics_tab.low_risk',
          'LOW RISK'
        )
      case 'medium':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.statistics_tab.medium_risk',
          'MEDIUM RISK'
        )
      case 'high':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.statistics_tab.high_risk',
          'HIGH RISK'
        )
      default:
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.statistics_tab.unknown',
          'UNKNOWN'
        )
    }
  }

  const getImpactLevelTranslation = (impactLevel: string) => {
    switch (impactLevel) {
      case 'low':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.statistics_tab.low_impact',
          'LOW IMPACT'
        )
      case 'medium':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.statistics_tab.medium_impact',
          'MEDIUM IMPACT'
        )
      case 'high':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.statistics_tab.high_impact',
          'HIGH IMPACT'
        )
      case 'critical':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.statistics_tab.critical_impact',
          'CRITICAL IMPACT'
        )
      case 'none':
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.statistics_tab.no_impact',
          'NO IMPACT'
        )
      default:
        return getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.statistics_tab.unknown',
          'UNKNOWN'
        )
    }
  }

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) return 'gba:text-foreground'
    if (coverage >= 60) return 'gba:text-muted-foreground'
    return 'gba:text-muted-foreground'
  }

  const getImpactBadgeColor = (impactLevel: string) => {
    switch (impactLevel) {
      case 'none':
        return 'secondary'
      case 'low':
        return 'success'
      case 'medium':
        return 'warning'
      case 'high':
        return 'destructive'
      case 'critical':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const renderMatrixTeamImpactCard = (matrixTeam: any) => (
    <Card
      key={matrixTeam.matrixTeamId}
      className="gba:shadow-sm gba:mb-6"
      data-testid={`matrix-impact-card-${matrixTeam.matrixTeamId}`}
    >
      <div className="gba:p-4">
        {/* Header with matrix team name and current status */}
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h3
              className="gba:text-lg gba:font-semibold gba:text-foreground"
              data-testid={`matrix-team-name-${matrixTeam.matrixTeamId}`}
            >
              {matrixTeam.matrixTeamName}
            </h3>
            <div className="gba:flex gba:items-center gba:gap-3 gba:mt-2">
              <Badge
                variant={
                  matrixTeam.currentRisk === 'high'
                    ? 'destructive'
                    : matrixTeam.currentRisk === 'medium'
                      ? 'secondary'
                      : 'default'
                }
                data-testid={`matrix-team-risk-${matrixTeam.matrixTeamId}`}
              >
                {matrixTeam.currentRisk.toUpperCase()}{' '}
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.risk',
                  'RISK'
                )}
              </Badge>
              <span className={`gba:text-sm gba:font-medium ${getCoverageColor(matrixTeam.currentCoverage)}`}>
                {matrixTeam.currentCoverage}%{' '}
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.coverage',
                  'Coverage'
                )}
              </span>
            </div>
          </div>
          <div className="gba:text-right">
            <div className="gba:text-sm gba:text-muted-foreground">
              {matrixTeam.teamMembers.length}{' '}
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.statistics_tab.total_members',
                'Total Members'
              )}
            </div>
            <div className="gba:text-sm gba:text-muted-foreground">
              {matrixTeam.absentMembers.length}{' '}
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.statistics_tab.currently_absent',
                'Currently Absent'
              )}
            </div>
          </div>
        </div>

        {/* Capabilities Section */}
        {matrixTeam.capabilities && matrixTeam.capabilities.length > 0 && (
          <div className="gba:mb-6">
            <h4
              className="gba:text-md gba:font-semibold gba:text-foreground gba:mb-3"
              data-testid={`matrix-capabilities-title-${matrixTeam.matrixTeamId}`}
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.statistics_tab.team_capabilities',
                'Team Capabilities'
              )}
            </h4>
            <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-3">
              {matrixTeam.capabilities.map((capability: any, idx: number) => (
                <div
                  key={capability.capabilityId ?? `cap-${idx}`}
                  className="gba:border gba:rounded-lg gba:p-3"
                  data-testid={`capability-card-${capability.capabilityId ?? `cap-${idx}`}`}
                >
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                    <h5
                      className="gba:text-sm gba:font-medium gba:text-foreground"
                      data-testid={`capability-name-${capability.capabilityId}`}
                    >
                      {capability.capabilityName}
                    </h5>
                    <Badge
                      variant={
                        capability.risk === 'high'
                          ? 'destructive'
                          : capability.risk === 'medium'
                            ? 'secondary'
                            : 'default'
                      }
                      className="gba:text-xs"
                      data-testid={`capability-risk-${capability.capabilityId}`}
                    >
                      {capability.risk.toUpperCase()}{' '}
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_manager.statistics_tab.risk',
                        'RISK'
                      )}
                    </Badge>
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground gba:mb-2">
                    <span className={`gba:font-medium ${getCoverageColor(capability.coverage)}`}>
                      {capability.coverage}%{' '}
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_manager.statistics_tab.coverage',
                        'Coverage'
                      )}
                    </span>
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground">
                    <div>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.available', 'Available')}:{' '}
                      {capability.teamMembers.length}
                    </div>
                    <div>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_manager.statistics_tab.absent',
                        'Absent'
                      )}
                      : {capability.absentMembers.length}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Impact Scenarios Section */}
        <div>
          <h4
            className="gba:text-md gba:font-semibold gba:text-foreground gba:mb-3"
            data-testid={`impact-scenarios-title-${matrixTeam.matrixTeamId}`}
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.statistics_tab.impact_scenarios',
              'Impact Scenarios'
            )}{' '}
            -{' '}
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.statistics_tab.what_if_someone_is_off',
              'What if someone is off?'
            )}
          </h4>
          <div className="gba:space-y-3">
            {matrixTeam.impactScenarios
              .filter((scenario: any) => scenario.impactLevel !== 'none')
              .sort((a: any, b: any) => {
                const impactOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
                return impactOrder[a.impactLevel] - impactOrder[b.impactLevel]
              })
              .map((scenario: any) => (
                <div
                  key={scenario.employeeId}
                  className="gba:border gba:rounded-lg gba:p-4"
                  data-testid={`impact-scenario-${scenario.employeeId}`}
                >
                  {/* Employee and Overall Impact */}
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                    <div>
                      <h5
                        className="gba:font-medium gba:text-foreground"
                        data-testid={`scenario-employee-${scenario.employeeId}`}
                      >
                        {scenario.employeeName}
                      </h5>
                      <p
                        className="gba:text-sm gba:text-muted-foreground"
                        data-testid={`scenario-description-${scenario.employeeId}`}
                      >
                        {scenario.description}
                      </p>
                    </div>
                    <div className="gba:text-right">
                      <Badge
                        variant={getImpactBadgeColor(scenario.impactLevel)}
                        data-testid={`scenario-impact-level-${scenario.employeeId}`}
                      >
                        {getImpactLevelTranslation(scenario.impactLevel)}
                      </Badge>
                      <div className={`gba:text-sm gba:font-medium gba:mt-1 ${getCoverageColor(scenario.newCoverage)}`}>
                        {scenario.newCoverage}%{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_manager.statistics_tab.coverage',
                          'Coverage'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Capability Impact Details */}
                  {scenario.affectedCapabilities && scenario.affectedCapabilities.length > 0 && (
                    <div className="gba:mt-3">
                      <h6
                        className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-2"
                        data-testid={`capability-impact-title-${scenario.employeeId}`}
                      >
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_manager.statistics_tab.capability_impact',
                          'Capability Impact'
                        )}
                        :
                      </h6>
                      <div className="gba:space-y-2">
                        {scenario.affectedCapabilities
                          .filter((cap: any) => cap.newCoverage < 100)
                          .sort((a: any, b: any) => a.newCoverage - b.newCoverage)
                          .map((capability: any) => (
                            <div
                              key={capability.capabilityId}
                              className="gba:flex gba:items-center gba:justify-between gba:bg-primary-foreground gba:border gba:px-3 gba:py-2 gba:rounded"
                              data-testid={`capability-impact-${capability.capabilityId}`}
                            >
                              <div>
                                <span className="gba:text-sm gba:font-medium gba:text-foreground">
                                  {capability.capabilityName}
                                </span>
                                <div className="gba:text-xs gba:text-muted-foreground">
                                  {capability.impactDescription}
                                </div>
                              </div>
                              <div className="gba:text-right">
                                <Badge
                                  variant={
                                    capability.newRisk === 'high'
                                      ? 'destructive'
                                      : capability.newRisk === 'medium'
                                        ? 'secondary'
                                        : 'default'
                                  }
                                  className="gba:text-xs"
                                  data-testid={`capability-new-risk-${capability.capabilityId}`}
                                >
                                  {capability.newRisk.toUpperCase()}{' '}
                                  {getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:absence_management_hub_manager.statistics_tab.risk',
                                    'RISK'
                                  )}
                                </Badge>
                                <div
                                  className={`gba:text-xs gba:font-medium gba:mt-1 ${getCoverageColor(capability.newCoverage)}`}
                                >
                                  {capability.newCoverage}%
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Backup Options Section */}
                  {scenario.backupOptions && scenario.backupOptions.length > 0 && (
                    <div className="gba:mt-4">
                      <h6
                        className="gba:text-sm gba:font-medium gba:mb-2"
                        data-testid={`backup-options-title-${scenario.employeeId}`}
                      >
                        🎯{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_manager.statistics_tab.backup_options_available',
                          'Backup Options Available'
                        )}
                        :
                      </h6>
                      <div className="gba:space-y-3">
                        {scenario.backupOptions
                          .sort((a: any, b: any) => b.availableMembers.length - a.availableMembers.length) // Sort by number of available members
                          .map((backup: any, index: number) => (
                            <div
                              key={`${backup.matrixTeamId}-${backup.capabilityId}`}
                              className="gba:border gba:rounded-lg gba:p-3"
                              data-testid={`backup-option-${index}`}
                            >
                              <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                                <div>
                                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                                    <span className="gba:text-sm gba:font-semibold">{backup.matrixTeamName}</span>
                                    <Badge variant="success" className="gba:text-xs">
                                      100%{' '}
                                      {getTranslationFromI18nKeyAndLabel(
                                        'lowcoder:absence_management_hub_manager.statistics_tab.coverage',
                                        'Coverage'
                                      )}
                                    </Badge>
                                  </div>
                                  <div className="gba:text-xs gba:mb-1">
                                    {getTranslationFromI18nKeyAndLabel(
                                      'lowcoder:absence_management_hub_manager.statistics_tab.capability',
                                      'Capability'
                                    )}
                                    : <span className="gba:font-medium">{backup.capabilityName}</span>
                                  </div>
                                  <div className="gba:text-xs">{backup.recommendation}</div>
                                </div>
                                <div className="gba:text-right">
                                  <div className="gba:text-sm gba:font-medium">
                                    {backup.availableMembers.length}{' '}
                                    {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.available', 'Available')}
                                  </div>
                                </div>
                              </div>
                              <div className="gba:mt-2">
                                <div className="gba:text-xs gba:mb-1">
                                  {getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:absence_management_hub_manager.statistics_tab.available_team_members',
                                    'Available Team Members'
                                  )}
                                  :
                                </div>
                                <div className="gba:flex gba:flex-wrap gba:gap-1">
                                  {backup.availableMembers.map((member: string, memberIndex: number) => (
                                    <Badge
                                      key={memberIndex}
                                      variant="success"
                                      className="gba:text-xs"
                                      data-testid={`backup-member-${index}-${memberIndex}`}
                                    >
                                      {member}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            {/* Show message if no impact scenarios */}
            {matrixTeam.impactScenarios.filter((scenario: any) => scenario.impactLevel !== 'none').length === 0 && (
              <div
                className="gba:text-center gba:text-muted-foreground gba:py-4"
                data-testid={`no-impact-scenarios-${matrixTeam.matrixTeamId}`}
              >
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.all_team_members_are_currently_absent',
                  'All team members are currently absent - no additional impact scenarios'
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )

  const renderOrgUnitImpactCard = (orgUnit: any) => (
    <Card
      key={orgUnit.orgUnitId}
      className="gba:shadow-sm gba:mb-6"
      data-testid={`org-unit-impact-card-${orgUnit.orgUnitId}`}
    >
      <div className="gba:p-4">
        {/* Header with org unit name and current status */}
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h3
              className="gba:text-lg gba:font-semibold gba:text-foreground"
              data-testid={`org-unit-name-${orgUnit.orgUnitId}`}
            >
              {orgUnit.orgUnitName}
            </h3>
            <div className="gba:flex gba:items-center gba:gap-3 gba:mt-2">
              <Badge variant={getRiskColor(orgUnit.currentRisk)} data-testid={`org-unit-risk-${orgUnit.orgUnitId}`}>
                {getRiskText(orgUnit.currentRisk)}
              </Badge>
              <span className="gba:text-sm gba:text-muted-foreground">
                {orgUnit.teamMembers.length}{' '}
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.members',
                  'members'
                )}
                , {orgUnit.absentMembers.length}{' '}
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.absent_lowercase',
                  'absents'
                )}
              </span>
            </div>
          </div>
          <div className="gba:text-right">
            <div
              className={`gba:text-2xl gba:font-bold ${getCoverageColor(orgUnit.currentCoverage)}`}
              data-testid={`org-unit-coverage-${orgUnit.orgUnitId}`}
            >
              {orgUnit.currentCoverage}%
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.statistics_tab.current_coverage',
                'Current Coverage'
              )}
            </div>
          </div>
        </div>

        {/* Team Members Overview */}
        <div className="gba:mb-4">
          <h4
            className="gba:text-sm gba:font-medium gba:mb-2"
            data-testid={`org-team-members-label-${orgUnit.orgUnitId}`}
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.team_members',
              'Team Members'
            )}
          </h4>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {orgUnit.teamMembers.map((member: string, index: number) => (
              <Badge
                key={index}
                variant={orgUnit.absentMembers.includes(member) ? 'destructive' : 'success'}
                className="gba:text-xs"
                data-testid={`org-team-member-${orgUnit.orgUnitId}-${index}`}
              >
                {member}
              </Badge>
            ))}
          </div>
        </div>

        {/* Impacted Matrix Teams */}
        <div>
          <h4
            className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-3"
            data-testid={`impacted-matrix-teams-label-${orgUnit.orgUnitId}`}
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.statistics_tab.matrix_teams_off',
              'Matrix Teams Impacted When Someone is Off'
            )}
          </h4>
          <div className="gba:space-y-4">
            {orgUnit.impactedMatrixTeams
              .filter((matrixTeam: any) => matrixTeam.orgUnitMembersInMatrix.length > 0)
              .map((matrixTeam: any, index: number) => (
                <div
                  key={matrixTeam.matrixTeamId}
                  className="gba:border gba:rounded-lg gba:p-3"
                  data-testid={`impacted-matrix-team-${orgUnit.orgUnitId}-${index}`}
                >
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span
                        className="gba:font-medium gba:text-foreground"
                        data-testid={`matrix-team-name-${orgUnit.orgUnitId}-${index}`}
                      >
                        {matrixTeam.matrixTeamName}
                      </span>
                      <Badge
                        variant={getRiskColor(matrixTeam.currentMatrixRisk)}
                        data-testid={`matrix-team-risk-${orgUnit.orgUnitId}-${index}`}
                      >
                        {getRiskText(matrixTeam.currentMatrixRisk)}
                      </Badge>
                    </div>
                    <div className="gba:text-right">
                      <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                        {matrixTeam.currentMatrixCoverage}%{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_manager.statistics_tab.coverage',
                          'coverage'
                        )}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground">
                        {matrixTeam.orgUnitMembersInMatrix.length}{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_manager.statistics_tab.members',
                          'members'
                        )}{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_manager.statistics_tab.from_this_org_unit',
                          'from this org unit'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Org Unit Members in this Matrix Team */}
                  <div className="gba:mb-3">
                    <h5 className="gba:text-xs gba:font-medium gba:mb-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_manager.statistics_tab.members_from',
                        'Members from'
                      )}{' '}
                      {orgUnit.orgUnitName}{' '}
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_manager.statistics_tab.in_this_matrix_team',
                        'in this matrix team'
                      )}
                      :
                    </h5>
                    <div className="gba:flex gba:flex-wrap gba:gap-1">
                      {matrixTeam.orgUnitMembersInMatrix.map((member: string, memberIndex: number) => (
                        <Badge
                          key={memberIndex}
                          variant={orgUnit.absentMembers.includes(member) ? 'destructive' : 'success'}
                          className="gba:text-xs"
                          data-testid={`matrix-member-${orgUnit.orgUnitId}-${index}-${memberIndex}`}
                        >
                          {member}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Impact Scenarios for this Matrix Team */}
                  <div>
                    <h5 className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_manager.statistics_tab.impact_if_someone_from',
                        'Impact if someone from'
                      )}{' '}
                      {orgUnit.orgUnitName}{' '}
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_manager.statistics_tab.is_absent',
                        'is absent'
                      )}
                      :
                    </h5>
                    <div className="gba:space-y-2">
                      {matrixTeam.impactScenarios
                        .filter(
                          (scenario: any) =>
                            // Show scenarios with impact OR our special "no impact" message
                            (scenario.impactLevel !== 'none' && orgUnit.teamMembers.includes(scenario.employeeName)) ||
                            scenario.employeeId === 'no-impact'
                        )
                        .sort((a: any, b: any) => {
                          const impactOrder: Record<string, number> = {
                            critical: 0,
                            high: 1,
                            medium: 2,
                            low: 3,
                            none: 4
                          }
                          return impactOrder[a.impactLevel] - impactOrder[b.impactLevel]
                        })
                        .slice(0, 3) // Show top 3 most critical impacts
                        .map((scenario: any, scenarioIndex: number) => (
                          <div
                            key={scenario.employeeId}
                            className="gba:border-l-2 gba:border gba:pl-2"
                            data-testid={`matrix-impact-scenario-${orgUnit.orgUnitId}-${index}-${scenarioIndex}`}
                          >
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <span className="gba:text-sm gba:font-medium gba:text-foreground">
                                {scenario.employeeName}
                              </span>
                              <Badge
                                variant={getImpactBadgeColor(scenario.impactLevel)}
                                data-testid={`matrix-impact-level-${orgUnit.orgUnitId}-${index}-${scenarioIndex}`}
                              >
                                {getImpactLevelTranslation(scenario.impactLevel)}
                              </Badge>
                              <span className="gba:text-xs gba:text-muted-foreground">
                                → {scenario.newMatrixCoverage}%{' '}
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:absence_management_hub_manager.statistics_tab.coverage',
                                  'coverage'
                                )}
                              </span>
                            </div>
                            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{scenario.description}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ))}

            {/* Show message if no impacted matrix teams */}
            {orgUnit.impactedMatrixTeams.filter((matrixTeam: any) => matrixTeam.orgUnitMembersInMatrix.length > 0)
              .length === 0 && (
              <div
                className="gba:text-center gba:text-muted-foreground gba:py-4"
                data-testid={`no-impacted-matrix-teams-${orgUnit.orgUnitId}`}
              >
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.no_team_members_from_this_org_unit',
                  'No team members from this org unit are part of matrix teams'
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="team-coverage-loading">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.statistics_tab.loading_team_coverage_analysis',
          'Loading team coverage analysis...'
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="team-coverage-error">
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.statistics_tab.error', 'Error:')}{' '}
        {error}
      </div>
    )
  }

  return (
    <div className="gba:min-h-screen gba:bg-card" data-testid="team-coverage-optimizer-page">
      {/* Header */}
      <div className="gba:bg-primary-foreground gba:border-b gba:border gba:px-6 gba:py-4">
        <div className="gba:space-y-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={onNavigateBack}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="team-coverage-back-button"
          >
            <PiArrowLeft className="gba:text-lg" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.statistics_tab.back_to_statistics',
              'Back to Statistics'
            )}
          </Button>

          {/* Title and Subtitle */}
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-foreground" data-testid="team-coverage-title">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.statistics_tab.skills_coverage_matrix',
                'Skills Coverage Matrix'
              )}
            </h1>
            <p className="gba:text-muted-foreground gba:mt-1" data-testid="team-coverage-subtitle">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.statistics_tab.current_coverage_levels',
                'Current coverage levels and risk assessment for each skill area'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="gba:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:w-full">
          <div className="gba:flex gba:gap-6 gba:mb-6">
            <Button
              variant={activeTab === 'org-units' ? 'default' : 'outline'}
              onClick={() => setActiveTab('org-units')}
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="org-units-tab-button"
            >
              <PiBuilding className="gba:text-lg" />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.statistics_tab.organizational_units',
                'Organizational Units'
              )}
            </Button>
            <Button
              variant={activeTab === 'matrix' ? 'default' : 'outline'}
              onClick={() => setActiveTab('matrix')}
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="matrix-tab-button"
            >
              <PiGraph className="gba:text-lg" />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.statistics_tab.matrix_teams',
                'Matrix Teams'
              )}
            </Button>
          </div>

          <TabsContent value="org-units" className="gba:space-y-4">
            <div className="gba:mb-4">
              <h2 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="org-units-section-title">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.organizational_units_coverage',
                  'Organizational Units Coverage'
                )}
              </h2>
              <p className="gba:text-muted-foreground gba:mt-1">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.coverage_analysis_by_organizational_unit',
                  'Coverage analysis by organizational unit structure with matrix team impact analysis'
                )}
              </p>
            </div>
            {orgUnitImpacts.length > 0 ? (
              orgUnitImpacts.map(renderOrgUnitImpactCard)
            ) : (
              <div className="gba:text-center gba:text-muted-foreground gba:py-8" data-testid="no-org-units-data">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.no_organizational_unit_coverage_data_available',
                  'No organizational unit coverage data available'
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="matrix" className="gba:space-y-4">
            <div className="gba:mb-4">
              <h2 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="matrix-section-title">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.matrix_teams_coverage',
                  'Matrix Teams Coverage'
                )}
              </h2>
              <p className="gba:text-muted-foreground gba:mt-1">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.coverage_analysis_by_matrix_team_memberships',
                  'Coverage analysis by matrix team memberships with impact scenarios when team members are off'
                )}
              </p>
            </div>
            {matrixTeamImpacts.length > 0 ? (
              matrixTeamImpacts.map(renderMatrixTeamImpactCard)
            ) : (
              <div className="gba:text-center gba:text-muted-foreground gba:py-8" data-testid="no-matrix-data">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.no_matrix_team_coverage_data_available',
                  'No matrix team coverage data available'
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
