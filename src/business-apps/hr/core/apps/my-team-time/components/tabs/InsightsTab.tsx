import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
import {
  PiWarning,
  PiHeartbeat,
  PiShieldCheck,
  PiTimer,
  PiScales,
  PiSunHorizon,
  PiCalendarCheck,
  PiClockClockwise,
  PiUsersThree,
  PiArrowRight
} from 'react-icons/pi'
import { DataDetailsDrawer } from '@/components/data-details/DataDetailsDrawer'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTeamMembers } from '../../hooks/useTeamMembers'
import { useTeamCapacity } from '../../hooks/useTeamCapacity'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_ENTITLEMENTS, GET_TEAM_COVERAGE } from '../../queries/queries'
import {
  SustainabilitySignal,
  ComplianceAlert,
  BurnoutRisk,
  CapacityRow,
  WeeklyWorkingHours,
  CoverageRisk,
  ImpactLevel,
  CapabilityCoverage,
  MatrixTeamCoverage,
  MatrixImpactScenario,
  OrgUnitCoverage,
  CoverageOverview
} from '../../types/types'
import { formatMinutes, toDateString, getPlannedMinutesForDate } from '../../utils/timeUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AbsenceDistributionSection } from '../../../../../absences/apps/manager-absences/components/tabs/statistics-tab/AbsenceDistributionSection'
import { UsagePatternsSection } from '../../../../../absences/apps/manager-absences/components/tabs/statistics-tab/UsagePatternsSection'
import { AbsenceTrendsSection } from '../../../../../absences/apps/manager-absences/components/tabs/statistics-tab/AbsenceTrendsSection'
import { YearComparisonSection } from '../../../../../absences/apps/manager-absences/components/tabs/statistics-tab/YearComparisonSection'
import { useAbsenceStatisticsSimple } from '../../../../../absences/apps/manager-absences/hooks/useAbsenceStatisticsSimple'

const t = (key: string, fallback: string, vars?: Record<string, unknown>) =>
  getTranslationFromI18nKeyAndLabel(`lowcoder:my_team_time.insights.${key}`, fallback, vars)

const DAILY_HOURS_BUFFER_RATIO = 1.15
const OVERTIME_WARNING_RATIO = 0.06
const OVERTIME_LEGAL_CAP_RATIO = 0.25
const BALANCE_EPSILON = 0.01
const MISSING_ENTRIES_WARNING_RATIO = 0.25
const MISSING_ENTRIES_CRITICAL_RATIO = 0.5

const getEmployeeSchedule = (wh?: WeeklyWorkingHours) => {
  if (!wh) return { dailyMinutes: 480, workingDaysPerWeek: 5, weeklyMinutes: 2400 }
  const days = [
    wh.mondayHours,
    wh.tuesdayHours,
    wh.wednesdayHours,
    wh.thursdayHours,
    wh.fridayHours,
    wh.saturdayHours,
    wh.sundayHours
  ]
  const workingDays = days.filter(h => h > 0)
  const weeklyMinutes = days.reduce((s, h) => s + (h || 0), 0) * 60
  const workingDaysPerWeek = workingDays.length || 5
  const dailyMinutes = workingDaysPerWeek > 0 ? weeklyMinutes / workingDaysPerWeek : 480
  return { dailyMinutes, workingDaysPerWeek, weeklyMinutes }
}

