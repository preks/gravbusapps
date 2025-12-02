import React, { useState } from 'react'
import { Card, CardContent, Spinner, Button } from '@newwork/nw-design-system'
import {
  PiSparkle,
  PiTrendUp,
  PiTrendDown,
  PiCheckCircle,
  PiCalendarBlank,
  PiAirplaneTilt,
  PiCaretRight
} from 'react-icons/pi'
import { AIInsightsSectionProps, EmployeePerformance } from '../types/ViewSelectorTypes'
import { EmployeeCard } from './EmployeeCard'
import { NeedsAttentionDrawer } from './NeedsAttentionDrawer'

const DATA_TEST_ID_PREFIX = 'SalesActivity360-ViewSelector'
const MAX_VISIBLE_EMPLOYEES = 3

export const AIInsightsSection: React.FC<AIInsightsSectionProps> = ({
  stats,
  topPerformers,
  underperformers,
  onLeave,
  loading,
  onEmployeeClick
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (loading) {
    return (
      <div className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiSparkle className="gba:w-5 gba:h-5 gba:text-primary" />
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">AI Insights</h2>
          <span className="gba:text-xs gba:text-muted-foreground">• Rolling 14-day analysis (absence-adjusted)</span>
        </div>
        <Card className="gba:bg-gradient-to-r gba:from-primary/5 gba:to-accent/5 gba:border-primary/20">
          <CardContent className="gba:p-6 gba:flex gba:items-center gba:justify-center">
            <Spinner size="md" />
            <span className="gba:ml-3 gba:text-muted-foreground">Analyzing team performance...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="gba:space-y-4" data-testid={`${DATA_TEST_ID_PREFIX}-insights`}>
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiSparkle className="gba:w-5 gba:h-5 gba:text-primary" />
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">AI Insights</h2>
          <span className="gba:text-xs gba:text-muted-foreground">• Rolling 14-day analysis (absence-adjusted)</span>
        </div>

        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-4 gba:gap-4">
          {/* Global Trend Card */}
          <TeamMomentumCard stats={stats} />

          {/* Top Performers */}
          <TopPerformersCard employees={topPerformers} onEmployeeClick={onEmployeeClick} />

          {/* Needs Attention */}
          <NeedsAttentionCard
            employees={underperformers}
            onEmployeeClick={onEmployeeClick}
            onViewAll={() => setDrawerOpen(true)}
          />

          {/* Currently On Leave */}
          <OnLeaveCard employees={onLeave} onEmployeeClick={onEmployeeClick} />
        </div>
      </div>

      {/* Drawer for all employees needing attention */}
      <NeedsAttentionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        employees={underperformers}
        onEmployeeClick={onEmployeeClick}
      />
    </>
  )
}

// Sub-components for each insight card
interface TeamMomentumCardProps {
  stats: {
    rollingTrend?: number
    last30Days?: number
    prev30Days?: number
  } | null
}

const TeamMomentumCard: React.FC<TeamMomentumCardProps> = ({ stats }) => {
  const trend = stats?.rollingTrend || 0
  const isPositive = trend >= 0

  return (
    <Card
      className={`gba:h-full gba:bg-gradient-to-br ${
        isPositive
          ? 'gba:from-success/5 gba:to-success/10 gba:border-success/30'
          : 'gba:from-warning/5 gba:to-warning/10 gba:border-warning/30'
      }`}
    >
      <CardContent className="gba:p-4 gba:h-full gba:flex gba:flex-col">
        <div className="gba:flex gba:items-center gba:gap-3 gba:mb-4">
          <div
            className={`gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-lg ${
              isPositive ? 'gba:bg-success/10' : 'gba:bg-warning/10'
            }`}
          >
            {isPositive ? (
              <PiTrendUp className="gba:w-5 gba:h-5 gba:text-success" />
            ) : (
              <PiTrendDown className="gba:w-5 gba:h-5 gba:text-warning" />
            )}
          </div>
          <div>
            <h3 className="gba:font-semibold gba:text-foreground">Team Momentum</h3>
            <p className="gba:text-xs gba:text-muted-foreground">Last 14 vs prev 14 days</p>
          </div>
        </div>
        <div className="gba:space-y-2 gba:flex-1">
          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-sm gba:text-muted-foreground">Last 14 Days</span>
            <span className="gba:text-lg gba:font-bold">{stats?.last30Days || 0}</span>
          </div>
          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-sm gba:text-muted-foreground">Prev 14 Days</span>
            <span className="gba:text-sm">{stats?.prev30Days || 0}</span>
          </div>
          <div className="gba:pt-2 gba:border-t gba:border-border/50">
            <span className={`gba:text-2xl gba:font-bold ${isPositive ? 'gba:text-success' : 'gba:text-warning'}`}>
              {isPositive ? '+' : ''}
              {trend}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface EmployeeListCardProps {
  employees: EmployeePerformance[]
  onEmployeeClick: (emp: EmployeePerformance) => void
}

const TopPerformersCard: React.FC<EmployeeListCardProps> = ({ employees, onEmployeeClick }) => (
  <Card className="gba:h-full gba:bg-gradient-to-br gba:from-success/5 gba:to-success/10 gba:border-success/30">
    <CardContent className="gba:p-4 gba:h-full gba:flex gba:flex-col">
      <div className="gba:flex gba:items-center gba:gap-3 gba:mb-3">
        <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-lg gba:bg-success/10">
          <PiTrendUp className="gba:w-5 gba:h-5 gba:text-success" />
        </div>
        <div>
          <h3 className="gba:font-semibold gba:text-foreground">Top Performers</h3>
          <p className="gba:text-xs gba:text-muted-foreground">Rising last 14 days</p>
        </div>
      </div>
      <div className="gba:space-y-1 gba:flex-1">
        {employees.length === 0 ? (
          <p className="gba:text-sm gba:text-muted-foreground gba:py-4 gba:text-center">No standouts yet</p>
        ) : (
          employees.slice(0, 3).map(emp => <EmployeeCard key={emp.employee.id} emp={emp} onClick={onEmployeeClick} />)
        )}
      </div>
    </CardContent>
  </Card>
)

interface NeedsAttentionCardProps extends EmployeeListCardProps {
  onViewAll: () => void
}

const NeedsAttentionCard: React.FC<NeedsAttentionCardProps> = ({ employees, onEmployeeClick, onViewAll }) => {
  // Count inactive vs declining for subtitle
  const inactiveCount = employees.filter(e => e.isInactive).length
  const decliningCount = employees.filter(e => !e.isInactive).length
  const hasMore = employees.length > MAX_VISIBLE_EMPLOYEES

  const getSubtitle = () => {
    if (inactiveCount > 0 && decliningCount > 0) {
      return `${inactiveCount} inactive, ${decliningCount} declining`
    }
    if (inactiveCount > 0) return `${inactiveCount} inactive`
    if (decliningCount > 0) return `${decliningCount} declining`
    return 'Performance alerts'
  }

  return (
    <Card className="gba:h-full gba:bg-gradient-to-br gba:from-warning/5 gba:to-warning/10 gba:border-warning/30">
      <CardContent className="gba:p-4 gba:h-full gba:flex gba:flex-col">
        <div className="gba:flex gba:items-center gba:gap-3 gba:mb-3">
          <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-lg gba:bg-warning/10">
            <PiTrendDown className="gba:w-5 gba:h-5 gba:text-warning" />
          </div>
          <div>
            <h3 className="gba:font-semibold gba:text-foreground">Needs Attention</h3>
            <p className="gba:text-xs gba:text-muted-foreground">{getSubtitle()}</p>
          </div>
        </div>
        <div className="gba:space-y-1 gba:flex-1">
          {employees.length === 0 ? (
            <div className="gba:flex gba:items-center gba:gap-2 gba:py-4 gba:justify-center">
              <PiCheckCircle className="gba:w-5 gba:h-5 gba:text-success" />
              <p className="gba:text-sm gba:text-muted-foreground">Everyone on track!</p>
            </div>
          ) : (
            employees
              .slice(0, MAX_VISIBLE_EMPLOYEES)
              .map(emp => <EmployeeCard key={emp.employee.id} emp={emp} onClick={onEmployeeClick} />)
          )}
        </div>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="gba:w-full gba:text-xs gba:text-warning hover:gba:text-warning hover:gba:bg-warning/10 gba:mt-auto gba:h-7"
          >
            View all ({employees.length})
            <PiCaretRight className="gba:w-4 gba:h-4 gba:ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

const OnLeaveCard: React.FC<EmployeeListCardProps> = ({ employees, onEmployeeClick }) => (
  <Card className="gba:h-full gba:bg-gradient-to-br gba:from-info/5 gba:to-info/10 gba:border-info/30">
    <CardContent className="gba:p-4 gba:h-full gba:flex gba:flex-col">
      <div className="gba:flex gba:items-center gba:gap-3 gba:mb-3">
        <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-lg gba:bg-info/10">
          <PiAirplaneTilt className="gba:w-5 gba:h-5 gba:text-info" />
        </div>
        <div>
          <h3 className="gba:font-semibold gba:text-foreground">Currently On Leave</h3>
          <p className="gba:text-xs gba:text-muted-foreground">Away from work</p>
        </div>
      </div>
      <div className="gba:space-y-1 gba:flex-1">
        {employees.length === 0 ? (
          <div className="gba:flex gba:items-center gba:gap-2 gba:py-4 gba:justify-center">
            <PiCalendarBlank className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
            <p className="gba:text-sm gba:text-muted-foreground">Full team available</p>
          </div>
        ) : (
          employees
            .slice(0, 3)
            .map(emp => (
              <EmployeeCard
                key={emp.employee.id}
                emp={emp}
                showTrend={false}
                showAbsence={true}
                onClick={onEmployeeClick}
              />
            ))
        )}
      </div>
    </CardContent>
  </Card>
)

export default AIInsightsSection
