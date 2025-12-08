import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Spinner
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTaskExperts } from '../hooks/useTaskExperts'
import { useCallback, useState } from 'react'
import { TaskExpertEditor } from './TaskExpertEditor'
import { TaskExpertTestPanel } from './TaskExpertTestPanel'

export const TaskExpertsSpace: React.FC<BusinessAppContextProps> = context => {
  const [search, setSearch] = useState<string>('')
  const [limit, setLimit] = useState<number>(20)
  const [offset, setOffset] = useState<number>(0)
  const { prompts, total, isLoading, error, reload } = useTaskExperts(context, {
    search,
    limit,
    offset,
    returnTotalRecords: true
  })
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [testingPromptId, setTestingPromptId] = useState<string | null>(null)

  const onSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }, [])

  const onCreateTaskExpert = useCallback(() => setIsCreateOpen(true), [])
  const onCreated = useCallback(
    () => reload({ search, limit, offset, returnTotalRecords: true }),
    [reload, search, limit, offset]
  )
  const onEditPrompt = useCallback((id: string) => setEditingPromptId(id), [])
  const onEditorClosed = useCallback(() => setEditingPromptId(null), [])
  const onEditorSaved = useCallback(() => {
    setEditingPromptId(null)
    reload({ search, limit, offset, returnTotalRecords: true })
  }, [reload, search, limit, offset])

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)))
  const currentPage = Math.floor((offset || 0) / (limit || 1)) + 1

  const goToPage = useCallback(
    (page: number) => {
      const newPage = Math.min(Math.max(page, 1), totalPages)
      const newOffset = (newPage - 1) * limit
      setOffset(newOffset)
      reload({ search, limit, offset: newOffset, returnTotalRecords: true })
    },
    [limit, totalPages, reload, search]
  )

  const onChangePageSize = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newLimit = Math.max(5, Math.min(100, Number(e.target.value) || 20))
      setLimit(newLimit)
      setOffset(0)
      reload({ search, limit: newLimit, offset: 0, returnTotalRecords: true })
    },
    [reload, search]
  )

  // Show editor without list header when creating or editing
  if (isCreateOpen) {
    return (
      <TaskExpertEditor
        {...context}
        mode="create"
        prompt={null}
        onClose={() => setIsCreateOpen(false)}
        onSaved={() => {
          setIsCreateOpen(false)
          onCreated()
        }}
      />
    )
  }

  if (editingPromptId) {
    return (
      <TaskExpertEditor
        {...context}
        mode="edit"
        prompt={prompts.find(p => (p._id || '') === editingPromptId)}
        onClose={onEditorClosed}
        onSaved={onEditorSaved}
      />
    )
  }

  return (
    <Card data-testid="task-expert-studio-task-experts-space">
      <CardHeader>
        <CardTitle>Task Experts</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:gap-3">
          <Input
            data-testid="task-expert-studio-task-experts-search-input"
            placeholder="Search task experts..."
            value={search}
            onChange={onSearchChange}
          />
          <Input
            data-testid="task-expert-studio-task-experts-page-size-input"
            type="number"
            min={5}
            max={100}
            value={limit}
            onChange={onChangePageSize}
          />
          <Button
            variant="default"
            data-testid="task-expert-studio-task-experts-create-button"
            onClick={onCreateTaskExpert}
          >
            New Task Expert
          </Button>
          <Button
            variant="secondary"
            data-testid="task-expert-studio-task-experts-reload-button"
            onClick={() => reload({ search, limit, offset, returnTotalRecords: true })}
          >
            Reload
          </Button>
        </div>
        {error ? (
          <div data-testid="task-expert-studio-task-experts-error" className="gba:text-destructive">
            {error}
          </div>
        ) : (
          <div className="gba:space-y-2">
            <div data-testid="task-expert-studio-task-experts-count" className="gba:text-muted-foreground">
              {total} task experts
            </div>
            <div className="gba:overflow-x-auto">
              <Table data-testid="task-expert-studio-task-experts-table">
                <TableHeader>
                  <TableRow className="gba:border-b">
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead className="gba:w-[160px]">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="gba:py-6">
                        <div className="gba:flex gba:justify-center">
                          <Spinner />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    prompts.map(p => (
                      <TableRow
                        key={p._id ?? p.name}
                        data-testid={`task-expert-studio-task-expert-row-${p._id ?? p.name}`}
                      >
                        <TableCell className="gba:py-3">
                          <span className="gba:font-medium">{p.name}</span>
                        </TableCell>
                        <TableCell className="gba:py-3 gba:text-muted-foreground">{p.type ?? 'completion'}</TableCell>
                        <TableCell className="gba:py-3">v{p.version}</TableCell>
                        <TableCell className="gba:py-3">{p.workspace?.id || '-'}</TableCell>
                        <TableCell
                          className="gba:py-3"
                          data-testid={`task-expert-studio-task-experts-actions-cell-${p._id ?? p.name}`}
                        >
                          <div className="gba:flex gba:gap-2 gba:justify-start">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onEditPrompt(p._id || '')}
                              data-testid={`task-expert-edit-button-${p._id ?? p.name}`}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setTestingPromptId(p._id || '')}
                              data-testid={`task-expert-test-button-${p._id ?? p.name}`}
                            >
                              Test
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:text-muted-foreground gba:text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <div className="gba:flex gba:gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <TaskExpertTestPanel
        {...context}
        open={!!testingPromptId}
        onClose={() => setTestingPromptId(null)}
        promptId={testingPromptId || ''}
      />
    </Card>
  )
}
