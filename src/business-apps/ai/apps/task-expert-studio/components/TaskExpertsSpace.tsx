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
  Spinner,
  Badge
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTaskExperts } from '../hooks/useTaskExperts'
import { useCallback, useState, useEffect } from 'react'
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

  // Handle URL parameter for direct expert access
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const expertId = urlParams.get('expertId')
    if (expertId && !editingPromptId && !isCreateOpen) {
      if (expertId === 'new') {
        setIsCreateOpen(true)
      } else {
        setEditingPromptId(expertId)
      }
    }
  }, [])

  const updateUrl = useCallback((expertId: string | null) => {
    const urlParams = new URLSearchParams(window.location.search)
    if (expertId) {
      urlParams.set('expertId', expertId)
    } else {
      urlParams.delete('expertId')
    }
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname
    window.history.pushState({}, '', newUrl)
  }, [])

  const onSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }, [])

  const onCreateTaskExpert = useCallback(() => {
    setIsCreateOpen(true)
    updateUrl('new')
  }, [updateUrl])

  const onCreated = useCallback(
    () => reload({ search, limit, offset, returnTotalRecords: true }),
    [reload, search, limit, offset]
  )

  const onEditPrompt = useCallback(
    (id: string) => {
      setEditingPromptId(id)
      updateUrl(id)
    },
    [updateUrl]
  )

  const onEditorClosed = useCallback(() => {
    setEditingPromptId(null)
    setIsCreateOpen(false)
    updateUrl(null)
  }, [updateUrl])

  const onEditorSaved = useCallback(() => {
    // Don't close editor or clear URL - user stays in editor after save
    // Just reload the list in background
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
        promptId={null}
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
        promptId={editingPromptId}
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
                    <TableHead>Agent Type</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Version</TableHead>
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
                  ) : prompts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="gba:py-6 gba:text-center gba:text-muted-foreground">
                        No task experts found. Click "New Task Expert" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    prompts.map(p => (
                      <TableRow
                        key={p._id ?? p.name}
                        data-testid={`task-expert-studio-task-expert-row-${p._id ?? p.name}`}
                      >
                        <TableCell className="gba:py-3">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <span className="gba:font-medium">{p.name}</span>
                            {p.is_public && (
                              <Badge variant="success" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                                Public
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="gba:py-3">
                          {p.agent_type === 'everyai' ? (
                            <Badge variant="default" className="gba:text-[10px]">
                              🎓 EveryAI
                            </Badge>
                          ) : p.agent_type === 'general' ? (
                            <Badge variant="info" className="gba:text-[10px]">
                              ⚡ General
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gba:text-[10px]">
                              FLOW
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="gba:py-3 gba:text-muted-foreground gba:text-sm">
                          {p.specialty || '-'}
                        </TableCell>
                        <TableCell className="gba:py-3">v{p.version}</TableCell>
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
