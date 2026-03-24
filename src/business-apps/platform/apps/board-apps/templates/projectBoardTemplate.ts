import type { TemplateConfig } from './boardTemplateTypes'
import { col, statusCol, selectCol, priorityCol, kpiWidget, chartWidget, dashboardView } from './boardTemplateTypes'

export interface ProjectBoardInput {
  project: {
    id: string
    name: string
    description?: string
    validFrom: string
    validTo: string
    status: string
    projectType: string
    hoursBudget?: number
  }
  members: Array<{
    employeeId: string
    role?: string
    name?: string
  }>
}

function dateAtPercent(start: Date, totalDays: number, pct: number): string {
  const d = new Date(start)
  d.setDate(d.getDate() + Math.round(totalDays * pct))
  return d.toISOString().split('T')[0]
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000))
}

function generateProjectTasks(start: Date, totalDays: number): Record<string, unknown>[] {
  return [
    // Planning (0–15%)
    {
      name: 'Kickoff meeting',
      status: 'done',
      priority: 'high',
      phase: 'planning',
      startDate: dateAtPercent(start, totalDays, 0),
      dueDate: dateAtPercent(start, totalDays, 0.02)
    },
    {
      name: 'Define requirements and scope',
      status: 'done',
      priority: 'high',
      phase: 'planning',
      startDate: dateAtPercent(start, totalDays, 0.01),
      dueDate: dateAtPercent(start, totalDays, 0.08)
    },
    {
      name: 'Stakeholder alignment',
      status: 'in_progress',
      priority: 'medium',
      phase: 'planning',
      startDate: dateAtPercent(start, totalDays, 0.05),
      dueDate: dateAtPercent(start, totalDays, 0.12)
    },
    {
      name: 'Resource planning',
      status: 'in_progress',
      priority: 'high',
      phase: 'planning',
      startDate: dateAtPercent(start, totalDays, 0.08),
      dueDate: dateAtPercent(start, totalDays, 0.15)
    },
    // Execution (15–75%)
    {
      name: 'Setup project infrastructure',
      status: 'todo',
      priority: 'high',
      phase: 'execution',
      startDate: dateAtPercent(start, totalDays, 0.15),
      dueDate: dateAtPercent(start, totalDays, 0.22)
    },
    {
      name: 'Core deliverable — Phase 1',
      status: 'todo',
      priority: 'high',
      phase: 'execution',
      startDate: dateAtPercent(start, totalDays, 0.2),
      dueDate: dateAtPercent(start, totalDays, 0.35)
    },
    {
      name: 'Core deliverable — Phase 2',
      status: 'todo',
      priority: 'high',
      phase: 'execution',
      startDate: dateAtPercent(start, totalDays, 0.3),
      dueDate: dateAtPercent(start, totalDays, 0.5)
    },
    {
      name: 'Integration and testing',
      status: 'todo',
      priority: 'medium',
      phase: 'execution',
      startDate: dateAtPercent(start, totalDays, 0.45),
      dueDate: dateAtPercent(start, totalDays, 0.6)
    },
    {
      name: 'Progress review and adjustments',
      status: 'todo',
      priority: 'medium',
      phase: 'execution',
      startDate: dateAtPercent(start, totalDays, 0.5),
      dueDate: dateAtPercent(start, totalDays, 0.55)
    },
    {
      name: 'Finalize deliverables',
      status: 'todo',
      priority: 'high',
      phase: 'execution',
      startDate: dateAtPercent(start, totalDays, 0.6),
      dueDate: dateAtPercent(start, totalDays, 0.75)
    },
    // Review (70–90%)
    {
      name: 'Quality assurance review',
      status: 'todo',
      priority: 'high',
      phase: 'review',
      startDate: dateAtPercent(start, totalDays, 0.7),
      dueDate: dateAtPercent(start, totalDays, 0.8)
    },
    {
      name: 'Stakeholder sign-off',
      status: 'todo',
      priority: 'critical',
      phase: 'review',
      startDate: dateAtPercent(start, totalDays, 0.78),
      dueDate: dateAtPercent(start, totalDays, 0.88)
    },
    // Closure (85–100%)
    {
      name: 'Prepare final documentation',
      status: 'todo',
      priority: 'medium',
      phase: 'closure',
      startDate: dateAtPercent(start, totalDays, 0.85),
      dueDate: dateAtPercent(start, totalDays, 0.92)
    },
    {
      name: 'Lessons learned and retrospective',
      status: 'todo',
      priority: 'low',
      phase: 'closure',
      startDate: dateAtPercent(start, totalDays, 0.9),
      dueDate: dateAtPercent(start, totalDays, 0.95)
    },
    {
      name: 'Project closure and handoff',
      status: 'todo',
      priority: 'critical',
      phase: 'closure',
      startDate: dateAtPercent(start, totalDays, 0.93),
      dueDate: dateAtPercent(start, totalDays, 1.0)
    }
  ]
}

