import React, { useState, useMemo, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Checkbox,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { Edit2, Eye, Trash2, Database, FileSpreadsheet, Rocket, Download, X } from 'lucide-react'
import { CustomDataDefinition, DefinitionKind } from '../types'

export interface BulkAction {
  type: 'promote' | 'delete' | 'export'
  definitions: CustomDataDefinition[]
}

interface DefinitionsTableProps {
  definitions: CustomDataDefinition[]
  isLoading: boolean
  filterKind: DefinitionKind | undefined
  onFilterChange: (kind: DefinitionKind | undefined) => void
  onSelect: (definition: CustomDataDefinition) => void
  onEdit: (definition: CustomDataDefinition) => void
  onPromote: (definition: CustomDataDefinition) => void
  onBulkAction?: (action: BulkAction) => void
  'data-testid'?: string
}

export const DefinitionsTable: React.FC<DefinitionsTableProps> = ({
  definitions,
  isLoading,
  filterKind,
  onFilterChange,
  onSelect,
  onEdit,
  onPromote,
  onBulkAction,
  'data-testid': testId = 'definitions-table'
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Get selected definitions
  const selectedDefinitions = useMemo(() => {
    return definitions.filter(d => selectedIds.has(d.id))
  }, [definitions, selectedIds])

  // Check if all are selected
  const allSelected = definitions.length > 0 && selectedIds.size === definitions.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < definitions.length

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(definitions.map(d => d.id)))
    }
  }, [allSelected, definitions])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Bulk action helpers
  const promotableCount = useMemo(() => {
    return selectedDefinitions.filter(d => d.kind === 'ENTITY' && d.publish_state !== 'PROMOTED_TRACKED').length
  }, [selectedDefinitions])

  const handleBulkPromote = useCallback(() => {
    const promotable = selectedDefinitions.filter(d => d.kind === 'ENTITY' && d.publish_state !== 'PROMOTED_TRACKED')
    if (promotable.length > 0 && onBulkAction) {
      onBulkAction({ type: 'promote', definitions: promotable })
    }
  }, [selectedDefinitions, onBulkAction])

  const handleBulkDelete = useCallback(() => {
    if (selectedDefinitions.length > 0 && onBulkAction) {
      onBulkAction({ type: 'delete', definitions: selectedDefinitions })
    }
  }, [selectedDefinitions, onBulkAction])

  const handleBulkExport = useCallback(() => {
    if (selectedDefinitions.length > 0 && onBulkAction) {
      onBulkAction({ type: 'export', definitions: selectedDefinitions })
    }
  }, [selectedDefinitions, onBulkAction])

  const getKindBadge = (kind: DefinitionKind) => {
    if (kind === 'SPREADSHEET') {
      return (
        <Badge variant="info" className="gba:gap-1">
          <FileSpreadsheet className="gba:h-3 gba:w-3" />
          Spreadsheet
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="gba:gap-1">
        <Database className="gba:h-3 gba:w-3" />
        Entity
      </Badge>
    )
  }

  const getNamespaceBadge = (namespace: string) => {
    // Color code namespaces
    if (namespace === 'default') {
      return <Badge variant="secondary">{namespace}</Badge>
    }
    if (namespace.includes('.hr')) {
      return <Badge variant="success">{namespace}</Badge>
    }
    if (namespace.includes('.finance') || namespace.includes('.fin')) {
      return <Badge variant="warning">{namespace}</Badge>
    }
    if (namespace.includes('.platform')) {
      return <Badge variant="info">{namespace}</Badge>
    }
    return <Badge variant="outline">{namespace}</Badge>
  }

  const getStatusBadge = (definition: CustomDataDefinition) => {
    const { publish_state } = definition

    if (publish_state === 'PROMOTED_TRACKED') {
      return <Badge variant="success">Promoted</Badge>
    }
    if (publish_state === 'ERROR') {
      return <Badge variant="destructive">Error</Badge>
    }
    if (publish_state === 'DRAFT') {
      return <Badge variant="warning">Draft</Badge>
    }
    if (publish_state === 'GENERIC_TRACKED') {
      return <Badge variant="success">Active</Badge>
    }

    return <Badge variant="offline">Unknown</Badge>
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-16" data-testid={`${testId}-loading`}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Bulk Actions Toolbar - shown when items are selected */}
      {selectedIds.size > 0 && (
        <Alert className="gba:bg-primary/5 gba:border-primary/20" data-testid={`${testId}-bulk-toolbar`}>
          <AlertDescription>
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-3">
                <span className="gba:font-medium">
                  {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="gba:h-7 gba:text-xs"
                  data-testid={`${testId}-clear-selection`}
                >
                  <X className="gba:h-3 gba:w-3 gba:mr-1" />
                  Clear
                </Button>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2">
                {promotableCount > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBulkPromote}
                    className="gba:h-8"
                    data-testid={`${testId}-bulk-promote`}
                  >
                    <Rocket className="gba:h-4 gba:w-4 gba:mr-1" />
                    Promote ({promotableCount})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkExport}
                  className="gba:h-8"
                  data-testid={`${testId}-bulk-export`}
                >
                  <Download className="gba:h-4 gba:w-4 gba:mr-1" />
                  Export
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="gba:h-8"
                  data-testid={`${testId}-bulk-delete`}
                >
                  <Trash2 className="gba:h-4 gba:w-4 gba:mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Filter Bar */}
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:text-muted-foreground">Filter by type:</span>
          <Select
            value={filterKind || 'all'}
            onValueChange={value => onFilterChange(value === 'all' ? undefined : (value as DefinitionKind))}
          >
            <SelectTrigger className="gba:w-40" data-testid={`${testId}-filter`}>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="SPREADSHEET">Spreadsheets</SelectItem>
              <SelectItem value="ENTITY">Entities</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="gba:text-sm gba:text-muted-foreground">
          {definitions.length} {definitions.length === 1 ? 'definition' : 'definitions'}
        </span>
      </div>

      {/* Table */}
      {definitions.length === 0 ? (
        <div
          className="gba:text-center gba:py-16 gba:text-muted-foreground gba:bg-muted/30 gba:rounded-lg"
          data-testid={`${testId}-empty`}
        >
          <Database className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4 gba:opacity-50" />
          <p className="gba:text-lg gba:font-medium">No definitions found</p>
          <p className="gba:text-sm">Create your first custom data definition to get started</p>
        </div>
      ) : (
        <div className="gba:rounded-lg gba:border gba:border-border gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="gba:w-[50px]">
                  <Checkbox
                    checked={allSelected}
                    ref={el => {
                      if (el) {
                        ;(el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected
                      }
                    }}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                    data-testid={`${testId}-select-all`}
                  />
                </TableHead>
                <TableHead className="gba:w-[160px]">Namespace</TableHead>
                <TableHead className="gba:w-[180px]">Key</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead className="gba:w-[120px]">Type</TableHead>
                <TableHead className="gba:w-[100px]">Columns</TableHead>
                <TableHead className="gba:w-[100px]">Status</TableHead>
                <TableHead className="gba:w-[120px]">Updated</TableHead>
                <TableHead className="gba:w-[140px] gba:text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {definitions.map(definition => (
                <TableRow
                  key={definition.id}
                  className={`gba:cursor-pointer gba:hover:bg-muted/50 ${selectedIds.has(definition.id) ? 'gba:bg-primary/5' : ''}`}
                  onClick={() => onSelect(definition)}
                  data-testid={`${testId}-row-${definition.id}`}
                >
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(definition.id)}
                      onCheckedChange={() => toggleSelect(definition.id)}
                      aria-label={`Select ${definition.display_name || definition.key}`}
                      data-testid={`${testId}-select-${definition.id}`}
                    />
                  </TableCell>
                  <TableCell>{getNamespaceBadge(definition.namespace)}</TableCell>
                  <TableCell className="gba:font-mono gba:text-sm">{definition.key}</TableCell>
                  <TableCell>
                    <div>
                      <div className="gba:font-medium">{definition.display_name || definition.key}</div>
                      {definition.description && (
                        <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-[300px]">
                          {definition.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getKindBadge(definition.kind)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{definition.columns_json?.length || 0} fields</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(definition)}</TableCell>
                  <TableCell className="gba:text-sm gba:text-muted-foreground">
                    {formatDate(definition.updated_at)}
                  </TableCell>
                  <TableCell className="gba:text-right">
                    <span className="gba:inline-flex gba:justify-end gba:gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSelect(definition)}
                        data-testid={`${testId}-view-${definition.id}`}
                      >
                        <Eye className="gba:h-4 gba:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(definition)}
                        data-testid={`${testId}-edit-${definition.id}`}
                      >
                        <Edit2 className="gba:h-4 gba:w-4" />
                      </Button>
                      {definition.kind === 'ENTITY' && definition.publish_state !== 'PROMOTED_TRACKED' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onPromote(definition)}
                          data-testid={`${testId}-promote-${definition.id}`}
                        >
                          <Rocket className="gba:h-4 gba:w-4" />
                        </Button>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
