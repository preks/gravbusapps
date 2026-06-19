import React, { useMemo } from 'react'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from '@newwork/nw-design-system'
import { Info } from '@phosphor-icons/react'
import type { CustomDataOperation, CustomDataStepConfig, CustomDataTarget } from '@/common/data/flow/types/flowTemplate'
import type { TaskNodeConfig } from '../../../types/studioTypes'
import { useCustomDataEntities } from '../../../hooks/useCustomDataEntities'
import { FlowContextExpressionEditor } from '../../shared/FlowContextExpressionEditor'
import { CustomDataValuesEditor } from './CustomDataValuesEditor'

type EditorProps = React.ComponentProps<typeof FlowContextExpressionEditor>

interface CustomDataMutationSectionProps {
  config: TaskNodeConfig
  update: (partial: Partial<TaskNodeConfig>) => void
  accessToken: string
  suggestions: EditorProps['suggestions']
  dataSources: EditorProps['dataSources']
  testId: string
}

const ENTITY_OPERATIONS: Array<{ value: CustomDataOperation; label: string }> = [
  { value: 'create', label: 'Create row' },
  { value: 'update', label: 'Update row' },
  { value: 'delete', label: 'Delete row' }
]

/**
 * Configuration UI for a CUSTOM_DATA_MUTATION step. The user picks a write target
 * (a typed custom-data entity or the generic append-only Flow Data store), an
 * operation, and maps each value to a flow expression via the expression editor.
 */
