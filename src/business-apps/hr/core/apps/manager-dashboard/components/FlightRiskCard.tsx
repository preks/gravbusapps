/**
 * FlightRiskCard Component
 * Displays team retention risk summary on the Manager Dashboard
 */

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Skeleton
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

const getRiskIconBgClass = (summary: FlightRiskSummary) => {
  if (summary.criticalCount > 0) {
    return 'gba:bg-destructive'
  }
  if (summary.highRiskCount > 0) {
    return 'gba:bg-warning'
  }
  return 'gba:bg-success'
}

const LoadingSkeleton: React.FC = () => (
  <Card data-testid="flight-risk-card-loading">
    <CardHeader className="gba:pb-2">
      <div className="gba:flex gba:items-center gba:gap-3">
        <Skeleton className="gba:h-10 gba:w-10 gba:rounded-full" />
        <Skeleton className="gba:h-5 gba:w-32" />
      </div>
    </CardHeader>
    <CardContent className="gba:pt-0">
      <div className="gba:space-y-2">
        <Skeleton className="gba:h-4 gba:w-3/4" />
        <Skeleton className="gba:h-4 gba:w-2/3" />
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
        <CardHeader className="gba:pb-2">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-3">
              <span
                className={`gba:inline-flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:flex-shrink-0 ${getRiskIconBgClass(summary)}`}
              >
                {hasRisk ? (
                  <AlertTriangle size={20} className="gba:text-destructive-foreground" />
                ) : (
                  <ShieldCheck size={20} className="gba:text-success-foreground" />
                )}
              </span>
              <CardTitle className="gba:text-base gba:font-semibold">
                {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.retention_risk', 'Retention Risk')}
              </CardTitle>
            </div>
            <ChevronRight size={20} className="gba:text-muted-foreground" />
          </div>
        </CardHeader>

        <CardContent className="gba:pt-0">
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
            {summary.mediumRiskCount > 0 && (
              <Badge variant="secondary" data-testid="medium-risk-count">
                {summary.mediumRiskCount}{' '}
                {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.medium', 'Medium')}
              </Badge>
            )}
            {!hasRisk && summary.mediumRiskCount === 0 && (
              <Badge variant="success" data-testid="all-good">
                {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.team_stable', 'Team is stable')}
              </Badge>
            )}
          </div>

          {topAtRisk.length > 0 && (
            <div className="gba:space-y-2">
              {topAtRisk.map(emp => (
                <div
                  key={emp.employeeId}
                  className="gba:flex gba:items-center gba:justify-between gba:text-sm"
                  data-testid={`at-risk-employee-${emp.employeeId}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Avatar size="sm">
                      <AvatarImage
                        src={
                          emp.pictureThumbnail && !emp.pictureThumbnail.startsWith('{')
                            ? `data:image/jpeg;base64,${emp.pictureThumbnail}`
                            : undefined
                        }
                        alt={`${emp.firstName} ${emp.lastName}`}
                      />
                      <AvatarFallback>
                        {emp.firstName?.[0]}
                        {emp.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="gba:text-foreground">
                      {emp.firstName} {emp.lastName}
                    </span>
                  </div>
                  <Badge variant={getRiskBadgeVariant(emp.riskLevel)}>{emp.overallRiskScore}%</Badge>
                </div>
              ))}
            </div>
          )}

          {!hasRisk && summary.totalEmployees > 0 && topAtRisk.length === 0 && (
            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.flight_risk.no_immediate_concerns',
                'No immediate retention concerns detected'
              )}
            </p>
          )}
        </CardContent>
      </Card>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="gba:w-full sm:gba:max-w-xl gba:overflow-y-auto gba:p-0">
          <SheetHeader className="gba:p-6 gba:pb-4 gba:border-b gba:border-border">
            <SheetTitle>
              {getTranslationFromI18nKeyAndLabel(
                'master-data:hr.flight_risk.team_retention_analysis',
                'Team Retention Analysis'
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:p-6">
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