const countWorkingDaysSoFar = (workingHours?: WeeklyWorkingHours): number => {
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  let count = 0
  const cursor = new Date(monthStart)
  while (cursor <= today) {
    if (getPlannedMinutesForDate(toDateString(cursor), workingHours) > 0) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return Math.max(1, count)
}

// ─── KPI computation ──────────────────────────────────────────────────────────

interface KpiData {
  overtimeLoadRatio: number
  timeLoadBalanceIndex: number
  ptoHealthIndex: number | null
  absenceStabilityRate: number
  attendanceReliabilityRate: number
}

const computeKpis = (
  rows: CapacityRow[],
  entitlements: { employeeId: string; typeRef: string; totalEntitlement: number; usedApproved: number }[],
  workingDaysMap: Map<string, number>
): KpiData => {
  let totalWorked = 0
  let totalOvertime = 0
  let totalSickDays = 0
  let totalScheduledDays = 0
  let totalPtoAndSick = 0
  let totalMissing = 0
  const overtimes: number[] = []

  for (const r of rows) {
    totalWorked += r.workedMinutes
    totalOvertime += r.overtimeMinutes
    totalSickDays += r.sickDays
    totalPtoAndSick += r.ptoUsedDays + r.sickDays
    totalMissing += r.missingEntries
    overtimes.push(r.overtimeMinutes)
    totalScheduledDays += workingDaysMap.get(r.employee.id) ?? countWorkingDaysSoFar(r.employee.workingHours)
  }

  const overtimeLoadRatio = totalWorked > 0 ? (totalOvertime / totalWorked) * 100 : 0

  const meanOT = overtimes.length > 0 ? overtimes.reduce((s, v) => s + v, 0) / overtimes.length : 0
  let stddevOT = 0
  if (overtimes.length > 1) {
    const variance = overtimes.reduce((s, v) => s + (v - meanOT) ** 2, 0) / overtimes.length
    stddevOT = Math.sqrt(variance)
  }
  const timeLoadBalanceIndex =
    meanOT + BALANCE_EPSILON > 0 ? Math.max(0, Math.min(1, 1 - stddevOT / (meanOT + BALANCE_EPSILON))) * 100 : 100

  const vacationEntitlements = entitlements.filter(e => {
    const tr = (e.typeRef || '').toUpperCase()
    return tr.includes('VACATION') || tr.includes('HOLIDAY') || tr.includes('ANNUAL')
  })
  let ptoHealthIndex: number | null = null
  if (vacationEntitlements.length > 0) {
    const totalAccrued = vacationEntitlements.reduce((s, e) => s + (e.totalEntitlement || 0), 0)
    const totalUsed = vacationEntitlements.reduce((s, e) => s + (e.usedApproved || 0), 0)
    if (totalAccrued > 0) {
      const now = new Date()
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const endOfYear = new Date(now.getFullYear(), 11, 31)
      const totalDaysInYear = (endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) + 1
      const daysElapsed = (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) + 1
      const yearProgress = daysElapsed / totalDaysInYear
      const expectedUsage = totalAccrued * yearProgress
      ptoHealthIndex = expectedUsage > 0 ? Math.min(100, (totalUsed / expectedUsage) * 100) : 0
    }
  }

  const absenceStabilityRate =
    totalScheduledDays > 0 ? Math.max(0, (1 - totalSickDays / totalScheduledDays) * 100) : 100

  const totalExpected = totalScheduledDays - totalPtoAndSick
  const validLogged = Math.max(0, totalExpected - totalMissing)
  const attendanceReliabilityRate = totalExpected > 0 ? Math.min(100, (validLogged / totalExpected) * 100) : 100

  return { overtimeLoadRatio, timeLoadBalanceIndex, ptoHealthIndex, absenceStabilityRate, attendanceReliabilityRate }
}

const getKpiColor = (
  value: number,
  thresholds: { good: number; warn: number; direction: 'higher' | 'lower' }
): string => {
  if (thresholds.direction === 'higher') {
    if (value >= thresholds.good) return 'var(--nw-success)'
    if (value >= thresholds.warn) return 'var(--nw-warning)'
    return 'var(--nw-destructive)'
  }
  if (value <= thresholds.good) return 'var(--nw-success)'
  if (value <= thresholds.warn) return 'var(--nw-warning)'
  return 'var(--nw-destructive)'
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

interface InsightKpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subtitle: string
  color: string
}

const InsightKpiCard: React.FC<InsightKpiCardProps> = ({ icon, label, value, subtitle, color }) => (
  <Card
    className="gba:shadow-sm gba:border gba:border-border"
    data-testid={`insight-kpi-${label.toLowerCase().replaceAll(/\s+/g, '-')}`}
  >
    <CardContent className="gba:p-3">
      <div className="gba:flex gba:items-center gba:gap-2.5">
        <div
          className="gba:w-8 gba:h-8 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:text-base gba:flex-shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
        >
          {icon}
        </div>
        <div className="gba:min-w-0">
          <div className="gba:text-xl gba:font-bold gba:leading-tight" style={{ color }}>
            {value}
          </div>
          <div className="gba:text-[11px] gba:text-muted-foreground gba:leading-tight gba:truncate">{label}</div>
        </div>
      </div>
      <div className="gba:text-[10px] gba:text-muted-foreground gba:mt-1.5 gba:leading-snug">{subtitle}</div>
    </CardContent>
  </Card>
)

// ─── Badge helpers ─────────────────────────────────────────────────────────────

const getRiskBadge = (risk: BurnoutRisk) => {
  switch (risk) {
    case 'high':
      return <Badge variant="destructive">{t('high', 'High')}</Badge>
    case 'medium':
      return <Badge variant="warning">{t('medium', 'Medium')}</Badge>
    case 'low':
      return <Badge variant="success">{t('low', 'Low')}</Badge>
  }
}

const getSeverityBadge = (severity: 'warning' | 'critical') => {
  if (severity === 'critical') return <Badge variant="destructive">{t('critical', 'Critical')}</Badge>
  return <Badge variant="warning">{t('warning_label', 'Warning')}</Badge>
}

const getImpactBadge = (level: string) => {
  switch (level) {
    case 'critical':
      return <Badge variant="destructive">{t('critical', 'Critical')}</Badge>
    case 'high':
      return <Badge variant="destructive">{t('high', 'High')}</Badge>
    case 'medium':
      return <Badge variant="warning">{t('medium', 'Medium')}</Badge>
    case 'low':
      return <Badge variant="success">{t('low', 'Low')}</Badge>
    default:
      return <Badge variant="secondary">{t('none', 'None')}</Badge>
  }
}

// ─── Coverage computation helpers (module-level to avoid deep nesting) ─────────

const calcCoverage = (total: number, off: number): number =>
  total === 0 ? 0 : Math.round(((total - off) / total) * 100)

const calcCoverageRisk = (cov: number): CoverageRisk => {
  if (cov >= 80) return 'low'
  if (cov >= 60) return 'medium'
  return 'high'
}

const calcImpactLevel = (cov: number): ImpactLevel => {
  if (cov >= 80) return 'low'
  if (cov >= 60) return 'medium'
  if (cov >= 40) return 'high'
  return 'critical'
}

const impactDesc = (lvl: ImpactLevel): string => {
  if (lvl === 'critical') return t('impact_critical', 'Critical impact - immediate backup required')
  if (lvl === 'high') return t('impact_high', 'High impact - significant operational disruption')
  if (lvl === 'medium') return t('impact_medium', 'Moderate impact - some tasks may be delayed')
  return t('impact_low', 'Minimal impact - team can continue operations')
}

const IMPACT_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, none: 4 }

const getCoverageRiskColor = (risk: CoverageRisk): string => {
  if (risk === 'high') return 'var(--nw-destructive)'
  if (risk === 'medium') return 'var(--nw-warning)'
  return 'var(--nw-success)'
}

type CapEntry = { id: string; name: string; holders: string[]; absentHolders: string[] }

const buildCapabilityMap = (employees: any[], absentIds: Set<string>): Map<string, CapEntry> => {
  const capMap = new Map<string, CapEntry>()
  employees.forEach((emp: any) => {
    const empName = `${emp.firstName} ${emp.lastName}`
    const isAbsent = absentIds.has(emp.id)
    ;(emp.employeePosition?.employeeCapabilities || []).forEach((cd: any) => {
      const cId = cd?.capability?.id
      const cName = cd?.capability?.name
      if (!cId) return
      if (!capMap.has(cId)) capMap.set(cId, { id: cId, name: cName, holders: [], absentHolders: [] })
      const c = capMap.get(cId)!
      if (isAbsent) c.absentHolders.push(empName)
      else c.holders.push(empName)
    })
  })
  return capMap
}

const buildCapabilities = (capMap: Map<string, CapEntry>): CapabilityCoverage[] =>
  Array.from(capMap.values()).map(c => {
    const total = c.holders.length + c.absentHolders.length
    const cov = calcCoverage(total, c.absentHolders.length)
    return {
      capabilityId: c.id,
      capabilityName: c.name,
      totalMembers: total,
      absentMembers: c.absentHolders.length,
      coverage: cov,
      risk: calcCoverageRisk(cov),
      holders: c.holders,
      absentHolders: c.absentHolders
    }
  })

