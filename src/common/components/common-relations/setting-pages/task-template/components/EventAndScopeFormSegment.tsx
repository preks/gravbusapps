import React, { useEffect, useMemo, useRef } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { TaskTemplateEntityConfig, TaskTemplateFormData } from '../types'
import { templateEnumToEntitySelectType } from '../taskTemplateEntityTypeMap'
import { TaskTemplateLinkageRadios } from './TaskTemplateLinkageRadios'
import { TaskTemplateScopeFields } from './TaskTemplateScopeFields'
import { TaskTemplateEventTriggerFields } from './TaskTemplateEventTriggerFields'

export interface EventAndScopeFormSegmentProps {
  form: UseFormReturn<TaskTemplateFormData>
  dataTestId: string
  config: TaskTemplateEntityConfig
}

export const EventAndScopeFormSegment: React.FC<EventAndScopeFormSegmentProps> = ({ form, dataTestId, config }) => {
  const { entityTypeOptions, showInvestmentEventFilters, prefixDataTestId, entitySelect } = config
  const scopePrefix = prefixDataTestId || dataTestId

  /** Stable — never put `entitySelect` in effect deps (it changes whenever `entities` updates). */
  const onEntitySearch = entitySelect?.onEntitySearch
  const hydrateEntityById = entitySelect?.hydrateEntityById
  const entities = entitySelect?.entities

  const eventTriggerEnabled = form.watch('eventTriggerEnabled')
  const eventSourceEntityType = form.watch('eventSourceEntityType')
  const scopeLimited = form.watch('scopeLimited')
  const scopedEntityType = form.watch('scopedEntityType')
  const scopedEntityId = form.watch('scopedEntityId')

  const scopeMappedType = useMemo(() => templateEnumToEntitySelectType(scopedEntityType), [scopedEntityType])

  const lastScopeHydrateKey = useRef('')
  useEffect(() => {
    if (!hydrateEntityById || !scopeLimited || !scopeMappedType || !scopedEntityId?.trim()) {
      lastScopeHydrateKey.current = ''
      return
    }
    const key = `scope:${scopeMappedType}:${scopedEntityId.trim()}`
    if (lastScopeHydrateKey.current === key) return
    lastScopeHydrateKey.current = key
    Promise.resolve(hydrateEntityById(scopeMappedType, scopedEntityId.trim())).catch(() => undefined)
  }, [hydrateEntityById, scopeLimited, scopeMappedType, scopedEntityId])

  // Same pattern as ActivitySegment: prime combined search only while the list is still empty.
  useEffect(() => {
    if (!onEntitySearch || !scopeLimited) return
    if (entities && entities.length > 0) return
    Promise.resolve(onEntitySearch('')).catch(() => undefined)
  }, [onEntitySearch, scopeLimited, entities])

  return (
    <div className="gba:space-y-6">
      <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">Scope &amp; events</h3>
      <p className="gba:text-sm gba:text-muted-foreground">
        Link this template to either one record or domain events. Recurrence above still controls timing.
      </p>

      <TaskTemplateLinkageRadios form={form} scopePrefix={scopePrefix} />

      <TaskTemplateScopeFields
        form={form}
        scopePrefix={scopePrefix}
        entityTypeOptions={entityTypeOptions}
        scopeLimited={scopeLimited}
        scopeMappedType={scopeMappedType}
        entitySelect={entitySelect}
        lastScopeHydrateKey={lastScopeHydrateKey}
        showInvestmentDomain={Boolean(showInvestmentEventFilters)}
      />

      <TaskTemplateEventTriggerFields
        form={form}
        scopePrefix={scopePrefix}
        entityTypeOptions={entityTypeOptions}
        eventTriggerEnabled={eventTriggerEnabled}
        eventSourceEntityType={eventSourceEntityType}
        showInvestmentEventFilters={showInvestmentEventFilters}
      />
    </div>
  )
}
