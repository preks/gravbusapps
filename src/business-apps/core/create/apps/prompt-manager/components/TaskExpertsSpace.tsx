import React, { useCallback, useState, useEffect, useMemo } from 'react'
import { Button, DataDisplay, DataTable, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTaskExperts } from '../hooks/useTaskExperts'
import { TaskExpertTestPanel } from './TaskExpertTestPanel'
import { createTaskExpertColumns } from '../config/taskExpertColumns'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'

// Extended type with id property for DataTable compatibility
type TaskExpertRow = PromptODM & { id: string }

interface TaskExpertsSpaceProps extends BusinessAppContextProps {
  translations: { enUS: string; deDE: string; roRO: string }
  onCreateTaskExpert: () => void
  onEditPrompt: (id: string, name: string) => void
  refreshKey: number
}

export const TaskExpertsSpace: React.FC<TaskExpertsSpaceProps> = ({
  translations,
  onCreateTaskExpert,
  onEditPrompt,
  refreshKey,
  ...context
}) => {
  const { t } = useTranslation(translations)
  const [search, setSearch] = useState<string>('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [testingPromptId, setTestingPromptId] = useState<string | null>(null)

  const { prompts, total, isLoading, error, reload } = useTaskExperts(context, {
    search,
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    returnTotalRecords: true
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
        returnTotalRecords: true
      })
    }
  }, [refreshKey])

  const onSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handlePaginationChange = useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      setPagination(newPagination)
      reload({
        search,
        limit: newPagination.pageSize,
        offset: newPagination.pageIndex * newPagination.pageSize,
        returnTotalRecords: true
      })
    },
    [reload, search]
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
        primaryAction={
          <Button variant="default" onClick={onCreateTaskExpert} data-testid="prompt-manager-create-button">
            {t('new-task-expert')}
          </Button>
        }
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
            { label: t('edit'), onClick: (row: TaskExpertRow) => onEditPrompt(row._id || '', row.name || '') },
            { label: t('test'), onClick: (row: TaskExpertRow) => setTestingPromptId(row._id || '') }
          ]}
          tableLayout="fixed"
          enableColumnPinning={true}
          enablePagination
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          totalCount={total}
          rowsPerPageOptions={[10, 20, 50, 100]}
          emptyMessage={t('empty-message')}
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
