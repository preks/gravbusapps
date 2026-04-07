import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@newwork/nw-design-system'
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Shield,
  TrendingUp
} from 'lucide-react'
import { TeamPerformanceInsightsData } from '../../hooks/useTeamPerformanceInsights'

interface TeamInsightsPanelProps {
  data: TeamPerformanceInsightsData | null
  isAnalyzing: boolean
  error: string | null
  onAnalyze: () => void
  onClear: () => void
}

const urgencyColors: Record<string, string> = {
  high: 'destructive',
  medium: 'warning',
  low: 'info'
}

const impactColors: Record<string, string> = {
  high: 'gba:text-success',
  medium: 'gba:text-info',
  low: 'gba:text-muted-foreground'
}

export const TeamInsightsPanel: React.FC<TeamInsightsPanelProps> = ({ data, isAnalyzing, error, onAnalyze }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['priorities']))

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  if (!data && !isAnalyzing && !error) {
    return (
      <Card className="gba:rounded-xl" data-testid="team-insights-panel-empty">
        <CardContent className="gba:p-6 gba:text-center">
          <Sparkles size={40} className="gba:mx-auto gba:mb-3 gba:text-muted-foreground gba:opacity-50" />
          <h3 className="gba:text-sm gba:font-semibold gba:mb-1">AI Team Insights</h3>
          <p className="gba:text-xs gba:text-muted-foreground gba:mb-4">
            Get AI-powered analysis of your team&apos;s performance across all dimensions
          </p>
          <Button onClick={onAnalyze} size="sm" className="gba:gap-1.5">
            <Sparkles size={14} />
            Generate Insights
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isAnalyzing) {
    return (
      <Card className="gba:rounded-xl" data-testid="team-insights-panel-loading">
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-3 gba:mb-4">
            <div className="gba:animate-spin">
              <Sparkles size={20} className="gba:text-primary" />
            </div>
            <div>
              <h3 className="gba:text-sm gba:font-semibold">Analyzing team performance...</h3>
              <p className="gba:text-xs gba:text-muted-foreground">
                Reviewing goals, skills, feedback, and evaluations
              </p>
            </div>
          </div>
          <div className="gba:space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="gba:animate-pulse gba:h-4 gba:bg-muted gba:rounded"
                style={{ width: `${85 - i * 10}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:rounded-xl" data-testid="team-insights-panel-error">
        <CardContent className="gba:p-6 gba:text-center">
          <AlertTriangle size={32} className="gba:mx-auto gba:mb-2 gba:text-destructive" />
          <p className="gba:text-sm gba:text-destructive gba:mb-3">{error}</p>
          <Button onClick={onAnalyze} variant="outline" size="sm">
            <RefreshCw size={14} className="gba:mr-1.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card className="gba:rounded-xl" data-testid="team-insights-panel">
      <CardHeader className="gba:pb-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Sparkles size={16} className="gba:text-primary" />
            <CardTitle className="gba:text-base">AI Team Insights</CardTitle>
          </div>
          <Button onClick={onAnalyze} variant="ghost" size="sm" className="gba:h-7 gba:gap-1">
            <RefreshCw size={12} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {/* Executive Summary */}
        <div className="gba:p-3 gba:rounded-lg gba:bg-primary/5 gba:border gba:border-primary/10">
          <p className="gba:text-sm gba:leading-relaxed">{data.executive_summary}</p>
        </div>

        {/* Top Priorities */}
        {data.top_priorities.length > 0 && (
          <Collapsible open={expandedSections.has('priorities')} onOpenChange={() => toggleSection('priorities')}>
            <CollapsibleTrigger className="gba:flex gba:items-center gba:justify-between gba:w-full gba:p-2 gba:rounded-lg hover:gba:bg-muted/50 gba:transition-colors">
              <div className="gba:flex gba:items-center gba:gap-2">
                <AlertTriangle size={14} className="gba:text-warning" />
                <span className="gba:text-sm gba:font-medium">Top Priorities ({data.top_priorities.length})</span>
              </div>
              <ChevronDown
                size={14}
                className={`gba:transition-transform ${expandedSections.has('priorities') ? 'gba:rotate-180' : ''}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="gba:space-y-2 gba:mt-1 gba:pl-6">
                {data.top_priorities.map((priority, i) => (
                  <div key={i} className="gba:p-2.5 gba:rounded-lg gba:bg-surface gba:border gba:border-border">
                    <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:mb-1">
                      <p className="gba:text-xs gba:font-medium gba:flex-1">{priority.priority}</p>
                      <Badge
                        variant={urgencyColors[priority.urgency] as any}
                        className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:shrink-0"
                      >
                        {priority.urgency}
                      </Badge>
                    </div>
                    <p className="gba:text-[11px] gba:text-muted-foreground">{priority.recommended_action}</p>
                    {priority.affected_employees.length > 0 && (
                      <p className="gba:text-[10px] gba:text-muted-foreground gba:mt-1">
                        Affects: {priority.affected_employees.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Recommended Actions */}
        {data.recommended_actions.length > 0 && (
          <Collapsible open={expandedSections.has('actions')} onOpenChange={() => toggleSection('actions')}>
            <CollapsibleTrigger className="gba:flex gba:items-center gba:justify-between gba:w-full gba:p-2 gba:rounded-lg hover:gba:bg-muted/50 gba:transition-colors">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Lightbulb size={14} className="gba:text-info" />
                <span className="gba:text-sm gba:font-medium">
                  Recommended Actions ({data.recommended_actions.length})
                </span>
              </div>
              <ChevronDown
                size={14}
                className={`gba:transition-transform ${expandedSections.has('actions') ? 'gba:rotate-180' : ''}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="gba:space-y-2 gba:mt-1 gba:pl-6">
                {data.recommended_actions.map((action, i) => (
                  <div key={i} className="gba:flex gba:items-start gba:gap-2 gba:p-2 gba:rounded-lg gba:bg-surface">
                    <CheckCircle2 size={12} className="gba:mt-0.5 gba:text-muted-foreground gba:shrink-0" />
                    <div className="gba:flex-1">
                      <p className="gba:text-xs">{action.action}</p>
                      <div className="gba:flex gba:gap-2 gba:mt-1">
                        <span className={`gba:text-[10px] ${impactColors[action.impact]}`}>
                          Impact: {action.impact}
                        </span>
                        <span className="gba:text-[10px] gba:text-muted-foreground">Effort: {action.effort}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Strengths & Risks */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-3">
          {data.team_strengths.length > 0 && (
            <div className="gba:p-2.5 gba:rounded-lg gba:bg-success/5 gba:border gba:border-success/10">
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:mb-1.5">
                <TrendingUp size={12} className="gba:text-success" />
                <span className="gba:text-xs gba:font-medium gba:text-success">Strengths</span>
              </div>
              <ul className="gba:space-y-0.5">
                {data.team_strengths.map((s, i) => (
                  <li key={i} className="gba:text-[11px] gba:text-muted-foreground">
                    • {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.team_risks.length > 0 && (
            <div className="gba:p-2.5 gba:rounded-lg gba:bg-destructive/5 gba:border gba:border-destructive/10">
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:mb-1.5">
                <Shield size={12} className="gba:text-destructive" />
                <span className="gba:text-xs gba:font-medium gba:text-destructive">Risks</span>
              </div>
              <ul className="gba:space-y-0.5">
                {data.team_risks.map((r, i) => (
                  <li key={i} className="gba:text-[11px] gba:text-muted-foreground">
                    • {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
