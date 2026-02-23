import React, { useCallback, useState } from 'react'
import { Card, Spinner, toast } from '@newwork/nw-design-system'
import { Kanban, Users, Zap, FileText, Bug } from 'lucide-react'
import type { Board } from '../../types'

interface BoardsHomeTemplatesProps {
  onCreateBoard: (board: Partial<Board>) => Promise<Board | null>
  onBoardCreated: (boardId: string) => Promise<void>
  'data-testid'?: string
}

interface TemplateConfig {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  columns: Array<{
    id: string
    name: string
    label: string
    type: string
    order: number
    isPrimary?: boolean
    isVisible: boolean
    isEditable: boolean
    isRequired: boolean
    isUnique: boolean
    selectOptions?: Array<{ value: string; label: string; colorToken: string }>
    statusConfig?: { doneValues?: string[]; blockedValues?: string[] }
  }>
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: 'project-tracker',
    name: 'Project Tracker',
    description: 'Track tasks, deadlines, and assignees',
    icon: <Kanban className="gba:w-5 gba:h-5" />,
    columns: [
      {
        id: 'name',
        name: 'name',
        label: 'Task',
        type: 'text',
        order: 0,
        isPrimary: true,
        isVisible: true,
        isEditable: true,
        isRequired: true,
        isUnique: false
      },
      {
        id: 'status',
        name: 'status',
        label: 'Status',
        type: 'status',
        order: 1,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        selectOptions: [
          { value: 'todo', label: 'To Do', colorToken: 'muted' },
          { value: 'in_progress', label: 'In Progress', colorToken: 'info' },
          { value: 'review', label: 'Review', colorToken: 'warning' },
          { value: 'done', label: 'Done', colorToken: 'success' }
        ],
        statusConfig: { doneValues: ['done'], blockedValues: [] }
      },
      {
        id: 'assignee',
        name: 'assignee',
        label: 'Assignee',
        type: 'people',
        order: 2,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false
      },
      {
        id: 'dueDate',
        name: 'dueDate',
        label: 'Due Date',
        type: 'date',
        order: 3,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false
      },
      {
        id: 'priority',
        name: 'priority',
        label: 'Priority',
        type: 'status',
        order: 4,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        selectOptions: [
          { value: 'low', label: 'Low', colorToken: 'muted' },
          { value: 'medium', label: 'Medium', colorToken: 'warning' },
          { value: 'high', label: 'High', colorToken: 'destructive' },
          { value: 'critical', label: 'Critical', colorToken: 'destructive' }
        ]
      }
    ]
  },
  {
    id: 'crm-pipeline',
    name: 'CRM Pipeline',
    description: 'Manage deals from lead to close',
    icon: <Users className="gba:w-5 gba:h-5" />,
    columns: [
      {
        id: 'company',
        name: 'company',
        label: 'Company',
        type: 'text',
        order: 0,
        isPrimary: true,
        isVisible: true,
        isEditable: true,
        isRequired: true,
        isUnique: false
      },
      {
        id: 'contact',
        name: 'contact',
        label: 'Contact',
        type: 'text',
        order: 1,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false
      },
      {
        id: 'dealValue',
        name: 'dealValue',
        label: 'Deal Value',
        type: 'currency',
        order: 2,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false
      },
      {
        id: 'stage',
        name: 'stage',
        label: 'Stage',
        type: 'status',
        order: 3,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        selectOptions: [
          { value: 'lead', label: 'Lead', colorToken: 'muted' },
          { value: 'qualified', label: 'Qualified', colorToken: 'info' },
          { value: 'proposal', label: 'Proposal', colorToken: 'warning' },
          { value: 'negotiation', label: 'Negotiation', colorToken: 'warning' },
          { value: 'won', label: 'Won', colorToken: 'success' },
          { value: 'lost', label: 'Lost', colorToken: 'destructive' }
        ],
        statusConfig: { doneValues: ['won', 'lost'] }
      },
      {
        id: 'nextAction',
        name: 'nextAction',
        label: 'Next Action',
        type: 'date',
        order: 4,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false
      }
    ]
  },
  {
    id: 'sprint-board',
    name: 'Sprint Board',
    description: 'Agile sprints with story points',
    icon: <Zap className="gba:w-5 gba:h-5" />,
    columns: [
      {
        id: 'task',
        name: 'task',
        label: 'Task',
        type: 'text',
        order: 0,
        isPrimary: true,
        isVisible: true,
        isEditable: true,
        isRequired: true,
        isUnique: false
      },
      {
        id: 'storyPoints',
        name: 'storyPoints',
        label: 'Story Points',
        type: 'number',
        order: 1,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false
      },
      {
        id: 'sprint',
        name: 'sprint',
        label: 'Sprint',
        type: 'status',
        order: 2,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        selectOptions: [
          { value: 'backlog', label: 'Backlog', colorToken: 'muted' },
          { value: 'sprint-1', label: 'Sprint 1', colorToken: 'info' },
          { value: 'sprint-2', label: 'Sprint 2', colorToken: 'warning' }
        ]
      },
      {
        id: 'assignee',
        name: 'assignee',
        label: 'Assignee',
        type: 'people',
        order: 3,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false
      },
      {
        id: 'status',
        name: 'status',
        label: 'Status',
        type: 'status',
        order: 4,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        selectOptions: [
          { value: 'todo', label: 'To Do', colorToken: 'muted' },
          { value: 'in_progress', label: 'In Progress', colorToken: 'info' },
          { value: 'done', label: 'Done', colorToken: 'success' }
        ],
        statusConfig: { doneValues: ['done'] }
      }
    ]
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: 'Plan and schedule content',
    icon: <FileText className="gba:w-5 gba:h-5" />,
    columns: [
      {
        id: 'title',
        name: 'title',
        label: 'Title',
        type: 'text',
        order: 0,
        isPrimary: true,
        isVisible: true,
        isEditable: true,
        isRequired: true,
        isUnique: false
      },
      {
        id: 'publishDate',
        name: 'publishDate',
        label: 'Publish Date',
        type: 'date',
        order: 1,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false
      },
      {
        id: 'author',
        name: 'author',
        label: 'Author',
        type: 'people',
        order: 2,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false
      },
      {
        id: 'channel',
        name: 'channel',
        label: 'Channel',
        type: 'status',
        order: 3,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        selectOptions: [
          { value: 'blog', label: 'Blog', colorToken: 'info' },
          { value: 'social', label: 'Social', colorToken: 'warning' },
          { value: 'email', label: 'Email', colorToken: 'success' },
          { value: 'video', label: 'Video', colorToken: 'primary' }
        ]
      },
      {
        id: 'status',
        name: 'status',
        label: 'Status',
        type: 'status',
        order: 4,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        selectOptions: [
          { value: 'idea', label: 'Idea', colorToken: 'muted' },
          { value: 'draft', label: 'Draft', colorToken: 'info' },
          { value: 'review', label: 'Review', colorToken: 'warning' },
          { value: 'published', label: 'Published', colorToken: 'success' }
        ],
        statusConfig: { doneValues: ['published'] }
      }
    ]
  },
  {
    id: 'bug-tracker',
    name: 'Bug Tracker',
    description: 'Report and resolve issues',
    icon: <Bug className="gba:w-5 gba:h-5" />,
    columns: [
      {
        id: 'title',
        name: 'title',
        label: 'Bug Title',
        type: 'text',
        order: 0,
        isPrimary: true,
        isVisible: true,
        isEditable: true,
        isRequired: true,
        isUnique: false
      },
      {
        id: 'severity',
        name: 'severity',
        label: 'Severity',
        type: 'status',
        order: 1,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        selectOptions: [
          { value: 'low', label: 'Low', colorToken: 'muted' },
          { value: 'medium', label: 'Medium', colorToken: 'warning' },
          { value: 'high', label: 'High', colorToken: 'destructive' },
          { value: 'critical', label: 'Critical', colorToken: 'destructive' }
        ]
      },
      {
        id: 'assignedTo',
        name: 'assignedTo',
        label: 'Assigned To',
        type: 'people',
        order: 2,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false
      },
      {
        id: 'dueDate',
        name: 'dueDate',
        label: 'Due Date',
        type: 'date',
        order: 3,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false
      },
      {
        id: 'status',
        name: 'status',
        label: 'Status',
        type: 'status',
        order: 4,
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        selectOptions: [
          { value: 'open', label: 'Open', colorToken: 'info' },
          { value: 'in_progress', label: 'In Progress', colorToken: 'warning' },
          { value: 'resolved', label: 'Resolved', colorToken: 'success' },
          { value: 'closed', label: 'Closed', colorToken: 'muted' }
        ],
        statusConfig: { doneValues: ['resolved', 'closed'] }
      }
    ]
  }
]

