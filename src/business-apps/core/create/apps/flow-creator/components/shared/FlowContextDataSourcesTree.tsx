import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight, Database, BookOpen, Building2 } from 'lucide-react'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import { FlowContextKeyPickerDialog } from './FlowContextKeyPickerDialog'
import type { FlowContextBrowserDialogProps } from './FlowContextBrowserDialog'

type DataSources = NonNullable<FlowContextBrowserDialogProps['dataSources']>

type CatalogFieldKey =
  | 'value'
  | 'code'
  | 'alternativeCode'
  | 'description'
  | 'type'
  | 'additionalValue1'
  | 'additionalValue2'
  | 'additionalValue3'

const CATALOG_FIELDS: Array<{ key: CatalogFieldKey; label: string }> = [
  { key: 'value', label: 'Value' },
  { key: 'code', label: 'Code' },
  { key: 'alternativeCode', label: 'Alternative code' },
  { key: 'description', label: 'Description' },
  { key: 'type', label: 'Type' },
  { key: 'additionalValue1', label: 'Additional value 1' },
  { key: 'additionalValue2', label: 'Additional value 2' },
  { key: 'additionalValue3', label: 'Additional value 3' }
]

type Node =
  | { id: string; kind: 'root'; label: string; icon: React.ElementType; children: Node[] }
  | { id: string; kind: 'group'; label: string; children: Node[] }
  | { id: string; kind: 'orgchart-leaf'; label: string; item: ExpressionSuggestionItem }
  | {
      id: string
      kind: 'catalog-field'
      label: string
      catalogIdentifier: string
      catalogLabel: string
      fieldKey: CatalogFieldKey
      fieldLabel: string
    }
  | {
      id: string
      kind: 'entity-field'
      label: string
      entityType: string
      entityLabel: string
      fieldKey: string
      fieldLabel: string
    }

interface FlowContextDataSourcesTreeProps {
  query: string
  dataSources: DataSources
  flowContextItems: ExpressionSuggestionItem[]
  onSelect: (item: ExpressionSuggestionItem) => void
  testId: string
}

const normalize = (s: string): string => s.trim().toLowerCase()

const isBasicEntityField = (field: string): boolean => {
  const f = normalize(field)
  if (!f) return false
  const basic = new Set([
    'id',
    '_id',
    'uuid',
    'displayname',
    'name',
    'title',
    'fullname',
    'firstname',
    'lastname',
    'email',
    'status',
    'state',
    'createdat',
    'updatedat'
  ])
  if (basic.has(f)) return true
  return f.endsWith('id') || f.endsWith('_id')
}

const buildCatalogExpression = (catalogIdentifier: string, keyExpression: string, field: CatalogFieldKey): string => {
  return `$catalog.${catalogIdentifier}[${keyExpression}].${field}`
}

const buildEntityExpression = (entityType: string, keyExpression: string, field: string): string => {
  return `$entity.${entityType}[${keyExpression}].${field}`
}

