/**
 * FlightRiskDetailPanel Component
 * Detailed view of team retention risk with drill-down to individual employees
 */

import React, { useState } from 'react'
import {
  Card,
  CardContent,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
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
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Sparkles
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
import { formatTenure } from '../utils/tenureFormat'

interface FlightRiskDetailPanelProps {
  summary: FlightRiskSummary
  employees: FlightRiskEmployee[]
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

const getScoreBadgeVariant = (score: number): 'destructive' | 'warning' | 'success' => {
  if (score >= 60) return 'destructive'
  if (score >= 40) return 'warning'
  return 'success'
}

const getSignalIcon = (category: SignalCategory) => {
  const iconProps = { size: 16, className: 'gba:text-muted-foreground' }
  switch (category) {
    case 'performance':
      return <Target {...iconProps} />
    case 'engagement':
      return <MessageSquare {...iconProps} />
    case 'wellness':
      return <Heart {...iconProps} />
    case 'compensation':
      return <DollarSign {...iconProps} />
    case 'tenure':
      return <Clock {...iconProps} />
    case 'sentiment':
      return <MessageSquare {...iconProps} />
    default:
      return <AlertTriangle {...iconProps} />
  }
}

const TrendIcon: React.FC<{ trend: string }> = ({ trend }) => {
  if (trend === 'improving') return <TrendingUp size={14} className="gba:text-success-foreground" />
  if (trend === 'worsening') return <TrendingDown size={14} className="gba:text-destructive-foreground" />
  return <Minus size={14} className="gba:text-muted-foreground" />
}

// Summary Stats Component
const SummaryStats: React.FC<{ summary: FlightRiskSummary }> = ({ summary }) => (
  <div className="gba:grid gba:grid-cols-4 gba:gap-2 gba:mb-6">
    <Card>
      <CardContent className="gba:p-3 gba:text-center">
        <div className="gba:text-xl gba:font-bold gba:text-destructive">{summary.criticalCount}</div>
        <div className="gba:text-xs gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.critical', 'Critical')}
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="gba:p-3 gba:text-center">
        <div className="gba:text-xl gba:font-bold gba:text-warning">{summary.highRiskCount}</div>
        <div className="gba:text-xs gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.high_risk', 'High Risk')}
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="gba:p-3 gba:text-center">
        <div className="gba:text-xl gba:font-bold gba:text-muted-foreground">{summary.mediumRiskCount}</div>
        <div className="gba:text-xs gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.medium_risk', 'Medium')}
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="gba:p-3 gba:text-center">
        <div className="gba:text-xl gba:font-bold gba:text-success">{summary.lowRiskCount}</div>
        <div className="gba:text-xs gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.low_risk', 'Low')}
        </div>
      </CardContent>
    </Card>
  </div>
)

// Check if a signal was analyzed by AI
const isAIAnalyzedSignal = (signal: FlightRiskSignal): boolean => {
  return signal.rawValue === 'ai-analyzed' || signal.dataSource === 'FlowBot AI'
}

// Signal Breakdown Component
const SignalBreakdown: React.FC<{ signals: FlightRiskSignal[] }> = ({ signals }) => (
  <TooltipProvider>
    <div className="gba:space-y-3">
      {signals.map(signal => {
        const isAI = isAIAnalyzedSignal(signal)
        return (
          <div key={signal.id} className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-md gba:bg-muted/50">
            <div className="gba:flex-shrink-0">{getSignalIcon(signal.category)}</div>
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:mb-1">
                <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
                  <span className="gba:text-sm gba:font-medium gba:truncate">{signal.name}</span>
                  {isAI && (
                    <span
                      className="gba:inline-flex gba:items-center gba:gap-1 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:rounded gba:bg-primary/10 gba:text-primary gba:flex-shrink-0"
                      title="Analyzed by AI"
                    >
                      <Sparkles size={10} />
                      AI
                    </span>
                  )}
                </div>
                <Badge variant={getScoreBadgeVariant(signal.normalizedScore)} className="gba:flex-shrink-0">
                  {signal.normalizedScore}%
                </Badge>
              </div>
              <Progress value={signal.normalizedScore} className="gba:h-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:truncate gba:cursor-help">
                    {signal.description}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="gba:max-w-xs gba:text-xs">{signal.description}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )
      })}
    </div>
  </TooltipProvider>
)

// Intervention Card Component
const InterventionCard: React.FC<{ intervention: FlightRiskIntervention }> = ({ intervention }) => {
  let borderClass = 'gba:border-l-muted'
  if (intervention.priority === 'high') {
    borderClass = 'gba:border-l-destructive'
  } else if (intervention.priority === 'medium') {
    borderClass = 'gba:border-l-warning'
  }

  return (
    <Card className={`gba:border-l-4 ${borderClass}`}>
      <CardContent className="gba:p-3">
        <div className="gba:flex gba:items-start gba:gap-2">
          <Lightbulb size={16} className="gba:text-primary gba:mt-0.5 gba:flex-shrink-0" />
          <div className="gba:min-w-0">
            <h4 className="gba:text-sm gba:font-medium">{intervention.title}</h4>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{intervention.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Employee Row Component
const EmployeeRow: React.FC<{
  employee: FlightRiskEmployee
  isExpanded: boolean
  onToggle: () => void
  onNavigate?: (id: string) => void
}> = ({ employee, isExpanded, onToggle, onNavigate }) => (
  <Card className="gba:mb-3" data-testid={`employee-risk-card-${employee.employeeId}`}>
    <button
      type="button"
      className="gba:w-full gba:p-4 gba:text-left gba:bg-transparent gba:border-0 gba:cursor-pointer hover:gba:bg-muted/30 gba:transition-colors"
      onClick={onToggle}
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0">
          <div className="gba:flex-shrink-0">
            <Avatar
              size="default"
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
          </div>
          <div className="gba:flex-1 gba:min-w-0">
            <h3 className="gba:font-medium gba:text-foreground gba:truncate">
              {employee.firstName} {employee.lastName}
            </h3>
            <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
              {employee.jobPositionName}
              {employee.departmentName && ` • ${employee.departmentName}`}
            </p>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
          <div className="gba:text-right">
            <Badge variant={getRiskBadgeVariant(employee.riskLevel)} className="gba:mb-1">
              {employee.overallRiskScore}%
            </Badge>
            <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:justify-end">
              <TrendIcon trend={employee.riskTrend} />
              <span>{formatTenure(employee.tenureMonths)}</span>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp size={18} className="gba:text-muted-foreground" />
          ) : (
            <ChevronDown size={18} className="gba:text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="gba:mt-3">
        <Progress value={employee.overallRiskScore} className="gba:h-1.5" />
      </div>
    </button>

    {/* Expanded Content */}
    {isExpanded && (
      <>
        <Separator />
        <div className="gba:p-4">
          <Tabs defaultValue="factors" className="gba:w-full">
            <TabsList className="gba:mb-4 gba:w-full gba:justify-start">
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
                <div className="gba:text-center gba:py-6">
                  <CheckCircle size={32} className="gba:mx-auto gba:mb-2 gba:text-success" />
                  <p className="gba:text-sm gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      'master-data:hr.flight_risk.no_actions_needed',
                      'No immediate actions suggested'
                    )}
                  </p>
                </div>
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
      </>
    )}
  </Card>
)

// Section Header Component
const SectionHeader: React.FC<{
  icon: React.ReactNode
  label: string
  count: number
  variant: 'destructive' | 'warning' | 'muted' | 'success'
}> = ({ icon, label, count, variant }) => {
  const colorClasses = {
    destructive: 'gba:text-destructive',
    warning: 'gba:text-warning',
    muted: 'gba:text-muted-foreground',
    success: 'gba:text-success'
  }

  return (
    <h3
      className={`gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-semibold gba:mb-3 ${colorClasses[variant]}`}
    >
      {icon}
      {label} ({count})
    </h3>
  )
}

export const FlightRiskDetailPanel: React.FC<FlightRiskDetailPanelProps> = ({
  summary,
  employees,
  onNavigateToEmployee
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpanded = (employeeId: string) => {
    setExpandedId(prev => (prev === employeeId ? null : employeeId))
  }

  const criticalEmployees = employees.filter(e => e.riskLevel === 'critical')
  const highRiskEmployees = employees.filter(e => e.riskLevel === 'high')
  const mediumRiskEmployees = employees.filter(e => e.riskLevel === 'medium')
  const lowRiskEmployees = employees.filter(e => e.riskLevel === 'low')

  return (
    <div data-testid="flight-risk-detail-panel">
      <SummaryStats summary={summary} />

      <div className="gba:space-y-6">
        {criticalEmployees.length > 0 && (
          <div>
            <SectionHeader
              icon={<AlertTriangle size={16} />}
              label={getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.critical_risk', 'Critical Risk')}
              count={criticalEmployees.length}
              variant="destructive"
            />
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

        {highRiskEmployees.length > 0 && (
          <div>
            <SectionHeader
              icon={<AlertCircle size={16} />}
              label={getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.high_risk', 'High Risk')}
              count={highRiskEmployees.length}
              variant="warning"
            />
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

        {mediumRiskEmployees.length > 0 && (
          <div>
            <SectionHeader
              icon={<Minus size={16} />}
              label={getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.medium_risk', 'Medium Risk')}
              count={mediumRiskEmployees.length}
              variant="muted"
            />
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

        {lowRiskEmployees.length > 0 && (
          <div>
            <SectionHeader
              icon={<User size={16} />}
              label={getTranslationFromI18nKeyAndLabel('master-data:hr.flight_risk.low_risk', 'Low Risk')}
              count={lowRiskEmployees.length}
              variant="success"
            />
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

      {employees.length === 0 && (
        <div className="gba:text-center gba:py-12">
          <User size={48} className="gba:mx-auto gba:mb-4 gba:text-muted-foreground gba:opacity-50" />
          <p className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.flight_risk.no_team_members',
              'No team members to analyze'
            )}
          </p>
          <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">
            Add direct reports or refresh organization data to enable retention insights.
          </p>
        </div>
      )}
    </div>
  )
}

export default FlightRiskDetailPanel
