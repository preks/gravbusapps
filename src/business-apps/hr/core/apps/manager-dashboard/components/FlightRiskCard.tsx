/**
 * FlightRiskCard Component
 * Displays team retention risk summary on the Manager Dashboard
 */

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { AlertTriangle, ChevronRight, ShieldCheck } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlightRiskSummary, FlightRiskEmployee, RiskLevel } from '../types/flightRisk.types'
import { FlightRiskDetailPanel } from './FlightRiskDetailPanel'

interface FlightRiskCardProps {
  summary: FlightRiskSummary
  employees: FlightRiskEmployee[]
  loading: boolean
  onNavigateToEmployee?: (employeeId: string) => void
}

const getRiskBadgeVariant = (level: RiskLevel): 'destructive' | 'warning' | 'secondary' | 'success' => {
  switch (level) {
    case 'critical':
      return 'destructive'
    case 'high':
      return 'warning'
    case 'medium':
      return 'secondary'
    default:
      return 'success'
  }
}

const LoadingSkeleton: React.FC = () => (
  <Card data-testid="flight-risk-card-loading">
    <CardContent className="gba:p-5">
      <div className="gba:flex gba:items-start gba:gap-4">
        <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-muted gba:animate-pulse" />
        <div className="gba:flex-1 gba:space-y-3">
          <div className="gba:h-5 gba:bg-muted gba:rounded gba:animate-pulse gba:w-1/2" />
          <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse gba:w-3/4" />
          <div className="gba:h-4 gba:bg-muted gba:rounded gba:animate-pulse gba:w-2/3" />
        </div>
      </div>
    </CardContent>
  </Card>
)

export const FlightRiskCard: React.FC<FlightRiskCardProps> = ({
  summary,
  employees,
  loading,
  onNavigateToEmployee
}) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Get top at-risk employees (critical + high)
  const topAtRisk = employees.filter(e => e.riskLevel === 'critical' || e.riskLevel === 'high').slice(0, 3)

  const hasRisk = summary.criticalCount > 0 || summary.highRiskCount > 0

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <>
      <Card
        className="gba:cursor-pointer hover:gba:shadow-md gba:transition-shadow"
        onClick={() => setIsDetailOpen(true)}
        data-testid="flight-risk-card"
      >
        <CardContent className="gba:p-5">
          <div className="gba:flex gba:items-start gba:gap-4">
            {/* Icon */}
            <span
              className={`gba:inline-flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:flex-shrink-0 ${
                summary.criticalCount > 0
                  ? 'gba:bg-destructive'
                  : summary.highRiskCount > 0
                    ? 'gba:bg-warning'
                    : 'gba:bg-success'
              }`}
            >
              {hasRisk ? (
                <AlertTriangle size={24} className="gba:text-white" />
              ) : (
                <ShieldCheck size={24} className="gba:text-white" />
              )}
            </span>

            <div className="gba:flex-1">
              {/* Header */}
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.retention_risk', 'Retention Risk')}
                </h3>
                <ChevronRight size={20} className="gba:text-muted-foreground" />
              </div>

              {/* Summary Stats */}
              <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mb-3">
                {summary.criticalCount > 0 && (
                  <Badge variant="destructive" data-testid="critical-count">
                    {summary.criticalCount}{' '}
                    {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.critical', 'Critical')}
                  </Badge>
                )}
                {summary.highRiskCount > 0 && (
                  <Badge variant="warning" data-testid="high-risk-count">
                    {summary.highRiskCount}{' '}
                    {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.high_risk', 'High Risk')}
                  </Badge>
                )}
                {!hasRisk && (
                  <Badge variant="success" data-testid="all-good">
                    {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.team_stable', 'Team is stable')}
                  </Badge>
                )}
              </div>

              {/* Top At-Risk Employees */}
              {topAtRisk.length > 0 && (
                <div className="gba:space-y-2">
                  {topAtRisk.map(emp => (
                    <div
                      key={emp.employeeId}
                      className="gba:flex gba:items-center gba:justify-between gba:text-sm"
                      data-testid={`at-risk-employee-${emp.employeeId}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Avatar size="sm" className="gba:h-6 gba:w-6">
                          <AvatarImage
                            src={
                              emp.pictureThumbnail && !emp.pictureThumbnail.startsWith('{')
                                ? `data:image/jpeg;base64,${emp.pictureThumbnail}`
                                : undefined
                            }
                            alt={`${emp.firstName} ${emp.lastName}`}
                          />
                          <AvatarFallback className="gba:text-xs">
                            {emp.firstName?.[0]}
                            {emp.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="gba:text-foreground">
                          {emp.firstName} {emp.lastName}
                        </span>
                      </div>
                      <Badge variant={getRiskBadgeVariant(emp.riskLevel)} className="gba:text-xs">
                        {emp.overallRiskScore}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* No risk message */}
              {!hasRisk && summary.totalEmployees > 0 && (
                <p className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.flight_risk.no_immediate_concerns',
                    'No immediate retention concerns detected'
                  )}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="gba:w-full sm:gba:max-w-xl gba:overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.flight_risk.team_retention_analysis',
                'Team Retention Analysis'
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:mt-6">
            <FlightRiskDetailPanel
              summary={summary}
              employees={employees}
              onNavigateToEmployee={onNavigateToEmployee}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default FlightRiskCard
