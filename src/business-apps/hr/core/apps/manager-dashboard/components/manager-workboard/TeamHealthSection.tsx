import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Switch
} from '@newwork/nw-design-system'
import { AlertTriangle, X, TrendingUp, Sparkles } from 'lucide-react'
import { FlightRiskDetailPanel } from '../FlightRiskDetailPanel'

type RiskBadgeVariant = 'info' | 'warning' | 'destructive' | 'secondary'

interface FlightRiskEmployee {
  employeeId: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  overallRiskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  topRiskFactors: Array<{
    name: string
    normalizedScore: number
    description: string
  }>
}

interface FlightRiskSummary {
  totalEmployees: number
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number
  criticalCount?: number
  averageRiskScore: number
}

interface TeamHealthSectionProps {
  summary: FlightRiskSummary | null
  employees: FlightRiskEmployee[]
  loading: boolean
  onNavigateToEmployee: (employeeId: string) => void
  enableAISentiment?: boolean
  onToggleSentimentAnalysis?: (enabled: boolean) => void
}

export const TeamHealthSection: React.FC<TeamHealthSectionProps> = ({
  summary,
  employees,
  loading,
  onNavigateToEmployee,
  enableAISentiment = false,
  onToggleSentimentAnalysis
}) => {
  const [isPanelOpen, setIsPanelOpen] = React.useState(false)

  if (loading) {
    return (
      <Card className="gba:rounded-xl gba:p-5">
        <CardHeader>
          <CardTitle>Team Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-3">
            <div className="gba:h-8 gba:bg-muted gba:rounded" />
            <div className="gba:h-20 gba:bg-muted gba:rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const getRiskBadgeVariant = (level: string): RiskBadgeVariant => {
    switch (level) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'warning'
      case 'medium':
        return 'secondary'
      default:
        return 'info'
    }
  }

  const getOverallRiskLevel = (riskSummary: FlightRiskSummary | null): 'low' | 'medium' | 'high' | 'critical' => {
    if (!riskSummary || riskSummary.totalEmployees <= 0) {
      return 'low'
    }

    if ((riskSummary.criticalCount || 0) > 0) {
      return 'critical'
    }

    if ((riskSummary.highRiskCount || 0) > 2) {
      return 'high'
    }

    if ((riskSummary.mediumRiskCount || 0) > 5) {
      return 'medium'
    }

    return 'low'
  }

  const getOverallRiskLabel = (risk: 'low' | 'medium' | 'high' | 'critical') => {
    if (risk === 'critical') {
      return 'Critical Risk'
    }

    if (risk === 'high') {
      return 'High Risk'
    }

    if (risk === 'medium') {
      return 'Medium Risk'
    }

    return 'Low Risk'
  }

  const criticalCount = summary?.criticalCount || 0
  const overallRisk = getOverallRiskLevel(summary)

  // Extract all risk factors from all employees with their scores
  const allRiskFactors = new Map<string, number>()
  employees.forEach(emp => {
    emp.topRiskFactors.forEach(factor => {
      const current = allRiskFactors.get(factor.name) || 0
      allRiskFactors.set(factor.name, current + factor.normalizedScore)
    })
  })

  // Calculate average scores for all unique signal types across ALL employees
  const allSignalAverages = new Map<string, { total: number; count: number }>()
  employees.forEach(emp => {
    emp.signals?.forEach(signal => {
      const current = allSignalAverages.get(signal.name) || { total: 0, count: 0 }
      allSignalAverages.set(signal.name, {
        total: current.total + signal.normalizedScore,
        count: current.count + 1
      })
    })
  })

  // Get top 3 RISK FACTORS (highest accumulated scores - what's concerning)
  const topRiskFactors = Array.from(allRiskFactors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name)

  // Get top 3 KEY DRIVERS (lowest average scores - what's working well)
  const keyDrivers = Array.from(allSignalAverages.entries())
    .map(([name, { total, count }]) => ({ name, avgScore: total / count }))
    .sort((a, b) => a.avgScore - b.avgScore) // Sort by lowest score (best performance)
    .slice(0, 3)
    .map(item => item.name)

  const openDetailPanel = () => {
    setIsPanelOpen(true)
  }

  return (
    <>
      <Card data-testid="team-health-section" className="gba:rounded-xl gba:p-5 gba:flex gba:flex-col">
        <CardHeader className="gba:flex-none gba:pb-3">
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:text-lg">Team Health</CardTitle>
            <Badge variant={getRiskBadgeVariant(overallRisk)} className="gba:animate-none">
              {getOverallRiskLabel(overallRisk)}
            </Badge>
          </div>
          <div className="gba:flex gba:items-center gba:justify-between">
            <p className="gba:text-sm gba:text-muted-foreground">Retention risk monitoring</p>
            {onToggleSentimentAnalysis && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <label
                  htmlFor="sentiment-toggle"
                  className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground gba:cursor-pointer"
                >
                  <Sparkles size={12} className={enableAISentiment ? 'gba:text-primary' : ''} />
                  <span>AI Sentiment</span>
                </label>
                <Switch
                  id="sentiment-toggle"
                  checked={enableAISentiment}
                  onCheckedChange={onToggleSentimentAnalysis}
                  className="gba:scale-75"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="gba:space-y-3 gba:flex-1">
          {/* Summary Stats - Clickable to open detail panel */}
          {summary && summary.totalEmployees > 0 && (
            <div className="gba:grid gba:grid-cols-4 gba:gap-2">
              <button
                onClick={openDetailPanel}
                className="gba:p-2.5 gba:bg-surface gba:rounded-lg gba:hover:bg-muted/40 gba:transition-colors gba:text-center gba:cursor-pointer"
              >
                <p className="gba:text-xl gba:font-bold gba:text-destructive-on-card">{criticalCount}</p>
                <p className="gba:text-xs gba:text-muted-foreground">Critical</p>
              </button>
              <button
                onClick={openDetailPanel}
                className="gba:p-2.5 gba:bg-surface gba:rounded-lg gba:hover:bg-muted/40 gba:transition-colors gba:text-center gba:cursor-pointer"
              >
                <p className="gba:text-xl gba:font-bold gba:text-warning-on-card">{summary.highRiskCount}</p>
                <p className="gba:text-xs gba:text-muted-foreground">High Risk</p>
              </button>
              <button
                onClick={openDetailPanel}
                className="gba:p-2.5 gba:bg-surface gba:rounded-lg gba:hover:bg-muted/40 gba:transition-colors gba:text-center gba:cursor-pointer"
              >
                <p className="gba:text-xl gba:font-bold gba:text-muted-foreground">{summary.mediumRiskCount}</p>
                <p className="gba:text-xs gba:text-muted-foreground">Medium Risk</p>
              </button>
              <button
                onClick={openDetailPanel}
                className="gba:p-2.5 gba:bg-surface gba:rounded-lg gba:hover:bg-muted/40 gba:transition-colors gba:text-center gba:cursor-pointer"
              >
                <p className="gba:text-xl gba:font-bold gba:text-success">{summary.lowRiskCount}</p>
                <p className="gba:text-xs gba:text-muted-foreground">Low Risk</p>
              </button>
            </div>
          )}

          {/* Key Drivers and Top Risk Factors - Side by Side */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-2.5">
            {/* Key Drivers (Positive - What's Working Well) */}
            {keyDrivers.length > 0 && overallRisk !== 'high' && (
              <div>
                <p className="gba:text-xs gba:font-medium gba:mb-1.5 gba:text-info-on-card">Key Drivers:</p>
                <div className="gba:space-y-1">
                  {keyDrivers.map(driver => (
                    <div key={driver} className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs">
                      <TrendingUp className="gba:text-info-on-card gba:flex-shrink-0" size={12} />
                      <span className="gba:text-muted-foreground gba:truncate">{driver}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Risk Factors (Negative - Areas of Concern) */}
            {topRiskFactors.length > 0 && (
              <div>
                <p className="gba:text-xs gba:font-medium gba:mb-1.5 gba:text-destructive-on-card">Top Risk Factors:</p>
                <div className="gba:space-y-1">
                  {topRiskFactors.map(factor => (
                    <div key={factor} className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs">
                      <AlertTriangle className="gba:text-destructive-on-card gba:flex-shrink-0" size={12} />
                      <span className="gba:text-muted-foreground gba:truncate">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {(!summary || summary.totalEmployees === 0) && (
            <div className="gba:text-center gba:py-4 gba:text-muted-foreground">
              <p className="gba:text-sm">No flight risk data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flight Risk Detail Panel - Side Sheet */}
      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent
          className="gba:w-full sm:gba:max-w-2xl gba:p-6 gba:overflow-y-auto"
          data-testid="flight-risk-detail-sheet"
        >
          <SheetHeader className="gba:mb-6">
            <button
              onClick={() => setIsPanelOpen(false)}
              className="gba:absolute gba:right-4 gba:top-4 gba:rounded-sm gba:opacity-70 gba:ring-offset-background gba:transition-opacity hover:gba:opacity-100 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring focus:gba:ring-offset-2"
              aria-label="Close"
            >
              <X className="gba:h-4 gba:w-4" />
            </button>
            <SheetTitle className="gba:text-xl gba:font-semibold">Team Retention Risk Details</SheetTitle>
          </SheetHeader>

          {summary && (
            <FlightRiskDetailPanel
              summary={summary}
              employees={employees}
              onNavigateToEmployee={employeeId => {
                setIsPanelOpen(false)
                onNavigateToEmployee(employeeId)
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
