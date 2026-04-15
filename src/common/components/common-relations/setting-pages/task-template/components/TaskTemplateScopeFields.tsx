import React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { EntitySelect } from '@/common/components/common-relations/selects/reference-select'
import type { EnumOption, TaskTemplateEntitySelectBindings, TaskTemplateFormData } from '../types'
import type { TaskTemplateHydratableEntityType } from '../taskTemplateEntityTypeMap'
import { entitySelectTypeToTemplateEnum } from '../taskTemplateEntityTypeMap'
import { TaskTemplateEntityCombo } from './TaskTemplateEntityCombo'

function normalizedScopedEntityId(raw: string | null): string {
  return raw ?? ''
}

export interface TaskTemplateScopeFieldsProps {
  form: UseFormReturn<TaskTemplateFormData>
  scopePrefix: string
  entityTypeOptions: EnumOption[]
  scopeLimited: boolean
  /** Legacy: type pre-selected before pick (fallback path only) */
  scopeMappedType: TaskTemplateHydratableEntityType | null
  entitySelect?: TaskTemplateEntitySelectBindings
  lastScopeHydrateKey: React.MutableRefObject<string>
  showInvestmentDomain?: boolean
}

export const TaskTemplateScopeFields: React.FC<TaskTemplateScopeFieldsProps> = ({
  form,
  scopePrefix,
  entityTypeOptions,
  scopeLimited,
  scopeMappedType,
  entitySelect,
  lastScopeHydrateKey,
  showInvestmentDomain
}) =>
  scopeLimited ? (
    <div className="gba:rounded-md gba:border gba:p-4 gba:space-y-4" data-testid={`${scopePrefix}-scope-section`}>
      <div className="gba:space-y-4">
        {entitySelect ? (
          <FormField
            control={form.control}
            name="scopedEntityId"
            rules={{
              validate: v => {
                if (form.getValues('scopeLimited')) {
                  return v?.trim() ? true : 'Search and select a record'
                }
                return true
              }
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Related record</FormLabel>
                <p className="gba:text-sm gba:text-muted-foreground gba:mb-2">
                  {showInvestmentDomain
                    ? 'Search accounts, contacts, leads, opportunities, and investments—the same combined search as the task form.'
                    : 'Search accounts, contacts, leads, and opportunities—the same combined search as the task form.'}
                </p>
                <FormControl>
                  <EntitySelect
                    entities={entitySelect.entities}
                    value={field.value || null}
                    onValueChange={(v: string | null) => {
                      const id = normalizedScopedEntityId(v)
                      field.onChange(id)
                      lastScopeHydrateKey.current = ''
                      if (id === '') {
                        form.setValue('scopedEntityType', '')
                        return
                      }
                      const row = entitySelect.entities.find(e => e.id === id)
                      if (row) {
                        form.setValue('scopedEntityType', entitySelectTypeToTemplateEnum(row.type))
                      }
                    }}
                    onSearch={entitySelect.onEntitySearch}
                    loading={entitySelect.entitiesLoading}
                    onLoadMore={entitySelect.onEntityLoadMore}
                    hasMore={entitySelect.hasMore}
                    placeholder="Search leads, contacts, accounts, opportunities…"
                    searchPlaceholder="Type to search…"
                    data-testid={`${scopePrefix}-scoped-entity-select`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <FormField
              control={form.control}
              name="scopedEntityType"
              rules={{
                validate: v => {
                  if (!form.getValues('scopeLimited')) return true
                  return v ? true : 'Entity type is required when scoping to one record'
                }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scoped entity type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={v => {
                      field.onChange(v)
                      form.setValue('scopedEntityId', '')
                      lastScopeHydrateKey.current = ''
                    }}
                  >
                    <FormControl>
                      <SelectTrigger data-testid={`${scopePrefix}-scoped-entity-type`}>
                        <SelectValue placeholder="Select entity type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {entityTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:gba:col-span-2">
              <FormField
                control={form.control}
                name="scopedEntityId"
                rules={{
                  validate: v => {
                    if (!form.getValues('scopeLimited')) return true
                    return v?.trim() ? true : 'Select a record when scoping to one record'
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scoped record</FormLabel>
                    <FormControl>
                      <TaskTemplateEntityCombo
                        value={field.value || ''}
                        onChange={v => {
                          field.onChange(v)
                          lastScopeHydrateKey.current = ''
                        }}
                        entitySelect={undefined}
                        mappedType={scopeMappedType}
                        filteredEntities={[]}
                        inputPlaceholder="Record UUID"
                        selectPlaceholder="Search and select a record…"
                        searchPlaceholder="Type to search…"
                        dataTestId={`${scopePrefix}-scoped-entity-select`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null
