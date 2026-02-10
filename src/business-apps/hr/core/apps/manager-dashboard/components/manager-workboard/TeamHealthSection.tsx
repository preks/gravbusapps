// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

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
  SheetTitle
} from '@newwork/nw-design-system'
import { AlertTriangle, X, TrendingUp } from 'lucide-react'
import { FlightRiskDetailPanel } from '../FlightRiskDetailPanel'

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
}

export const TeamHealthSection: React.FC<TeamHealthSectionProps> = ({
  summary,
  employees,
  loading,
  onNavigateToEmployee
}) => {
  const [isPanelOpen, setIsPanelOpen] = React.useState(false)

  if (loading) {
    return (
      <Card style={{ minHeight: '200px', borderRadius: '12px' }} className="gba:p-5">
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

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical':
      case 'high':
        return 'destructive'
      case 'medium':
        return 'warning'
      default:
        return 'success'
    }
  }

  const highRiskTotal = (summary?.highRiskCount || 0) + (summary?.criticalCount || 0)
  const overallRisk =
    summary && summary.totalEmployees > 0
      ? highRiskTotal > 2
        ? 'high'
        : (summary.mediumRiskCount || 0) > 5
          ? 'medium'
          : 'low'
      : 'low'

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
      <Card
        data-testid="team-health-section"
        style={{ minHeight: '200px', borderRadius: '12px', overflow: 'hidden' }}
        className="gba:p-5 gba:flex gba:flex-col"
      >
        <CardHeader className="gba:flex-none">
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:text-lg gba:font-semibold">Team Health</CardTitle>
            <Badge variant={getRiskBadgeVariant(overallRisk)}>
              {overallRisk === 'high' ? 'High Risk' : overallRisk === 'medium' ? 'Medium Risk' : 'Low Risk'}
            </Badge>
          </div>
          <p className="gba:text-sm gba:text-muted-foreground">Retention risk monitoring</p>
        </CardHeader>
        <CardContent className="gba:space-y-4 gba:overflow-y-auto gba:flex-1">
          {/* Summary Stats - Clickable to open detail panel */}
          {summary && summary.totalEmployees > 0 && (
            <div className="gba:grid gba:grid-cols-3 gba:gap-2">
              <button
                onClick={openDetailPanel}
                className="gba:p-2 gba:bg-destructive/10 gba:rounded-lg gba:hover:bg-destructive/20 gba:transition-colors gba:text-center gba:cursor-pointer"
              >
                <p className="gba:text-2xl gba:font-bold gba:text-destructive">{highRiskTotal}</p>
                <p className="gba:text-xs gba:text-muted-foreground">High Risk</p>
              </button>
              <button
                onClick={openDetailPanel}
                className="gba:p-2 gba:bg-warning/10 gba:rounded-lg gba:hover:bg-warning/20 gba:transition-colors gba:text-center gba:cursor-pointer"
              >
                <p className="gba:text-2xl gba:font-bold gba:text-warning">{summary.mediumRiskCount}</p>
                <p className="gba:text-xs gba:text-muted-foreground">Medium Risk</p>
              </button>
              <button
                onClick={openDetailPanel}
                className="gba:p-2 gba:bg-success/10 gba:rounded-lg gba:hover:bg-success/20 gba:transition-colors gba:text-center gba:cursor-pointer"
              >
                <p className="gba:text-2xl gba:font-bold gba:text-success">{summary.lowRiskCount}</p>
                <p className="gba:text-xs gba:text-muted-foreground">Low Risk</p>
              </button>
            </div>
          )}

          {/* Key Drivers and Top Risk Factors - Side by Side */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-3">
            {/* Key Drivers (Positive - What's Working Well) */}
            {keyDrivers.length > 0 && overallRisk !== 'high' && (
              <div>
                <p className="gba:text-xs gba:font-medium gba:mb-2 gba:text-success">Key Drivers:</p>
                <div className="gba:space-y-1">
                  {keyDrivers.map((driver, idx) => (
                    <div key={idx} className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs">
                      <TrendingUp className="gba:text-success gba:flex-shrink-0" size={12} />
                      <span className="gba:text-muted-foreground gba:truncate">{driver}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Risk Factors (Negative - Areas of Concern) */}
            {topRiskFactors.length > 0 && (
              <div>
                <p className="gba:text-xs gba:font-medium gba:mb-2 gba:text-destructive">Top Risk Factors:</p>
                <div className="gba:space-y-1">
                  {topRiskFactors.map((factor, idx) => (
                    <div key={idx} className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs">
                      <AlertTriangle className="gba:text-destructive gba:flex-shrink-0" size={12} />
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
