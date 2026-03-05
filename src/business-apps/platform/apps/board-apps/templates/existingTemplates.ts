import type { TemplateConfig } from './boardTemplateTypes'
import {
  col,
  statusCol,
  selectCol,
  priorityCol,
  kpiWidget,
  chartWidget,
  dashboardView,
  daysFromNow
} from './boardTemplateTypes'

export const PROJECT_TRACKER: TemplateConfig = {
  id: 'project-tracker',
  name: 'Project Tracker',
  description: 'Track tasks, deadlines, and assignees across your project',
  iconName: 'Kanban',
  sheets: [
    {
      name: 'Tasks',
      columns: [
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
        priorityCol('priority', 'Priority', 5)
      ],
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
          chartWidget('w4', 'Tasks by Priority', 'bar', 'priority', 'name', 2, 'count')
        ])
      ],
      groups: [
        { id: 'grp_0', name: 'To Do', order: 0, colorToken: 'muted' },
        { id: 'grp_1', name: 'In Progress', order: 1, colorToken: 'info' },
        { id: 'grp_2', name: 'Review', order: 2, colorToken: 'warning' },
        { id: 'grp_3', name: 'Done', order: 3, colorToken: 'success' }
      ],
      getSeedRows: () => [
        {
          name: 'Define project scope and objectives',
          status: 'done',
          priority: 'high',
          startDate: daysFromNow(-14),
          dueDate: daysFromNow(-10)
        },
        {
          name: 'Set up development environment',
          status: 'done',
          priority: 'high',
          startDate: daysFromNow(-12),
          dueDate: daysFromNow(-8)
        },
        {
          name: 'Create wireframes and mockups',
          status: 'done',
          priority: 'medium',
          startDate: daysFromNow(-10),
          dueDate: daysFromNow(-5)
        },
        {
          name: 'Design database schema',
          status: 'in_progress',
          priority: 'high',
          startDate: daysFromNow(-5),
          dueDate: daysFromNow(2)
        },
        {
          name: 'Build authentication module',
          status: 'in_progress',
          priority: 'high',
          startDate: daysFromNow(-3),
          dueDate: daysFromNow(5)
        },
        {
          name: 'Implement REST API endpoints',
          status: 'in_progress',
          priority: 'medium',
          startDate: daysFromNow(-2),
          dueDate: daysFromNow(7)
        },
        {
          name: 'Create dashboard UI components',
          status: 'review',
          priority: 'medium',
          startDate: daysFromNow(-4),
          dueDate: daysFromNow(1)
        },
        {
          name: 'Write unit tests for API layer',
          status: 'todo',
          priority: 'medium',
          startDate: daysFromNow(1),
          dueDate: daysFromNow(8)
        },
        {
          name: 'Set up CI/CD pipeline',
          status: 'todo',
          priority: 'low',
          startDate: daysFromNow(3),
          dueDate: daysFromNow(10)
        },
        {
          name: 'Performance testing and optimization',
          status: 'todo',
          priority: 'medium',
          startDate: daysFromNow(5),
          dueDate: daysFromNow(12)
        },
        {
          name: 'Security audit and penetration testing',
          status: 'todo',
          priority: 'critical',
          startDate: daysFromNow(8),
          dueDate: daysFromNow(15)
        },
        {
          name: 'User acceptance testing',
          status: 'todo',
          priority: 'high',
          startDate: daysFromNow(10),
          dueDate: daysFromNow(17)
        },
        {
          name: 'Prepare deployment documentation',
          status: 'todo',
          priority: 'low',
          startDate: daysFromNow(12),
          dueDate: daysFromNow(18)
        },
        {
          name: 'Deploy to staging environment',
          status: 'todo',
          priority: 'high',
          startDate: daysFromNow(15),
          dueDate: daysFromNow(20)
        },
        {
          name: 'Go-live and post-launch monitoring',
          status: 'todo',
          priority: 'critical',
          startDate: daysFromNow(18),
          dueDate: daysFromNow(22)
        }
      ]
    }
  ]
}

