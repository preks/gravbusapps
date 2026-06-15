export type ComparisonChartVariant = 'team' | 'employee'

export interface ComparisonChartLabels {
  comparisonTitle: string
  comparisonDescription: string
  comparisonEmptyMessage: string
  comparisonEmptyHint: string
  radarTitle: string
  radarEmptyTitle: string
  radarEmptyDescription: string
  entityCountsTitle: string
  entityCountsDescription: string
  entityCountsEmptyMessage: string
  entityCountsEmptyHint: string
  selectionCountLabel: (count: number) => string
  opportunitiesPerMemberLabel: string
  winsPerMemberLabel: string
  teamSizeLabel: string
  includeTeamSizeMetric: boolean
}

const TEAM_LABELS: ComparisonChartLabels = {
  comparisonTitle: 'Team Comparison',
  comparisonDescription: 'Revenue performance across selected teams',
  comparisonEmptyMessage: 'No teams visible in chart',
  comparisonEmptyHint: 'Click on team cards above to show their data in the chart',
  radarTitle: 'Team Performance Profile',
  radarEmptyTitle: 'No teams selected',
  radarEmptyDescription: 'Select teams to view their performance profile.',
  entityCountsTitle: 'Entity Counts by Team',
  entityCountsDescription: 'Leads, opportunities, accounts, and contacts per team',
  entityCountsEmptyMessage: 'No teams visible in chart',
  entityCountsEmptyHint: 'Click on team cards above to show their data in the chart',
  selectionCountLabel: count => `${count} team${count === 1 ? '' : 's'}`,
  opportunitiesPerMemberLabel: 'Opportunities/Member',
  winsPerMemberLabel: 'Wins/Member',
  teamSizeLabel: 'Team Size',
  includeTeamSizeMetric: true
}

const EMPLOYEE_LABELS: ComparisonChartLabels = {
  comparisonTitle: 'Employee Comparison',
  comparisonDescription: 'Revenue performance across selected employees',
  comparisonEmptyMessage: 'No employees visible in chart',
  comparisonEmptyHint: 'Click on employee cards above to show their data in the chart',
  radarTitle: 'Employee Performance Profile',
  radarEmptyTitle: 'No employees selected',
  radarEmptyDescription: 'Select employees to view their performance profile.',
  entityCountsTitle: 'Entity Counts by Employee',
  entityCountsDescription: 'Leads, opportunities, accounts, and contacts per employee',
  entityCountsEmptyMessage: 'No employees visible in chart',
  entityCountsEmptyHint: 'Click on employee cards above to show their data in the chart',
  selectionCountLabel: count => `${count} employee${count === 1 ? '' : 's'}`,
  opportunitiesPerMemberLabel: 'Opportunities',
  winsPerMemberLabel: 'Wins',
  teamSizeLabel: 'Team Size',
  includeTeamSizeMetric: false
}

export const getComparisonChartLabels = (variant: ComparisonChartVariant = 'team'): ComparisonChartLabels => {
  return variant === 'employee' ? EMPLOYEE_LABELS : TEAM_LABELS
}
