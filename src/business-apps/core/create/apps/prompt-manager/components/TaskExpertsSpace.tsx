import React, { useCallback, useState, useEffect, useMemo } from 'react'
import {
  DataDisplay,
  DataTable,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { SortingState } from '@tanstack/react-table'
import { useTaskExperts } from '../hooks/useTaskExperts'
import { useAgentMeshClient } from '@/business-apps/platform/apps/agent-mesh/hooks/useAgentMeshClient'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { TaskExpertTestPanel } from './TaskExpertTestPanel'
import { createTaskExpertColumns } from '../config/taskExpertColumns'
import type { PromptODM, WorkspaceODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'

// Extended type with id property for DataTable compatibility
type TaskExpertRow = PromptODM & { id: string }

interface TaskExpertsSpaceProps extends BusinessAppContextProps {
  translations: { enUS: string; deDE: string; roRO: string }
  onViewPrompt: (id: string, name: string) => void
  onEditPrompt: (id: string, name: string) => void
  refreshKey: number
}

const buildSortParam = (sorting: SortingState): string | null => {
  if (!sorting || sorting.length === 0) return null

  // We only support server-side sorting on the Prompt Manager fields that are mapped.
  const allowed = new Set(['name', 'agentType', 'createdAt', 'version'])

  const parts = sorting.filter(s => allowed.has(s.id)).map(s => `${s.desc ? '-' : '+'}${s.id}`)

  return parts.length ? parts.join(',') : null
}

export const TaskExpertsSpace: React.FC<TaskExpertsSpaceProps> = ({
  translations,
  onViewPrompt,
  onEditPrompt,
  refreshKey,
  ...context
}) => {
  const { t } = useTranslation(translations)
  const meshApi = useAgentMeshClient(context.accessToken)
  const pmClient = usePromptManagerClient(context.accessToken)
  const [search, setSearch] = useState<string>('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [testingPromptId, setTestingPromptId] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [meshStatus, setMeshStatus] = useState<string | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceODM[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all')

  // Fetch workspaces on mount
  useEffect(() => {
    let mounted = true
    pmClient
      .getWorkspaces({ limit: 100 })
      .then(res => {
        if (mounted) setWorkspaces(res.data)
      })
      .catch(() => undefined)
    return () => {
      mounted = false
    }
  }, [pmClient])

  // Build workspace id→name map for column display
  const workspaceMap = useMemo(() => {
    const map: Record<string, string> = {}
    workspaces.forEach(ws => {
      if (ws._id) map[ws._id] = ws.name
    })
    return map
  }, [workspaces])

  const { prompts, total, isLoading, error, reload } = useTaskExperts(context, {
    workspaceId: selectedWorkspace,
    search,
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    returnTotalRecords: true,
    sort: buildSortParam(sorting)
  })

  // Transform prompts to add id property (DataTable requires id, not _id)
  const data: TaskExpertRow[] = useMemo(() => prompts.map(p => ({ ...p, id: p._id || p.name })), [prompts])

  const columns = useMemo(() => createTaskExpertColumns(t, workspaceMap), [t, workspaceMap])

  // Refresh when parent signals
  useEffect(() => {
    if (refreshKey > 0) {
      reload({
        workspaceId: selectedWorkspace,
        search,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        returnTotalRecords: true,
        sort: buildSortParam(sorting)
      })
    }
  }, [refreshKey, reload, search, pagination.pageIndex, pagination.pageSize, sorting, selectedWorkspace])

  const onSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }, [])

  const handleSortingChange = useCallback((nextSorting: SortingState) => {
    setSorting(nextSorting)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleWorkspaceChange = useCallback((value: string) => {
    setSelectedWorkspace(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleAddToMesh = useCallback(
    async (agentId: string) => {
      try {
        const layout = await meshApi.getMeshLayout()
        const existing = layout?.positions || []
        if (existing.some(p => p.agent_id === agentId)) {
          setMeshStatus(t('already-in-mesh'))
        } else {
          await meshApi.saveMeshLayout([...existing, { agent_id: agentId, x: 0, y: 0 }])
          setMeshStatus(t('added-to-mesh'))
        }
        setTimeout(() => setMeshStatus(null), 3000)
      } catch {
        console.error('Failed to add agent to mesh')
      }
    },
    [meshApi, t]
  )

  const handleRowClick = useCallback(
    (row: TaskExpertRow) => {
      const id = row?._id || ''
      if (!id) return
      onViewPrompt(id, row?.name || '')
    },
    [onViewPrompt]
  )

  return (
    <>
      <DataDisplay
        titleSections={[
          {
            id: 'experts',
            label: t('section-label'),
            metadata: { count: total }
          }
        ]}
        currentSection="experts"
        searchValue={search}
        searchPlaceholder={t('search-placeholder')}
        onSearchChange={onSearchChange}
        toolbarDensity="default"
        secondaryActions={
          workspaces.length > 0 ? (
            <Select value={selectedWorkspace} onValueChange={handleWorkspaceChange}>
              <SelectTrigger className="gba:w-48" data-testid="prompt-manager-workspace-filter">
                <SelectValue placeholder={t('filter-workspace-all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter-workspace-all')}</SelectItem>
                {workspaces.map(ws => (
                  <SelectItem key={ws._id} value={ws._id || ''}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      >
        <DataTable<TaskExpertRow>
          data={data}
          columns={columns}
          loading={isLoading}
          error={error}
          actions={[
            { label: t('view'), onClick: (row: TaskExpertRow) => onViewPrompt(row._id || '', row.name || '') },
            { label: t('edit'), onClick: (row: TaskExpertRow) => onEditPrompt(row._id || '', row.name || '') },
            { label: t('test'), onClick: (row: TaskExpertRow) => setTestingPromptId(row._id || '') },
            {
              label: t('add-to-mesh'),
              onClick: (row: TaskExpertRow) => handleAddToMesh(row._id || ''),
              hidden: (row: TaskExpertRow) => row.agentType !== 'everyai'
            }
          ]}
          tableLayout="fixed"
          enableColumnPinning={true}
          enableSorting
          sorting={sorting}
          onSortingChange={handleSortingChange}
          enablePagination
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          totalCount={total}
          rowsPerPageOptions={[10, 20, 50, 100]}
          emptyMessage={t('empty-message')}
          onRowClick={handleRowClick}
          data-testid="prompt-manager-table"
        />
      </DataDisplay>

      {meshStatus && (
        <div
          className="gba:fixed gba:bottom-4 gba:right-4 gba:z-50 gba:bg-card gba:border gba:border-border gba:rounded-lg gba:px-4 gba:py-3 gba:text-sm gba:text-foreground gba:shadow-lg"
          data-testid="mesh-status-toast"
        >
          {meshStatus}
        </div>
      )}

      <TaskExpertTestPanel
        {...context}
        open={!!testingPromptId}
        onClose={() => setTestingPromptId(null)}
        promptId={testingPromptId || ''}
      />
    </>
  )
}
