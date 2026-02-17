import React, { useCallback, useState, useEffect, useMemo } from 'react'
import { DataDisplay, DataTable, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { SortingState } from '@tanstack/react-table'
import { useTaskExperts } from '../hooks/useTaskExperts'
import { TaskExpertTestPanel } from './TaskExpertTestPanel'
import { createTaskExpertColumns } from '../config/taskExpertColumns'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'

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
  const [search, setSearch] = useState<string>('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [testingPromptId, setTestingPromptId] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])

  const { prompts, total, isLoading, error, reload } = useTaskExperts(context, {
    search,
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    returnTotalRecords: true,
    sort: buildSortParam(sorting)
  })

  // Transform prompts to add id property (DataTable requires id, not _id)
  const data: TaskExpertRow[] = useMemo(() => prompts.map(p => ({ ...p, id: p._id || p.name })), [prompts])

  const columns = useMemo(() => createTaskExpertColumns(t), [t])

  // Refresh when parent signals
  useEffect(() => {
    if (refreshKey > 0) {
      reload({
        search,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        returnTotalRecords: true,
        sort: buildSortParam(sorting)
      })
    }
  }, [refreshKey, reload, search, pagination.pageIndex, pagination.pageSize, sorting])

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
      >
        <DataTable<TaskExpertRow>
          data={data}
          columns={columns}
          loading={isLoading}
          error={error}
          actions={[
            { label: t('view'), onClick: (row: TaskExpertRow) => onViewPrompt(row._id || '', row.name || '') },
            { label: t('edit'), onClick: (row: TaskExpertRow) => onEditPrompt(row._id || '', row.name || '') },
            { label: t('test'), onClick: (row: TaskExpertRow) => setTestingPromptId(row._id || '') }
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

      <TaskExpertTestPanel
        {...context}
        open={!!testingPromptId}
        onClose={() => setTestingPromptId(null)}
        promptId={testingPromptId || ''}
      />
    </>
  )
}