const buildMatrixImpactScenarios = (
  employees: any[],
  absentEmployees: any[],
  capabilities: CapabilityCoverage[],
  absentIds: Set<string>
): MatrixImpactScenario[] => {
  const mCov = calcCoverage(employees.length, absentEmployees.length)
  const mRisk = calcCoverageRisk(mCov)

  return employees
    .map((emp: any) => {
      const empName = `${emp.firstName} ${emp.lastName}`
      if (absentIds.has(emp.id)) {
        return {
          employeeId: emp.id,
          employeeName: empName,
          impactLevel: 'none' as ImpactLevel,
          newCoverage: mCov,
          newRisk: mRisk,
          description: t('already_absent', 'Already absent - no additional impact'),
          affectedCapabilities: []
        }
      }

      const newTeamCov = calcCoverage(employees.length, absentEmployees.length + 1)
      const newTeamRisk = calcCoverageRisk(newTeamCov)

      const affectedCaps = (emp.employeePosition?.employeeCapabilities || []).map((cd: any) => {
        const cId = cd?.capability?.id
        const cName = cd?.capability?.name || t('unknown', 'Unknown')
        const cap = capabilities.find(cc => cc.capabilityId === cId)
        if (!cap) return { capabilityName: cName, newCoverage: 0, newRisk: 'high' as CoverageRisk }
        const newCov = calcCoverage(cap.totalMembers, cap.absentMembers + 1)
        return {
          capabilityName: cName,
          newCoverage: Math.max(0, newCov),
          newRisk: calcCoverageRisk(Math.max(0, newCov))
        }
      })

      const critCaps = affectedCaps.filter((a: any) => a.newCoverage === 0).length
      const highCaps = affectedCaps.filter((a: any) => a.newCoverage > 0 && a.newCoverage < 50).length
      let impactLevel: ImpactLevel = 'low'
      if (critCaps > 0) impactLevel = 'critical'
      else if (highCaps > 0 || newTeamCov < 40) impactLevel = 'high'
      else if (newTeamCov < 60) impactLevel = 'medium'

      return {
        employeeId: emp.id,
        employeeName: empName,
        impactLevel,
        newCoverage: newTeamCov,
        newRisk: newTeamRisk,
        description: impactDesc(impactLevel),
        affectedCapabilities: affectedCaps
      }
    })
    .filter(s => s.impactLevel !== 'none')
    .sort((a, b) => (IMPACT_ORDER[a.impactLevel] ?? 3) - (IMPACT_ORDER[b.impactLevel] ?? 3))
}

const parseCoverageResult = (result: any): CoverageOverview => {
  const employees: any[] = result?.employees || []
  const currentAbsences: any[] = result?.currentAbsences || []
  const absentIds = new Set(currentAbsences.map((a: any) => a.employee.id))

  const orgUnitMap = new Map<string, { id: string; name: string; employees: any[]; absentEmployees: any[] }>()
  employees.forEach((emp: any) => {
    const ou = emp.employeePosition?.organizationalUnit
    if (!ou) return
    if (!orgUnitMap.has(ou.id)) orgUnitMap.set(ou.id, { id: ou.id, name: ou.name, employees: [], absentEmployees: [] })
    const unit = orgUnitMap.get(ou.id)!
    unit.employees.push(emp)
    if (absentIds.has(emp.id)) unit.absentEmployees.push(emp)
  })

  const matrixMap = new Map<string, { id: string; name: string; employees: any[]; absentEmployees: any[] }>()
  employees.forEach((emp: any) => {
    const matrixUnits: any[] = emp.employeePosition?.matrixUnitEmployees || []
    matrixUnits.forEach((mu: any) => {
      const key = mu.matrixUnit.id
      if (!matrixMap.has(key))
        matrixMap.set(key, { id: key, name: mu.matrixUnit.name, employees: [], absentEmployees: [] })
      const m = matrixMap.get(key)!
      m.employees.push(emp)
      if (absentIds.has(emp.id)) m.absentEmployees.push(emp)
    })
  })

  const matrixTeams: MatrixTeamCoverage[] = Array.from(matrixMap.values()).map(matrix => {
    const capMap = buildCapabilityMap(matrix.employees, absentIds)
    const capabilities = buildCapabilities(capMap)
    const mCov = calcCoverage(matrix.employees.length, matrix.absentEmployees.length)
    const impactScenarios = buildMatrixImpactScenarios(
      matrix.employees,
      matrix.absentEmployees,
      capabilities,
      absentIds
    )
    return {
      id: matrix.id,
      name: matrix.name,
      totalMembers: matrix.employees.length,
      absentCount: matrix.absentEmployees.length,
      coverage: mCov,
      risk: calcCoverageRisk(mCov),
      members: matrix.employees.map((e: any) => `${e.firstName} ${e.lastName}`),
      absentMembers: matrix.absentEmployees.map((e: any) => `${e.firstName} ${e.lastName}`),
      capabilities: capabilities.toSorted((a, b) => a.coverage - b.coverage),
      impactScenarios
    }
  })

  const orgUnits: OrgUnitCoverage[] = Array.from(orgUnitMap.values()).map(ou => {
    const ouCov = calcCoverage(ou.employees.length, ou.absentEmployees.length)
    const impactedMatrixTeams = Array.from(matrixMap.values())
      .map(matrix => {
        const orgMembersInMatrix = matrix.employees
          .filter((e: any) => e.employeePosition?.organizationalUnit?.id === ou.id)
          .map((e: any) => `${e.firstName} ${e.lastName}`)
        if (orgMembersInMatrix.length === 0) return null
        const matrixCov = calcCoverage(matrix.employees.length, matrix.absentEmployees.length)
        const impactScenarios = matrix.employees
          .filter((e: any) => e.employeePosition?.organizationalUnit?.id === ou.id && !absentIds.has(e.id))
          .map((emp: any) => {
            const newCov = calcCoverage(matrix.employees.length, matrix.absentEmployees.length + 1)
            const il = calcImpactLevel(newCov)
            return {
              employeeName: `${emp.firstName} ${emp.lastName}`,
              impactLevel: il,
              newCoverage: newCov,
              description: impactDesc(il)
            }
          })
          .filter(s => s.impactLevel !== 'low')
          .sort((a, b) => (IMPACT_ORDER[a.impactLevel] ?? 4) - (IMPACT_ORDER[b.impactLevel] ?? 4))
        return {
          matrixTeamName: matrix.name,
          coverage: matrixCov,
          risk: calcCoverageRisk(matrixCov),
          orgUnitMembersInMatrix: orgMembersInMatrix,
          impactScenarios
        }
      })
      .filter(Boolean) as OrgUnitCoverage['impactedMatrixTeams']
    return {
      id: ou.id,
      name: ou.name,
      totalMembers: ou.employees.length,
      absentCount: ou.absentEmployees.length,
      coverage: ouCov,
      risk: calcCoverageRisk(ouCov),
      members: ou.employees.map((e: any) => `${e.firstName} ${e.lastName}`),
      absentMembers: ou.absentEmployees.map((e: any) => `${e.firstName} ${e.lastName}`),
      impactedMatrixTeams
    }
  })

  const allCapsFlat = matrixTeams.flatMap(mt => mt.capabilities)
  const uniqueCaps = new Map<string, CapabilityCoverage>()
  allCapsFlat.forEach(c => {
    if (!uniqueCaps.has(c.capabilityId)) uniqueCaps.set(c.capabilityId, c)
  })
  const atRisk = Array.from(uniqueCaps.values()).filter(c => c.risk !== 'low').length
  const avgCov =
    uniqueCaps.size > 0
      ? Math.round(Array.from(uniqueCaps.values()).reduce((s, c) => s + c.coverage, 0) / uniqueCaps.size)
      : 100
  const highImpactCount = matrixTeams.reduce(
    (s, mt) => s + mt.impactScenarios.filter(sc => sc.impactLevel === 'critical' || sc.impactLevel === 'high').length,
    0
  )

  return {
    totalCapabilities: new Set(matrixTeams.flatMap(mt => mt.capabilities.map(c => c.capabilityId))).size,
    atRiskCapabilities: atRisk,
    avgCoverage: avgCov,
    overallRisk: calcCoverageRisk(avgCov),
    orgUnits,
    matrixTeams,
    highImpactCount
  }
}

