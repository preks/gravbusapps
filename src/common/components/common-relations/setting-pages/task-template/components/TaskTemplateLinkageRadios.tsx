import React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Label,
  RadioGroup,
  RadioGroupItem
} from '@newwork/nw-design-system'
import type { TaskTemplateFormData } from '../types'

export type TaskTemplateLinkageMode = 'one_record' | 'domain_events'

export function getTaskTemplateLinkageRadioValue(
  scopeLimited: boolean,
  eventTriggerEnabled: boolean
): TaskTemplateLinkageMode {
  if (scopeLimited && !eventTriggerEnabled) {
    return 'one_record'
  }
  if (!scopeLimited && eventTriggerEnabled) {
    return 'domain_events'
  }
  if (scopeLimited && eventTriggerEnabled) {
    return 'one_record'
  }
  return 'domain_events'
}

export function setTaskTemplateLinkageMode(
  form: UseFormReturn<TaskTemplateFormData>,
  mode: TaskTemplateLinkageMode
): void {
  form.clearErrors('scopeLimited')
  if (mode === 'one_record') {
    form.setValue('scopeLimited', true)
    form.setValue('eventTriggerEnabled', false)
    form.setValue('eventSourceEntityType', '')
    form.setValue('eventInvestmentGroupRef', '')
    form.setValue('eventInvestmentTypeRef', '')
    return
  }
  form.setValue('scopeLimited', false)
  form.setValue('eventTriggerEnabled', true)
  form.setValue('scopedEntityType', '')
  form.setValue('scopedEntityId', '')
}

export interface TaskTemplateLinkageRadiosProps {
  form: UseFormReturn<TaskTemplateFormData>
  scopePrefix: string
}

export const TaskTemplateLinkageRadios: React.FC<TaskTemplateLinkageRadiosProps> = ({ form, scopePrefix }) => {
  const scopeLimited = form.watch('scopeLimited')
  const eventTriggerEnabled = form.watch('eventTriggerEnabled')
  const value = getTaskTemplateLinkageRadioValue(scopeLimited, eventTriggerEnabled)

  return (
    <FormField
      control={form.control}
      name="scopeLimited"
      render={() => (
        <FormItem className="gba:space-y-3">
          <FormLabel className="gba:text-base">How is this template tied to data?</FormLabel>
          <p className="gba:text-sm gba:text-muted-foreground gba:font-normal">
            Pick one: tasks either run for a single record you choose, or when domain lifecycle events occur for an
            entity type. The recurrence schedule above still applies.
          </p>
          <FormControl>
            <RadioGroup
              value={value}
              onValueChange={v => setTaskTemplateLinkageMode(form, v as TaskTemplateLinkageMode)}
              className="gba:space-y-3"
              data-testid={`${scopePrefix}-linkage-radio-group`}
            >
              <div className="gba:flex gba:items-start gba:gap-3 gba:rounded-md gba:border gba:p-3">
                <RadioGroupItem value="one_record" id={`${scopePrefix}-linkage-one-record`} className="gba:mt-1" />
                <div className="gba:space-y-1">
                  <Label htmlFor={`${scopePrefix}-linkage-one-record`} className="gba:text-base gba:font-medium">
                    One specific record
                  </Label>
                  <p className="gba:text-sm gba:text-muted-foreground gba:font-normal">
                    Tasks are only created for the record you select below.
                  </p>
                </div>
              </div>
              <div className="gba:flex gba:items-start gba:gap-3 gba:rounded-md gba:border gba:p-3">
                <RadioGroupItem
                  value="domain_events"
                  id={`${scopePrefix}-linkage-domain-events`}
                  className="gba:mt-1"
                />
                <div className="gba:space-y-1">
                  <Label htmlFor={`${scopePrefix}-linkage-domain-events`} className="gba:text-base gba:font-medium">
                    Domain lifecycle events
                  </Label>
                  <p className="gba:text-sm gba:text-muted-foreground gba:font-normal">
                    Tasks are created when matching events fire for the entity type you configure below.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
