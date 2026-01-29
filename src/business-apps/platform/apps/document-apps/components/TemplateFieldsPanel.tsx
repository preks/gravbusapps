/**
 * TemplateFieldsPanel
 *
 * Left panel for the template editor: lists entity types (from flow-engine,
 * same as FlowCreator) and their fields. Clicking a field inserts a
 * placeholder at the editor cursor (e.g. {{jobCandidate.firstName}}).
 */

import React, { useState } from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight, Database, AlertCircle } from 'lucide-react'
import { useTemplateEntitySchemas } from '../hooks/useTemplateEntitySchemas'
import type { EntitySchema, EntityFieldSchema } from '../hooks/useTemplateEntitySchemas'

export interface TemplateFieldsPanelProps {
  onInsertField: (placeholder: string) => void
  'data-testid'?: string
}

/** Placeholder format for entity fields (double-brace, entityType.fieldName) */
export function formatPlaceholder(entityType: string, fieldName: string): string {
  return `{{${entityType}.${fieldName}}}`
}

export const TemplateFieldsPanel: React.FC<TemplateFieldsPanelProps> = ({
  onInsertField,
  'data-testid': testId = 'template-fields-panel'
}) => {
  const { schemas, isLoading, error, refetch } = useTemplateEntitySchemas()
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set())

  const toggleEntity = (type: string) => {
    setExpandedEntities(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const handleInsert = (entityType: string, field: EntityFieldSchema) => {
    const placeholder = formatPlaceholder(entityType, field.name)
    onInsertField(placeholder)
  }

  const entityList = schemas ? Object.values(schemas) : []

  return (
    <aside
      className="gba:w-64 gba:flex-shrink-0 gba:border-r gba:bg-card gba:flex gba:flex-col gba:overflow-hidden"
      data-testid={testId}
    >
      <div className="gba:px-3 gba:py-3 gba:border-b">
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Insert field</h3>
        <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
          Choose an entity and a field to insert a placeholder.
        </p>
      </div>
      <div className="gba:flex-1 gba:overflow-y-auto gba:py-2">
        {isLoading && (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <Spinner size="sm" />
          </div>
        )}
        {error && (
          <div className="gba:px-3 gba:py-4 gba:flex gba:flex-col gba:gap-2">
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-destructive">
              <AlertCircle className="gba:w-4 gba:h-4" />
              <span className="gba:text-xs">Could not load entities</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}
        {!isLoading && !error && entityList.length === 0 && (
          <p className="gba:px-3 gba:text-xs gba:text-muted-foreground">No entity types available.</p>
        )}
        {!isLoading && !error && entityList.length > 0 && (
          <div className="gba:space-y-0.5">
            {entityList.map((schema: EntitySchema) => {
              const isExpanded = expandedEntities.has(schema.type)
              const hasFields = Array.isArray(schema.fields) && schema.fields.length > 0
              return (
                <div key={schema.type} className="gba:rounded-md gba:overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleEntity(schema.type)}
                    className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:text-left gba:text-sm hover:gba:bg-muted/60 gba:transition-colors"
                    data-testid={`${testId}-entity-${schema.type}`}
                  >
                    {hasFields ? (
                      isExpanded ? (
                        <ChevronDown className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:text-muted-foreground" />
                      ) : (
                        <ChevronRight className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:text-muted-foreground" />
                      )
                    ) : (
                      <span className="gba:w-4" />
                    )}
                    <Database className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:text-primary/70" />
                    <span className="gba:font-medium gba:truncate">{schema.displayName}</span>
                  </button>
                  {isExpanded && hasFields && (
                    <div className="gba:pl-6 gba:pr-2 gba:pb-2 gba:space-y-0.5">
                      {schema.fields.map((field: EntityFieldSchema) => (
                        <button
                          key={field.name}
                          type="button"
                          onClick={() => handleInsert(schema.type, field)}
                          className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1.5 gba:rounded gba:text-left gba:text-xs hover:gba:bg-muted/60 gba:transition-colors"
                          title={formatPlaceholder(schema.type, field.name)}
                          data-testid={`${testId}-field-${schema.type}-${field.name}`}
                        >
                          <span className="gba:truncate gba:font-medium">{field.displayName || field.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

export default TemplateFieldsPanel
