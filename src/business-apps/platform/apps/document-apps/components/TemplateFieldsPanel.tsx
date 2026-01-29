/**
 * TemplateFieldsPanel
 *
 * Left panel for the template editor: lists entities from the template entity
 * registry. Field lists are loaded from GraphQL introspection when the user
 * expands an entity – no fallback.
 */

import React, { useState, useMemo } from 'react'
import { Spinner, Badge } from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight, Database, FolderOpen } from 'lucide-react'
import {
  getTemplateEntities,
  getTemplateEntity,
  formatTemplatePlaceholder,
  type TemplateEntityDefinition
} from '../entities'
import { useTemplateEntityFields, type TemplateEntityFieldFromGraphQL } from '../hooks/useTemplateEntityFields'
import { extractEntityKeysFromContent } from '../utils/templatePlaceholders'

export interface TemplateFieldsPanelProps {
  onInsertField: (placeholder: string) => void
  accessToken: string | undefined
  /** Optional: show only entities from this domain */
  domain?: 'nw_orgchart' | 'nw_recruiting' | 'nw_catalog'
  /** Optional: template HTML content to show "Entities used in this template" (parsed from placeholders) */
  templateContent?: string
  'data-testid'?: string
}

/** Renders a flat list of field buttons */
const FieldButtons: React.FC<{
  entityKey: string
  fields: TemplateEntityFieldFromGraphQL[]
  onInsert: (placeholder: string) => void
  testId: string
  indent?: boolean
}> = ({ entityKey, fields, onInsert, testId, indent = true }) => (
  <div className={`gba:space-y-0.5 ${indent ? 'gba:pl-6 gba:pr-2 gba:pb-2' : 'gba:pl-2 gba:pr-2 gba:pb-1'}`}>
    {fields.map(field => (
      <button
        key={field.key}
        type="button"
        onClick={() => onInsert(formatTemplatePlaceholder(entityKey, field.key))}
        className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1.5 gba:rounded gba:text-left gba:text-xs hover:gba:bg-muted/60 gba:transition-colors"
        title={formatTemplatePlaceholder(entityKey, field.key)}
        data-testid={`${testId}-field-${entityKey}-${field.key.replace(/\./g, '-')}`}
      >
        <span className="gba:truncate gba:font-medium">{field.displayName}</span>
      </button>
    ))}
  </div>
)