export const CRM_PIPELINE: TemplateConfig = {
  id: 'crm-pipeline',
  name: 'CRM Pipeline',
  description: 'Manage deals from lead to close with full visibility',
  iconName: 'Users',
  sheets: [
    {
      name: 'Deals',
      columns: [
        col('company', 'Company', 'text', 0, { isPrimary: true, isRequired: true }),
        col('contact', 'Contact', 'text', 1),
        col('dealValue', 'Deal Value', 'currency', 2),
        statusCol(
          'stage',
          'Stage',
          3,
          [
            { value: 'lead', label: 'Lead', colorToken: 'muted' },
            { value: 'qualified', label: 'Qualified', colorToken: 'info' },
            { value: 'proposal', label: 'Proposal', colorToken: 'warning' },
            { value: 'negotiation', label: 'Negotiation', colorToken: 'warning' },
            { value: 'won', label: 'Won', colorToken: 'success' },
            { value: 'lost', label: 'Lost', colorToken: 'destructive' }
          ],
          ['won', 'lost']
        ),
        col('nextAction', 'Next Action', 'date', 4),
        col('email', 'Email', 'email', 5)
      ],
      views: [
        { id: 'v_table', name: 'Table', type: 'table', isDefault: true, config: { type: 'table' } },
        {
          id: 'v_kanban',
          name: 'Pipeline',
          type: 'kanban',
          isDefault: false,
          config: { type: 'kanban', statusColumn: 'stage', titleColumn: 'company' }
        },
        dashboardView('v_dash', [
          kpiWidget('w1', 'Pipeline Value', 'dealValue', 'sum', 1, 'currency'),
          kpiWidget('w2', 'Total Deals', 'company', 'count'),
          chartWidget('w3', 'Deals by Stage', 'bar', 'stage', 'company', 2, 'count'),
          chartWidget('w4', 'Revenue by Stage', 'bar', 'stage', 'dealValue', 2, 'sum')
        ])
      ],
      groups: [
        { id: 'grp_0', name: 'Prospecting', order: 0, colorToken: 'muted' },
        { id: 'grp_1', name: 'Active Deals', order: 1, colorToken: 'info' },
        { id: 'grp_2', name: 'Closing', order: 2, colorToken: 'warning' },
        { id: 'grp_3', name: 'Closed', order: 3, colorToken: 'success' }
      ],
      getSeedRows: () => [
        {
          company: 'Acme Corp',
          contact: 'Jane Smith',
          dealValue: 45000,
          stage: 'proposal',
          nextAction: daysFromNow(3),
          email: 'jane@acme.com'
        },
        {
          company: 'TechStart Inc',
          contact: 'Bob Johnson',
          dealValue: 12000,
          stage: 'qualified',
          nextAction: daysFromNow(5),
          email: 'bob@techstart.io'
        },
        {
          company: 'Global Dynamics',
          contact: 'Sarah Williams',
          dealValue: 180000,
          stage: 'negotiation',
          nextAction: daysFromNow(1),
          email: 'sarah@globaldyn.com'
        },
        {
          company: 'Pinnacle Group',
          contact: 'Mike Brown',
          dealValue: 7500,
          stage: 'lead',
          nextAction: daysFromNow(7),
          email: 'mike@pinnacle.co'
        },
        {
          company: 'Vertex Solutions',
          contact: 'Lisa Anderson',
          dealValue: 92000,
          stage: 'won',
          nextAction: daysFromNow(-3),
          email: 'lisa@vertex.com'
        },
        {
          company: 'Horizon Media',
          contact: 'David Chen',
          dealValue: 35000,
          stage: 'proposal',
          nextAction: daysFromNow(4),
          email: 'david@horizon.media'
        },
        {
          company: 'Atlas Industries',
          contact: 'Emily Taylor',
          dealValue: 250000,
          stage: 'negotiation',
          nextAction: daysFromNow(2),
          email: 'emily@atlas-ind.com'
        },
        {
          company: 'CoreBridge LLC',
          contact: 'Chris Martinez',
          dealValue: 18000,
          stage: 'qualified',
          nextAction: daysFromNow(6),
          email: 'chris@corebridge.io'
        },
        {
          company: 'Summit Health',
          contact: 'Anna Wilson',
          dealValue: 65000,
          stage: 'lost',
          nextAction: daysFromNow(-5),
          email: 'anna@summithealth.org'
        },
        {
          company: 'Nova Financial',
          contact: 'James Lee',
          dealValue: 42000,
          stage: 'lead',
          nextAction: daysFromNow(10),
          email: 'james@novafinancial.com'
        },
        {
          company: 'Apex Digital',
          contact: 'Rachel Green',
          dealValue: 120000,
          stage: 'won',
          nextAction: daysFromNow(-2),
          email: 'rachel@apexdigital.co'
        },
        {
          company: 'CloudFirst',
          contact: 'Tom Davis',
          dealValue: 28000,
          stage: 'proposal',
          nextAction: daysFromNow(8),
          email: 'tom@cloudfirst.dev'
        }
      ]
    }
  ]
}

