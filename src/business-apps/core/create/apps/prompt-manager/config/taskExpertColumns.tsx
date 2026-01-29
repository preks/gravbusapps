import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'

// Extended type with id property for DataTable compatibility
type TaskExpertRow = PromptODM & { id: string }

type TranslationFn = (key: string) => string

export const createTaskExpertColumns = (t: TranslationFn): ColumnDef<TaskExpertRow>[] => [
  {
    id: 'name',
    accessorKey: 'name',
    header: t('column-name'),
    size: 200,
    cell: ({ row }) => (
      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:font-medium">{row.original.name}</span>
        {row.original.is_public && <Badge variant="success">{t('badge-public')}</Badge>}
      </div>
    )
  },
  {
    id: 'agentType',
    header: t('column-agent-type'),
    size: 120,
    cell: ({ row }) => {
      const agentType = row.original.agent_type
      if (agentType === 'everyai') {
        return <Badge variant="default">{t('agent-type-everyai')}</Badge>
      }
      if (agentType === 'general') {
        return <Badge variant="info">{t('agent-type-general')}</Badge>
      }
      return <Badge variant="secondary">{t('agent-type-flow')}</Badge>
    }
  },
  {
    id: 'specialty',
    accessorKey: 'specialty',
    header: t('column-specialty'),
    size: 180,
    meta: { type: 'text' }
  },
  {
    id: 'version',
    header: t('column-version'),
    size: 100,
    meta: { align: 'right' },
    cell: ({ row }) => <div className="gba:text-right">v{row.original.version}</div>
  }
]

export const taskExpertSortableColumns = [
  { id: 'name', label: 'Name' },
  { id: 'agentType', label: 'Agent Type' },
  { id: 'specialty', label: 'Specialty' },
  { id: 'version', label: 'Version' }
]

export const getDefaultVisibleColumns = (): string[] => ['name', 'agentType', 'specialty', 'version']