export function buildProjectBoardTemplate(input: ProjectBoardInput): TemplateConfig {
  const { project } = input
  const start = new Date(project.validFrom)
  const end = new Date(project.validTo)
  const totalDays = daysBetween(start, end)

  const columns = [
    col('name', 'Task', 'text', 0, { isPrimary: true, isRequired: true }),
    statusCol(
      'status',
      'Status',
      1,
      [
        { value: 'todo', label: 'To Do', colorToken: 'muted' },
        { value: 'in_progress', label: 'In Progress', colorToken: 'info' },
        { value: 'review', label: 'Review', colorToken: 'warning' },
        { value: 'done', label: 'Done', colorToken: 'success' }
      ],
      ['done']
    ),
    col('assignee', 'Assignee', 'people', 2),
    col('startDate', 'Start Date', 'date', 3),
    col('dueDate', 'Due Date', 'date', 4),
    priorityCol('priority', 'Priority', 5),
    selectCol('phase', 'Phase', 6, [
      { value: 'planning', label: 'Planning', colorToken: 'info' },
      { value: 'execution', label: 'Execution', colorToken: 'warning' },
      { value: 'review', label: 'Review', colorToken: 'primary' },
      { value: 'closure', label: 'Closure', colorToken: 'success' }
    ])
  ]

  if (project.hoursBudget) {
    columns.push(col('estimatedHours', 'Estimated Hours', 'number', 7))
  }

  return {
    id: `project-board-${project.id}`,
    name: project.name,
    description: project.description || `Project board for ${project.name}`,
    iconName: 'Kanban',
    sheets: [
      {
        name: 'Tasks',
        columns,
        views: [
          { id: 'v_table', name: 'Table', type: 'table', isDefault: true, config: { type: 'table' } },
          {
            id: 'v_kanban',
            name: 'Kanban',
            type: 'kanban',
            isDefault: false,
            config: { type: 'kanban', statusColumn: 'status', titleColumn: 'name' }
          },
          {
            id: 'v_timeline',
            name: 'Timeline',
            type: 'timeline',
            isDefault: false,
            config: { type: 'timeline', startDateColumn: 'startDate', endDateColumn: 'dueDate', titleColumn: 'name' }
          },
          dashboardView('v_dash', [
            kpiWidget('w1', 'Total Tasks', 'name', 'count'),
            kpiWidget('w2', 'Completed', 'status', 'count'),
            chartWidget('w3', 'Tasks by Status', 'pie', 'status', 'name', 2, 'count'),
            chartWidget('w4', 'Tasks by Phase', 'bar', 'phase', 'name', 2, 'count')
          ])
        ],
        groups: [
          { id: 'grp_0', name: 'Planning', order: 0, colorToken: 'info' },
          { id: 'grp_1', name: 'Execution', order: 1, colorToken: 'warning' },
          { id: 'grp_2', name: 'Review', order: 2, colorToken: 'primary' },
          { id: 'grp_3', name: 'Closure', order: 3, colorToken: 'success' }
        ],
        getSeedRows: () => generateProjectTasks(start, totalDays)
      }
    ]
  }
}