export const SPRINT_BOARD: TemplateConfig = {
  id: 'sprint-board',
  name: 'Sprint Board',
  description: 'Agile sprints with story points and task tracking',
  iconName: 'Zap',
  sheets: [
    {
      name: 'Backlog',
      columns: [
        col('name', 'Task', 'text', 0, { isPrimary: true, isRequired: true }),
        col('storyPoints', 'Story Points', 'number', 1),
        selectCol('sprint', 'Sprint', 2, [
          { value: 'backlog', label: 'Backlog', colorToken: 'muted' },
          { value: 'sprint-1', label: 'Sprint 1', colorToken: 'info' },
          { value: 'sprint-2', label: 'Sprint 2', colorToken: 'warning' }
        ]),
        col('assignee', 'Assignee', 'people', 3),
        statusCol(
          'status',
          'Status',
          4,
          [
            { value: 'todo', label: 'To Do', colorToken: 'muted' },
            { value: 'in_progress', label: 'In Progress', colorToken: 'info' },
            { value: 'done', label: 'Done', colorToken: 'success' }
          ],
          ['done']
        ),
        selectCol('type', 'Type', 5, [
          { value: 'feature', label: 'Feature', colorToken: 'info' },
          { value: 'bug', label: 'Bug', colorToken: 'destructive' },
          { value: 'chore', label: 'Chore', colorToken: 'muted' },
          { value: 'improvement', label: 'Improvement', colorToken: 'success' }
        ])
      ],
      views: [
        { id: 'v_table', name: 'Table', type: 'table', isDefault: true, config: { type: 'table' } },
        {
          id: 'v_kanban',
          name: 'Kanban',
          type: 'kanban',
          isDefault: false,
          config: { type: 'kanban', statusColumn: 'status', titleColumn: 'name' }
        },
        dashboardView('v_dash', [
          kpiWidget('w1', 'Total Story Points', 'storyPoints', 'sum'),
          kpiWidget('w2', 'Tasks Count', 'name', 'count'),
          chartWidget('w3', 'Tasks by Status', 'pie', 'status', 'name', 2, 'count'),
          chartWidget('w4', 'Points by Sprint', 'bar', 'sprint', 'storyPoints', 2, 'sum')
        ])
      ],
      groups: [
        { id: 'grp_0', name: 'Backlog', order: 0, colorToken: 'muted' },
        { id: 'grp_1', name: 'Sprint 1', order: 1, colorToken: 'info' },
        { id: 'grp_2', name: 'Sprint 2', order: 2, colorToken: 'warning' }
      ],
      getSeedRows: () => [
        {
          name: 'User login and authentication flow',
          storyPoints: 5,
          sprint: 'sprint-1',
          status: 'done',
          type: 'feature'
        },
        {
          name: 'Dashboard layout and navigation',
          storyPoints: 8,
          sprint: 'sprint-1',
          status: 'done',
          type: 'feature'
        },
        { name: 'Fix header alignment on mobile', storyPoints: 1, sprint: 'sprint-1', status: 'done', type: 'bug' },
        {
          name: 'Global search functionality',
          storyPoints: 5,
          sprint: 'sprint-1',
          status: 'in_progress',
          type: 'feature'
        },
        {
          name: 'User profile settings page',
          storyPoints: 3,
          sprint: 'sprint-1',
          status: 'in_progress',
          type: 'feature'
        },
        { name: 'Fix date picker timezone bug', storyPoints: 1, sprint: 'sprint-1', status: 'done', type: 'bug' },
        { name: 'Real-time notification system', storyPoints: 8, sprint: 'sprint-2', status: 'todo', type: 'feature' },
        { name: 'Export data to CSV and Excel', storyPoints: 3, sprint: 'sprint-2', status: 'todo', type: 'feature' },
        { name: 'Dark mode theme toggle', storyPoints: 2, sprint: 'sprint-2', status: 'todo', type: 'improvement' },
        { name: 'API rate limiting middleware', storyPoints: 5, sprint: 'sprint-2', status: 'todo', type: 'feature' },
        {
          name: 'Responsive mobile navigation',
          storyPoints: 3,
          sprint: 'sprint-2',
          status: 'todo',
          type: 'improvement'
        },
        { name: 'Pagination and infinite scroll', storyPoints: 2, sprint: 'backlog', status: 'todo', type: 'feature' },
        { name: 'Accessibility audit and fixes', storyPoints: 5, sprint: 'backlog', status: 'todo', type: 'chore' },
        { name: 'Upgrade third-party dependencies', storyPoints: 1, sprint: 'backlog', status: 'todo', type: 'chore' },
        { name: 'Add skeleton loading states', storyPoints: 2, sprint: 'sprint-2', status: 'todo', type: 'improvement' }
      ]
    }
  ]
}

