import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { GET_TEAM_COVERAGE_DATA } from '../queries/StatisticsQueries'

interface CoverageData {
  id: string
  name: string
  risk: 'low' | 'medium' | 'high'
  primaryResources: string[]
  backupResources: string[]
  coverage: number
  totalPeople: number
  peopleOff: number
}

// New interface for matrix team impact analysis
interface MatrixTeamImpact {
  matrixTeamId: string
  matrixTeamName: string
  currentCoverage: number
  currentRisk: 'low' | 'medium' | 'high'
  teamMembers: string[]
  absentMembers: string[]
  capabilities: {
    capabilityId: string
    capabilityName: string
    teamMembers: string[]
    absentMembers: string[]
    coverage: number
    risk: 'low' | 'medium' | 'high'
  }[]
  impactScenarios: {
    employeeId: string
    employeeName: string
    impactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical'
    newCoverage: number
    newRisk: 'low' | 'medium' | 'high'
    description: string
    affectedCapabilities: {
      capabilityId: string
      capabilityName: string
      newCoverage: number
      newRisk: 'low' | 'medium' | 'high'
      impactDescription: string
    }[]
    backupOptions: {
      matrixTeamId: string
      matrixTeamName: string
      capabilityId: string
      capabilityName: string
      availableMembers: string[]
      coverage: number
      risk: 'low' | 'medium' | 'high'
      recommendation: string
    }[]
  }[]
}

// New interface for org unit impact analysis
interface OrgUnitImpact {
  orgUnitId: string
  orgUnitName: string
  currentCoverage: number
  currentRisk: 'low' | 'medium' | 'high'
  teamMembers: string[]
  absentMembers: string[]
  impactedMatrixTeams: {
    matrixTeamId: string
    matrixTeamName: string
    currentMatrixCoverage: number
    currentMatrixRisk: 'low' | 'medium' | 'high'
    orgUnitMembersInMatrix: string[]
    impactScenarios: {
      employeeId: string
      employeeName: string
      impactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical'
      newMatrixCoverage: number
      newMatrixRisk: 'low' | 'medium' | 'high'
      description: string
    }[]
  }[]
}