export const CustomDataMutationSection: React.FC<CustomDataMutationSectionProps> = ({
  config,
  update,
  accessToken,
  suggestions,
  dataSources,
  testId
}) => {
  const cfg = config.customDataConfig ?? {}
  const useAiAgent = cfg.useAiAgent ?? false
  // AI mode only supports writing into a typed entity, so force ENTITY when on.
  const target: CustomDataTarget = useAiAgent ? 'ENTITY' : (cfg.target ?? 'ENTITY')
  const namespace = cfg.namespace ?? ''
  const operation: CustomDataOperation = cfg.operation ?? (target === 'FLOW_DATA' ? 'append' : 'create')

  const { namespaces, namespacesLoading, definitions, definitionsLoading } = useCustomDataEntities(
    accessToken,
    target === 'ENTITY' ? namespace : undefined
  )

  const selectedDefinition = useMemo(
    () => definitions.find(def => def.entityName === cfg.entityName),
    [definitions, cfg.entityName]
  )

  const namespaceOptions = useMemo(() => {
    const names = namespaces.map(item => item.namespace)
    if (namespace && !names.includes(namespace)) return [namespace, ...names]
    return names
  }, [namespaces, namespace])

  const updateCfg = (patch: Partial<CustomDataStepConfig>) => update({ customDataConfig: { ...cfg, ...patch } })

  const handleTargetChange = (next: string) => {
    if (next === 'FLOW_DATA') {
      updateCfg({ target: 'FLOW_DATA', operation: 'append', entityName: undefined, rowId: undefined })
      return
    }
    updateCfg({ target: 'ENTITY', operation: 'create' })
  }

  const handleAiToggle = (next: boolean) => {
    if (next) {
      updateCfg({ useAiAgent: true, target: 'ENTITY' })
      return
    }
    updateCfg({ useAiAgent: false })
  }

  const showValues = !useAiAgent && (target === 'FLOW_DATA' || operation === 'create' || operation === 'update')
  const showRowId = !useAiAgent && target === 'ENTITY' && (operation === 'update' || operation === 'delete')

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid={testId}>
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
        <div className="gba:flex gba:flex-col gba:gap-0.5">
          <Label className="gba:text-xs gba:font-medium">Let AI decide the operation</Label>
          <p className="gba:text-xs gba:text-muted-foreground">
            An AI agent reads the entity schema and decides whether to create, update or delete rows from your
            instructions.
          </p>
        </div>
        <Switch checked={useAiAgent} onCheckedChange={handleAiToggle} data-testid={`${testId}-ai-toggle`} />
      </div>

      {useAiAgent && (
        <div
          className="gba:flex gba:items-start gba:gap-2 gba:rounded-lg gba:border gba:border-border gba:bg-muted gba:p-3"
          data-testid={`${testId}-ai-tip`}
        >
          <Info className="gba:mt-0.5 gba:h-4 gba:w-4 gba:flex-shrink-0 gba:text-muted-foreground" />
          <span className="gba:text-xs gba:text-muted-foreground">
            AI mode writes into a typed Custom Data entity. Pick the namespace and entity, then describe what to do -
            the agent resolves the operation and field values at runtime.
          </span>
        </div>
      )}

      {!useAiAgent && (
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">Target</Label>
          <Select value={target} onValueChange={handleTargetChange}>
            <SelectTrigger data-testid={`${testId}-target`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ENTITY">Custom Data entity</SelectItem>
              <SelectItem value="FLOW_DATA">Flow Data store (append-only)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {target === 'ENTITY' && (
        <React.Fragment>
          <div className="gba:flex gba:flex-col gba:gap-1.5">
            <Label className="gba:text-xs gba:font-medium">Namespace</Label>
            <Select
              value={namespace || undefined}
              onValueChange={next => updateCfg({ namespace: next, entityName: undefined })}
            >
              <SelectTrigger data-testid={`${testId}-namespace`}>
                <SelectValue placeholder={namespacesLoading ? 'Loading…' : 'Select a namespace'} />
              </SelectTrigger>
              <SelectContent>
                {namespaceOptions.map(name => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gba:flex gba:flex-col gba:gap-1.5">
            <Label className="gba:text-xs gba:font-medium">Entity</Label>
            <Select
              value={cfg.entityName || undefined}
              onValueChange={next => updateCfg({ entityName: next })}
              disabled={!namespace}
            >
              <SelectTrigger data-testid={`${testId}-entity`}>
                <SelectValue placeholder={definitionsLoading ? 'Loading…' : 'Select an entity'} />
              </SelectTrigger>
              <SelectContent>
                {definitions.map(def => (
                  <SelectItem key={def.id} value={def.entityName}>
                    {def.displayName || def.entityName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!useAiAgent && (
            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <Label className="gba:text-xs gba:font-medium">Operation</Label>
              <Select value={operation} onValueChange={next => updateCfg({ operation: next as CustomDataOperation })}>
                <SelectTrigger data-testid={`${testId}-operation`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_OPERATIONS.map(op => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {useAiAgent && (
            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <Label className="gba:text-xs gba:font-medium">Instructions</Label>
              <FlowContextExpressionEditor
                value={cfg.instructions ?? ''}
                onChange={next => updateCfg({ instructions: next })}
                suggestions={suggestions}
                dataSources={dataSources}
                placeholder="Tell the agent what to do with this table… Type {{ to insert data."
                allowFreeText
                multiline
                data-testid={`${testId}-instructions`}
              />
            </div>
          )}
        </React.Fragment>
      )}

      {target === 'FLOW_DATA' && (
        <div
          className="gba:flex gba:items-start gba:gap-2 gba:rounded-lg gba:border gba:border-border gba:bg-muted gba:p-3"
          data-testid={`${testId}-flow-data-tip`}
        >
          <Info className="gba:mt-0.5 gba:h-4 gba:w-4 gba:flex-shrink-0 gba:text-muted-foreground" />
          <span className="gba:text-xs gba:text-muted-foreground">
            Each run appends a new record to the generic Flow Data store, keyed by flow and run. History is preserved —
            records are never overwritten.
          </span>
        </div>
      )}

      {showRowId && (
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">Row id</Label>
          <FlowContextExpressionEditor
            value={cfg.rowId ?? ''}
            onChange={next => updateCfg({ rowId: next })}
            suggestions={suggestions}
            dataSources={dataSources}
            placeholder="Type {{ to insert the row id."
            allowFreeText
            singleLine
            data-testid={`${testId}-row-id`}
          />
        </div>
      )}

      {target === 'FLOW_DATA' && (
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">Record key (optional)</Label>
          <FlowContextExpressionEditor
            value={cfg.recordKey ?? ''}
            onChange={next => updateCfg({ recordKey: next })}
            suggestions={suggestions}
            dataSources={dataSources}
            placeholder="Optional grouping key. Type {{ to insert data."
            allowFreeText
            singleLine
            data-testid={`${testId}-record-key`}
          />
        </div>
      )}

      {showValues && (
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">Values</Label>
          <CustomDataValuesEditor
            mode={target === 'FLOW_DATA' ? 'freeform' : 'columns'}
            columns={selectedDefinition?.columns}
            values={cfg.values ?? {}}
            onChange={next => updateCfg({ values: next })}
            suggestions={suggestions}
            dataSources={dataSources}
            testId={`${testId}-values`}
          />
        </div>
      )}
    </div>
  )
}
