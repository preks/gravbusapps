import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Progress,
  Avatar,
  Badge,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { Clock, Users, TrendUp, Lightbulb } from '@phosphor-icons/react'
import { ProjectAnalyticsData } from '../types'
import { RiskIndicator } from './RiskIndicator'
import { formatHoursToText } from '../utils/calculations'

interface ProjectDetailPanelProps {
  project: ProjectAnalyticsData
  prefixDataTestId?: string
}

const CONTRIBUTOR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export const ProjectDetailPanel: React.FC<ProjectDetailPanelProps> = ({
  project,
  prefixDataTestId = 'project-detail'
}) => {
  // Prepare burn rate chart data
  const burnRateChartConfig = {
    hoursLogged: { label: 'Hours Logged', color: '#3B82F6' },
    burnRate: { label: 'Burn Rate', color: '#10B981' }
  }

  const burnRateData = project.weeklyBurnRates.map(week => ({
    week: week.weekStart.slice(5), // MM-DD format
    hoursLogged: week.hoursLogged,
    burnRate: week.burnRate
  }))

  // Prepare contributor chart data
  const contributorChartConfig = project.topContributors.reduce(
    (acc, contributor, index) => {
      acc[contributor.employeeId] = {
        label: contributor.employeeName,
        color: CONTRIBUTOR_COLORS[index % CONTRIBUTOR_COLORS.length]
      }
      return acc
    },
    {} as Record<string, { label: string; color: string }>
  )

  const contributorData = project.topContributors.map((contributor, index) => ({
    name: contributor.employeeName,
    value: contributor.totalHours,
    fill: CONTRIBUTOR_COLORS[index % CONTRIBUTOR_COLORS.length]
  }))

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      {/* Project Header */}
      <div className="gba:flex gba:items-start gba:justify-between">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-foreground">{project.name}</h2>
          {project.description && <p className="gba:text-muted-foreground gba:mt-1">{project.description}</p>}
        </div>
        <RiskIndicator status={project.riskStatus} />
      </div>

      {/* KPI Cards Row */}
      <div className="gba:grid gba:grid-cols-2 lg:gba:grid-cols-4 gba:gap-4">
        {/* Budget Used */}
        <Card className="gba:p-4">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <TrendUp className="gba:w-4 gba:h-4 gba:text-primary" />
            <span className="gba:text-sm gba:text-muted-foreground">Budget Used</span>
          </div>
          <div className="gba:text-2xl gba:font-bold">{project.budgetConsumptionPercent}%</div>
          <Progress value={Math.min(project.budgetConsumptionPercent, 100)} className="gba:mt-2 gba:h-2" />
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
            {project.totalLoggedHours}h / {project.hoursBudget || 0}h
          </p>
        </Card>

        {/* Time Elapsed */}
        <Card className="gba:p-4">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <Clock className="gba:w-4 gba:h-4 gba:text-info" />
            <span className="gba:text-sm gba:text-muted-foreground">Time Elapsed</span>
          </div>
          <div className="gba:text-2xl gba:font-bold">{project.elapsedTimePercent}%</div>
          <Progress value={project.elapsedTimePercent} className="gba:mt-2 gba:h-2" />
          {project.daysUntilDeadline !== undefined && (
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              {project.daysUntilDeadline > 0
                ? `${project.daysUntilDeadline} days remaining`
                : project.daysUntilDeadline === 0
                  ? 'Due today'
                  : `${Math.abs(project.daysUntilDeadline)} days overdue`}
            </p>
          )}
        </Card>

        {/* Remaining Budget */}
        <Card className="gba:p-4">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <Clock className="gba:w-4 gba:h-4 gba:text-accent" />
            <span className="gba:text-sm gba:text-muted-foreground">Remaining</span>
          </div>
          <div className="gba:text-2xl gba:font-bold">{formatHoursToText(project.remainingHours)}</div>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">Burn rate: {project.burnRatePerDay}h/day</p>
        </Card>

        {/* Contributors */}
        <Card className="gba:p-4">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <Users className="gba:w-4 gba:h-4 gba:text-success" />
            <span className="gba:text-sm gba:text-muted-foreground">Contributors</span>
          </div>
          <div className="gba:text-2xl gba:font-bold">{project.activeContributorsCount}</div>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
            Avg: {project.avgHoursPerContributor}h per person
          </p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        {/* Burn Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base">Burn Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {burnRateData.length > 0 ? (
              <ChartContainer config={burnRateChartConfig} className="gba:h-[200px]">
                <LineChart data={burnRateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="hoursLogged"
                    stroke="var(--color-hoursLogged)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="gba:h-[200px] gba:flex gba:items-center gba:justify-center gba:text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Allocation */}
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base">Team Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {contributorData.length > 0 ? (
              <div className="gba:flex gba:items-center gba:gap-4">
                <ChartContainer config={contributorChartConfig} className="gba:h-[200px] gba:w-[200px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={contributorData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="50%"
                      outerRadius="80%"
                      strokeWidth={2}
                    >
                      {contributorData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="gba:flex-1 gba:space-y-2">
                  {project.topContributors.slice(0, 4).map(contributor => (
                    <div key={contributor.employeeId} className="gba:flex gba:items-center gba:gap-2">
                      <Avatar className="gba:w-6 gba:h-6">
                        {contributor.employeePicture ? (
                          <img src={contributor.employeePicture} alt={contributor.employeeName} />
                        ) : (
                          <span className="gba:text-xs">{contributor.employeeName.charAt(0)}</span>
                        )}
                      </Avatar>
                      <span className="gba:text-sm gba:flex-1 gba:truncate">{contributor.employeeName}</span>
                      <Badge variant="secondary" className="gba:text-xs">
                        {contributor.percentOfTotal}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="gba:h-[200px] gba:flex gba:items-center gba:justify-center gba:text-muted-foreground">
                No contributors yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights Panel */}
      {project.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
              <Lightbulb className="gba:w-5 gba:h-5 gba:text-warning" />
              Smart Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="gba:space-y-2">
              {project.insights.map((insight, index) => (
                <li key={index} className="gba:flex gba:items-start gba:gap-2">
                  <span className="gba:text-warning">•</span>
                  <span className="gba:text-sm gba:text-muted-foreground">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Risk Reasons */}
      {project.riskStatus !== 'on-track' && project.riskReasons.length > 0 && (
        <Card className="gba:border-warning/50">
          <CardContent className="gba:pt-4">
            <div className="gba:flex gba:items-start gba:gap-2">
              <Badge variant={project.riskStatus === 'over-budget' ? 'destructive' : 'warning'}>
                {project.riskStatus === 'over-budget' ? 'Budget Alert' : 'Risk Alert'}
              </Badge>
              <ul className="gba:space-y-1">
                {project.riskReasons.map((reason, index) => (
                  <li key={index} className="gba:text-sm gba:text-muted-foreground">
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
