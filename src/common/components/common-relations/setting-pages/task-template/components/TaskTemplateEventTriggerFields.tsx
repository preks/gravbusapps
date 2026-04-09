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
import { CatalogSelect } from '@/components/catalog-select'
import type { EnumOption, TaskTemplateFormData } from '../types'

const INVESTMENT = 'INVESTMENT'

export interface TaskTemplateEventTriggerFieldsProps {
  form: UseFormReturn<TaskTemplateFormData>
  scopePrefix: string
  entityTypeOptions: EnumOption[]
  eventTriggerEnabled: boolean
  eventSourceEntityType: string
  showInvestmentEventFilters?: boolean
}

export const TaskTemplateEventTriggerFields: React.FC<TaskTemplateEventTriggerFieldsProps> = ({
  form,
  scopePrefix,
  entityTypeOptions,
  eventTriggerEnabled,
  eventSourceEntityType,
  showInvestmentEventFilters
}) => {
  const showInvestmentEventCatalogs =
    Boolean(showInvestmentEventFilters) && eventTriggerEnabled && eventSourceEntityType === INVESTMENT

  if (!eventTriggerEnabled) {
    return null
  }

  return (
    <div className="gba:rounded-md gba:border gba:p-4 gba:space-y-4" data-testid={`${scopePrefix}-events-section`}>
      <div className="gba:space-y-4">
        <FormField
          control={form.control}
          name="eventSourceEntityType"
          rules={{
            validate: v => {
              if (!form.getValues('eventTriggerEnabled')) return true
              return v ? true : 'Select which entity type fires this template'
            }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event entity type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger data-testid={`${scopePrefix}-event-entity-type`}>
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

        {showInvestmentEventCatalogs && (
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
            <FormField
              control={form.control}
              name="eventInvestmentGroupRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investment group (optional)</FormLabel>
                  <FormControl>
                    <CatalogSelect
                      catalogIdentifier="InvestmentGroup:v1"
                      value={field.value || null}
                      onValueChange={field.onChange}
                      data-testid={`${scopePrefix}-event-investment-group`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eventInvestmentTypeRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investment type (optional)</FormLabel>
                  <FormControl>
                    <CatalogSelect
                      catalogIdentifier="InvestmentType:v1"
                      parentField="eventInvestmentGroupRef"
                      requireSourceForEnable={true}
                      value={field.value || null}
                      onValueChange={field.onChange}
                      data-testid={`${scopePrefix}-event-investment-type`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </div>
    </div>
  )
}