export const FlowContextDataSourcesTree: React.FC<FlowContextDataSourcesTreeProps> = ({
  query,
  dataSources,
  flowContextItems,
  onSelect,
  testId
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const lastCatalogSearchRef = useRef<string | null>(null)
  const [keyPickerOpen, setKeyPickerOpen] = useState(false)
  const [pending, setPending] = useState<
    | null
    | {
        kind: 'catalog'
        catalogIdentifier: string
        catalogLabel: string
        fieldKey: CatalogFieldKey
        fieldLabel: string
      }
    | { kind: 'entity'; entityType: string; entityLabel: string; fieldKey: string; fieldLabel: string }
  >(null)

  const keyCandidates = useMemo(() => {
    const base = (flowContextItems ?? []).filter(
      i => i.source === 'trigger' || i.source === 'workflow' || i.source === 'steps'
    )
    const isIdLike = (item: ExpressionSuggestionItem): boolean => {
      const label = normalize(String(item.label || ''))
      const expr = normalize(String(item.expression || ''))
      return label.includes(' id') || label.endsWith('id') || expr.endsWith('.id') || expr.includes('.id.')
    }
    return [...base].sort(
      (a, b) => Number(isIdLike(b)) - Number(isIdLike(a)) || String(a.label).localeCompare(String(b.label))
    )
  }, [flowContextItems])

  const orgchartItems = useMemo(() => {
    const q = normalize(String(query || ''))
    const items = (flowContextItems ?? []).filter(i => i.source === 'orgchart')
    if (!q) return items
    return items.filter(i => {
      const label = normalize(String(i.label || ''))
      const desc = normalize(String(i.description || ''))
      const expr = normalize(String(i.expression || ''))
      return label.includes(q) || desc.includes(q) || expr.includes(q)
    })
  }, [flowContextItems, query])

  useEffect(() => {
    if (!expanded.has('root/catalogs')) return
    const q = String(query || '').trim()
    if (lastCatalogSearchRef.current === q) return
    lastCatalogSearchRef.current = q
    const handle = setTimeout(() => void dataSources.searchCatalogs(q), 250)
    return () => clearTimeout(handle)
  }, [dataSources.searchCatalogs, expanded, query])

  useEffect(() => {
    if (!expanded.has('root/entities') && !query.trim()) return
    void dataSources.loadEntities()
  }, [dataSources, expanded, query])

  const filteredEntities = useMemo(() => {
    const q = normalize(String(query || ''))
    const list = dataSources.entities ?? []
    if (!q) return list
    return list.filter(e => {
      const type = normalize(String(e.type || ''))
      const name = normalize(String(e.name || ''))
      return type.includes(q) || name.includes(q)
    })
  }, [dataSources.entities, query])

  const tree = useMemo<Node[]>(() => {
    const catalogs = dataSources.catalogs ?? []
    const catalogNodes: Node[] = catalogs.map(c => {
      const id = String(c.identifier || '').trim()
      const name = String(c.name || id).trim()
      const label = `${name} (${id}${c.version ? `:${c.version}` : ''})`
      return {
        id: `catalog/${id}`,
        kind: 'group',
        label,
        children: CATALOG_FIELDS.map(f => ({
          id: `catalog/${id}/field/${f.key}`,
          kind: 'catalog-field',
          label: f.label,
          catalogIdentifier: id,
          catalogLabel: name || id,
          fieldKey: f.key,
          fieldLabel: f.label
        }))
      }
    })

    const entityNodes: Node[] = filteredEntities.map(e => {
      const type = String(e.type || '').trim()
      const name = String(e.name || type).trim()
      const fields = Array.isArray(e.fields) ? e.fields : []
      const basicFields = fields.filter(isBasicEntityField)
      const advancedFields = fields.filter(f => !isBasicEntityField(f))

      const group = (id: string, label: string, fs: string[]): Node | null => {
        if (!fs.length) return null
        return {
          id,
          kind: 'group',
          label,
          children: fs.map(f => ({
            id: `${id}/field/${f}`,
            kind: 'entity-field',
            label: f,
            entityType: type,
            entityLabel: name || type,
            fieldKey: f,
            fieldLabel: f
          }))
        }
      }
      return {
        id: `entity/${type}`,
        kind: 'group',
        label: `${name} (${type})`,
        children: [
          group(`entity/${type}/basic`, 'Basic', basicFields),
          group(`entity/${type}/advanced`, 'Advanced', advancedFields)
        ].filter(Boolean) as Node[]
      }
    })

    const orgNodes: Node[] = orgchartItems.map(it => ({
      id: `orgchart/${it.id}`,
      kind: 'orgchart-leaf',
      label: it.label,
      item: it
    }))

    return [
      { id: 'root/catalogs', kind: 'root', label: 'Catalogs', icon: BookOpen, children: catalogNodes },
      { id: 'root/entities', kind: 'root', label: 'Entities', icon: Database, children: entityNodes },
      { id: 'root/orgchart', kind: 'root', label: 'Org chart', icon: Building2, children: orgNodes }
    ]
  }, [dataSources.catalogs, filteredEntities, orgchartItems])

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      const willExpand = !next.has(id)
      if (willExpand) next.add(id)
      else next.delete(id)

      if (id.startsWith('entity/') && willExpand) {
        next.add(`${id}/basic`)
      }
      return next
    })
  }

  const onPickKey = (keyItem: ExpressionSuggestionItem) => {
    if (!pending) return
    const keyExpr = String(keyItem.expression || '').trim()
    if (!keyExpr) return

    if (pending.kind === 'catalog') {
      const expression = buildCatalogExpression(pending.catalogIdentifier, keyExpr, pending.fieldKey)
      onSelect({
        id: `catalog-${pending.catalogIdentifier}-${pending.fieldKey}-${keyItem.id}`,
        label: `${pending.catalogLabel} → ${pending.fieldLabel}`,
        expression,
        source: 'catalog',
        dataType: 'string',
        description: `Key: ${keyItem.label}`
      })
    } else {
      const expression = buildEntityExpression(pending.entityType, keyExpr, pending.fieldKey)
      onSelect({
        id: `entity-${pending.entityType}-${pending.fieldKey}-${keyItem.id}`,
        label: `${pending.entityLabel} → ${pending.fieldLabel} (${keyItem.label})`,
        expression,
        source: 'entity',
        dataType: 'string',
        description: `Key: ${keyItem.label}`
      })
    }

    setKeyPickerOpen(false)
    setPending(null)
  }

  const renderNode = (node: Node, depth: number): React.ReactNode => {
    const hasChildren = 'children' in node && node.children.length > 0
    const isExpanded = expanded.has(node.id)
    const Icon = node.kind === 'root' ? node.icon : null
    const indent = depth === 0 ? '' : depth === 1 ? 'gba:pl-4' : depth === 2 ? 'gba:pl-6' : 'gba:pl-8'

    const rowTestId = `${testId}-ds-node-${node.id}`

    if (node.kind === 'orgchart-leaf') {
      return (
        <Button
          key={node.id}
          type="button"
          variant="ghost"
          size="sm"
          className={['gba:w-full gba:justify-start gba:text-left gba:h-8', indent].join(' ')}
          onClick={() => onSelect(node.item)}
          data-testid={rowTestId}
        >
          <span className="gba:truncate gba:text-xs">{node.label}</span>
        </Button>
      )
    }

    if (node.kind === 'catalog-field' || node.kind === 'entity-field') {
      return (
        <Button
          key={node.id}
          type="button"
          variant="ghost"
          size="sm"
          className={['gba:w-full gba:justify-start gba:text-left gba:h-8', indent].join(' ')}
          onClick={() => {
            if (node.kind === 'catalog-field') {
              setPending({
                kind: 'catalog',
                catalogIdentifier: node.catalogIdentifier,
                catalogLabel: node.catalogLabel,
                fieldKey: node.fieldKey,
                fieldLabel: node.fieldLabel
              })
            } else {
              setPending({
                kind: 'entity',
                entityType: node.entityType,
                entityLabel: node.entityLabel,
                fieldKey: node.fieldKey,
                fieldLabel: node.fieldLabel
              })
            }
            setKeyPickerOpen(true)
          }}
          data-testid={rowTestId}
        >
          <span className="gba:truncate gba:text-xs">{node.label}</span>
        </Button>
      )
    }

    return (
      <div key={node.id} className="gba:flex gba:flex-col">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={['gba:w-full gba:justify-start gba:text-left gba:h-8', indent].join(' ')}
          onClick={() => (hasChildren ? toggle(node.id) : undefined)}
          data-testid={rowTestId}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
            ) : (
              <ChevronRight className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
            )
          ) : (
            <span className="gba:w-5 gba:mr-2" />
          )}
          {Icon ? <Icon className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" /> : null}
          <span
            className={[
              'gba:truncate gba:text-xs',
              node.kind === 'root' ? 'gba:font-semibold' : 'gba:font-medium'
            ].join(' ')}
          >
            {node.label}
          </span>
        </Button>
        {hasChildren && isExpanded ? (
          <div className="gba:flex gba:flex-col">
            {node.children.map(c => renderNode(c, depth + 1))}

            {node.id === 'root/catalogs' && dataSources.catalogsHasMore ? (
              <div className={['gba:px-2 gba:pt-2', depth === 0 ? 'gba:pl-6' : ''].filter(Boolean).join(' ')}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(dataSources.catalogsLoading)}
                  onClick={() => void dataSources.loadMoreCatalogs()}
                  data-testid={`${testId}-ds-catalogs-load-more`}
                >
                  Load more catalogs
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      {dataSources.catalogsError ? (
        <div className="gba:text-xs gba:text-destructive" data-testid={`${testId}-ds-catalog-error`}>
          {dataSources.catalogsError}
        </div>
      ) : null}
      {dataSources.entitiesError ? (
        <div className="gba:text-xs gba:text-destructive" data-testid={`${testId}-ds-entity-error`}>
          {dataSources.entitiesError}
        </div>
      ) : null}

      <div
        className="gba:max-h-96 gba:overflow-y-auto gba:flex gba:flex-col gba:gap-0.5"
        data-testid={`${testId}-ds-tree`}
      >
        {tree.map(r => renderNode(r, 0))}
      </div>

      <FlowContextKeyPickerDialog
        open={keyPickerOpen}
        onOpenChange={open => {
          setKeyPickerOpen(open)
          if (!open) setPending(null)
        }}
        items={keyCandidates}
        onSelect={onPickKey}
        title={pending?.kind === 'entity' ? 'Choose entity ID' : 'Choose key expression'}
        description={
          pending?.kind === 'entity'
            ? 'Select a flow-context value that contains the entity record ID (e.g. a Trigger field or a previous step result).'
            : 'Select a flow-context value used to look up the catalog entry (e.g. code or ID).'
        }
        data-testid={`${testId}-ds-key-picker`}
      />
    </div>
  )
}
