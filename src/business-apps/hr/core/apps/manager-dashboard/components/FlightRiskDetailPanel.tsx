/**
 * FlightRiskDetailPanel Component
 * Detailed view of team retention risk with drill-down to individual employees
 */

import React, { useState } from 'react'
import {
  Card,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@newwork/nw-design-system'
import {
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  User,
  Target,
  MessageSquare,
  Heart,
  DollarSign,
  Clock,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  FlightRiskSummary,
  FlightRiskEmployee,
  FlightRiskSignal,
  FlightRiskIntervention,
  RiskLevel,
  SignalCategory
} from '../types/flightRisk.types'

interface FlightRiskDetailPanelProps {
  summary: FlightRiskSummary
  employees: FlightRiskEmployee[]
  onNavigateToEmployee?: (employeeId: string) => void
}

const getRiskColor = (level: RiskLevel): string => {
  switch (level) {
    case 'critical':
      return 'gba:text-destructive'
    case 'high':
      return 'gba:text-warning'
    case 'medium':
      return 'gba:text-muted-foreground'
    default:
      return 'gba:text-success'
  }
}

const getRiskBgColor = (level: RiskLevel): string => {
  switch (level) {
    case 'critical':
      return 'gba:bg-destructive'
    case 'high':
      return 'gba:bg-warning'
    case 'medium':
      return 'gba:bg-muted'
    default:
      return 'gba:bg-success'
  }
}

const getSignalIcon = (category: SignalCategory) => {
  switch (category) {
    case 'performance':
      return <Target size={16} />
    case 'engagement':
      return <MessageSquare size={16} />
    case 'wellness':
      return <Heart size={16} />
    case 'compensation':
      return <DollarSign size={16} />
    case 'tenure':
      return <Clock size={16} />
    case 'sentiment':
      return <MessageSquare size={16} />
    default:
      return <AlertTriangle size={16} />
  }
}

const TrendIcon: React.FC<{ trend: string }> = ({ trend }) => {
  if (trend === 'improving') return <TrendingUp size={14} className="gba:text-success" />
  if (trend === 'worsening') return <TrendingDown size={14} className="gba:text-destructive" />
  return <Minus size={14} className="gba:text-muted-foreground" />
}

// Summary Stats Component
const SummaryStats: React.FC<{ summary: FlightRiskSummary }> = ({ summary }) => (
  <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4 gba:mb-6">
    <Card className="gba:p-4">
      <div className="gba:text-2xl gba:font-bold gba:text-destructive">{summary.criticalCount}</div>
      <div className="gba:text-sm gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.critical', 'Critical')}
      </div>
    </Card>
    <Card className="gba:p-4">
      <div className="gba:text-2xl gba:font-bold gba:text-warning">{summary.highRiskCount}</div>
      <div className="gba:text-sm gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.high_risk', 'High Risk')}
      </div>
    </Card>
    <Card className="gba:p-4">
      <div className="gba:text-2xl gba:font-bold gba:text-muted-foreground">{summary.mediumRiskCount}</div>
      <div className="gba:text-sm gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.medium_risk', 'Medium')}
      </div>
    </Card>
    <Card className="gba:p-4">
      <div className="gba:text-2xl gba:font-bold gba:text-success">{summary.lowRiskCount}</div>
      <div className="gba:text-sm gba:text-muted-foreground">
        {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.low_risk', 'Low')}
      </div>
    </Card>
  </div>
)

// Signal Breakdown Component
const SignalBreakdown: React.FC<{ signals: FlightRiskSignal[] }> = ({ signals }) => (
  <div className="gba:space-y-3">
    {signals.map(signal => (
      <div key={signal.id} className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-muted/30">
        <div className="gba:text-muted-foreground">{getSignalIcon(signal.category)}</div>
        <div className="gba:flex-1">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
            <span className="gba:text-sm gba:font-medium">{signal.name}</span>
            <Badge
              variant={
                signal.normalizedScore >= 60 ? 'destructive' : signal.normalizedScore >= 40 ? 'warning' : 'success'
              }
              className="gba:text-xs"
            >
              {signal.normalizedScore}%
            </Badge>
          </div>
          <Progress value={signal.normalizedScore} className="gba:h-1.5" />
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{signal.description}</p>
        </div>
      </div>
    ))}
  </div>
)

// Intervention Card Component
const InterventionCard: React.FC<{ intervention: FlightRiskIntervention }> = ({ intervention }) => (
  <div
    className={`gba:p-3 gba:rounded-lg gba:border gba:border-l-4 ${
      intervention.priority === 'high'
        ? 'gba:border-l-destructive gba:bg-destructive/5'
        : intervention.priority === 'medium'
          ? 'gba:border-l-warning gba:bg-warning/5'
          : 'gba:border-l-muted gba:bg-muted/10'
    }`}
  >
    <div className="gba:flex gba:items-start gba:gap-2">
      <Lightbulb size={16} className="gba:text-primary gba:mt-0.5" />
      <div>
        <h4 className="gba:text-sm gba:font-medium">{intervention.title}</h4>
        <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{intervention.description}</p>
      </div>
    </div>
  </div>
)

// Employee Row Component
const EmployeeRow: React.FC<{
  employee: FlightRiskEmployee
  isExpanded: boolean
  onToggle: () => void
  onNavigate?: (id: string) => void
}> = ({ employee, isExpanded, onToggle, onNavigate }) => (
  <Card className="gba:mb-3" data-testid={`employee-risk-card-${employee.employeeId}`}>
    <div className="gba:p-4 gba:cursor-pointer hover:gba:bg-muted/20 gba:transition-colors" onClick={onToggle}>
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-3">
          <Avatar
            size="md"
            className="gba:h-10 gba:w-10 gba:cursor-pointer"
            onClick={e => {
              e.stopPropagation()
              onNavigate?.(employee.employeeId)
            }}
          >
            <AvatarImage
              src={
                employee.pictureThumbnail && !employee.pictureThumbnail.startsWith('{')
                  ? `data:image/jpeg;base64,${employee.pictureThumbnail}`
                  : undefined
              }
              alt={`${employee.firstName} ${employee.lastName}`}
            />
            <AvatarFallback>
              {employee.firstName?.[0]}
              {employee.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="gba:font-medium gba:text-foreground">
              {employee.firstName} {employee.lastName}
            </h3>
            <p className="gba:text-xs gba:text-muted-foreground">
              {employee.jobPositionName}
              {employee.departmentName && ` • ${employee.departmentName}`}
            </p>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:text-right">
            <div className={`gba:text-lg gba:font-bold ${getRiskColor(employee.riskLevel)}`}>
              {employee.overallRiskScore}%
            </div>
            <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
              <TrendIcon trend={employee.riskTrend} />
              <span>{employee.tenureMonths} mo tenure</span>
            </div>
          </div>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Risk Level Badge */}
      <div className="gba:mt-3">
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className={`gba:h-2 gba:flex-1 gba:rounded-full gba:overflow-hidden gba:bg-muted`}>
            <div
              className={`gba:h-full gba:rounded-full ${getRiskBgColor(employee.riskLevel)}`}
              style={{ width: `${employee.overallRiskScore}%` }}
            />
          </div>
        </div>
      </div>
    </div>

    {/* Expanded Content */}
    {isExpanded && (
      <div className="gba:px-4 gba:pb-4 gba:border-t gba:border-border gba:pt-4">
        <Tabs defaultValue="factors" className="gba:w-full">
          <TabsList className="gba:mb-4">
            <TabsTrigger value="factors">
              {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.risk_factors', 'Risk Factors')}
            </TabsTrigger>
            <TabsTrigger value="actions">
              {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.suggested_actions', 'Suggested Actions')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="factors">
            <SignalBreakdown signals={employee.signals} />
          </TabsContent>

          <TabsContent value="actions">
            {employee.interventions.length > 0 ? (
              <div className="gba:space-y-3">
                {employee.interventions.map(intervention => (
                  <InterventionCard key={intervention.id} intervention={intervention} />
                ))}
              </div>
            ) : (
              <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.flight_risk.no_actions_needed',
                  'No immediate actions suggested'
                )}
              </p>
            )}
          </TabsContent>
        </Tabs>

        {/* Data Confidence */}
        <div className="gba:mt-4 gba:pt-3 gba:border-t gba:border-border">
          <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
            <span>
              {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.data_confidence', 'Data Confidence')}:{' '}
              {employee.confidenceLevel}%
            </span>
            <span>
              {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.last_updated', 'Updated')}:{' '}
              {employee.lastUpdated.toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    )}
  </Card>
)

export const FlightRiskDetailPanel: React.FC<FlightRiskDetailPanelProps> = ({
  summary,
  employees,
  onNavigateToEmployee
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpanded = (employeeId: string) => {
    setExpandedId(prev => (prev === employeeId ? null : employeeId))
  }

  // Group employees by risk level
  const criticalEmployees = employees.filter(e => e.riskLevel === 'critical')
  const highRiskEmployees = employees.filter(e => e.riskLevel === 'high')
  const mediumRiskEmployees = employees.filter(e => e.riskLevel === 'medium')
  const lowRiskEmployees = employees.filter(e => e.riskLevel === 'low')

  return (
    <div data-testid="flight-risk-detail-panel">
      {/* Summary Stats */}
      <SummaryStats summary={summary} />

      {/* Employee List by Risk Level */}
      <div className="gba:space-y-6">
        {/* Critical */}
        {criticalEmployees.length > 0 && (
          <div>
            <h3 className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-semibold gba:text-destructive gba:mb-3">
              <AlertTriangle size={16} />
              {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.critical_risk', 'Critical Risk')} (
              {criticalEmployees.length})
            </h3>
            {criticalEmployees.map(emp => (
              <EmployeeRow
                key={emp.employeeId}
                employee={emp}
                isExpanded={expandedId === emp.employeeId}
                onToggle={() => toggleExpanded(emp.employeeId)}
                onNavigate={onNavigateToEmployee}
              />
            ))}
          </div>
        )}

        {/* High Risk */}
        {highRiskEmployees.length > 0 && (
          <div>
            <h3 className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-semibold gba:text-warning gba:mb-3">
              <TrendingDown size={16} />
              {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.high_risk', 'High Risk')} (
              {highRiskEmployees.length})
            </h3>
            {highRiskEmployees.map(emp => (
              <EmployeeRow
                key={emp.employeeId}
                employee={emp}
                isExpanded={expandedId === emp.employeeId}
                onToggle={() => toggleExpanded(emp.employeeId)}
                onNavigate={onNavigateToEmployee}
              />
            ))}
          </div>
        )}

        {/* Medium Risk */}
        {mediumRiskEmployees.length > 0 && (
          <div>
            <h3 className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-semibold gba:text-muted-foreground gba:mb-3">
              <Minus size={16} />
              {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.medium_risk', 'Medium Risk')} (
              {mediumRiskEmployees.length})
            </h3>
            {mediumRiskEmployees.map(emp => (
              <EmployeeRow
                key={emp.employeeId}
                employee={emp}
                isExpanded={expandedId === emp.employeeId}
                onToggle={() => toggleExpanded(emp.employeeId)}
                onNavigate={onNavigateToEmployee}
              />
            ))}
          </div>
        )}

        {/* Low Risk */}
        {lowRiskEmployees.length > 0 && (
          <div>
            <h3 className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-semibold gba:text-success gba:mb-3">
              <User size={16} />
              {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.low_risk', 'Low Risk')} (
              {lowRiskEmployees.length})
            </h3>
            {lowRiskEmployees.map(emp => (
              <EmployeeRow
                key={emp.employeeId}
                employee={emp}
                isExpanded={expandedId === emp.employeeId}
                onToggle={() => toggleExpanded(emp.employeeId)}
                onNavigate={onNavigateToEmployee}
              />
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {employees.length === 0 && (
        <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
          <User size={48} className="gba:mx-auto gba:mb-4 gba:opacity-50" />
          <p>
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.flight_risk.no_team_members',
              'No team members to analyze'
            )}
          </p>
        </div>
      )}
    </div>
  )
}

export default FlightRiskDetailPanel
