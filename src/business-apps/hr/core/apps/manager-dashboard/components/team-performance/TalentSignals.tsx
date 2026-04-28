import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@newwork/nw-design-system'
import {
  SparkleIcon as Sparkles,
  TrendUpIcon as TrendingUp,
  TrendDownIcon as TrendingDown,
  MinusIcon as Minus,
  TrophyIcon as Award,
  WarningIcon as AlertTriangle,
  EyeIcon as Eye,
  ChatCircleDotsIcon as MessageSquare,
  RocketIcon as Rocket,
  CaretRightIcon as ChevronRight,
  TargetIcon as Target,
  ScalesIcon as Scale,
  UsersThreeIcon as Users,
  BookOpenIcon as BookOpen,
  HeartIcon as Heart,
  StarIcon as Star,
  ChartBarIcon as BarChart3
} from '@phosphor-icons/react'
import type {
  EmployeeSignal,
  EmployeeSignalType,
  TeamSignal,
  TeamSignalType,
  SignalCategory
} from '../../utils/dashboardComputations'

interface TalentSignalsProps {
  employeeSignals: EmployeeSignal[]
  teamSignals: TeamSignal[]
  onEmployeeClick: (employeeId: string) => void
  loading: boolean
}

const employeeSignalIcon = (type: EmployeeSignalType): React.ReactNode => {
  const size = 'gba:h-4 gba:w-4 gba:shrink-0'
  switch (type) {
    case 'strong-momentum':
      return <TrendingUp className={`${size} gba:text-success`} />
    case 'growth-candidate':
      return <Award className={`${size} gba:text-info`} />
    case 'development-momentum':
      return <Rocket className={`${size} gba:text-primary`} />
    case 'plateau-risk':
      return <Minus className={`${size} gba:text-warning`} />
    case 'low-recognition':
      return <Eye className={`${size} gba:text-warning`} />
    case 'low-feedback-participation':
      return <MessageSquare className={`${size} gba:text-warning`} />
    case 'declining-trajectory':
      return <TrendingDown className={`${size} gba:text-destructive`} />
    case 'blocked-execution':
      return <Target className={`${size} gba:text-destructive`} />
    case 'alignment-gap':
      return <Scale className={`${size} gba:text-destructive`} />
  }
}

const teamSignalIcon = (type: TeamSignalType): React.ReactNode => {
  const size = 'gba:h-4 gba:w-4 gba:shrink-0'
  switch (type) {
    case 'growth-concentration-risk':
      return <BarChart3 className={`${size} gba:text-warning`} />
    case 'uneven-feedback-coverage':
      return <MessageSquare className={`${size} gba:text-warning`} />
    case 'team-execution-risk':
      return <AlertTriangle className={`${size} gba:text-destructive`} />
    case 'capability-gap':
      return <BookOpen className={`${size} gba:text-warning`} />
    case 'values-alignment-gap':
      return <Heart className={`${size} gba:text-warning`} />
    case 'standout-growth-cluster':
      return <Star className={`${size} gba:text-success`} />
    case 'recognition-gap':
      return <Users className={`${size} gba:text-warning`} />
  }
}

const EMPLOYEE_SIGNAL_LABEL: Record<EmployeeSignalType, string> = {
  'strong-momentum': 'Strong Momentum',
  'growth-candidate': 'Growth Candidate',
  'development-momentum': 'Development Momentum',
  'plateau-risk': 'Plateau Risk',
  'low-recognition': 'Low Recognition',
  'low-feedback-participation': 'Low Feedback Participation',
  'declining-trajectory': 'Declining Trajectory',
  'blocked-execution': 'Blocked Execution',
  'alignment-gap': 'Alignment Gap'
}

const categoryBadgeVariant = (category: SignalCategory): 'destructive' | 'default' | 'secondary' => {
  if (category === 'warning') return 'destructive'
  if (category === 'attention') return 'default'
  return 'secondary'
}

const SKELETON_ROWS = ['signal-skeleton-1', 'signal-skeleton-2', 'signal-skeleton-3', 'signal-skeleton-4']

