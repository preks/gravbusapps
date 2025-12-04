import React from 'react'
import '@newwork/nw-design-system/style'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  PageLayout,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import { Code } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FunctionsServiceClient, LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'
import { FunctionEditor } from './components/FunctionEditor'

export interface FunctionsManagerProps extends BusinessAppContextProps {
  className?: string
  'data-testid'?: string
}

const DATA_TEST_ID = 'FunctionsManager'

export const FunctionsManager: React.FC<FunctionsManagerProps> = ({ className, ...context }) => {
  const client = React.useMemo(() => new FunctionsServiceClient(), [])
  const [search, setSearch] = React.useState('')
  const [items, setItems] = React.useState<LatestFunctionItem[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingFunctionId, setEditingFunctionId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const list = await client.listLatest({ agentEnabled: true })
      setItems(
        list.filter(i => {
          const q = search.trim().toLowerCase()
          if (!q) return true
          return (
            i.name.toLowerCase().includes(q) ||
            (i.description || '').toLowerCase().includes(q) ||
            String(i.latestVersion?.version || '').includes(q)
          )
        })
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load functions')
    } finally {
      setIsLoading(false)
    }
  }, [client, search])

  React.useEffect(() => {
    // initial load
    load()
  }, [load])

  const editingFunction = editingFunctionId ? items.find(f => f.id === editingFunctionId) : null

  if (isCreateOpen) {
    return (
      <div className={`gba:w-full ${className || ''}`} data-testid={DATA_TEST_ID}>
        <PageLayout
          headerIcon={Code}
          headerTitle="NEWWORK Functions"
          headerDescription="Manage versioned functions for agents and flows"
          className="gba:min-h-screen"
        >
          <FunctionEditor
            {...context}
            mode="create"
            function={null}
            onClose={() => setIsCreateOpen(false)}
            onSaved={() => {
              setIsCreateOpen(false)
              load()
            }}
          />
        </PageLayout>
      </div>
    )
  }

  if (editingFunction) {
    return (
      <div className={`gba:w-full ${className || ''}`} data-testid={DATA_TEST_ID}>
        <PageLayout
          headerIcon={Code}
          headerTitle="NEWWORK Functions"
          headerDescription="Manage versioned functions for agents and flows"
          className="gba:min-h-screen"
        >
          <FunctionEditor
            {...context}
            mode="edit"
            function={editingFunction}
            onClose={() => setEditingFunctionId(null)}
            onSaved={() => {
              setEditingFunctionId(null)
              load()
            }}
          />
        </PageLayout>
      </div>
    )
  }

  return (
    <div className={`gba:w-full ${className || ''}`} data-testid={DATA_TEST_ID}>
      <PageLayout
        headerIcon={Code}
        headerTitle="NEWWORK Functions"
        headerDescription="Manage versioned functions for agents and flows"
        className="gba:min-h-screen"
      >
        <div className="gba:space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Functions</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Label className="gba:text-sm">Search</Label>
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="name, description, version…"
                    className="gba:w-64"
                    data-testid={`${DATA_TEST_ID}-search-input`}
                  />
                  <Button variant="outline" onClick={load} disabled={isLoading}>
                    Refresh
                  </Button>
                </div>
                <div className="gba:flex gba:gap-2">
                  <Button
                    variant="default"
                    onClick={() => setIsCreateOpen(true)}
                    data-testid={`${DATA_TEST_ID}-new-button`}
                  >
                    New Function
                  </Button>
                </div>
              </div>

              {error && <div className="gba:text-destructive gba:text-sm">{error}</div>}

              <div className="gba:border gba:rounded-md gba:overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell className="gba:font-semibold">Name</TableCell>
                      <TableCell className="gba:font-semibold">Description</TableCell>
                      <TableCell className="gba:font-semibold">Latest Version</TableCell>
                      <TableCell className="gba:font-semibold">Agent Enabled</TableCell>
                      <TableCell className="gba:font-semibold">Actions</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5}>Loading…</TableCell>
                      </TableRow>
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>No functions found</TableCell>
                      </TableRow>
                    ) : (
                      items.map(fn => (
                        <TableRow key={fn.id} data-testid={`${DATA_TEST_ID}-row-${fn.id}`}>
                          <TableCell className="gba:py-3">
                            <div className="gba:font-medium">{fn.name}</div>
                          </TableCell>
                          <TableCell className="gba:py-3">
                            <div className="gba:text-muted-foreground gba:text-sm">{fn.description || '-'}</div>
                          </TableCell>
                          <TableCell className="gba:py-3">v{fn.latestVersion?.version ?? '-'}</TableCell>
                          <TableCell className="gba:py-3">{fn.agentEnabled ? 'Yes' : 'No'}</TableCell>
                          <TableCell className="gba:py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingFunctionId(fn.id)}
                              data-testid={`${DATA_TEST_ID}-edit-button-${fn.id}`}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </div>
  )
}

export default FunctionsManager
