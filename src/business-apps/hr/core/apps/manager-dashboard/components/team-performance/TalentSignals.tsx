import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@newwork/nw-design-system'
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  AlertTriangle,
  Eye,
  MessageSquare,
  Rocket,
  ChevronRight,
  Target,
  Scale,
  Users,
  BookOpen,
  Heart,
  Star,
  BarChart3
} from 'lucide-react'
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
      return <TrendingUp className={`${size} gba:text-green-600`} />
    case 'growth-candidate':
      return <Award className={`${size} gba:text-blue-600`} />
    case 'development-momentum':
      return <Rocket className={`${size} gba:text-purple-600`} />
    case 'plateau-risk':
      return <Minus className={`${size} gba:text-amber-600`} />
    case 'low-recognition':
      return <Eye className={`${size} gba:text-amber-600`} />
    case 'low-feedback-participation':
      return <MessageSquare className={`${size} gba:text-amber-600`} />
    case 'declining-trajectory':
      return <TrendingDown className={`${size} gba:text-red-600`} />
    case 'blocked-execution':
      return <Target className={`${size} gba:text-red-600`} />
    case 'alignment-gap':
      return <Scale className={`${size} gba:text-red-600`} />
  }
}

const teamSignalIcon = (type: TeamSignalType): React.ReactNode => {
  const size = 'gba:h-4 gba:w-4 gba:shrink-0'
  switch (type) {
    case 'growth-concentration-risk':
      return <BarChart3 className={`${size} gba:text-amber-600`} />
    case 'uneven-feedback-coverage':
      return <MessageSquare className={`${size} gba:text-amber-600`} />
    case 'team-execution-risk':
      return <AlertTriangle className={`${size} gba:text-red-600`} />
    case 'capability-gap':
      return <BookOpen className={`${size} gba:text-amber-600`} />
    case 'values-alignment-gap':
      return <Heart className={`${size} gba:text-amber-600`} />
    case 'standout-growth-cluster':
      return <Star className={`${size} gba:text-green-600`} />
    case 'recognition-gap':
      return <Users className={`${size} gba:text-amber-600`} />
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

export const TalentSignals: React.FC<TalentSignalsProps> = ({
  employeeSignals,
  teamSignals,
  onEmployeeClick,
  loading
}) => {
  const primarySignals = employeeSignals.filter(s => s.isPrimary)
  const supportingTags = employeeSignals.filter(s => !s.isPrimary)
  const supportingByEmployee = new Map<string, EmployeeSignal[]>()
  for (const s of supportingTags) {
    const list = supportingByEmployee.get(s.employeeId) ?? []
    list.push(s)
    supportingByEmployee.set(s.employeeId, list)
  }

  return (
    <Card style={{ borderRadius: '12px' }} className="gba:overflow-hidden gba:h-full">
      <CardHeader className="gba:pb-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-semibold">
            <Sparkles className="gba:h-4 gba:w-4" />
            Team Signals
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-5">
        {loading ? (
          <div className="gba:space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:h-4 gba:w-4 gba:rounded gba:bg-muted gba:animate-pulse gba:shrink-0" />
                <div className="gba:h-4 gba:w-full gba:max-w-xs gba:rounded gba:bg-muted gba:animate-pulse" />
              </div>
            ))}
          </div>
        ) : teamSignals.length === 0 && primarySignals.length === 0 ? (
          <p className="gba:text-sm gba:text-muted-foreground gba:py-2 gba:text-center">
            No notable signals detected for this period.
          </p>
        ) : (
          <>
            {/* Team-level signals */}
            {teamSignals.length > 0 && (
              <div>
                <h4 className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-3">
                  Team Patterns
                </h4>
                <ul className="gba:list-none gba:space-y-3 gba:p-0 gba:m-0">
                  {teamSignals.map((s, i) => (
                    <li key={`team-${s.signalType}-${i}`} className="gba:flex gba:items-start gba:gap-3">
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
                  {primarySignals.map((signal, idx) => {
                    const tags = supportingByEmployee.get(signal.employeeId) ?? []
                    return (
                      <li
                        key={`${signal.employeeId}-${idx}`}
                        className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:group gba:rounded-lg gba:p-2 hover:gba:bg-muted/40 gba:transition-colors gba:cursor-pointer"
                        onClick={() => onEmployeeClick(signal.employeeId)}
                      >
                        <div className="gba:flex gba:items-start gba:gap-2.5 gba:min-w-0">
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
                              {tags.map((t, ti) => (
                                <Badge
                                  key={ti}
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
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