export const BoardsHomeTemplates: React.FC<BoardsHomeTemplatesProps> = ({
  onCreateBoard,
  onBoardCreated,
  'data-testid': testId = 'boards-home-templates'
}) => {
  const [creating, setCreating] = useState<string | null>(null)

  const handleCreate = useCallback(
    async (tpl: TemplateConfig) => {
      setCreating(tpl.id)
      try {
        const board = await onCreateBoard({
          name: tpl.name,
          sheets: [
            {
              id: '',
              name: 'Main',
              description: '',
              position: 0,
              groups: [],
              columns: tpl.columns as any,
              views: [{ id: 'v_default', name: 'Table', type: 'table', isDefault: true, config: { type: 'table' } }],
              settings: {
                allowAdd: true,
                allowEdit: true,
                allowDelete: true,
                allowExport: true,
                allowImport: true,
                rowsPerPage: 50,
                showRowNumbers: false
              }
            }
          ]
        })
        if (!board) {
          toast.error('Failed to create board from template')
          return
        }
        toast.success(`${tpl.name} board created`)
        await onBoardCreated(board.id)
      } catch {
        toast.error('Something went wrong creating the board')
      } finally {
        setCreating(null)
      }
    },
    [onCreateBoard, onBoardCreated]
  )

  return (
    <section data-testid={testId}>
      <h3 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4 gba:uppercase gba:tracking-wide">
        Quick start
      </h3>
      <div className="gba:space-y-2">
        {TEMPLATES.map(tpl => (
          <Card
            key={tpl.id}
            className="gba:cursor-pointer gba:hover:bg-muted/30 gba:transition-colors"
            onClick={() => !creating && handleCreate(tpl)}
            data-testid={`${testId}-${tpl.id}`}
          >
            <div className="gba:flex gba:items-center gba:gap-3 gba:p-3">
              <div className="gba:w-9 gba:h-9 gba:rounded-lg gba:bg-accent/50 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:text-accent-foreground">
                {creating === tpl.id ? <Spinner className="gba:w-4 gba:h-4" /> : tpl.icon}
              </div>
              <div className="gba:flex-1 gba:min-w-0">
                <p className="gba:text-sm gba:font-medium gba:text-foreground">{tpl.name}</p>
                <p className="gba:text-xs gba:text-muted-foreground">{tpl.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