export const TalentSignals: React.FC<TalentSignalsProps> = ({
  employeeSignals,
  teamSignals,
  onEmployeeClick,
  loading
}) => {
  const primarySignals = employeeSignals.filter(s => s.isPrimary)
  const supportingTags = employeeSignals.filter(s => !s.isPrimary)
  const hasSignals = teamSignals.length > 0 || primarySignals.length > 0
  const supportingByEmployee = new Map<string, EmployeeSignal[]>()
  for (const s of supportingTags) {
    const list = supportingByEmployee.get(s.employeeId) ?? []
    list.push(s)
    supportingByEmployee.set(s.employeeId, list)
  }

  const renderContent = (): React.ReactNode => {
    if (loading) {
      return (
        <div className="gba:space-y-3">
          {SKELETON_ROWS.map(rowId => (
            <div key={rowId} className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:h-4 gba:w-4 gba:rounded gba:bg-muted gba:animate-pulse gba:shrink-0" />
              <div className="gba:h-4 gba:w-full gba:max-w-xs gba:rounded gba:bg-muted gba:animate-pulse" />
            </div>
          ))}
        </div>
      )
    }

    if (hasSignals === false) {
      return (
        <p className="gba:text-sm gba:text-muted-foreground gba:py-2 gba:text-center">
          No notable signals detected for this period.
        </p>
      )
    }

    return (
      <>
        {/* Team-level signals */}
        {teamSignals.length > 0 && (
          <div>
            <h4 className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-3">
              Team Patterns
            </h4>
            <ul className="gba:list-none gba:space-y-3 gba:p-0 gba:m-0">
              {teamSignals.map(s => (
                <li key={`team-${s.signalType}-${s.description}`} className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:mt-0.5">{teamSignalIcon(s.signalType)}</span>
                  <div className="gba:min-w-0">
                    <p className="gba:text-sm">{s.description}</p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{s.suggestedAction}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Employee-level signals */}
        {primarySignals.length > 0 && (
          <div className={teamSignals.length > 0 ? 'gba:pt-3 gba:border-t gba:border-border' : ''}>
            <h4 className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-3">
              Individual Signals
            </h4>
            <ul className="gba:list-none gba:space-y-2 gba:p-0 gba:m-0">
              {primarySignals.map(signal => {
                const tags = supportingByEmployee.get(signal.employeeId) ?? []
                return (
                  <li key={`${signal.employeeId}-${signal.signalType}`}>
                    <button
                      type="button"
                      className="gba:flex gba:items-center gba:justify-between gba:w-full gba:gap-2 gba:group gba:rounded-lg gba:p-2 hover:gba:bg-muted/40 gba:transition-colors gba:cursor-pointer"
                      onClick={() => onEmployeeClick(signal.employeeId)}
                    >
                      <div className="gba:flex gba:items-start gba:gap-2.5 gba:min-w-0 gba:text-left">
                        <span className="gba:mt-0.5">{employeeSignalIcon(signal.signalType)}</span>
                        <div className="gba:min-w-0">
                          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5">
                            <span className="gba:text-sm gba:font-medium">{signal.employeeName}</span>
                            <Badge
                              variant={categoryBadgeVariant(signal.category)}
                              className="gba:text-[10px] gba:px-1.5 gba:py-0"
                            >
                              {EMPLOYEE_SIGNAL_LABEL[signal.signalType]}
                            </Badge>
                            {tags.map(t => (
                              <Badge
                                key={`${signal.employeeId}-${t.signalType}`}
                                variant="secondary"
                                className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:opacity-70"
                              >
                                {EMPLOYEE_SIGNAL_LABEL[t.signalType]}
                              </Badge>
                            ))}
                          </div>
                          <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:truncate">
                            {signal.supportingData[0] ?? signal.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </>
    )
  }

  return (
    <Card className="gba:rounded-xl gba:overflow-hidden gba:h-full">
      <CardHeader className="gba:pb-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
            <Sparkles className="gba:h-4 gba:w-4" />
            Team Signals
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-5">{renderContent()}</CardContent>
    </Card>
  )
}
