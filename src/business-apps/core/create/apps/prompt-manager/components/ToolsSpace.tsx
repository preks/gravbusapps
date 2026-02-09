import React, { useCallback, useEffect, useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
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
import { useTaskExpertToolsCatalog } from '../hooks/useTaskExpertToolsCatalog'
import { ToolEditor } from './ToolEditor'

export const ToolsSpace: React.FC<BusinessAppContextProps> = context => {
  const [search, setSearch] = useState('')
  const [limit] = useState(5)
  const [offset, setOffset] = useState(0)
  const [editingTool, setEditingTool] = useState<{ mode: 'create' | 'edit'; tool?: any } | null>(null)
  const { items, total, isLoading, error, reload, create, update } = useTaskExpertToolsCatalog(context, {
    search,
    limit,
    offset
  })

  const onSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), [])
  const onAddMcpServer = useCallback(() => setEditingTool({ mode: 'create' }), [])
  const onEditTool = useCallback(
    (id: string) => {
      const tool = items.find(t => (t._id || '') === id)
      setEditingTool({ mode: 'edit', tool })
    },
    [items]
  )

  const onReload = useCallback(() => {
    reload({ search, limit, offset })
  }, [reload, search, limit, offset])

  const handleToolSaved = useCallback(async () => {
    if (editingTool) {
      setEditingTool(null)
      reload({ search, limit, offset })
    }
  }, [editingTool, reload, search, limit, offset])

  useEffect(() => {
    setOffset(0)
  }, [search])

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)))
  const currentPage = Math.floor((offset || 0) / (limit || 1)) + 1

  const goToPage = useCallback(
    (page: number) => {
      const newPage = Math.min(Math.max(page, 1), totalPages)
      const newOffset = (newPage - 1) * limit
      setOffset(newOffset)
      reload({ search, limit, offset: newOffset })
    },
    [limit, totalPages, reload, search]
  )

  if (editingTool) {
    return (
      <ToolEditor
        {...context}
        mode={editingTool.mode}
        tool={editingTool.tool}
        onClose={() => setEditingTool(null)}
        onSaved={handleToolSaved}
        onCreate={create}
        onUpdate={update}
      />
    )
  }

  return (
    <Card data-testid="prompt-manager-tools-space">
      <CardHeader>
        <CardTitle>MCP Servers</CardTitle>
        <CardDescription>Manage MCP server connections for AI Task Experts</CardDescription>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:gap-3">
          <Input
            data-testid="prompt-manager-tools-search-input"
            placeholder="Search MCP servers..."
            value={search}
            onChange={onSearchChange}
          />
          <Button variant="default" data-testid="prompt-manager-tools-add-mcp-server" onClick={onAddMcpServer}>
            Add MCP server
          </Button>
          <Button variant="secondary" onClick={onReload} data-testid="prompt-manager-tools-reload">
            Reload
          </Button>
        </div>

        {error ? (
          <div data-testid="prompt-manager-tools-error" className="gba:text-destructive">
            {error}
          </div>
        ) : (
          <div className="gba:space-y-2">
            <div data-testid="prompt-manager-tools-count" className="gba:text-muted-foreground">
              {total} MCP servers
            </div>
            <div className="gba:overflow-x-auto">
              <Table data-testid="prompt-manager-tools-table">
                <TableHeader>
                  <TableRow className="gba:border-b">
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="gba:w-[160px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="gba:py-6">
                        <div className="gba:flex gba:justify-center">
                          <Spinner />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map(row => {
                      const id = row._id ?? row.name
                      const isInternal = !!row.internal
                      const isActive = row.active !== false

                      return (
                        <TableRow key={id} data-testid={`prompt-manager-tool-row-${id}`}>
                          <TableCell className="gba:py-3">
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <span className="gba:font-medium">{row.name}</span>
                              {isInternal && <Badge variant="secondary">Internal</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="gba:py-3">
                            <Badge variant="secondary">{row.type}</Badge>
                          </TableCell>
                          <TableCell className="gba:py-3">
                            <Badge variant={isActive ? 'success' : 'destructive'}>
                              {isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="gba:py-3" data-testid={`prompt-manager-tools-actions-cell-${id}`}>
                            <div className="gba:flex gba:gap-2 gba:justify-start">
                              {!isInternal && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => onEditTool(row._id || '')}
                                  data-testid={`tool-edit-button-${id}`}
                                >
                                  Edit
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
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
    </Card>
  )
}
