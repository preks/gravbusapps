import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'

// Extended type with id property for DataTable compatibility
type TaskExpertRow = PromptODM & { id: string }

type TranslationFn = (key: string) => string

const formatDateTime = (iso: string | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

const parseToolsCount = (raw: string[] | undefined): number => raw?.length ?? 0

export const createTaskExpertColumns = (
  t: TranslationFn,
  workspaceMap?: Record<string, string>
): ColumnDef<TaskExpertRow>[] => [
  {
    id: 'name',
    accessorKey: 'name',
    header: t('column-name'),
    size: 200,
    meta: { type: 'text' as const },
    cell: ({ row }) => (
      <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
        <span className="gba:font-medium gba:truncate gba:flex-1 gba:min-w-0" title={row.original.name}>
          {row.original.name}
        </span>
        {row.original.is_public && <Badge variant="success">{t('badge-public')}</Badge>}
      </div>
    )
  },
  {
    id: 'agentType',
    header: t('column-agent-type'),
    size: 120,
    accessorFn: row => row.agent_type || '',
    cell: ({ row }) => {
      const agentType = row.original.agent_type
      if (agentType === 'everyai') {
        return <Badge variant="default">{t('agent-type-everyai')}</Badge>
      }
      if (agentType === 'general') {
        return <Badge variant="info">{t('agent-type-general')}</Badge>
      }
      if (agentType === 'decision') {
        return <Badge variant="warning">{t('agent-type-decision')}</Badge>
      }
      return <Badge variant="secondary">{t('agent-type-flow')}</Badge>
    }
  },
  {
    id: 'workspace',
    header: t('column-workspace'),
    size: 150,
    enableSorting: false,
    accessorFn: row => {
      const wsId = row.workspace?.id
      return wsId && workspaceMap?.[wsId] ? workspaceMap[wsId] : wsId || '—'
    },
    cell: ({ row }) => {
      const wsId = row.original.workspace?.id
      const name = wsId && workspaceMap?.[wsId] ? workspaceMap[wsId] : wsId || '—'
      return (
        <span className="gba:text-sm gba:truncate" title={name}>
          {name}
        </span>
      )
    }
  },
  {
    id: 'tools',
    header: t('column-tools'),
    size: 140,
    meta: { align: 'right' },
    enableSorting: false,
    accessorFn: row => parseToolsCount(row.tools),
    cell: ({ row }) => {
      const count = parseToolsCount(row.original.tools)

      return (
        <div className="gba:flex gba:justify-end">
          <Badge variant="secondary">{count}</Badge>
        </div>
      )
    }
  },
  {
    id: 'knowledgeSources',
    header: t('column-knowledge-sources'),
    size: 160,
    meta: { align: 'right' },
    enableSorting: false,
    accessorFn: row => (Array.isArray(row.knowledge_sources) ? row.knowledge_sources.length : 0),
    cell: ({ row }) => {
      const count = Array.isArray(row.original.knowledge_sources) ? row.original.knowledge_sources.length : 0
      return (
        <div className="gba:flex gba:justify-end">
          <Badge variant="secondary">{count}</Badge>
        </div>
      )
    }
  },
  {
    id: 'createdAt',
    header: t('column-created-at'),
    size: 170,
    accessorFn: row => row.created_at || '',
    cell: ({ row }) => <div className="gba:text-right gba:text-sm">{formatDateTime(row.original.created_at)}</div>,
    meta: { align: 'right' }
  },
  {
    id: 'version',
    header: t('column-version'),
    size: 100,
    meta: { align: 'right' },
    accessorFn: row => row.version,
    cell: ({ row }) => <div className="gba:text-right">v{row.original.version}</div>
  }
]

export const taskExpertSortableColumns = [
  { id: 'name', label: 'Name' },
  { id: 'agentType', label: 'Type' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'tools', label: 'Tools' },
  { id: 'knowledgeSources', label: 'Knowledge sources' },
  { id: 'createdAt', label: 'Last updated' },
  { id: 'version', label: 'Version' }
]

export const getDefaultVisibleColumns = (): string[] => [
  'name',
  'agentType',
  'workspace',
  'tools',
  'knowledgeSources',
  'createdAt',
  'version'
]