/** Renders field list for one entity; fetches fields from GraphQL when mounted */
const EntityFieldsList: React.FC<{
  entityKey: string
  accessToken: string | undefined
  onInsert: (placeholder: string) => void
  testId: string
}> = ({ entityKey, accessToken, onInsert, testId }) => {
  const { directFields, catalogGroups, isLoading, error } = useTemplateEntityFields(entityKey, accessToken)
  const [catalogsExpanded, setCatalogsExpanded] = useState(true)
  const [expandedCatalog, setExpandedCatalog] = useState<string | null>(null)

  const toggleCatalog = (fieldKey: string) => {
    setExpandedCatalog(prev => (prev === fieldKey ? null : fieldKey))
  }

  if (isLoading) {
    return (
      <div className="gba:pl-6 gba:pr-2 gba:pb-2 gba:flex gba:items-center gba:gap-2">
        <Spinner size="sm" />
        <span className="gba:text-xs gba:text-muted-foreground">Loading fields from GraphQL...</span>
      </div>
    )
  }
  if (error) {
    return (
      <div className="gba:pl-6 gba:pr-2 gba:pb-2 gba:text-xs gba:text-destructive">
        Failed to load fields: {error.message}
      </div>
    )
  }
  if (directFields.length === 0 && catalogGroups.length === 0) {
    return (
      <div className="gba:pl-6 gba:pr-2 gba:pb-2 gba:text-xs gba:text-muted-foreground">
        No fields from GraphQL for this type.
      </div>
    )
  }

  return (
    <div className="gba:pb-2">
      {directFields.length > 0 && (
        <>
          <div className="gba:px-3 gba:pt-1 gba:pb-0.5 gba:text-xs gba:font-medium gba:text-muted-foreground">
            Fields
          </div>
          <FieldButtons entityKey={entityKey} fields={directFields} onInsert={onInsert} testId={testId} />
        </>
      )}
      {catalogGroups.length > 0 && (
        <div className="gba:mt-1">
          <button
            type="button"
            onClick={() => setCatalogsExpanded(prev => !prev)}
            className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:text-left gba:text-xs gba:font-medium gba:text-muted-foreground hover:gba:bg-muted/60 gba:transition-colors"
            data-testid={`${testId}-catalogs-${entityKey}`}
          >
            {catalogsExpanded ? (
              <ChevronDown className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
            ) : (
              <ChevronRight className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
            )}
            <FolderOpen className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:text-primary/70" />
            <span>Catalog values (contract type, employment type)</span>
          </button>
          {catalogsExpanded && (
            <div className="gba:pl-2 gba:space-y-0.5">
              {catalogGroups.map(group => {
                const isExpanded = expandedCatalog === group.fieldKey
                return (
                  <div key={group.fieldKey} className="gba:rounded gba:overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCatalog(group.fieldKey)}
                      className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:text-left gba:text-xs hover:gba:bg-muted/60 gba:transition-colors"
                      data-testid={`${testId}-catalog-${entityKey}-${group.fieldKey}`}
                    >
                      {isExpanded ? (
                        <ChevronDown className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:text-muted-foreground" />
                      ) : (
                        <ChevronRight className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:text-muted-foreground" />
                      )}
                      <span className="gba:font-medium gba:truncate">{group.displayName}</span>
                    </button>
                    {isExpanded && (
                      <FieldButtons
                        entityKey={entityKey}
                        fields={group.subFields}
                        onInsert={onInsert}
                        testId={testId}
                        indent={false}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const TemplateFieldsPanel: React.FC<TemplateFieldsPanelProps> = ({
  onInsertField,
  accessToken,
  domain,
  templateContent,
  'data-testid': testId = 'template-fields-panel'
}) => {
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set())

  const entityList = useMemo(() => getTemplateEntities(domain), [domain])
  const entitiesUsedInContent = useMemo(
    () => (templateContent ? extractEntityKeysFromContent(templateContent) : []),
    [templateContent]
  )

  const toggleEntity = (entityKey: string) => {
    setExpandedEntities(prev => {
      const next = new Set(prev)
      if (next.has(entityKey)) next.delete(entityKey)
      else next.add(entityKey)
      return next
    })
  }

  return (
    <aside
      className="gba:w-64 gba:flex-shrink-0 gba:border-r gba:bg-card gba:flex gba:flex-col gba:overflow-hidden"
      data-testid={testId}
    >
      <div className="gba:px-3 gba:py-3 gba:border-b">
        <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Insert field</h3>
        <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
          Choose an entity; fields come from GraphQL (e.g. {`{{job_candidate.firstName}}`}).
        </p>
        {entitiesUsedInContent.length > 0 && (
          <div className="gba:mt-2 gba:pt-2 gba:border-t gba:border-border">
            <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1">
              Entities used in this template
            </p>
            <div className="gba:flex gba:flex-wrap gba:gap-1">
              {entitiesUsedInContent.map(key => {
                const def = getTemplateEntity(key)
                return (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="gba:text-[10px] gba:px-1.5 gba:py-0"
                    data-testid={`${testId}-used-entity-${key}`}
                  >
                    {def?.displayName ?? key}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <div className="gba:flex-1 gba:overflow-y-auto gba:py-2">
        {entityList.length === 0 ? (
          <p className="gba:px-3 gba:text-xs gba:text-muted-foreground">No entity types available.</p>
        ) : (
          <div className="gba:space-y-0.5">
            {entityList.map((entity: TemplateEntityDefinition) => {
              const isExpanded = expandedEntities.has(entity.entityKey)
              return (
                <div key={entity.entityKey} className="gba:rounded-md gba:overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleEntity(entity.entityKey)}
                    className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:text-left gba:text-sm hover:gba:bg-muted/60 gba:transition-colors"
                    data-testid={`${testId}-entity-${entity.entityKey}`}
                  >
                    {isExpanded ? (
                      <ChevronDown className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:text-muted-foreground" />
                    ) : (
                      <ChevronRight className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:text-muted-foreground" />
                    )}
                    <Database className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:text-primary/70" />
                    <span className="gba:font-medium gba:truncate">{entity.displayName}</span>
                  </button>
                  {isExpanded && (
                    <EntityFieldsList
                      entityKey={entity.entityKey}
                      accessToken={accessToken}
                      onInsert={onInsertField}
                      testId={testId}
                    />
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