interface UseTeamCoverageDataReturn {
  orgUnitCoverage: CoverageData[]
  matrixCoverage: CoverageData[]
  matrixTeamImpacts: MatrixTeamImpact[] // New field for impact analysis
  orgUnitImpacts: OrgUnitImpact[] // New field for org unit impact analysis
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useTeamCoverageData = (context: BusinessAppContextProps): UseTeamCoverageDataReturn => {
  const { accessToken, userInfo } = context
  const supervisorId = userInfo?.employeeDetails?.employeeId
  const structureId = getCurrentActiveStructureId()

  const [orgUnitCoverage] = useState<CoverageData[]>([])
  const [matrixCoverage] = useState<CoverageData[]>([])
  const [matrixTeamImpacts, setMatrixTeamImpacts] = useState<MatrixTeamImpact[]>([])
  const [orgUnitImpacts, setOrgUnitImpacts] = useState<OrgUnitImpact[]>([]) // Initialize new state
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const calculateCoverage = useCallback((totalPeople: number, peopleOff: number): number => {
    if (totalPeople === 0) return 0
    return Math.round(((totalPeople - peopleOff) / totalPeople) * 100)
  }, [])

  const getRiskLevel = useCallback((coverage: number): 'low' | 'medium' | 'high' => {
    if (coverage >= 80) return 'low'
    if (coverage >= 60) return 'medium'
    return 'high'
  }, [])

  const fetchTeamCoverageData = useCallback(async () => {
    if (!supervisorId || !graphqlClient) {
      setError('Supervisor ID or GraphQL client not available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request(GET_TEAM_COVERAGE_DATA, {
        supervisorId,
        structureId: structureId || '',
        hasStructureId: !!structureId
      })

      if (!result) {
        throw new Error('No response from GraphQL query')
      }

      const employees = result.employees || []
      const currentAbsences = result.currentAbsences || []

      // Create set of absent employee IDs for quick lookup
      const absentEmployeeIds = new Set(currentAbsences.map((absence: any) => absence.employee.id))

      // Calculate Organizational Unit Coverage
      const orgUnitMap = new Map<string, { name: string; employees: any[]; absentEmployees: any[] }>()

      employees.forEach((employee: any) => {
        const orgUnit = employee.employeePosition?.organizationalUnit
        if (orgUnit) {
          const key = orgUnit.id
          if (!orgUnitMap.has(key)) {
            orgUnitMap.set(key, { name: orgUnit.name, employees: [], absentEmployees: [] })
          }
          const unit = orgUnitMap.get(key)!
          unit.employees.push(employee)
          if (absentEmployeeIds.has(employee.id)) {
            unit.absentEmployees.push(employee)
          }
        }
      })

      // Calculate Matrix Team Coverage (separate from org units)
      const matrixMap = new Map<string, { name: string; employees: any[]; absentEmployees: any[] }>()

      employees.forEach((employee: any) => {
        const matrixUnits = employee.employeePosition?.matrixUnitEmployees || []
        matrixUnits.forEach((matrixUnit: any) => {
          const key = matrixUnit.matrixUnit.id
          if (!matrixMap.has(key)) {
            matrixMap.set(key, { name: matrixUnit.matrixUnit.name, employees: [], absentEmployees: [] })
          }
          const matrix = matrixMap.get(key)!
          matrix.employees.push(employee)
          if (absentEmployeeIds.has(employee.id)) {
            matrix.absentEmployees.push(employee)
          }
        })
      })

      // Calculate Matrix Team Impact Scenarios
      const matrixTeamImpactData: MatrixTeamImpact[] = Array.from(matrixMap.values()).map(matrix => {
        const currentCoverage = calculateCoverage(matrix.employees.length, matrix.absentEmployees.length)
        const currentRisk = getRiskLevel(currentCoverage)

        // Calculate capabilities for this matrix team
        const capabilityMap = new Map<
          string,
          {
            capabilityId: string
            capabilityName: string
            teamMembers: string[]
            absentMembers: string[]
          }
        >()

        // Collect all capabilities from team members
        matrix.employees.forEach((employee: any) => {
          const employeeName = `${employee.firstName} ${employee.lastName}`
          const isAbsent = absentEmployeeIds.has(employee.id)

          employee.employeePosition?.employeeCapabilities?.forEach((capabilityData: any) => {
            const capabilityId = capabilityData?.capability?.id
            const capabilityName = capabilityData?.capability?.name

            if (capabilityMap && !capabilityMap.has(capabilityId)) {
              capabilityMap.set(capabilityId, {
                capabilityId,
                capabilityName,
                teamMembers: [],
                absentMembers: []
              })
            }

            const capability = capabilityMap.get(capabilityId)!
            if (isAbsent) {
              capability.absentMembers.push(employeeName)
            } else {
              capability.teamMembers.push(employeeName)
            }
          })
        })

        // Calculate coverage and risk for each capability
        const capabilities = Array.from(capabilityMap.values()).map(capability => {
          const totalMembers = capability.teamMembers.length + capability.absentMembers.length
          const coverage = calculateCoverage(totalMembers, capability.absentMembers.length)
          const risk = getRiskLevel(coverage)

          return {
            ...capability,
            coverage,
            risk
          }
        })

        // Calculate impact scenarios for each team member
        const impactScenarios = matrix.employees.map((employee: any) => {
          const employeeName = `${employee.firstName} ${employee.lastName}`
          const isCurrentlyAbsent = absentEmployeeIds.has(employee.id)

          // If employee is already absent, no additional impact
          if (isCurrentlyAbsent) {
            return {
              employeeId: employee.id,
              employeeName,
              impactLevel: 'none' as const,
              newCoverage: currentCoverage,
              newRisk: currentRisk,
              description: getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.statistics_tab.already_absent_no_additional_impact',
                'Already absent - no additional impact'
              ),
              affectedCapabilities: [],
              backupOptions: []
            }
          }

          // Calculate new coverage if this employee were to be absent
          const newAbsentCount = matrix.absentEmployees.length + 1
          const newCoverage = calculateCoverage(matrix.employees.length, newAbsentCount)
          const newRisk = getRiskLevel(newCoverage)

          // Calculate impact on capabilities
          const affectedCapabilities =
            employee.employeePosition?.employeeCapabilities?.map((capabilityData: any) => {
              const capabilityId = capabilityData?.capability?.id
              const capabilityName = capabilityData?.capability?.name
              const currentCapability = capabilities.find(cap => cap.capabilityId === capabilityId)

              if (!currentCapability) {
                return {
                  capabilityId:
                    capabilityId ??
                    getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_manager.statistics_tab.unknown',
                      'Unknown'
                    ),
                  capabilityName:
                    capabilityName ??
                    getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_manager.statistics_tab.unknown',
                      'Unknown'
                    ),
                  newCoverage: 0,
                  newRisk: 'high' as const,
                  impactDescription: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_manager.statistics_tab.no_current_coverage_for_this_capability',
                    'No current coverage for this capability'
                  )
                }
              }

              // Calculate new coverage for this capability
              const newCapabilityAbsentCount = currentCapability.absentMembers.length + 1
              const newCapabilityCoverage = calculateCoverage(
                currentCapability.teamMembers.length + currentCapability.absentMembers.length,
                newCapabilityAbsentCount
              )
              const newCapabilityRisk = getRiskLevel(newCapabilityCoverage)

              let impactDescription = ''
              if (newCapabilityCoverage === 0) {
                impactDescription = getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.critical_no_remaining_coverage_for_this_capability',
                  'Critical: No remaining coverage for this capability'
                )
              } else if (newCapabilityCoverage < 50) {
                impactDescription = getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.high_significant_reduction_in_capability_coverage',
                  'High: Significant reduction in capability coverage'
                )
              } else if (newCapabilityCoverage < 80) {
                impactDescription = getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.medium_reduced_capability_coverage',
                  'Medium: Reduced capability coverage'
                )
              } else {
                impactDescription = getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.low_minimal_impact_on_capability_coverage',
                  'Low: Minimal impact on capability coverage'
                )
              }

              return {
                capabilityId,
                capabilityName,
                newCoverage: newCapabilityCoverage,
                newRisk: newCapabilityRisk,
                impactDescription
              }
            }) || []

          // Determine overall impact level based on coverage change and capability impact
          let impactLevel: 'low' | 'medium' | 'high' | 'critical'
          const criticalCapabilities = affectedCapabilities.filter((cap: any) => cap.newCoverage === 0).length
          const highImpactCapabilities = affectedCapabilities.filter((cap: any) => cap.newCoverage < 50).length

          if (criticalCapabilities > 0) {
            impactLevel = 'critical'
          } else if (highImpactCapabilities > 0 || newCoverage < 40) {
            impactLevel = 'high'
          } else if (newCoverage < 60) {
            impactLevel = 'medium'
          } else {
            impactLevel = 'low'
          }

          // Generate description based on impact
          let description = ''
          if (impactLevel === 'low') {
            description = getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.statistics_tab.minimal_impact_team_can_continue_operations',
              'Minimal impact - team can continue operations'
            )
          } else if (impactLevel === 'medium') {
            description = getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.statistics_tab.moderate_impact_some_tasks_may_be_delayed',
              'Moderate impact - some tasks may be delayed'
            )
          } else if (impactLevel === 'high') {
            description = getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.statistics_tab.high_impact_significant_operational_disruption',
              'High impact - significant operational disruption'
            )
          } else {
            description = getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.statistics_tab.critical_impact_immediate_backup_required',
              'Critical impact - immediate backup required'
            )
          }

          // Find backup options for high-impact scenarios
          const backupOptions: any[] = []
          if (impactLevel === 'high' || impactLevel === 'critical') {
            // For each affected capability, find alternative matrix teams with good coverage
            affectedCapabilities.forEach((affectedCap: any) => {
              if (affectedCap.newCoverage < 80) {
                // Only look for backup if coverage is insufficient
                // Search all other matrix teams for this capability
                Array.from(matrixMap.values()).forEach((otherMatrix: any) => {
                  if (otherMatrix.name !== matrix.name) {
                    // Don't include current matrix
                    // Check if this matrix team has the capability
                    const otherMatrixCapabilityMap = new Map<
                      string,
                      {
                        capabilityId: string
                        capabilityName: string
                        teamMembers: string[]
                        absentMembers: string[]
                      }
                    >()

                    // Collect capabilities from other matrix team
                    otherMatrix.employees.forEach((otherEmployee: any) => {
                      const otherEmployeeName = `${otherEmployee.firstName} ${otherEmployee.lastName}`
                      const isOtherAbsent = absentEmployeeIds.has(otherEmployee.id)

                      otherEmployee.employeePosition?.employeeCapabilities?.forEach((otherCapabilityData: any) => {
                        const otherCapabilityId = otherCapabilityData.capability.id
                        const otherCapabilityName = otherCapabilityData.capability.name

                        if (!otherMatrixCapabilityMap.has(otherCapabilityId)) {
                          otherMatrixCapabilityMap.set(otherCapabilityId, {
                            capabilityId: otherCapabilityId,
                            capabilityName: otherCapabilityName,
                            teamMembers: [],
                            absentMembers: []
                          })
                        }

                        const otherCapability = otherMatrixCapabilityMap.get(otherCapabilityId)!
                        if (isOtherAbsent) {
                          otherCapability.absentMembers.push(otherEmployeeName)
                        } else {
                          otherCapability.teamMembers.push(otherEmployeeName)
                        }
                      })
                    })

                    // Check if this matrix has the needed capability with good coverage
                    const otherCapability = otherMatrixCapabilityMap.get(affectedCap.capabilityId)
                    if (
                      otherCapability &&
                      otherCapability.teamMembers.length >= 2 &&
                      otherCapability.absentMembers.length === 0
                    ) {
                      const backupCoverage = calculateCoverage(
                        otherCapability.teamMembers.length + otherCapability.absentMembers.length,
                        otherCapability.absentMembers.length
                      )
                      const backupRisk = getRiskLevel(backupCoverage)

                      if (backupCoverage === 100 && backupRisk === 'low') {
                        let recommendation = ''
                        if (otherCapability.teamMembers.length >= 3) {
                          recommendation = getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_management_hub_manager.statistics_tab.excellent_backup_option_multiple_available_resources',
                            'Excellent backup option - multiple available resources'
                          )
                        } else {
                          recommendation = getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_management_hub_manager.statistics_tab.good_backup_option_sufficient_coverage_available',
                            'Good backup option - sufficient coverage available'
                          )
                        }

                        backupOptions.push({
                          matrixTeamId: `matrix-${otherMatrix.name}`,
                          matrixTeamName: otherMatrix.name,
                          capabilityId: affectedCap.capabilityId,
                          capabilityName: affectedCap.capabilityName,
                          availableMembers: otherCapability.teamMembers,
                          coverage: backupCoverage,
                          risk: backupRisk,
                          recommendation
                        })
                      }
                    }
                  }
                })
              }
            })
          }

          return {
            employeeId: employee.id,
            employeeName,
            impactLevel,
            newCoverage,
            newRisk,
            description,
            affectedCapabilities,
            backupOptions
          }
        })

        return {
          matrixTeamId: `matrix-${matrix.name}`,
          matrixTeamName: matrix.name,
          currentCoverage,
          currentRisk,
          teamMembers: matrix.employees.map((emp: any) => `${emp.firstName} ${emp.lastName}`),
          absentMembers: matrix.absentEmployees.map((emp: any) => `${emp.firstName} ${emp.lastName}`),
          capabilities,
          impactScenarios
        }
      })

      setMatrixTeamImpacts(matrixTeamImpactData)

      // Calculate Org Unit Impact Scenarios
      const orgUnitImpactData: OrgUnitImpact[] = Array.from(orgUnitMap.values()).map(orgUnit => {
        const currentCoverage = calculateCoverage(orgUnit.employees.length, orgUnit.absentEmployees.length)
        const currentRisk = getRiskLevel(currentCoverage)

        const impactedMatrixTeams: OrgUnitImpact['impactedMatrixTeams'] = Array.from(matrixMap.values()).map(matrix => {
          const orgUnitMembersInMatrix = matrix.employees
            .filter(emp => emp.employeePosition?.organizationalUnit?.name === orgUnit.name)
            .map(emp => `${emp.firstName} ${emp.lastName}`)
          const currentMatrixCoverage = calculateCoverage(matrix.employees.length, matrix.absentEmployees.length)
          const currentMatrixRisk = getRiskLevel(currentMatrixCoverage)

          const impactScenarios: OrgUnitImpact['impactedMatrixTeams'][number]['impactScenarios'] = matrix.employees.map(
            employee => {
              const employeeName = `${employee.firstName} ${employee.lastName}`
              const isCurrentlyAbsent = absentEmployeeIds.has(employee.id)

              if (isCurrentlyAbsent) {
                return {
                  employeeId: employee.id,
                  employeeName,
                  impactLevel: 'none' as const,
                  newMatrixCoverage: currentMatrixCoverage,
                  newMatrixRisk: currentMatrixRisk,
                  description: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_manager.statistics_tab.already_absent_no_additional_impact',
                    'Already absent - no additional impact'
                  )
                }
              }

              const newAbsentCount = matrix.absentEmployees.length + 1
              const newMatrixCoverage = calculateCoverage(matrix.employees.length, newAbsentCount)
              const newMatrixRisk = getRiskLevel(newMatrixCoverage)

              let impactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical'
              if (newMatrixCoverage >= 80) {
                impactLevel = 'low'
              } else if (newMatrixCoverage >= 60) {
                impactLevel = 'medium'
              } else if (newMatrixCoverage >= 40) {
                impactLevel = 'high'
              } else {
                impactLevel = 'critical'
              }

              let description = ''
              if (impactLevel === 'low') {
                description = getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.minimal_impact_team_can_continue_operations',
                  'Minimal impact - team can continue operations'
                )
              } else if (impactLevel === 'medium') {
                description = getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.moderate_impact_some_tasks_may_be_delayed',
                  'Moderate impact - some tasks may be delayed'
                )
              } else if (impactLevel === 'high') {
                description = getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.high_impact_significant_operational_disruption',
                  'High impact - significant operational disruption'
                )
              } else {
                description = getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_manager.statistics_tab.critical_impact_immediate_backup_required',
                  'Critical impact - immediate backup required'
                )
              }

              return {
                employeeId: employee.id,
                employeeName,
                impactLevel,
                newMatrixCoverage,
                newMatrixRisk,
                description
              }
            }
          )

          return {
            matrixTeamId: `matrix-${matrix.name}`,
            matrixTeamName: matrix.name,
            currentMatrixCoverage,
            currentMatrixRisk,
            orgUnitMembersInMatrix,
            impactScenarios
          }
        })

        return {
          orgUnitId: `org-${orgUnit.name}`,
          orgUnitName: orgUnit.name,
          currentCoverage,
          currentRisk,
          teamMembers: orgUnit.employees.map((emp: any) => `${emp.firstName} ${emp.lastName}`),
          absentMembers: orgUnit.absentEmployees.map((emp: any) => `${emp.firstName} ${emp.lastName}`),
          impactedMatrixTeams
        }
      })

      setOrgUnitImpacts(orgUnitImpactData)
    } catch (err) {
      console.error('Error fetching team coverage data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch team coverage data')
    } finally {
      setIsLoading(false)
    }
  }, [supervisorId, structureId, graphqlClient, calculateCoverage, getRiskLevel])

  useEffect(() => {
    if (accessToken && supervisorId) {
      fetchTeamCoverageData()
    }
  }, [accessToken, supervisorId, structureId, fetchTeamCoverageData])

  return {
    orgUnitCoverage,
    matrixCoverage,
    matrixTeamImpacts,
    orgUnitImpacts, // Add orgUnitImpacts to return
    isLoading,
    error,
    refetch: fetchTeamCoverageData
  }
}