export const CONTENT_CALENDAR: TemplateConfig = {
  id: 'content-calendar',
  name: 'Content Calendar',
  description: 'Plan, schedule, and track content across channels',
  iconName: 'FileText',
  sheets: [
    {
      name: 'Content',
      columns: [
        col('title', 'Title', 'text', 0, { isPrimary: true, isRequired: true }),
        col('publishDate', 'Publish Date', 'date', 1),
        col('author', 'Author', 'people', 2),
        selectCol('channel', 'Channel', 3, [
          { value: 'blog', label: 'Blog', colorToken: 'info' },
          { value: 'social', label: 'Social', colorToken: 'warning' },
          { value: 'email', label: 'Email', colorToken: 'success' },
          { value: 'video', label: 'Video', colorToken: 'primary' }
        ]),
        statusCol(
          'status',
          'Status',
          4,
          [
            { value: 'idea', label: 'Idea', colorToken: 'muted' },
            { value: 'draft', label: 'Draft', colorToken: 'info' },
            { value: 'review', label: 'Review', colorToken: 'warning' },
            { value: 'published', label: 'Published', colorToken: 'success' }
          ],
          ['published']
        )
      ],
      views: [
        { id: 'v_table', name: 'Table', type: 'table', isDefault: true, config: { type: 'table' } },
        {
          id: 'v_calendar',
          name: 'Calendar',
          type: 'calendar',
          isDefault: false,
          config: { type: 'calendar', dateColumn: 'publishDate', titleColumn: 'title' }
        },
        dashboardView('v_dash', [
          kpiWidget('w1', 'Total Content', 'title', 'count'),
          kpiWidget('w2', 'Published', 'status', 'count'),
          chartWidget('w3', 'Content by Channel', 'pie', 'channel', 'title', 2, 'count'),
          chartWidget('w4', 'Content by Status', 'bar', 'status', 'title', 2, 'count')
        ])
      ],
      groups: [
        { id: 'grp_0', name: 'Blog', order: 0, colorToken: 'info' },
        { id: 'grp_1', name: 'Social', order: 1, colorToken: 'warning' },
        { id: 'grp_2', name: 'Email', order: 2, colorToken: 'success' },
        { id: 'grp_3', name: 'Video', order: 3, colorToken: 'primary' }
      ],
      getSeedRows: () => [
        {
          title: 'How to Scale Remote Teams Effectively',
          publishDate: daysFromNow(-10),
          channel: 'blog',
          status: 'published'
        },
        { title: 'Product Launch Announcement', publishDate: daysFromNow(-7), channel: 'social', status: 'published' },
        { title: 'Monthly Customer Newsletter', publishDate: daysFromNow(-2), channel: 'email', status: 'review' },
        { title: 'Customer Success Story: Acme Corp', publishDate: daysFromNow(1), channel: 'video', status: 'draft' },
        { title: 'SEO Best Practices for 2026', publishDate: daysFromNow(4), channel: 'blog', status: 'draft' },
        { title: 'Behind the Scenes at Our Office', publishDate: daysFromNow(6), channel: 'social', status: 'idea' },
        { title: 'Webinar Recap: Future of AI', publishDate: daysFromNow(3), channel: 'email', status: 'review' },
        { title: 'Product Demo Walkthrough', publishDate: daysFromNow(8), channel: 'video', status: 'idea' },
        { title: 'Industry Trends Report Q1', publishDate: daysFromNow(12), channel: 'blog', status: 'idea' },
        { title: 'Employee Spotlight Series', publishDate: daysFromNow(14), channel: 'social', status: 'idea' },
        { title: 'Holiday Promotion Campaign', publishDate: daysFromNow(20), channel: 'email', status: 'idea' },
        { title: 'Year in Review: Key Milestones', publishDate: daysFromNow(25), channel: 'blog', status: 'idea' }
      ]
    }
  ]
}