// ─── Sustainability & compliance computations (module-level to reduce component complexity) ─

const computeSustainabilitySignals = (
  rows: CapacityRow[],
  workingDaysMap: Map<string, number>
): SustainabilitySignal[] =>
  rows
    .map(row => {
      const signals: string[] = []
      let riskLevel: BurnoutRisk = 'low'

      const schedule = getEmployeeSchedule(row.employee.workingHours)
      const dailyThreshold = Math.round(schedule.dailyMinutes * DAILY_HOURS_BUFFER_RATIO)
      const overtimeWarning = Math.round(row.contractTargetMinutes * OVERTIME_WARNING_RATIO)

      const workingDaysSoFar = workingDaysMap.get(row.employee.id) ?? countWorkingDaysSoFar(row.employee.workingHours)
      const avgDailyMinutes = row.workedMinutes / workingDaysSoFar

      if (avgDailyMinutes > dailyThreshold) {
        signals.push(
          t('avg_daily_detail', 'Avg daily: {{avgDaily}} (planned: {{planned}}/day)', {
            avgDaily: formatMinutes(avgDailyMinutes),
            planned: formatMinutes(schedule.dailyMinutes)
          })
        )
        riskLevel = 'medium'
      }
      if (row.overtimeMinutes > overtimeWarning) {
        signals.push(
          t('overtime_detail', 'Overtime: {{overtime}} (>{{threshold}}% of target)', {
            overtime: formatMinutes(row.overtimeMinutes),
            threshold: Math.round(OVERTIME_WARNING_RATIO * 100)
          })
        )
        riskLevel = riskLevel === 'medium' ? 'high' : 'medium'
      }
      if (row.ptoUsedDays === 0) signals.push(t('no_pto_month', 'No PTO taken this month'))
      if (row.missingEntries > 3)
        signals.push(t('missing_entries_count', '{{count}} missing time entries', { count: row.missingEntries }))

      return {
        employeeId: row.employee.id,
        employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
        riskLevel,
        signals,
        avgDailyMinutes,
        overtimeTrend: (row.overtimeMinutes > overtimeWarning ? 'increasing' : 'stable') as
          | 'increasing'
          | 'stable'
          | 'decreasing',
        daysSinceLastPTO: null
      }
    })
    .filter(s => s.signals.length > 0)
    .toSorted((a, b) => {
      const order: Record<BurnoutRisk, number> = { high: 0, medium: 1, low: 2 }
      return order[a.riskLevel] - order[b.riskLevel]
    })

const computeComplianceAlerts = (rows: CapacityRow[], workingDaysMap: Map<string, number>): ComplianceAlert[] => {
  const alerts: ComplianceAlert[] = []
  rows.forEach(row => {
    const name = `${row.employee.firstName} ${row.employee.lastName}`
    const target = row.contractTargetMinutes
    const overtimeCap = Math.round(target * OVERTIME_LEGAL_CAP_RATIO)
    const overtimeWarnThreshold = Math.round(target * OVERTIME_WARNING_RATIO)

    if (row.overtimeMinutes > overtimeCap) {
      alerts.push({
        employeeId: row.employee.id,
        employeeName: name,
        type: 'overtime_cap',
        severity: 'critical',
        description: t(
          'overtime_exceeds',
          'Overtime ({{overtime}}) exceeds {{threshold}}% of monthly target ({{cap}})',
          {
            overtime: formatMinutes(row.overtimeMinutes),
            threshold: Math.round(OVERTIME_LEGAL_CAP_RATIO * 100),
            cap: formatMinutes(overtimeCap)
          }
        ),
        recommendation: t('reduce_workload', 'Reduce workload immediately and review scheduling')
      })
    } else if (row.overtimeMinutes > overtimeWarnThreshold) {
      alerts.push({
        employeeId: row.employee.id,
        employeeName: name,
        type: 'overtime_cap',
        severity: 'warning',
        description: t(
          'overtime_approaching',
          'Overtime approaching limit: {{overtime}} of {{cap}} ({{threshold}}% of target)',
          {
            overtime: formatMinutes(row.overtimeMinutes),
            cap: formatMinutes(overtimeCap),
            threshold: Math.round(OVERTIME_LEGAL_CAP_RATIO * 100)
          }
        ),
        recommendation: t('monitor_closely', 'Monitor closely and plan workload reduction')
      })
    }

    const schedule = getEmployeeSchedule(row.employee.workingHours)
    const expectedWorkingDays = workingDaysMap.get(row.employee.id) ?? countWorkingDaysSoFar(row.employee.workingHours)
    const missingWarningThreshold = Math.max(3, Math.round(expectedWorkingDays * MISSING_ENTRIES_WARNING_RATIO))
    const missingCriticalThreshold = Math.max(5, Math.round(expectedWorkingDays * MISSING_ENTRIES_CRITICAL_RATIO))

    if (row.missingEntries > missingWarningThreshold) {
      alerts.push({
        employeeId: row.employee.id,
        employeeName: name,
        type: 'missing_logs',
        severity: row.missingEntries > missingCriticalThreshold ? 'critical' : 'warning',
        description: t(
          'missing_days_detail',
          '{{missing}} of {{expected}} working days without time entry (contract: {{contract}}/week)',
          {
            missing: row.missingEntries,
            expected: expectedWorkingDays,
            contract: formatMinutes(schedule.weeklyMinutes)
          }
        ),
        recommendation: t('submit_entries', 'Request employee to submit missing time entries')
      })
    }
  })
  return alerts.toSorted((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1
    if (a.severity !== 'critical' && b.severity === 'critical') return 1
    return 0
  })
}

// ─── Main component ────────────────────────────────────────────────────────────

type DrawerPanel = 'sustainability' | 'compliance' | 'coverage' | null

export const InsightsTab: React.FC<BusinessAppContextProps> = props => {
  const { members, memberIds, isLoading: membersLoading } = useTeamMembers(props)
  const graphqlClient = useGraphQLClient(props.accessToken)
  const { rows, isLoading: capacityLoading, error } = useTeamCapacity(props.accessToken, members, memberIds)
  const { statistics: absenceStatistics } = useAbsenceStatisticsSimple(props)

  const [entitlements, setEntitlements] = useState<
    { employeeId: string; typeRef: string; totalEntitlement: number; usedApproved: number }[]
  >([])
  const [coverageData, setCoverageData] = useState<CoverageOverview | null>(null)
  const [coverageLoading, setCoverageLoading] = useState(true)
  const [activeDrawer, setActiveDrawer] = useState<DrawerPanel>(null)

  const memberIdsRef = useRef<string[]>([])
  if (memberIds.length > 0 && memberIds.join(',') !== memberIdsRef.current.join(',')) {
    memberIdsRef.current = memberIds
  }
  const stableMemberIds = memberIdsRef.current

  useEffect(() => {
    if (!graphqlClient || stableMemberIds.length === 0) return
    const todayStr = toDateString(new Date())
    graphqlClient
      .request<any>(GET_TEAM_ENTITLEMENTS, { employeeIds: stableMemberIds, today: todayStr })
      .then(res => {
        setEntitlements(
          (res?.EntitlementUsageSnapshotView ?? []).map((r: any) => ({
            employeeId: r.employeeId,
            typeRef: r.typeRef,
            totalEntitlement: Number(r.totalEntitlement) || 0,
            usedApproved: Number(r.usedApproved) || 0
          }))
        )
      })
      .catch(() => {})
  }, [graphqlClient, stableMemberIds])

  const supervisorId = props.userInfo?.employeeDetails?.employeeId

  useEffect(() => {
    if (!graphqlClient || !supervisorId) {
      setCoverageLoading(false)
      return
    }
    setCoverageLoading(true)
    graphqlClient
      .request<any>(GET_TEAM_COVERAGE, { supervisorId })
      .then(result => setCoverageData(parseCoverageResult(result)))
      .catch(() => setCoverageData(null))
      .finally(() => setCoverageLoading(false))
  }, [graphqlClient, supervisorId])

  const isLoading = membersLoading || capacityLoading

  const workingDaysMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of rows) {
      map.set(row.employee.id, countWorkingDaysSoFar(row.employee.workingHours))
    }
    return map
  }, [rows])

  const kpis = useMemo(() => computeKpis(rows, entitlements, workingDaysMap), [rows, entitlements, workingDaysMap])

  // ── Sustainability signals & compliance alerts ──────────────────────────────

  const sustainabilitySignals = useMemo(
    () => computeSustainabilitySignals(rows, workingDaysMap),
    [rows, workingDaysMap]
  )

  const complianceAlerts = useMemo(() => computeComplianceAlerts(rows, workingDaysMap), [rows, workingDaysMap])

  // ── Memoized coverage card data ────────────────────────────────────────────

  const atRiskCapabilities = useMemo(() => {
    if (!coverageData) return []
    return coverageData.matrixTeams
      .flatMap(mt => mt.capabilities)
      .filter((c, i, arr) => c.risk !== 'low' && arr.findIndex(x => x.capabilityId === c.capabilityId) === i)
      .toSorted((a, b) => a.coverage - b.coverage)
      .slice(0, 2)
  }, [coverageData])

  // ── Drawer helpers ──────────────────────────────────────────────────────────

  const toggleDrawer = useCallback((panel: DrawerPanel) => setActiveDrawer(prev => (prev === panel ? null : panel)), [])

  const getDrawerTitle = (): string => {
    switch (activeDrawer) {
      case 'sustainability':
        return t('sustainability_signals_title', 'Sustainability & Burnout Signals')
      case 'compliance':
        return t('compliance_monitor', 'Compliance Monitor')
      case 'coverage':
        return t('skills_coverage_details', 'Skills Coverage Details')
      default:
        return ''
    }
  }

  const getDrawerIcon = (): React.ReactNode => {
    switch (activeDrawer) {
      case 'sustainability':
        return <PiHeartbeat />
      case 'compliance':
        return <PiShieldCheck />
      case 'coverage':
        return <PiUsersThree />
      default:
        return null
    }
  }

  // ── Loading / error ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
      </div>
    )
  }

  if (error) {
    return <div className="gba:text-center gba:py-12 gba:text-destructive">{error}</div>
  }

  // ── Summary counts for overview cards ───────────────────────────────────────

  const highRiskSignals = sustainabilitySignals.filter(s => s.riskLevel === 'high').length
  const mediumRiskSignals = sustainabilitySignals.filter(s => s.riskLevel === 'medium').length
  const criticalAlerts = complianceAlerts.filter(a => a.severity === 'critical').length
  const warningAlerts = complianceAlerts.filter(a => a.severity === 'warning').length

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="gba:space-y-6" data-testid="my-team-time-insights">
      {/* KPI Cards Row */}
      <div className="gba:grid gba:grid-cols-5 gba:gap-3" data-testid="insights-kpis">
        <InsightKpiCard
          icon={<PiTimer />}
          label={t('overtime_load_ratio', 'Overtime Load Ratio')}
          value={`${kpis.overtimeLoadRatio.toFixed(1)}%`}
          subtitle={t('overtime_vs_worked', 'Overtime vs total worked time')}
          color={getKpiColor(kpis.overtimeLoadRatio, { good: 5, warn: 15, direction: 'lower' })}
        />
        <InsightKpiCard
          icon={<PiScales />}
          label={t('time_load_balance', 'Time Load Balance')}
          value={`${kpis.timeLoadBalanceIndex.toFixed(0)}%`}
          subtitle={t('overtime_fairness', 'Overtime distribution fairness')}
          color={getKpiColor(kpis.timeLoadBalanceIndex, { good: 70, warn: 40, direction: 'higher' })}
        />
        <InsightKpiCard
          icon={<PiSunHorizon />}
          label={t('pto_health', 'PTO Health Index')}
          value={kpis.ptoHealthIndex === null ? t('na', 'N/A') : `${kpis.ptoHealthIndex.toFixed(0)}%`}
          subtitle={t('leave_vs_accrual', 'Leave usage vs expected accrual')}
          color={
            kpis.ptoHealthIndex === null
              ? 'var(--nw-muted-foreground)'
              : getKpiColor(kpis.ptoHealthIndex, { good: 60, warn: 30, direction: 'higher' })
          }
        />
        <InsightKpiCard
          icon={<PiCalendarCheck />}
          label={t('absence_stability', 'Absence Stability')}
          value={`${kpis.absenceStabilityRate.toFixed(0)}%`}
          subtitle={t('predictability', 'Predictability of absences')}
          color={getKpiColor(kpis.absenceStabilityRate, { good: 90, warn: 75, direction: 'higher' })}
        />
        <InsightKpiCard
          icon={<PiClockClockwise />}
          label={t('attendance_reliability', 'Attendance Reliability')}
          value={`${kpis.attendanceReliabilityRate.toFixed(0)}%`}
          subtitle={t('time_log_completeness', 'Completeness of time logs')}
          color={getKpiColor(kpis.attendanceReliabilityRate, { good: 90, warn: 75, direction: 'higher' })}
        />
      </div>

      {/* Three panels row */}
      <div className="gba:grid gba:grid-cols-3 gba:gap-4">
        {/* Panel 1: Sustainability & Burnout */}
        <Card
          className="gba:shadow-sm gba:cursor-pointer gba:transition-all hover:gba:shadow-md gba:border gba:border-border"
          onClick={() => toggleDrawer('sustainability')}
          data-testid="sustainability-panel"
        >
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-sm gba:font-semibold gba:flex gba:items-center gba:gap-2">
              <PiHeartbeat className="gba:text-info" />
              {t('sustainability_burnout', 'Sustainability & Burnout')}
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:pt-0">
            {sustainabilitySignals.length === 0 ? (
              <div className="gba:text-center gba:py-4">
                <div className="gba:text-2xl gba:font-bold gba:text-success">{t('all_clear', 'All Clear')}</div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                  {t('no_burnout_signals', 'No burnout signals detected')}
                </div>
              </div>
            ) : (
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-baseline gba:gap-3">
                  <span className="gba:text-2xl gba:font-bold">{sustainabilitySignals.length}</span>
                  <span className="gba:text-xs gba:text-muted-foreground">
                    {t('signals_detected', 'signals detected')}
                  </span>
                </div>
                <div className="gba:flex gba:flex-wrap gba:gap-1.5">
                  {highRiskSignals > 0 && (
                    <Badge variant="destructive">
                      {highRiskSignals} {t('high', 'High')}
                    </Badge>
                  )}
                  {mediumRiskSignals > 0 && (
                    <Badge variant="warning">
                      {mediumRiskSignals} {t('medium', 'Medium')}
                    </Badge>
                  )}
                </div>
                {sustainabilitySignals.slice(0, 2).map(s => (
                  <div
                    key={s.employeeId}
                    className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:truncate"
                  >
                    <PiWarning className="gba:text-warning gba:flex-shrink-0" size={12} />
                    <span className="gba:font-medium gba:text-foreground">{s.employeeName}</span>
                    <span>– {s.signals[0]}</span>
                  </div>
                ))}
                {sustainabilitySignals.length > 2 && (
                  <div className="gba:text-xs gba:text-info gba:flex gba:items-center gba:gap-1 gba:mt-1">
                    <PiArrowRight size={12} />
                    {sustainabilitySignals.length - 2} {t('more', 'more')}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 2: Compliance */}
        <Card
          className="gba:shadow-sm gba:cursor-pointer gba:transition-all hover:gba:shadow-md gba:border gba:border-border"
          onClick={() => toggleDrawer('compliance')}
          data-testid="compliance-panel"
        >
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-sm gba:font-semibold gba:flex gba:items-center gba:gap-2">
              <PiShieldCheck className="gba:text-info" />
              {t('compliance_monitor', 'Compliance Monitor')}
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:pt-0">
            {complianceAlerts.length === 0 ? (
              <div className="gba:text-center gba:py-4">
                <div className="gba:text-2xl gba:font-bold gba:text-success">{t('all_clear', 'All Clear')}</div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                  {t('no_compliance_issues', 'No compliance issues')}
                </div>
              </div>
            ) : (
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-baseline gba:gap-3">
                  <span className="gba:text-2xl gba:font-bold">{complianceAlerts.length}</span>
                  <span className="gba:text-xs gba:text-muted-foreground">{t('alerts_active', 'alerts active')}</span>
                </div>
                <div className="gba:flex gba:flex-wrap gba:gap-1.5">
                  {criticalAlerts > 0 && (
                    <Badge variant="destructive">
                      {criticalAlerts} {t('critical', 'Critical')}
                    </Badge>
                  )}
                  {warningAlerts > 0 && (
                    <Badge variant="warning">
                      {warningAlerts} {t('warning_label', 'Warning')}
                    </Badge>
                  )}
                </div>
                {complianceAlerts.slice(0, 2).map((a, i) => (
                  <div
                    key={`${a.employeeId}-${i}`}
                    className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:truncate"
                  >
                    <PiWarning
                      className={
                        a.severity === 'critical'
                          ? 'gba:text-destructive gba:flex-shrink-0'
                          : 'gba:text-warning gba:flex-shrink-0'
                      }
                      size={12}
                    />
                    <span className="gba:font-medium gba:text-foreground">{a.employeeName}</span>
                    <span>– {a.type.replaceAll('_', ' ')}</span>
                  </div>
                ))}
                {complianceAlerts.length > 2 && (
                  <div className="gba:text-xs gba:text-info gba:flex gba:items-center gba:gap-1 gba:mt-1">
                    <PiArrowRight size={12} />
                    {complianceAlerts.length - 2} {t('more', 'more')}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel 3: Skills Coverage */}
        <Card
          className="gba:shadow-sm gba:cursor-pointer gba:transition-all hover:gba:shadow-md gba:border gba:border-border"
          onClick={() => toggleDrawer('coverage')}
          data-testid="skills-coverage-panel"
        >
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-sm gba:font-semibold gba:flex gba:items-center gba:gap-2">
              <PiUsersThree className="gba:text-info" />
              {t('skills_coverage', 'Skills Coverage')}
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:pt-0">
            {coverageLoading ? (
              <div className="gba:text-center gba:py-4 gba:text-muted-foreground gba:text-sm">
                {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
              </div>
            ) : !coverageData || coverageData.totalCapabilities === 0 ? (
              <div className="gba:text-center gba:py-4">
                <div className="gba:text-2xl gba:font-bold gba:text-muted-foreground">{t('na', 'N/A')}</div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                  {t('no_capabilities', 'No capabilities configured')}
                </div>
              </div>
            ) : (
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-baseline gba:gap-3">
                  <span
                    className="gba:text-2xl gba:font-bold"
                    style={{ color: getCoverageRiskColor(coverageData.overallRisk) }}
                  >
                    {coverageData.avgCoverage}%
                  </span>
                  <span className="gba:text-xs gba:text-muted-foreground">{t('avg_coverage', 'avg coverage')}</span>
                </div>
                <div className="gba:flex gba:flex-wrap gba:gap-1.5">
                  {coverageData.atRiskCapabilities > 0 ? (
                    <Badge variant="destructive">
                      {coverageData.atRiskCapabilities} {t('at_risk', 'at risk')}
                    </Badge>
                  ) : (
                    <Badge variant="success">{t('all_covered', 'All covered')}</Badge>
                  )}
                  <Badge variant="outline">
                    {coverageData.totalCapabilities} {t('capabilities', 'capabilities')}
                  </Badge>
                </div>
                {atRiskCapabilities.map(c => (
                  <div
                    key={c.capabilityId}
                    className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:truncate"
                  >
                    <PiWarning
                      className={
                        c.risk === 'high'
                          ? 'gba:text-destructive gba:flex-shrink-0'
                          : 'gba:text-warning gba:flex-shrink-0'
                      }
                      size={12}
                    />
                    <span className="gba:font-medium gba:text-foreground">{c.capabilityName}</span>
                    <span>
                      – {c.coverage}% ({c.absentMembers} {t('off', 'off')})
                    </span>
                  </div>
                ))}
                {coverageData.highImpactCount > 0 && (
                  <div className="gba:text-xs gba:text-info gba:flex gba:items-center gba:gap-1 gba:mt-1">
                    <PiArrowRight size={12} />
                    {coverageData.highImpactCount} {t('high_impact_scenarios', 'high-impact scenarios')}
                  </div>
                )}
                {coverageData.matrixTeams.length > 0 && (
                  <div className="gba:text-[10px] gba:text-muted-foreground gba:mt-1">
                    {t('org_units_matrix', '{{orgUnits}} org units · {{matrixTeams}} matrix teams', {
                      orgUnits: coverageData.orgUnits.length,
                      matrixTeams: coverageData.matrixTeams.length
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Absence Analytics Charts */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
        <AbsenceDistributionSection {...props} />
        <UsagePatternsSection data={absenceStatistics} />
      </div>
      <AbsenceTrendsSection {...props} />
      <YearComparisonSection data={absenceStatistics} />

      {/* Side drawer for details */}
      <DataDetailsDrawer
        title={getDrawerTitle()}
        icon={getDrawerIcon()}
        open={activeDrawer !== null}
        onClose={() => setActiveDrawer(null)}
        width={480}
        placement="right"
        dataTestId="insights-details-drawer"
      >
        {activeDrawer === 'sustainability' && (
          <div className="gba:space-y-3">
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-3">
              {t(
                'sustainability_description',
                'Early detection of workload imbalance and burnout risk. No medical information is exposed.'
              )}
            </div>
            {sustainabilitySignals.length === 0 ? (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                {t('no_sustainability_signals', 'No sustainability signals detected. Team workload appears balanced.')}
              </div>
            ) : (
              sustainabilitySignals.map(signal => (
                <div
                  key={signal.employeeId}
                  className="gba:flex gba:items-start gba:justify-between gba:py-3 gba:px-3 gba:rounded-lg gba:border gba:border-border"
                >
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <div className="gba:w-7 gba:h-7 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:text-[10px] gba:font-medium gba:mt-0.5">
                      {signal.employeeName
                        .split(' ')
                        .map(n => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="gba:font-medium gba:text-sm">{signal.employeeName}</div>
                      <div className="gba:space-y-0.5 gba:mt-1">
                        {signal.signals.map(s => (
                          <div
                            key={s}
                            className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1"
                          >
                            <PiWarning className="gba:text-warning gba:flex-shrink-0" size={11} />
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {getRiskBadge(signal.riskLevel)}
                </div>
              ))
            )}
          </div>
        )}

        {activeDrawer === 'compliance' && (
          <div className="gba:space-y-3">
            <div className="gba:text-sm gba:text-muted-foreground gba:mb-3">
              {t('compliance_description', 'Legal and policy compliance alerts with recommended actions.')}
            </div>
            {complianceAlerts.length === 0 ? (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                {t('no_compliance_alerts', 'No compliance alerts. All clear.')}
              </div>
            ) : (
              complianceAlerts.map((alert, idx) => (
                <div
                  key={`${alert.employeeId}-${alert.type}-${idx}`}
                  className={`gba:py-3 gba:px-3 gba:rounded-lg gba:border ${
                    alert.severity === 'critical'
                      ? 'gba:border-destructive/30 gba:bg-destructive/5'
                      : 'gba:border-warning/30 gba:bg-warning/5'
                  }`}
                >
                  <div className="gba:flex gba:items-start gba:justify-between gba:mb-1.5">
                    <div>
                      <span className="gba:font-medium gba:text-sm">{alert.employeeName}</span>
                      <span className="gba:text-muted-foreground gba:text-xs gba:ml-2">
                        {alert.type.replaceAll('_', ' ')}
                      </span>
                    </div>
                    {getSeverityBadge(alert.severity)}
                  </div>
                  <p className="gba:text-xs gba:text-foreground gba:mb-1">{alert.description}</p>
                  <p className="gba:text-[11px] gba:text-muted-foreground gba:italic">
                    {t('recommendation', 'Recommendation')}: {alert.recommendation}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeDrawer === 'coverage' && coverageData && (
          <div className="gba:space-y-5">
            <div className="gba:text-sm gba:text-muted-foreground">
              {t(
                'coverage_description',
                'Coverage analysis by organizational unit structure with matrix team impact analysis.'
              )}
            </div>

            {/* Org Units section */}
            {coverageData.orgUnits.map(ou => (
              <div key={ou.id} className="gba:space-y-3">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <div>
                    <div className="gba:text-sm gba:font-semibold">{ou.name}</div>
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mt-0.5">
                      {getImpactBadge(ou.risk)}
                      <span className="gba:text-xs gba:text-muted-foreground">
                        {t('members_count', '{{total}} members, {{absent}} absent', {
                          total: ou.totalMembers,
                          absent: ou.absentCount
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="gba:text-right">
                    <div className="gba:text-lg gba:font-bold">{ou.coverage}%</div>
                    <div className="gba:text-[10px] gba:text-muted-foreground">
                      {t('current_coverage', 'Current Coverage')}
                    </div>
                  </div>
                </div>

                {/* Team members badges */}
                <div>
                  <div className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:mb-1">
                    {t('team_members', 'Team Members')}
                  </div>
                  <div className="gba:flex gba:flex-wrap gba:gap-1">
                    {ou.members.map(m => (
                      <Badge key={m} variant={ou.absentMembers.includes(m) ? 'destructive' : 'outline'}>
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Impacted matrix teams */}
                {ou.impactedMatrixTeams.length > 0 && (
                  <div>
                    <div className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:mb-1.5">
                      {t('matrix_impacted', 'Matrix Teams Impacted When Someone is Off')}
                    </div>
                    {ou.impactedMatrixTeams.map(mt => (
                      <div
                        key={mt.matrixTeamName}
                        className="gba:py-2.5 gba:px-3 gba:rounded-lg gba:border gba:border-border gba:mb-2"
                      >
                        <div className="gba:flex gba:items-center gba:justify-between gba:mb-1.5">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <span className="gba:text-sm gba:font-medium">{mt.matrixTeamName}</span>
                            {getImpactBadge(mt.risk)}
                          </div>
                          <div className="gba:text-right">
                            <span className="gba:text-sm gba:font-semibold">
                              {mt.coverage}% {t('coverage_label', 'Coverage')}
                            </span>
                            <div className="gba:text-[10px] gba:text-muted-foreground">
                              {t('members_from_ou', '{{count}} members from this org unit', {
                                count: mt.orgUnitMembersInMatrix.length
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mb-1.5">
                          {mt.orgUnitMembersInMatrix.map(m => (
                            <Badge key={m} variant="secondary" className="gba:text-[10px]">
                              {m}
                            </Badge>
                          ))}
                        </div>
                        {mt.impactScenarios.length > 0 && (
                          <div>
                            <div className="gba:text-[10px] gba:text-muted-foreground gba:mb-1">
                              {t('impact_if_absent', 'Impact if someone from {{name}} is absent', { name: ou.name })}
                            </div>
                            <div className="gba:space-y-1">
                              {mt.impactScenarios.map(sc => (
                                <div key={sc.employeeName} className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                                  <span className="gba:font-medium">{sc.employeeName}</span>
                                  {getImpactBadge(sc.impactLevel)}
                                  <span className="gba:text-muted-foreground">
                                    → {sc.newCoverage}% {t('coverage_label', 'Coverage')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="gba:border-b gba:border-border" />
              </div>
            ))}

            {/* Matrix Teams section with capabilities */}
            {coverageData.matrixTeams.length > 0 && (
              <div>
                <div className="gba:text-xs gba:font-semibold gba:uppercase gba:text-muted-foreground gba:mb-2">
                  {t('matrix_capabilities', 'Matrix Team Capabilities')}
                </div>
                {coverageData.matrixTeams.map(mt => (
                  <div key={mt.id} className="gba:py-2.5 gba:px-3 gba:rounded-lg gba:border gba:border-border gba:mb-2">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:text-sm gba:font-semibold">{mt.name}</span>
                        {getImpactBadge(mt.risk)}
                      </div>
                      <span className="gba:text-sm gba:font-bold">{mt.coverage}%</span>
                    </div>

                    {/* Capabilities */}
                    {mt.capabilities.length > 0 && (
                      <div className="gba:space-y-1.5 gba:mb-2">
                        {mt.capabilities.map(cap => (
                          <div key={cap.capabilityId} className="gba:flex gba:items-center gba:gap-2">
                            <div className="gba:flex-1 gba:flex gba:items-center gba:gap-2">
                              <span className="gba:text-xs">{cap.capabilityName}</span>
                              {cap.absentMembers > 0 && (
                                <span className="gba:text-[10px] gba:text-destructive">
                                  {cap.absentMembers} {t('off', 'off')}
                                </span>
                              )}
                            </div>
                            <div className="gba:w-16 gba:h-1.5 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                              <div
                                className="gba:h-full gba:rounded-full"
                                style={{
                                  width: `${cap.coverage}%`,
                                  backgroundColor:
                                    cap.risk === 'high'
                                      ? 'var(--nw-destructive)'
                                      : cap.risk === 'medium'
                                        ? 'var(--nw-warning)'
                                        : 'var(--nw-success)'
                                }}
                              />
                            </div>
                            <span
                              className="gba:text-[11px] gba:w-8 gba:text-right gba:font-medium"
                              style={{
                                color:
                                  cap.risk === 'high'
                                    ? 'var(--nw-destructive)'
                                    : cap.risk === 'medium'
                                      ? 'var(--nw-warning)'
                                      : 'var(--nw-success)'
                              }}
                            >
                              {cap.coverage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Impact scenarios */}
                    {mt.impactScenarios.length > 0 && (
                      <div>
                        <div className="gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:mb-1">
                          {t('what_if_off', 'What if someone is off?')}
                        </div>
                        <div className="gba:space-y-1">
                          {mt.impactScenarios.map(sc => (
                            <div key={sc.employeeId}>
                              <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                                <span className="gba:font-medium">{sc.employeeName}</span>
                                {getImpactBadge(sc.impactLevel)}
                                <span className="gba:text-muted-foreground">→ {sc.newCoverage}%</span>
                              </div>
                              {sc.affectedCapabilities.some(ac => ac.newRisk !== 'low') && (
                                <div className="gba:ml-4 gba:mt-0.5 gba:space-y-0.5">
                                  {sc.affectedCapabilities
                                    .filter(ac => ac.newRisk !== 'low')
                                    .map(ac => (
                                      <div
                                        key={ac.capabilityId}
                                        className="gba:text-[10px] gba:text-muted-foreground gba:flex gba:items-center gba:gap-1"
                                      >
                                        <span
                                          className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:flex-shrink-0"
                                          style={{
                                            backgroundColor:
                                              ac.newRisk === 'high' ? 'var(--nw-destructive)' : 'var(--nw-warning)'
                                          }}
                                        />
                                        {ac.capabilityName}: {ac.newCoverage}%
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeDrawer === 'coverage' && !coverageData && (
          <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
            {t(
              'no_coverage_data',
              'No coverage data available. Capabilities may not be configured for this team structure.'
            )}
          </div>
        )}
      </DataDetailsDrawer>
    </div>
  )
}