export const BUG_TRACKER: TemplateConfig = {
  id: 'bug-tracker',
  name: 'Bug Tracker',
  description: 'Report, triage, and resolve issues systematically',
  iconName: 'Bug',
  sheets: [
    {
      name: 'Bugs',
      columns: [
        col('title', 'Bug Title', 'text', 0, { isPrimary: true, isRequired: true }),
        priorityCol('severity', 'Severity', 1),
        col('assignedTo', 'Assigned To', 'people', 2),
        col('dueDate', 'Due Date', 'date', 3),
        statusCol(
          'status',
          'Status',
          4,
          [
            { value: 'open', label: 'Open', colorToken: 'info' },
            { value: 'in_progress', label: 'In Progress', colorToken: 'warning' },
            { value: 'resolved', label: 'Resolved', colorToken: 'success' },
            { value: 'closed', label: 'Closed', colorToken: 'muted' }
          ],
          ['resolved', 'closed']
        ),
        selectCol('component', 'Component', 5, [
          { value: 'frontend', label: 'Frontend', colorToken: 'info' },
          { value: 'backend', label: 'Backend', colorToken: 'warning' },
          { value: 'api', label: 'API', colorToken: 'primary' },
          { value: 'database', label: 'Database', colorToken: 'muted' },
          { value: 'infra', label: 'Infrastructure', colorToken: 'success' }
        ])
      ],
      views: [
        { id: 'v_table', name: 'Table', type: 'table', isDefault: true, config: { type: 'table' } },
        {
          id: 'v_kanban',
          name: 'Kanban',
          type: 'kanban',
          isDefault: false,
          config: { type: 'kanban', statusColumn: 'status', titleColumn: 'title' }
        },
        dashboardView('v_dash', [
          kpiWidget('w1', 'Open Bugs', 'title', 'count'),
          kpiWidget('w2', 'Critical Issues', 'severity', 'count'),
          chartWidget('w3', 'Bugs by Severity', 'bar', 'severity', 'title', 2, 'count'),
          chartWidget('w4', 'Bugs by Component', 'pie', 'component', 'title', 2, 'count')
        ])
      ],
      groups: [
        { id: 'grp_0', name: 'Critical', order: 0, colorToken: 'destructive' },
        { id: 'grp_1', name: 'High Priority', order: 1, colorToken: 'destructive' },
        { id: 'grp_2', name: 'Medium Priority', order: 2, colorToken: 'warning' },
        { id: 'grp_3', name: 'Low Priority', order: 3, colorToken: 'muted' }
      ],
      getSeedRows: () => [
        {
          title: 'Login fails on Safari when using SSO',
          severity: 'high',
          dueDate: daysFromNow(2),
          status: 'open',
          component: 'frontend'
        },
        {
          title: 'Dashboard loading takes 30+ seconds',
          severity: 'critical',
          dueDate: daysFromNow(1),
          status: 'in_progress',
          component: 'backend'
        },
        {
          title: 'Export button not responding on click',
          severity: 'medium',
          dueDate: daysFromNow(5),
          status: 'open',
          component: 'frontend'
        },
        {
          title: 'Date format inconsistent in reports',
          severity: 'low',
          dueDate: daysFromNow(-3),
          status: 'resolved',
          component: 'frontend'
        },
        {
          title: 'User avatar not displaying correctly',
          severity: 'medium',
          dueDate: daysFromNow(4),
          status: 'in_progress',
          component: 'frontend'
        },
        {
          title: 'Mobile layout breaks on tablet devices',
          severity: 'high',
          dueDate: daysFromNow(3),
          status: 'open',
          component: 'frontend'
        },
        {
          title: 'Email notifications delayed by hours',
          severity: 'high',
          dueDate: daysFromNow(2),
          status: 'in_progress',
          component: 'infra'
        },
        {
          title: 'Search returns duplicate results',
          severity: 'medium',
          dueDate: daysFromNow(7),
          status: 'open',
          component: 'api'
        },
        {
          title: 'File upload size limit not enforced',
          severity: 'critical',
          dueDate: daysFromNow(1),
          status: 'open',
          component: 'backend'
        },
        {
          title: 'Dark mode text contrast too low',
          severity: 'low',
          dueDate: daysFromNow(-5),
          status: 'resolved',
          component: 'frontend'
        }
      ]
    }
  ]
}
